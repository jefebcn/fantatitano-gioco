"""Maschera della divisa e pelle per il calciatore nuovo (corpo MPFB, modelli/calciatore.glb fatto da scripts/calciatore-nuovo.py).

Come scripts/maschera-divisa.py (quello del corpo di prima): per ogni punto della texture dice che zona è (maglia,
pantaloncini, calzettoni, scarpe, pelle...) e dove sta sul corpo, così il gioco colora le zone coi colori della squadra
(src/divisa.js). In più, per la pelle, dice che cosa c'è sopra: capelli dipinti sul cuoio capelluto, sopracciglia, barba,
occhio. Sono «sottozone» della pelle scritte nello stesso canale (valori sotto 7): 0 pelle, 2 capelli, 4 sopracciglia,
5 barba, 6 occhio. Il colore di capelli, sopracciglia e barba lo mette lo shader, giocatore per giocatore.

La pelle (public/img/pelle.webp) è disegnata qui: tono chiaro di base (lo shader lo scurisce secondo il giocatore), ombre
morbide dove la pelle guarda in giù, guance e labbra più rosse, unghie, e nell'angolo l'occhio (bianco, iride, pupilla).
Niente fotografie e nessun viso vero: è un viso generico.

Uscite: public/img/divisa-maschera.png, public/img/pelle.webp
Uso: python3 scripts/maschera-nuova.py [lato in pixel, 1024]
"""
import json, struct, sys
import numpy as np
from PIL import Image, ImageFilter

N = int(sys.argv[1]) if len(sys.argv) > 1 else 1024
glb = open('modelli/calciatore.glb', 'rb').read(); n0 = struct.unpack('<I', glb[12:16])[0]
j = json.loads(glb[20:20 + n0]); buf = glb[20 + n0 + 8:]; PT = json.load(open('modelli/mpfb/punti.json'))
CT = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}; NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}
def acc(i):
    a = j['accessors'][i]; v = j['bufferViews'][a['bufferView']]; n = NC[a['type']]; dt = np.dtype(CT[a['componentType']])
    off = v.get('byteOffset', 0) + a.get('byteOffset', 0); stride = v.get('byteStride') or dt.itemsize * n
    raw = np.frombuffer(buf, np.uint8, count=stride * (a['count'] - 1) + dt.itemsize * n, offset=off)
    out = np.lib.stride_tricks.as_strided(raw, (a['count'], dt.itemsize * n), (stride, 1)).copy().view(dt).reshape(a['count'], n)
    return out.astype(np.float64) if dt == np.float32 else out
def qmat(q):
    x, y, z, w = q; return np.array([[1-2*(y*y+z*z), 2*(x*y-z*w), 2*(x*z+y*w)], [2*(x*y+z*w), 1-2*(x*x+z*z), 2*(y*z-x*w)], [2*(x*z-y*w), 2*(y*z+x*w), 1-2*(x*x+y*y)]])
par = {c: i for i, n in enumerate(j['nodes']) for c in n.get('children', [])}
def world(i):
    n = j['nodes'][i]; M = np.eye(4); M[:3, :3] = qmat(n.get('rotation', [0, 0, 0, 1])) * np.array(n.get('scale', [1, 1, 1])); M[:3, 3] = n.get('translation', [0, 0, 0])
    return world(par[i]) @ M if i in par else M
P = {n['name']: world(i)[:3, 3] for i, n in enumerate(j['nodes']) if 'name' in n and 'mesh' not in n}
hip, knee, ank, neck = P['thigh_l'][1], P['calf_l'][1], P['foot_l'][1], P['neck_01'][1]
shX, elX, wrX, pelvis = abs(P['upperarm_l'][0]), abs(P['lowerarm_l'][0]), abs(P['hand_l'][0]), P['pelvis'][1]
print('riferimenti (m): anca %.2f ginocchio %.2f caviglia %.2f collo %.2f spalla %.2f gomito %.2f polso %.2f' % (hip, knee, ank, neck, shX, elX, wrX))

prim = next(m for m in j['meshes'] if m['name'] == 'SuperHero_Male')['primitives'][0]; A = prim['attributes']
pos, nor, uv, idx = acc(A['POSITION']), acc(A['NORMAL']), acc(A['TEXCOORD_0']), acc(prim['indices']).reshape(-1, 3)
extra = np.stack([acc(A[k]).reshape(-1) for k in ('_LABBRA', '_CUOIO', '_OCCHI', '_UNGHIE')], 1)
dati = np.concatenate([pos, nor, extra], 1); D = dati.shape[1]
tex = np.full((N, N, D), np.nan)
for a, b, c in idx:  # ogni triangolo disegnato nello spazio della texture, portandosi dietro posizione, normale e segni
    t = uv[[a, b, c]] * N; x0, y0 = np.floor(t.min(0)).astype(int) - 1; x1, y1 = np.ceil(t.max(0)).astype(int) + 1
    x0, y0, x1, y1 = max(x0, 0), max(y0, 0), min(x1, N - 1), min(y1, N - 1)
    if x1 < x0 or y1 < y0: continue
    gx, gy = np.meshgrid(np.arange(x0, x1 + 1) + .5, np.arange(y0, y1 + 1) + .5)
    d = (t[1, 1] - t[2, 1]) * (t[0, 0] - t[2, 0]) + (t[2, 0] - t[1, 0]) * (t[0, 1] - t[2, 1])
    if abs(d) < 1e-9: continue
    w0 = ((t[1, 1] - t[2, 1]) * (gx - t[2, 0]) + (t[2, 0] - t[1, 0]) * (gy - t[2, 1])) / d
    w1 = ((t[2, 1] - t[0, 1]) * (gx - t[2, 0]) + (t[0, 0] - t[2, 0]) * (gy - t[2, 1])) / d; w2 = 1 - w0 - w1
    m = (w0 >= -.02) & (w1 >= -.02) & (w2 >= -.02)
    v = w0[..., None] * dati[a] + w1[..., None] * dati[b] + w2[..., None] * dati[c]
    sub = tex[y0:y1 + 1, x0:x1 + 1]; sub[m] = v[m]
ok = ~np.isnan(tex[..., 0]); print('texture coperta: %.0f%%' % (ok.mean() * 100))
for _ in range(8):  # allarga i bordi: evita le righe di colore sbagliato lungo le cuciture
    miss = np.isnan(tex[..., 0])
    for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
        sh = np.roll(tex, (dy, dx), (0, 1)); take = miss & ~np.isnan(sh[..., 0]); tex[take] = sh[take]; miss = np.isnan(tex[..., 0])
vuoto = np.isnan(tex[..., 0]); tex = np.nan_to_num(tex)
X, y, z = tex[..., 0], tex[..., 1], tex[..., 2]; x = np.abs(X); ny, nzn = tex[..., 4], tex[..., 5]
labbra, cuoio, occhio, unghie = tex[..., 6], tex[..., 7], tex[..., 8] > .5, tex[..., 9]

# ---------------------------------------------------------------- le zone della divisa (come nel corpo di prima)
SKIN, SHIRT, SHORTS, SOCKS, BOOTS, ARM, HAND, COLLAR, CUFF = range(9)
SCOLLO = -.005  # dove passa la scollatura, in metri lungo il collo a partire dalla sua base
zona = np.full((N, N), SKIN, np.uint8)
braccio = (x > shX * .9) & (y > pelvis)
nx, nz = P['neck_01'][0], P['neck_01'][2]
# la scollatura: un piano di traverso all'asse del collo (che pende in avanti, quindi è più bassa davanti che dietro).
# lungo = quanto un punto sta sopra quel piano, dcollo = quanto è lontano dall'asse
asse = P['Head'] - P['neck_01']; asse = asse / np.linalg.norm(asse); rel = np.stack([X - P['neck_01'][0], y - P['neck_01'][1], z - P['neck_01'][2]], -1)
lungo = rel @ asse; dcollo = np.linalg.norm(rel - lungo[..., None] * asse, axis=-1)
collo = (lungo > SCOLLO + .05) | ((lungo > SCOLLO) & (dcollo < .085 + (lungo - SCOLLO) * 1.6))
torso = ~braccio & ~collo & (y > hip - .05)
zona[torso] = SHIRT
manica = shX + (elX - shX) * .62
zona[braccio & ~collo & (x < manica)] = SHIRT
zona[braccio & ~collo & (x < manica) & (x >= manica - .035)] = CUFF
zona[~collo & (lungo > SCOLLO - .028) & (dcollo < .12) & (zona == SHIRT)] = COLLAR
zona[braccio & (x >= manica) & (x < wrX * .985)] = ARM
zona[braccio & (x >= wrX * .985)] = HAND
gamba = ~braccio & (y <= hip - .05)
zona[gamba & (y > knee + (hip - knee) * .34)] = SHORTS
zona[gamba & (y <= knee - (knee - ank) * .16) & (y > ank + .04)] = SOCKS
zona[gamba & (y <= ank + .04)] = BOOTS
zona[vuoto] = SKIN
davanti = z > nz + .01

# ---------------------------------------------------------------- che cosa c'è sulla pelle: capelli, sopracciglia, barba, occhio
PELLE, CAPELLI, SOPRACCIGLIA, BARBA, OCCHIO = 0, 2, 4, 5, 6
sotto = np.zeros((N, N), np.uint8); testa = (zona == SKIN) & (y > neck) & ~vuoto
(ex, ey, ez), ro = PT['occhi'][0], PT['raggio_occhio']; bx, by, bz = PT['bocca']
sotto[testa & (cuoio > .5)] = CAPELLI
ax = np.abs(x - ex)  # distanza di lato dall'occhio (i due lati sono simmetrici)
arco = ey + ro * 1.75 - (ax / (ro * 2.2)) ** 2 * ro * .55 - np.where(x > ex, (x - ex) * .25, 0)
sotto[testa & (z > ez - .02) & (x > .009) & (ax < ro * 2.15) & (np.abs(y - arco) < ro * .27) & (cuoio < .5)] = SOPRACCIGLIA
barba = testa & (cuoio < .5) & (labbra < .3) & (y < by + .022) & (y > by - .085) & (z > nz + .035) & ~((np.abs(X) < .028) & (np.abs(y - (by + .012)) < .012))
sotto[barba] = BARBA
sotto[occhio & ~vuoto] = OCCHIO
zona[occhio] = SKIN

out = np.zeros((N, N, 3), np.uint8); out[..., 0] = np.where(zona == SKIN, sotto, zona * 28 + davanti * 14)
out[..., 1] = np.clip((X + .5) * 255, 0, 255); out[..., 2] = np.clip(y / 1.9 * 255, 0, 255)
Image.fromarray(out).save('public/img/divisa-maschera.png', optimize=True)

# ---------------------------------------------------------------- la pelle disegnata
rng = np.random.default_rng(7); grana = rng.normal(0, 1, (N, N))
grana = np.asarray(Image.fromarray(np.clip(grana * 40 + 128, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2)), float) / 128 - 1
base = np.array([236., 196., 168.]); img = np.ones((N, N, 3)) * base
ombra = np.clip(-ny, 0, 1) * .16 + np.clip(.25 - nzn, 0, 1) * .04  # più scura dove guarda in giù e, appena, dietro
img *= (1 - ombra)[..., None]; img *= (1 + grana * .035)[..., None]
rosso = np.array([212., 128., 118.])
guance = testa & (np.abs(y - (ey - .035)) < .03) & (np.abs(x - .045) < .03) & (z > ez - .035)
def sfuma(m, r): return np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r)), float) / 255
img += (rosso - img) * (sfuma(guance, 6) * .18)[..., None]
img += (np.array([204., 138., 126.]) - img) * (sfuma(labbra > .5, 1.5) * .5)[..., None]
img += (np.array([240., 214., 200.]) - img) * (np.clip(unghie, 0, 1) * .6)[..., None]
# una riga scura sulle ciglia e un po' d'ombra nell'orbita
orbita = testa & (z > ez - .02) & (np.hypot(ax, y - ey) < ro * 1.25)
img *= (1 - sfuma(orbita, 2.5) * .22)[..., None]
# l'occhio nella sua cella: bianco, iride castana col bordo scuro, pupilla, un riflesso
cx, cy, cr = [v * N for v in PT['cella_occhio']]; gy, gx = np.mgrid[0:N, 0:N] + .5; r = np.hypot(gx - cx, gy - cy) / cr
cella = (np.abs(gx - cx) < cr * 1.3) & (np.abs(gy - cy) < cr * 1.3)
occ = np.ones((N, N, 3)) * np.array([236., 232., 226.]) * (1 - np.clip(r - .55, 0, 1) * .35)[..., None]
iride = np.array([92., 60., 36.]); occ = np.where((r < .50)[..., None], iride * (0.75 + 0.5 * (1 - r / .5))[..., None], occ)
occ = np.where(((r < .50) & (r > .44))[..., None], np.array([40., 26., 18.]), occ); occ = np.where((r < .22)[..., None], np.array([14., 12., 12.]), occ)
occ = np.where((np.hypot(gx - cx + cr * .16, gy - cy + cr * .18) / cr < .08)[..., None], np.array([250., 250., 250.]), occ)
img = np.where(cella[..., None], occ, img)
Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).save('public/img/pelle.webp', quality=90)
nomi = ['pelle', 'maglia', 'pantaloncini', 'calzettoni', 'scarpe', 'avambraccio', 'mano', 'colletto', 'bordo']
print('zone (% della texture):', {n: round(float((zona[~vuoto] == k).mean() * 100), 1) for k, n in enumerate(nomi)})
print('sulla pelle (% della texture):', {n: round(float((sotto == k).mean() * 100), 2) for n, k in (('capelli', CAPELLI), ('sopracciglia', SOPRACCIGLIA), ('barba', BARBA), ('occhio', OCCHIO))})
