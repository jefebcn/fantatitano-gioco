# Corpo base dei calciatori con MPFB (MakeHuman per Blender: i personaggi creati sono CC0). Maschio adulto atletico, viso
# misto e generico, con lo scheletro «mixamo» di MPFB (stessi nomi delle ossa di Mixamo, pesi di MPFB) messo in posa a T
# come posa di riposo. Tutto da script: ripetibile, e le corporature restano sullo stesso scheletro.
# Uso: blender -b --python scripts/blender/corpo_base.py -- <cartella di uscita> [triangoli, 0 = tutti]
# Esce: corpo_base.glb (corpo con scheletro), corpo_base.fbx, corpo_base.blend
import bpy, sys, os, mathutils
from bl_ext.blender_org.mpfb.services.humanservice import HumanService
from bl_ext.blender_org.mpfb.services.rigservice import RigService

arg = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
uscita = arg[0] if arg else '/tmp'; TRI = int(arg[1]) if len(arg) > 1 else 0
os.makedirs(uscita, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)

# il corpo: maschio adulto (circa 25 anni), atletico, peso nella media, proporzioni ideali, viso misto (generico, nessuno in
# particolare). I gruppi «joint» servono a MPFB per mettere le ossa al posto giusto: senza, lo scheletro non combacia
MACRO = {'gender': 1.0, 'age': 0.5, 'muscle': 0.72, 'weight': 0.48, 'proportions': 0.75, 'height': 0.55, 'cupsize': 0.5, 'firmness': 0.5,
         'race': {'asian': 0.33, 'caucasian': 0.34, 'african': 0.33}}
corpo = HumanService.create_human(mask_helpers=True, detailed_helpers=True, extra_vertex_groups=True, feet_on_ground=True, macro_detail_dict=MACRO)
corpo.name = 'Corpo'
rig = HumanService.add_builtin_rig(corpo, 'mixamo', import_weights=True)
rig.name = 'Scheletro'

# posa a T: braccio e avambraccio girati finché puntano in orizzontale verso l'esterno (rotazioni calcolate dalla posa di
# riposo e messe nello spazio di ogni osso), poi la posa diventa quella di riposo di corpo e scheletro
bpy.context.view_layer.objects.active = rig; bpy.ops.object.mode_set(mode='POSE')
def gira(nome, R_padre):
    b = rig.data.bones[nome]; pb = rig.pose.bones[nome]
    d = (R_padre @ (b.tail_local - b.head_local)).normalized(); voluta = mathutils.Vector((1.0 if d.x > 0 else -1.0, 0.0, 0.0))
    R = d.rotation_difference(voluta).to_matrix(); B = b.matrix_local.to_3x3()
    pb.rotation_mode = 'QUATERNION'; pb.rotation_quaternion = (B.inverted() @ R_padre.inverted() @ R @ R_padre @ B).to_quaternion()
    return R @ R_padre
for lato in ('Left', 'Right'):
    Rb = gira('mixamorig:%sArm' % lato, mathutils.Matrix.Identity(3))
    gira('mixamorig:%sForeArm' % lato, Rb)
bpy.context.view_layer.update(); bpy.ops.object.mode_set(mode='OBJECT')
RigService.apply_pose_as_rest_pose(rig)

# via le parti di servizio di MakeHuman (maschera) e, se chiesto, alleggerimento a TRI triangoli tenendo i pesi delle ossa
bpy.ops.object.select_all(action='DESELECT'); bpy.context.view_layer.objects.active = corpo; corpo.select_set(True)
if corpo.data.shape_keys: bpy.ops.object.shape_key_remove(all=True, apply_mix=True)
for mod in list(corpo.modifiers):
    if mod.type == 'MASK': bpy.ops.object.modifier_apply(modifier=mod.name)
tri0 = sum(len(p.vertices) - 2 for p in corpo.data.polygons)
if TRI and TRI < tri0:
    d = corpo.modifiers.new('Alleggerisci', 'DECIMATE'); d.ratio = TRI / tri0; d.use_collapse_triangulate = True
    bpy.ops.object.modifier_move_to_index(modifier=d.name, index=0); bpy.ops.object.modifier_apply(modifier=d.name)
# solo i gruppi di vertici delle ossa (gli altri sono di servizio)
ossa = {b.name for b in rig.data.bones}
for g in list(corpo.vertex_groups):
    if g.name not in ossa: corpo.vertex_groups.remove(g)

me = corpo.data; tri = sum(len(p.vertices) - 2 for p in me.polygons); zs = [v.co.z for v in me.vertices]; xs = [v.co.x for v in me.vertices]
print('CORPO: vertici %d, triangoli %d (da %d), altezza %.2f m, apertura braccia %.2f m, ossa %d' % (len(me.vertices), tri, tri0, max(zs) - min(zs), max(xs) - min(xs), len(rig.data.bones)))

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(uscita, 'corpo_base.blend'))
bpy.ops.object.select_all(action='DESELECT'); corpo.select_set(True); rig.select_set(True)
bpy.ops.export_scene.fbx(filepath=os.path.join(uscita, 'corpo_base.fbx'), use_selection=True, add_leaf_bones=False, bake_anim=False)
bpy.ops.export_scene.gltf(filepath=os.path.join(uscita, 'corpo_base.glb'), use_selection=True, export_animations=False, export_skins=True)
