# Il calciatore nuovo, tutto da script (ripetibile): corpo MPFB (MakeHuman per Blender, personaggi CC0) maschile atletico col
# viso misto e generico, occhi compresi, scheletro «mixamo» di MPFB, messo nella stessa posa a T dello scheletro del gioco
# (modelli/quaternius-scheletro.glb: braccia, avambracci, cosce, stinchi e piedi nelle stesse direzioni), così le animazioni
# del gioco gli stanno addosso senza scarti. Tre corporature (snello, normale, robusto) come forme sullo stesso scheletro,
# tre livelli di dettaglio (circa 4.500, 1.500 e 600 triangoli) e le capigliature ricavate dalla calotta dei capelli di MakeHuman.
# Uso: blender -b --python scripts/blender/calciatore.py -- <scheletro del gioco .glb> <cartella di uscita>
# Esce: lod0.glb, lod1.glb, lod2.glb (corpo con scheletro e forme), capelli.glb, punti.json (occhi, bocca, testa: per dipingere il viso)
import bpy, bmesh, sys, os, json, struct, mathutils
import numpy as np
from mathutils.bvhtree import BVHTree
from bl_ext.blender_org.mpfb.services.humanservice import HumanService
from bl_ext.blender_org.mpfb.services.rigservice import RigService
from bl_ext.blender_org.mpfb.services.targetservice import TargetService

arg = sys.argv[sys.argv.index('--') + 1:]
VECCHIO, USCITA = arg[0], arg[1]; os.makedirs(USCITA, exist_ok=True)
LOD = [4500, 1500, 600]
# corporature: muscoli e peso di MakeHuman (0..1). Viso, età e proporzioni restano gli stessi
BASE = {'gender': 1.0, 'age': 0.5, 'muscle': 0.7, 'weight': 0.47, 'proportions': 0.75, 'height': 0.55, 'cupsize': 0.5, 'firmness': 0.5, 'race': {'asian': 0.33, 'caucasian': 0.34, 'african': 0.33}}
# Ritocchi di forma (regolatori di MakeHuman, da 0 a 1): calciatore atletico, spalle larghe, vita dritta, gambe asciutte
DETTAGLI = {'torso-vshape-incr': 0.55, 'measure-shoulder-dist-incr': 0.6, 'measure-waist-circ-incr': 0.45, 'torso-muscle-pectoral-incr': 0.35, 'torso-muscle-dorsi-incr': 0.35,
            'hip-scale-horiz-decr': 0.6, 'buttocks-volume-decr': 0.35, 'measure-thigh-circ-decr': 0.6, 'measure-neck-circ-incr': 0.7, 'measure-neck-height-decr': 0.6,
            'head-scale-horiz-incr': 0.35, 'head-scale-vert-incr': 0.3, 'head-scale-depth-incr': 0.3, 'chin-width-incr': 0.4, 'chin-bones-incr': 0.35, 'head-square': 0.3,
            'l-upperarm-shoulder-muscle-incr': 0.5, 'r-upperarm-shoulder-muscle-incr': 0.5, 'l-upperarm-muscle-incr': 0.3, 'r-upperarm-muscle-incr': 0.3}
CORPI = {'normale': {}, 'snello': {'muscle': 0.4, 'weight': 0.22}, 'robusto': {'muscle': 1.0, 'weight': 0.72}}

# ---------------------------------------------------------------- le direzioni degli arti nello scheletro del gioco
def direzioni_gioco(file):
    glb = open(file, 'rb').read(); n0 = struct.unpack('<I', glb[12:16])[0]; j = json.loads(glb[20:20 + n0])
    par = {c: i for i, n in enumerate(j['nodes']) for c in n.get('children', [])}
    def mondo(i):
        n = j['nodes'][i]; M = mathutils.Matrix.LocRotScale(n.get('translation', (0, 0, 0)), mathutils.Quaternion([n.get('rotation', (0, 0, 0, 1))[k] for k in (3, 0, 1, 2)]), n.get('scale', (1, 1, 1)))
        return mondo(par[i]) @ M if i in par else M
    P = {n['name']: mondo(i).to_translation() for i, n in enumerate(j['nodes']) if 'name' in n}
    bl = lambda v: mathutils.Vector((v.x, -v.z, v.y))  # da glTF (Y in alto, +Z davanti) a Blender (Z in alto, -Y davanti)
    coppie = {'Arm': ('upperarm', 'lowerarm'), 'ForeArm': ('lowerarm', 'hand'), 'UpLeg': ('thigh', 'calf'), 'Leg': ('calf', 'foot'), 'Foot': ('foot', 'ball')}
    return {(lato + k): bl(P[b + s] - P[a + s]).normalized() for k, (a, b) in coppie.items() for lato, s in (('Left', '_l'), ('Right', '_r'))}
DIR = direzioni_gioco(VECCHIO)
FIGLIO = {'Arm': 'ForeArm', 'ForeArm': 'Hand', 'UpLeg': 'Leg', 'Leg': 'Foot', 'Foot': 'ToeBase'}

def liscia(bm, scelti, giri, forza=0.5):
    for _ in range(giri): bmesh.ops.smooth_vert(bm, verts=scelti, factor=forza, use_axis_x=True, use_axis_y=True, use_axis_z=True)

def crea(macro):
    """Un corpo con questa corporatura, nella posa a T del gioco, solo corpo e occhi. Risponde (oggetto, scheletro, calotta dei capelli)."""
    m = dict(BASE); m.update(macro)
    corpo = HumanService.create_human(mask_helpers=False, detailed_helpers=True, extra_vertex_groups=True, feet_on_ground=True, macro_detail_dict=m)
    for nome, peso in DETTAGLI.items():
        TargetService.load_target(corpo, TargetService.target_full_path(nome), weight=peso, name=nome)
    rig = HumanService.add_builtin_rig(corpo, 'mixamo', import_weights=True)
    # la posa: ogni arto girato finché punta dove punta quello del gioco (dalla spalla e dall'anca in giù, un osso alla volta)
    bpy.context.view_layer.objects.active = rig; bpy.ops.object.mode_set(mode='POSE')
    for lato in ('Left', 'Right'):
        for catena in (('Arm', 'ForeArm'), ('UpLeg', 'Leg', 'Foot')):
            R_padre = mathutils.Matrix.Identity(3)
            for k in catena:
                b = rig.data.bones['mixamorig:' + lato + k]; f = rig.data.bones['mixamorig:' + lato + FIGLIO[k]]; pb = rig.pose.bones[b.name]
                d = (R_padre @ (f.head_local - b.head_local)).normalized(); R = d.rotation_difference(DIR[lato + k]).to_matrix(); B = b.matrix_local.to_3x3()
                pb.rotation_mode = 'QUATERNION'; pb.rotation_quaternion = (B.inverted() @ R_padre.inverted() @ R @ R_padre @ B).to_quaternion(); R_padre = R @ R_padre
    bpy.context.view_layer.update(); bpy.ops.object.mode_set(mode='OBJECT')
    RigService.apply_pose_as_rest_pose(rig)
    bpy.ops.object.select_all(action='DESELECT'); bpy.context.view_layer.objects.active = corpo; corpo.select_set(True)
    if corpo.data.shape_keys: bpy.ops.object.shape_key_remove(all=True, apply_mix=True)
    for mod in list(corpo.modifiers):
        if mod.type == 'MASK': corpo.modifiers.remove(mod)
    gi = {g.name: g.index for g in corpo.vertex_groups}
    dentro = lambda v, n: any(g.group == gi[n] for g in v.groups)
    me = corpo.data
    # il cuoio capelluto (gruppo «scalp»): è il guscio da cui nascono le capigliature. Punti, normali e facce
    calotta = [(v.index, v.co.copy(), v.normal.copy()) for v in me.vertices if dentro(v, 'scalp')]; ic = {i: k for k, (i, _, _) in enumerate(calotta)}
    facce = [[ic[i] for i in p.vertices] for p in me.polygons if all(i in ic for i in p.vertices)]
    bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table()
    tieni = [dentro(v, 'body') or dentro(v, 'helper-l-eye') or dentro(v, 'helper-r-eye') for v in me.vertices]
    # ritocchi: l'inguine liscio (sta sotto i pantaloncini) e le dita dei piedi fuse in una punta (diventano scarpe)
    gen = [v.co for v in me.vertices if dentro(v, 'helper-genital')]; cg = sum(gen, mathutils.Vector()) / len(gen)
    liscia(bm, [bm.verts[v.index] for v in me.vertices if tieni[v.index] and (v.co - cg).length < 0.12 and v.co.y < cg.y + 0.05], 40)
    unghie = [v.co.copy() for v in me.vertices if dentro(v, 'toenails')]
    piede = [bm.verts[v.index] for v in me.vertices if tieni[v.index] and v.co.z < 0.09 and min((v.co - u).length for u in unghie) < 0.06]
    liscia(bm, piede, 30, 0.6)
    bmesh.ops.delete(bm, geom=[bm.verts[i] for i, t in enumerate(tieni) if not t], context='VERTS')
    bm.to_mesh(me); bm.free(); me.update()
    occhi = {lato: [v.index for v in me.vertices if dentro(v, 'helper-%s-eye' % lato)] for lato in 'lr'}
    return corpo, rig, (calotta, facce), occhi

def coordinate(o): return np.array([v.co[:] for v in o.data.vertices])

# ---------------------------------------------------------------- i tre corpi (stessi vertici, stesso ordine)
bpy.ops.wm.read_factory_settings(use_empty=True)
corpo, rig, calotta, occhi = crea(CORPI['normale']); corpo.name = 'Corpo'; rig.name = 'Scheletro'
base = coordinate(corpo); forme = {}
for nome in ('snello', 'robusto'):
    c2, r2, _, _ = crea(CORPI[nome]); forme[nome] = coordinate(c2) - base
    bpy.data.objects.remove(c2, do_unlink=True); bpy.data.objects.remove(r2, do_unlink=True)
print('CORPO pieno: %d vertici; forme: %s' % (len(base), {k: round(float(np.abs(v).max()), 3) for k, v in forme.items()}))

# segni per vertice che servono a dipingere il viso e a riconoscere le zone: labbra, cuoio capelluto, occhi, orecchie
gi = {g.name: g.index for g in corpo.vertex_groups}
def segno(nomi): return np.array([1.0 if any(g.group in [gi[n] for n in nomi] for g in v.groups) else 0.0 for v in corpo.data.vertices])
SEGNI = {'labbra': segno(['lips']), 'cuoio': segno(['scalp']), 'occhi': segno(['helper-l-eye', 'helper-r-eye']), 'unghie': segno(['fingernails'])}
me = corpo.data
punti = {'occhio_l': list(np.mean([me.vertices[i].co[:] for i in occhi['l']], 0)), 'occhio_r': list(np.mean([me.vertices[i].co[:] for i in occhi['r']], 0)),
         'raggio_occhio': float(np.max(np.linalg.norm(np.array([me.vertices[i].co[:] for i in occhi['l']]) - np.mean([me.vertices[i].co[:] for i in occhi['l']], 0), axis=1))),
         'bocca': list(np.mean(base[SEGNI['labbra'] > 0], 0)), 'testa_alto': float(base[:, 2].max()), 'altezza': float(base[:, 2].max() - base[:, 2].min())}
# solo i gruppi delle ossa, un materiale solo col nome che il gioco conosce
ossa = {b.name for b in rig.data.bones}
for g in list(corpo.vertex_groups):
    if g.name not in ossa: corpo.vertex_groups.remove(g)
# due gruppi di servizio: gli occhi (non si alleggeriscono: sono già pochi triangoli) e tutto il resto
g_occhi = corpo.vertex_groups.new(name='v_occhi'); g_occhi.add(occhi['l'] + occhi['r'], 1.0, 'REPLACE')
g_resto = corpo.vertex_groups.new(name='v_resto'); g_resto.add([v.index for v in corpo.data.vertices if v.index not in set(occhi['l'] + occhi['r'])], 1.0, 'REPLACE')
mat = bpy.data.materials.new('MI_Superhero_Male'); me.materials.clear(); me.materials.append(mat)
for p in me.polygons: p.material_index = 0; p.use_smooth = True

# il corpo pieno, triangolato, come riferimento per portare forme e segni sui corpi alleggeriti
bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.triangulate(bm, faces=bm.faces[:]); bm.verts.ensure_lookup_table(); bm.faces.ensure_lookup_table()
tri_pieni = [[v.index for v in f.verts] for f in bm.faces]; albero = BVHTree.FromBMesh(bm); bm.free()
def porta(co, valori):
    """Il valore (per vertice del corpo pieno) nel punto del corpo pieno più vicino a co."""
    loc, _, fi, _ = albero.find_nearest(mathutils.Vector(co)); a, b, c = tri_pieni[fi]
    w = mathutils.geometry.barycentric_transform(loc, mathutils.Vector(base[a]), mathutils.Vector(base[b]), mathutils.Vector(base[c]), mathutils.Vector((1, 0, 0)), mathutils.Vector((0, 1, 0)), mathutils.Vector((0, 0, 1)))
    return valori[a] * w.x + valori[b] * w.y + valori[c] * w.z

def esporta(o, file):
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); rig.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.export_scene.gltf(filepath=file, use_selection=True, export_animations=False, export_skins=True, export_morph=True, export_morph_normal=False, export_attributes=True, export_materials='EXPORT', export_yup=True)

for k, tri in enumerate(LOD):
    bpy.ops.object.select_all(action='DESELECT'); corpo.select_set(True); bpy.context.view_layer.objects.active = corpo
    bpy.ops.object.duplicate(); o = bpy.context.view_layer.objects.active; o.name = 'Lod%d' % k; m2 = o.data
    if k > 0:  # da lontano niente bulbi degli occhi
        bm = bmesh.new(); bm.from_mesh(m2); bm.verts.ensure_lookup_table(); bmesh.ops.delete(bm, geom=[bm.verts[i] for i in occhi['l'] + occhi['r']], context='VERTS'); bm.to_mesh(m2); bm.free()
    io = o.vertex_groups['v_occhi'].index; negli_occhi = lambda v: any(g.group == io for g in v.groups)
    tri_occhi = sum(len(p.vertices) - 2 for p in m2.polygons if all(negli_occhi(m2.vertices[i]) for i in p.vertices))
    tri0 = sum(len(p.vertices) - 2 for p in m2.polygons) - tri_occhi
    d = o.modifiers.new('Alleggerisci', 'DECIMATE'); d.ratio = (tri - tri_occhi) / tri0; d.use_collapse_triangulate = True; d.vertex_group = 'v_resto'
    bpy.ops.object.modifier_move_to_index(modifier=d.name, index=0); bpy.ops.object.modifier_apply(modifier=d.name)
    co = coordinate(o); e_occhio = [1.0 if negli_occhi(v) else 0.0 for v in m2.vertices]
    for nome in ('v_occhi', 'v_resto'): o.vertex_groups.remove(o.vertex_groups[nome])
    # segni come attributi (il gioco e la maschera li leggono) e corporature come forme
    for nome, val in SEGNI.items():
        a = m2.attributes.new('_' + nome.upper(), 'FLOAT', 'POINT'); a.data.foreach_set('value', e_occhio if nome == 'occhi' else [0.0 if e else float(porta(p, val)) for p, e in zip(co, e_occhio)])
    o.shape_key_add(name='Basis')
    for nome, delta in forme.items():
        sk = o.shape_key_add(name=nome); sk.data.foreach_set('co', (co + np.array([porta(p, delta) for p in co])).ravel())
    print('LOD%d: %d triangoli, %d vertici' % (k, sum(len(p.vertices) - 2 for p in m2.polygons), len(m2.vertices)))
    esporta(o, os.path.join(USCITA, 'lod%d.glb' % k))

# ---------------------------------------------------------------- capigliature dal cuoio capelluto
# Il guscio del cuoio capelluto viene spinto in fuori lungo le normali: poco al bordo (attaccatura), di più al centro,
# e ogni capigliatura aggiunge la sua forma. Coordinate di Blender: Z in alto, -Y davanti.
vc = np.array([c[:] for _, c, _ in calotta[0]]); vn = np.array([n[:] for _, _, n in calotta[0]]); facce_c = calotta[1]
centro = vc.mean(0); cima = vc[:, 2].max(); fronte = vc[:, 1].min(); nuca = vc[:, 1].max(); bassa = vc[:, 2].min()
# distanza di ogni punto dal bordo del guscio (i lati che appartengono a una faccia sola)
conta = {}
for f in facce_c:
    for i in range(len(f)):
        l = tuple(sorted((f[i], f[(i + 1) % len(f)]))); conta[l] = conta.get(l, 0) + 1
bordo = sorted({i for l, n in conta.items() if n == 1 for i in l}); vb = vc[bordo]
dist = np.array([np.linalg.norm(vb - p, axis=1).min() for p in vc])
def sfuma(a, b, x): t = min(1.0, max(0.0, (x - a) / (b - a))); return t * t * (3 - 2 * t)
def capelli(nome, f):
    me2 = bpy.data.meshes.new(nome); v2 = np.array([p + f(p, n, sfuma(0.0, 0.03, d)) for p, n, d in zip(vc, vn, dist)])
    me2.from_pydata([tuple(p) for p in v2], [], facce_c); me2.update()
    for p in me2.polygons: p.use_smooth = True
    o = bpy.data.objects.new(nome, me2); bpy.context.scene.collection.objects.link(o); return o
alto = lambda p: max(0.0, (p[2] - bassa) / (cima - bassa))  # 0 alla nuca bassa, 1 in cima
dietro = lambda p: max(0.0, (p[1] - centro[1]) / (nuca - centro[1]))  # 0 a metà testa, 1 alla nuca
SU = np.array([0, 0, 1.0]); AVANTI = np.array([0, -1.0, 0])
# ogni capigliatura: spostamento del punto p (normale n, k = 0 all'attaccatura e 1 dentro)
STILI = {
    'Hair_Corti': lambda p, n, k: n * (0.002 + 0.006 * k),
    'Hair_Folti': lambda p, n, k: n * (0.003 + 0.018 * k) + SU * 0.012 * k * alto(p),
    'Hair_Ciuffo': lambda p, n, k: n * (0.003 + 0.009 * k) + (AVANTI * 0.012 + SU * 0.032) * sfuma(0.09, 0.0, abs(p[1] - fronte)) * sfuma(0.07, 0.02, abs(p[0] - centro[0])) * (0.4 + 0.6 * k),
    'Hair_Cresta': lambda p, n, k: n * (0.002 + 0.003 * k) + SU * 0.045 * sfuma(0.04, 0.008, abs(p[0] - centro[0])) * sfuma(0.2, 0.75, alto(p)),
    'Hair_Ricci': lambda p, n, k: n * (0.004 + 0.03 * k + 0.008 * k * np.sin(p[0] * 190) * np.sin(p[1] * 170 + p[2] * 150)),
    'Hair_Lunghi': lambda p, n, k: n * (0.004 + 0.014 * k) + (np.array([0, 0.018, -0.075]) * dietro(p) * (1 - alto(p)) * (1 - 0.6 * k)),
    'Hair_Riga': lambda p, n, k: n * (0.003 + 0.011 * k) + SU * 0.018 * k * alto(p) * (1.0 if p[0] > centro[0] + 0.015 else 0.2),
}
ogg = [capelli(n, f) for n, f in STILI.items()]
bpy.ops.object.select_all(action='DESELECT')
for o in ogg: o.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(USCITA, 'capelli.glb'), use_selection=True, export_animations=False, export_materials='NONE', export_yup=True)
json.dump(punti, open(os.path.join(USCITA, 'punti.json'), 'w'), indent=1)
print('PUNTI', json.dumps(punti))
