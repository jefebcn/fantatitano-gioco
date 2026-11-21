# Corpo base dei calciatori con MPFB (MakeHuman per Blender: i personaggi creati sono CC0). Maschio adulto atletico, viso
# misto e generico, in posa a T, senza scheletro: il file FBX va caricato sull'auto-rigger di Mixamo (lo fa Alex), che
# rimanda il corpo con lo scheletro di Mixamo, così tutte le animazioni Mixamo funzionano senza retarget.
# Per portarlo in posa a T si usa lo scheletro «default» di MPFB (combacia col corpo): braccia e avambracci girati in
# orizzontale, poi la posa diventa la forma del corpo e lo scheletro si toglie.
# Uso: blender -b --python scripts/blender/corpo_base.py -- <cartella di uscita>
# Esce: corpo_base.fbx (per Mixamo), corpo_base.glb (per controllo), corpo_base.blend
import bpy, sys, os, json, mathutils
from bl_ext.blender_org.mpfb.services.humanservice import HumanService
from bl_ext.blender_org.mpfb.services.rigservice import RigService
from bl_ext.blender_org.mpfb.services.locationservice import LocationService

uscita = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else '/tmp'
os.makedirs(uscita, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)

# il corpo: maschio adulto (circa 25 anni), atletico, peso nella media, proporzioni ideali, viso misto (generico, nessuno in
# particolare)
MACRO = {'gender': 1.0, 'age': 0.5, 'muscle': 0.72, 'weight': 0.48, 'proportions': 0.75, 'height': 0.55, 'cupsize': 0.5, 'firmness': 0.5,
         'race': {'asian': 0.33, 'caucasian': 0.34, 'african': 0.33}}
corpo = HumanService.create_human(mask_helpers=True, detailed_helpers=True, extra_vertex_groups=True, feet_on_ground=True, macro_detail_dict=MACRO)
corpo.name = 'Corpo'

# posa a T con lo scheletro default di MPFB e la sua posa ufficiale
rig = HumanService.add_builtin_rig(corpo, 'default', import_weights=True)
bpy.context.view_layer.objects.active = rig; bpy.ops.object.mode_set(mode='POSE')
# posa a T: il braccio (upperarm01) girato finché punta in orizzontale verso l'esterno, poi l'avambraccio (lowerarm01)
# raddrizzato sulla stessa linea. Rotazioni calcolate dalla posa di riposo e messe nello spazio di ogni osso
def gira(nome, R_padre):
    b = rig.data.bones[nome]; pb = rig.pose.bones[nome]
    d = (R_padre @ (b.tail_local - b.head_local)).normalized(); voluta = mathutils.Vector((1.0 if d.x > 0 else -1.0, 0.0, 0.0))
    R = d.rotation_difference(voluta).to_matrix(); B = b.matrix_local.to_3x3()
    pb.rotation_mode = 'QUATERNION'; pb.rotation_quaternion = (B.inverted() @ R_padre.inverted() @ R @ R_padre @ B).to_quaternion()
    return R @ R_padre
for lato in ('L', 'R'):
    Rb = gira('upperarm01.%s' % lato, mathutils.Matrix.Identity(3))
    gira('lowerarm01.%s' % lato, Rb)
bpy.context.view_layer.update()
bpy.ops.object.mode_set(mode='OBJECT'); bpy.context.view_layer.update()

# la posa e le forme di MPFB diventano la forma fissa del corpo; poi via lo scheletro e i suoi gruppi di vertici
bpy.context.view_layer.objects.active = corpo
if corpo.data.shape_keys: bpy.ops.object.shape_key_remove(all=True, apply_mix=True)
for mod in list(corpo.modifiers): bpy.ops.object.modifier_apply(modifier=mod.name)
corpo.parent = None
bpy.data.objects.remove(rig, do_unlink=True)
corpo.vertex_groups.clear()
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

me = corpo.data
tri = sum(len(p.vertices) - 2 for p in me.polygons)
zs = [v.co.z for v in me.vertices]; xs = [v.co.x for v in me.vertices]
print('CORPO: vertici %d, triangoli %d, altezza %.2f m, apertura braccia %.2f m' % (len(me.vertices), tri, max(zs) - min(zs), max(xs) - min(xs)))

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(uscita, 'corpo_base.blend'))
bpy.ops.object.select_all(action='DESELECT'); corpo.select_set(True)
bpy.ops.export_scene.fbx(filepath=os.path.join(uscita, 'corpo_base.fbx'), use_selection=True, add_leaf_bones=False, bake_anim=False)
bpy.ops.export_scene.gltf(filepath=os.path.join(uscita, 'corpo_base.glb'), use_selection=True, export_animations=False)
