# Il calciatore nuovo, tutto da script (ripetibile): corpo MPFB (MakeHuman per Blender, personaggi CC0) maschile atletico col
# viso misto e generico, occhi compresi, scheletro «mixamo» di MPFB, messo nella stessa posa a T dello scheletro del gioco
# (modelli/quaternius-scheletro.glb: braccia, avambracci, cosce, stinchi e piedi nelle stesse direzioni), così le animazioni
# del gioco gli stanno addosso senza scarti. Tre corporature (snello, normale, robusto) come forme sullo stesso scheletro,
# tre livelli di dettaglio (circa 4.500, 1.500 e 600 triangoli) e le capigliature ricavate dalla calotta dei capelli di MakeHuman.
# La divisa ha volume nella geometria (maglia, maniche, pantaloncini, risvolto dei calzettoni, scarpini con la suola): vedi
# divisa_volume più sotto; i colori restano dipinti dal gioco (src/divisa.js).
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
# Ritocchi di forma (regolatori di MakeHuman, da 0 a 1): calciatore atletico ma non da culturista. Spalle larghe e vita dritta,
# cosce e polpacci muscolosi, glutei pieni, collo robusto, testa un po' più piccola del normale (approvato da Alex il 23/11/2026)
DETTAGLI = {'torso-vshape-incr': 0.65, 'measure-shoulder-dist-incr': 0.75, 'measure-waist-circ-incr': 0.4, 'torso-muscle-pectoral-incr': 0.5, 'torso-muscle-dorsi-incr': 0.5,
            'hip-scale-horiz-decr': 0.5, 'buttocks-volume-incr': 0.25, 'measure-thigh-circ-incr': 0.35, 'l-upperleg-muscle-incr': 0.6, 'r-upperleg-muscle-incr': 0.6,
            'measure-calf-circ-incr': 0.4, 'l-lowerleg-muscle-incr': 0.6, 'r-lowerleg-muscle-incr': 0.6,
            'measure-neck-circ-incr': 1.0, 'neck-scale-horiz-incr': 0.3, 'measure-neck-height-decr': 0.5,
            'head-scale-horiz-decr': 0.12, 'head-scale-vert-decr': 0.1, 'head-scale-depth-decr': 0.05,
            'l-upperarm-shoulder-muscle-incr': 0.6, 'r-upperarm-shoulder-muscle-incr': 0.6, 'l-upperarm-muscle-incr': 0.45, 'r-upperarm-muscle-incr': 0.45,
            'l-lowerarm-muscle-incr': 0.3, 'r-lowerarm-muscle-incr': 0.3}
# Il viso (regolatori di MakeHuman, da 0 a 1): generico, ma leggibile da lontano. Mascella e mento netti, zigomi alti,
# guance un po' scavate, naso dritto e in fuori, arcata delle sopracciglia in avanti (struttura dal riferimento di Alex)
VISO = {'chin-width-incr': 0.5, 'chin-bones-incr': 0.7, 'chin-prominent-incr': 0.4, 'chin-height-incr': 0.15, 'head-square': 0.4,
        'l-cheek-bones-incr': 0.6, 'r-cheek-bones-incr': 0.6, 'l-cheek-volume-decr': 0.4, 'r-cheek-volume-decr': 0.4,
        'nose-scale-depth-incr': 0.5, 'nose-trans-forward': 0.4, 'nose-hump-decr': 0.3, 'nose-point-width-decr': 0.3, 'nose-scale-vert-incr': 0.2,
        'eyebrows-trans-forward': 0.6, 'eyebrows-angle-down': 0.2, 'forehead-temple-decr': 0.3}
# quanto il viso resiste all'alleggerimento (peso nel DECIMATE: 1 come il resto del corpo, 0 non si tocca)
VISO_ALLEGGERISCI = 0.35
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
    for nome, peso in {**DETTAGLI, **VISO}.items():
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

# ---------------------------------------------------------------- la divisa con volume (dopo l'albero: forme e segni si leggono dal corpo nudo)
# La divisa resta dipinta (src/divisa.js), ma qui le diamo spessore: ogni zona viene spinta in fuori lungo la normale
# della pelle, di quanto dice VOLUME (metri), e agli orli il corpo viene tagliato con due anelli vicini (ORLO metri) perché
# il bordo faccia un gradino netto. Le zone sono quelle di scripts/maschera-nuova.py, ricavate dalle giunture (Z in alto,
# X di lato, -Y davanti). Struttura come il riferimento di Alex: maglia morbida, maniche larghe, pantaloncini ampi,
# calzettoni col risvolto, scarpini con la suola.
VOLUME = {'maglia': 0.010, 'pancia': 0.012, 'schiena': 0.5, 'manica': 0.010, 'orlo_manica': 0.022, 'corti': 0.012,
          'orlo_corti': 0.026, 'interno': 0.5, 'calze': 0.003, 'risvolto': 0.008, 'scarpa': 0.006, 'suola': 0.004}
ORLO = 0.004
# quante passate di lisciatura fanno del piede uno scarpino
SCARPA_GIRI = 25
def divisa_volume(o, rig):
    G = lambda n: rig.matrix_world @ rig.data.bones['mixamorig:' + n].head_local
    anca, ginocchio, caviglia = G('LeftUpLeg').z, G('LeftLeg').z, G('LeftFoot').z
    spalla, gomito, collo, coscia = abs(G('LeftArm').x), abs(G('LeftForeArm').x), G('Neck'), abs(G('LeftUpLeg').x)
    petto = G('Spine2').z
    orlo_maglia = anca - 0.05
    manica = spalla + (gomito - spalla) * 0.62
    orlo_corti = ginocchio + (anca - ginocchio) * 0.34
    calza = ginocchio - (ginocchio - caviglia) * 0.16
    # il risvolto dove lo colora il gioco (MISURE.risvolto in src/divisa.js, coordinate del gioco: h = 0,9942 z - 0,029)
    risvolto = (0.40 + 0.029) / 0.9942
    bm = bmesh.new(); bm.from_mesh(o.data); bm.verts.ensure_lookup_table()
    pavimento = min(v.co.z for v in bm.verts)
    suola = pavimento + 0.014
    braccio = lambda c: abs(c.x) > spalla * 0.9 and c.z > anca
    gamba = lambda c: c.z < anca and abs(c.x) < spalla * 0.9
    def taglia(punto, normale, dove):
        g = [f for f in bm.faces if all(dove(v.co) for v in f.verts)]
        ge = list({e for f in g for e in f.edges}); gv = list({v for f in g for v in f.verts})
        r = bmesh.ops.bisect_plane(bm, geom=g + ge + gv, plane_co=punto, plane_no=normale)
        return [e for e in r['geom_cut'] if isinstance(e, bmesh.types.BMVert)]
    # le dita via: il piede si taglia subito davanti all'attaccatura delle dita, le dita si tolgono e il buco si chiude
    # con un cappuccio a punta (un anello a metà strada e un vertice in punta). I punti nuovi prendono pesi delle ossa e
    # coordinate della texture dal bordo, così sono scarpa come il resto del piede
    dl = bm.verts.layers.deform.active; uvl = bm.loops.layers.uv.active
    def pesi(a, da):
        for g, w in da[dl].items(): a[dl][g] = w
    for s in (1, -1):
        dito = next(rig.matrix_world @ b.head_local for b in rig.data.bones if b.name.endswith('ToeBase') and (rig.matrix_world @ b.head_local).x * s > 0)
        yb = dito.y + 0.015
        nel_piede = lambda c: gamba(c) and c.x * s > 0 and c.z < caviglia
        via = [v for v in bm.verts if nel_piede(v.co) and v.co.y < yb]
        punta_y = min(v.co.y for v in via); punta_z = sum(v.co.z for v in via) / len(via)
        taglia((0, yb, 0), (0, 1, 0), nel_piede)
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if nel_piede(v.co) and v.co.y < yb - 1e-5], context='VERTS')
        bordo = [e for e in bm.edges if e.is_boundary and all(nel_piede(v.co) and abs(v.co.y - yb) < 2e-3 for v in e.verts)]
        bv = list({v for e in bordo for v in e.verts}); print('PUNTA lato', s, 'lati del bordo', len(bordo), 'punti', len(bv)); cb = sum((v.co for v in bv), mathutils.Vector()) / len(bv)
        uv_di = {v: v.link_loops[0][uvl].uv.copy() for v in bv}
        cima = bm.verts.new((cb.x, punta_y, punta_z)); pesi(cima, min(bv, key=lambda v: abs(v.co.x - cb.x) + abs(v.co.z - punta_z)))
        meta = {}
        for v in bv:
            m = bm.verts.new(v.co.lerp(cima.co, 0.5)); m.co.y = (v.co.y + punta_y) / 2; pesi(m, v); meta[v] = m
        uv_di.update({meta[v]: uv_di[v] for v in bv}); uv_di[cima] = uv_di[bv[0]]
        for e in bordo:
            l = e.link_loops[0]; a, b = l.vert, l.link_loop_next.vert
            for giro in ((b, a, meta[a], meta[b]), (meta[b], meta[a], cima)):
                f = bm.faces.new(giro); f.smooth = True
                for lp in f.loops: lp[uvl].uv = uv_di[lp.vert]
    bm.verts.ensure_lookup_table(); bm.faces.ensure_lookup_table()
    anelli = []
    for s in (1, -1):
        for x in (manica - ORLO, manica):
            anelli += taglia((s * x, 0, 0), (1, 0, 0), lambda c, s=s: braccio(c) and c.x * s > 0)
    for z in (orlo_maglia, orlo_maglia + ORLO):
        anelli += taglia((0, 0, z), (0, 0, 1), lambda c: abs(c.x) < spalla * 0.9 and abs(c.z - orlo_maglia) < 0.08)
    for z in (orlo_corti, orlo_corti + ORLO, calza - ORLO, calza, risvolto - ORLO, risvolto, suola, suola + ORLO):
        anelli += taglia((0, 0, z), (0, 0, 1), gamba)
    sm = lambda a, b, x: (lambda t: t * t * (3 - 2 * t))(min(1.0, max(0.0, (x - a) / (b - a))))
    # lo scarpino: senza dita e con la punta chiusa, il piede (sotto la caviglia) viene lisciato finché diventa una forma
    # morbida da scarpa, poi prende lo spessore della scarpa lungo la normale. Sopra la caviglia si liscia sempre meno
    in_suola = {v for v in bm.verts if gamba(v.co) and v.co.z < suola + 1e-5}
    piede = [v for v in bm.verts if gamba(v.co) and v.co.z < caviglia + 0.05]
    peso = {v: sm(caviglia + 0.05, caviglia, v.co.z) for v in piede}
    for giro in range(SCARPA_GIRI):
        liscia(bm, [v for v in piede if peso[v] > giro / SCARPA_GIRI], 1, 0.6)
    for v in piede: v.co.z = max(v.co.z, pavimento)
    bm.verts.ensure_lookup_table(); bm.normal_update()
    verso = {v: v.normal.copy() for v in piede}
    for v in piede: v.co += v.normal * VOLUME['scarpa'] * peso[v]
    bm.normal_update()
    e = 1e-5; sposta = []
    for v in bm.verts:
        c, n, d = v.co, v.normal, 0.0
        if braccio(c):
            # la manica si stacca dal braccio sempre di più fino all'orlo; oltre l'orlo la pelle
            if abs(c.x) <= manica - ORLO + e: d = VOLUME['manica'] + (VOLUME['orlo_manica'] - VOLUME['manica']) * sm(spalla * 0.9, manica, abs(c.x))
        elif c.z > orlo_maglia + e:
            # la maglia: niente su collo e testa, piena dal petto in giù (cade dritta invece di seguire la pancia), meno dietro
            if c.z < collo.z:
                pancia = sm(petto, orlo_maglia + 0.12, c.z) * (1.0 if c.y < 0 else VOLUME['schiena'])
                d = (VOLUME['maglia'] + VOLUME['pancia'] * pancia) * sm(0.075, 0.14, (c - collo).length)
        elif c.z > orlo_corti + e:
            # i pantaloncini: più larghi verso l'orlo, la metà all'interno della coscia (le due gambe non si toccano)
            d = (VOLUME['corti'] + (VOLUME['orlo_corti'] - VOLUME['corti']) * sm(orlo_maglia, orlo_corti, c.z)) * (1.0 if abs(c.x) > coscia else VOLUME['interno'])
        elif c.z > calza - ORLO + e: d = 0.0
        elif c.z > risvolto - e: d = VOLUME['risvolto']
        elif c.z > caviglia + 0.05: d = VOLUME['calze']
        sposta.append((v, n * d))
    for v, dv in sposta: v.co += dv
    # la suola: sotto il suo anello lo scarpino si allarga in pianta, e il fondo resta piatto
    for v in in_suola:
        h = mathutils.Vector((verso[v].x, verso[v].y, 0)) if v in verso else mathutils.Vector()
        if h.length > 1e-6: v.co += h.normalized() * VOLUME['suola']
        v.co.z = max(v.co.z, pavimento)
    bm.verts.index_update(); tieni = sorted({v.index for v in anelli if v.is_valid})
    bm.to_mesh(o.data); bm.free(); o.data.update()
    # gli anelli degli orli non si alleggeriscono (peso 0 nel gruppo che il DECIMATE usa)
    o.vertex_groups['v_resto'].add(tieni, 0.0, 'REPLACE')
    print('DIVISA anca %.3f ginocchio %.3f caviglia %.3f manica %.3f orli %.3f %.3f calza %.3f risvolto %.3f suola %.3f; anelli %d' %
          (anca, ginocchio, caviglia, manica, orlo_maglia, orlo_corti, calza, risvolto, suola, len(tieni)))
    return tieni
ORLI = divisa_volume(corpo, rig)
# le dita tolte hanno rinumerato i vertici: gli occhi si ritrovano dal loro gruppo
_io = corpo.vertex_groups['v_occhi'].index
_ids = [v.index for v in corpo.data.vertices if any(g.group == _io for g in v.groups)]
occhi = {'l': [i for i in _ids if corpo.data.vertices[i].co.x > 0], 'r': [i for i in _ids if corpo.data.vertices[i].co.x <= 0]}
def porta(co, valori):
    """Il valore (per vertice del corpo pieno) nel punto del corpo pieno più vicino a co."""
    loc, _, fi, _ = albero.find_nearest(mathutils.Vector(co)); a, b, c = tri_pieni[fi]
    w = mathutils.geometry.barycentric_transform(loc, mathutils.Vector(base[a]), mathutils.Vector(base[b]), mathutils.Vector(base[c]), mathutils.Vector((1, 0, 0)), mathutils.Vector((0, 1, 0)), mathutils.Vector((0, 0, 1)))
    return valori[a] * w.x + valori[b] * w.y + valori[c] * w.z

def esporta(o, file):
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); rig.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.export_scene.gltf(filepath=file, use_selection=True, export_animations=False, export_skins=True, export_morph=True, export_morph_normal=False, export_attributes=True, export_materials='EXPORT', export_yup=True)

# la testa (dal collo in su, occhi esclusi): da vicino e a metà distanza si alleggerisce meno del resto
_collo = (rig.matrix_world @ rig.data.bones['mixamorig:Neck'].tail_local).z; _occhi = set(occhi['l'] + occhi['r'])
TESTA = [v.index for v in corpo.data.vertices if v.co.z > _collo and v.index not in _occhi]
for k, tri in enumerate(LOD):
    bpy.ops.object.select_all(action='DESELECT'); corpo.select_set(True); bpy.context.view_layer.objects.active = corpo
    bpy.ops.object.duplicate(); o = bpy.context.view_layer.objects.active; o.name = 'Lod%d' % k; m2 = o.data
    if k > 0:  # da lontano niente bulbi degli occhi
        bm = bmesh.new(); bm.from_mesh(m2); bm.verts.ensure_lookup_table(); bmesh.ops.delete(bm, geom=[bm.verts[i] for i in occhi['l'] + occhi['r']], context='VERTS'); bm.to_mesh(m2); bm.free()
    io = o.vertex_groups['v_occhi'].index; negli_occhi = lambda v: any(g.group == io for g in v.groups)
    tri_occhi = sum(len(p.vertices) - 2 for p in m2.polygons if all(negli_occhi(m2.vertices[i]) for i in p.vertices))
    tri0 = sum(len(p.vertices) - 2 for p in m2.polygons) - tri_occhi
    # gli anelli degli orli si tengono solo da vicino: più lontano si alleggeriscono come il resto
    if k > 0: o.vertex_groups['v_resto'].add(ORLI, 1.0, 'REPLACE')
    if k < 2: o.vertex_groups['v_resto'].add(TESTA, VISO_ALLEGGERISCI, 'REPLACE')
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
# Il guscio viene prima infittito (ogni faccia in quattro), perché ciocche e ciuffi hanno bisogno di punti; alla fine
# ogni capigliatura si alleggerisce a CAPELLI_TRI triangoli.
CAPELLI_TRI = 900
bmc = bmesh.new()
for _, c, _ in calotta[0]: bmc.verts.new(c)
bmc.verts.ensure_lookup_table()
for f in calotta[1]: bmc.faces.new([bmc.verts[i] for i in f])
bmesh.ops.subdivide_edges(bmc, edges=bmc.edges[:], cuts=1, use_grid_fill=True, smooth=0.5)
bmc.normal_update(); bmc.verts.index_update()
vc = np.array([v.co[:] for v in bmc.verts]); vn = np.array([v.normal[:] for v in bmc.verts]); facce_c = [[v.index for v in f.verts] for f in bmc.faces]; bmc.free()
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
    o = bpy.data.objects.new(nome, me2); bpy.context.scene.collection.objects.link(o)
    n0 = sum(len(p.vertices) - 2 for p in me2.polygons)
    if n0 > CAPELLI_TRI:
        bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
        d = o.modifiers.new('Alleggerisci', 'DECIMATE'); d.ratio = CAPELLI_TRI / n0; d.use_collapse_triangulate = True
        bpy.ops.object.modifier_apply(modifier=d.name)
    return o
alto = lambda p: max(0.0, (p[2] - bassa) / (cima - bassa))  # 0 alla nuca bassa, 1 in cima
dietro = lambda p: max(0.0, (p[1] - centro[1]) / (nuca - centro[1]))  # 0 a metà testa, 1 alla nuca
lato = lambda p: min(1.0, abs(p[0] - centro[0]) / 0.075)  # 0 sulla riga di mezzo, 1 sopra le orecchie
davanti = lambda p: sfuma(fronte + 0.075, fronte, p[1])  # 1 all'attaccatura sulla fronte, 0 dalla metà della testa
SU = np.array([0, 0, 1.0]); AVANTI = np.array([0, -1.0, 0])
def ciocche(p, giri=9.0):
    """Ciocche mosse (da -1 a 1): onde che girano attorno alla testa e cambiano verso salendo, come capelli pettinati con le dita."""
    a = np.arctan2(p[0] - centro[0], centro[1] - p[1]); h = alto(p)
    return np.sin(a * giri + 2.6 * np.sin(h * 7.0)) * (0.6 + 0.4 * np.sin(h * 11.0 + a * 3.0))
def punte(x, passo=0.016):
    """Le punte del ciuffo sulla fronte lungo x (da 0 a 1): due denti di sega di passo diverso, smussati, perché non
    sembrino tagliate a macchina."""
    dente = lambda q: (lambda t: 1.0 - abs(2.0 * t - 1.0))(((x - centro[0]) / q) % 1.0)
    v = 0.6 * dente(passo) + 0.4 * dente(passo * 1.73); return v * v * (3 - 2 * v)
# ogni capigliatura: spostamento del punto p (normale n, k = 0 all'attaccatura e 1 dentro). Struttura dal riferimento di
# Alex: volume in cima, lati più corti, ciocche mosse invece del casco liscio, ciuffo che scende irregolare sulla fronte
STILI = {
    'Hair_Corti': lambda p, n, k: n * (0.002 + 0.006 * k + 0.0015 * k * ciocche(p, 14)),
    'Hair_Folti': lambda p, n, k: n * (0.004 + k * (0.008 + 0.022 * alto(p)) * (1 - 0.4 * lato(p) * (1 - alto(p))) + 0.007 * k * alto(p) * ciocche(p))
                                  + (AVANTI * 0.014 - SU * 0.016 * (0.3 + 0.7 * punte(p[0]))) * davanti(p) * (1 - 0.6 * lato(p)),
    'Hair_Ciuffo': lambda p, n, k: n * (0.003 + 0.009 * k + 0.004 * k * ciocche(p, 11)) + (AVANTI * 0.014 + SU * 0.034) * sfuma(0.09, 0.0, abs(p[1] - fronte)) * sfuma(0.07, 0.02, abs(p[0] - centro[0])) * (0.4 + 0.6 * k) * (0.75 + 0.25 * punte(p[0], 0.012)),
    'Hair_Cresta': lambda p, n, k: n * (0.002 + 0.003 * k) + SU * 0.045 * sfuma(0.04, 0.008, abs(p[0] - centro[0])) * sfuma(0.2, 0.75, alto(p)) * (0.6 + 0.4 * punte(p[1], 0.022)),
    'Hair_Ricci': lambda p, n, k: n * (0.005 + 0.032 * k * (0.6 + 0.4 * alto(p)) + 0.011 * k * np.sin(p[0] * 190) * np.sin(p[1] * 170 + p[2] * 150))
                                  - SU * 0.012 * davanti(p) * (0.4 + 0.6 * punte(p[0], 0.02)),
    'Hair_Lunghi': lambda p, n, k: n * (0.004 + 0.014 * k + 0.005 * k * ciocche(p, 7)) + (np.array([0, 0.018, -0.075]) * dietro(p) * (1 - alto(p)) * (1 - 0.6 * k)),
    'Hair_Riga': lambda p, n, k: n * (0.003 + 0.011 * k + 0.004 * k * alto(p) * ciocche(p, 8)) + SU * 0.018 * k * alto(p) * (1.0 if p[0] > centro[0] + 0.015 else 0.2),
}
ogg = [capelli(n, f) for n, f in STILI.items()]
print('CAPELLI', {o.name: sum(len(p.vertices) - 2 for p in o.data.polygons) for o in ogg})
bpy.ops.object.select_all(action='DESELECT')
for o in ogg: o.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(USCITA, 'capelli.glb'), use_selection=True, export_animations=False, export_materials='NONE', export_yup=True)
json.dump(punti, open(os.path.join(USCITA, 'punti.json'), 'w'), indent=1)
print('PUNTI', json.dumps(punti))
