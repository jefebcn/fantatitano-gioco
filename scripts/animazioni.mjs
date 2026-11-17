// Impacchetta le animazioni da calcio di Mixamo (FBX del «Soccer Game Pack») in public/anim.js.
// Uso: node scripts/animazioni.mjs /cartella/con/gli/fbx
// Tiene solo le clip elencate in CLIP, solo le ossa del corpo (niente dita), ritagliate e a 30 fotogrammi al secondo.
// Lo spostamento orizzontale del bacino viene tolto: a muovere il giocatore è il motore della partita.
import * as T from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { readFileSync, writeFileSync } from 'node:fs';

const FPS = 30;
// nome nel gioco: [file, da (s), a (s), 'specchio' per ribaltare destra e sinistra]
export const CLIP = {
  jog: ['jog forward', 0, 0],
  tiro: ['strike foward jog', 0.36, 1.1],
  passaggio: [process.env.PASS || 'kick soccerball (2)', 0, 0],
  scivolata: ['soccer tackle (2)', 0, 0],
  caduta: ['soccer trip', 0, 0],
  gkIdle: ['goalkeeper idle (2)', 0, 0],
  tuffoS: ['goalkeeper diving save', 0.8, 0],
  tuffoD: ['goalkeeper diving save', 0.8, 0, 'specchio'], // lo stesso tuffo, ribaltato: quello a destra del pacchetto è un altro gesto
  presa: ['goalkeeper catch (2)', 0, 0],
};
const OSSA = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head', 'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand', 'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase', 'RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase'];

const dir = process.argv[2]; if (!dir) { console.error('manca la cartella degli FBX'); process.exit(1); }
const ab = (f) => { const b = readFileSync(f); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };
const loader = new FBXLoader();
// Gli FBX di Mixamo e il nostro GLB hanno lo stesso scheletro ma assi locali delle ossa diversi (nel GLB le ossa a
// riposo hanno rotazione nulla). Quindi non si copiano le tracce: si applica ogni clip al manichino FBX, si legge
// di quanto ogni osso è ruotato NEL MONDO rispetto alla posa a T, e da lì si ricava la rotazione locale per il GLB.
const model = loader.parse(ab(`${dir}/X Bot.fbx`), '');
// nel file di Mixamo ogni osso compare due volte, uno dentro l'altro con lo stesso nome: conta il primo, quello esterno
const bones = {}; model.traverse((o) => { const n = o.name.replace(/^mixamorig:?/, ''); if (o.isBone && !bones[n]) bones[n] = o; });
const genitore = OSSA.map((b) => { const p = bones[b].parent; const n = p && p.isBone ? p.name.replace(/^mixamorig:?/, '') : null; const k = n ? OSSA.indexOf(n) : -1; if (n && k < 0) throw new Error(`il genitore di ${b} (${n}) non è tra le ossa tenute`); return k; });
const mondo = () => { model.updateMatrixWorld(true); return OSSA.map((b) => bones[b].getWorldQuaternion(new T.Quaternion())); };
const riposo = mondo().map((q) => q.invert()); // il manichino appena caricato è nella posa a T
if (riposo.some((q) => !Number.isFinite(q.x + q.w))) throw new Error('posa a riposo non valida');
let mx;

const out = { fps: FPS, ossa: OSSA, clip: {} }, v = new T.Vector3();
const SCAMBIO = OSSA.map((b) => OSSA.indexOf(b.startsWith('Left') ? b.replace('Left', 'Right') : b.startsWith('Right') ? b.replace('Right', 'Left') : b));
for (const [nome, [file, da, a, specchio]] of Object.entries(CLIP)) {
  const clip = loader.parse(ab(`${dir}/${file}.fbx`), '').animations[0];
  const fine = a || clip.duration, n = Math.max(2, Math.round((fine - da) * FPS) + 1), y = [], q = [];
  mx = new T.AnimationMixer(model); mx.clipAction(clip).play();
  const prev = OSSA.map(() => null); let x0 = 0, z0 = 0; const B = OSSA.length;
  for (let i = 0; i < n; i++) {
    mx.setTime(Math.min(da + i / FPS, clip.duration - 1e-4));
    const D = mondo().map((w, k) => w.multiply(riposo[k])); // rotazione nel mondo rispetto alla posa a T
    bones.Hips.getWorldPosition(v); y.push(Math.round(v.y * 10) / 10);
    D.forEach((d, k) => {
      const l = genitore[k] < 0 ? d.clone() : D[genitore[k]].clone().invert().multiply(d); l.normalize();
      let w = [l.x, l.y, l.z, l.w];
      if (prev[k] && prev[k][0] * w[0] + prev[k][1] * w[1] + prev[k][2] * w[2] + prev[k][3] * w[3] < 0) w = w.map((c) => -c); // stesso emisfero del fotogramma prima
      prev[k] = w; for (const c of w) { if (!Number.isFinite(c)) throw new Error(`${file}: rotazione non valida per ${OSSA[k]}`); q.push(Math.round(c * 10000)); }
    });
    if (specchio) { // nel GLB le ossa a riposo sono allineate al mondo: ribaltare è scambiare destra e sinistra e cambiare segno a y e z
      const f = q.splice(i * B * 4, B * 4), m = new Array(B * 4);
      for (let k = 0; k < B; k++) { const d = SCAMBIO[k] * 4, o = k * 4; m[d] = f[o]; m[d + 1] = -f[o + 1]; m[d + 2] = -f[o + 2]; m[d + 3] = f[o + 3]; }
      q.push(...m);
    }
  }
  mx.setTime(0); bones.Hips.getWorldPosition(v); x0 = 0; z0 = 2; // il bacino resta sopra i piedi: lo spostamento lo fa il motore della partita
  mx.stopAllAction(); mx.uncacheRoot(model);
  out.clip[nome] = { n, x: x0, z: z0, y, q };
  console.log(nome.padEnd(10), file.padEnd(28), `${da}-${fine.toFixed(2)} s`, n, 'fotogrammi');
}
const js = `// Generato da scripts/animazioni.mjs dalle animazioni Mixamo (Soccer Game Pack). Non modificare a mano.\nwindow.ANIMS=${JSON.stringify(out)};\n`;
writeFileSync('public/anim.js', js); console.log('public/anim.js', Math.round(js.length / 1024), 'KB');
