// Prepara public/anim.js: tutte le animazioni del gioco, già adattate allo scheletro del calciatore (modelli/calciatore.glb).
// Uso: node scripts/animazioni.mjs /cartella/con/gli/fbx/di/Mixamo
//
// Sorgenti: gli FBX del «Soccer Game Pack» di Mixamo (non stanno nel repository) e modelli/animazioni-base.glb
// (attesa, camminata e corsa del manichino di three.js). Hanno tutti lo scheletro di Mixamo; il calciatore ne ha un altro,
// con nomi e assi delle ossa diversi. Quindi non si copiano le tracce: per ogni fotogramma si legge di quanto ogni osso
// della sorgente è ruotato NEL MONDO rispetto alla sua posa a T, e si applica la stessa rotazione all'osso corrispondente
// del calciatore partendo dalla SUA posa a T. Lo spostamento orizzontale del bacino si toglie: lo fa il motore della partita.
import * as T from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { readFileSync, writeFileSync } from 'node:fs';

const FPS = 30;
// nome nel gioco: [sorgente, da (s), a (s), opzione]. Sorgente 'base:nome' = clip di animazioni-base.glb, altrimenti file FBX.
const CLIP = {
  idle: ['base:idle', 0, 0],
  walk: ['base:walk', 0, 0],
  run: ['base:run', 0, 0],
  jog: ['jog forward', 0, 0],
  tiro: ['strike foward jog', 0.36, 1.1],
  passaggio: ['kick soccerball (2)', 0, 0],
  scivolata: ['soccer tackle (2)', 0, 0],
  caduta: ['soccer trip', 0, 0],
  gkIdle: ['goalkeeper idle (2)', 0, 0],
  tuffoS: ['goalkeeper diving save', 0.8, 0],
  tuffoD: ['goalkeeper diving save', 0.8, 0, 'specchio'], // lo stesso tuffo, ribaltato: quello a destra del pacchetto è un altro gesto
  presa: ['goalkeeper catch (2)', 0, 0],
  esulta: ['base:idle', 0, 1, 'braccia'], // non c'è nel pacchetto: braccia alzate sopra la posa d'attesa
};
// osso Mixamo -> osso del calciatore
const OSSA = { Hips: 'pelvis', Spine: 'spine_01', Spine1: 'spine_02', Spine2: 'spine_03', Neck: 'neck_01', Head: 'Head',
  LeftShoulder: 'clavicle_l', LeftArm: 'upperarm_l', LeftForeArm: 'lowerarm_l', LeftHand: 'hand_l',
  RightShoulder: 'clavicle_r', RightArm: 'upperarm_r', RightForeArm: 'lowerarm_r', RightHand: 'hand_r',
  LeftUpLeg: 'thigh_l', LeftLeg: 'calf_l', LeftFoot: 'foot_l', LeftToeBase: 'ball_l',
  RightUpLeg: 'thigh_r', RightLeg: 'calf_r', RightFoot: 'foot_r', RightToeBase: 'ball_r' };
const SRC = Object.keys(OSSA), B = SRC.length;
// ossa lunghe: se le due pose a T non coincidono (braccia o gambe un po' più aperte) si corregge la differenza
const FIGLIO = { LeftArm: 'LeftForeArm', LeftForeArm: 'LeftHand', RightArm: 'RightForeArm', RightForeArm: 'RightHand', LeftUpLeg: 'LeftLeg', LeftLeg: 'LeftFoot', RightUpLeg: 'RightLeg', RightLeg: 'RightFoot' };

const dir = process.argv[2]; if (!dir) { console.error('manca la cartella degli FBX di Mixamo'); process.exit(1); }
const ab = (f) => { const b = readFileSync(f); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };
const senza = (n) => n.replace(/^mixamorig:?/, '');
const ossaDi = (root) => { const m = {}; root.traverse((o) => { const n = senza(o.name); if (o.isBone && !m[n]) m[n] = o; }); return m; }; // negli FBX di Mixamo ogni osso compare due volte: conta il primo
const mondoQ = (o) => o.getWorldQuaternion(new T.Quaternion()), mondoP = (o) => o.getWorldPosition(new T.Vector3());

// il calciatore
const tgt = (await new GLTFLoader().parseAsync(ab('modelli/calciatore.glb'), '')).scene; tgt.updateMatrixWorld(true);
const tb = {}; tgt.traverse((o) => { if (o.isBone) tb[o.name] = o; });
const tRest = SRC.map((s) => { const o = tb[OSSA[s]]; if (!o) throw new Error(`nel calciatore manca l'osso ${OSSA[s]}`); return mondoQ(o); });
const tPadre = SRC.map((s) => { const p = tb[OSSA[s]].parent, k = SRC.findIndex((x) => OSSA[x] === p.name); return k >= 0 ? k : mondoQ(p); }); // indice dell'osso padre, o la sua rotazione fissa
const tBacino = mondoP(tb.pelvis), tRadice = tb.pelvis.parent;

// le due sorgenti
const fbx = new FBXLoader(), manichino = fbx.parse(ab(`${dir}/X Bot.fbx`), ''), base = await new GLTFLoader().parseAsync(ab('modelli/animazioni-base.glb'), '');
const sorgenti = { fbx: { root: manichino, bones: ossaDi(manichino), scala: 0.01 }, base: { root: base.scene, bones: ossaDi(base.scene), scala: 1 } };
for (const s of Object.values(sorgenti)) {
  s.root.updateMatrixWorld(true); s.riposo = SRC.map((b) => mondoQ(s.bones[b]).invert()); s.bacino = mondoP(s.bones.Hips).y;
  s.corr = SRC.map((b) => { // rotazione che porta l'osso del calciatore, a riposo, nella direzione di quello della sorgente
    if (!FIGLIO[b]) return new T.Quaternion();
    const vs = mondoP(s.bones[FIGLIO[b]]).sub(mondoP(s.bones[b])).normalize(), vt = mondoP(tb[OSSA[FIGLIO[b]]]).sub(mondoP(tb[OSSA[b]])).normalize();
    return new T.Quaternion().setFromUnitVectors(vt, vs);
  });
}
console.log('differenza tra le pose a T (gradi):', Object.keys(FIGLIO).map((b) => `${b} ${(2 * Math.acos(Math.min(1, Math.abs(sorgenti.fbx.corr[SRC.indexOf(b)].w))) * 180 / Math.PI).toFixed(0)}`).join(', '));
const SCAMBIO = SRC.map((b) => SRC.indexOf(b.startsWith('Left') ? b.replace('Left', 'Right') : b.startsWith('Right') ? b.replace('Right', 'Left') : b));
const _e = new T.Euler(), _q = new T.Quaternion();

const out = { fps: FPS, bacino: 'pelvis', ossa: SRC.map((s) => OSSA[s]), clip: {} };
for (const [nome, [da_dove, da, a, opz]] of Object.entries(CLIP)) {
  const s = da_dove.startsWith('base:') ? sorgenti.base : sorgenti.fbx;
  const clip = s === sorgenti.base ? base.animations.find((c) => c.name === da_dove.slice(5)) : fbx.parse(ab(`${dir}/${da_dove}.fbx`), '').animations[0];
  if (!clip) throw new Error(`clip non trovata: ${da_dove}`);
  const fine = a || clip.duration, n = Math.max(2, Math.round((fine - da) * FPS) + 1), p = [], q = [], prev = SRC.map(() => null);
  const mx = new T.AnimationMixer(s.root); mx.clipAction(clip).play();
  for (let i = 0; i < n; i++) {
    mx.setTime(opz === 'braccia' ? 0 : Math.min(da + i / FPS, clip.duration - 1e-4));
    if (opz === 'braccia') { const k = 2.25 + .18 * Math.sin(i / (n - 1) * Math.PI * 2); for (const [b, sg] of [['LeftArm', 1], ['RightArm', -1]]) s.bones[b].quaternion.multiply(_q.setFromEuler(_e.set(0, 0, sg * k))); }
    s.root.updateMatrixWorld(true);
    let D = SRC.map((b, k) => mondoQ(s.bones[b]).multiply(s.riposo[k])); // rotazione nel mondo rispetto alla posa a T
    if (opz === 'specchio') D = D.map((_, k) => { const d = D[SCAMBIO[k]]; return new T.Quaternion(d.x, -d.y, -d.z, d.w); });
    const W = D.map((d, k) => d.clone().multiply(s.corr[k]).multiply(tRest[k])); // rotazione nel mondo dell'osso del calciatore
    W.forEach((w, k) => {
      const padre = typeof tPadre[k] === 'number' ? W[tPadre[k]] : tPadre[k], l = padre.clone().invert().multiply(w).normalize();
      let v = [l.x, l.y, l.z, l.w];
      if (prev[k] && prev[k][0] * v[0] + prev[k][1] * v[1] + prev[k][2] * v[2] + prev[k][3] * v[3] < 0) v = v.map((c) => -c); // stesso emisfero del fotogramma prima
      prev[k] = v; for (const c of v) { if (!Number.isFinite(c)) throw new Error(`${da_dove}: rotazione non valida per ${SRC[k]}`); q.push(Math.round(c * 10000)); }
    });
    // il bacino: stessa altezza in proporzione, sempre sopra i piedi
    const y = mondoP(s.bones.Hips).y / s.bacino * tBacino.y, loc = tRadice.worldToLocal(new T.Vector3(tBacino.x, y, tBacino.z));
    p.push(Math.round(loc.x * 10000), Math.round(loc.y * 10000), Math.round(loc.z * 10000));
  }
  mx.stopAllAction(); mx.uncacheRoot(s.root);
  out.clip[nome] = { n, p, q };
  console.log(nome.padEnd(10), da_dove.padEnd(26), `${da}-${fine.toFixed(2)} s`, n, 'fotogrammi', opz || '');
}
const js = `// Generato da scripts/animazioni.mjs. Non modificare a mano.\nwindow.ANIMS=${JSON.stringify(out)};\n`;
writeFileSync('public/anim.js', js); console.log('public/anim.js', Math.round(js.length / 1024), 'KB');
