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
  passa_fermo: 'pass/idle/000.anim', passa: 'pass/walk/000.anim', passa_scatto: 'pass/sprint/000.anim',
  calcia_fermo: 'shot/idle/020.anim', calcia: 'shot/sprint/010_short_bit_longer.anim',
  lancia_fermo: 'highpass/idle/000_long.anim', lancia: 'highpass/walk/000_long.anim',
};
// parate del portiere. Di lato: il nome senza suffisso è il tuffo verso la SUA sinistra, «_dx» verso la destra (nelle
// sorgenti i tuffi rasoterra vanno a sinistra, gli altri a destra: quelli si specchiano). Al centro: presa a terra, al
// ginocchio, al busto e alta.
const PARATE = { terra_lontano: ['deflect/idle/090_ground_deflect_far.anim', 'sx'], terra_vicino: ['deflect/idle/090_ground_holdball_close.anim', 'sx'],
  mezza_lontano: ['deflect/idle/090_midheight_deflect_far.anim', 'dx'], mezza_vicino: ['deflect/idle/090_midheight_holdball_close.anim', 'dx'],
  busto: ['deflect/idle/090_trunk_deflect_far.anim', 'dx'], alto: ['deflect/idle/090_high_deflect_far.anim', 'dx'] };
for (const [k, [f, lato]] of Object.entries(PARATE)) { ELENCO[`para_${k}`] = lato === 'sx' ? f : `${f}:specchio`; ELENCO[`para_${k}_dx`] = lato === 'sx' ? `${f}:specchio` : f; }
Object.assign(ELENCO, { presa_terra: 'deflect/idle/000_ground_holdball.anim', presa_ginocchio: 'deflect/idle/000_kneeheight_holdball.anim',
  presa_busto: 'deflect/idle/000_trunk_holdball.anim', presa_alta: 'deflect/idle/000_high_holdball.anim' });
// sbilanciamenti dopo una spallata (senza palla): avanti, indietro, di lato (da sinistra; «_dx» da destra), da fermo e in corsa
Object.assign(ELENCO, { spinta_avanti_fermo: 'trip/trip_t1/idle/000_protectfront.anim', spinta_dietro_fermo: 'trip/trip_t1/idle/000_protectback.anim',
  spinta_lato_fermo: 'trip/trip_t1/idle/000_protectside.anim', spinta_lato_fermo_dx: 'trip/trip_t1/idle/000_protectside.anim:specchio',
  spinta_avanti: 'trip/trip_t1/walk/000_protectfront.anim', spinta_dietro: 'trip/trip_t1/walk/000_protectback.anim',
  spinta_lato: 'trip/trip_t1/walk/028_D045_sidebump.anim', spinta_lato_dx: 'trip/trip_t1/walk/028_D045_sidebump.anim:specchio' });
// gesti con un giro: «:giro» toglie dalla clip la rotazione del corpo attorno alla verticale (nel gioco il giocatore lo gira
// il motore) e ne fa due, «_sx» che gira verso la sua sinistra e «_dx» verso destra (una è lo specchio dell'altra).
// Stop con giro (da fermo 90° e 135°, in corsa 135°) e tagli in conduzione (45°, 90°, 135°, 180°, e in scatto 45° e 90°).
Object.assign(ELENCO, { stop_gira90_fermo: 'trap/idle/090_IB000_accel_optional.anim:giro', stop_gira135_fermo: 'trap/idle/135_IB000.anim:giro',
  stop_gira135: 'trap/walk/135_D000_IB000_decel_decel.anim:giro',
  taglio_45: 'ballcontrol/walk/045.anim:giro', taglio_90: 'ballcontrol/walk/090_strongfoot.anim:giro', taglio_135: 'ballcontrol/walk/135_decel_decel.anim:giro',
  taglio_180: 'ballcontrol/walk/180_decel_decel.anim:giro', taglio_scatto_45: 'ballcontrol/sprint/045_decel.anim:giro', taglio_scatto_90: 'ballcontrol/sprint/090_decel_decel.anim:giro',
  // stop di un pallone che arriva di lato (nella sorgente da destra; «_sx» da sinistra)
  stop_lato_dx: 'trap/walk/000_D000_IB090.anim', stop_lato_sx: 'trap/walk/000_D000_IB090.anim:specchio' });
// rialzarsi da terra (dopo un tuffo), da prono e da supino
Object.assign(ELENCO, { rialza: 'movement_special/idle/special/000_stand_up_from_front.anim', rialza_schiena: 'movement_special/idle/special/000_stand_up_from_back.anim' });
// esultanze dopo il gol (normale, scatenata con la frenata) e delusione di chi lo subisce; rimessa laterale con le mani (corta
// e lunga: il pallone parte al «tocco»); colpi di testa da fermo, in salto, in corsa e contesi; scivolate (in corsa e
// camminando) e cadute dopo un fallo (in avanti, di lato, camminando); l'arbitro che mostra il cartellino; il portiere col
// pallone in mano, fermo e camminando
Object.assign(ELENCO, { esulta: 'celebration/happy_normal/000.anim', esulta_corsa: 'celebration/happy_extreme/000_decel_decel.anim', delusione: 'celebration/sad_normal/000.anim',
  rimessa: 'pass/idle/special/000_throw.anim', rimessa_lunga: 'highpass/idle/special/000_throw.anim',
  testa_fermo: 'pass/idle/nonbase/000_header.anim', testa_salto: 'pass/idle/nonbase/000_header_jump_forwards.anim', testa_corsa: 'pass/sprint/nonbase/000_header_jump.anim',
  testa_contesa: 'interfere/idle/000_header_jump.anim', scivola: 'sliding/sprint/000.anim', scivola_sx: 'sliding/sprint/000.anim:specchio', scivola_corta: 'sliding/walk/000.anim',
  cade: 'trip/trip_t3/sprint/000.anim', cade_lato: 'trip/trip_t3/sprint/045.anim', cade_lato_dx: 'trip/trip_t3/sprint/045.anim:specchio', cade_cammina: 'trip/trip_t3/walk/000_000.anim',
  cartellino: 'special/000_showcard.anim', tiene_palla: 'movement_special/idle/special/000_holdball.anim', cammina_palla: 'movement_special/dribble/special/000_holdball.anim' });
// passaggi, tiri e lanci anche col sinistro
for (const k of ['passa_fermo', 'passa', 'passa_scatto', 'calcia_fermo', 'calcia', 'lancia_fermo', 'lancia']) ELENCO[`${k}_sx`] = `${ELENCO[k]}:specchio`;
const SCAMBIO = Object.fromEntries(Object.keys(GF).map((n) => [n, n.startsWith('left_') ? n.replace('left_', 'right_') : n.startsWith('right_') ? n.replace('right_', 'left_') : n]));
const specchia = (W) => { const M = {}; for (const n in W) { const q = W[SCAMBIO[n]]; M[n] = new T.Quaternion(q.x, -q.y, -q.z, q.w); } return M; };

const out = { fps: FPS, bacino: 'pelvis', ossa: OSSA, clip: {}, info: {} };
// di quanto è girato il corpo attorno alla verticale (radianti, positivo verso la sua sinistra), senza salti di 360°
const imbardata = (q, prima) => { let a = 2 * Math.atan2(q.y, q.w); while (a - prima > Math.PI) a -= 2 * Math.PI; while (a - prima < -Math.PI) a += 2 * Math.PI; return a; };
const SU = new T.Vector3(0, 1, 0);
const lista = [];
for (const [nome, sorg] of voci.length ? voci.map((v) => v.split('=')) : Object.entries(ELENCO)) {
  const [file, opz] = sorg.split(':');
  if (opz !== 'giro') { lista.push([nome, file, opz === 'specchio', false]); continue; }
  const A = leggi(readFileSync(join(dir, file), 'utf8')), netto = imbardata(mondo(A, A.fine).body, imbardata(mondo(A, A.fine / 2).body, imbardata(mondo(A, 0).body, 0))) - imbardata(mondo(A, 0).body, 0);
  lista.push([`${nome}_${netto > 0 ? 'sx' : 'dx'}`, file, false, true], [`${nome}_${netto > 0 ? 'dx' : 'sx'}`, file, true, true]);
}
for (const [nome, file, sp, giro] of lista) {
  const A = leggi(readFileSync(join(dir, file), 'utf8')), sorg = `${file}${sp ? ':specchio' : ''}${giro ? ':giro' : ''}`; let y0 = null, yPrima = 0, netto = 0;
  const durata = A.fine / ORIG, n = Math.max(2, Math.round(durata * FPS) + 1), p = [], q = [], prev = OSSA.map(() => null);
  for (let i = 0; i < n; i++) {
    const f = Math.min(A.fine, i / FPS * ORIG), W0 = mondo(A, f);
    if (giro) { // via la rotazione attorno alla verticale accumulata dall'inizio: il corpo resta rivolto in avanti
      const y = imbardata(W0.body, yPrima); yPrima = y; if (y0 === null) y0 = y; netto = y - y0;
      const via = new T.Quaternion().setFromAxisAngle(SU, -netto); for (const k in W0) W0[k].premultiply(via);
    }
    const W = sp ? specchia(W0) : W0;
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
  // la velocità: strada percorsa (lungo la curva, se gira) diviso la durata
  const k = A.chiavi.player; let strada = 0; for (let i = 1; k && i < k.length; i++) strada += Math.hypot(k[i][1].x - k[i - 1][1].x, k[i][1].z - k[i - 1][1].z);
  const v = strada / durata;
  const info = { v: +v.toFixed(2), durata: +durata.toFixed(3) }; if (giro) info.giro = Math.round(netto * 180 / Math.PI) * (sp ? -1 : 1);
  if (A.palla) { const pl = a(k, A.palla.f, false), rel = A.palla.pos.clone().sub(new T.Vector3(pl.x, 0, pl.z)); if (sp) rel.x = -rel.x; info.tocco = +(A.palla.f / ORIG).toFixed(3); info.palla = rel.toArray().map((x) => +x.toFixed(3)); }
  out.info[nome] = info;
  console.log(nome.padEnd(16), sorg.padEnd(44), `${durata.toFixed(2)} s`, n, 'fotogrammi', `${info.v} m/s`, info.tocco !== undefined ? `tocco a ${info.tocco} s` : '');
}
writeFileSync(uscita, `// Generato da scripts/gfootball.mjs: animazioni di GameplayFootball (Google Research Football, licenza Unlicense,\n// pubblico dominio) portate sullo scheletro del calciatore. Non modificare a mano.\nwindow.ANIMS_GF=${JSON.stringify(out)};\n`);
console.log(uscita, Math.round(readFileSync(uscita).length / 1024), 'KB');
