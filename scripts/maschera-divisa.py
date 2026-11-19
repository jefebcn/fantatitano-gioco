"""Costruisce la maschera della divisa per il calciatore, dal modello già alleggerito (modelli/calciatore.glb):
va rifatta ogni volta che si rigenera il modello, se no gli orli non seguono più i triangoli.

Per ogni punto della texture del corpo dice che cos'è: pelle, maglia, pantaloncini, calzettoni, scarpe,
avambraccio, mano. Lo decide dalla posizione 3D di quel punto nella posa a T (non triangolo per triangolo),
così gli orli vengono dritti. Il gioco poi colora le zone coi colori della squadra (src/divisa.js).

Uscite: public/img/divisa-maschera.png  (R = zona x 28, +14 se il punto è sul davanti del corpo; G = posizione sinistra-destra su 1 m,
        B = altezza su 1,9 m: servono per righe e fasce; il davanti serve per lo scollo a V e la polo)
        public/img/pelle.webp, public/img/occhi.webp
Uso: python3 scripts/maschera-divisa.py [lato in pixel, 512]
"""
import json, struct, sys
import numpy as np
from PIL import Image

SRC = 'modelli/quaternius'; N = int(sys.argv[1]) if len(sys.argv) > 1 else 512
glb = open('modelli/calciatore.glb', 'rb').read(); n0 = struct.unpack('<I', glb[12:16])[0]
j = json.loads(glb[20:20 + n0]); buf = glb[20 + n0 + 8:]
CT = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}; NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}
def acc(i):
    a = j['accessors'][i]; v = j['bufferViews'][a['bufferView']]; n = NC[a['type']]; dt = np.dtype(CT[a['componentType']])
    off = v.get('byteOffset', 0) + a.get('byteOffset', 0); stride = v.get('byteStride') or dt.itemsize * n
    raw = np.frombuffer(buf, np.uint8, count=stride * (a['count'] - 1) + dt.itemsize * n, offset=off)
    out = np.lib.stride_tricks.as_strided(raw, (a['count'], dt.itemsize * n), (stride, 1)).copy().view(dt).reshape(a['count'], n)
    if a.get('normalized'): return out.astype(np.float64) / np.iinfo(dt).max
    return out.astype(np.float64) if dt == np.float32 else out

# posizione nel mondo delle ossa a riposo
def qmat(q):
    x, y, z, w = q; return np.array([[1-2*(y*y+z*z), 2*(x*y-z*w), 2*(x*z+y*w)], [2*(x*y+z*w), 1-2*(x*x+z*z), 2*(y*z-x*w)], [2*(x*z-y*w), 2*(y*z+x*w), 1-2*(x*x+y*y)]])
par = {c: i for i, n in enumerate(j['nodes']) for c in n.get('children', [])}
def world(i):
    n = j['nodes'][i]; M = np.eye(4); M[:3, :3] = qmat(n.get('rotation', [0, 0, 0, 1])) * np.array(n.get('scale', [1, 1, 1])); M[:3, 3] = n.get('translation', [0, 0, 0])
    return world(par[i]) @ M if i in par else M
P = {n['name']: world(i)[:3, 3] for i, n in enumerate(j['nodes']) if 'name' in n}
hip, knee, ank, neck = P['thigh_l'][1], P['calf_l'][1], P['foot_l'][1], P['neck_01'][1]
shX, elX, wrX, pelvis = abs(P['upperarm_l'][0]), abs(P['lowerarm_l'][0]), abs(P['hand_l'][0]), P['pelvis'][1]
print('riferimenti (m): anca %.2f ginocchio %.2f caviglia %.2f collo %.2f spalla %.2f gomito %.2f polso %.2f' % (hip, knee, ank, neck, shX, elX, wrX))

prim = next(p for m in j['meshes'] for p in m['primitives'] if j['materials'][p['material']]['name'] == 'MI_Superhero_Male')
pos, uv, idx = acc(prim['attributes']['POSITION']), acc(prim['attributes']['TEXCOORD_0']), acc(prim['indices']).reshape(-1, 3)
xyz = np.full((N, N, 3), np.nan)
for a, b, c in idx:  # ogni triangolo disegnato nello spazio della texture, portandosi dietro la posizione 3D
    t = uv[[a, b, c]] * N; x0, y0 = np.floor(t.min(0)).astype(int) - 1; x1, y1 = np.ceil(t.max(0)).astype(int) + 1
    x0, y0, x1, y1 = max(x0, 0), max(y0, 0), min(x1, N - 1), min(y1, N - 1)
    if x1 < x0 or y1 < y0: continue
    gx, gy = np.meshgrid(np.arange(x0, x1 + 1) + .5, np.arange(y0, y1 + 1) + .5)
    d = (t[1, 1] - t[2, 1]) * (t[0, 0] - t[2, 0]) + (t[2, 0] - t[1, 0]) * (t[0, 1] - t[2, 1])
    if abs(d) < 1e-9: continue
    w0 = ((t[1, 1] - t[2, 1]) * (gx - t[2, 0]) + (t[2, 0] - t[1, 0]) * (gy - t[2, 1])) / d
    w1 = ((t[2, 1] - t[0, 1]) * (gx - t[2, 0]) + (t[0, 0] - t[2, 0]) * (gy - t[2, 1])) / d; w2 = 1 - w0 - w1
    m = (w0 >= -.02) & (w1 >= -.02) & (w2 >= -.02)
    p3 = w0[..., None] * pos[a] + w1[..., None] * pos[b] + w2[..., None] * pos[c]
    sub = xyz[y0:y1 + 1, x0:x1 + 1]; sub[m] = p3[m]
ok = ~np.isnan(xyz[..., 0]); print('texture coperta: %.0f%%' % (ok.mean() * 100))
for _ in range(8):  # allarga i bordi: evita le righe di colore sbagliato lungo le cuciture
    miss = np.isnan(xyz[..., 0])
    for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
        sh = np.roll(xyz, (dy, dx), (0, 1)); take = miss & ~np.isnan(sh[..., 0]); xyz[take] = sh[take]; miss = np.isnan(xyz[..., 0])
x, y, z = np.abs(xyz[..., 0]), xyz[..., 1], xyz[..., 2]
SKIN, SHIRT, SHORTS, SOCKS, BOOTS, ARM, HAND, COLLAR, CUFF = range(9)
zona = np.full((N, N), SKIN, np.uint8)
braccio = (x > shX * .9) & (y > pelvis)
# il colletto è un cerchio attorno al collo, non un taglio orizzontale: se no le spalle restano scoperte
nx, nz = P['neck_01'][0], P['neck_01'][2]; collo = (y > neck + .05) | ((y > neck - .04) & (np.hypot(xyz[..., 0] - nx, z - nz) < .078))
torso = ~braccio & ~collo & (y > hip - .05)
zona[torso] = SHIRT
manica = shX + (elX - shX) * .62
zona[braccio & ~collo & (x < manica)] = SHIRT
zona[braccio & ~collo & (x < manica) & (x >= manica - .035)] = CUFF  # il bordo della manica
dist = np.hypot(xyz[..., 0] - nx, z - nz); zona[~collo & (y > neck - .075) & (dist < .112) & (zona == SHIRT)] = COLLAR  # il bordo del colletto
zona[braccio & (x >= manica) & (x < wrX * .985)] = ARM
zona[braccio & (x >= wrX * .985)] = HAND
gamba = ~braccio & (y <= hip - .05)
zona[gamba & (y > knee + (hip - knee) * .34)] = SHORTS
zona[gamba & (y <= knee - (knee - ank) * .16) & (y > ank + .035)] = SOCKS
zona[gamba & (y <= ank + .035)] = BOOTS
zona[np.isnan(x)] = SKIN
davanti = np.nan_to_num(z, nan=-9) > nz + .01  # davanti al collo (il collo sta più indietro del centro del busto)
out = np.zeros((N, N, 3), np.uint8); out[..., 0] = zona * 28 + davanti * 14
out[..., 1] = np.clip((np.nan_to_num(xyz[..., 0]) + .5) * 255, 0, 255); out[..., 2] = np.clip(np.nan_to_num(y) / 1.9 * 255, 0, 255)
Image.fromarray(out).save('public/img/divisa-maschera.png', optimize=True)
Image.open(f'{SRC}/T_Superhero_Male_Ligh.png').convert('RGB').resize((N, N), Image.LANCZOS).save('public/img/pelle.webp', quality=88)
Image.open(f'{SRC}/T_Eye_Brown.png').convert('RGB').resize((128, 128), Image.LANCZOS).save('public/img/occhi.webp', quality=90)
print('zone (% della texture):', {n: round(float((zona == k).mean() * 100), 1) for k, n in enumerate(['pelle', 'maglia', 'pantaloncini', 'calzettoni', 'scarpe', 'avambraccio', 'mano', 'colletto', 'bordo manica'])})
