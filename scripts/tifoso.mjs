// Costruisce il tifoso degli spalti dal modello del calciatore (Quaternius, CC0): lo mette in piedi nella posa di attesa,
// cuoce lo scheletro nei vertici, aggiunge i capelli, lo semplifica in due versioni (vicina e lontana) e dice per ogni
// vertice che cos'è (maglia, pelle, braccio, avambraccio, capelli, pantaloni, scarpe), più dove stanno spalla e gomito per
// alzare le braccia nello shader. Scrive src/grafica/tifoso-dati.js, che finisce dentro app.js: niente da scaricare.
// Uso: node scripts/tifoso.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import * as T from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { SimplifyModifier } from 'three/examples/jsm/modifiers/SimplifyModifier.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

globalThis.window = globalThis; globalThis.self = globalThis; globalThis.THREE = T; // il semplificatore di three 0.160 usa THREE.Color globale
eval(readFileSync('public/anim.js', 'utf8')); // window.ANIMS: le clip già adattate allo scheletro del calciatore
const buf = (f) => { const b = readFileSync(f); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };
const L = new GLTFLoader(), [g, h] = await Promise.all([L.parseAsync(buf('modelli/calciatore.glb'), ''), L.parseAsync(buf('modelli/capelli.glb'), '')]);
const scene = g.scene; scene.updateMatrixWorld(true);
let corpo = null; const ossa = {}; scene.traverse((o) => { if (o.isBone) ossa[o.name] = o; if (o.isSkinnedMesh && o.material.name === 'MI_Superhero_Male') corpo = o; });
// i capelli (rasati) nello spazio dell'osso della testa, a riposo
const hInv = new T.Matrix4().copy(ossa.Head.matrixWorld).invert(); h.scene.updateMatrixWorld(true); let capelli = null;
h.scene.traverse((o) => { if (o.isMesh && o.name === 'Hair_Buzzed') { capelli = o.geometry.clone(); capelli.applyMatrix4(o.matrixWorld).applyMatrix4(hInv); } });

// la posa: il primo fotogramma della clip di attesa
const A = window.ANIMS, c = A.clip.idle, B = A.ossa.length, times = [0], tracks = [];
tracks.push(new T.VectorKeyframeTrack(`${A.bacino}.position`, times, [0, 1, 2].map((j) => c.p[j] / 10000)));
A.ossa.forEach((b, n) => tracks.push(new T.QuaternionKeyframeTrack(`${b}.quaternion`, times, [0, 1, 2, 3].map((j) => c.q[n * 4 + j] / 10000))));
const mixer = new T.AnimationMixer(scene); mixer.clipAction(new T.AnimationClip('posa', 0, tracks)).play(); mixer.update(0); scene.updateMatrixWorld(true);

// cosa è ogni vertice, dall'osso che lo muove di più
const PARTE = { maglia: 0, pelle: 1, braccio: 2, avambraccio: 3, capelli: 4, pantaloni: 7, scarpe: 8 };
const nomi = corpo.skeleton.bones.map((b) => b.name), SI = corpo.geometry.attributes.skinIndex, SW = corpo.geometry.attributes.skinWeight, P = corpo.geometry.attributes.position;
const cosa = (nome, y, anca) => {
  if (/^(Head|neck)/.test(nome)) return PARTE.pelle;
  if (/^upperarm/.test(nome)) return PARTE.braccio;
  if (/^(lowerarm|hand|thumb|index|middle|ring|pinky)/.test(nome)) return PARTE.avambraccio;
  if (/^(foot|ball)/.test(nome)) return PARTE.scarpe;
  if (/^(thigh|calf)/.test(nome)) return PARTE.pantaloni;
  if (/^pelvis/.test(nome)) return y > anca ? PARTE.maglia : PARTE.pantaloni;
  return PARTE.maglia;
};
const pos = [], col = [], v = new T.Vector3(), anca = new T.Vector3().setFromMatrixPosition(ossa.thigh_l.matrixWorld).y + .06;
for (let i = 0; i < P.count; i++) {
  corpo.getVertexPosition(i, v); v.applyMatrix4(corpo.matrixWorld); pos.push(v.x, v.y, v.z);
  let bw = -1, bi = 0; const C4 = ['getX', 'getY', 'getZ', 'getW']; for (let k = 0; k < 4; k++) { const w = SW[C4[k]](i); if (w > bw) { bw = w; bi = SI[C4[k]](i); } }
  col.push(cosa(nomi[bi], v.y, anca) / 10, 0, 0);
}
const geoCorpo = new T.BufferGeometry(); geoCorpo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geoCorpo.setAttribute('color', new T.Float32BufferAttribute(col, 3)); geoCorpo.setIndex(Array.from(corpo.geometry.index.array));
const geoCap = capelli.clone(); geoCap.applyMatrix4(ossa.Head.matrixWorld); for (const k of Object.keys(geoCap.attributes)) if (k !== 'position') geoCap.deleteAttribute(k);
geoCap.setAttribute('color', new T.Float32BufferAttribute(new Array(geoCap.attributes.position.count * 3).fill(0).map((_, i) => (i % 3 === 0 ? PARTE.capelli / 10 : 0)), 3));

// misure: piedi a terra, centrato, alto 1
const box = new T.Box3().setFromBufferAttribute(geoCorpo.attributes.position), alto = box.max.y - box.min.y, cx = (box.min.x + box.max.x) / 2, cz = (box.min.z + box.max.z) / 2;
const norma = (gg) => { gg.translate(-cx, -box.min.y, -cz); gg.scale(1 / alto, 1 / alto, 1 / alto); return gg; };
norma(geoCorpo); norma(geoCap);
const punto = (o) => new T.Vector3().setFromMatrixPosition(o.matrixWorld).sub(new T.Vector3(cx, box.min.y, cz)).divideScalar(alto);
const spalla = punto(ossa.upperarm_l), gomito = punto(ossa.lowerarm_l), mano = punto(ossa.hand_l), testa = new T.Box3().setFromBufferAttribute(geoCap.attributes.position);

const semplifica = (gg, quanti) => { const m = mergeVertices(gg, 1e-4), n = m.attributes.position.count; return n > quanti ? new SimplifyModifier().modify(m, n - quanti) : m; };
const esporta = (gg) => {
  const ix = gg.index ? Array.from(gg.index.array) : [...Array(gg.attributes.position.count).keys()], p = gg.attributes.position, c3 = gg.attributes.color;
  return { p: Array.from(p.array, (x) => Math.round(x * 1000)), c: Array.from({ length: p.count }, (_, i) => Math.round(c3.getX(i) * 10)), i: ix };
};
const unisci = (a, b) => { const off = a.p.length / 3; return { p: a.p.concat(b.p), c: a.c.concat(b.c), i: a.i.concat(b.i.map((x) => x + off)) }; };
const lod = [[150, 18]].map(([nc, nh]) => unisci(esporta(semplifica(geoCorpo.clone(), nc)), esporta(semplifica(geoCap.clone(), nh))));
const r3 = (w) => [w.x, w.y, w.z].map((x) => +x.toFixed(3));
const dati = { lod, spalla: r3(spalla), gomito: r3(gomito), mano: r3(mano), testa: { min: r3(testa.min), max: r3(testa.max) } };
writeFileSync('src/grafica/tifoso-dati.js', `// Generato da scripts/tifoso.mjs: il tifoso degli spalti ricavato dal modello del calciatore (Quaternius, CC0).\n// Coordinate in millesimi di altezza (piedi a 0, testa a 1000); c = parte (0 maglia, 1 pelle, 2 braccio, 3 avambraccio, 4 capelli, 7 pantaloni, 8 scarpe).\nexport const TIFOSO = ${JSON.stringify(dati)};\n`);
console.log('tifoso:', lod.map((l) => `${l.p.length / 3} vertici, ${l.i.length / 3} triangoli`).join(' | '), 'spalla', dati.spalla, 'gomito', dati.gomito, 'mano', dati.mano);
