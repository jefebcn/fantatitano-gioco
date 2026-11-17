// Misura le clip di un pacchetto Mixamo (durata, spostamento del bacino, tempo a terra, momento del calcio): serve a scegliere quali usare e dove ritagliarle.
// Uso: node scripts/analizza.mjs /cartella/con/gli/fbx
import * as T from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { readFileSync, readdirSync } from 'node:fs';
const dir = process.argv[2];
const ab = (f) => { const b = readFileSync(f); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };
const loader = new FBXLoader();
const model = loader.parse(ab(`${dir}/X Bot.fbx`), '');
const bones = {}; model.traverse((o) => { if (o.isBone) bones[o.name.replace(/^mixamorig:?/, '')] = o; });
console.log('ossa', Object.keys(bones).length, 'scala modello', model.scale.x, 'anim nel modello', model.animations.length);
const v = new T.Vector3();
const out = [];
for (const f of readdirSync(dir).filter((x) => x.endsWith('.fbx') && x !== 'X Bot.fbx').sort()) {
  const g = loader.parse(ab(`${dir}/${f}`), ''); const clip = g.animations[0]; if (!clip) { console.log('nessuna clip', f); continue; }
  const mixer = new T.AnimationMixer(model), act = mixer.clipAction(clip); act.play();
  const N = Math.max(2, Math.round(clip.duration * 30)); const S = [];
  for (let i = 0; i <= N; i++) { mixer.setTime(Math.min(clip.duration * i / N, clip.duration - 1e-4)); model.updateMatrixWorld(true); const p = (n) => bones[n].getWorldPosition(v).toArray(); S.push({ h: p('Hips'), l: p('LeftFoot'), r: p('RightFoot'), hd: p('Head') }); }
  mixer.stopAllAction(); mixer.uncacheRoot(model);
  const dt = clip.duration / N; let best = { s: 0 };
  for (let i = 1; i <= N; i++) for (const k of ['l', 'r']) { // velocità del piede rispetto al bacino
    const rel = (j) => [S[j][k][0] - S[j].h[0], S[j][k][1] - S[j].h[1], S[j][k][2] - S[j].h[2]]; const a = rel(i - 1), b = rel(i);
    const s = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / dt; if (s > best.s) best = { s, t: i * dt, foot: k };
  }
  const hy = S.map((s) => s.h[1]); const minY = Math.min(...hy), tMin = hy.indexOf(minY) * dt;
  const r1 = (x) => Math.round(x * 10) / 10;
  out.push({ f: f.replace('.fbx', ''), dur: r1(clip.duration), tracks: clip.tracks.length, fineX: Math.round(S[N].h[0] - S[0].h[0]), fineZ: Math.round(S[N].h[2] - S[0].h[2]), maxX: Math.round(Math.max(...S.map((s) => s.h[0] - S[0].h[0]))), minX: Math.round(Math.min(...S.map((s) => s.h[0] - S[0].h[0]))), maxZ: Math.round(Math.max(...S.map((s) => s.h[2] - S[0].h[2]))), giu: (() => { const a = hy.findIndex((y) => y < 55), b = hy.length - 1 - [...hy].reverse().findIndex((y) => y < 55); return a < 0 ? '' : `${r1(a * dt)}-${r1(b * dt)}`; })(), y0: Math.round(S[0].h[1]), minY: Math.round(minY), tMin: r1(tMin), headMin: Math.round(Math.min(...S.map((s) => s.hd[1]))), kick: `${best.foot}@${r1(best.t)} ${Math.round(best.s)}` });
}
console.table(out);
