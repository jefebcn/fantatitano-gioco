// Porta le animazioni di Google Research Football (motore GameplayFootball, licenza Unlicense: pubblico dominio)
// sullo scheletro del calciatore, nello stesso formato di public/anim.js.
// Uso: node scripts/gfootball.mjs  (legge modelli/gfootball, scrive public/anim-gf.js, l'elenco è ELENCO qui sotto)
//      node scripts/gfootball.mjs <cartella animations> <uscita.js> nome=percorso.anim[:specchio] …  (per le prove)
//
// Il formato .anim: una riga per articolazione (player, body, middle, neck, spalle, gomiti, anche, ginocchia, caviglie),
// coi fotogrammi chiave «fotogramma, x, y, z, w» (100 al secondo). «player» invece ha la posizione (x, y, z) del
// giocatore. La riga «extension,football,f,x,y,z» dice in quale fotogramma il piede tocca la palla e dove sta la palla.
// Le rotazioni sono locali e prendono il posto di quelle a riposo: con tutte le rotazioni a zero il giocatore è in piedi,
// braccia lungo i fianchi. Lì l'alto è +z e il giocatore guarda verso −y; qui l'alto è +y e guarda verso +z
// (x resta x, y diventa z, z diventa −y: una rotazione di −90° attorno a x).
//
// Come per Mixamo (scripts/animazioni.mjs): per ogni fotogramma si prende di quanto ogni articolazione è ruotata nel mondo
// rispetto alla posa a riposo e si applica la stessa rotazione all'osso del calciatore, partendo dalla sua posa a T;
// per le ossa lunghe si corregge la differenza di direzione tra le due pose a riposo.
import * as T from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const FPS = 30, ORIG = 100;
const [dir = 'modelli/gfootball', uscita = 'public/anim-gf.js', ...voci] = process.argv.slice(2);

// scheletro di GameplayFootball (data/media/objects/players/player.object): padre e posizione a riposo, in metri
const GF = {
  body: [null, [0, 0, 0.96]], middle: ['body', [0, 0, 0.15]], neck: ['middle', [0, -0.03, 0.5]],
  left_shoulder: ['middle', [0.16, -0.01, 0.48]], left_elbow: ['left_shoulder', [-0.01, 0, -0.33]],
  right_shoulder: ['middle', [-0.16, -0.01, 0.48]], right_elbow: ['right_shoulder', [0.01, 0, -0.33]],
  left_thigh: ['body', [0.087, 0, -0.01]], left_knee: ['left_thigh', [0, 0, -0.42]], left_ankle: ['left_knee', [0, -0.04, -0.44]],
  right_thigh: ['body', [-0.087, 0, -0.01]], right_knee: ['right_thigh', [0, 0, -0.42]], right_ankle: ['right_knee', [0, -0.04, -0.44]],
};
const V = ([x, y, z]) => new T.Vector3(x, z, -y), Q = ([x, y, z, w]) => new T.Quaternion(x, z, -y, w);
// punte che non sono articolazioni: polso e punta del piede, per sapere dove puntano avambraccio e piede a riposo
const PUNTA = { left_elbow: [0, 0, -0.27], right_elbow: [0, 0, -0.27], left_ankle: [0, -0.15, -0.06], right_ankle: [0, -0.15, -0.06] };

// osso del calciatore -> articolazione di GameplayFootball che lo muove (le ossa senza articolazione seguono quella rigida sopra)
const DA = { pelvis: 'body', spine_01: 'middle', spine_02: 'middle', spine_03: 'middle', neck_01: 'neck', Head: 'neck',
  clavicle_l: 'middle', upperarm_l: 'left_shoulder', lowerarm_l: 'left_elbow', hand_l: 'left_elbow',
  clavicle_r: 'middle', upperarm_r: 'right_shoulder', lowerarm_r: 'right_elbow', hand_r: 'right_elbow',
  thigh_l: 'left_thigh', calf_l: 'left_knee', foot_l: 'left_ankle', ball_l: 'left_ankle',
  thigh_r: 'right_thigh', calf_r: 'right_knee', foot_r: 'right_ankle', ball_r: 'right_ankle' };
const OSSA = Object.keys(DA);
// ossa lunghe del calciatore: osso -> [figlio nel calciatore, articolazione sorgente, sua punta (figlio o PUNTA)]
const LUNGHE = { upperarm_l: ['lowerarm_l', 'left_shoulder', 'left_elbow'], lowerarm_l: ['hand_l', 'left_elbow', null],
  upperarm_r: ['lowerarm_r', 'right_shoulder', 'right_elbow'], lowerarm_r: ['hand_r', 'right_elbow', null],
  thigh_l: ['calf_l', 'left_thigh', 'left_knee'], calf_l: ['foot_l', 'left_knee', 'left_ankle'], foot_l: ['ball_l', 'left_ankle', null],
  thigh_r: ['calf_r', 'right_thigh', 'right_knee'], calf_r: ['foot_r', 'right_knee', 'right_ankle'], foot_r: ['ball_r', 'right_ankle', null] };

/** Legge un .anim: per articolazione i fotogrammi chiave; per «player» le posizioni; più il contatto con la palla. */
function leggi(testo) {
  const A = { chiavi: {}, palla: null, var: {} };
  const righe = testo.split('\n');
  for (const r of righe) {
    const c = r.trim().split(','); if (c.length < 3) continue;
    if (c[0] === 'extension' && c[1] === 'football') { A.palla = { f: +c[2], pos: V([+c[3], +c[4], +c[5]]) }; continue; }
    if (c[0] === 'player') { const k = []; for (let i = 1; i + 3 < c.length + 1; i += 4) k.push([+c[i], V([+c[i + 1], +c[i + 2], +c[i + 3]])]); A.chiavi.player = k; continue; }
    if (GF[c[0]]) { const k = []; for (let i = 1; i + 4 < c.length + 1; i += 5) k.push([+c[i], Q([+c[i + 1], +c[i + 2], +c[i + 3], +c[i + 4]]).normalize()]); A.chiavi[c[0]] = k; }
  }
  for (const m of testo.matchAll(/<(\w+)>\s*([^<]*?)\s*<\/\1>/g)) A.var[m[1]] = m[2].trim();
  A.fine = Math.max(...Object.values(A.chiavi).map((k) => k[k.length - 1][0]));
  return A;
}
/** Valore al fotogramma f (anche non intero): interpolazione tra i due fotogrammi chiave vicini. */
function a(k, f, quat) {
  if (!k || !k.length) return quat ? new T.Quaternion() : new T.Vector3();
  let i = 0; while (i < k.length - 1 && k[i + 1][0] <= f) i++;
  const [f0, v0] = k[i], [f1, v1] = k[Math.min(i + 1, k.length - 1)], t = f1 > f0 ? Math.min(1, Math.max(0, (f - f0) / (f1 - f0))) : 0;
  return quat ? v0.clone().slerp(v1, t) : v0.clone().lerp(v1, t);
}

// il calciatore
const ab = (f) => { const b = readFileSync(f); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };
const mondoQ = (o) => o.getWorldQuaternion(new T.Quaternion()), mondoP = (o) => o.getWorldPosition(new T.Vector3());
const tgt = (await new GLTFLoader().parseAsync(ab('modelli/calciatore.glb'), '')).scene; tgt.updateMatrixWorld(true);
const tb = {}; tgt.traverse((o) => { if (o.isBone) tb[o.name] = o; });
const tRest = OSSA.map((n) => { if (!tb[n]) throw new Error(`nel calciatore manca l'osso ${n}`); return mondoQ(tb[n]); });
const tPadre = OSSA.map((n) => { const p = tb[n].parent, k = OSSA.indexOf(p.name); return k >= 0 ? k : mondoQ(p); });
const tBacino = mondoP(tb.pelvis), tRadice = tb.pelvis.parent;

// correzione delle ossa lunghe: porta la direzione a riposo del calciatore su quella a riposo della sorgente
const dirRiposo = (art, punta) => (punta ? V(GF[punta][1]) : V(PUNTA[art])).normalize();
const corr = OSSA.map((n) => {
  if (!LUNGHE[n]) return new T.Quaternion();
  const [figlio, art, punta] = LUNGHE[n], vt = mondoP(tb[figlio]).sub(mondoP(tb[n])).normalize();
  return new T.Quaternion().setFromUnitVectors(vt, dirRiposo(art, punta));
});

// orientamento nel mondo di ogni articolazione sorgente (a riposo è l'identità per tutte)
function mondo(A, f) {
  const W = {};
  for (const [nome, [padre]] of Object.entries(GF)) { const l = a(A.chiavi[nome], f, true); W[nome] = padre ? W[padre].clone().multiply(l) : l; }
  return W;
}

// nome nel gioco -> file sorgente; «specchio» = la stessa animazione col piede sinistro (le originali toccano col destro)
const ELENCO = {
  tocco: 'ballcontrol/walk/000.anim', tocco_sx: 'ballcontrol/walk/000.anim:specchio',
  tocco_scatto: 'ballcontrol/sprint/000.anim', tocco_scatto_sx: 'ballcontrol/sprint/000.anim:specchio',
  stop: 'trap/walk/000_D000_IB000_short.anim', stop_sx: 'trap/walk/000_D000_IB000_short.anim:specchio',
  stop_fermo: 'trap/idle/000_IB000.anim', stop_fermo_sx: 'trap/idle/000_IB000.anim:specchio',
};
const SCAMBIO = Object.fromEntries(Object.keys(GF).map((n) => [n, n.startsWith('left_') ? n.replace('left_', 'right_') : n.startsWith('right_') ? n.replace('right_', 'left_') : n]));
const specchia = (W) => { const M = {}; for (const n in W) { const q = W[SCAMBIO[n]]; M[n] = new T.Quaternion(q.x, -q.y, -q.z, q.w); } return M; };

const out = { fps: FPS, bacino: 'pelvis', ossa: OSSA, clip: {}, info: {} };
const lista = voci.length ? voci.map((v) => v.split('=')) : Object.entries(ELENCO);
for (const [nome, sorg] of lista) {
  const [file, opz] = sorg.split(':'), A = leggi(readFileSync(join(dir, file), 'utf8')), sp = opz === 'specchio';
  const durata = A.fine / ORIG, n = Math.max(2, Math.round(durata * FPS) + 1), p = [], q = [], prev = OSSA.map(() => null);
  for (let i = 0; i < n; i++) {
    const f = Math.min(A.fine, i / FPS * ORIG), W0 = mondo(A, f), W = sp ? specchia(W0) : W0;
    const Wt = OSSA.map((o, k) => W[DA[o]].clone().multiply(corr[k]).multiply(tRest[k]));
    Wt.forEach((w, k) => {
      const padre = typeof tPadre[k] === 'number' ? Wt[tPadre[k]] : tPadre[k], l = padre.clone().invert().multiply(w).normalize();
      let v = [l.x, l.y, l.z, l.w];
      if (prev[k] && prev[k][0] * v[0] + prev[k][1] * v[1] + prev[k][2] * v[2] + prev[k][3] * v[3] < 0) v = v.map((c) => -c);
      prev[k] = v; for (const c of v) q.push(Math.round(c * 10000));
    });
    // il bacino: altezza in proporzione (la sorgente ha il bacino a 0,96 m più lo spostamento verticale del giocatore)
    const pl = a(A.chiavi.player, f, false), y = (0.96 + pl.y) / 0.96 * tBacino.y, loc = tRadice.worldToLocal(new T.Vector3(tBacino.x, y, tBacino.z));
    p.push(Math.round(loc.x * 10000), Math.round(loc.y * 10000), Math.round(loc.z * 10000));
  }
  out.clip[nome] = { n, p, q };
  // per il gioco: velocità a cui è stata animata (m/s, dallo spostamento del giocatore), quando il piede tocca la palla e
  // dove sta la palla in quel momento rispetto al giocatore (lo spostamento orizzontale lo fa il motore)
  const k = A.chiavi.player, v = k && k.length > 1 ? Math.hypot(k[k.length - 1][1].x - k[0][1].x, k[k.length - 1][1].z - k[0][1].z) / durata : 0;
  const info = { v: +v.toFixed(2), durata: +durata.toFixed(3) };
  if (A.palla) { const pl = a(k, A.palla.f, false), rel = A.palla.pos.clone().sub(new T.Vector3(pl.x, 0, pl.z)); if (sp) rel.x = -rel.x; info.tocco = +(A.palla.f / ORIG).toFixed(3); info.palla = rel.toArray().map((x) => +x.toFixed(3)); }
  out.info[nome] = info;
  console.log(nome.padEnd(16), sorg.padEnd(44), `${durata.toFixed(2)} s`, n, 'fotogrammi', `${info.v} m/s`, info.tocco !== undefined ? `tocco a ${info.tocco} s` : '');
}
writeFileSync(uscita, `// Generato da scripts/gfootball.mjs: animazioni di GameplayFootball (Google Research Football, licenza Unlicense,\n// pubblico dominio) portate sullo scheletro del calciatore. Non modificare a mano.\nwindow.ANIMS_GF=${JSON.stringify(out)};\n`);
console.log(uscita, Math.round(readFileSync(uscita).length / 1024), 'KB');
