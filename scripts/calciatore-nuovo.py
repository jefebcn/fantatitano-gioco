"""Assembla il calciatore nuovo (corpo MPFB, vedi scripts/blender/calciatore.py) sullo scheletro che il gioco usa già.

Lo scheletro resta quello di prima (modelli/quaternius-scheletro.glb: stessi nomi, stessa gerarchia, stesse rotazioni a
riposo), ma ogni osso viene spostato dov'è la giuntura corrispondente del corpo nuovo. Le animazioni del gioco sono solo
rotazioni (più l'altezza del bacino), quindi continuano a valere così come sono, e tutto il codice che cerca le ossa per
nome non cambia. Il corpo nuovo è scalato perché il bacino stia alla stessa altezza di prima (i piedi restano a terra in
tutte le animazioni).

Uscite: modelli/calciatore.glb  (tre livelli di dettaglio: SuperHero_Male, Lod1, Lod2; un materiale solo; forme «snello» e
        «robusto»; attributi _LABBRA, _CUOIO, _OCCHI, _UNGHIE per dipingere viso e zone) e modelli/capelli.glb
Uso: python3 scripts/calciatore-nuovo.py <cartella con lod0.glb, lod1.glb, lod2.glb, capelli.glb, punti.json>
"""
import json, struct, sys
import numpy as np

SRC = sys.argv[1]
CT = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}; NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}

class Glb:
    def __init__(self, file):
        d = open(file, 'rb').read(); n0 = struct.unpack('<I', d[12:16])[0]; self.j = json.loads(d[20:20 + n0]); self.buf = d[20 + n0 + 8:]
        self.par = {c: i for i, n in enumerate(self.j['nodes']) for c in n.get('children', [])}
    def acc(self, i):
        a = self.j['accessors'][i]; v = self.j['bufferViews'][a['bufferView']]; n = NC[a['type']]; dt = np.dtype(CT[a['componentType']])
        off = v.get('byteOffset', 0) + a.get('byteOffset', 0); stride = v.get('byteStride') or dt.itemsize * n
        raw = np.frombuffer(self.buf, np.uint8, count=stride * (a['count'] - 1) + dt.itemsize * n, offset=off)
        out = np.lib.stride_tricks.as_strided(raw, (a['count'], dt.itemsize * n), (stride, 1)).copy().view(dt).reshape(a['count'], n)
        if a.get('normalized'): return out.astype(np.float64) / np.iinfo(dt).max
        return out.astype(np.float64) if dt == np.float32 else out
    def locale(self, i):
        n = self.j['nodes'][i]; M = np.eye(4)
        if 'matrix' in n: return np.array(n['matrix']).reshape(4, 4).T
        x, y, z, w = n.get('rotation', [0, 0, 0, 1])
        R = np.array([[1-2*(y*y+z*z), 2*(x*y-z*w), 2*(x*z+y*w)], [2*(x*y+z*w), 1-2*(x*x+z*z), 2*(y*z-x*w)], [2*(x*z-y*w), 2*(y*z+x*w), 1-2*(x*x+y*y)]])
        M[:3, :3] = R * np.array(n.get('scale', [1, 1, 1])); M[:3, 3] = n.get('translation', [0, 0, 0]); return M
    def mondo(self, i): return self.mondo(self.par[i]) @ self.locale(i) if i in self.par else self.locale(i)

# ---------------------------------------------------------------- lo scheletro del gioco
V = Glb('modelli/quaternius-scheletro.glb'); vj = V.j; vskin = vj['skins'][0]; vjoints = vskin['joints']
vnome = {vj['nodes'][i]['name']: i for i in vjoints}; vW = {i: V.mondo(i) for i in range(len(vj['nodes']))}
MAPPA = {'Hips': 'pelvis', 'Spine': 'spine_01', 'Spine1': 'spine_02', 'Spine2': 'spine_03', 'Neck': 'neck_01', 'Head': 'Head'}
for lato, s in (('Left', '_l'), ('Right', '_r')):
    MAPPA.update({lato + 'Shoulder': 'clavicle' + s, lato + 'Arm': 'upperarm' + s, lato + 'ForeArm': 'lowerarm' + s, lato + 'Hand': 'hand' + s,
                  lato + 'UpLeg': 'thigh' + s, lato + 'Leg': 'calf' + s, lato + 'Foot': 'foot' + s, lato + 'ToeBase': 'ball' + s})
    for dito, d in (('Index', 'index'), ('Middle', 'middle'), ('Pinky', 'pinky'), ('Ring', 'ring'), ('Thumb', 'thumb')):
        for k in (1, 2, 3): MAPPA['%sHand%s%d' % (lato, dito, k)] = '%s_0%d%s' % (d, k, s)
senza = lambda n: n.replace('mixamorig:', '')

def leggi_lod(file):
    g = Glb(file); j = g.j; sk = j['skins'][0]; ibm = g.acc(sk['inverseBindMatrices']).reshape(-1, 4, 4).transpose(0, 2, 1)
    nomi = [senza(j['nodes'][i]['name']) for i in sk['joints']]; Wj = [g.mondo(i) for i in sk['joints']]
    B = Wj[0] @ ibm[0]  # dallo spazio dei vertici al mondo, a riposo
    mesh = next(m for m in j['meshes'] if any('JOINTS_0' in p['attributes'] for p in m['primitives'])); assert len(mesh['primitives']) == 1, 'un materiale solo'
    p = mesh['primitives'][0]; A = p['attributes']
    d = {'pos': g.acc(A['POSITION']) @ B[:3, :3].T + B[:3, 3], 'nor': g.acc(A['NORMAL']) @ B[:3, :3].T, 'uv': g.acc(A['TEXCOORD_0']), 'j': g.acc(A['JOINTS_0']).astype(int), 'w': g.acc(A['WEIGHTS_0']),
         'idx': g.acc(p['indices']).reshape(-1).astype(int), 'forme': [g.acc(t['POSITION']) @ B[:3, :3].T for t in p.get('targets', [])], 'nomiForme': (mesh.get('extras') or {}).get('targetNames', []),
         'segni': {k: g.acc(v).reshape(-1) for k, v in A.items() if k.startswith('_')}}
    return d, nomi, {n: W[:3, 3] for n, W in zip(nomi, Wj)}

lod = [leggi_lod('%s/lod%d.glb' % (SRC, k)) for k in range(3)]; _, nomiN, PN = lod[0]
# Scala: la gamba nuova (dall'anca alla caviglia) lunga quanto quella di prima, così con gli stessi angoli il piede arriva
# dove arrivava. I piedi a terra, le anche sopra quelle di prima (in pianta). L'osso del bacino resta dov'era (le animazioni
# ne muovono l'altezza a partire da lì): le anche gli stanno un po' più vicine di prima, quanto basta a compensare la suola
# più sottile, e il piede tocca terra dove la toccava prima
P0 = lambda n: vW[vnome[n]][:3, 3]; lung = lambda P, a, b, c: np.linalg.norm(P(a) - P(b)) + np.linalg.norm(P(b) - P(c))
s = lung(P0, 'thigh_l', 'calf_l', 'foot_l') / lung(lambda n: PN[n], 'LeftUpLeg', 'LeftLeg', 'LeftFoot')
t = np.array([0.0, 0.0, P0('thigh_l')[2] - s * PN['LeftUpLeg'][2]])
porta = lambda P: s * P + t
print('scala %.4f, spostamento %s' % (s, np.round(t, 3)))

# ---------------------------------------------------------------- le ossa spostate (rotazioni a riposo invariate)
inv = {v: k for k, v in MAPPA.items()}; nuovoW = {}
def nuovo_mondo(i):
    if i in nuovoW: return nuovoW[i]
    n = vj['nodes'][i]; W = np.array(vW[i])
    if i in V.par:
        Wp = nuovo_mondo(V.par[i]); nome = n.get('name')
        if nome == 'pelvis': pass                                                    # il bacino resta dov'era
        elif nome in inv and inv[nome] in PN: W[:3, 3] = porta(PN[inv[nome]])        # osso che ha il suo corrispondente: va sulla giuntura nuova
        else: W[:3, 3] = Wp[:3, 3] + Wp[:3, :3] @ np.array(n.get('translation', [0, 0, 0]))  # gli altri seguono il padre
        Rp = Wp[:3, :3]; n['translation'] = [float(v) for v in np.linalg.solve(Rp, W[:3, 3] - Wp[:3, 3])]
    nuovoW[i] = W; return W
for i in range(len(vj['nodes'])): nuovo_mondo(i)
for a, b in (('pelvis', 'Hips'), ('neck_01', 'Neck'), ('Head', 'Head'), ('upperarm_l', 'LeftArm'), ('lowerarm_l', 'LeftForeArm'), ('hand_l', 'LeftHand'), ('thigh_l', 'LeftUpLeg'), ('calf_l', 'LeftLeg'), ('foot_l', 'LeftFoot'), ('ball_l', 'LeftToeBase')):
    print('%-11s prima %s  ora %s' % (a, np.round(vW[vnome[a]][:3, 3], 3), np.round(nuovoW[vnome[a]][:3, 3], 3)))
IBM = np.array([np.linalg.inv(nuovoW[i]) for i in vjoints])
posto = {vj['nodes'][i]['name']: k for k, i in enumerate(vjoints)}  # nome dell'osso -> indice nella pelle

# ---------------------------------------------------------------- i vertici: posizioni, pesi sulle ossa del gioco, texture
punti = json.load(open(SRC + '/punti.json')); bl = lambda v: np.array([v[0], v[2], -v[1]])  # da Blender a glTF
occhi = [porta(bl(punti['occhio_l'])), porta(bl(punti['occhio_r']))]; rag = punti['raggio_occhio'] * s
ATLANTE = 0.92; CELLA = (0.96, 0.96, 0.03)  # il corpo usa il 92% della texture: nell'angolo resta posto per l'occhio
buf = bytearray(); views = []; accs = []
def aggiungi(arr, tipo, comp, target=None, minmax=False):
    global buf
    a = np.ascontiguousarray(arr.astype(CT[comp])); 
    while len(buf) % 4: buf.append(0)
    v = {'buffer': 0, 'byteOffset': len(buf), 'byteLength': a.nbytes}
    if target: v['target'] = target
    views.append(v); buf += a.tobytes()
    acc = {'bufferView': len(views) - 1, 'componentType': comp, 'count': int(a.shape[0]) if a.ndim > 1 or tipo == 'SCALAR' else int(a.size), 'type': tipo}
    if minmax: acc['min'] = [float(x) for x in a.reshape(a.shape[0], -1).min(0)]; acc['max'] = [float(x) for x in a.reshape(a.shape[0], -1).max(0)]
    accs.append(acc); return len(accs) - 1

meshes = []
for k, (d, nomi, _) in enumerate(lod):
    pos = porta(d['pos']); nor = d['nor'] / np.linalg.norm(d['nor'], axis=1, keepdims=True); uv = d['uv'] * ATLANTE
    occ = d['segni'].get('_OCCHI')
    if occ is not None and occ.max() > .5:
        for i in np.where(occ > .5)[0]:
            e = occhi[0] if pos[i, 0] > 0 else occhi[1]; uv[i] = [CELLA[0] + (pos[i, 0] - e[0]) / rag * CELLA[2], CELLA[1] - (pos[i, 1] - e[1]) / rag * CELLA[2]]
    # pesi: ogni osso nuovo va sull'osso del gioco che gli corrisponde; se due finiscono sullo stesso si sommano
    J = np.zeros((len(pos), 4), int); Wt = np.zeros((len(pos), 4))
    for i in range(len(pos)):
        acc = {}
        for jj, w in zip(d['j'][i], d['w'][i]):
            if w > 0: n = MAPPA[nomi[jj]]; acc[posto[n]] = acc.get(posto[n], 0) + w
        top = sorted(acc.items(), key=lambda x: -x[1])[:4]; tot = sum(w for _, w in top)
        for q, (b, w) in enumerate(top): J[i, q] = b; Wt[i, q] = w / tot
    A = {'POSITION': aggiungi(pos, 'VEC3', 5126, 34962, True), 'NORMAL': aggiungi(nor, 'VEC3', 5126, 34962), 'TEXCOORD_0': aggiungi(uv, 'VEC2', 5126, 34962),
         'JOINTS_0': aggiungi(J, 'VEC4', 5121, 34962), 'WEIGHTS_0': aggiungi(Wt, 'VEC4', 5126, 34962)}
    for nome, val in d['segni'].items(): A[nome] = aggiungi(val.reshape(-1, 1), 'SCALAR', 5126, 34962)
    prim = {'attributes': A, 'indices': aggiungi(d['idx'].reshape(-1, 1), 'SCALAR', 5123 if len(pos) < 65536 else 5125, 34963), 'material': 0}
    if d['forme']: prim['targets'] = [{'POSITION': aggiungi(f * s, 'VEC3', 5126, 34962, True)} for f in d['forme']]
    m = {'name': ['SuperHero_Male', 'Lod1', 'Lod2'][k], 'primitives': [prim]}
    if d['forme']: m['extras'] = {'targetNames': d['nomiForme']}; m['weights'] = [0.0] * len(d['forme'])
    meshes.append(m); print('%s: %d triangoli, %d vertici, forme %s' % (m['name'], len(d['idx']) // 3, len(pos), d['nomiForme']))

# i nodi: le ossa di prima (spostate) e, al posto di sopracciglia, occhi e corpo, i tre livelli di dettaglio
nodi_mesh = [i for i, n in enumerate(vj['nodes']) if 'mesh' in n]; ordine = {'SuperHero_Male': 0, 'Eyebrows': 1, 'Eyes': 2}
for i in nodi_mesh:
    n = vj['nodes'][i]; k = ordine[n['name']]; vj['nodes'][i] = {'name': meshes[k]['name'], 'mesh': k, 'skin': 0}
ibm_acc = aggiungi(IBM.transpose(0, 2, 1).reshape(-1, 16), 'MAT4', 5126)
out = {'asset': {'version': '2.0', 'generator': 'scripts/calciatore-nuovo.py (corpo MPFB/MakeHuman CC0 sullo scheletro del gioco)'}, 'scene': 0, 'scenes': vj['scenes'], 'nodes': vj['nodes'],
       'materials': [{'name': 'MI_Superhero_Male', 'pbrMetallicRoughness': {'baseColorFactor': [0.85, 0.7, 0.6, 1], 'metallicFactor': 0, 'roughnessFactor': 0.8}}],
       'meshes': meshes, 'skins': [{'joints': vjoints, 'inverseBindMatrices': ibm_acc, **({'skeleton': vskin['skeleton']} if 'skeleton' in vskin else {})}],
       'accessors': accs, 'bufferViews': views, 'buffers': [{'byteLength': len(buf)}]}
def scrivi(file, j, b):
    js = json.dumps(j, separators=(',', ':')).encode(); js += b' ' * (-len(js) % 4); b = bytes(b) + b'\0' * (-len(b) % 4)
    open(file, 'wb').write(struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(b)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(b), 0x004E4942) + b)
scrivi('modelli/calciatore.glb', out, buf)

# ---------------------------------------------------------------- le capigliature, portate nello stesso spazio
C = Glb(SRC + '/capelli.glb'); cj = C.j; cb = bytearray(C.buf)
for i, n in enumerate(cj['nodes']):
    if 'mesh' not in n: continue
    W = C.mondo(i); 
    for p in cj['meshes'][n['mesh']]['primitives']:
        a = cj['accessors'][p['attributes']['POSITION']]; v = cj['bufferViews'][a['bufferView']]; off = v.get('byteOffset', 0) + a.get('byteOffset', 0)
        P = porta(C.acc(p['attributes']['POSITION']) @ W[:3, :3].T + W[:3, 3]).astype(np.float32); cb[off:off + P.nbytes] = P.tobytes(); a['min'] = [float(x) for x in P.min(0)]; a['max'] = [float(x) for x in P.max(0)]
    for kk in ('translation', 'rotation', 'scale', 'matrix'): n.pop(kk, None)
scrivi('modelli/capelli.glb', cj, cb)
json.dump({'scala': s, 'occhi': [list(map(float, o)) for o in occhi], 'raggio_occhio': rag, 'bocca': list(map(float, porta(bl(punti['bocca'])))), 'testa_alto': float(s * punti['testa_alto'] + t[1]), 'atlante': ATLANTE, 'cella_occhio': CELLA},
          open('modelli/mpfb/punti.json', 'w'), indent=1)
print('scritti modelli/calciatore.glb (%d KB), modelli/capelli.glb, modelli/mpfb/punti.json' % (len(buf) // 1024))
