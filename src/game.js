/* Fantatitano — La Partita (prototipo). Partita 3D giocabile: motore, IA, comandi, schermate. */
import * as T from 'three';
import { creaRegia } from './regia.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { creaDivisa, creaZone, creaRilievo, TONI, DISEGNI } from './divisa.js';
import * as CLOUD from './cloud.js';
import * as CAR from './carriera.js';
import * as FIS from './fisica/pallone.js';
import * as MOTO from './fisica/corpo.js';
import * as URTO from './fisica/contatti.js';
import { creaCampo, texturaOmbra } from './grafica/campo.js';
import { Porta, Bandierine, panchine, torriFaro, Particelle } from './grafica/stadio.js';
import { creaAtmosfera } from './grafica/luce.js';
import { creaSpalti } from './grafica/spalti.js';
import { creaBordoCampo } from './grafica/bordocampo.js';
import { creaAudio } from './audio.js';
import { creaPrestazioni } from './prestazioni.js';
import { creaResa } from './grafica/resa.js';
import { creaPiedi } from './grafica/piedi.js';
import { HL, HW, GH, GT, BR, GRAV, LINEE, CAMERA, ALTEZZA, PARATA, HALF_SECS, DIFF, MATE, RUN, DEF, FOUL, VOTE, CALCI, AIR, FORMS, PRESSING, MENT, DOWN, MOVI, CARICO, SUB, RIMESSA, PASSA, CARICA, DIST, TENUTA, RINVIO, MANO, RISERVA, ANDATURA, RITMO, RIVEDI, PASSAGGIO, AREA_IA, PORTIERE, FERMI, GOLSEQ, LEVETTA, PRESSIONE, SEGNI } from './config.js';

(() => {
// i valori di gioco (campo, tempi, difficoltà, IA, comandi, fisica) stanno tutti in src/config.js
function setTactics(t, name, ment) {
  t.formName = FORMS[name] ? name : '4-3-3'; const f = FORMS[t.formName]; t.form = f.pos; if (ment !== undefined) t.ment = ment;
  for (const p of t.players.concat(t.off)) p.role = f.roles[p.i];
}
const aiForm = (c) => Object.keys(FORMS)[hash(c.id) % 4];
const $ = (s) => document.querySelector(s);
const rnd = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const hyp = Math.hypot;
const sgn = (v) => (v < 0 ? -1 : 1);
const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const IMGX = {}; // immagini fatte al momento al posto dei file (lo stemma del club dell'utente)
const img = (id) => IMGX[id] || `img/${id}.webp`;

const G = {
  state: 'menu', stateT: 0, t: 0, teams: [], ball: null, ctrl: null, clock: 0, half: 1, auto: false, diff: DIFF.normale,
  lastTouch: null, lastKicker: null, intended: null, poss: null, shotId: 0, charge: -1, paused: false, rot: false, comp: null,
  in: { jx: 0, jy: 0, pressing: false }, idle: 0, stats: null, goals: [], cards: [], next: null, taker: null,
  headId: -1, fk: null, wait: 1.1, offs: null, noOff: false, pen: false, penId: -1, penWait: 0,
};

/* ------------------------------------------------------------------ scena */
const canvas = $('#c');
const renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
// risoluzione che si adatta ai fotogrammi e indicatore ?debug (src/prestazioni.js)
const PERF = creaPrestazioni({ renderer, debug: /[?&]debug\b/.test(location.search), livello: () => QUAL.livello + (RESA && RESA.effetti() ? ' · alone' : ''), rinuncia: () => !!RESA && RESA.rinuncia() });
const scene = new T.Scene();
scene.background = new T.Color(0x86b9ea);
scene.fog = new T.Fog(0xa9cdee, 130, 330);
const cam = new T.PerspectiveCamera(38, 1, 0.5, 500);
const camPos = new T.Vector3(0, 60, 80), camLook = new T.Vector3(0, 0, 0);
const hemi = new T.HemisphereLight(0xffffff, 0x47703a, 2.1); scene.add(hemi);
const sun = new T.DirectionalLight(0xfff4dd, 1.9); sun.position.set(30, 70, 40); scene.add(sun); scene.add(sun.target);
// Ombre vere del sole: una mappa d'ombra morbida che copre solo la zona inquadrata e la segue (vedi seguiOmbre), così resta
// nitida e leggera. Sui telefoni deboli si scende a una mappa più piccola, e se i fotogrammi calano si spengono (vedi qualita).
// ombre nette sul campo (come Dream League): mappa da 2048 dove il telefono regge, 1024 sugli altri (vedi qualita)
const OMBRA = { lato: 34, mappa: (navigator.hardwareConcurrency || 4) >= 6 ? 2048 : 1024 };
renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFShadowMap; // in three r18x la PCF usa shadow.radius: ombre morbide senza il vecchio PCFSoft
sun.castShadow = true; sun.shadow.mapSize.set(OMBRA.mappa, OMBRA.mappa); sun.shadow.bias = -.0006; sun.shadow.normalBias = .03; sun.shadow.radius = 3;
Object.assign(sun.shadow.camera, { left: -OMBRA.lato, right: OMBRA.lato, top: OMBRA.lato, bottom: -OMBRA.lato, near: 10, far: 160 }); sun.shadow.camera.updateProjectionMatrix();
const SOLE = new T.Vector3(-40, 38, -14); // la direzione del sole la mette creaAtmosfera (src/grafica/luce.js)
function seguiOmbre() { // il sole si sposta con l'inquadratura, a passi di un texel (niente ombre che tremolano)
  const k = OMBRA.lato * 2 / OMBRA.mappa, x = Math.round(camLook.x / k) * k, z = Math.round(camLook.z / k) * k;
  sun.target.position.set(x, 0, z); sun.position.set(x + SOLE.x, SOLE.y, z + SOLE.z);
}

const mats = new Map();
const mat = (hex) => { let m = mats.get(hex); if (!m) { m = new T.MeshLambertMaterial({ color: hex }); mats.set(hex, m); } return m; };
function ctex(c, repX = 1, repY = 1) {
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4;
  if (repX !== 1 || repY !== 1) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(repX, repY); }
  return t;
}
function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }

async function buildPitch() {
  const { campo, fuori } = await creaCampo(T, { HL, HW, linee: LINEE, anisotropia: renderer.capabilities.getMaxAnisotropy() }); scene.add(campo, fuori); CAMPO = campo; // prato PBR, strisce, usura e linee: src/grafica/campo.js
  // porte con la rete che si deforma e bandierine che si flettono (src/grafica/stadio.js)
  PORTE = [-1, 1].map((d) => new Porta(T, scene, { d, gx: d * HL, GH, GT }));
  BANDIERINE = new Bandierine(T, scene, { HL, HW });
}
let RESA = null, PORTE = [], BANDIERINE = null, FARI = null, CAMPO = null, SFONDO = null, ATMO = null, SPALTI = null, BORDO = null;
const PART = new Particelle(T, scene); // ciuffi d'erba e polvere: scivolate, frenate, tiri forti

let boards = [], standMat = null, titoSprite = null;
function buildStadium(lockup) {
  // spalti in cemento con scale, ringhiere, tunnel, striscioni, bandiere e la folla (src/grafica/spalti.js)
  SPALTI = creaSpalti(T, scene, { HL, HW, renderer }); BORDO = creaBordoCampo(T, scene, { HL, HW }); // e steward e fotografi a bordo campo (src/grafica/bordocampo.js)
  // cartelloni
  const [bc, bx] = cv(2048, 64);
  const tex = ctex(bc); boards.tex = tex; boards.cv = bc; boards.ctx = bx; boards.lockup = lockup;
  const bm = new T.MeshBasicMaterial({ map: tex });
  const board = (len, px, pz, ry) => {
    const m = new T.Mesh(new T.PlaneGeometry(len, 1.05), bm.clone()); m.material.map = tex.clone(); m.material.map.needsUpdate = true;
    m.material.map.wrapS = T.RepeatWrapping; m.material.map.repeat.set(len / 64, 1);
    m.position.set(px, .55, pz); m.rotation.y = ry; scene.add(m); boards.push(m);
  };
  board(HL * 2 + 8, 0, -(HW + 4.2), 0); board(HL * 2 + 8, 0, HW + 4.2, Math.PI);
  board(HW * 2 + 8, HL + 5.2, 0, -Math.PI / 2); board(HW * 2 + 8, -(HL + 5.2), 0, Math.PI / 2);
  panchine(T, scene, { HW }); FARI = torriFaro(T, scene, { HL, HW }); // panchine tecniche e torri faro agli angoli
  // Monte Titano con le tre torri, sullo sfondo
  const sh = new T.Shape(); const pts = [[-130, 0], [-110, 8], [-84, 20], [-62, 34], [-52, 44], [-47, 44], [-47, 52], [-41, 52], [-41, 45], [-24, 40], [-8, 48], [-3, 56], [-3, 66], [3, 66], [3, 57], [12, 50], [30, 38], [44, 41], [50, 46], [50, 53], [55, 53], [55, 45], [70, 30], [92, 16], [112, 7], [130, 0]];
  sh.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) sh.lineTo(p[0], p[1]);
  const tg = new T.ShapeGeometry(sh), tm = new T.MeshBasicMaterial({ color: 0x4d6f9c }); SFONDO = tm;
  const t1 = new T.Mesh(tg, tm); t1.position.set(0, 0, -190); t1.scale.set(1.5, 1.25, 1); scene.add(t1);
  const t2 = new T.Mesh(tg, tm); t2.position.set(215, 0, 0); t2.rotation.y = -Math.PI / 2; t2.scale.set(1.5, 1.25, 1); scene.add(t2);
}
function paintBoards(home, away, imgs) {
  const x = boards.ctx, c = boards.cv; if (!x) return;
  x.fillStyle = '#0A0A0C'; x.fillRect(0, 0, c.width, c.height);
  const seg = 512;
  for (let i = 0; i < 4; i++) {
    const o = i * seg;
    x.fillStyle = i % 2 ? '#4B06FC' : '#0A0A0C'; x.fillRect(o, 0, seg, 64);
    const msg = ['FANTATITANO', 'FANTATITANO.SITE', 'CALCIO SAMMARINESE', 'SAN MARINO · MONTE TITANO'][i];
    x.fillStyle = i % 2 ? '#fff' : '#D9F51F'; x.textBaseline = 'middle'; x.textAlign = 'center';
    let fs = 44; do { x.font = `${fs}px Anton`; fs -= 2; } while (x.measureText(msg).width > seg - 200 && fs > 20); // il testo sta tra i due stemmi
    x.fillText(msg, o + seg / 2, 35);
    const cr = imgs && imgs[i < 2 ? home.id : away.id]; if (cr) x.drawImage(cr, o + 24, 5, 54 * cr.width / cr.height, 54);
    const cr2 = imgs && imgs[i < 2 ? away.id : home.id]; if (cr2) x.drawImage(cr2, o + seg - 78, 5, 54 * cr2.width / cr2.height, 54);
  }
  for (const b of boards) b.material.map.needsUpdate = true;
}

/* ------------------------------------------------------------------ figure */
const GEO = {
  torso: new T.BoxGeometry(.46, .54, .26), shorts: new T.BoxGeometry(.42, .27, .27), thigh: new T.BoxGeometry(.16, .42, .17),
  shin: new T.BoxGeometry(.125, .4, .135), boot: new T.BoxGeometry(.135, .1, .28), uarm: new T.BoxGeometry(.125, .3, .135),
  farm: new T.BoxGeometry(.1, .28, .1), head: new T.SphereGeometry(.145, 12, 9), hair: new T.SphereGeometry(.156, 12, 8, 0, Math.PI * 2, 0, Math.PI * .56),
  num: new T.PlaneGeometry(.3, .3), shadow: new T.CircleGeometry(.5, 14), ring: new T.RingGeometry(.48, .63, 28), tri: new T.ConeGeometry(.15, .27, 3),
};
const shadowMat = new T.MeshBasicMaterial({ map: texturaOmbra(T), transparent: true, opacity: .32, depthWrite: false }); // ombra di contatto morbida sotto i piedi
const SKIN = [0xf1c9a5, 0xe0ac7e, 0xc68b5e, 0x9a6441, 0x6e452c], HAIR = [0x1c1410, 0x2e2018, 0x5a3a20, 0x8a6a3a, 0x111111, 0xc9a25a, 0xd8bd7a, 0x8e3b1c, 0x9c9a96, 0xe8e0c8];
/** Numero (e nome) sulla schiena, o il numero piccolo sui pantaloncini: 256 px, col bordo che lo stacca da righe e disegni. */
function numMat(n, ink, nome, bordo) {
  const [c, x] = cv(256, 256); x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
  const scrivi = (t, y, lw) => { if (bordo) { x.strokeStyle = bordo; x.lineWidth = lw; x.strokeText(t, 128, y); } x.fillStyle = ink; x.fillText(t, 128, y); };
  if (nome) { const t = String(nome).toUpperCase(); x.font = '46px Anton'; const w = x.measureText(t).width; if (w > 236) x.font = `${Math.floor(46 * 236 / w)}px Anton`; scrivi(t, 40, 6); }
  x.font = `${nome ? 172 : 200}px Anton`; scrivi(String(n), nome ? 162 : 140, 10);
  const tx = ctex(c); tx.anisotropy = 4;
  return new T.MeshStandardMaterial({ map: tx, transparent: true, alphaTest: .35, roughness: .3, metalness: 0 }); // stampa gommata: lucida sotto i fari
}
function makeFigure(kit, seed, num) {
  const root = new T.Group(), body = new T.Group(); root.add(body);
  const skin = mat(SKIN[seed % SKIN.length]), hair = mat(HAIR[(seed >>> 4) % HAIR.length]);
  const add = (geo, m, x, y, z, par = body) => { const o = new T.Mesh(geo, m); o.position.set(x, y, z); par.add(o); return o; };
  add(GEO.torso, mat(kit.shirt), 0, 1.27, 0); add(GEO.shorts, mat(kit.shorts), 0, .9, 0);
  add(GEO.head, skin, 0, 1.7, 0); add(GEO.hair, hair, 0, 1.715, -.012);
  const leg = (sx) => {
    const hip = new T.Group(); hip.position.set(sx * .115, .86, 0); body.add(hip); add(GEO.thigh, skin, 0, -.21, 0, hip);
    const knee = new T.Group(); knee.position.set(0, -.42, 0); hip.add(knee); add(GEO.shin, mat(kit.socks), 0, -.2, 0, knee); add(GEO.boot, mat(kit.boots || '#16161a'), 0, -.42, .065, knee);
    return [hip, knee];
  };
  const arm = (sx) => {
    const sh = new T.Group(); sh.position.set(sx * .295, 1.5, 0); body.add(sh); add(GEO.uarm, mat(kit.sleeve), 0, -.14, 0, sh);
    const el = new T.Group(); el.position.set(0, -.29, 0); sh.add(el); add(GEO.farm, kit.gloves ? mat(kit.gloves) : skin, 0, -.13, 0, el);
    return [sh, el];
  };
  const [legL, kneeL] = leg(-1), [legR, kneeR] = leg(1), [armL, elL] = arm(-1), [armR, elR] = arm(1);
  const n = new T.Mesh(GEO.num, numMat(num, kit.ink)); n.position.set(0, 1.3, -.135); n.rotation.y = Math.PI; body.add(n);
  const sh = new T.Mesh(GEO.shadow, shadowMat); sh.rotation.x = -Math.PI / 2; sh.position.y = .03; root.add(sh);
  root.scale.setScalar(1);
  return { root, body, legL, legR, kneeL, kneeR, armL, armR, elL, elR };
}
/* --- figure con scheletro e animazioni registrate (modello GLB): se il modello non si carica restano quelle a blocchi --- */
let MODEL = null;
/** Le azioni registrate: velocità, da che secondo cominciano a sfumare (se manca: alla fine), cosa viene dopo. */
const FX = { tiro: { sp: 1.2, cut: .42 }, passaggio: { sp: 1.2, cut: .3 }, scivolata: { sp: 1.55 }, caduta: { sp: 1.25 }, tuffoS: { sp: 1.5 }, tuffoD: { sp: 1.5 }, presa: { sp: 1.1, cut: .7 }, rinvio: { sp: 1.15 }, testa: { sp: 1.3, cut: .45 }, bandiera: { sp: 1 } };
const hasFx = (n) => !!(MODEL && MODEL.fx && MODEL.fx[n]);
const bloccaPiedi = creaPiedi(T); // piedi piantati sull'erba (src/grafica/piedi.js)
function azione(p, name) { if (hasFx(name) && p.fig.skinned) { p.fxFermo = false; p.fx = name; p.fxT = 0; p.fxNew = true; p.fxSp = null; p.fxDa = 0; } sporca(p, name); }
/* Gesti con la palla: animazioni brevi di GameplayFootball (public/anim-gf.js, scripts/gfootball.mjs) col fotogramma in cui
   il piede tocca la palla. Si fanno partire in anticipo, dal punto giusto e alla velocità del giocatore, così che quel
   fotogramma cada proprio nell'istante in cui la fisica tocca la palla: il piede e il pallone vanno a tempo. */
const GESTI = window.ANIMS_GF ? window.ANIMS_GF.info : {};
/** Libero per un gesto: nessuna azione in corso, o un gesto che ha già toccato la palla (i tocchi si susseguono). */
// i movimenti senza palla (partenze, inversioni, frenata) sono solo grafica: qualunque altro gesto li interrompe
const MOV = /^(parte|inverti|frena)_/;
const libero = (p) => !p.fx || MOV.test(p.fx) || (!!GESTI[p.fx] && GESTI[p.fx].tocco !== undefined && !/^(para|presa_)/.test(p.fx) && p.fxT * (p.fxSp || 1) > GESTI[p.fx].tocco + .02);
/** A che ritmo gira un gesto per chi corre a velocità v: quello della sua corsa, tranne i gesti con un giro (frenano e ripartono da soli). */
const ritmoGesto = (i, v) => (i.giro !== undefined ? 1 : i.v > 1 ? clamp(v / i.v, .6, 1.5) : 1);
/** Verso dove si porta la palla chi la controlla: la levetta, o il dischetto avversario per chi gioca da solo (null: dritto davanti a sé). */
function versoControllo(p) {
  const [jx, jz] = userDrives(p) ? inputWorld() : [0, 0], s = p.team.side;
  return hyp(jx, jz) > .3 ? { x: jx, z: jz } : userDrives(p) ? null : { x: s * (HL - 11) - p.x, z: -p.z * .5 }; // verso il dischetto: dentro al campo anche vicino alla linea di fondo
}
const giroVerso = (da, a) => Math.atan2(Math.sin(a - da), Math.cos(a - da)); // angolo da una direzione all'altra, positivo verso sinistra
/** Tocco di conduzione che cambia direzione: il gesto del taglio parte dal fotogramma del contatto (il tocco è appena avvenuto). */
function taglio(o, b) {
  if (o.carica || !o.fig.skinned || (o.fx && !/^(tocco|stop|taglio|parte|inverti|frena)/.test(o.fx))) return;
  const v = hyp(o.vx, o.vz), bv = hyp(b.vx, b.vz); if (v < 1 || bv < 1) return;
  const a = giroVerso(Math.atan2(o.vx, o.vz), Math.atan2(b.vx, b.vz)), g = Math.abs(a) * 180 / Math.PI; if (g < 35) return;
  const scatto = v / (o.fig.alt || 1) > 5.8 && g < 112;
  const nome = (scatto ? `taglio_scatto_${g < 67 ? 45 : 90}` : `taglio_${g < 67 ? 45 : g < 112 ? 90 : g < 157 ? 135 : 180}`) + (a > 0 ? '_sx' : '_dx');
  if (GESTI[nome]) { o.fx = null; gesto(o, nome, 0); }
}
/**
 * Movimenti senza palla (solo grafica, non cambiano la partita): chi parte da fermo verso una direzione girata fa la
 * partenza col giro, chi inverte la corsa la frenata con la svolta, chi smette di scattare la frenata. Il corpo gira
 * insieme al gesto (in poseSkinned) invece di ruotare sul posto. MOVI.fermo: sotto questa velocità si è fermi (m/s);
 * parte: velocità voluta minima per una partenza; giro: gradi minimi per una partenza girata; corsa: velocità minima per
 * un'inversione; inverti: coseno sotto cui la direzione voluta è alle spalle (lo stesso del corpo); scatto: velocità
 * relativa dello scatto; pausa: secondi tra un movimento e il successivo. In corsa il gesto parte solo quando a terra c'è
 * il piede con cui comincia la clip, appena appoggiato (entro MOVI.passo del passo): se no si aspetta al massimo
 * MOVI.attesa secondi, intanto il giocatore frena e la velocità minima scende a MOVI.corsaAttesa.
 */
function movimento(p, v) {
  if (p.i === 0 || p.st !== 'run' || G.ball.owner === p || p.fx || p.carica || !p.fig.skinned || (p.movT || 0) > G.t || G.state === 'goal') return;
  const M = MOVI, w = hyp(p.wx || 0, p.wz || 0), vr = v / (p.fig.alt || 1); let nome = null, verso = p.dir;
  if (v < M.fermo && w > M.parte) {
    verso = Math.atan2(p.wx, p.wz); const a = giroVerso(p.dir, verso), g = Math.abs(a) * 180 / Math.PI; if (g < M.giro) return;
    nome = `parte_${g < 67 ? 45 : g < 112 ? 90 : g < 157 ? 135 : 180}${a > 0 ? '_sx' : '_dx'}`;
  } else if (v > ((p.movAsp || 0) > G.t ? M.corsaAttesa : M.corsa) && w > 1.5 && (p.wx * p.vx + p.wz * p.vz) / (w * v) < M.inverti) {
    verso = Math.atan2(p.wx, p.wz); const a = giroVerso(Math.atan2(p.vx, p.vz), verso), g = Math.abs(a) * 180 / Math.PI;
    nome = (vr > M.scatto ? 'inverti_scatto_135' : g < 157 ? 'inverti_135' : 'inverti_180') + (a > 0 ? '_sx' : '_dx');
  } else if (vr > M.scatto && w < 1) nome = 'frena_scatto';
  if (!nome || !GESTI[nome]) return;
  const giu = (p.passo || 0) < .5 ? 'dx' : 'sx', ap = GESTI[nome].appoggio;
  if (v >= M.fermo && ap && (giu !== ap || (p.passo || 0) % .5 > M.passo)) { if (!((p.movAsp || 0) > G.t - M.attesa)) p.movAsp = G.t + M.attesa; return; }
  if (!gesto(p, nome, 0)) return;
  p.movAsp = 0; p.fxSp = 1; p.movDa = p.fig.vdir ?? p.dir; p.movA = giroVerso(p.movDa, verso); p.movT = G.t + GESTI[nome].durata + M.pausa;
}
/** Fa partire il gesto «nome» in modo che il piede tocchi la palla fra «fra» secondi. */
function gesto(p, nome, fra, adatta = false) {
  const i = GESTI[nome]; if (!i || !hasFx(nome) || !p.fig.skinned || !libero(p)) return false;
  const v = hyp(p.vx, p.vz) / (p.fig.alt || 1);
  // adatta: invece della velocità del giocatore, il ritmo che porta il contatto esattamente fra «fra» secondi (le parate)
  const sp = adatta ? (i.tocco && fra > i.tocco ? clamp(i.tocco / fra, .6, 1) : 1) : ritmoGesto(i, v);
  const da = Math.max(0, (i.tocco || 0) - fra * sp); // senza tocco (uno sbilanciamento) parte dall'inizio
  p.fxFermo = false; p.fx = nome; p.fxSp = sp; p.fxDa = da; p.fxT = da / sp; p.fxNew = true; return true;
}
/**
 * Conduzione: fra quanto il piede spinge la palla. Le stesse condizioni di FIS.conduci, portate avanti nel tempo: il tocco
 * arriva quando il passo è a 0,42 o 0,92 (un piede sta per scendere) con la palla a portata, oppure, tra un passo e
 * l'altro, quando la palla è ormai a meno di COND.forza davanti. Il piede è quello in volo in quel momento.
 */
function prevediTocco(o, b) {
  if (!o.fig.skinned || !libero(o) || b.y > .5) return;
  const v = hyp(o.vx, o.vz), vr = v / (o.fig.alt || 1); if (vr < FIS.COND.fermo + .1) return;
  const cad = MOTO.cadenza(vr); if (!(cad > 0)) return;
  const C = FIS.COND, ux = o.vx / v, uz = o.vz / v, rx = b.x - o.x, rz = b.z - o.z;
  if (Math.abs(rx * uz - rz * ux) > .9 || hyp(rx, rz) > 1.3) return;
  const av0 = rx * ux + rz * uz, chiude = v - (b.vx * ux + b.vz * uz), avanti = (t) => av0 - chiude * t;
  const ph = o.passo || 0, prossimo = ph < .42 ? .42 : ph < .92 ? .92 : 1.42, tPasso = (prossimo - ph) / cad;
  const tForza = chiude > .1 ? Math.max(0, (av0 - C.forza) / chiude) : Infinity;
  let fra = Math.min(avanti(tPasso) < C.vicino + C.ritmo ? tPasso : Infinity, tForza); fra = Math.max(fra, o.tocco || 0);
  if (!(fra < .5)) return;
  const sinistro = fra === tPasso ? Math.abs(prossimo % 1 - .42) < .01 : (ph + cad * fra) % 1 < .5; // da 0 a 0,5 il sinistro è in volo (0 = appoggio destro)
  const nome = (vr > 5.8 ? 'tocco_scatto' : 'tocco') + (sinistro ? '_sx' : ''), i = GESTI[nome]; if (!i) return;
  const anticipo = i.tocco / clamp(vr / i.v, .6, 1.5);
  if (fra <= anticipo && fra > anticipo - .05) gesto(o, nome, fra);
}
/**
 * Passaggi, tiri e lanci col caricamento: parte il gesto e la palla parte quando il piede la colpisce (fra CARICO secondi,
 * il tempo dell'ultimo tratto della calciata). Il piede è quello giusto per la direzione: verso sinistra il destro, verso
 * destra il sinistro. Se nel frattempo il giocatore perde palla, il calcio non parte. Fuori dal gioco aperto, o se il gesto
 * non si può fare, il calcio parte subito come prima.
 */
// il tiro potente resta quello di Mixamo, più ampio: il destro colpisce a 0,067 s dall'inizio della clip (misurato sul piede)
GESTI.tiro = GESTI.tiro || { v: 0, tocco: .067, durata: .733 };
function prepara(p, tipo, bx, bz, calcio, forte = false) {
  if (G.state !== 'play' || G.ball.owner !== p || !p.fig.skinned || p.carica) return calcio();
  const v = hyp(p.vx, p.vz) / (p.fig.alt || 1), sx = (bx - p.x) * Math.cos(p.dir) - (bz - p.z) * Math.sin(p.dir) < 0; // il bersaglio è alla sua destra
  const variante = tipo === 'passa' ? (v < 1.5 ? '_fermo' : v > 4.8 ? '_scatto' : '') : v < (tipo === 'calcia' ? 1.2 : 1.5) ? '_fermo' : '';
  const nome = tipo === 'calcia' && forte && hasFx('tiro') && v >= 1.2 ? 'tiro' : tipo + variante + (sx ? '_sx' : ''), carico = nome === 'tiro' ? GESTI.tiro.tocco : CARICO[tipo];
  if (!gesto(p, nome, carico)) return calcio();
  p.carica = { t: carico, calcio };
}
/** A ogni passo di fisica: il calcio caricato parte quando il piede arriva sulla palla. */
function calciCaricati(dt) {
  for (const p of all()) if (p.carica && (p.carica.t -= dt) <= 0) { const c = p.carica.calcio; p.carica = null; if (G.ball.owner === p && G.state === 'play') c(); }
}
/**
 * Parate: il portiere sa fra quanto (tt) e dove (dz di lato, y di altezza) il pallone passa sulla sua linea. Di lato un
 * tuffo scelto per altezza e distanza, al centro una presa a terra, al ginocchio, al busto o alta: la mano arriva sul
 * pallone in quel momento. Ritorna false se il gesto non c'è (resta il tuffo di prima).
 */
const altezzaPresa = (y) => (y < PARATA.presa[0] ? 'terra' : y < PARATA.presa[1] ? 'ginocchio' : y < PARATA.presa[2] ? 'busto' : 'alta');
function parata(p, tt, dz, y) {
  if (Math.abs(dz) > 1) {
    const sinistra = -sgn(dz) * Math.sin(p.dir) > 0, lontano = Math.abs(dz) > 1.7; // la sua sinistra, nel mondo: (cos dir, -sin dir)
    const [h1, h2, h3] = PARATA.tuffo, tipo = y < h1 ? (lontano ? 'terra_lontano' : 'terra_vicino') : y < h2 ? (lontano ? 'mezza_lontano' : 'mezza_vicino') : y < h3 ? 'busto' : 'alto';
    return gesto(p, `para_${tipo}${sinistra ? '' : '_dx'}`, tt, true);
  }
  return gesto(p, `presa_${altezzaPresa(y)}`, tt, true);
}
/** Presa senza parata preparata (cross, tiro addosso): la clip all'altezza del pallone, dal momento in cui le mani lo toccano. */
function presaPortiere(p, y) {
  const nome = `presa_${altezzaPresa(y)}`, i = GESTI[nome];
  if (!i || !clipGF(p, nome, i.tocco || 0)) azione(p, 'presa');
}
const A_TERRA_GF = /^(para_|rialza|scivola|cade)/; // tuffi, scivolate e cadute finiscono a terra (e da lì ci si rialza): il corpo si alza quanto basta perché niente entri nell'erba
// Dopo le clip che finiscono a terra si resta sdraiati quanto serve, poi ci si rialza: da prono dopo un tuffo o una caduta,
// da supino dopo una scivolata. Il portiere resta giù finché è in tuffo o a terra; gli altri finché manca il tempo del rialzarsi.
const RIALZA = { para_: 'rialza', cade: 'rialza', scivola: 'rialza_schiena' };
const rialzo = (n) => { if (!n) return null; for (const k in RIALZA) if (n.startsWith(k)) return RIALZA[k]; return null; };
function aTerraAncora(p, r) {
  if (p.i === 0 && /^para_/.test(p.fx)) return p.st === 'dive' || p.st === 'down';
  const d = (GESTI[r] || {}).durata || .75;
  return p.st === 'slide' || (p.st === 'down' && p.stT < DOWN.pl - d) || (!!p.fallen && p.stun > d);
}
/** Una clip di GameplayFootball che parte da un punto (secondi) a velocità normale: scivolate, cadute, esultanze. */
function clipGF(p, nome, da = 0, sp = 1) { if (!hasFx(nome) || !p.fig.skinned) return false; p.fxFermo = false; p.fx = nome; p.fxT = da / sp; p.fxDa = da; p.fxSp = sp; p.fxNew = true; return true; }
/** Caduta dopo un fallo: in avanti se arriva da dietro o di fronte, di lato se arriva di fianco. */
function cade(o, d) {
  sporca(o, 'caduta');
  let nome = 'cade';
  if (d) { const dx = d.x - o.x, dz = d.z - o.z, l = hyp(dx, dz) || 1, lat = (dx * Math.cos(o.dir) - dz * Math.sin(o.dir)) / l; if (Math.abs(lat) > .6) nome = lat > 0 ? 'cade_lato_dx' : 'cade_lato'; }
  if (!clipGF(o, nome)) azione(o, 'caduta');
}
/** Spallata persa: chi perde palla si sbilancia dalla parte da cui arriva l'avversario (davanti, dietro, di lato). */
function sbilancia(o, d) {
  const dx = d.x - o.x, dz = d.z - o.z, av = dx * Math.sin(o.dir) + dz * Math.cos(o.dir), sx = dx * Math.cos(o.dir) - dz * Math.sin(o.dir); // sx > 0: arriva da sinistra
  const fermo = hyp(o.vx, o.vz) < 2 ? '_fermo' : '', dove = Math.abs(av) > Math.abs(sx) ? (av > 0 ? 'avanti' : 'dietro') : 'lato';
  gesto(o, `spinta_${dove}${fermo}${dove === 'lato' && sx < 0 ? '_dx' : ''}`, 0);
}
/** Ricezione: il compagno a cui arriva il passaggio (o chi sta per prendere una palla vagante) fa lo stop, col piede dalla parte della palla. */
function prevediStop(b) {
  const sp = hyp(b.vx, b.vz); if (b.owner || b.y > .6 || sp > 19 || G.state !== 'play') return;
  let p = G.intended;
  if (!p) { let bd = 4; for (const q of all()) { const d = hyp(q.x - b.x, q.z - b.z); if (q.i && d < bd) { bd = d; p = q; } } }
  if (!p || !p.i || !libero(p) || !p.fig.skinned || p.cool > 0 || p.st !== 'run') return;
  const rx = b.x - p.x, rz = b.z - p.z, d = hyp(rx, rz); if (d > 6 || d < 1.05) return;
  const chiude = -(rx * (b.vx - p.vx) + rz * (b.vz - p.vz)) / d; if (chiude < .8) return;
  const fra = (d - 1.05) / chiude, vr = hyp(p.vx, p.vz) / (p.fig.alt || 1);
  // quale stop: se dopo il controllo andrà da un'altra parte (la levetta, o la porta) lo stop è già col giro, da quella
  // parte, se il pallone gli taglia la strada di lato lo stop è laterale, altrimenti quello dritto col piede dalla parte della palla
  const lento = vr <= 1.6, vc = versoControllo(p), giro = vc ? giroVerso(p.dir, Math.atan2(vc.x, vc.z)) : 0, ag = Math.abs(giro) * 180 / Math.PI, parte = giro > 0 ? '_sx' : '_dx';
  const bl = sp > .5 ? (b.vx * Math.cos(p.dir) - b.vz * Math.sin(p.dir)) / sp : 0; // quanto il pallone viaggia verso la sua sinistra (+x del giocatore è la sua sinistra)
  const sx = rx * Math.cos(p.dir) - rz * Math.sin(p.dir) > 0;
  const nome = ag > 112 ? (lento ? 'stop_gira135_fermo' : 'stop_gira135') + parte : ag > 55 && lento ? 'stop_gira90_fermo' + parte
    : !lento && Math.abs(bl) > .8 ? (bl > 0 ? 'stop_lato_dx' : 'stop_lato_sx') : (lento ? 'stop_fermo' : 'stop') + (sx ? '_sx' : ''), i = GESTI[nome]; if (!i) return;
  const anticipo = i.tocco / ritmoGesto(i, vr);
  if (fra <= anticipo && fra > anticipo - .06) gesto(p, nome, fra);
}
const b64 = (t) => Uint8Array.from(atob(t), (c) => c.charCodeAt(0)).buffer;
const pixel = (im) => { const [c, x] = cv(im.naturalWidth || im.width, im.naturalHeight || im.height); x.drawImage(im, 0, 0); return x.getImageData(0, 0, c.width, c.height); };
/**
 * Il calciatore (Quaternius, CC0): corpo con la divisa come texture, occhi, sopracciglia, capelli agganciati alla testa.
 * Le animazioni stanno in public/anim.js, già adattate al suo scheletro da scripts/animazioni.mjs.
 */
async function loadModel() {
  try {
    const L = new GLTFLoader();
    const [g, h, im, ip, io] = await Promise.all([L.parseAsync(b64(window.MODEL_B64), ''), L.parseAsync(b64(window.HAIR_B64), ''), loadImg('img/divisa-maschera.png'), loadImg('img/pelle.webp'), loadImg('img/occhi.webp')]);
    if (!im || !ip) throw new Error('mancano le texture della divisa');
    const scene = g.scene; scene.updateMatrixWorld(true);
    let head = null, spine = null, body = null;
    scene.traverse((o) => { if (o.isBone && o.name === 'Head') head = o; if (o.isBone && o.name === 'spine_03') spine = o; if (o.isSkinnedMesh && o.material.name === CORPO) body = o; });
    if (!head || !spine || !body) throw new Error('modello non riconosciuto');
    const originale = body.geometry.clone();
    snellisci(body); // proporzioni da calciatore, non da supereroe: prima del resto, così numero e stemma si appoggiano al corpo nuovo
    const corporature = CORPORATURE.map((f) => (f === 1 ? body.geometry : (() => { const g2 = originale.clone(); snellisci(body, f, g2); return g2; })()));
    // k porta il modello a un metro di altezza: ogni giocatore lo moltiplica per la sua statura
    const box = new T.Box3().setFromObject(scene), k = 1 / (box.max.y - box.min.y);
    // capelli: portati nello spazio dell'osso della testa, così basta appenderli
    const hair = {}, hInv = new T.Matrix4().copy(head.matrixWorld).invert(); h.scene.updateMatrixWorld(true);
    h.scene.traverse((o) => { if (o.isMesh) { const geo = o.geometry.clone(); geo.applyMatrix4(o.matrixWorld).applyMatrix4(hInv); geo.computeVertexNormals(); hair[o.name] = geo; } });
    // dove stanno numero (schiena) e stemma (petto): un raggio contro il corpo nella posa a riposo, poi tutto riferito all'osso del torace
    const fermo = new T.Mesh(body.geometry, new T.MeshBasicMaterial({ side: T.DoubleSide })); fermo.matrixWorld.copy(body.matrixWorld);
    const sInv = new T.Matrix4().copy(spine.matrixWorld).invert(), rc = new T.Raycaster();
    // stacco: quanto sta sopra la stoffa (maglia e pantaloncini sono gonfiati un po' dallo shader del calciatore)
    const appoggio = (x, y, davanti, lato, inv = sInv, stacco = davanti ? .02 : .03) => {
      rc.set(new T.Vector3(x, y, davanti ? 2 : -2), new T.Vector3(0, 0, davanti ? -1 : 1)); const hit = rc.intersectObject(fermo, false)[0]; if (!hit) return null;
      const m = new T.Matrix4().compose(new T.Vector3(x, y, hit.point.z + (davanti ? stacco : -stacco)), new T.Quaternion().setFromEuler(new T.Euler(0, davanti ? 0 : Math.PI, 0)), new T.Vector3(lato, lato, lato));
      return m.premultiply(inv);
    };
    let coscia = null; scene.traverse((o) => { if (o.isBone && o.name === 'thigh_l') coscia = o; });
    const alto = box.max.y - box.min.y;
    MODEL = { scene, k, hair, clips: {}, fx: {}, maschera: pixel(im), pelle: pixel(ip), divise: new Map(),
      numM: appoggio(0, box.min.y + alto * .745, false, .27 / .3), stemmaM: appoggio(.075, box.min.y + alto * .775, true, .085),
      // il numerino sulla gamba sinistra dei pantaloncini, appeso alla coscia
      cortiM: coscia ? appoggio(.095, box.min.y + alto * .405, true, .1 / .3, new T.Matrix4().copy(coscia.matrixWorld).invert(), .03) : null,
      zone: (() => { const z = creaZone(pixel(im)), t = new T.DataTexture(z.data, z.size, z.size); t.flipY = false; t.magFilter = t.minFilter = T.LinearFilter; t.needsUpdate = true; return t; })(),
      stili: stiliCapelli(hair, scene, hInv), corpi: [], corporature,
      // rilievo della stoffa (normal map) e lucidità per zona (roughness), dalla stessa maschera
      ...(() => { const r = creaRilievo(pixel(im)), dt = (d) => { const t = new T.DataTexture(d, r.size, r.size); t.flipY = false; t.magFilter = T.LinearFilter; t.minFilter = T.LinearMipmapLinearFilter; t.generateMipmaps = true; t.anisotropy = 4; t.needsUpdate = true; return t; }; return { rilievo: dt(r.normali), ruvido: dt(r.ruvido) }; })(),
      sponsorM: appoggio(0, box.min.y + alto * .72, true, .048),
      occhi: io ? new T.MeshLambertMaterial({ map: Object.assign(new T.Texture(io), { flipY: false, colorSpace: T.SRGBColorSpace, needsUpdate: true }) }) : mat(0xffffff) };
    const A = window.ANIMS; if (!A) throw new Error('mancano le animazioni');
    const GFc = window.ANIMS_GF && window.ANIMS_GF.ossa.join() === A.ossa.join() ? window.ANIMS_GF.clip : {}; // stesse ossa, stesso ordine
    for (const [nome, c] of Object.entries({ ...A.clip, ...GFc })) {
      const B = A.ossa.length, times = new Float32Array(c.n), pos = new Float32Array(c.n * 3);
      for (let i = 0; i < c.n; i++) { times[i] = i / A.fps; for (let j = 0; j < 3; j++) pos[i * 3 + j] = c.p[i * 3 + j] / 10000; }
      const tracks = [new T.VectorKeyframeTrack(`${A.bacino}.position`, times, pos)];
      A.ossa.forEach((b, n) => { const v = new Float32Array(c.n * 4); for (let i = 0; i < c.n; i++) for (let j = 0; j < 4; j++) v[i * 4 + j] = c.q[(i * B + n) * 4 + j] / 10000; tracks.push(new T.QuaternionKeyframeTrack(`${b}.quaternion`, times, v)); });
      MODEL.fx[nome] = new T.AnimationClip(nome, (c.n - 1) / A.fps, tracks);
    }
    if (!MODEL.fx.idle || !MODEL.fx.walk || !MODEL.fx.run) throw new Error('mancano le animazioni di base');
    // il portiere col pallone in mano: dalla clip di GameplayFootball solo braccia e spalle (pallone stretto al petto), le
    // gambe restano quelle della corsa (le clip intere col pallone sono un passo solo e non si possono ripetere)
    if (MODEL.fx.tiene_palla) MODEL.braccia = new T.AnimationClip('braccia', MODEL.fx.tiene_palla.duration, MODEL.fx.tiene_palla.tracks.filter((k) => /^(clavicle|upperarm|lowerarm|hand)_/.test(k.name)));
    if (MODEL.fx.scivolata) DOWN.pl = .81; if (MODEL.fx.tuffoS) DOWN.gk = 1.1; if (MODEL.fx.caduta) DOWN.fall = 1.35;
    if (MODEL.fx.scivola && MODEL.fx.rialza_schiena) DOWN.pl = .85; if (MODEL.fx.cade && MODEL.fx.rialza) DOWN.fall = 1.6; // scivolata e caduta di GameplayFootball, poi ci si rialza (0,72-0,76 s)
    if (MODEL.fx.rialza) DOWN.gk = .65; // dopo il tuffo c'è l'animazione per rialzarsi (0,76 s): a terra si resta meno, il tempo totale è quello di prima
  } catch (e) { console.warn('modello 3D non caricato', e); MODEL = null; }
}
const CORPO = 'MI_Superhero_Male', OCCHI = 'MI_Eyes';
/** Le azioni a terra: le clip registrate portano il corpo sotto il livello dell'erba (fino a 20 cm), poseSkinned lo rialza. */
const A_TERRA = new Set(['scivolata', 'caduta', 'tuffoS', 'tuffoD']);
const _v = new T.Vector3();
/** Il punto più basso del corpo di un giocatore nella posa attuale (un vertice ogni 6: basta e costa poco). */
function puntoBasso(f) {
  if (!f.corpo) f.root.traverse((o) => { if (o.isSkinnedMesh && o.geometry.attributes.position.count > 1000) f.corpo = o; });
  const c = f.corpo; if (!c) return 0; const P = c.geometry.attributes.position; let basso = 9;
  for (let j = 0; j < P.count; j += 6) { c.getVertexPosition(j, _v); _v.applyMatrix4(c.matrixWorld); if (_v.y < basso) basso = _v.y; }
  return basso;
}
/**
 * Il modello originale è un supereroe: braccia, cosce e torace enormi. Una volta sola, sulla geometria a riposo, si avvicina
 * ogni vertice all'osso che lo muove (braccia, avambracci, cosce, polpacci, clavicole, torace, collo): restano le stesse
 * animazioni, con un fisico da calciatore.
 */
// Tre corporature (snella, normale, robusta): quanto il corpo si stringe verso le ossa rispetto alla snellitura normale (1)
const CORPORATURE = [1.4, 1, .5];
function snellisci(body, forza = 1, g = body.geometry) {
  const sk = body.skeleton, idx = {}; sk.bones.forEach((b, i) => { idx[b.name] = i; });
  const dove = (n) => new T.Vector3().setFromMatrixPosition(new T.Matrix4().copy(sk.boneInverses[idx[n]]).invert()).applyMatrix4(body.bindMatrixInverse);
  const SEG = [['upperarm', 'lowerarm', .84], ['lowerarm', 'hand', .9], ['thigh', 'calf', .92], ['calf', 'foot', .94], ['clavicle', 'upperarm', .9]], seg = {};
  for (const [a, b, f] of SEG) for (const l of ['_l', '_r']) if (idx[a + l] !== undefined && idx[b + l] !== undefined) seg[idx[a + l]] = [dove(a + l), dove(b + l), f];
  for (const [a, b, f] of [['spine_03', 'neck_01', .93], ['spine_02', 'spine_03', .96], ['neck_01', 'head', .9]]) if (idx[a] !== undefined && idx[b] !== undefined) seg[idx[a]] = [dove(a), dove(b), f];
  const COMP = ['getX', 'getY', 'getZ', 'getW'], P = g.attributes.position, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight, v = new T.Vector3(), d = new T.Vector3(), q = new T.Vector3(), ab = new T.Vector3();
  for (let i = 0; i < P.count; i++) {
    v.fromBufferAttribute(P, i); d.set(0, 0, 0);
    for (let k = 0; k < 4; k++) {
      const w = SW[COMP[k]](i), s = seg[SI[COMP[k]](i)]; if (!w || !s) continue;
      ab.subVectors(s[1], s[0]); const t = clamp(q.subVectors(v, s[0]).dot(ab) / ab.lengthSq(), 0, 1);
      q.copy(s[0]).addScaledVector(ab, t); d.addScaledVector(q.subVectors(v, q), w * (s[2] - 1) * forza); // verso l'asse dell'osso
    }
    P.setXYZ(i, v.x + d.x, v.y + d.y, v.z + d.z);
  }
  P.needsUpdate = true; g.computeBoundingBox(); g.computeBoundingSphere();
}
/**
 * Le acconciature: le tre del modello (rasati, riga, barba) più alcune costruite qui nello spazio dell'osso della testa:
 * ricci, cresta, codino, capelli folti. Servono il centro della testa, l'alto e il davanti (dagli occhi).
 */
function stiliCapelli(hair, scene, hInv) {
  const S = {}; for (const k in hair) S[k] = [hair[k]];
  const base = hair.Hair_Buzzed, riga = hair.Hair_SimpleParted; if (!base) return S;
  base.computeBoundingBox(); const C = base.boundingBox.getCenter(new T.Vector3()), dim = base.boundingBox.getSize(new T.Vector3()), r = Math.max(dim.x, dim.y, dim.z) / 2;
  let E = null; scene.traverse((o) => { if (o.isMesh && o.material && o.material.name === OCCHI) { const g = o.geometry.clone(); g.applyMatrix4(o.matrixWorld).applyMatrix4(hInv); g.computeBoundingBox(); E = g.boundingBox.getCenter(new T.Vector3()); } });
  if (!E) return S;
  const davanti = E.clone().sub(C).normalize(), su = C.clone().addScaledVector(davanti, -C.dot(davanti)).normalize(), lato = new T.Vector3().crossVectors(su, davanti).normalize();
  const orienta = (g, pos) => { g.applyMatrix4(new T.Matrix4().makeBasis(lato, su, davanti)); g.translate(pos.x, pos.y, pos.z); return g; };
  const gonfia = (geo, k, mosso) => { const g = geo.clone(), P = g.attributes.position, v = new T.Vector3();
    for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).sub(C); const j = mosso ? 1 + mosso * Math.sin(v.x * 97 + v.y * 61) * Math.sin(v.z * 83 + v.y * 47) : 1; v.multiplyScalar(k * j).add(C); P.setXYZ(i, v.x, v.y, v.z); }
    g.computeVertexNormals(); return g; };
  S.ricci = [gonfia(base, 1.13, .05)];
  S.folti = riga ? [gonfia(riga, 1.06, 0)] : [gonfia(base, 1.06, 0)];
  S.cresta = [gonfia(base, .99, 0), orienta(new T.BoxGeometry(r * .32, r * .5, r * 1.7), C.clone().addScaledVector(su, r * .78))];
  S.codino = [riga || base, orienta(new T.SphereGeometry(r * .3, 10, 8), C.clone().addScaledVector(su, r * .55).addScaledVector(davanti, -r * .85))];
  return S;
}
const ACCONCIATURE = [null, 'Hair_Buzzed', 'Hair_SimpleParted', 'Hair_Buzzed', 'Hair_SimpleParted', 'ricci', 'cresta', 'codino', 'folti', 'ricci', 'folti'];
// scarpini: tomaia e suola
const SCARPINI = [['#16161a', '#F3F3F3'], ['#F3F3F3', '#16161a'], ['#D9F51F', '#16161a'], ['#FF5A1F', '#F3F3F3'], ['#1E6FB5', '#F3F3F3'], ['#E91E8C', '#16161a'], ['#16161a', '#D9F51F'], ['#C9CDD6', '#E8542A']];
/** La texture di una divisa: si disegna una volta per partita e la usano tutti quelli con la stessa maglia. */
function divisaTex(kit) {
  const key = [kit.shirt, kit.shorts, kit.socks, kit.c2, kit.stile, kit.gloves, kit.banda, kit.colletto, kit.raglan].join('|'); let t = MODEL.divise.get(key);
  if (!t) { t = new T.CanvasTexture(creaDivisa(MODEL.maschera, MODEL.pelle, kit)); t.flipY = false; t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; MODEL.divise.set(key, t); }
  return t;
}
/**
 * Il materiale del corpo di un giocatore: la texture della divisa (condivisa) più quello che è solo suo, calcolato nello
 * shader dalla mappa delle zone: tono di pelle, colore degli scarpini e della suola, fascia da capitano, sporco di fango
 * ed erba su pantaloncini e calzettoni. I pantaloncini (e un po' maglia e calzettoni) sono gonfiati lungo la normale:
 * stoffa che cade, non una tuta attillata. Lo shader è uno solo per tutti i giocatori.
 */
function corpoMat(kit, u) {
  // materiale fisico: la stoffa ha il suo rilievo (cuciture, costine, pieghe) e resta opaca, pelle e scarpini un po' lucidi
  const m = new T.MeshStandardMaterial({ map: divisaTex(kit), normalMap: rilievoOn ? MODEL.rilievo : null, normalScale: new T.Vector2(.9, -.9), roughnessMap: rilievoOn ? MODEL.ruvido : null, roughness: rilievoOn ? 1 : .8, metalness: 0 });
  m.customProgramCacheKey = () => 'calciatore';
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u, { uZone: { value: MODEL.zone } });
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform sampler2D uZone; uniform float uCap;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
{ vec4 zv = texture2D(uZone, vMapUv); transformed += objectNormal * (zv.b * zv.b * 0.017 + clamp(zv.a * 2.55, 0.0, 1.0) * 0.007 + smoothstep(0.6, 0.95, zv.a) * uCap * 0.006); } // la fascia del capitano sporge un po'`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform sampler2D uZone; uniform vec3 uTono, uScarpe, uSuola, uFascia; uniform float uCap, uGuanti; uniform vec2 uSporco;
float rumoreC(vec2 p) { return fract(sin(dot(floor(p), vec2(12.9898, 78.233))) * 43758.5453); }
float macchieC(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(rumoreC(i), rumoreC(i + vec2(1, 0)), f.x), mix(rumoreC(i + vec2(0, 1)), rumoreC(i + vec2(1, 1)), f.x), f.y); }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
{
  vec4 zz = texture2D(uZone, vMapUv);
  // pelle: il tono del giocatore (il portiere ha avambracci e mani coperti)
  float pel = uGuanti > 0.5 ? clamp(zz.r * 2.0 - 1.0, 0.0, 1.0) : clamp(zz.r * 2.0, 0.0, 1.0);
  diffuseColor.rgb *= mix(vec3(1.0), uTono, pel);
  // scarpini: il grigio della texture porta i dettagli, il colore è del giocatore; la suola di un altro colore
  float sc = clamp(zz.g * 2.0, 0.0, 1.0), suola = 1.0 - clamp(zz.g * 2.0 - 1.0, 0.0, 1.0);
  diffuseColor.rgb = mix(diffuseColor.rgb, mix(uScarpe, uSuola, suola) * clamp(diffuseColor.g / 0.55, 0.7, 1.25), sc);
  // fascia da capitano sul braccio sinistro
  diffuseColor.rgb = mix(diffuseColor.rgb, uFascia, smoothstep(0.6, 0.95, zz.a) * uCap);
  // sporco: fango ed erba a chiazze, solo su pantaloncini e calzettoni, cresce con scivolate, cadute e tuffi
  // due campi di macchie diversi per fango ed erba; al massimo ne coprono meno di metà, mai tutta la stoffa
  float stoffa = smoothstep(0.3, 0.55, zz.b), n = macchieC(vMapUv * 36.0) * 0.65 + macchieC(vMapUv * 95.0) * 0.35, n2 = macchieC(vMapUv * 31.0 + 17.3) * 0.7 + macchieC(vMapUv * 88.0 + 5.1) * 0.3;
  float sf = 1.0 - uSporco.x * 0.42, se = 1.0 - uSporco.y * 0.4;
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.2, 0.13, 0.07), smoothstep(sf, sf + 0.07, n) * stoffa * 0.85);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.1, 0.2, 0.04), smoothstep(se, se + 0.07, n2) * stoffa * 0.7);
}`);
  };
  MODEL.corpi.push(m); return m;
}
/**
 * Il rilievo della stoffa si vede solo da vicino: con la telecamera di gioco i giocatori sono piccoli e la normal map costa
 * senza dare niente. Si accende quando un giocatore è a meno di 16 metri dalla telecamera (primi piani, replay, esultanze)
 * e se la qualità è al massimo; i programmi dei due casi restano in memoria, il cambio è immediato.
 */
let rilievoOn = true;
function rilievoDivise() {
  if (!MODEL || !MODEL.corpi.length) return; let vicino = false;
  if (QUAL.livello < 1) for (const t of G.teams) for (const p of t.players) if (cam.position.distanceToSquared(p.fig.root.position) < 256) { vicino = true; break; }
  if (vicino === rilievoOn) return; rilievoOn = vicino;
  for (const m of MODEL.corpi) { m.normalMap = vicino ? MODEL.rilievo : null; m.roughnessMap = vicino ? MODEL.ruvido : null; m.roughness = vicino ? 1 : .8; m.needsUpdate = true; }
}
const stemmi3d = new Map();
function stemmaMat(id) {
  let m = stemmi3d.get(id); if (m || !CREST[id]) return m || null;
  const tx = new T.Texture(CREST[id]); tx.colorSpace = T.SRGBColorSpace; tx.anisotropy = 8; tx.needsUpdate = true;
  // ricamato: rilievo dai contorni del disegno e un filo un po' metallico che prende la luce
  m = new T.MeshStandardMaterial({ map: tx, bumpMap: tx, bumpScale: 1.2, transparent: true, alphaTest: .4, roughness: .45, metalness: .3 }); m.userData.ratio = CREST[id].width / CREST[id].height; stemmi3d.set(id, m); return m;
}
const GEO1 = new T.PlaneGeometry(1, 1);
/** Lo sponsor sul petto: la scritta Fantatitano stampata lucida, nel colore dei numeri. Una per colore. */
const sponsor = new Map();
function sponsorMat(ink) {
  let m = sponsor.get(ink); if (m) return m;
  const [c, x] = cv(512, 128); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = ink; x.font = '96px Anton'; const w = x.measureText('FANTATITANO').width; if (w > 496) x.font = `${Math.floor(96 * 496 / w)}px Anton`; x.fillText('FANTATITANO', 256, 66);
  const tx = ctex(c); tx.anisotropy = 4; m = new T.MeshStandardMaterial({ map: tx, transparent: true, alphaTest: .35, roughness: .3, metalness: 0 }); sponsor.set(ink, m); return m;
}
const lineare = (c) => Math.pow(c, 2.2);
/**
 * Un calciatore col modello vero. Dal seme (nome e club) vengono, sempre uguali: tono di pelle, capelli e loro colore,
 * barba, scarpini, altezza. opz.capitano mette la fascia.
 */
/** La statura di un giocatore, sempre la stessa per lo stesso seme: tra ALTEZZA.min e max con la media giusta, i portieri più alti. */
function statura(seed, portiere) {
  const A = ALTEZZA, u = ((seed >>> 16) % 11) / 10, esp = (A.max - A.min) / (A.media - A.min) - 1;
  return portiere ? A.portiere + (A.max - A.portiere) * u : A.min + (A.max - A.min) * Math.pow(u, esp);
}
function makeSkinned(kit, seed, num, clubId, nome, opz = {}) {
  const root = new T.Group(), body = new T.Group(); root.add(body);
  // statura vera, diversa per ogni giocatore (ALTEZZA in config): alt è il rapporto con la media, il passo si allunga con l'altezza
  const metri = statura(seed, !!kit.gloves), alt = metri / ALTEZZA.media, obj = SkeletonUtils.clone(MODEL.scene); obj.scale.multiplyScalar(MODEL.k * metri); body.add(obj);
  const tono = seed % TONI.length, scuri = tono >= 4, varia = .97 + ((seed >>> 20) % 7) * .01;
  const pelo = mat(scuri ? [0x1c1410, 0x111111, 0x2e2018, 0x1c1410][(seed >>> 4) % 4] : HAIR[(seed >>> 4) % HAIR.length]);
  const sc = kit.boots ? [kit.boots, kit.suola || '#16161a'] : SCARPINI[(seed >>> 24) % SCARPINI.length];
  const fascia = cdist(kit.shirt, '#D9F51F') > .3 ? '#D9F51F' : '#16161a';
  const u = { uTono: { value: new T.Vector3(...TONI[tono].map((c) => lineare(c * varia))) }, uScarpe: { value: new T.Color(sc[0]) }, uSuola: { value: new T.Color(sc[1]) },
    uFascia: { value: new T.Color(fascia) }, uCap: { value: opz.capitano ? 1 : 0 }, uGuanti: { value: kit.gloves ? 1 : 0 }, uSporco: { value: new T.Vector2() } };
  const corpo = corpoMat(kit, u), bones = {}, vicini = []; // vicini: i dettagli che si vedono solo da vicino (vedi dettagliFigure)
  obj.traverse((o) => {
    if (o.isBone) bones[o.name] = o;
    if (o.isSkinnedMesh && o.material.name === CORPO && MODEL.corporature) o.geometry = MODEL.corporature[(seed >>> 27) % MODEL.corporature.length]; // corporatura dal seme
    if (o.isSkinnedMesh) { o.frustumCulled = false; o.material = o.material.name === CORPO ? corpo : o.material.name === OCCHI ? MODEL.occhi : pelo; if (o.material !== corpo) { o.castShadow = false; vicini.push(o); } } // occhi e sopracciglia
  });
  const stile = ACCONCIATURE[(seed >>> 8) % ACCONCIATURE.length];
  if (stile && MODEL.stili[stile]) for (const g of MODEL.stili[stile]) bones.Head.add(new T.Mesh(g, pelo));
  if ((seed >>> 12) % 4 === 0 && MODEL.hair.Hair_Beard) bones.Head.add(new T.Mesh(MODEL.hair.Hair_Beard, pelo));
  const bordo = kit.ink === '#fff' ? 'rgba(0,0,0,.45)' : 'rgba(255,255,255,.55)';
  if (MODEL.numM && num !== '') { const n = new T.Mesh(GEO.num, numMat(num, kit.ink, nome, bordo)); n.applyMatrix4(MODEL.numM); bones.spine_03.add(n); }
  if (MODEL.cortiM && num !== '' && bones.thigh_l) { const n = new T.Mesh(GEO.num, numMat(num, kit.ink, null, bordo)); n.applyMatrix4(MODEL.cortiM); bones.thigh_l.add(n); vicini.push(n); }
  if (MODEL.sponsorM && clubId) { const c = new T.Mesh(GEO1, sponsorMat(kit.ink)); c.scale.set(4, 1, 1); c.applyMatrix4(MODEL.sponsorM); bones.spine_03.add(c); vicini.push(c); }
  const sm = clubId && MODEL.stemmaM ? stemmaMat(clubId) : null;
  if (sm) { const c = new T.Mesh(GEO1, sm); c.scale.set(sm.userData.ratio, 1, 1); c.applyMatrix4(MODEL.stemmaM); bones.spine_03.add(c); vicini.push(c); }
  const sh = new T.Mesh(GEO.shadow, shadowMat); sh.rotation.x = -Math.PI / 2; sh.position.y = .03; sh.scale.setScalar(1); root.add(sh);
  const mixer = new T.AnimationMixer(obj), A = {}, w = {};
  const base = { idle: MODEL.fx.idle, walk: MODEL.fx.walk, run: MODEL.fx.run, jog: MODEL.fx.jog, esulta: MODEL.fx.esulta, aereo: kit.gloves ? null : MODEL.fx.aereo, gkIdle: kit.gloves ? MODEL.fx.gkIdle : null, passoS: MODEL.fx.passoS, passoD: MODEL.fx.passoD }; // i passi laterali servono anche a chi difende guardando la palla
  for (const n in base) if (base[n]) { const a = mixer.clipAction(base[n]); a.play(); a.time = rnd(base[n].duration); a.setEffectiveWeight(n === 'idle' ? 1 : 0); A[n] = a; w[n] = n === 'idle' ? 1 : 0; }
  if (kit.gloves && MODEL.braccia) { const a = mixer.clipAction(MODEL.braccia); a.play(); a.setEffectiveWeight(0); A.braccia = a; w.braccia = 0; }
  const fig = { root, body, mixer, A, bones, w, act: null, old: null, fxW: 0, oldW: 0, skinned: true, sporco: u.uSporco.value, alt, metri, vicini, ombra: sh, dettagli: true };
  FIGURE.add(fig); return fig;
}
/* Meno chiamate di disegno per ogni persona in campo. Le ombre di contatto sotto i piedi di tutti sono un'unica InstancedMesh
   (una chiamata invece di una a testa), e i dettagli piccoli (occhi, sopracciglia, numero sui pantaloncini, sponsor e
   stemma) si disegnano solo quando la telecamera è a meno di ~15 m: dall'inquadratura di gioco sono pochi pixel. */
const FIGURE = new Set(), DETT = { vicino: 14 * 14, lontano: 16 * 16 }, OMBRE = { max: 64 };
const ombreTutte = new T.InstancedMesh(GEO.shadow, shadowMat, OMBRE.max); ombreTutte.frustumCulled = false; ombreTutte.count = 0; scene.add(ombreTutte);
const _m4 = new T.Matrix4(), _q = new T.Quaternion().setFromAxisAngle(new T.Vector3(1, 0, 0), -Math.PI / 2), _s = new T.Vector3(1.5, 1.5, 1.5), _p = new T.Vector3();
const _qL = new T.Quaternion(), _sL = new T.Vector3(1.4, 3.2, 1.5), _asseY = new T.Vector3(0, 1, 0);
function dettagliFigure() {
  let n = 0; const lunghe = !sun.castShadow, sl = Math.hypot(SOLE.x, SOLE.z) || 1;
  // l'ombra lunga verso la parte opposta al sole: il piano steso (asse lungo verso -z) girato attorno alla verticale
  if (lunghe) { const dx = -SOLE.x / sl, dz = -SOLE.z / sl; _qL.setFromAxisAngle(_asseY, Math.atan2(-dx, -dz)).multiply(_q); }
  if (FIGURE.size > 120) for (const f of FIGURE) if (!f.root.parent) FIGURE.delete(f); // giocatori di partite finite
  for (const f of FIGURE) {
    if (!f.root.parent) continue;
    const r = f.root, d2 = cam.position.distanceToSquared(r.position), su = f.dettagli ? d2 < DETT.lontano : d2 < DETT.vicino;
    if (su !== f.dettagli) { f.dettagli = su; for (const o of f.vicini) o.visible = su; }
    if (n < OMBRE.max && r.parent === scene) { f.ombra.visible = false; if (r.visible) {
      // senza le ombre del sole (qualità bassa) l'ombra di contatto si allunga dalla parte opposta al sole: mai nessuno senza ombra
      if (lunghe) { const k = .55 * (f.metri || 1.8); _p.set(r.position.x - SOLE.x / sl * k, .03, r.position.z - SOLE.z / sl * k); _m4.compose(_p, _qL, _sL); }
      else { _p.set(r.position.x, .03, r.position.z); _m4.compose(_p, _q, _s); }
      ombreTutte.setMatrixAt(n++, _m4); } }
    else f.ombra.visible = true; // dentro un altro gruppo o oltre il massimo: tiene la sua
  }
  ombreTutte.count = n; ombreTutte.instanceMatrix.needsUpdate = true;
}
/** Fango ed erba dopo una scivolata, una caduta o un tuffo: restano fino alla fine della partita. */
const SPORCA = { scivolata: [.22, .3], caduta: [.16, .14], tuffoS: [.2, .26], tuffoD: [.2, .26] };
function sporca(p, nome) { const s = SPORCA[nome], v = p.fig && p.fig.sporco; if (!s || !v) return; v.x = Math.min(1, v.x + s[0]); v.y = Math.min(1, v.y + s[1]); }

/* --- colori delle divise: distanza percepita (CIELAB, ΔE/100), non quella tra i numeri RGB: due blu diversi restano vicini --- */
const lab = (h) => {
  const c = new T.Color(h), f = (t) => (t > .008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const X = f((.4124 * c.r + .3576 * c.g + .1805 * c.b) / .95047), Y = f(.2126 * c.r + .7152 * c.g + .0722 * c.b), Z = f((.0193 * c.r + .1192 * c.g + .9505 * c.b) / 1.08883);
  return [116 * Y - 16, 500 * (X - Y), 200 * (Y - Z)];
};
const lum = (h) => { const c = new T.Color(h); return .299 * c.r + .587 * c.g + .114 * c.b; };
const cdist = (a, b) => { const x = lab(a), y = lab(b); return hyp(x[0] - y[0], x[1] - y[1], x[2] - y[2]) / 100; };
// quanto pesa il secondo colore di un disegno visto da lontano
const PESO_DISEGNO = { righe: .5, righine: .15, fasce: .5, meta: .5, banda: .12, scacchi: .5, spalle: .2, fianchi: .25, v: .08, sfumata: .35, chevron: .12, diagonale: .5, quarti: .5, terzi: .3, maniche: .25, petto: .12, onde: .5, mimetica: .35, pennellata: .15 };
const misto = (k) => '#' + new T.Color(k.shirt).lerp(new T.Color(k.c2 || k.shirt), PESO_DISEGNO[k.stile] || 0).getHexString();
/** Quanto si distinguono due divise in campo: soprattutto la maglia (com'è vista da lontano), poi pantaloncini e calzettoni. */
const kitDist = (p, q) => Math.min(cdist(misto(p), misto(q)), cdist(p.shirt, q.shirt) + .1) * .65 + cdist(p.shorts, q.shorts) * .2 + cdist(p.socks, q.socks) * .15;
const hashStr = (s) => { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
/**
 * Le divise della partita: [casa, ospiti, portiere di casa, portiere ospite, arbitro]. Gli ospiti provano la prima maglia,
 * poi la seconda (secondo colore), poi bianca, scura e alcune terze maglie: tengono la prima che si distingue bene da
 * quella di casa (o la più lontana). Poi l'arbitro, lontano da tutte e due, e i portieri, lontani da tutti.
 */
/** Colletto e maniche di un club: quelli scelti, altrimenti sempre gli stessi per club (dal nome). */
function formaMaglia(c) { return { colletto: c.col || ['giro', 'v', 'polo', 'giro', 'v'][hashStr(c.id || c.name) % 5], raglan: c.rag ?? hashStr((c.id || c.name) + 'r') % 4 === 0 }; }
function pickKits(h, a) {
  const BIANCO = '#F3F3F3', NERO = '#16161a', SOGLIA = .42;
  const ink = (c) => (lum(c) > .5 ? '#111' : '#fff');
  const forma = formaMaglia;
  const prima = (c) => { const due = cdist(c.c1, c.c2) < .2 ? (lum(c.c1) > .5 ? NERO : '#FFFFFF') : c.c2; return { shirt: c.c1, shorts: due, socks: c.c1, sleeve: c.c1, ink: ink(c.c1), c2: due, stile: c.st || null, ...forma(c) }; };
  const kh0 = prima(h), da = prima(a), sa = ['fianchi', 'v', 'spalle', 'chevron', 'maniche', 'petto', 'pennellata', null][hashStr(a.id || a.name) % 8]; // disegno della seconda maglia, sempre lo stesso per club
  const seconde = [da, { ...da, shirt: da.c2, sleeve: da.c2, socks: da.c2, shorts: a.c1, c2: a.c1, stile: sa, colletto: da.colletto === 'polo' ? 'v' : 'polo' }];
  for (const [col, c2] of [[BIANCO, a.c1], [NERO, a.c1], ['#8A1538', BIANCO], ['#F2C230', NERO], ['#0E7C66', BIANCO], ['#1D2A5C', BIANCO]]) seconde.push({ shirt: col, sleeve: col, socks: col, shorts: cdist(c2, col) > .3 ? c2 : col, c2: cdist(c2, col) > .3 ? c2 : (lum(col) > .5 ? NERO : BIANCO), stile: col === BIANCO || col === NERO ? sa : null });
  for (const k of seconde) k.ink = ink(k.shirt);
  // ogni prova con i pantaloncini già sistemati (quelli dell'una non devono sembrare la maglia dell'altra), poi la distanza
  const prova = (k) => { const a2 = { ...k }, h2 = { ...kh0 }; if (cdist(a2.shorts, h2.shirt) < .25) a2.shorts = a2.shirt; if (cdist(h2.shorts, a2.shirt) < .25) h2.shorts = h2.shirt; return [h2, a2, kitDist(h2, a2)]; };
  const prove = seconde.map(prova), [kh, ka] = prove.find((x) => x[2] >= SOGLIA) || prove.sort((x, y) => y[2] - x[2])[0];
  // l'arbitro: maglia lontana dalle due squadre, pantaloncini e calzettoni neri
  const vicino = (c, ks) => Math.min(...ks.map((k) => Math.min(cdist(c, k.shirt), cdist(c, misto(k)))));
  // arbitro in rosso e nero (come in Dream League). Se una squadra veste di rosso, maglia nera con le maniche rosse
  const ROSSO = '#D7262E', rossa = [kh, ka].some((k) => cdist(k.shirt, ROSSO) < .3), arbC = rossa ? NERO : ROSSO, arbM = rossa ? ROSSO : NERO;
  const arb = { shirt: arbC, shorts: NERO, socks: NERO, sleeve: arbM, boots: NERO, suola: NERO, ink: rossa ? '#fff' : '#111', c2: arbM, stile: null, banda: arbM, colletto: 'polo' };
  // i portieri: colori accesi lontani da tutte le maglie in campo, compreso l'altro portiere; maniche lunghe e guanti
  const gk = (altri) => {
    const c = ['#FF7A1A', '#19D3B1', '#E91E8C', '#111111', '#F2E21B', '#7B2FF7', '#3FD45A', '#F3F3F3'].sort((p, q) => vicino(q, altri) - vicino(p, altri))[0], scura = '#' + new T.Color(c).multiplyScalar(.55).getHexString();
    return { shirt: c, shorts: c, socks: c, sleeve: c, ink: ink(c), gloves: lum(c) > .6 ? '#16161a' : '#F3F3F3', c2: scura, stile: 'fianchi' };
  };
  const g1 = gk([kh, ka, arb]), g2 = gk([kh, ka, arb, g1]);
  return [kh, ka, g1, g2, arb];
}

const ring = new T.Mesh(GEO.ring, new T.MeshBasicMaterial({ color: 0xD9F51F, transparent: true, opacity: .95, depthWrite: false }));
ring.rotation.x = -Math.PI / 2; ring.position.y = .05; ring.visible = false; ring.material.visible = false; scene.add(ring); // l'anello non si disegna: ai piedi c'è la freccia, sopra la testa il segnaposto
// la freccia sull'erba davanti al giocatore comandato: punta dove porta la levetta (sparisce a levetta ferma)
const freccia = (() => {
  const sh = new T.Shape(); sh.moveTo(0, .6); sh.lineTo(.46, -.45); sh.lineTo(0, -.2); sh.lineTo(-.46, -.45); sh.closePath(); // a punta, con la tacca dietro
  const g = new T.ShapeGeometry(sh); g.rotateX(-Math.PI / 2); g.rotateY(Math.PI); // in piano sull'erba, la punta verso +z
  const m = new T.Mesh(g, new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .8, depthWrite: false })); m.visible = false; m.renderOrder = 2; scene.add(m); return m;
})();
const arrow = new T.Mesh(GEO.tri, new T.MeshBasicMaterial({ color: 0xD9F51F })); arrow.rotation.x = Math.PI; arrow.visible = false; scene.add(arrow);
const ballMesh = (() => {
  const [c, x] = cv(256, 128); x.fillStyle = '#fafafa'; x.fillRect(0, 0, 256, 128);
  const cols = ['#111', '#111', '#4B06FC', '#111', '#D9F51F', '#111'];
  for (let i = 0; i < 12; i++) { x.fillStyle = cols[i % cols.length]; x.beginPath(); const px = (i % 6) * 43 + 20 + (i > 5 ? 21 : 0), py = i > 5 ? 88 : 38; for (let k = 0; k < 5; k++) { const a = k * 1.2566 - 1.57; x.lineTo(px + Math.cos(a) * 13, py + Math.sin(a) * 15); } x.fill(); }
  const m = new T.Mesh(new T.SphereGeometry(BR, 18, 14), new T.MeshLambertMaterial({ map: ctex(c) })); m.visible = false; m.castShadow = true; scene.add(m);
  return m;
})();
// ombra del pallone, con un materiale suo: cambia con l'altezza
const ballShadow = new T.Mesh(new T.CircleGeometry(.3, 16), new T.MeshBasicMaterial({ map: shadowMat.map, transparent: true, opacity: .5, depthWrite: false })); ballShadow.rotation.x = -Math.PI / 2; ballShadow.position.y = .04; ballShadow.visible = false; scene.add(ballShadow);

// La X gialla a terra dove scende un pallone alto (lanci, cross, rimesse), per tutte e due le squadre: due strisce incrociate
const xAlta = (() => {
  const g = new T.Group(), m = new T.MeshBasicMaterial({ color: 0xFFD21F, transparent: true, opacity: .9, depthWrite: false });
  for (const a of [Math.PI / 4, -Math.PI / 4]) { const r = new T.Mesh(new T.PlaneGeometry(SEGNI.x, SEGNI.x * .2), m); r.rotation.x = -Math.PI / 2; r.rotation.z = a; g.add(r); }
  g.position.y = .06; g.visible = false; g.renderOrder = 2; scene.add(g); return g;
})();
// visibile finché il pallone alto calciato per ultimo è in aria: il punto d'arrivo (a terra) si ricalcola ogni tanto, perché
// aria ed effetto lo spostano
function segnoAlto(b) {
  const su = !b.owner && G.altoT === G.calcioT && (b.y > .5 || b.vy > 1) && G.state !== 'goal';
  if (!su) { xAlta.visible = false; return; }
  if (!xAlta.visible || G.t >= (G.xAltaT || 0)) { const a = FIS.atterraggio(b, BR, 4); if (a) { xAlta.position.x = clamp(a.x, -HL - 2, HL + 2); xAlta.position.z = clamp(a.z, -HW - 2, HW + 2); } G.xAltaT = G.t + .1; }
  xAlta.visible = true;
}
/* ------------------------------------------------------------------ partita */
function clearMatch() {
  for (const t of G.teams) for (const p of t.players.concat(t.off, t.out)) scene.remove(p.fig.root);
  if (MODEL) { for (const t of MODEL.divise.values()) t.dispose(); MODEL.divise.clear(); for (const m of MODEL.corpi) m.dispose(); MODEL.corpi.length = 0; }
  G.teams = [];
}
// il capitano: per la mia squadra quello scelto in carriera, per le altre il migliore in campo (portiere escluso)
function capitanoDi(club, mia) {
  if (mia && K && K.mio && K.mio.capitano && club.xi.some((x) => x[0] === K.mio.capitano)) return K.mio.capitano;
  const c = club.xi.slice(1).sort((a, b) => b[3] - a[3])[0]; return c ? c[0] : null;
}
function creaGiocatore(t, i, [name, role, num, q]) {
  const club = t.club, fig = (MODEL ? makeSkinned : makeFigure)(i === 0 ? t.gkit : t.kit, hash(club.id + name), num, i === 0 ? null : club.id, name, { capitano: name === t.capitano }); scene.add(fig.root);
  fig.root.traverse((o) => { if (o.isMesh && !(o.material && o.material.transparent) && !(fig.vicini && fig.vicini.includes(o))) o.castShadow = true; }); // ombra vera del sole (l'ombra di contatto resta)
  const base = 7.3 + clamp((q - 20) / 40, -.5, .6) + (club.str - 3) * .07;
  return { team: t, i, role, nat: role, name, num, q, x: 0, z: 0, vx: 0, vz: 0, dir: t.side > 0 ? Math.PI / 2 : -Math.PI / 2, fig, st: 'run', stT: 0, cool: 0, stun: 0, shield: 0, ph: rnd(6), tx: 0, tz: 0, sprint: false, maxV: i === 0 ? 6.6 : base, thinkT: 0, hold: 0, diveS: 0, hit: false, saveId: -1, run: null, mark: null, jock: false, slideCd: 0, inj: false, yel: 0, red: false, fkShot: false, en: 1, by: null, s: { g: 0, a: 0, kp: 0, sh: 0, sot: 0, pa: 0, pc: 0, tk: 0, int: 0, sv: 0, fl: 0, og: 0 }, massa: 72 + ({ P: 6, D: 5, C: -1, A: 2 }[role] || 0) + (hash(name + club.id) % 9) - 4, sbil: 0 }; // la massa conta nei duelli spalla a spalla
}
/** Sostituzione: esce `out`, entra il k-esimo della panchina e ne prende posto e compito. Il portiere si cambia solo con un portiere. */
function sostituisci(t, out, k) {
  const b = t.bench[k], at = t.players.indexOf(out);
  if (!b || b.used || at < 0 || t.subs >= SUB.max || G.so || (out.i === 0) !== (b.role === 'P')) return null;
  const p = creaGiocatore(t, out.i, [b.name, b.role, b.num, b.q]);
  p.role = out.role; p.x = p.tx = out.x; p.z = p.tz = out.z; p.dir = out.dir; t.players[at] = p; t.out.push(out); scene.remove(out.fig.root); b.used = true; t.subs++;
  if (G.ctrl === out) G.ctrl = p; if (G.ball.owner === out) G.ball.owner = p; if (G.taker === out) G.taker = p; if (G.intended === out) G.intended = null;
  if (G.offs) G.offs = G.offs.filter((x) => x !== out); if (G.fk && G.fk.pos && G.fk.pos.has(out)) { G.fk.pos.set(p, G.fk.pos.get(out)); G.fk.pos.delete(out); } if (G.fk && G.fk.wall) for (const w of G.fk.wall) if (w.p === out) w.p = p;
  G.stats.subs[t.idx]++;
  return p;
}
// L'IA cambia a gioco fermo: prima chi si è fatto male, poi il più stanco, con un compagno dello stesso ruolo
function aiSubs() {
  for (const t of G.teams) {
    if (t.human || !t.bench.length || t.subs >= SUB.ai) continue;
    const prog = ((G.half - 1) * HALF_SECS + G.clock) / (HALF_SECS * 2);
    const fresco = prog > SUB.from + t.subs * SUB.every; // forze fresche: dal secondo tempo inoltrato esce il più stanco
    const out = t.players.filter((p) => p.i && (p.inj || fresco)).sort((a, c) => (c.inj - a.inj) || a.en - c.en)[0]; if (!out) continue;
    let k = -1; t.bench.forEach((b, i) => { if (!b.used && b.role === out.nat && (k < 0 || b.q > t.bench[k].q)) k = i; });
    if (k >= 0) { const p = sostituisci(t, out, k); if (p) banner('', `Cambio ${t.club.short} · entra ${p.name}`, 1500); }
  }
}
// In trasferta la prima maglia è dell'avversaria: le divise si scelgono a parti invertite
const kitsFor = (mia, loro, fuori) => { if (!fuori) return pickKits(mia, loro); const [a, b, c, d, e] = pickKits(loro, mia); return [b, a, d, c, e]; };
function newMatch(home, away) {
  clearMatch();
  const fuori = !!(G.comp && G.comp.fuori), [kh, ka, g1, g2, arb] = kitsFor(home, away, fuori); G.arbKit = arb;
  const mk = (club, side, human, kit, gkit) => {
    const t = { club, side, human, score: 0, players: [], off: [], idx: side > 0 ? 0 : 1, chaser: null, cover: null, ment: 0 };
    t.kit = kit; t.gkit = gkit; t.capitano = capitanoDi(club, human); t.bench = (club.pan || []).map(([name, role, num, q]) => ({ name, role, num, q, used: false })); t.subs = 0; t.out = [];
    club.xi.forEach((rec, i) => t.players.push(creaGiocatore(t, i, rec)));
    setTactics(t, human ? sel.form : aiForm(club), human ? sel.ment : 0);
    return t;
  };
  G.teams = [mk(home, 1, true, kh, g1), mk(away, -1, false, ka, g2)];
  G.teams[0].opp = G.teams[1]; G.teams[1].opp = G.teams[0];
  if (fuori) { G.teams[0].side = -1; G.teams[1].side = 1; } // in trasferta si comincia attaccando verso sinistra
  G.ball = { x: 0, y: BR, z: 0, vx: 0, vy: 0, vz: 0, c: 0, t: 0, resto: 0, owner: null };
  ballMesh.visible = ballShadow.visible = true;
  G.clock = 0; G.half = 1; G.goals = []; G.cards = []; G.fk = null; G.offs = null; G.noOff = G.pen = false; G.penId = -1; G.penWait = 0; G.lastPass = G.shooter = null; G.so = G.soRes = null; $('#hud').classList.remove('rigori'); G.stats = { recAlti: [0, 0], resp: [0, 0], uscite: [0, 0], shots: [0, 0], poss: [0, 0], runs: [0, 0], slides: [0, 0], fouls: [0, 0], offs: [0, 0], pens: [0, 0], yel: [0, 0], red: [0, 0], crosses: [0, 0], heads: [0, 0], headGoals: [0, 0], corners: [0, 0], adv: [0, 0], inj: [0, 0], subs: [0, 0] }; G.ctrl = null; G.charge = -1;
  paintBoards(home, away, CREST);
  $('#sbH').src = img(home.id + '-mini'); $('#sbA').src = img(away.id + '-mini'); $('#sbHn').textContent = home.short; $('#sbAn').textContent = away.short;
  hud(); kickoff(G.teams[0]);
  // la telecamera parte già al suo posto di gioco: prima arrivava da 46 m di altezza e 70 m di distanza in un paio di secondi,
  // e al calcio d'inizio si vedeva tutto il campo da lontano
  updateCamera(9);
}
const all = () => G.teams[0].players.concat(G.teams[1].players);
const diffOf = (p) => (p.team.human ? MATE : G.diff);
const userDrives = (p) => p === G.ctrl && p.team.human && !G.auto;

function kickoff(team) {
  const b = G.ball; b.x = b.z = 0; b.y = BR; b.vx = b.vy = b.vz = 0; b.c = b.t = 0; b.owner = null;
  for (const t of G.teams) for (const p of t.players) {
    const f = t.form[p.i]; let kx = p.i === 0 ? -46 : Math.min(-1.5, -4 - (8 - f[0]) * .9), kz = f[1];
    if (t !== team && Math.abs(kz) < 10) kx = Math.min(kx, -10.5);
    if (t === team && p.i === 9) { kx = -.7; kz = 0; }
    if (t === team && p.i === 10) { kx = -1.2; kz = 5; }
    p.x = kx * t.side; p.z = kz * t.side; p.vx = p.vz = 0; p.dir = t.side > 0 ? Math.PI / 2 : -Math.PI / 2; p.st = 'run'; p.stT = 0; p.cool = p.stun = 0; p.tx = p.x; p.tz = p.z; p.fx = null; p.fxNew = false; p.fallen = false; p.run = p.mark = null; p.fkShot = false; // fxNew va azzerato insieme a fx, se no il disegno fa partire un'animazione senza nome
  }
  G.taker = team.players.find((p) => p.i === 9) || nearestTo(team, 0, 0); G.taker.x = -.7 * team.side; G.taker.z = 0; G.fk = null; G.offs = null; G.noOff = G.pen = false; G.penWait = 0;
  G.next = team; G.poss = team; G.lastTouch = G.taker; G.intended = null;
  setState('kickoff'); banner(G.half === 1 && G.clock === 0 ? "Calcio d'inizio" : '', '', 1100); AU.fischio(G.clock === 0 ? 'inizio' : 'ripresa');
  if (team.human) setCtrl(G.taker); else setCtrl(nearestTo(G.teams[0], 0, 0));
}
function setState(s) { G.state = s; G.stateT = 0; }
function setCtrl(p) { if (p && p.team.human && p.i !== 0) { G.ctrl = p; G.idle = 0; } }
function nearestTo(team, x, z, skip) { let best = null, bd = 1e9; for (const p of team.players) { if (p.i === 0 || p === skip) continue; const d = hyp(p.x - x, p.z - z); if (d < bd) { bd = d; best = p; } } return best; }

const minute = () => Math.min(90, Math.floor(((G.half - 1) + G.clock / HALF_SECS) * 45) + 1);
// Linea del fuorigioco per chi attacca con t: il penultimo avversario (portiere compreso), mai dietro il pallone né dietro la metà campo
function offsideLine(t, bx = G.ball.x) {
  const s = t.side; let a = -1e9, c = -1e9; for (const o of t.opp.players) { const x = o.x * s; if (x > a) { c = a; a = x; } else if (x > c) c = x; }
  return Math.max(c, bx * s, 0);
}
function offside(p) { G.stats.offs[p.team.idx]++; G.offs = null; freeKick(p.team.opp, p.x, p.z, 'Fuorigioco'); }
const qf = (p) => clamp(1.2 - (p.q - 20) / 45, .75, 1.25); // chi vale di più sbaglia di meno
function gain(p) {
  if (p.i === 0) { p.presaT = G.t; p.rinvio = null; p.hold = 0; }
  if (G.offs && G.state === 'play' && G.offs.includes(p)) return offside(p);
  G.offs = null; if (p !== G.taker) G.noOff = false;
  // pagella: passaggio riuscito, oppure pallone intercettato a un avversario
  const lp = G.lastPass, lk = G.lastKicker; G.lastPass = null; p.by = null;
  if (G.state === 'play') { if (lp && lp.team === p.team && lp !== p) { lp.s.pc++; p.by = lp; } else if (!G.ball.owner && lk && lk.team !== p.team && p.i) p.s.int++; }
  // chi recupera palla nella metà avversaria (misura del pressing)
  const b = G.ball, prev = G.poss; if (prev && prev !== p.team && G.state === 'play') { prev.persaT = G.t; if (p.x * p.team.side > 0) G.stats.recAlti[p.team.idx]++; } b.owner = p; G.lastTouch = p; G.intended = null; G.poss = p.team; p.shield = .45; p.hold = 0;
  { let pr = 9; for (const o of p.team.opp.players) pr = Math.min(pr, hyp(o.x - p.x, o.z - p.z)); p.thinkT = diffOf(p).think / .4 * (pr < 2.5 ? TENUTA.primoAddosso : rnd(...TENUTA.primo) * (pr < 5 ? .5 : 1)); p.conduci = null; } // con l'avversario addosso si decide subito (TENUTA)
  if (p.i && G.state === 'play') { // stop (anche di petto): la palla si smorza davanti al piede, verso la levetta (o verso la porta per chi gioca da solo)
    FIS.controlla(b, p, tecnica(p), Math.random, versoControllo(p));
  }
  if (p.team.human) { if (p.i !== 0) setCtrl(p); } else if (prev !== p.team || !G.ctrl) { const m = migliorDifensore(G.teams[0]); setCtrl(m ? m.p : nearestTo(G.teams[0], b.x, b.z)); }
}
// Da dove parte il calcio: il pallone è dove l'ha lasciato l'ultimo tocco (non incollato al piede). Se per qualche motivo è
// troppo lontano (rimesse, palla appena data), lo si mette davanti al piede.
function piede(p) {
  const b = G.ball, d = hyp(b.x - p.x, b.z - p.z);
  if (d <= 1.6 && b.y < 1.2 && !(p.i === 0 && b.owner === p)) return { x: b.x, y: BR, z: b.z };
  return { x: p.x + Math.sin(p.dir) * .8, y: BR, z: p.z + Math.cos(p.dir) * .8 };
}
/* Rimessa laterale con le mani (clip di GameplayFootball): chi la batte si mette sulla linea, prende il pallone sopra la
   testa, si gira verso il compagno e lo lancia quando le braccia arrivano in avanti (il «tocco» della clip). Corta sui
   piedi fino a 14 m, poi lunga e più alta. Niente fuorigioco (G.noOff resta acceso dalla ripresa fino al lancio). */
function lanciaRimessa(p, m) {
  const b = G.ball, d0 = hyp(m.x - p.x, m.z - p.z), nome = d0 > RIMESSA.lunga ? 'rimessa_lunga' : 'rimessa', i = GESTI[nome];
  p.dir = Math.atan2(m.x - p.x, m.z - p.z);
  const via = () => {
    const h = traLeMani(p) || { x: b.x, y: RIMESSA.mani, z: b.z }, tx = clamp(m.x + m.vx * .45, -HL + 1, HL - 1), tz = clamp(m.z + m.vz * .45, -HW + 1, HW - 1), d = hyp(tx - h.x, tz - h.z);
    const T = clamp(d / (d > RIMESSA.lunga ? 16 : 13), .45, 1.5), v = FIS.mira({ x: h.x, y: h.y, z: h.z }, { x: tx, y: .35, z: tz }, T, 0, 0);
    b.owner = null; b.x = h.x; b.y = h.y; b.z = clamp(h.z, -HW + .05, HW - .05); b.vx = v.vx; b.vy = clamp(v.vy, -2, 9); b.vz = v.vz; b.c = b.t = 0; b.resto = 0;
    G.calcioT = G.altoT = G.t; p.cool = .5; G.lastTouch = G.lastKicker = p; G.intended = m; G.lastPass = p; p.s.pa++; G.poss = p.team; G.rimessa = null; markOffside(p); AU.calcio(7, 'passaggio');
    if (p.team.human) setCtrl(m);
  };
  // dalla posa tenuta (pallone dietro la testa) parte il lancio: il pallone esce quando la clip arriva al «tocco»
  if (i && !p.carica && clipGF(p, nome, RIMESSA.fermo)) p.carica = { t: Math.max(0, i.tocco - RIMESSA.fermo), calcio: via }; else via();
}
/** Mentre si batte la rimessa il pallone sta tra le mani, sopra la testa. */
function palloneInMano() {
  const r = G.rimessa, b = G.ball; if (!r) return; const k = r.chi;
  if (G.state !== 'restart' && G.state !== 'play') { G.rimessa = null; return; }
  if (G.state === 'restart' && !r.mani) { const q = postoBattitore(k, b); if (hyp(k.x - q[0], k.z - q[1]) < .6) r.mani = true; else return; } // lo prende quando arriva sulla linea
  if (G.state === 'play' && b.owner !== k) { G.rimessa = null; return; }
  if (!k.carica && !(k.fx === 'rimessa' && k.fxFermo)) { k.dir = Math.atan2(0, -sgn(k.z)); if (clipGF(k, 'rimessa', RIMESSA.fermo)) k.fxFermo = true; } // rivolto al campo, pallone dietro la testa
  const h = traLeMani(k) || { x: k.x + Math.sin(k.dir) * .1, y: RIMESSA.mani, z: k.z + Math.cos(k.dir) * .1 };
  b.x = h.x; b.y = Math.max(h.y, RIMESSA.manoMin); b.z = clamp(h.z, -HW + .05, HW - .05); b.vx = b.vy = b.vz = 0;
}
function kick(p, vx, vy, vz, anim = 'passaggio', c = 0, tp = 0) {
  const b = G.ball, o = piede(p); b.owner = null; b.x = o.x; b.z = o.z; b.y = BR;
  b.vx = vx; b.vy = vy; b.vz = vz; b.c = c; b.t = tp; b.resto = 0; G.calcioT = G.t; p.cool = .45;
  if (BR + vy * vy / (2 * GRAV) > SEGNI.alto) G.altoT = G.calcioT; // pallone alto: la X gialla dove scende (non sui tiri, vedi shoot)
  // tiro forte: si alza un po' d'erba
  if (hyp(vx, vz) > 23) { const v = hyp(vx, vz); PART.emetti('erba', o.x, .05, o.z, 6, 3, vx / v * .6, vz / v * .6); PART.emetti('polvere', o.x, .1, o.z, 3, 1.5, 0, 0); } p.st = 'kick'; p.stT = 0; G.lastTouch = G.lastKicker = p; AU.calcio(hyp(vx, vz), anim === 'tiro' || (p.fkShot && hyp(vx, vz) > 20) ? 'tiro' : anim);
  if (p.i === 0 && p.fx === 'rinvio') { b.y = PARATA.lancio; b.vy = Math.max(b.vy, 1.2); } // rinvio con le mani: la palla parte dall'alto
  else if (!(GESTI[p.fx] && /^(passa|calcia|lancia|tiro)/.test(p.fx))) azione(p, anim); // col caricamento il gesto è già al punto del contatto
  const a = Math.atan2(vx, vz); p.dir = a;
  markOffside(p);
}
// chi è oltre la linea in questo momento è in fuorigioco se poi tocca il pallone; non vale su rimessa, angolo e rimessa dal fondo
function markOffside(p) {
  if (G.noOff) { G.noOff = false; G.offs = null; }
  else { const s = p.team.side, line = offsideLine(p.team, p.x) + .35, o = p.team.players.filter((m) => m !== p && m.x * s > line); G.offs = o.length ? o : null; }
}
// Dove arriva un pallone alto quando scende ad altezza di testa
function landing() {
  const b = G.ball, a = FIS.atterraggio(b, 1.95, 3) || FIS.atterraggio(b, 1.2, 3), q = a || ((pp) => pp[pp.length - 1])(FIS.percorso(b, 3, .1));
  return [clamp(q.x, -HL - 2, HL + 2), clamp(q.z, -HW - 2, HW + 2)];
}
const airborne = () => { const b = G.ball; return !b.owner && (b.y > 1.2 || b.vy > 4); };
// Il compagno in area a cui crossare: libero, vicino alla porta, non troppo vicino a chi crossa
function crossTarget(p, voglio) {
  const s = p.team.side; let best = null, bs = -1e9;
  for (const m of p.team.players) {
    if (m === p || m.i === 0 || m.x * s < HL - 19 || Math.abs(m.z) > 13 || hyp(m.x - p.x, m.z - p.z) < 9) continue;
    const sc = Math.min(openness(m), 5) * 1.2 - hyp(s * HL - m.x, m.z) * .15 + (voglio ? -Math.abs(hyp(m.x - p.x, m.z - p.z) - voglio) * .5 : rnd(2)); if (sc > bs) { bs = sc; best = m; }
  }
  return best;
}
const canCross = (p) => Math.abs(p.z) > AIR.wide && p.x * p.team.side > HL - AIR.deep;
// Traversone: pallone alto che scende ad altezza di testa davanti al compagno
function cross(p, m, pow = null, tipo = 'cross') {
  if (G.rimessa && G.ball.owner === p && G.rimessa.chi === p) return lanciaRimessa(p, m);
  const s = p.team.side, e = 1.5 * qf(p) * (userDrives(p) ? .7 : diffOf(p).err);
  const tx = clamp((m.x + m.vx * .5) * s + 1, -HL, HL - 2.5) * s + rnd(-1, 1) * e, tz = m.z + m.vz * .5 + rnd(-1, 1) * e;
  let ttx = tx, ttz = tz; const o = piede(p);
  if (pow !== null) { const d0 = hyp(tx - o.x, tz - o.z) || 1, extra = (pow - powPer(tipo, d0)) * 10; ttx = clamp(tx + (tx - o.x) / d0 * extra, -HL + 1, HL - 1); ttz = clamp(tz + (tz - o.z) / d0 * extra, -HW + 1, HW - 1); } // con la barra: troppa potenza va oltre, poca resta corta
  const d = hyp(ttx - o.x, ttz - o.z) || 1, T = clamp(d / 18, .75, 1.35);
  const c = effettoVerso(o, ttx, ttz, s * HL, 0) * rnd(.4, .7) * (rnd() < .7 ? 1 : -1), v = FIS.mira(o, { x: ttx, y: AIR.bersaglio, z: ttz }, T, c, .15); // a rientrare verso la porta, ogni tanto a uscire
  kick(p, v.vx, v.vy, v.vz, 'tiro', c, .15);
  G.intended = m; m.run = null; p.s.pa++; G.lastPass = p; if (m.x * s > HL - 19) G.stats.crosses[p.team.idx]++; if (p.team.human) setCtrl(m);
}
// Colpo di testa. In porta se si è a tiro: verso l'angolo lontano dal portiere, schiacciato verso terra (il più difficile da
// parare), con la forza presa dal cross; più impreciso se c'è un difensore addosso. In difesa: lontano dalla porta e verso
// la fascia, alto e lungo, o a un compagno libero in quella direzione. Altrimenti di sponda, al compagno messo meglio
// davanti. Chi è guidato dall'utente sceglie con la levetta: verso la porta tira, altrove passa.
// Il colpo di testa di GameplayFootball adatto: in corsa, in salto se il pallone è alto, o da fermo. Parte poco prima del
// contatto, così la testa arriva sul pallone col fotogramma giusto. Se la clip manca resta quello di prima.
function testaGF(p, b) {
  const v = hyp(p.vx, p.vz), nome = v > 3.5 ? 'testa_corsa' : b.y > AIR.salto ? 'testa_salto' : 'testa_fermo', i = GESTI[nome];
  if (!i || !clipGF(p, nome, Math.max(0, i.tocco - .1))) azione(p, 'testa'); else sporca(p, 'testa');
}
function header(p) {
  if (G.offs && G.offs.includes(p)) return offside(p);
  const t = p.team, s = t.side, b = G.ball, gx = s * HL, dG = hyp(gx - p.x, p.z), D = diffOf(p), arriva = hyp(b.vx, b.vy, b.vz);
  const utente = userDrives(p), [jx, jz] = utente ? inputWorld() : [0, 0], jl = hyp(jx, jz), versoPorta = jl > .3 && ((gx - p.x) * jx + -p.z * jz) / ((dG || 1) * jl) > .55;
  const aTiro = dG < AIR.shot && (gx - p.x) * s > 1.5 && Math.abs(p.z) < 12, toGoal = utente ? aTiro && (versoPorta || jl <= .3) : aTiro;
  if (p === G.intended && !toGoal && openness(p) > 2.6 && !utente) return; // libero e lontano dalla porta: lo lascia scendere e lo controlla
  const lp = G.lastPass; G.lastPass = null; p.by = lp && lp.team === t && lp !== p ? lp : null; if (p.by) lp.s.pc++;
  let vx, vy, vz; G.intended = null; G.stats.heads[t.idx]++;
  if (toGoal) {
    const gk = t.opp.players[0], marcato = openness(p) < 1.6, mk = marcato ? 1.6 : 1;
    const lato = utente && Math.abs(jz) > .3 ? sgn(jz) : (gk && Math.abs(gk.z - GH) > Math.abs(gk.z + GH) ? 1 : -1); // lontano dal portiere (o dove dice la levetta)
    const tz = lato * GH * rnd(.3, .85) + rnd(-1, 1) * (1.6 + dG * .17) * D.err * qf(p) * mk, d = hyp(gx - b.x, tz - b.z) || 1;
    const sp = clamp(8 + arriva * .3 + rnd(-1, 1), 9.5, 16) / (marcato ? 1.12 : 1), T = d / sp, alto = rnd() < .14 * mk * D.err ? rnd(2.4, 3.2) : rnd(.25, 1.1); // di solito verso terra, ogni tanto alto
    ({ vx, vy, vz } = FIS.mira(b, { x: gx, y: alto, z: tz }, T));
    G.shotId++; G.tiroT = G.t; G.headId = G.shotId; G.stats.shots[t.idx]++; p.s.sh++; if (p.by) p.by.s.kp++; G.shooter = p;
  } else {
    const difesa = p.x * s < -HL + 30, dir = utente && jl > .3 ? [jx / jl, jz / jl] : null;
    let m = null, bs = -1e9;
    for (const o of t.players) { // a chi appoggiarla: libero, nella direzione giusta (avanti, o via dalla porta se si difende)
      if (o === p || o.i === 0 || o.stun > 0) continue; const dx = o.x - b.x, dz = o.z - b.z, d = hyp(dx, dz); if (d < 4 || d > 24) continue;
      const verso = dir ? (dx * dir[0] + dz * dir[1]) / d : dx * s / d; if (verso < (dir ? .5 : difesa ? .2 : -.2)) continue;
      const sc = Math.min(openness(o), 6) * 1.4 + verso * 6 - d * .15 + (o.x * s - p.x * s) * .12; if (sc > bs) { bs = sc; m = o; }
    }
    if (m && (bs > 6 || dir || !difesa)) { const dx = m.x + m.vx * .3 - b.x, dz = m.z + m.vz * .3 - b.z, d = hyp(dx, dz) || 1, sp = clamp(6 + d * .5, 8, 15); vx = dx / d * sp; vz = dz / d * sp; vy = 2 + d * .08; G.intended = m; p.s.pa++; G.lastPass = p; }
    else if (!dir && p.x * s < -HL + 17 && openness(p) < 1.8 && rnd() < CALCI.testaAngolo) { // in area con l'attaccante addosso: nel dubbio in angolo
      const zt = sgn(p.z || rnd(-1, 1)) * rnd(GH + 3, GH + 14), xt = -s * (HL + 3), dl = hyp(xt - b.x, zt - b.z) || 1, sp = rnd(8, 12); vx = (xt - b.x) / dl * sp; vz = (zt - b.z) / dl * sp; vy = rnd(2.5, 5);
    } else { const fuori = sgn(p.z || rnd(-1, 1)), ux = dir ? dir[0] : s * .8, uz = dir ? dir[1] : fuori * .6, l = hyp(ux, uz) || 1, sp = rnd(13, 17); vx = ux / l * sp; vz = uz / l * sp; vy = rnd(6.5, 9); } // spazzata: lontano, verso la fascia
  }
  b.vx = vx; b.vy = vy; b.vz = vz; b.c = b.t = 0; G.calcioT = G.t; p.cool = .5; p.dir = Math.atan2(vx, vz); G.lastTouch = G.lastKicker = p; G.poss = t; AU.calcio(hyp(vx, vz), 'testa'); testaGF(p, b); markOffside(p);
}
/**
 * Chi vince il pallone alto: tra chi ci arriva, conta la distanza, ma anche lo stacco (più alto chi è più alto e più forte
 * di testa: i difensori e gli attaccanti centrali), lo slancio verso la palla e chi aspetta fermo rispetto a chi arriva in corsa.
 */
function duelloAereo(b) {
  let h = null, hs = 1e9;
  for (const p of all()) {
    if (p.i === 0 || p.cool > 0 || p.stun > 0 || p.st !== 'run') continue;
    const dx = b.x - p.x, dz = b.z - p.z, d = hyp(dx, dz), slancio = d > .05 ? (p.vx * dx + p.vz * dz) / d : 0;
    const testa = ((p.fig && p.fig.alt) || 1) - 1 + (p.role === 'D' ? .14 : p.role === 'A' ? .06 : 0) + clamp((p.q - 25) / 60, -.1, .2);
    const portata = AIR.reach + .3 + testa * .6 + (G.lastKicker && p.team === G.lastKicker.team && slancio > 2 ? AIR.stacco : 0);
    if (d > portata) continue;
    const sc = d - testa * 1.2 - clamp(slancio, 0, 6) * .05 + rnd(.35); if (sc < hs) { hs = sc; h = p; }
  }
  return h;
}
// Passaggi rasoterra: velocità d'arrivo (tesi, che non si fermano a metà) e, per ogni distanza, con che forza partire e quanto
// ci mettono. La tabella si fa una volta sola con la fisica del pallone: così il punto d'incontro si cerca in fretta.
const vArr = (d) => clamp(8 + d * .2, 8.5, 14);
const RASO = (() => { const v = [], t = []; for (let d = 0; d <= 70; d++) { const s = FIS.rasoterra(Math.max(d, .5), vArr(d), 30); v.push(s); t.push(FIS.rotolaFino(s, Math.max(d, .5)).t); } return { v, t }; })();
const daTabella = (arr, d) => { const k = clamp(d, 0, 69.999), i = Math.floor(k); return arr[i] + (arr[i + 1] - arr[i]) * (k - i); };
const tempoPalla = (o, x, z) => daTabella(RASO.t, hyp(x - o.x, z - o.z));
// Quanta strada fa p in t secondi correndo nella direzione (ux, uz): parte dalla velocità che ha in quel verso e accelera
function corsaIn(p, ux, uz, t, scatto) {
  const v0 = Math.max(0, p.vx * ux + p.vz * uz), vm = p.maxV * (scatto ? 1.2 : 1) * MOTO.forma(p.en).v, a = MOTO.CORPO.acc * .62;
  const tm = Math.max(0, (vm - v0) / a); return t < tm ? v0 * t + .5 * a * t * t : v0 * tm + .5 * a * tm * tm + vm * (t - tm);
}
/**
 * Dove e quando il compagno m può ricevere un rasoterra di p. Fermo (o quasi): sui piedi. In corsa, in scatto o con un
 * inserimento: nello spazio davanti a lui, nel punto in cui lui e il pallone arrivano insieme (lui con la sua accelerazione).
 */
function puntoIncontro(p, m) {
  const o = piede(p), vm = hyp(m.vx, m.vz); let dx, dz, lim;
  if (m.run) { dx = m.run.x - m.x; dz = m.run.z - m.z; lim = hyp(dx, dz) + 5; }
  else if (vm > 2.5) { dx = m.vx; dz = m.vz; lim = 4 + vm * 1.4; }
  if (!dx && !dz) return { x: m.x, z: m.z, t: tempoPalla(o, m.x, m.z), spazio: false };
  const L = hyp(dx, dz) || 1, ux = dx / L, uz = dz / L, scatto = !!(m.run || m.sprint);
  for (let t = .25; t <= 2.8; t += .05) {
    const s = Math.min(lim, corsaIn(m, ux, uz, t, scatto)), x = clamp(m.x + ux * s, -HL + 1, HL - 1), z = clamp(m.z + uz * s, -HW + 1, HW - 1);
    if (tempoPalla(o, x, z) <= t + .04) return { x, z, t, spazio: s > 2 };
    if (s >= lim) return { x, z, t: tempoPalla(o, x, z), spazio: true };
  }
  return { x: m.x, z: m.z, t: tempoPalla(o, m.x, m.z), spazio: false };
}
/* --- quanto ci mette la palla e quanto ci mette un uomo: servono a capire se un passaggio arriva o viene intercettato --- */
// Tabella dei rasoterra: per ogni velocità di partenza (6..34 m/s) il tempo per arrivare a ogni metro (0..70). Si fa una volta.
const ROTOLA = (() => {
  const tab = []; for (let v = 6; v <= 34; v++) {
    const q = { x: 0, y: BR, z: 0, vx: v, vy: 0, vz: 0, c: 0, t: 0 }, riga = new Float32Array(71).fill(9); let m = 0;
    for (let t = 0; t < 7 && m <= 70; t += 1 / 60) { while (m <= 70 && q.x >= m) riga[m++] = t; FIS.passo(q, 1 / 60); if (q.vx <= .05) break; }
    tab.push(riga);
  } return tab;
})();
/** Secondi che un rasoterra partito a velocità sp ci mette a fare d metri (9 se non ci arriva). */
function tempoRaso(sp, d) {
  const i = clamp(sp - 6, 0, 27.999), a = Math.floor(i), f = i - a, k = clamp(d, 0, 69.999), j = Math.floor(k), g = k - j, R = ROTOLA;
  const v = (r) => r[j] + (r[j + 1] - r[j]) * g; return v(R[a]) * (1 - f) + v(R[a + 1]) * f;
}
/** Secondi che q ci mette ad arrivare in (x, z), partendo con la sua velocità e accelerando (senza cicli), più il riflesso. */
function arrivo(q, x, z, riflesso = .16) {
  const dx = x - q.x, dz = z - q.z, d0 = hyp(dx, dz), d = d0 - .7; if (d <= 0) return 0;
  const v0 = Math.max(0, (q.vx * dx + q.vz * dz) / (d0 || 1)), vm = q.maxV * 1.1 * MOTO.forma(q.en).v * (q.stun > 0 ? .3 : 1), a = MOTO.CORPO.acc * .62;
  const tm = Math.max(0, (vm - v0) / a), dm = v0 * tm + .5 * a * tm * tm;
  return riflesso + (d <= dm ? (-v0 + Math.sqrt(v0 * v0 + 2 * a * d)) / a : tm + (d - dm) / vm);
}
/**
 * Il margine di un rasoterra di p verso il punto (x, z) a velocità sp: lungo il percorso, quanto prima la palla passa
 * rispetto al primo avversario che può arrivarci (secondi). Sotto zero qualcuno la intercetta. Vicino al punto d'arrivo
 * conta il confronto con chi riceve (che ci va incontro).
 */
function margine(p, x, z, sp, m) {
  const o = piede(p), dx = x - o.x, dz = z - o.z, d = hyp(dx, dz) || 1; let min = 9;
  // anche i primi metri (a 0,6 e 1,2 m dal piede): l'avversario a ridosso del pallone prima non veniva visto
  for (const k of [.6 / d, 1.2 / d, .18, .34, .5, .66, .8, .92, 1].filter((k, i) => i > 1 || k < .18)) {
    const px = o.x + dx * k, pz = o.z + dz * k, tb = tempoRaso(sp, d * k), mio = m && k > .75 ? arrivo(m, px, pz, .05) : 9;
    for (const q of p.team.opp.players) { if (q.stun > 0 && q.st === 'down') continue; const tq = arrivo(q, px, pz) + (q.i === 0 ? .1 : 0); min = Math.min(min, Math.min(tq, 9) - Math.max(tb, k > .75 ? Math.min(tb, mio) : tb)); }
  }
  return min;
}
/** La forza di un rasoterra verso un punto a distanza d: quella dosata, o più tesa se così passa più sicuro. */
function forzaPassaggio(p, x, z, m) {
  const d = hyp(x - p.x, z - p.z), base = daTabella(RASO.v, d), teso = Math.min(base * 1.28, 33), mb = margine(p, x, z, base, m);
  if (mb > .2) return { sp: base, mg: mb }; const mt = margine(p, x, z, teso, m); return mt > mb + .05 ? { sp: teso, mg: mt } : { sp: base, mg: mb };
}
function openness(m) { let d = 99; for (const o of m.team.opp.players) d = Math.min(d, hyp(o.x - m.x, o.z - m.z)); return d; }
// Quanto è libero un punto per la squadra t (distanza dall'avversario più vicino)
function liberoIn(t, x, z) { let d = 99; for (const o of t.opp.players) d = Math.min(d, hyp(o.x - x, o.z - z)); return d; }
function laneBlocked(p, m, tx = m.x, tz = m.z) {
  const o0 = piede(p), dx = tx - o0.x, dz = tz - o0.z, L = hyp(dx, dz) || 1;
  // anche chi è a ridosso del pallone, appena davanti al piede: prima il primo 8% del tragitto non contava e si passava
  // addosso all'avversario a mezzo metro (la palla gli sbatteva contro nello stesso istante)
  for (const o of p.team.opp.players) { const t = clamp(((o.x - o0.x) * dx + (o.z - o0.z) * dz) / (L * L), 0, 1), m = t * L; if (m > .2 && t < .95 && hyp(o0.x + dx * t - o.x, o0.z + dz * t - o.z) < (m < 2.5 ? 1.2 : 1.7)) return true; }
  return false;
}
/**
 * Il compagno a cui passare. Con la levetta: chi sta nel cono della levetta (guardando sia dove è sia dove riceverebbe),
 * preferendo i più centrati nel cono, liberi e con la linea di passaggio pulita. Senza levetta (l'IA): chi fa avanzare
 * la squadra senza rischi. Il punto d'incontro è quello di puntoIncontro (piedi o spazio).
 */
function bestPass(p, ix, iz, voglio) {
  const s = p.team.side, dirGiven = ix !== undefined; let best = null, bs = -1e9; bestPass.punteggio = -1e9;
  for (const m of p.team.players) {
    if (m === p || m.i === 0 || m.stun > 0) continue;
    const pt = puntoIncontro(p, m), dx = pt.x - p.x, dz = pt.z - p.z, d = hyp(dx, dz); if (d < 4 || d > 46) continue;
    const over = pt.x * s - offsideLine(p.team, p.x), off = over > .35 && m.x * s > offsideLine(p.team, p.x) - .2; if (over > CALCI.vedeFuori + .5 && !dirGiven && !m.run) continue; // chi passa non vede il fuorigioco di poco
    const chiusa = laneBlocked(p, m, pt.x, pt.z), lib = Math.min(liberoIn(p.team, pt.x, pt.z), 7);
    let sc;
    if (dirGiven) {
      const dm = hyp(m.x - p.x, m.z - p.z) || 1, cono = Math.max((dx * ix + dz * iz) / d, ((m.x - p.x) * ix + (m.z - p.z) * iz) / dm); // il più centrato tra dove è e dove riceve
      if (cono < .55) continue;
      sc = (cono > .82 ? 40 : 18) * cono - d * .25 + lib * .8 - (chiusa ? 6 : 0) + (pt.spazio ? 3 : 0) + dx * s * .08 - (off ? 12 : 0) - (voglio ? Math.abs(d - voglio) * .9 : 0); // con la barra: il compagno alla distanza scelta
    } else { // l'IA: avanzare, ma solo se il pallone arriva davvero (margine sui tempi di tutti gli avversari)
      const f = d > 18 && chiusa ? null : forzaPassaggio(p, pt.x, pt.z, m), mg = f ? f.mg : (chiusa ? -.3 : .3), gx = s * HL, vic = Math.max(0, 30 - hyp(gx - pt.x, pt.z));
      const oltre = pt.x * s > p.team.offLine - 3 && !off ? 8 : 0; // dietro la linea difensiva avversaria (in gioco): il passaggio che rompe la difesa
      sc = dx * s * .55 + Math.min(lib, 6) * 1.1 + clamp(mg, -.6, .6) * 26 - (mg < 0 ? 14 : 0) - d * .06 + vic * .5 + oltre + (m.run ? 5 : 0) + (pt.spazio ? 2 : 0) - (pt.x * s < -30 ? 6 : 0) - (over > CALCI.vedeFuori && off ? 30 : 0) + rnd(2); // il fuorigioco di meno di un metro chi passa non lo vede
      if (m.stun > 0 || m.inj) sc -= 6;
    }
    if (sc > bs) { bs = sc; best = m; }
  }
  bestPass.punteggio = bs; return best;
}
/** Un avversario addosso al pallone, proprio sulla traiettoria (entro PASSA.addosso metri e PASSA.cono gradi): la gamba lo devierebbe. */
function avversarioAddosso(p, o, ux, uz) {
  for (const q of p.team.opp.players) { if (q.stun > 0 && q.st === 'down') continue; const dx = q.x - o.x, dz = q.z - o.z, d = hyp(dx, dz); if (d < PASSA.addosso && (dx * ux + dz * uz) / (d || 1) > Math.cos(PASSA.cono * Math.PI / 180)) return true; }
  return false;
}
function pass(p, m, pow = null, rivisto = false, molt = 1) {
  if (G.rimessa && G.ball.owner === p && G.rimessa.chi === p) return lanciaRimessa(p, m);
  const o = piede(p), pt = puntoIncontro(p, m); let dx = pt.x - o.x, dz = pt.z - o.z; const d = hyp(dx, dz) || 1;
  if (avversarioAddosso(p, o, dx / d, dz / d)) {
    if (!rivisto && !userDrives(p)) { const m2 = bestPass(p); if (m2 && m2 !== m) { const p2 = puntoIncontro(p, m2), d2 = hyp(p2.x - o.x, p2.z - o.z) || 1; if (!avversarioAddosso(p, o, (p2.x - o.x) / d2, (p2.z - o.z) / d2)) return pass(p, m2, pow, true, molt); } }
    if (d < 30) { // pallonetto corto sopra la gamba: scende sui piedi del compagno
      const T = clamp(d / 13, .55, 1.6), v = FIS.mira(o, { x: pt.x, y: .3, z: pt.z }, T, 0, -.2); v.vy = Math.max(v.vy, PASSA.scavalca);
      kick(p, v.vx, v.vy, v.vz, 'passaggio', 0, -.2); G.intended = m; if (p.team.human) setCtrl(m); p.s.pa++; G.lastPass = p; return;
    }
  }
  { const e = rnd(-1, 1) * .035 * qf(p) * (userDrives(p) ? .6 : diffOf(p).err) * (pt.spazio ? 1.25 : 1), c = Math.cos(e), n = Math.sin(e), x = dx * c - dz * n; dz = dx * n + dz * c; dx = x; } // imprecisione (un po' di più sul filtrante)
  const lob = d > 18 && laneBlocked(p, m, pt.x, pt.z);
  if (lob) { // a scavalcare, con un po' di rotazione all'indietro; se lui corre, la palla scende dove arriverà
    const T = clamp(d / 17, .85, 1.7), vm = hyp(m.vx, m.vz), run = m.run || vm > 2.5, L = run ? hyp(m.run ? m.run.x - m.x : m.vx, m.run ? m.run.z - m.z : m.vz) || 1 : 1;
    const ux = run ? (m.run ? m.run.x - m.x : m.vx) / L : 0, uz = run ? (m.run ? m.run.z - m.z : m.vz) / L : 0, k = run ? corsaIn(m, ux, uz, T + .25, true) : 0;
    const tx = clamp(m.x + ux * k, -HL + 1, HL - 1), tz = clamp(m.z + uz * k, -HW + 1, HW - 1), v = FIS.mira(o, { x: tx, y: 1, z: tz }, T, 0, -.35); kick(p, v.vx, v.vy, v.vz, 'tiro', 0, -.35);
  } else { const f = pow === null ? 1 : clamp(1 + (pow - powPer('pass', d)) * .8, .7, 1.4), sp = (pow === null && !userDrives(p) ? forzaPassaggio(p, pt.x, pt.z, m).sp : daTabella(RASO.v, d) * f) * molt; kick(p, dx / d * sp, 0, dz / d * sp, d > 26 ? 'tiro' : 'passaggio'); } // forza dosata (con la barra: più o meno forte di quella giusta)
  G.intended = m; if (p.team.human) setCtrl(m);
  p.s.pa++; G.lastPass = p;
  // dai e vai: chi ha passato in avanti si butta nello spazio
  const s = p.team.side;
  if (p.i && p.role !== 'D' && (m.x - p.x) * s > -6 && p.x * s > -10 && rnd() < RUN.oneTwo) {
    const ax = Math.min(p.x * s + 12, HL - 6, defLine(p.team) + 4);
    if (ax - p.x * s > 5) { p.run = { x: ax * s, z: clamp(p.z + sgn(p.z - m.z || rnd(-1, 1)) * 4, -HW + 3, HW - 3), t: 2.2 }; G.stats.runs[p.team.idx]++; }
  }
}
function shoot(p, tz, pow, err) {
  const s = p.team.side, gx = s * HL, d0 = hyp(gx - p.x, tz - p.z);
  err *= qf(p); tz += rnd(-1, 1) * (.4 + d0 * .04) * err;
  const o = piede(p), d = hyp(gx - o.x, tz - o.z) || 1, sp = 19 + 15 * pow, t = d / sp / .94;
  const h = .35 + pow * 1.85 + (pow > .86 ? (pow - .86) * 11 : 0) + rnd(-.25, .25) * err;
  const c = pow > .45 ? effettoVerso(o, gx, tz, gx, 0) * Math.min(.65, (pow - .45) * 1.3) : 0, tp = .3 * pow; // caricato: a giro verso il centro della porta e con la palla che scende
  const v = FIS.mira(o, { x: gx, y: h, z: tz }, t, c, tp);
  kick(p, v.vx, clamp(v.vy, 0, 15), v.vz, 'tiro', c, tp); G.altoT = -1;
  G.shotId++; G.tiroT = G.t; G.intended = null; G.lastPass = null; G.shooter = p; if (!G.so) { G.stats.shots[p.team.idx]++; p.s.sh++; if (p.by) p.by.s.kp++; } // i rigori dopo la partita non contano nelle statistiche
  if (G.pen) { G.pen = false; G.penId = G.shotId; }
}
// Il segno dell'effetto che fa rientrare la palla verso il punto (cx, cz) mentre va da o a (tx, tz): curva a sinistra di chi calcia è +
function effettoVerso(o, tx, tz, cx, cz) {
  const dx = tx - o.x, dz = tz - o.z, l = hyp(dx, dz) || 1, lato = (-dz * (cx - tx) + dx * (cz - tz)) / l;
  return Math.abs(lato) < .3 ? (rnd() < .5 ? 1 : -1) : sgn(lato);
}
// Spalla a spalla: chi perde il duello è sbilanciato; se aveva palla e il duello è netto, la palla gli può sfuggire
function spallata(r) {
  const b = G.ball, p = r.perde; if (r.quanto > URTO.DUELLO.perde) AU.spallata(r.quanto); // si sente solo il contatto che sbilancia (al massimo uno ogni 2,5 s)
  if (b.owner === p && p.i && r.quanto > URTO.DUELLO.perde && (p.spallaT || 0) < G.t && rnd() < r.quanto * .5) {
    p.spallaT = G.t + .6; b.owner = null; const k = 3 + rnd(2), nx = b.x - r.vince.x, nz = b.z - r.vince.z, n = hyp(nx, nz) || 1;
    b.vx = p.vx * .6 + nx / n * k; b.vz = p.vz * .6 + nz / n * k; b.vy = rnd(.3); G.lastTouch = r.vince; G.lastPass = null; p.cool = .4; AU.calcio(5, 'tocco');
  }
}
// Scivolata: parte almeno a SCIVOLATA.v0 e la frena l'erba; chi la comanda l'utente viene aiutato a puntare il pallone se è
// già più o meno nella sua direzione (entro 40°). Cosa colpisce lo decide scivolate(), con la gamba tesa del modello.
const SCIVOLA_DA = .18; // secondi della clip saltati: la rincorsa
function slide(p, mira = false) {
  if (p.st !== 'run' || p.stun > 0) return;
  const b = G.ball;
  if (mira) { const tx = b.x + b.vx * .3, tz = b.z + b.vz * .3, d = hyp(tx - p.x, tz - p.z), a = Math.atan2(tx - p.x, tz - p.z); let da = a - p.dir; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; if (d < 6 && Math.abs(da) < .7) p.dir = a; }
  p.st = 'slide'; p.stT = 0; p.slPalla = null; p.slColpiti = []; p.slideV0 = Math.max(hyp(p.vx, p.vz) * URTO.SCIVOLATA.spinta, URTO.SCIVOLATA.v0); AU.scivolata();
  // la scivolata di GameplayFootball dal momento in cui si butta giù (prima c'è la rincorsa, che qui ha già fatto), col piede dalla parte del pallone
  { const b = G.ball, sx = (b.x - p.x) * Math.cos(p.dir) - (b.z - p.z) * Math.sin(p.dir) < 0; sporca(p, 'scivolata'); if (!clipGF(p, sx ? 'scivola_sx' : 'scivola', SCIVOLA_DA)) azione(p, 'scivolata'); }
}
// Ogni fotogramma, per chi sta scivolando: se la gamba tocca prima il pallone è un intervento pulito (la palla schizza via
// nella direzione della gamba, chi l'aveva può cadere); se prende prima l'avversario è fallo, più grave da dietro o in ritardo.
function scivolate() {
  const b = G.ball, S = URTO.SCIVOLATA;
  for (const d of all()) {
    if (d.st !== 'slide' || G.state !== 'play') continue;
    const own = b.owner;
    if (!d.slPalla && !(own && (own.team === d.team || own.i === 0)) && URTO.toccaPalla(d, b)) {
      d.slPalla = G.t; const v = URTO.deviazione(d, b);
      b.owner = null; b.vx = v.vx; b.vz = v.vz; b.vy = v.vy; b.c = b.t = 0; b.resto = 0; G.lastTouch = d; G.lastPass = null; G.offs = null; G.intended = null; d.cool = .25; AU.calcio(9, 'tocco');
      if (own) { own.cool = .5; d.s.tk++; }
    }
    for (const o of d.team.opp.players) {
      if (o.st === 'down' || o.stun > 0 || d.slColpiti.includes(o) || !URTO.toccaUomo(d, o)) continue;
      d.slColpiti.push(o);
      const vicino = b.owner === o || hyp(b.x - o.x, b.z - o.z) < 2.2;
      if (d.slPalla) { if (vicino) { o.stun = DOWN.fall; o.cool = Math.max(.8, DOWN.fall); o.fallen = true; cade(o, d); } continue; } // prima la palla: pulito, l'avversario può cadere
      const dietro = URTO.daDietro(d, o), ritardo = !vicino;
      return foul(d, o, true, dietro || ritardo, dietro && ritardo);
    }
  }
}
// Quanto ci mette p ad arrivare in (x, z), con la sua accelerazione (vedi portata)
function tempoA(p, x, z) { const d = hyp(x - p.x, z - p.z) - .6; if (d <= 0) return 0; for (let t = .05; t < 5; t += .05) if (portata(p, x, z, t) >= d) return t; return 5; }
/**
 * Il difensore giusto da comandare. Se l'avversario ha palla: chi arriva prima a chiudergli la strada, cioè in un punto
 * tra lui e la porta un paio di metri davanti a dove sta andando; chi è già stato superato (dietro la palla) conta molto
 * meno. Se la palla è libera o in volo: chi arriva prima sulla sua traiettoria. `salta` è chi si esclude (quello di adesso).
 */
function migliorDifensore(team, salta) {
  const b = G.ball, own = b.owner, gx = -team.side * HL; let best = null, bs = 1e9;
  const path = !own ? (G.path || FIS.percorso(b, 2.4, .1)) : null;
  for (const p of team.players) {
    if (p.i === 0 || p === salta || p.red) continue;
    let sc;
    if (own && own.team !== team) {
      const ux = gx - own.x, uz = -own.z, ul = hyp(ux, uz) || 1, cx = own.x + own.vx * .45 + ux / ul * 2, cz = own.z + own.vz * .45 + uz / ul * 2;
      const dietro = ((p.x - own.x) * ux + (p.z - own.z) * uz) / ul; // quanto è tra la palla e la porta (negativo: superato)
      sc = tempoA(p, cx, cz) + (dietro < -1 ? .9 + Math.min(1.2, -dietro * .08) : 0);
    } else if (path) {
      sc = 5; for (const pt of path) if (pt.y < AIR.intercetta && portata(p, pt.x, pt.z, pt.t) + .6 >= hyp(pt.x - p.x, pt.z - p.z)) { sc = pt.t; break; }
      if (sc >= 5) sc = 4 + tempoA(p, b.x, b.z) * .2; // nessuno ci arriva prima: il più vicino al punto dove si ferma
    } else sc = hyp(p.x - b.x, p.z - b.z) / 8;
    if (p.stun > 0 || p.st === 'down' || p.st === 'slide') sc += 1;
    if (sc < bs) { bs = sc; best = p; }
  }
  return best ? { p: best, t: bs } : null;
}
function switchCtrl() { const m = migliorDifensore(G.teams[0], G.ctrl); if (m) setCtrl(m.p); }

/* comandi dell'utente */
function inputWorld() { return [G.in.jx, G.in.jy]; }
const potenza = () => clamp(G.charge / CARICA.piena, 0, 1);
function caricaInizio(tipo) { G.charge = 0; G.caricaTipo = tipo; G.caricaIdeale = -1; }
function direzioneUtente(c) { const [jx, jz] = inputWorld(), l = hyp(jx, jz); return l > .3 ? [jx / l, jz / l] : [Math.sin(c.dir), Math.cos(c.dir)]; }
const distDa = (tipo, pow) => DIST[tipo][0] + pow * DIST[tipo][1];
const powPer = (tipo, d) => clamp((d - DIST[tipo][0]) / DIST[tipo][1], 0, 1);
// «Con la palla» o «senza» (decide le scritte e cosa fanno i tasti): con la palla se ce l'ha un nostro giocatore o se sta
// viaggiando un nostro passaggio; senza appena la squadra la perde, anche col pallone vagante dopo un nostro tiro
function modoAttacco() {
  const b = G.ball, h = G.teams[0]; if (!b || !h) return false;
  if (b.owner) return b.owner.team === h;
  return !!(G.intended && G.intended.team === h && G.lastKicker && G.lastKicker.team === h);
}
// Tasto B: «Calcio basso» (passaggio rasoterra) con la palla, «Pressing» (tenuto) senza
function pressA(down = true) {
  if (!down) G.in.pressing = false;
  if (G.state !== 'play' || G.auto || G.penWait > 0) { G.charge = -1; return; } const c = G.ctrl, b = G.ball; if (!c) return;
  if (down) { if (comandaPortiere('mano')) return; if (b.owner === c) caricaInizio('pass'); else if (!modoAttacco()) G.in.pressing = true; return; }
  if (G.charge < 0 || G.caricaTipo !== 'pass') return; const t = G.charge; G.charge = -1; if (b.owner !== c || c.carica) return;
  const [ix, iz] = direzioneUtente(c), pow = t < CARICA.tocco ? null : potenza();
  if (PASSAGGIO.assistito) { // assistito: il compagno nella direzione della levetta, la pressione cambia solo un po' la velocità
    const m = bestPass(c, ix, iz) || bestPass(c, Math.sin(c.dir), Math.cos(c.dir)) || bestPass(c), k = 1 + (Math.min(1, t / CARICA.piena) - .5) * 2 * PASSAGGIO.dosa;
    if (m) prepara(c, 'passa', m.x, m.z, () => pass(c, m, null, false, k)); return;
  }
  const dd = pow === null ? undefined : distDa('pass', pow), m = bestPass(c, ix, iz, dd) || bestPass(c, Math.sin(c.dir), Math.cos(c.dir), dd) || bestPass(c); // nessuno nella direzione: chi è davanti, poi il migliore
  if (m) prepara(c, 'passa', m.x, m.z, () => pass(c, m, pow));
}
// Cross: traversone se c'è un compagno in area, altrimenti lancio lungo nella direzione della levetta. La potenza decide
// quanto lontano: poca sul primo palo, tanta sul secondo (o un lancio più lungo)
function bersaglioCross(c, pow) {
  const s = c.team.side, [ix, iz] = direzioneUtente(c);
  let m = c.x * s > HL - 34 ? crossTarget(c, pow === null ? undefined : distDa('cross', pow)) : null, bs = -1e9, tipo = 'cross';
  if (!m) { tipo = 'lancio'; for (const o of c.team.players) {
    if (o === c || o.i === 0) continue; const dx = o.x - c.x, dz = o.z - c.z, d = hyp(dx, dz), dot = (dx * ix + dz * iz) / (d || 1); if (d < 13 || d > 58 || dot < .5) continue;
    const sc = dot * 30 + Math.min(openness(o), 6) - Math.abs(d - (pow === null ? 28 : distDa('lancio', pow))) * .35; if (sc > bs) { bs = sc; m = o; }
  } }
  return { m, tipo };
}
// Tasto C: «Calcio alto» (lancio o cross) con la palla, «Cambia giocatore» senza
function pressD(down = true) {
  if (G.state !== 'play' || G.auto || G.penWait > 0) { G.charge = -1; return; } const c = G.ctrl, b = G.ball; if (down && comandaPortiere('piede')) return;
  if (down && c && b.owner !== c && !modoAttacco()) { switchCtrl(); G.in.pressing = false; return; }
  if (!c || b.owner !== c) return;
  if (down) return caricaInizio('cross');
  if (G.charge < 0 || G.caricaTipo !== 'cross') return; const t = G.charge; G.charge = -1;
  if (c.carica) return; const pow = t < CARICA.tocco ? null : potenza(), { m, tipo } = bersaglioCross(c, pow); if (m) prepara(c, 'lancia', m.x, m.z, () => cross(c, m, pow, tipo));
}
// Tasto A: «Calcio forte», tiro con la palla: senza, scivolata nella direzione della levetta (se è ferma, verso il pallone)
function pressB(down) {
  if (G.state !== 'play' || G.auto) { G.charge = -1; return; } const c = G.ctrl, b = G.ball; if (!c) return;
  if (down) { if (b.owner === c) caricaInizio('tiro'); else if (!modoAttacco()) { const [jx, jz] = inputWorld(); if (hyp(jx, jz) > .3 && c.st === 'run') { c.dir = Math.atan2(jx, jz); slide(c); } else slide(c, true); } }
  else if (G.charge >= 0 && G.caricaTipo === 'tiro') { if (b.owner === c && !c.carica) userShoot(clamp(potenza(), .18, 1)); G.charge = -1; }
}
// la carica arriva in fondo: parte da sola
function rilascia() { if (G.caricaTipo === 'pass') pressA(false); else if (G.caricaTipo === 'cross') pressD(false); else pressB(false); }
function userShoot(pow) {
  const c = G.ctrl, [, iz] = inputWorld(); const gk = c.team.opp.players[0];
  const tz = Math.abs(iz) > .25 ? iz * GH * 1.06 : (gk.z > 0 ? -1 : 1) * GH * .68;
  prepara(c, 'calcia', c.team.side * HL, tz, () => shoot(c, tz, pow, .9), pow > .65);
}

/* ------------------------------------------------------------------ IA */
/**
 * Il blocco della squadra t (coordinate nel verso d'attacco di t): dove sta la linea difensiva, quanto è lunga la squadra
 * dalla difesa all'attacco e quanto è larga. Segue la palla; la mentalità (-1 difensiva, 0 equilibrata, 1 offensiva) alza o
 * abbassa il baricentro e allunga o accorcia la squadra; in possesso ci si allarga e ci si allunga.
 */
function blocco(t) {
  const s = t.side, bx = clamp(G.ball.x * s, -HL, HL), att = G.poss === t, m = t.ment || 0;
  const lunga = 30 + m * 4 + (att ? 6 : 0);
  const linea = att ? clamp(bx * .6 - 24 + m * 6, -38, 6 + m * 8) : clamp(bx * .55 - 31 + m * 7, -40, -12 + m * 9);
  const vicino = !att && bx < -HL + AREA_IA.vicino; // pallone vicino alla nostra porta: ci si stringe
  return { linea, lunga, largo: att ? 1 + m * .06 : vicino ? AREA_IA.stretta : .78 };
}
function homeOf(p) {
  const t = p.team, s = t.side, b = G.ball, f = t.form[p.i], bx = b.x * s, att = G.poss === t;
  let hx = f[0] + bx * .55 + (att ? 7 + (t.ment < 0 ? -MENT.back : t.ment * MENT.push) : -5 + (p.role === 'A' ? t.ment * MENT.stay : 0)), hz = f[1] * (att ? 1 : .8) + b.z * s * .28;
  if (p.role === 'D') hx = clamp(hx, -42, att ? 12 + t.ment * 8 : 3); // con la mentalità offensiva salgono anche i difensori
  else if (p.role === 'C') hx = clamp(hx, -34, 36 + Math.min(t.ment, 0) * MENT.hold); // con la difensiva i centrocampisti non salgono fino in fondo
  else { if (att) hx = Math.max(hx, Math.min(bx + 13, 43)); hx = clamp(hx, -14, 44); }
  const B = t.B || blocco(t); // dentro il blocco: difesa sulla linea, gli altri entro la sua lunghezza
  if (p.role === 'D') hx = B.linea + (f[0] + 33) * .5 + (att && Math.abs(f[1]) > 15 ? 5 + t.ment * 3 : 0); // in possesso i terzini salgono un po'
  else if (p.role === 'C') hx = clamp(hx, B.linea + 5, B.linea + B.lunga - 5);
  else hx = clamp(hx, B.linea + 10, B.linea + B.lunga + (att ? 10 : 4));
  hz *= B.largo;
  hx += Math.sin(G.t * .7 + p.i * 2.1) * 1.6; hz += Math.cos(G.t * .5 + p.i * 1.3) * 1.6;
  return [hx * s, clamp(hz, -HW + 3, HW - 3) * s];
}
// Quanta strada fa p verso (x, z) in t secondi: parte dalla velocità che ha in quella direzione e accelera fino alla massima
function portata(p, x, z, t) {
  const dx = x - p.x, dz = z - p.z, d = hyp(dx, dz) || 1, v0 = Math.max(-2, (p.vx * dx + p.vz * dz) / d), vm = p.maxV * 1.12, a = MOTO.CORPO.acc * .62;
  const tm = Math.max(0, (vm - v0) / a); return t < tm ? v0 * t + .5 * a * t * t : v0 * tm + .5 * a * tm * tm + vm * (t - tm);
}
function intercept(p) {
  if (airborne()) return landing();
  // il primo punto del percorso previsto (calcolato una volta per fotogramma in step) dove si arriva prima del pallone
  const b = G.ball, path = G.path || FIS.percorso(b, 2.4, .1); let q = path[path.length - 1];
  for (const pt of path) if (pt.y < AIR.stop && hyp(pt.x - p.x, pt.z - p.z) <= portata(p, pt.x, pt.z, pt.t) + .6) { q = pt; break; }
  return [clamp(q.x, -HL - 2, HL + 2), clamp(q.z, -HW - 2, HW + 2)];
}
function roles() {
  const b = G.ball, bx = b.x + b.vx * .3, bz = b.z + b.vz * .3;
  for (const t of G.teams) {
    let a = null, c = null, e = null, ad = 1e9, cd = 1e9, ed = 1e9;
    for (const p of t.players) {
      if (p.i === 0 || p.stun > 0 || userDrives(p) || p === b.owner) continue;
      const d = arrivo(p, bx, bz, 0) * 7; // in tempo (convertito in metri): chi è lanciato verso la palla arriva prima di chi è fermo
      if (d < ad) { e = c; ed = cd; c = a; cd = ad; a = p; ad = d; } else if (d < cd) { e = c; ed = cd; c = p; cd = d; } else if (d < ed) { e = p; ed = d; }
    }
    t.B = blocco(t); possesso(t, b.owner); t.chaser = a; t.chaserD = ad; t.cover = c; t.cover2 = t.ment < 0 ? e : null; t.offLine = offsideLine(t); // con la mentalità difensiva copre anche un secondo uomo
    if (!t.human) { const late = (G.half - 1) * HALF_SECS + G.clock > HALF_SECS * 1.2, d = t.score - t.opp.score; t.ment = late ? (d < 0 ? 1 : d > 0 ? -1 : 0) : 0; } // sotto nel finale attacca, sopra si copre
    // marcature: ogni difensore prende l'avversario più vicino alla sua zona; chi si inserisce allarga la zona e viene seguito anche dai centrocampisti
    for (const p of t.players) p.mark = p.linea = null;
    const own = b.owner; if (!own || own.team === t || G.state !== 'play') continue;
    const taken = new Set();
    for (const p of t.players) {
      if (p.i === 0 || p === a || p === c || p === t.cover2 || p.role === 'A' || p.stun > 0 || userDrives(p)) continue;
      const h = homeOf(p); let m = null, md = 9;
      for (const o of t.opp.players) {
        if (o.i === 0 || o === own || taken.has(o) || (p.role === 'C' && !o.run && t.ment >= 0)) continue; // con la mentalità difensiva marcano anche i centrocampisti
        const d = hyp(o.x - h[0], o.z - h[1]) - (o.run ? 5 : 0); if (d < md) { md = d; m = o; }
      }
      if (m) { p.mark = m; taken.add(m); }
    }
    // linee di passaggio: i due avversari liberi più pericolosi (vicini alla nostra porta) vengono schermati da chi è più vicino
    // alla linea tra loro e il portatore, tra quelli senza un altro compito
    const gx = -t.side * HL, pericolosi = t.opp.players.filter((o) => o.i && o !== own && !taken.has(o) && hyp(o.x - own.x, o.z - own.z) > 6)
      .sort((x, y) => hyp(gx - x.x, x.z) - hyp(gx - y.x, y.z)).slice(0, t.ment < 0 ? 2 : 1 + (t.ment > 0 ? 1 : 0));
    for (const o of pericolosi) {
      const mx = own.x + (o.x - own.x) * .42, mz = own.z + (o.z - own.z) * .42; let best = null, bd = 14;
      for (const p of t.players) { if (p.i === 0 || p === a || p === c || p === t.cover2 || p.mark || p.linea || p.stun > 0 || userDrives(p)) continue; const d = hyp(p.x - mx, p.z - mz); if (d < bd) { bd = d; best = p; } }
      if (best) best.linea = o;
    }
  }
}
function defLine(t) { // fin dove arriva l'ultimo difensore avversario, nel verso d'attacco di t
  const s = t.side; let l = G.ball.x * s; for (const o of t.opp.players) if (o.i) l = Math.max(l, o.x * s); return l;
}
function runScore(p, x, z, line) {
  const t = p.team, s = t.side, b = G.ball; let opp = 99, mate = 99;
  for (const o of t.opp.players) if (o.i) opp = Math.min(opp, hyp(o.x - x, o.z - z));
  for (const m of t.players) { if (m === p || m.i === 0) continue; const r = m.run; mate = Math.min(mate, hyp((r ? r.x : m.x) - x, (r ? r.z : m.z) - z)); }
  const dGoal = hyp(s * HL - x, z), dBall = hyp(x - b.x, z - b.z);
  // vicino alla porta, in uno spazio libero, lontano dai compagni, a distanza di passaggio, non oltre la linea dei difensori
  return (55 - dGoal) * .14 + Math.min(opp, 8) * .8 + Math.min(mate, 9) * .4 - Math.abs(dBall - 16) * .15 - Math.max(0, x * s - line - 3) * 1.2 + (x - p.x) * s * .1;
}
function runs(dt) {
  const b = G.ball, own = b.owner;
  for (const t of G.teams) {
    const has = G.state === 'play' && G.poss === t && (!own || own.team === t); let n = 0;
    for (const p of t.players) { const r = p.run; if (!r) continue; r.t -= dt; if (!has || r.t <= 0 || p.stun > 0 || own === p || userDrives(p)) p.run = null; else n++; }
    const rif = own || (G.intended && G.intended.team === t && G.lastPass && (G.intended.x - G.lastPass.x) * t.side > 3 ? G.intended : null); // anche mentre un passaggio in avanti è in volo: si parte in anticipo
    if (!has || !rif || rif.i === 0) continue;
    const s0 = t.side;
    if ((t.sovrT || 0) < G.t && Math.abs(rif.z) > 13 && rif.x * s0 > -8) { // sovrapposizione: il terzino di quel lato passa alle spalle dell'esterno e va sul fondo
      const lato = sgn(rif.z), fb = t.players.find((p) => p.role === 'D' && p.i && !p.run && sgn(p.z) === lato && Math.abs(p.z) > 8 && (rif.x - p.x) * s0 > 1 && (rif.x - p.x) * s0 < 26 && !userDrives(p) && p.stun <= 0);
      if (fb) { fb.run = { x: clamp(rif.x * s0 + 13, -HL, HL - 5) * s0, z: lato * (HW - 3.5), t: 3.4, g: 1, sovr: true }; G.stats.runs[t.idx]++; t.sovrT = G.t + 9; }
    }
    t.runT = (t.runT || 0) - dt; if (t.runT > 0 || n >= RUN.max + Math.min(t.ment, 0)) continue; t.runT = RUN.every * rnd(.7, 1.3) * (1 - MENT.runs * t.ment); // con la difensiva un solo inserimento alla volta
    const s = t.side, line = defLine(t); let best = null, bs = RUN.min, bx = 0, bz = 0;
    for (const p of t.players) {
      if (p.i === 0 || p === rif || p.run || p.role === 'D' || p.stun > 0 || userDrives(p)) continue;
      if (hyp(p.x - rif.x, p.z - rif.z) > 34 || (p.x - rif.x) * s < -8) continue;
      const ax = Math.min(p.x * s + RUN.depth, HL - 6, line + 4); if (ax - p.x * s < 5) continue;
      for (const k of [-1, 0, 1]) { // dritto, taglio dentro, taglio fuori
        const z = clamp(p.z + k * 8, -HW + 3, HW - 3), sc = runScore(p, ax * s, z, line) + rnd(1.5);
        if (sc > bs) { bs = sc; best = p; bx = ax * s; bz = z; }
      }
    }
    if (best) { best.run = { x: bx, z: bz, t: RUN.life, g: rnd(-.5, 2.2) }; G.stats.runs[t.idx]++; }
  }
}
// Il più vicino al portatore: si avvicina, temporeggia tenendosi tra lui e la porta, poi va sul pallone; in scivolata solo se serve
function chase(p, own, dt) {
  const t = p.team, s = t.side, gx = -s * HL, D = diffOf(p), b = G.ball, d = t.chaserD;
  let ux = gx - own.x, uz = -own.z; const threat = hyp(ux, uz) || 1; ux /= threat; uz /= threat;
  if (t.jWho !== p || t.jOwn !== own) { t.jWho = p; t.jOwn = own; t.jT = 0; }
  const beaten = (p.x - own.x) * ux + (p.z - own.z) * uz < -.4;
  if (p.slideCd <= 0 && own.shield <= 0 && own.i !== 0 && hyp(own.vx, own.vz) > 4.5 && (beaten || threat < 20)) {
    const px = b.x + own.vx * .35, pz = b.z + own.vz * .35, pd = hyp(px - p.x, pz - p.z); // dove sarà il pallone quando la gamba è tesa
    const dietro = URTO.daDietro(p, own) && threat > DEF.danger * .6; // da dietro rischia il fallo: lo tenta di rado, se non è un'emergenza
    if (pd > DEF.slide[0] && pd < DEF.slide[1] && rnd() < D.slide * dt * (dietro ? .25 : 1)) { p.dir = Math.atan2(px - p.x, pz - p.z); p.slideCd = 3.5; G.stats.slides[t.idx]++; return slide(p); }
  }
  if (d > DEF.far) t.jT = 0;
  else if (d > DEF.near && !beaten) {
    t.jT += dt; const c = t.cover;
    const go = threat < DEF.danger + (t.ment < 0 ? MENT.guard : 0) || t.jT > D.wait * (1 - MENT.press * Math.max(t.ment, 0)) || own.stun > 0 || (c && hyp(c.x - own.x, c.z - own.z) < 5.5);
    if (!go) { p.tx = own.x + own.vx * .3 + ux * DEF.hold; p.tz = own.z + own.vz * .3 + uz * DEF.hold; p.jock = true; return; }
  }
  p.tx = own.x + own.vx * .25 + (gx - own.x) * .05; p.tz = own.z + own.vz * .25 - own.z * .04; p.sprint = d > 3 || beaten;
}
function think(p, dt) {
  const b = G.ball, t = p.team, s = t.side, own = b.owner; p.sprint = false;
  if (G.state !== 'play') {
    if (G.state === 'goal') {
      const sc = G.scorer;
      if (sc && t === sc.team && p.i !== 0) { if (p === sc) { const c = G.cine; p.tx = c ? c.fx : sgn(sc.x) * (HL - 7); p.tz = c ? c.fz : sgn(sc.z || 1) * (HW - 7); } else { p.tx = sc.x - s * 1.5 + Math.sin(p.i * 2) * 1.6; p.tz = sc.z + Math.cos(p.i * 2) * 1.6; } p.sprint = true; }
      else if (p === G.delusoGol) { [p.tx, p.tz] = G.delusoPunto; } // il difensore deluso del primo piano resta dov'è
      else if (sc && t !== sc.team && G.stateT < GOLSEQ.fermi) { p.tx = p.x; p.tz = p.z; } // chi ha subito il gol si ferma: mani in testa
      else { const h = homeOf(p); p.tx = h[0]; p.tz = h[1]; }
    } else if (G.state === 'restart') {
      const fk = G.fk, w = fk && fk.wall && fk.wall.find((q) => q.p === p);
      if (p === G.taker) { const q = postoBattitore(p, b, .1); p.tx = q[0]; p.tz = q[1]; p.sprint = true; }
      else if (fk && fk.pen) { const q = penSpot(p); p.tx = q[0]; p.tz = q[1]; p.sprint = true; }
      else if (w) { p.tx = w.x; p.tz = w.z; p.sprint = true; }
      else if (fk && fk.pos && fk.pos.has(p)) { const q = fk.pos.get(p); p.tx = q[0]; p.tz = q[1]; p.sprint = true; }
      else if (p.i === 0) { p.tx = -s * (HL - 1.6); p.tz = clamp(b.z * .12, -2.6, 2.6); } // il portiere resta tra i pali
      else { const h = homeOf(p), far = fk ? FOUL.wall + .5 : 7.5; p.tx = h[0]; p.tz = h[1]; const d = hyp(p.tx - b.x, p.tz - b.z); if (d < far - .5 && t !== G.next) { p.tx = b.x + (p.tx - b.x) / (d || 1) * far; p.tz = b.z + (p.tz - b.z) / (d || 1) * far; } }
    } else { p.tx = p.x; p.tz = p.z; }
    return;
  }
  if (p.i === 0) return gkThink(p, dt);
  if (own === p) return ownerThink(p, dt);
  if (!own) {
    // sul cross chi attacca va incontro al pallone da più lontano
    if (p === G.intended || p === t.chaser || (G.land && hyp(G.land[0] - p.x, G.land[1] - p.z) < (G.lastKicker && G.lastKicker.team === t ? AIR.attacca : 4.5))) { const [ix, iz] = intercept(p); p.tx = ix; p.tz = iz; p.sprint = true; return; }
  } else if (own.team !== t) {
    // NON POSSESSO. Pressing: da dove si va sul portatore lo decide la mentalità (offensiva ovunque e in due, equilibrata
    // dalla metà campo, difensiva solo vicino alla propria area); più in là il primo uomo lo accompagna a distanza senza buttarsi
    const gx = -s * HL, bxT = own.x * s, pressa = t.ment > 0 || (t.ment < 0 ? bxT < -10 : bxT < PRESSING.da);
    p.stato = 'posizione';
    if (p === t.chaser && (!t.human || G.auto || t.chaserD < 15)) {
      if (pressa || t.chaserD < 4) { p.stato = 'pressing'; return chase(p, own, dt); }
      const dx = gx - own.x, dz = -own.z, d = hyp(dx, dz) || 1; p.tx = own.x + dx / d * 6.5; p.tz = own.z + dz / d * 6.5; p.jock = true; p.stato = 'accompagna'; return;
    }
    if (p === t.cover) {
      // secondo uomo: quando il primo è già sul portatore, il più vicino dopo di lui stringe dal lato della porta e chiude
      // l'uscita (Kickoff di Yuka: uno pressa, uno copre a breve distanza)
      const ch = t.chaser;
      if (pressa && ch && hyp(ch.x - own.x, ch.z - own.z) < PRESSING.primo && hyp(p.x - own.x, p.z - own.z) < PRESSING.raggio) {
        const ax = own.x - ch.x, az = own.z - ch.z, la = hyp(ax, az) || 1; // dall'altra parte rispetto al primo, verso la nostra porta
        const dx = gx - own.x, dz = -own.z, d = hyp(dx, dz) || 1;
        p.tx = own.x + own.vx * .3 + (ax / la * .6 + dx / d * .8) * PRESSING.stretto; p.tz = own.z + own.vz * .3 + (az / la * .6 + dz / d * .8) * PRESSING.stretto;
        p.sprint = true; p.stato = 'raddoppio'; return;
      }
      if (Math.abs(own.z) > HW - 12 && (pressa || bxT < 0)) { p.tx = own.x + own.vx * .3 - s * 1.6; p.tz = own.z + own.vz * .3 - sgn(own.z) * 1.4; p.sprint = true; p.stato = 'raddoppio'; return; } // sulla fascia: raddoppio, chiudendo il rientro verso il centro
      const dx = gx - own.x, dz = -own.z, d = hyp(dx, dz) || 1, k = Math.min(t.ment > 0 ? 2.5 : 7, d * .5); p.tx = own.x + dx / d * k; p.tz = own.z + dz / d * k; p.stato = t.ment > 0 ? 'pressing' : 'copertura'; p.sprint = t.ment > 0; return; // con l'offensiva il secondo uomo pressa anche lui
    }
    if (p === t.cover2) { const dx = gx - own.x, dz = -own.z, d = hyp(dx, dz) || 1, k = Math.min(MENT.cover, d * .7); p.tx = own.x + dx / d * k; p.tz = (own.z + dz / d * k) * .6; return; } // più indietro e più al centro
    const rientra = G.t - (t.persaT || -9) < 4; // appena persa palla: chi è davanti alla sua posizione rientra di corsa
    if (p.linea) { const r = p.linea, k = .42; p.tx = own.x + (r.x - own.x) * k; p.tz = own.z + (r.z - own.z) * k; p.stato = 'linea'; p.sprint = rientra; return; } // si mette sulla linea di passaggio verso l'avversario più pericoloso
    const m = p.mark;
    if (m) { const lead = m.run ? .35 : 0; p.tx = m.x + m.vx * lead + sgn(gx - m.x) * 2.8; p.tz = (m.z + m.vz * lead) * .92; p.sprint = !!m.run || rientra; p.stato = 'marcatura'; return; }
    const h = homeOf(p); p.tx = h[0]; p.tz = h[1]; if (rientra && (p.x - h[0]) * s > 6) { p.sprint = true; p.stato = 'rientro'; } return;
  }
  // finché il compagno ha palla si resta in linea coi difensori: lo scatto oltre la linea parte col passaggio
  // ogni tanto chi sta davanti si distrae e resta oltre la linea di qualche decina di centimetri (il fuorigioco esiste)
  if (!p.distrattoT || G.t > p.distrattoT) { p.distratto = p.role === 'A' && rnd() < CALCI.distratto ? rnd(...CALCI.oltre) : 0; p.distrattoT = G.t + rnd(2, 5); }
  const lim = own && own.team === t ? (t.offLine - .5 + (p.run && p.run.g || 0) + p.distratto) * s : null, onside = () => { if (lim !== null && p.tx * s > lim * s) p.tx = lim; };
  if (p.run) { p.tx = p.run.x; p.tz = p.run.z; p.sprint = true; p.stato = p.run.sovr ? 'sovrapposizione' : 'inserimento'; return onside(); }
  const h = homeOf(p); p.tx = h[0]; p.tz = h[1]; p.stato = 'posizione';
  if (own && own.team === t) { // POSSESSO
    if (p.area) { p.tx = p.area.x; p.tz = p.area.z; p.sprint = hyp(p.tx - p.x, p.tz - p.z) > 3; p.stato = 'area'; return onside(); } // il cross sta per arrivare: ognuno al suo posto in area
    if (p === t.sostegno) { // il più vicino si offre per lo scarico, dove la linea di passaggio è pulita
      if (!p.sost || G.t > p.sostT) { p.sost = puntoSostegno(p, own); p.sostT = G.t + .4; }
      p.tx = p.sost.x; p.tz = p.sost.z; p.stato = 'sostegno'; return onside();
    }
    if (p.role !== 'D' && hyp(p.x - own.x, p.z - own.z) < 34) { // gli altri cercano spazio libero vicino alla loro posizione
      if (!p.smarca || G.t > p.smarcaT) { p.smarca = puntoLibero(p, own, h); p.smarcaT = G.t + .5 + rnd(.25); }
      p.tx = p.smarca.x; p.tz = p.smarca.z; p.stato = 'smarcamento';
    }
    onside();
    const d = hyp(p.tx - own.x, p.tz - own.z); if (d < 6) { p.tx += (p.tx - own.x) / (d || 1) * 5; p.tz += (p.tz - own.z) / (d || 1) * 5 + sgn(p.z - own.z) * 3; }
    return;
  }
  onside();
}
// Dove offrirsi per lo scarico: a 9-13 metri dal portatore, di lato o un po' dietro (davanti la linea di solito è chiusa),
// nel punto più libero con la linea di passaggio pulita
function puntoSostegno(p, own) {
  const s = p.team.side; let best = { x: p.x, z: p.z }, bs = -1e9;
  for (const r of [9, 13]) for (const a of [-125, -80, -40, 40, 80, 125]) {
    const ang = Math.atan2(s, 0) + a * Math.PI / 180, x = clamp(own.x + Math.sin(ang) * r, -HL + 2, HL - 2), z = clamp(own.z + Math.cos(ang) * r, -HW + 2, HW - 2);
    const sc = Math.min(liberoIn(p.team, x, z), 8) - (laneBlocked(own, p, x, z) ? 8 : 0) - hyp(x - p.x, z - p.z) * .12 + (x - own.x) * s * .12;
    if (sc > bs) { bs = sc; best = { x, z }; }
  }
  return best;
}
// Smarcamento: il punto più libero intorno alla propria posizione, raggiungibile da un passaggio pulito
function puntoLibero(p, own, h) {
  const s = p.team.side; let best = { x: h[0], z: h[1] }, bs = -1e9;
  for (const [dx, dz] of [[0, 0], [5, 0], [-5, 0], [0, 5], [0, -5], [4, 4], [4, -4], [-4, 4], [-4, -4]]) {
    const x = clamp(h[0] + dx * s, -HL + 2, HL - 2), z = clamp(h[1] + dz, -HW + 2, HW - 2);
    const sc = Math.min(liberoIn(p.team, x, z), 9) - (laneBlocked(own, p, x, z) ? 5 : 0) - hyp(dx, dz) * .15 + dx * .05;
    if (sc > bs) { bs = sc; best = { x, z }; }
  }
  return best;
}
// In possesso, ogni passo: chi va in area per il cross (primo palo, secondo palo, dischetto, limite) e chi fa da sostegno
function possesso(t, own) {
  const s = t.side; for (const p of t.players) p.area = null; t.sostegno = null;
  if (!own || own.team !== t || own.i === 0) return;
  // in area per il cross dalla fascia, o (Dream League) quando il compagno conduce verso l'area: 3-4 compagni si inseriscono
  const largo = own.x * s > HL - 34 && Math.abs(own.z) > 9, punta = own.x * s > HL - AREA_IA.da && own.vx * s > AREA_IA.corsa;
  if (largo || punta) {
    if (t.areaDi !== own) { t.areaDi = own; t.areaN = rnd() < .5 ? AREA_IA.quanti[0] : AREA_IA.quanti[1]; } // quanti, deciso a ogni nuovo portatore
    const lato = sgn(own.z) || 1, liberi = t.players.filter((p) => p.i && p !== own && !p.run && p.role !== 'D' && !userDrives(p) && p.stun <= 0);
    for (const [x, z] of [[HL - 6, lato * 2.5], [HL - 7.5, -lato * 4], [HL - 11, 0], [HL - 17, -lato * 3]].slice(0, largo ? 4 : t.areaN)) {
      let best = null, bd = 45; for (const p of liberi) { if (p.area) continue; const d = hyp(p.x - x * s, p.z - z); if (d < bd) { bd = d; best = p; } }
      if (best) best.area = { x: x * s, z };
    }
  }
  let sup = null, sd = 22; for (const p of t.players) { if (p.i === 0 || p === own || p.run || p.area || userDrives(p) || p.stun > 0) continue; const d = hyp(p.x - own.x, p.z - own.z); if (d < sd) { sd = d; sup = p; } }
  t.sostegno = sup;
}
/**
 * Quanto vale un tiro da dove sta p (0..1): l'angolo con cui vede la porta, la distanza, quanti avversari stanno nel cono
 * tra pallone e porta. E dove mirare: nell'angolo più lontano dal portiere.
 */
function valoreTiro(p) {
  const s = p.team.side, gx = s * HL, o = piede(p), dx = (gx - o.x) * s; if (dx < 1.5) return { q: 0, tz: 0 };
  const ang = Math.abs(Math.atan2(GH - o.z, dx) - Math.atan2(-GH - o.z, dx)), d = hyp(dx, o.z);
  let muro = 0; for (const q of p.team.opp.players) { if (q.i === 0) continue; const qx = (q.x - o.x) * s; if (qx < .5 || qx > dx) continue; const zc = o.z + (0 - o.z) * qx / dx, w = .9 + GH * qx / dx; if (Math.abs(q.z - zc) < w) muro++; }
  const gk = p.team.opp.players[0], lato = gk && Math.abs(gk.z - GH) > Math.abs(gk.z + GH) ? 1 : -1;
  const q = clamp((ang - .1) / .55, 0, 1) * clamp((32 - d) / 20, 0, 1) * Math.pow(.75, muro);
  return { q, tz: lato * GH * rnd(.55, .85), d };
}
/**
 * Dove portare palla: si provano nove direzioni attorno a quella della porta (e indietro se si è pressati) e si sceglie lo
 * spazio migliore 5 metri più in là: avanzare conta, ma conta di più arrivarci prima degli avversari e restare in campo.
 */
function conduzione(p, pressato) {
  const s = p.team.side, base = Math.atan2(s * HL - p.x, -p.z * .35); let best = null, bs = -1e9;
  for (let k = -4; k <= 4; k++) {
    const a = base + k * (pressato ? .45 : .3), ux = Math.sin(a), uz = Math.cos(a), x = p.x + ux * 5, z = p.z + uz * 5;
    if (Math.abs(z) > HW - 1.5 || Math.abs(x) > HL - .5) continue;
    let anticipo = 9; const mio = arrivo(p, x, z, 0); for (const q of p.team.opp.players) anticipo = Math.min(anticipo, arrivo(q, x, z) - mio);
    const vicino = p.x * s > HL - 32 ? Math.max(0, 8 - Math.abs(z) * .5) * Math.max(0, ux * s) : 0; // negli ultimi 30 metri: puntare l'area, verso il centro
    const sc = ux * s * (pressato ? 3 : 8) + clamp(anticipo, -1, 1) * 9 + Math.min(liberoIn(p.team, x, z), 6) * .8 - Math.abs(k) * .3 + vicino;
    if (sc > bs) { bs = sc; best = { ux, uz, sc }; }
  }
  return best || { ux: s, uz: 0, sc: 0 };
}
function ownerThink(p, dt) {
  if (p.carica) return; // sta già calciando
  p.hold += dt;
  const t = p.team, s = t.side, D = diffOf(p);
  if (p.fkShot) { // punizione diretta: fermo sul pallone, poi tiro sopra la barriera
    p.tx = p.x; p.tz = p.z; p.thinkT -= dt; if (p.thinkT > 0) return; p.fkShot = false;
    return shoot(p, sgn(rnd(-1, 1)) * GH * rnd(.5, .9), rnd(.62, .8), D.err);
  }
  if (G.rimessa && G.rimessa.chi === p) { // rimessa laterale: fermo sulla linea, poi lancia con le mani al compagno migliore entro 28 m
    p.tx = p.x; p.tz = p.z; p.thinkT -= dt; if (p.thinkT > 0) return;
    let m = bestPass(p); if (!m || hyp(m.x - p.x, m.z - p.z) > RIMESSA.max) { let bd = 1e9; for (const o of t.players) { if (o === p || o.i === 0) continue; const d = hyp(o.x - p.x, o.z - p.z), sc = d - Math.min(openness(o), 6) * 2; if (d > 4 && d < RIMESSA.max && sc < bd) { bd = sc; m = o; } } }
    if (m) return lanciaRimessa(p, m); p.thinkT = .3; return;
  }
  if (p.cornerKick) { // calcio d'angolo: fermo sul pallone, poi traversone
    p.tx = p.x; p.tz = p.z; p.thinkT -= dt; if (p.thinkT > 0) return; p.cornerKick = false;
    const m = crossTarget(p) || bestPass(p); if (m) return (canCross(p) && m.x * s > HL - 19 ? cross : pass)(p, m); return;
  }
  // pressione: fra quanto il primo avversario arriva sul pallone
  let press = 9; for (const o of t.opp.players) press = Math.min(press, arrivo(o, p.x, p.z, .05));
  // tra una decisione e l'altra si porta palla nella direzione scelta (aggiornata a ogni decisione)
  const dir = p.conduci || (p.conduci = conduzione(p, press < .6));
  p.tx = p.x + dir.ux * 8; p.tz = clamp(p.z + dir.uz * 8, -HW + 1.5, HW - 1.5); p.sprint = press > .5 && dir.ux * s > .3;
  if (p.x * s > HL - TENUTA.area) p.thinkT = Math.min(p.thinkT, TENUTA.inArea); // negli ultimi metri si decide in fretta: il tiro non aspetta
  p.thinkT -= dt; if (p.thinkT > 0) return; p.thinkT = D.think * rnd(...TENUTA.pensa) * (press < .6 ? .5 : 1); // sotto pressione si decide prima
  p.conduci = conduzione(p, press < .6);
  const tiro = valoreTiro(p), errore = D.err * (1 + (1 - clamp(press, 0, 1)) * .5);
  // si tira con una buona occasione, prima se pressati, sempre da vicino; e ogni tanto anche da fuori
  if (tiro.q > .22 || (tiro.q > .12 && press < .7) || (tiro.q > .05 && tiro.d < 16) || (tiro.q > .05 && tiro.d < 27 && rnd() < .3)) { const f = tiro.d < 13 ? rnd(.5, .68) : rnd(.68, .84); return prepara(p, 'calcia', s * HL, tiro.tz, () => shoot(p, tiro.tz, f, errore * 1.1), f > .7); }
  if (canCross(p) && rnd() < AIR.cross * 1.4) { const m = crossTarget(p); if (m && openness(m) > 1.4) return prepara(p, 'lancia', m.x, m.z, () => cross(p, m)); }
  const m = bestPass(p), sp = bestPass.punteggio, cd = p.conduci;
  // valore del portare palla: lo spazio trovato, meno la pressione; vicino alla porta avversaria conviene giocarla
  const portare = cd.sc + (press > 1.5 ? 9 : press > 1 ? 5 : press > .6 ? 0 : -10) - (p.x * s > HL - 12 ? 6 : 0);
  const soglia = TENUTA.soglia + (p.hold < TENUTA.appena ? TENUTA.diPrima : 0);
  if (m && (sp > portare + soglia || (press < TENUTA.addosso && sp > TENUTA.scarico))) return prepara(p, 'passa', m.x, m.z, () => pass(p, m));
}
/**
 * Il portiere con la palla in mano. Appena la prende decide come rimetterla in gioco: lancio con le mani a un compagno
 * libero e vicino (palla tesa e bassa, che arriva sui piedi) oppure rinvio lungo di collo pieno verso i compagni più
 * avanti. Intanto fa qualche passo verso il limite dell'area (dentro), poi parte l'animazione e la palla esce dalle
 * mani proprio quando il braccio, o il piede, arriva in fondo. Se è il portiere dell'utente, Passa e Cross anticipano
 * (lancio verso la levetta, o rinvio lungo).
 */
function scegliRinvio(p, tipo, dir) {
  const t = p.team, s = t.side; let m = null, bs = -1e9;
  if (tipo !== 'piede') for (const o of t.players) { // a chi lanciarla con le mani: libero, entro 30 m, il passaggio arriva
    if (o.i === 0 || o.stun > 0) continue; const dx = o.x - p.x, dz = o.z - p.z, d = hyp(dx, dz); if (d < 6 || d > RINVIO.corto) continue;
    if (dir && (dx * dir[0] + dz * dir[1]) / d < .5) continue;
    let mg = 9; for (const q of t.opp.players) mg = Math.min(mg, arrivo(q, o.x, o.z) - d / 15);
    const sc = clamp(mg, -1, 1.5) * 10 + Math.min(openness(o), 8) + dx * s * .1 - d * .08; if (sc > bs) { bs = sc; m = o; }
  }
  if (m && (bs > 4 || tipo === 'mano' || dir)) return { tipo: 'mano', m };
  // rinvio lungo: verso il compagno più libero nella metà campo avversaria (o il più avanzato)
  let lm = null, ls = -1e9; for (const o of t.players) { if (o.i === 0) continue; const sc = o.x * s + Math.min(openness(o), 8) * 2 + (dir ? ((o.x - p.x) * dir[0] + (o.z - p.z) * dir[1]) / (hyp(o.x - p.x, o.z - p.z) || 1) * 20 : 0); if (sc > ls) { ls = sc; lm = o; } }
  return { tipo: 'piede', m: lm };
}
function gkTiene(p, dt) {
  const t = p.team, s = t.side, gx = -s * HL;
  if (!p.rinvio) p.rinvio = { ...scegliRinvio(p), quando: rnd(...RINVIO.attesa) * (t.human ? 1.3 : 1), anim: false };
  // finché è a terra (presa in tuffo) e mentre si rialza il tempo non corre: il rinvio sopra la posa sdraiata la mescolava
  // a quella in piedi e il corpo finiva mezzo metro sotto l'erba (e veniva sollevato di altrettanto)
  const r = p.rinvio; if (p.st !== 'down' && p.st !== 'dive' && !A_TERRA_GF.test(p.fx || '')) p.hold += dt;
  // qualche passo in avanti, verso il lato dove andrà la palla, senza uscire dall'area
  const zv = r.m ? clamp(r.m.z * .25, -9, 9) : clamp(p.z, -6, 6); p.tx = gx + s * Math.min(RINVIO.limite, 5 + p.hold * 3); p.tz = zv; p.sprint = false;
  if (r.m) { const a = Math.atan2(r.m.x - p.x, r.m.z - p.z); if (p.hold > r.quando - .9) p.dir = a; } // si gira verso dove la lancia
  const anticipo = r.tipo === 'mano' ? RINVIO.braccio : RINVIO.piede;
  if (!r.anim && p.hold >= r.quando - anticipo) { r.anim = true; azione(p, r.tipo === 'mano' ? 'rinvio' : 'tiro'); }
  if (p.hold >= r.quando) { rilasciaPortiere(p, r); p.rinvio = null; p.hold = 0; }
}
function rilasciaPortiere(p, r) {
  const b = G.ball, m = r.m || p.team.players[1], s = p.team.side; b.owner = null;
  let v;
  if (r.tipo === 'mano') { // lancio teso e basso dalle mani, sui piedi (o un passo avanti se corre)
    const tx = m.x + m.vx * .45, tz = m.z + m.vz * .45, d = hyp(tx - b.x, tz - b.z), T = clamp(d / 23, .4, 1.25);
    v = FIS.mira({ x: b.x, y: b.y, z: b.z }, { x: tx, y: .3, z: tz }, T, 0, 0); AU.calcio(9, 'passaggio');
  } else { // rinvio di collo: la palla cade dalle mani e parte alta e lunga
    b.y = Math.max(.8, b.y * .5); const tx = clamp(m.x + m.vx * 1.2 + s * 4, -HL + 3, HL - 3), tz = clamp(m.z, -HW + 3, HW - 3), d = hyp(tx - b.x, tz - b.z), T = clamp(d / 21, 1.3, 2.8);
    v = FIS.mira({ x: b.x, y: b.y, z: b.z }, { x: tx, y: PARATA.rinvio, z: tz }, T, 0, .1); AU.calcio(28, 'rinvio');
  }
  b.vx = v.vx; b.vy = clamp(v.vy, -2, 16); b.vz = v.vz; b.c = 0; b.t = r.tipo === 'piede' ? .1 : 0; b.resto = 0;
  G.calcioT = G.t; p.cool = .5; G.lastTouch = G.lastKicker = p; G.intended = m; G.lastPass = p; p.s.pa++; G.poss = p.team;
  if (p.team.human) setCtrl(m);
}
/** Il portiere dell'utente con la palla in mano: Passa lancia con le mani verso la levetta, Cross calcia lungo. */
function comandaPortiere(tipo) {
  const b = G.ball, p = b.owner; if (!p || p.i !== 0 || !p.team.human || G.state !== 'play') return false;
  const [jx, jz] = inputWorld(), l = hyp(jx, jz), dir = l > .3 ? [jx / l, jz / l] : null, sc = scegliRinvio(p, tipo, dir);
  p.rinvio = { ...sc, quando: p.hold + (sc.tipo === 'mano' ? RINVIO.braccio : RINVIO.piede), anim: false }; return true;
}
function gkThink(p, dt) {
  const b = G.ball, t = p.team, s = t.side, gx = -s * HL, own = b.owner;
  if (own === p) return gkTiene(p, dt);
  const toward = b.vx * -s, abilita = p.team.human ? MATE.save : G.diff.save;
  // TIRO: prima un attimo di reazione (più corto per i più bravi), poi si sposta sul punto in cui il pallone passerà sulla
  // sua linea (calcolato con aria ed effetto, quindi segue la curva) e, se non ci arriva coi passi, si tuffa
  if (p.tiroVisto !== G.shotId) { p.tiroVisto = G.shotId; const R = PORTIERE.reazione; p.reagisce = G.t + R[1] - (R[1] - R[0]) * clamp((abilita - .55) / .35, 0, 1); } // Dream League: entro 0,3 s
  if (!own && toward > 8) {
    const a = FIS.attraversa(b, p.x, 1.6), tt = a ? a.t : -1;
    if (tt > 0 && tt < 1.6 && Math.abs(a.z) < GH + 2.5) {
      if (G.t < p.reagisce && G.shooter) { p.tx = p.x; p.tz = p.z; return; } // sta ancora leggendo il tiro
      const zp = a.z; p.tx = p.x; p.tz = clamp(zp, -GH - .6, GH + .6); p.sprint = true; p.tiroY = a.y;
      // non si tuffa di nuovo mentre si rialza: la posa sdraiata mescolata al tuffo nuovo sollevava il corpo di mezzo metro
      if (tt < .45 && Math.abs(zp - p.z) > 1 && p.st === 'run' && !/^rialza/.test(p.fx || '')) { p.st = 'dive'; p.stT = 0; p.diveS = sgn(zp - p.z); p.diveV = clamp(Math.abs(zp - p.z) / Math.max(tt, .22), 4, 10); p.fx = null; if (!parata(p, tt, zp - p.z, a.y)) azione(p, -p.diveS * Math.sin(p.dir) > 0 ? 'tuffoS' : 'tuffoD'); }
      else if (Math.abs(zp - p.z) <= 1 && p.st === 'run' && !p.fx && tt < .2) parata(p, tt, zp - p.z, a.y); // al centro: la presa, a tempo col pallone
      return;
    }
  }
  const dB = hyp(b.x - gx, b.z), out = PORTIERE.linea;
  // CROSS e ANGOLI: legge dove scende il pallone all'altezza delle sue mani e quando. Esce solo se ci arriva in tempo e prima
  // degli attaccanti, dentro l'area
  if (airborne() && toward < 15) {
    const l = FIS.atterraggio(b, 2.3, 3);
    if (l && (l.x - gx) * s < 10.5 && (l.x - gx) * s > -.5 && Math.abs(l.z) < 11.5) {
      const io = tempoA(p, l.x, l.z); let loro = 9; for (const o of t.opp.players) if (o.i) loro = Math.min(loro, tempoA(o, l.x, l.z));
      if (io <= l.t + .15 && io < loro + .03) { p.tx = l.x; p.tz = l.z; p.sprint = true; p.esce = true; if (p.uscitaDi !== G.calcioT) { p.uscitaDi = G.calcioT; G.stats.uscite[t.idx]++; } return; }
    }
  }
  p.esce = false;
  if (!own && dB < 17 && Math.abs(b.z) < 19 && hyp(b.vx, b.vz) < 9) { // palla vagante in area: esce
    let od = 99; for (const o of t.opp.players) od = Math.min(od, hyp(o.x - b.x, o.z - b.z));
    if (hyp(p.x - b.x, p.z - b.z) < od + 1) { p.tx = b.x; p.tz = b.z; p.sprint = true; return; }
  }
  // Come Dream League: sulla linea (PORTIERE.linea), seguendo il pallone di lato. Quando l'attaccante col pallone entra in
  // area esce verso il palo vicino; se è da solo e ormai addosso, va sul pallone
  if (own && own.team !== t && (own.x - gx) * s < PORTIERE.area && Math.abs(own.z) < 20.2) {
    let dd = 99; for (const m of t.players) if (m.i) dd = Math.min(dd, hyp(m.x - own.x, m.z - own.z));
    if (dd > 3.5 && dB < 8.5) { p.tx = own.x + own.vx * .25 - s * .6; p.tz = own.z + own.vz * .25; p.sprint = true; return; }
    const lato = sgn(own.z) || 1; p.tx = gx + s * PORTIERE.palo[0]; p.tz = lato * (GH - PORTIERE.palo[1]); return;
  }
  // POSIZIONE: sulla bisettrice dell'angolo tra pallone e pali, a `out` metri dalla linea di porta (così copre allo stesso modo
  // i due lati della porta, anche quando il pallone è defilato)
  const u1x = gx - b.x, u1z = -GH - b.z, u2x = gx - b.x, u2z = GH - b.z, l1 = hyp(u1x, u1z) || 1, l2 = hyp(u2x, u2z) || 1;
  const bx = u1x / l1 + u2x / l2, bz = u1z / l1 + u2z / l2, X = gx + s * out;
  if (Math.abs(bx) > .05) { const L = (X - b.x) / bx; p.tx = X; p.tz = clamp(b.z + bz * L, -GH + .4, GH - .4); }
  else { p.tx = X; p.tz = clamp(b.z * .2, -GH + .4, GH - .4); }
  if ((p.tx - gx) * s < .8) p.tx = gx + s * .8;
}

/* ------------------------------------------------------------------ passo di simulazione */
function step(dt) {
  G.t += dt; G.stateT += dt; const b = G.ball; if (!b) return;
  if (G.state === 'play') {
    if (G.charge >= 0) { if (G.ball.owner !== G.ctrl) G.charge = -1; else { G.charge += dt; if (G.charge > CARICA.max) rilascia(); } } // persa la palla, la carica si annulla
    if (G.so) soStep(dt);
    else {
      G.clock += dt; if (G.poss) G.stats.poss[G.poss.idx] += dt;
      if (G.clock >= HALF_SECS) {
        if (G.half === 1) { setState('half'); banner('Intervallo', `${G.teams[0].club.short} ${G.teams[0].score} - ${G.teams[1].score} ${G.teams[1].club.short}`, 2300); AU.fischio('intervallo'); }
        else if (G.comp && G.comp.rigori && G.teams[0].score === G.teams[1].score) startShootout();
        else { setState('full'); banner('Fine partita', '', 1800); AU.fischio('fine'); }
      }
    }
  } else if (G.state === 'kickoff') { if (G.stateT > 1.2) { gain(G.taker); G.taker.thinkT = .2; setState('play'); } }
  else if (G.state === 'goal') { if (G.stateT > (G.goalEnd || 4.2)) kickoff(G.next); } // G.goalEnd lo allunga la regia quando c'è la sequenza del gol
  else if (G.state === 'restart') {
    // si batte quando il battitore è sul pallone, gli avversari sono alla distanza giusta e chi ha un posto (barriera, area
    // sul calcio d'angolo, posto sul rigore) ci è arrivato correndo. Si aspetta al massimo tre secondi in più, sette sul
    // rigore (chi lo batte può essere dall'altra parte del campo), ma sempre col battitore sul pallone. Prima venivano
    // spostati di colpo, anche di 4 metri, e si vedeva il salto: ora allo scadere si sistema solo chi è a pochi centimetri.
    const accanto = () => { const k = G.taker; if (!k) return false; const q = postoBattitore(k, b); return hyp(k.x - q[0], k.z - q[1]) <= .45; };
    const pronti = () => { const k = G.taker, fk = G.fk, far = fk ? FOUL.wall : 6; if (!accanto()) return false;
      if (fk && fk.pen) return all().every((o) => o === k || hyp(o.x - penSpot(o)[0], o.z - penSpot(o)[1]) < .6); // rigore: tutti al loro posto
      if (fk && fk.wall && fk.wall.some((w) => hyp(w.p.x - w.x, w.p.z - w.z) > .5)) return false;
      if (fk && fk.pos) for (const [o, q] of fk.pos) if (hyp(o.x - q[0], o.z - q[1]) > 1) return false;
      return !k.team.opp.players.some((o) => !(fk && fk.wall && fk.wall.some((w) => w.p === o)) && hyp(o.x - b.x, o.z - b.z) < far); };
    const sposta = (o, x, z) => { if (hyp(o.x - x, o.z - z) < .45) { o.x = x; o.z = z; o.vx = o.vz = 0; } };
    if (G.stateT > G.wait && (pronti() || (G.stateT > G.wait + (G.fk && G.fk.pen ? 7 : 3) && accanto()) || G.stateT > G.wait + 15)) { // dopo 15 s si batte comunque
      const k = G.taker, fk = G.fk, q = postoBattitore(k, b); k.x = q[0]; k.z = q[1]; k.vx = k.vz = 0; if (G.rimessa) k.dir = Math.atan2(0, -sgn(b.z)); // la rimessa: rivolto verso il campo
      if (fk && fk.pen) { // rigore: tutti fuori dall'area, portiere sulla linea
        for (const o of all()) if (o !== k) { const q = penSpot(o); sposta(o, q[0], q[1]); }
        gain(k); k.shield = 9; G.pen = true; setState('play');
        if (userDrives(k)) { G.penWait = 6; banner('', 'Mira con la levetta e tira', 2200); }
        else shoot(k, sgn(rnd(-1, 1)) * GH * rnd(.5, .88), rnd(.58, .78), diffOf(k).err * .8);
      } else {
        const far = fk ? FOUL.wall : 6;
        if (fk && fk.wall) for (const w of fk.wall) sposta(w.p, w.x, w.z);
        if (fk && fk.pos) for (const [o, q] of fk.pos) sposta(o, q[0], q[1]);
        for (const o of k.team.opp.players) { if (fk && fk.wall && fk.wall.some((w) => w.p === o)) continue; const d = hyp(o.x - b.x, o.z - b.z); if (d < far) sposta(o, b.x + (o.x - b.x) / (d || 1) * far, b.z + (o.z - b.z) / (d || 1) * far); }
        gain(k); k.shield = 1; setState('play'); if (G.rimessa) k.thinkT = rnd(...RIMESSA.pensa) * diffOf(k).think / .4; // la rimessa si batte presto
        if (fk && fk.direct && !userDrives(k)) { k.fkShot = true; k.thinkT = .45; k.shield = 1.5; }
        if (fk && fk.corner && !userDrives(k)) { k.cornerKick = true; k.thinkT = .4; k.shield = 1.5; }
      }
      G.fk = null;
    }
  } else if (G.state === 'half') { if (G.stateT > 2.6) { G.half = 2; G.clock = 0; for (const p of all()) { p.fondo = Math.min(1, (p.fondo || 1) + .08); p.en = Math.min(p.fondo, p.en + MOTO.FATICA.intervallo); } for (const t of G.teams) t.side = -t.side; kickoff(G.teams[1]); } } // cambio di campo
  else if (G.state === 'full') { if (G.stateT > 2 && !G.shown) { G.shown = true; showEnd(); } }
  // a gioco fermo (palle ferme, dopo un gol, calcio d'inizio) il cronometro va più piano: RITMO.fermo invece di RITMO.gioco
  if ((G.state === 'restart' || G.state === 'goal' || G.state === 'kickoff') && !G.so && !G.rivede) G.clock = Math.min(HALF_SECS - .05, G.clock + dt * RITMO.fermo / RITMO.gioco);
  // all'intervallo e a fine partita il pallone che esce dal campo si ferma: prima rotolava fino in tribuna
  if ((G.state === 'half' || G.state === 'full') && (Math.abs(b.z) > HW + 1.5 || Math.abs(b.x) > HL + 2.5)) { b.vx *= .8; b.vz *= .8; }

  if (G.penWait > 0) { // rigore dell'utente: tutti fermi finché non tira; se aspetta troppo parte da solo
    const k = G.taker; G.penWait -= dt;
    if (G.state !== 'play' || b.owner !== k) G.penWait = 0;
    else if (G.penWait <= 0) { G.charge = -1; shoot(k, sgn(rnd(-1, 1)) * GH * .7, .7, 1); }
  }
  roles(); runs(dt); G.land = airborne() ? landing() : null; G.path = G.ball && !G.ball.owner ? FIS.percorso(G.ball, 2.4, .1) : null;
  const ps = all();
  for (const p of ps) {
    p.cool -= dt; p.stun -= dt; p.shield -= dt; p.slideCd -= dt; p.sbil -= dt; p.jock = false;
    if (G.penWait > 0 || (G.so && G.state === 'play' && !(p === G.so.gk && G.so.fase === 'tiro'))) { p.tx = p.x; p.tz = p.z; p.sprint = false; } // ai rigori si muove solo il portiere
    else if (!userDrives(p) || G.state !== 'play') { think(p, dt); dosa(p); } else userThink(p);
  }
  for (const p of ps) movePlayer(p, dt);
  for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) { // non si attraversano; tra avversari in corsa è un duello spalla a spalla
    const a = ps[i], c = ps[j], dx = c.x - a.x, dz = c.z - a.z, d = hyp(dx, dz);
    if (a.team !== c.team && G.state === 'play' && !(G.rimessa && (G.rimessa.chi === a || G.rimessa.chi === c)) && a.st !== 'down' && c.st !== 'down' && a.st !== 'slide' && c.st !== 'slide') { const r = URTO.duello(a, c, dt); if (r && r.perde) spallata(r); continue; }
    if (d < .8 && d > .001) { const k = (.8 - d) / 2 / d; a.x -= dx * k; a.z -= dz * k; c.x += dx * k; c.z += dz * k; }
  }
  moveBall(dt); palloneInMano();
  if (G.state === 'play') { scivolate(); if (G.state === 'play') contacts(dt); if (G.state === 'play') bounds(); }
  // cambio automatico se il giocatore scelto resta lontano e fermo
  if (G.state === 'play' && G.ctrl && !G.auto && b.owner !== G.ctrl) {
    const c = G.ctrl, l = hyp(G.in.jx, G.in.jy); G.idle = l > .2 ? 0 : G.idle + dt;
    if (G.idle > 1.2 && hyp(c.x - b.x, c.z - b.z) > 22 && G.intended !== c) { const m = migliorDifensore(G.teams[0]); if (m && m.p !== c) setCtrl(m.p); }
  }
}
function dosa(p) {
  if (!p.sprint || G.state !== 'play' || p.i === 0 || p === G.intended || p === p.team.chaser || (G.ball && p === G.ball.owner)) return;
  if (p.en < RISERVA.soglia || (p.riserva && p.en < RISERVA.riparte)) { p.sprint = false; p.riserva = true; } else p.riserva = false;
}
function userThink(p) {
  // lo scatto parte da solo con la levetta spinta fino al bordo (come Dream League: non c'è un tasto)
  const b = G.ball, [ix, iz] = inputWorld(), l = hyp(ix, iz); p.sprint = l >= LEVETTA.scatto;
  // Pressing (tasto B tenuto senza palla): va addosso al portatore, dove sarà fra un attimo: il contrasto in piedi lo
  // decide contacts() quando è abbastanza vicino. Col pallone libero va a prenderlo.
  if (G.in.pressing && G.state === 'play' && !modoAttacco()) {
    const o = b.owner;
    if (o && o.team !== p.team) { const d = hyp(o.x - p.x, o.z - p.z), k = PRESSIONE.anticipo; p.tx = o.x + o.vx * k; p.tz = o.z + o.vz * k; p.user = 1; p.sprint = d > PRESSIONE.vicino; return; }
    if (!o) { const [x, z] = intercept(p); p.tx = x; p.tz = z; p.user = 1; p.sprint = true; return; }
  }
  // la palla arriva a lui (passaggio, o palla libera a pochi metri che gli viene incontro): ci va incontro da solo, a tempo;
  // la levetta sposta solo un po' il punto d'incontro (per ricevere in corsa nella direzione voluta)
  const arriva = !b.owner && G.state === 'play' && (p === G.intended || (hyp(p.x - b.x, p.z - b.z) < 4.5 && ((p.x - b.x) * b.vx + (p.z - b.z) * b.vz > 0 || hyp(b.vx, b.vz) < 3)));
  if (arriva) { const [x, z] = intercept(p), k = l > .15 ? 1.4 / l : 0; p.tx = x + ix * k; p.tz = z + iz * k; p.user = 1; p.sprint = true; }
  else if (l > .15) { const k = 1 / l; p.tx = p.x + ix * k * 6; p.tz = p.z + iz * k * 6; p.user = Math.min(1, l); } // la direzione dalla levetta, la velocità da quanto è inclinata (vedi andatura)
  else if (!b.owner && hyp(p.x - b.x, p.z - b.z) < 9) { const [x, z] = intercept(p); p.tx = x; p.tz = z; p.user = 1; p.sprint = true; }
  else { p.tx = p.x; p.tz = p.z; p.user = 0; }
}
function movePlayer(p, dt) {
  const b = G.ball; p.stT += dt; p.ritmo = false;
  if (p.st === 'kick' && p.stT > .32) p.st = 'run';
  if (p.st === 'slide') { const k = URTO.velScivolata(p.slideV0 || URTO.SCIVOLATA.v0, p.stT); if (p.stT < .55 && rnd() < dt * 30) { const fx = Math.sin(p.dir), fz = Math.cos(p.dir); PART.emetti('erba', p.x + fx * .9, .05, p.z + fz * .9, 2, k * .35, fx, fz); if (rnd() < .5) PART.emetti('polvere', p.x + fx * .6, .1, p.z + fz * .6, 1, 1.2, fx, fz); } p.vx = Math.sin(p.dir) * k; p.vz = Math.cos(p.dir) * k; if (p.stT > URTO.SCIVOLATA.durata) { p.st = 'down'; p.stT = 0; } }
  else if (p.st === 'dive') { const k = Math.max(0, 1 - p.stT / .5) * (p.diveV || 8); p.vx *= Math.pow(.8, dt * 60); p.vz = p.diveS * k; if (p.stT > .5) { p.st = 'down'; p.stT = 0; } }
  else if (p.st === 'down') { const f = Math.pow(.7, dt * 60); p.vx *= f; p.vz *= f; if (p.stT > (p.i === 0 ? DOWN.gk : DOWN.pl)) { p.st = 'run'; p.stT = 0; } }
  else if (/^rialza/.test(p.fx || '') && p.fxT < .45) { const f = Math.pow(.8, dt * 60); p.vx *= f; p.vz *= f; } // si sta rialzando: parte solo quando è quasi in piedi
  else if (G.rimessa && G.rimessa.chi === p && G.state === 'play' && b.owner === p) { p.vx = p.vz = 0; } // la rimessa: dopo il fischio fermo sulla linea col pallone in mano (prima ci torna se lo spostano)
  else return corri(p, dt);
  p.x = clamp(p.x + p.vx * dt, -HL - 3.5, HL + 3.5); p.z = clamp(p.z + p.vz * dt, -HW - 3, HW + 3);
}
function andatura(l) {
  const A = ANDATURA, liscio = (a, b, x) => { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
  if (!(l > A.morta)) return 0;
  return .28 + (A.corsetta - .28) * liscio(A.cammina + .05, A.cammina + .22, l) + (1 - A.corsetta) * liscio(A.piena - .18, A.piena, l); // cammina, poi corsetta, poi corsa (piena da A.piena)
}
// Corsa con inerzia, vedi src/fisica/corpo.js. Qui si decide solo la velocità voluta; accelerazione, frenata, curve, fatica,
// rotazione del busto e passo li fa il corpo, a passi fissi di 1/120 s.
function corri(p, dt) {
  const b = G.ball, guida = userDrives(p), owner = b.owner === p; if (p.fallen && p.stun <= 0) p.fallen = false;
  const fm = MOTO.forma(p.en), sb = p.sbil > 0, base = (sb ? .85 : 1) * p.maxV * (p.team.human ? 1 : G.diff.spd) * fm.v * (owner ? .97 : 1) * (p.stun > 0 ? (p.fallen ? 0 : .25) : 1) * (p.jock ? .85 : 1) * (p.inj ? FOUL.limp : 1);
  let sp = base * (p.sprint ? 1 + .27 * (.3 + .7 * p.en / Math.max(p.fondo || 1, .01)) : 1);
  if (G.state === 'goal' && !p.sprint) sp *= .5;
  if (owner && p.i && !p.sprint) sp = Math.min(sp, RITMO.conduzione * fm.v); // col pallone, senza scatto, si va al passo della conduzione (Dream League)
  if (guida) sp = Math.min(sp, base * andatura(p.user)) + (p.sprint && p.user >= LEVETTA.scatto ? sp - base : 0); // la levetta decide l'andatura; lo scatto solo con la levetta al bordo
  p.vVoluta = sp; // a che velocità vuole andare: il tocco di palla in conduzione la mette dove arriverà
  let gx = p.tx, gz = p.tz, insegue = false;
  if (owner && p.i && G.state === 'play') { // conduzione: se la palla non è sulla strada verso dove vuole andare, prima ci va sopra
    const bx = b.x - p.x, bz = b.z - p.z, bd = hyp(bx, bz), wx0 = gx - p.x, wz0 = gz - p.z, wd = hyp(wx0, wz0);
    if (bd > .6 && wd > .3 && (bx * wx0 + bz * wz0) / (bd * wd) < .88) { gx = b.x + b.vx * .35 + wx0 / wd * .3; gz = b.z + b.vz * .35 + wz0 / wd * .3; insegue = true; sp = Math.max(sp * 1.12, base * (1.05 + .27 * (.3 + .7 * p.en))); } // e allunga il passo per riprenderla, anche senza scatto
  }
  // velocità voluta: piena finché si è lontani, poi quella che permette di fermarsi sul punto (niente frenate brusche all'ultimo)
  const dx = gx - p.x, dz = gz - p.z, d = hyp(dx, dz); let wx = 0, wz = 0;
  if (d > .15) { const k = (insegue ? sp : Math.min(sp, Math.sqrt(2 * MOTO.CORPO.frena * .55 * d), d * 4)) / d; wx = dx * k; wz = dz * k; } // inseguendo la propria palla non si frena all'arrivo
  p.wx = wx; p.wz = wz; // per l'animazione (movimento): dove vuole andare
  const scatto = p.sprint && hyp(p.vx, p.vz) > 5, aiuto = guida ? 1.12 : 1; // chi guida l'utente risponde un filo prima
  const o = { acc: fm.acc * aiuto * (p.i === 0 ? 1.15 : 1) * (sb ? .7 : 1), frena: (.85 + .15 * fm.acc) * aiuto, lat: fm.lat * aiuto * (scatto ? MOTO.CORPO.latScatto : 1) * (sb ? .75 : 1) }; // sbilanciato da una spallata: per un attimo meno spunto e meno curva
  const vPrima = hyp(p.vx, p.vz), h = MOTO.CORPO.passoMax; p.restoC = (p.restoC || 0) + dt;
  while (p.restoC >= h - 1e-9) {
    p.restoC -= h;
    MOTO.spingi(p, wx, wz, h, sp, o);
    const v = hyp(p.vx, p.vz); let want = p.dir;
    if (p.i === 0 && !owner && G.state === 'play') want = Math.atan2(b.x - p.x, b.z - p.z); // il portiere guarda sempre la palla, anche quando si sposta di lato
    else if (v > .7 && !p.jock) want = Math.atan2(p.vx, p.vz); else if (!owner) want = Math.atan2(b.x - p.x, b.z - p.z); // anche chi temporeggia guarda il pallone
    MOTO.ruota(p, want, h, v, (.85 + .15 * fm.lat) * aiuto);
    MOTO.stanca(p, h, v, p.maxV, scatto);
    if (MOTO.cammina(p, h, v / (p.fig.alt || 1))) p.ritmo = true; // un piede sta per toccare terra: il momento del tocco di palla (lo consuma moveBall)
    p.x = clamp(p.x + p.vx * h, -HL - 3.5, HL + 3.5); p.z = clamp(p.z + p.vz * h, -HW - 3, HW + 3);
  }
  if (dt > 0 && vPrima > 5.5 && (vPrima - hyp(p.vx, p.vz)) / dt > 10 && (p.frenataT || 0) < G.t) { p.frenataT = G.t + .5; PART.emetti('polvere', p.x, .08, p.z, 3, 1.4, p.vx / vPrima, p.vz / vPrima); PART.emetti('erba', p.x, .05, p.z, 3, 2, p.vx / vPrima, p.vz / vPrima); } // frenata brusca: zolle e polvere
}
const tecnica = (p) => clamp(.5 + (p.q - 20) / 30, 0, 1);
const _mL = new T.Vector3(), _mR = new T.Vector3();
/** Il punto tra le mani del portiere (un po' davanti ai palmi), se la sua posa è aggiornata; se no null. */
function traLeMani(p) {
  const f = p.fig, L = f.bones && f.bones.hand_l, R = f.bones && f.bones.hand_r; if (!L || !R || !(G.t - (f.posaT || -9) < .15)) return null;
  L.getWorldPosition(_mL); R.getWorldPosition(_mR); const fx = Math.sin(f.vdir ?? p.dir) * .12, fz = Math.cos(f.vdir ?? p.dir) * .12;
  return { x: (_mL.x + _mR.x) / 2 + fx, y: Math.max(BR, (_mL.y + _mR.y) / 2), z: (_mL.z + _mR.z) / 2 + fz };
}
function moveBall(dt) {
  const b = G.ball;
  if (G.state === 'play') { calciCaricati(dt); if (b.owner && b.owner.i && !G.rimessa) prevediTocco(b.owner, b); else if (!b.owner) prevediStop(b); } // i gesti con la palla, a tempo col tocco
  else for (const p of all()) p.carica = null; // a gioco fermo nessun calcio resta in sospeso
  // chi ha la palla lo si legge dopo i calci caricati: se il calcio è appena partito non c'è più nessuno da far condurre
  // (prima il passatore dava un tocco di conduzione al pallone appena calciato e il passaggio finiva lento e di lato)
  const o = b.owner;
  if (o && o.i !== 0 && G.state === 'play' && !(G.rimessa && G.rimessa.chi === o)) { // dribbling: tocchi in avanti, la palla è libera tra un tocco e l'altro
    { let dm = 9; for (const q of o.team.opp.players) dm = Math.min(dm, hyp(q.x - o.x, q.z - o.z)); o.pressato = dm < 1.8; } // con un avversario addosso i tocchi si accorciano
    const r = FIS.conduci(b, o, dt, tecnica(o) * (o.sbil > 0 ? .4 : 1), Math.random, { x: o.tx - o.x, z: o.tz - o.z });
    if (r === 'perso') { b.owner = null; G.lastTouch = o; }
    else if (r === 'tocco') { G.tocchi = (G.tocchi || 0) + 1; taglio(o, b); // vicino alle linee il tocco si accorcia: la palla resta in campo (si esce solo correndoci sopra)
      const k = .45, ez = b.z + b.vz * k, ex = b.x + b.vx * k, mz = HW - .8, mx = HL - .8;
      if (Math.abs(ez) > mz && Math.abs(o.z) < HW) b.vz = (sgn(ez) * mz - b.z) / k;
      if (Math.abs(ex) > mx && Math.abs(o.x) < HL && Math.abs(b.z) > GH + 2) b.vx = (sgn(ex) * mx - b.x) / k;
    }
    FIS.passo(b, dt); return;
  }
  if (o) {
    const mani = o.i === 0 && o.fig.skinned && G.state === 'play', k = mani ? .42 : .8; // il portiere la tiene in mano
    const q = mani ? traLeMani(o) : null; // tra le mani vere (la posa del fotogramma prima), così segue presa, tuffo e lancio
    if (q) { const a = Math.min(1, dt * (o.presaT && G.t - o.presaT < .12 ? 18 : 40)); b.x += (q.x - b.x) * a; b.y += (q.y - b.y) * a; b.z += (q.z - b.z) * a; b.vx = o.vx; b.vz = o.vz; b.vy = 0; return; }
    const tx = o.x + Math.sin(o.dir) * k, tz = o.z + Math.cos(o.dir) * k, a = Math.min(1, dt * 20);
    b.x += (tx - b.x) * a; b.z += (tz - b.z) * a; b.y = mani ? b.y + (1.55 - b.y) * Math.min(1, dt * 12) : BR; b.vx = o.vx; b.vz = o.vz; b.vy = 0; return;
  }
  if (G.state === 'kickoff' || G.state === 'restart') return;
  const vy0 = b.vy; if (FIS.passo(b, dt)) AU.rimbalzo(-vy0); // gravità, aria, effetto, rimbalzi e attrito dell'erba (src/fisica/pallone.js), e il rimbalzo si sente
  if (G.state !== 'play') { // dentro la rete
    for (const p of PORTE) p.urta(b, BR); // la rete cede e frena il pallone
    if (Math.abs(b.x) > HL + 3) { b.x = sgn(b.x) * (HL + 3); b.vx = 0; } // sicurezza: oltre la sacca della rete non si va
  }
}
function contacts(dt) {
  const b = G.ball, own = b.owner;
  if (!own) {
    const sp = hyp(b.vx, b.vz); let best = null, bd = 9;
    for (const p of all()) {
      if (p.cool > 0 || p.stun > 0 || p.st === 'down' || p.st === 'slide' || (G.so && p !== G.so.gk)) continue; // ai rigori il pallone lo può toccare solo il portiere
      // appena calciato, i compagni di chi calcia (non chi deve riceverlo) lo lasciano passare: al calcio d'inizio e sulle
      // punizioni il compagno accanto al pallone lo deviava subito, e un passaggio su cinque finiva lento e storto
      if (G.lastKicker && p.team === G.lastKicker.team && p !== G.intended && G.t - (G.calcioT || -9) < .2) continue;
      const d = hyp(p.x - b.x, p.z - b.z), gk = p.i === 0, inBox = Math.abs(p.x) > HL - 17 && Math.abs(p.z) < 20.5;
      if (sp > 8 && !gk && p !== G.intended && (p.x - b.x) * b.vx + (p.z - b.z) * b.vz < -.3 * sp) continue; // un pallone veloce che si allontana non lo tocca chi gli sta dietro o di fianco
      const reach = gk && inBox ? (p.st === 'dive' ? 2.0 : 1.3) : (p.st === 'slide' ? 1.3 : 1.05), top = gk && inBox ? 2.7 : 1.55;
      if (d < reach && b.y < top && d < bd) { bd = d; best = p; }
    }
    if (!G.so && !(best && best.i === 0) && b.y < AIR.top && sp < AIR.fast && (b.y >= AIR.low || (b.vy < -5 && b.y > AIR.scende))) { // pallone alto o che scende forte: chi ci arriva colpisce di testa
      const h = duelloAereo(b);
      if (h) header(h);
      return;
    }
    if (!best) return; const p = best, gk = p.i === 0;
    const tiro = (G.tiroT || -1) >= (G.calcioT || 0) - 1e-6; // l'ultimo pallone calciato era un tiro (non un cross o un lancio)
    if (gk && !tiro && b.y > PARATA.uscita && G.lastKicker && G.lastKicker.team !== p.team && G.state === 'play') { // cross o lancio alto: presa in uscita, o pugno se c'è un attaccante addosso
      const conteso = p.team.opp.players.some((o) => o.i && hyp(o.x - p.x, o.z - p.z) < 1.5);
      if (conteso && rnd() < .65) { const s2 = p.team.side; b.vx = s2 * rnd(8, 13); b.vz = rnd(-6, 6); b.vy = rnd(4, 7); b.c = b.t = 0; G.lastTouch = p; p.cool = .5; G.intended = null; AU.calcio(12, 'presa'); azione(p, 'testa'); return; }
      presaPortiere(p, b.y); return gain(p);
    }
    if (gk && sp > 13 && tiro && G.lastKicker && G.lastKicker.team !== p.team) {
      if (p.saveId === G.shotId) return; p.saveId = G.shotId;
      // la parata dipende da quanto il pallone passa lontano dal corpo (rispetto a dove arriva tuffandosi), da quanto è veloce e alto
      const rx = b.x - p.x, rz = b.z - p.z, tv = Math.max(0, -(rx * b.vx + rz * b.vz) / (sp * sp || 1)), passa = hyp(rx + b.vx * tv, rz + b.vz * tv); // dove il pallone gli passa più vicino
      const raggio = p.st === 'dive' ? 2 : 1.3, lontano = clamp(passa / raggio, 0, 1), s2 = p.team.side;
      const pr = clamp(((p.team.human ? MATE.save : G.diff.save) + .23 - lontano * lontano * .35 - Math.max(0, sp - 20) * .014 - (b.y > 2.1 ? .08 : 0) + (p.st === 'dive' ? 0 : .04)) * (G.penId === G.shotId ? FOUL.penSave : 1), .04, .97);
      if (rnd() > pr) { p.cool = .6; return; }
      AU.calcio(sp, 'presa'); p.s.sv++; if (G.shooter && G.shooter.team !== p.team) { AU.ooh(.8); // parata: il pubblico fa ooh
        G.shooter.s.sot++; G.shooter = null; }
      // presa solo se il pallone arriva addosso e non troppo forte; altrimenti respinta
      // presa solo se il pallone arriva addosso e non troppo forte, e anche allora non sempre (Dream League: più spesso respinge)
      if (((sp < 30 && lontano < .45 && b.y > .2 && b.y < 2.55) || (sp < 21 && lontano < .65) || sp < 15) && (sp < 15 || rnd() < PORTIERE.presa)) { if (p.st === 'run' && !/^(para|presa_)/.test(p.fx || '')) presaPortiere(p, b.y); return gain(p); }
      G.stats.resp[p.team.idx]++;
      // respinta: lasciata davanti in area (poi la va a riprendere), di lato oltre la linea di fondo (angolo, più spesso vicino al
      // palo), oppure verso il campo e di lato dalla parte del tuffo, più forte se il tiro era forte
      const lato = p.st === 'dive' ? p.diveS : sgn(b.z - p.z || rnd(-1, 1)), forza = 4 + sp * .22, u = rnd();
      if (u < PORTIERE.davanti) { b.vx = s2 * rnd(1.5, 3.5); b.vz = rnd(-1.5, 1.5); b.vy = rnd(.5, 2); }
      else if (u < PORTIERE.davanti + (1 - PORTIERE.davanti) * PORTIERE.angolo * (Math.abs(b.z) > GH - CALCI.respintaLato ? 1.4 : .8)) { b.vx = -s2 * rnd(2, 5); b.vz = lato * rnd(6, 11); b.vy = rnd(1.5, 4); }
      else { b.vx = s2 * rnd(.25, .6) * forza - b.vx * .1; b.vz = lato * rnd(.55, .95) * forza + b.vz * .15; b.vy = rnd(1.5, 4.5); }
      b.c = b.t = 0; G.lastTouch = p; p.cool = .5; G.occasioneT = G.t; // grande occasione: se ne esce un angolo, prima il replay
      return;
    }
    if (p !== G.intended && !gk && sp > 10 && (sp > 19 || rnd() < .25 + (sp - 10) * .06)) { // deviazione: un pallone veloce non diretto a te lo si devia, prenderlo pulito è difficile
      if (G.offs && G.offs.includes(p)) return offside(p);
      const s3 = p.team.side, inArea = p.x * s3 < -HL + 17 && Math.abs(p.z) < 22; // nella propria area
      if (inArea && G.lastKicker && G.lastKicker.team !== p.team && rnd() < CALCI.deviaAngolo) { // deviata oltre la linea di fondo, fuori dai pali
        const zt = sgn(b.z || rnd(-1, 1)) * rnd(GH + 2, GH + 12), xt = -s3 * (HL + 3), dl = hyp(xt - b.x, zt - b.z) || 1, v = rnd(7, 11);
        b.vx = (xt - b.x) / dl * v; b.vz = (zt - b.z) / dl * v; b.vy = rnd(1, 3.5); b.c = b.t = 0; p.cool = .4; G.lastTouch = p; AU.calcio(10, 'tocco'); if ((G.tiroT || -1) >= (G.calcioT || 0) - 1e-6) G.occasioneT = G.t; return; // un tiro deviato: grande occasione
      }
      const nx = (b.x - p.x) / (bd || 1), nz = (b.z - p.z) / (bd || 1), dot = b.vx * nx + b.vz * nz;
      b.vx = (b.vx - 2 * dot * nx) * .35 + rnd(-1, 1); b.vz = (b.vz - 2 * dot * nz) * .35 + rnd(-1, 1); b.vy = rnd(1, 4); p.cool = .4; G.lastTouch = p; AU.calcio(10, 'tocco'); return;
    }
    return gain(p);
  }
  // contrasti (non su chi batte la rimessa col pallone in mano)
  if (own.shield > 0 || (G.rimessa && G.rimessa.chi === own)) return;
  const fx = Math.sin(own.dir), fz = Math.cos(own.dir), lontana = hyp(b.x - own.x, b.z - own.z);
  if (own.i !== 0 && lontana > .95 && b.y < 1) for (const d of own.team.opp.players) { // tra un tocco e l'altro: chi arriva prima sul pallone
    if (d.stun > 0 || d.st === 'down' || d.cool > 0 || d.st === 'slide') continue;
    const db = hyp(d.x - b.x, d.z - b.z); if (db > .9 || db > lontana - .15) continue;
    const forza = userDrives(d) ? 1.3 : (d.team.human ? MATE.steal : G.diff.steal) / 1.25, rapporto = clamp(URTO.forza(d) / URTO.forza(own), .4, 1.6); // chi è più forte copre la palla col corpo
    if (rnd() > rapporto * rapporto * .8) { d.cool = .5; continue; } // il portatore lo tiene lontano col corpo
    if (rnd() < .5 * forza) { own.cool = .5; G.lastPass = null; gain(d); d.s.tk++; AU.calcio(7, 'tocco'); if (own.i) sbilancia(own, d); return; } // la prende lui
    b.owner = null; const k = 4 + rnd(3); b.vx = (b.x - d.x) / (db || 1) * k + rnd(-1.5, 1.5); b.vz = (b.z - d.z) / (db || 1) * k + rnd(-1.5, 1.5); b.vy = rnd(.5); // la tocca via: palla contesa
    d.cool = .3; own.cool = .3; G.lastTouch = d; G.lastPass = null; G.offs = null; AU.calcio(6, 'tocco'); return;
  }
  for (const d of own.team.opp.players) {
    if (d.stun > 0 || d.st === 'down' || d.cool > 0) continue;
    const dist = hyp(d.x - b.x, d.z - b.z), dBody = hyp(d.x - own.x, d.z - own.z);
    if (own.i === 0) continue;
    if (d.st === 'slide') continue; // la scivolata la decide scivolate()
    if (dist < 1.15 || dBody < .95) {
      let r = (userDrives(d) ? 2.6 : (d.team.human ? MATE.steal : G.diff.steal) * (d.i === 0 ? 1.6 : 1)) * clamp(URTO.forza(d) / URTO.forza(own), .6, 1.7); // chi è più forte e fresco vince più contrasti
      const rel = ((d.x - own.x) * fx + (d.z - own.z) * fz) / (dBody || 1), vo = hyp(own.vx, own.vz), vd = hyp(d.vx, d.vz);
      const affiancati = rel > -.6 && rel < .5 && vo > 3 && vd > 3 && (own.vx * d.vx + own.vz * d.vz) / (vo * vd) > .5; // corrono fianco a fianco: la spallata è regolare
      const dietro = rel < (affiancati ? -.6 : .2); if (dietro) r *= .3;
      if (d.i !== 0 && rnd() < FOUL.rate[dietro ? 1 : 0] * (affiancati ? .2 : 1) * dt) return foul(d, own, false, dietro); // spinta o trattenuta
      if (rnd() < r * dt) {
        if (rnd() < FOUL.stand[dietro ? 1 : 0] * (d.i === 0 ? .5 : 1) * (affiancati ? .5 : 1)) return foul(d, own, false, dietro);
        own.stun = .5; own.cool = .8; G.lastPass = null; gain(d); d.s.tk++; AU.calcio(8, 'tocco'); if (own.i) sbilancia(own, d); return;
      }
    }
  }
}
function bounds() {
  const b = G.ball; if (b.owner && b.owner.i === 0) return;
  if (Math.abs(b.x) > HL) {
    const e = sgn(b.x), az = Math.abs(b.z);
    if (az > GH && az < GH + 1.4 && b.y < GT + .4) for (const p of PORTE) if (p.d === e) p.colpoFuori(b); // sfiora l'esterno della rete uscendo sul fondo
    if (az < GH + .28 && b.y < GT + .3 && (az > GH - .05 || b.y > GT - .05) && Math.abs(b.x) < HL + .8 && !b.owner) { // palo o traversa
      AU.palo(hyp(b.vx, b.vz)); if (G.shooter) { AU.ooh(1); G.occasioneT = G.t; } b.x = e * (HL - .15); b.vx *= -.55; b.vz += sgn(b.z) * 2; b.vy *= .6; return;
    }
    if (az < GH && b.y < GT) return goal(G.teams.find((t) => t.side === e));
    if (G.so) return soEsito(false);
    if (G.shooter && az < GH + 3.5 && b.y < GT + 2) AU.ooh(.75); // tiro fuori di poco
    if (G.shooter && az < GH + FERMI.fuori && b.y < GT + 1.5) G.occasioneT = G.t; // grande occasione: replay prima della rimessa dal fondo
    const def = G.teams.find((t) => t.side === -e);
    if (G.lastTouch && G.lastTouch.team === def) corner(def.opp, e * (HL - .6), sgn(b.z) * (HW - .6));
    else restart(def, e * (HL - 6), 0, 'Rimessa dal fondo', def.players[0]);
  } else if (Math.abs(b.z) > HW) {
    if (G.so) return soEsito(false);
    const t = G.lastTouch ? G.lastTouch.team.opp : G.teams[0];
    restart(t, clamp(b.x, -HL + 1.5, HL - 1.5), sgn(b.z) * (HW - .5), 'Rimessa laterale');
  }
}
/** Dove si mette chi batte: sulla linea laterale col pallone in mano per la rimessa, appena dietro il pallone per il resto. */
function postoBattitore(k, b, oltre = 0) { return G.rimessa && G.rimessa.chi === k ? [b.x, sgn(b.z) * (RIMESSA.linea + oltre)] : [b.x - k.team.side * (.5 + oltre), b.z]; }
function restart(team, x, z, label, taker) {
  const b = G.ball; b.owner = null; b.x = x; b.z = z; b.y = BR; b.vx = b.vy = b.vz = 0; b.c = b.t = 0; G.charge = -1;
  G.fk = null; G.wait = 1.1; G.offs = null; G.noOff = true; G.pen = false; G.penWait = 0; for (const p of all()) p.fkShot = p.cornerKick = false;
  aiSubs();
  G.next = team; G.poss = team; G.intended = null; G.taker = taker || nearestTo(team, x, z);
  if (team.human) setCtrl(G.taker); else setCtrl(nearestTo(G.teams[0], x, z));
  setState('restart'); G.tipoFermo = label; const fi = { Punizione: 'fallo', Fuorigioco: 'fuorigioco' }[label]; if (fi) AU.fischio(fi); // rimesse, angoli e fondo: l'arbitro non fischia
  G.rimessa = label === 'Rimessa laterale' && G.taker ? { chi: G.taker } : null;
  // rimessa laterale come Dream League: dissolvenza scura, a metà stacco della telecamera sul punto di battuta; i comandi
  // tornano dopo FERMI.comandi secondi, quando si può battere
  // dopo una grande occasione (parata, tiro deviato, palo, tiro fuori di poco): prima il replay breve, poi la palla ferma
  const replay = G.t - (G.occasioneT ?? -99) < FERMI.occasione && REGIA.rivedi(); G.occasioneT = -99;
  if (G.rimessa) { G.wait = Math.max(G.wait, FERMI.comandi); if (!G.auto && !replay) { buio(); G.buioT = G.t + FERMI.buio / 2; } }
}
// Punizione per `team`. Se è a tiro dalla porta, tre avversari fanno barriera e chi calcia (se lo guida l'IA) tira in porta
function freeKick(team, x, z, label, skip) {
  x = clamp(x, -HL + 1, HL - 1); z = clamp(z, -HW + 1, HW - 1);
  restart(team, x, z, label, nearestTo(team, x, z, skip)); G.noOff = false; G.wait = 1.9;
  const s = team.side, gx = s * HL, dG = hyp(gx - x, z), fk = G.fk = { wall: null, direct: false };
  if (dG < 31 && dG > FOUL.wall + 4 && Math.abs(z) < 23) {
    const ux = (gx - x) / dG, uz = -z / dG, cx = x + ux * FOUL.wall, cz = z + uz * FOUL.wall;
    const near = team.opp.players.filter((p) => p.i).sort((a, c) => hyp(a.x - cx, a.z - cz) - hyp(c.x - cx, c.z - cz)).slice(0, 3);
    fk.wall = near.map((p, k) => ({ p, x: cx - uz * (k - 1) * .85, z: cz + ux * (k - 1) * .85 })); fk.direct = dG < 28;
  }
}
// Calcio d'angolo: quattro o cinque attaccanti in area (primo palo, dischetto, secondo palo, limite), ognuno con un marcatore
function corner(team, x, z) {
  restart(team, x, z, "Calcio d'angolo"); G.wait = 2.5; G.stats.corners[team.idx]++;
  const s = team.side, e = sgn(z), pos = new Map(), slots = [[5.5, 3.2], [10.5, -.5], [7, -5.5], [13, 4], [18.5, -2]];
  const quanti = rnd() < .5 ? AREA_IA.angolo[0] : AREA_IA.angolo[1]; // 4 o 5 attaccanti in area
  const att = team.players.filter((p) => p.i && p !== G.taker).sort((a, c) => team.form[c.i][0] - team.form[a.i][0]).slice(0, quanti);
  const def = team.opp.players.filter((p) => p.i).sort((a, c) => team.opp.form[a.i][0] - team.opp.form[c.i][0]).slice(0, 5);
  slots.forEach(([dx, dz], k) => { const px = s * (HL - dx), pz = e * dz; if (att[k]) pos.set(att[k], [px, pz]); if (def[k]) pos.set(def[k], [px + s * 1.2, pz * .85]); });
  // un compagno si offre corto: l'angolo si può battere con un passaggio rasoterra
  const cx = s * (HL - FERMI.corto[0]), cz = e * (HW - FERMI.corto[1]), corto = team.players.filter((p) => p.i && p !== G.taker && !pos.has(p)).sort((a, c) => hyp(a.x - cx, a.z - cz) - hyp(c.x - cx, c.z - cz))[0];
  if (corto) pos.set(corto, [cx, cz]);
  G.fk = { corner: true, pos };

}
function penSpot(p) { // dove sta ciascuno durante un rigore
  const a = G.next.side;
  if (p.i === 0) return p.team === G.next ? [-a * (HL - 4), 0] : [a * (HL - .4), 0];
  return [a * (HL - 21 - (p.i % 3) * 1.3), (p.i - 5.5) * 3.6 + (p.team.idx ? 1.8 : 0)];
}
function penalty(team) {
  let k = null; for (const p of team.players) if (p.i && (!k || p.q > k.q)) k = p;
  restart(team, team.side * (HL - 11), 0, 'Rigore', k); G.noOff = false; G.wait = 2.3; G.fk = { pen: true }; G.stats.pens[team.idx]++;
  banner('Rigore!', team.club.name, 1900); AU.fischio('rigore');
}
function card(p, red) {
  const t = p.team; G.cards.push({ t: t.idx, name: p.name, min: minute(), c: red ? 'r' : 'g' }); G.stats[red ? 'red' : 'yel'][t.idx]++;
  if (!red) { p.yel = 1; return; }
  p.red = true;
  t.players.splice(t.players.indexOf(p), 1); t.off.push(p); scene.remove(p.fig.root); p.run = p.mark = null;
  if (G.ctrl === p) { G.ctrl = null; setCtrl(nearestTo(t, G.ball.x, G.ball.z)); }
  if (G.intended === p) G.intended = null;
}
// d ha commesso fallo su own: cartellino, poi punizione o rigore
function foul(d, own, sliding, behind, grave = false) {
  const t = own.team, s = t.side, b = G.ball, x = own.x, z = own.z, dGoal = hyp(s * HL - x, z);
  // prima il fuorigioco: chi era in fuorigioco e stava ricevendo (o era già sul pallone) non può guadagnarsi fallo o rigore
  if (G.offs && G.offs.includes(own) && (G.intended === own || hyp(b.x - x, b.z - z) < 3)) return offside(own);
  G.stats.fouls[d.team.idx]++; d.s.fl++;
  // chiara occasione da gol: nessun compagno di chi ha fatto fallo tra l'avversario e la porta
  const chance = dGoal < 32 && !d.team.players.some((o) => o.i && o !== d && (o.x - x) * s > 1 && Math.abs(o.z - z) < 14);
  let c = null;
  if (d.i !== 0 && d.team.players.length > 7) {
    if ((chance && (sliding || behind)) || (grave && rnd() < .25)) c = 'r'; // da dietro e in ritardo: anche rosso diretto
    else if (chance || rnd() < FOUL.yellow[sliding ? 1 : 0] * (behind ? 1.3 : 1)) c = d.yel ? 'r' : 'g';
  }
  const inBox = x * s > HL - 16.5 && Math.abs(z) < 20.2;
  // vantaggio: chi subisce il fallo resta in piedi, ha il pallone e nessun altro avversario addosso. Il giallo si dà lo stesso, il rosso ferma il gioco
  if (!sliding && !inBox && c !== 'r' && b.owner === own && x * s > -20 && rnd() < FOUL.adv && !d.team.players.some((o) => o !== d && o.i && hyp(o.x - x, o.z - z) < 3.5)) {
    G.stats.adv[t.idx]++; d.stun = .9; d.cool = 1.3; own.shield = 1;
    if (c) card(d, false);
    return banner('', c ? `Vantaggio · ammonito ${d.name}` : 'Vantaggio', 1300, c);
  }
  b.owner = null; G.lastPass = null;
  own.stun = sliding ? DOWN.fall : .5; own.cool = Math.max(.8, own.stun); if (sliding) { own.fallen = true; cade(own, d); }
  const male = own.i !== 0 && !own.inj && t.bench.length > 0 && rnd() < FOUL.inj[sliding ? 1 : 0]; if (male) { own.inj = true; G.stats.inj[t.idx]++; } // infortunio: resta in campo ma va piano; solo se c'è una panchina da cui sostituire
  if (inBox) penalty(t); else freeKick(t, x, z, 'Punizione', sliding || male ? own : null);
  if (male && !c) { banner(inBox ? 'Rigore!' : '', `Infortunio · ${own.name}`, 2300); G.wait += .6; }
  if (c) { card(d, c === 'r'); banner(c === 'r' ? 'Espulso!' : (inBox ? 'Rigore!' : ''), `${c === 'r' ? 'Cartellino rosso' : 'Ammonito'} · ${d.name}`, 2300, c); G.wait += .8; }
  // dopo un'espulsione barriera e battitore vanno riscelti senza di lui
  if (c === 'r' && !inBox) { freeKick(t, x, z, '', sliding ? own : null); G.wait += .8; banner('Espulso!', `Cartellino rosso · ${d.name}`, 2300, 'r'); }
}
/* ------------------------------------------------------------------ calci di rigore dopo una partita di coppa finita in parità */
// Cinque a testa, poi a oltranza. Ognuno tira nella porta verso cui attaccava. Tira chi vale di più, a turno.
function startShootout() {
  G.so = { g: [0, 0], n: [0, 0], seq: [[], []], turn: 0, fase: 'pausa', t: 1.9, fine: false, k: null, gk: null, calciato: false };
  G.charge = -1; G.offs = null; G.penWait = 0; for (const p of all()) { p.run = p.mark = null; p.fkShot = p.cornerKick = false; }
  $('#hud').classList.add('rigori'); soHud(); banner('Calci di rigore', '', 1700); AU.fischio('intervallo');
}
function soHud() { const so = G.so, d = (i) => so.seq[i].slice(-5).map((v) => (v ? '●' : '○')).join(''); $('#rig').textContent = `${d(0)}  Rigori ${so.g[0]} - ${so.g[1]}  ${d(1)}`; }
function soKick() {
  const so = G.so, t = G.teams[so.turn], ord = t.players.filter((p) => p.i).sort((a, c) => c.q - a.q), k = ord[so.n[so.turn] % ord.length];
  restart(t, t.side * (HL - 11), 0, '', k); G.noOff = false; G.wait = 1.4; G.fk = { pen: true };
  so.fase = 'tiro'; so.k = k; so.gk = t.opp.players[0]; so.calciato = false; so.t = 0;
}
function soEsito(gol) {
  const so = G.so, i = so.turn; if (so.fase !== 'tiro') return;
  so.n[i]++; so.seq[i].push(gol); if (gol) so.g[i]++; so.fase = 'pausa'; so.t = 1.5; so.turn = 1 - i; G.charge = -1; G.penWait = 0;
  const [a, c] = so.g, ra = Math.max(0, 5 - so.n[0]), rc = Math.max(0, 5 - so.n[1]);
  so.fine = so.n[0] >= 5 && so.n[1] >= 5 ? so.n[0] === so.n[1] && a !== c : a > c + rc || c > a + ra; // nei primi cinque finisce quando uno non può più essere raggiunto
  banner(gol ? 'Gol!' : G.lastTouch === so.gk ? 'Parato!' : 'Fuori!', `${so.k.name} · rigori ${a} - ${c}`, 1400); if (gol) { AU.boato(); AU.rete(); } else AU.ooh(.9); soHud();
}
function soStep(dt) {
  const so = G.so, b = G.ball;
  if (so.fase === 'pausa') {
    so.t -= dt; if (so.t > 0) return;
    if (!so.fine) return soKick();
    G.soRes = so.g.slice(); G.so = null; $('#hud').classList.remove('rigori'); setState('full'); banner('Fine partita', `Rigori ${G.soRes[0]} - ${G.soRes[1]}`, 1800); AU.fischio('fine'); return;
  }
  if (!so.calciato) { if (b.owner !== so.k) so.calciato = true; return; }
  so.t += dt;
  if (b.owner === so.gk || so.t > 3.2 || (so.t > .7 && hyp(b.vx, b.vz) < 1.2 && b.y < .6)) soEsito(false); // preso dal portiere, fermo, o tempo scaduto
}
function goal(team) {
  if (G.so) return soEsito(true);
  team.score++; const lt = G.lastTouch; let k = G.lastKicker; if (!k || k.team !== team) k = lt && lt.team === team ? lt : null;
  const own = !k; G.scorer = own ? nearestTo(team, G.ball.x, G.ball.z) : k;
  const min = minute();
  const name = own ? `Autogol${lt ? ' (' + lt.name + ')' : ''}` : k.name;
  if (!own && G.headId === G.shotId && G.lastKicker === k) G.stats.headGoals[team.idx]++;
  if (own) { if (lt) lt.s.og++; } else { k.s.g++; if (G.shooter === k) { k.s.sot++; G.shooter = null; } if (k.by && k.by.team === team) k.by.s.a++; }
  G.goals.push({ t: team.idx, name, min }); G.next = team.opp; G.charge = -1;
  for (const p of team.players) if (p.i) { p.st = 'run'; }
  // con la regia niente scritta al centro: tabelloni e primo piano (Dream League)
  setState('goal'); if (!MODEL || G.noRegia) banner('Gol!', `${name} ${min}' · ${team.club.name}`, 3400); AU.boato(); AU.rete(hyp(G.ball.vx, G.ball.vz)); setTimeout(() => AU.fischio('gol'), 450); hud();
}

/* ------------------------------------------------------------------ animazione delle figure */
function startFx(f, name, da = 0, sp = null) {
  const a = f.mixer.clipAction(MODEL.fx[name]);
  if (f.old && f.old !== a) f.old.stop();
  f.old = f.act && f.act !== a ? f.act : null; f.oldW = f.old ? f.fxW : 0; f.fxW = 0;
  a.setLoop(T.LoopOnce, 1); a.clampWhenFinished = true; a.reset(); a.timeScale = sp || FX[name].sp; a.time = da; a.play(); f.act = a;
}
function poseSkinned(p, dt) {
  const f = p.fig, v = hyp(p.vx, p.vz), alt = f.alt || 1; f.root.position.set(p.x, 0, p.z);
  // il corpo segue la direzione con una molla rapida: tiri, passaggi e scivolate girano p.dir di colpo, il bacino no
  // (oltre i 150° o dopo un salto di posizione, come a un calcio d'inizio, si gira subito)
  if (dt > 0) movimento(p, v);
  const da = Math.atan2(Math.sin(p.dir - (f.vdir ?? p.dir)), Math.cos(p.dir - (f.vdir ?? p.dir)));
  // durante un movimento senza palla il corpo gira col gesto, dalla direzione di partenza a quella voluta
  const mi = MOV.test(p.fx || '') && p.movA !== undefined ? GESTI[p.fx] : null, mk = mi ? clamp(p.fxT * (p.fxSp || 1) / mi.durata, 0, 1) : 0;
  // finito il gesto il corpo resta girato dove è arrivato finché la direzione del corpo fisico (che gira solo quando la
  // velocità si è invertita) non lo raggiunge: se no tornerebbe indietro per un attimo, coi piedi che strisciano
  if (mi) { f.vdir = p.movDa + p.movA * mk * mk * (3 - 2 * mk); p.movTieni = p.movA !== 0; }
  else {
    if (p.movTieni && !(dt > 0 && Math.abs(da) > .35 && G.t < (p.movT || 0) + .6 && p.st === 'run')) p.movTieni = false;
    if (!p.movTieni) f.vdir = Math.abs(da) > 2.6 || dt <= 0 ? p.dir : (f.vdir ?? p.dir) + da * Math.min(1, dt * 20);
  }
  f.root.rotation.y = f.vdir;
  if (G.dbgFx && hasFx(G.dbgFx.name)) { // per le prove: tutti fermi su un fotogramma di una clip
    for (const k in f.A) f.A[k].setEffectiveWeight(0); if (f.act) f.act.setEffectiveWeight(0);
    const a = f.mixer.clipAction(MODEL.fx[G.dbgFx.name]); if (f.dbg && f.dbg !== a) f.dbg.stop(); a.play(); a.paused = true; a.time = G.dbgFx.t; a.setEffectiveWeight(1); f.dbg = a; f.mixer.update(0); f.body.position.y = 0; return;
  } else if (f.dbg) { f.dbg.stop(); f.dbg = null; }
  // l'azione registrata in corso (tiro, scivolata, tuffo…)
  if (p.fxNew) { p.fxNew = false; startFx(f, p.fx, p.fxDa || 0, p.fxSp); }
  let on = false;
  if (p.fx && f.act && p.fxFermo) { f.act.timeScale = 0; on = true; } // posa tenuta (la rimessa col pallone sopra la testa)
  else if (p.fx && f.act) {
    p.fxT += dt; const c = FX[p.fx] || { sp: 1 }, g = !!GESTI[p.fx], dur = f.act.getClip().duration / (p.fxSp || c.sp);
    if (p.fxT >= dur - .03) {
      // il tuffo resta a terra finché il portiere è giù (in volo e poi a terra), poi si rialza con la sua animazione: prima
      // la posa sdraiata sfumava in quella in piedi e a metà strada il corpo finiva sotto l'erba (e veniva sollevato)
      const r = p.i === 0 && G.ball.owner === p && /^para_/.test(p.fx) && GESTI.rialza_palla ? 'rialza_palla' : rialzo(p.fx);
      if (r && aTerraAncora(p, r)) on = true;
      else if (r && GESTI[r]) { p.fx = null; gesto(p, r, 0); on = true; }
      else if (c.next && hasFx(c.next)) { p.fx = c.next; p.fxT = 0; p.fxSp = null; startFx(f, p.fx); on = true; } else p.fx = null; }
    else on = p.fxT < (g ? dur - .05 : c.cut || dur - .12); // i gesti brevi restano pieni fin quasi alla fine
  }
  // i movimenti senza palla entrano più piano (partono in mezzo alla corsa) ed escono più svelti: l'ultimo fotogramma
  // della clip, fermo, sotto un corpo che corre farebbe strisciare i piedi
  const mov = MOV.test(p.fx || '') || (!p.fx && f.act && MOV.test(f.act.getClip().name));
  f.fxW += ((on ? 1 : 0) - f.fxW) * Math.min(1, dt * (on ? (mov ? 8 : 16) : mov ? 10 : 6)); f.oldW += (0 - f.oldW) * Math.min(1, dt * 9);
  if (f.act) { f.act.setEffectiveWeight(f.fxW); if (!p.fx && f.fxW < .02) { f.act.stop(); f.act = null; f.fxW = 0; } }
  if (f.old) { f.old.setEffectiveWeight(f.oldW); if (f.oldW < .02) { f.old.stop(); f.old = null; f.oldW = 0; } }
  // Dopo un gol (clip di GameplayFootball): chi ha segnato, appena si ferma, fa l'esultanza scatenata e poi quella normale
  // a ripetizione, ognuno col suo ritmo. I compagni fanno quella normale appena arrivano. Chi l'ha subito, una volta, la delusione.
  if (G.state === 'goal' && G.scorer && p.i !== 0 && !p.fx && hasFx('esulta') && v < 1.5 && !REGIA.figure()) {
    const ng = G.goals.length;
    if (p.team === G.scorer.team) {
      const scatenata = p === G.scorer && p.esultaGol !== ng && hasFx('esulta_corsa');
      clipGF(p, scatenata ? 'esulta_corsa' : 'esulta', 0, p === G.scorer ? 1 : .85 + (p.i % 4) * .08); if (p === G.scorer) p.esultaGol = ng;
    }
    // chi ha subito il gol: mani sopra la testa (clip Mixamo `mani_testa` quando c'è, se no la delusione di GameplayFootball)
    else if (p.deluso !== ng && (hasFx('mani_testa') || hasFx('delusione'))) { p.deluso = ng; if (hasFx('mani_testa')) clipGF(p, 'mani_testa', 0, 1); else clipGF(p, 'delusione', 0, .7); }
  }
  // attesa, camminata, corsetta e corsa secondo la velocità; esultanza dopo un gol
  const tg = { idle: 0, walk: 0, run: 0, jog: 0, gkIdle: 0, esulta: 0, passoS: 0, passoD: 0, aereo: 0, braccia: 0 }; let by = 0;
  const festa = G.state === 'goal' && G.scorer && p.team === G.scorer.team && p.i !== 0 && v < 5 && f.fxW < .25;
  if (festa && f.A.esulta) { tg.esulta = 1; by = Math.abs(Math.sin(G.t * 7 + p.i)) * .3; }
  else if (f.A.jog) { const w = MOTO.pesi(v / alt); tg.run = w.run; tg.jog = w.jog; tg.walk = w.walk; tg.idle = 1 - w.run - w.jog - w.walk; } // stesse soglie della fase del passo
  else { tg.run = clamp((v - 2.6) / 2.6, 0, 1); tg.walk = clamp(v / 2.2, 0, 1) * (1 - tg.run); tg.idle = 1 - tg.run - tg.walk; }
  // col pallone in mano il portiere sta dritto (niente posa di attesa) e le braccia lo tengono al petto: il peso alto fa
  // prevalere le braccia sulla corsa (three.js fa la media pesata delle azioni sullo stesso osso)
  const inMano = f.A.braccia && p.i === 0 && G.ball.owner === p && (G.state === 'play' || G.state === 'restart');
  if (inMano && !p.fx) tg.braccia = MANO.peso;
  else if (f.A.gkIdle && G.state === 'play') { tg.gkIdle = tg.idle; tg.idle = 0; }
  // Chi guarda la palla mentre si sposta (il portiere, il difensore che temporeggia) non corre in avanti: di lato fa i passi
  // laterali, all'indietro la corsetta al contrario (la clip gira a rovescio: la punta tocca prima del tallone, come arretrando)
  if (f.A.passoS && G.state === 'play' && G.ball.owner !== p && (p.i === 0 || p.jock)) {
    const lat = p.vx * Math.cos(p.dir) - p.vz * Math.sin(p.dir), av = p.vx * Math.sin(p.dir) + p.vz * Math.cos(p.dir), m = tg.walk + tg.jog + tg.run;
    if (p.i === 0) { if (Math.abs(lat) > Math.abs(av) && Math.abs(lat) > .8) { tg.walk = tg.jog = tg.run = 0; tg[lat > 0 ? 'passoS' : 'passoD'] = m; } }
    else if (v > .8) { const q = lat * lat / (lat * lat + av * av + .01); tg.walk *= 1 - q; tg.jog *= 1 - q; tg.run *= 1 - q; tg[lat > 0 ? 'passoS' : 'passoD'] = m * q; } // in diagonale un po' dell'uno e un po' dell'altro
    f.A.passoS.timeScale = f.A.passoD.timeScale = clamp(Math.abs(lat) / (2.3 * alt), .5, 1.7);
    f.indietro = f.indietro ? av < -.2 : av < -.6;
    if (f.indietro) { tg.jog += tg.run; tg.run = 0; } // all'indietro non si scatta
  } else f.indietro = false;
  if (f.A.aereo && G.state === 'goal' && p === G.scorer && v > 2.2) { // il marcatore corre verso la bandierina a braccia aperte
    const m = tg.walk + tg.jog + tg.run; tg.walk = tg.jog = tg.run = 0; tg.aereo = m; f.A.aereo.timeScale = clamp(v / (3.5 * alt), .8, 1.5);
  }
  const a = Math.min(1, dt * 16), rest = Math.max(0, 1 - f.fxW - f.oldW); // le andature seguono presto la velocità: pesi in ritardo fanno scivolare i piedi
  for (const k in f.A) { f.w[k] += (tg[k] - f.w[k]) * a; f.A[k].setEffectiveWeight(f.w[k] * rest); }
  for (const k in MOTO.ANDATURE) if (f.A[k]) f.A[k].timeScale = MOTO.ritmoClip(k, v / alt) * (f.indietro ? -1 : 1); // il piede in appoggio resta fermo sull'erba
  f.mixer.update(dt); f.posaT = G.t;
  // nelle azioni a terra (cadute, tuffi, scivolate, anche mentre sfumano e il giocatore si rialza) si misura la posa vera e
  // si alza il corpo quanto basta perché nessun punto entri nell'erba; capita a pochi giocatori per volta
  f.body.position.y = by;
  const aTerra = (a, w) => a && w > .01 && (A_TERRA.has(a.getClip().name) || A_TERRA_GF.test(a.getClip().name));
  if (aTerra(f.act, f.fxW) || aTerra(f.old, f.oldW)) {
    f.root.updateMatrixWorld(true); const giu = Math.max(0, -puntoBasso(f) - .008);
    f.alza = giu > (f.alza || 0) ? giu : (f.alza || 0) + (giu - (f.alza || 0)) * Math.min(1, dt * 20); // sale subito, scende morbido
  } else f.alza = (f.alza || 0) * Math.max(0, 1 - dt * 12);
  f.body.position.y = by + (f.alza || 0);
  // piedi piantati (src/grafica/piedi.js, applicati dopo l'inclinazione del corpo in draw): non nelle azioni a terra, non
  // nei tuffi e non dopo uno spostamento di colpo
  const salto = f.ultimo ? hyp(p.x - f.ultimo[0], p.z - f.ultimo[1]) > .6 : true; f.ultimo = [p.x, p.z];
  f.piediAttivi = dt > 0 && !salto && (p.st === 'run' || p.st === 'kick') && !aTerra(f.act, f.fxW) && !aTerra(f.old, f.oldW) && !/^(para_|presa_)/.test(p.fx || '');
}
function pose(p, dt) {
  if (p.fig.skinned) return poseSkinned(p, dt);
  const f = p.fig, v = hyp(p.vx, p.vz), a = Math.min(1, v / 6.5);
  f.root.position.set(p.x, 0, p.z); f.root.rotation.y = p.dir;
  p.ph += v * dt * 2.35;
  const s = Math.sin(p.ph), c = Math.cos(p.ph);
  let lL = -s * a * .95, lR = s * a * .95, kL = Math.max(0, c) * a * 1.5 + .08, kR = Math.max(0, -c) * a * 1.5 + .08;
  let aL = s * a * .9, aR = -s * a * .9, eL = -.35 - a * .9, eR = -.35 - a * .9, lean = a * .2, by = Math.abs(s) * .05 * a, rx = 0, rz = 0, azL = 0, azR = 0;
  if (p.st === 'kick') { const k = p.stT / .32, sw = k < .3 ? k / .3 * .9 : .9 - (k - .3) / .7 * 2.4; lR = sw; kR = k < .3 ? .9 : .1; lL = .15; aL = -.9; aR = .7; lean = -.08; }
  else if (p.st === 'slide' || (p.st === 'down' && p.i !== 0)) { rx = -1.25; by = .12; lL = -1.5; lR = -1.1; kL = .1; kR = .5; aL = .8; aR = .8; lean = 0; }
  else if (p.st === 'dive' || (p.st === 'down' && p.i === 0)) { const k = p.st === 'dive' ? Math.min(1, p.stT / .22) : 1; const side = Math.sin(p.dir) * 0 + p.diveS * (Math.sin(p.dir) > 0 ? 1 : -1); rz = side * 1.35 * k; by = p.st === 'dive' ? Math.sin(Math.min(1, p.stT / .5) * Math.PI) * .55 + .2 : .22; aL = aR = -2.9; eL = eR = 0; lL = lR = 0; kL = kR = .2; lean = 0; }
  else if (G.state === 'goal' && G.scorer && p.team === G.scorer.team && p.i !== 0) { aL = aR = -2.7 + Math.sin(G.t * 9 + p.i) * .25; eL = eR = -.2; by += Math.abs(Math.sin(G.t * 7 + p.i)) * .22; }
  else if (p.i === 0 && a < .3) { azL = -.5; azR = .5; eL = eR = -.5; kL = kR = .35; lL = lR = -.25; }
  else if (G.ball.owner === p && p.i === 0) { aL = aR = -1.2; eL = eR = -1.2; }
  f.legL.rotation.x = lL; f.legR.rotation.x = lR; f.kneeL.rotation.x = kL; f.kneeR.rotation.x = kR;
  f.armL.rotation.x = aL; f.armR.rotation.x = aR; f.armL.rotation.z = azL; f.armR.rotation.z = azR; f.elL.rotation.x = eL; f.elR.rotation.x = eR;
  f.body.rotation.x = rx + lean; f.body.rotation.z = rz; f.body.position.y = by;
}

// Gambe al passo: camminata, corsetta e corsa girano tutte sulla fase p.passo del corpo (src/fisica/corpo.js), così il
// piede scende proprio quando parte il tocco di palla e le tre clip si fondono senza piedi che scivolano. Si sistema il tempo
// delle clip prima che l'animazione avanzi, tenendo conto di quanto avanzerà in questo fotogramma.
function allinea(p, dt) {
  const f = p.fig; if (!f.skinned || !f.A) return;
  const v = hyp(p.vx, p.vz);
  for (const k in MOTO.ANDATURE) {
    const a = f.A[k]; if (!a) continue;
    // chi arretra guardando la palla percorre la clip al contrario: la fase va all'indietro mentre il passo avanza
    const D = a.getClip().duration, r = dt * MOTO.ritmoClip(k, v / (f.alt || 1));
    const t = f.indietro ? (((1 - (p.passo || 0) + MOTO.ANDATURE[k].dx) % 1) * D + r) : (((p.passo || 0) + MOTO.ANDATURE[k].dx) % 1) * D - r;
    a.time = ((t % D) + D) % D;
  }
}
// Il corpo si piega nelle curve (verso l'interno, di più a velocità alta) e in avanti quando accelera, all'indietro quando frena.
function inclina(p, dt) {
  const r = p.fig.root, v = hyp(p.vx, p.vz), acc = dt > 0 ? (v - (p.vPrima || 0)) / dt : 0; p.vPrima = v;
  if (r.rotation.order !== 'YXZ') r.rotation.order = 'YXZ';
  const giu = p.st === 'run' || p.st === 'kick', k = Math.min(1, dt * 8);
  const roll = giu ? clamp(-(p.wy || 0) * v * .016, -.24, .24) : 0, pitch = giu ? clamp(acc * .012 + v * .005, -.1, .14) : 0;
  r.rotation.z += (roll - r.rotation.z) * k; r.rotation.x += (pitch - r.rotation.x) * k;
}

/* ------------------------------------------------------------------ camera e disegno */
// Inquadrature dei piazzati, finché non si calcia: angolo dall'alto alle spalle della bandierina verso l'area, punizione da
// dietro il pallone verso la porta, rigore alle spalle di chi tira. null quando si gioca.
function inquadratura() {
  const b = G.ball, fk = G.fk; if (!b || !fk || !(G.state === 'restart' || G.penWait > 0) || REGIA.figure()) return null;
  if (fk.corner) { const sx = sgn(b.x), sz = sgn(b.z); return { p: [b.x + sx * 5, 12, b.z + sz * 8], l: [sx * (HL - 9), 0, sz * 2], fov: 44 }; }
  if (fk.pen) { const s = sgn(b.x); return { p: [b.x - s * 10, 4.2, b.z * .3], l: [s * HL, 0, 0], fov: 30 }; }
  if (fk.wall || fk.direct) { const t = G.next, gx = t ? t.side * HL : sgn(b.x) * HL, dx = b.x - gx, dz = b.z, d = hyp(dx, dz) || 1; return { p: [b.x + dx / d * 10, 5, b.z + dz / d * 10], l: [gx, 0, 0], fov: 34 }; }
  return null;
}
const _qCam = new T.Quaternion(), _mCam = new T.Matrix4(), _vCam = new T.Vector3(), _asseX = new T.Vector3(1, 0, 0);
function updateCamera(dt) {
  const b = G.ball; let fx = 0, fz = 0;
  if (b) { fx = b.x; fz = b.z; if (G.state === 'goal' && G.scorer && G.stateT > .9) { fx = G.scorer.x; fz = G.scorer.z; } }
  let px, py, pz, lx, lz, fov, gioco = false;
  if (G.dbgCam) { cam.position.set(G.dbgCam[0], G.dbgCam[1], G.dbgCam[2]); cam.lookAt(G.dbgCam[3], G.dbgCam[4], G.dbgCam[5]); cam.fov = G.dbgCam[6] || 30; cam.updateProjectionMatrix(); return; }
  if (G.state === 'menu') { const a = G.t * .07; px = Math.sin(a) * 74; pz = Math.cos(a) * 62; py = 30; lx = 0; lz = 0; fov = 40; }
  else if ((G.inquadra = inquadratura())) { const q = G.inquadra; [px, py, pz] = q.p; [lx, , lz] = q.l; fov = q.fov; } // piazzati: inquadratura dedicata
  else if (G.state === 'goal' && G.scorer && G.stateT > .9 && !REGIA.S.on) { lx = fx; lz = fz; px = lx; pz = lz + 24; py = 12; fov = 36; } // dopo il gol, senza la regia (pupazzi a blocchi): più vicini al marcatore
  else {
    // Telecamera di gioco (CAMERA in src/config.js): di lato, sempre alla stessa altezza e distanza dal punto inquadrato,
    // inclinata verso il basso di un angolo fisso e mai girata a destra o a sinistra. Il punto inquadrato segue il pallone
    // (dopo un gol chi ha segnato): per intero lungo il campo, solo in parte in profondità, senza uscire dai bordi.
    const C = CAMERA; gioco = true;
    const tx = clamp(fx * C.seguiX, -(HL - C.bordoX), HL - C.bordoX), tz = Math.min(clamp(fz, -HW, HW) * C.seguiZ, C.zMax - C.dietro);
    px = tx; py = C.alto; pz = tz + C.dietro; lx = tx; lz = tz;
    fov = C.fov; // verticale, fisso (Dream League): la larghezza in orizzontale segue le proporzioni dello schermo
  }
  // movimento morbido: una molla smorzata al punto giusto, senza scatti né oscillazioni, più lenta nel menu. In gioco è il
  // leggero ritardo con cui l'inquadratura segue il pallone
  const kk = G.state === 'menu' ? 1.6 : gioco ? CAMERA.molla : 3.2, v = G.camV || (G.camV = { px: 0, py: 0, pz: 0, lx: 0, lz: 0 }), h = Math.min(dt, .05);
  const molla = (val, mira, nome) => { v[nome] += (kk * kk * (mira - val) - 2 * kk * v[nome]) * h; return val + v[nome] * h; };
  // dt grande (dopo un replay, per le prove): si va subito al posto giusto
  if (dt > 1) { camPos.set(px, py, pz); camLook.x = lx; camLook.z = lz; for (const k in v) v[k] = 0; }
  else { camPos.x = molla(camPos.x, px, 'px'); camPos.y = molla(camPos.y, py, 'py'); camPos.z = molla(camPos.z, pz, 'pz'); camLook.x = molla(camLook.x, lx, 'lx'); camLook.z = molla(camLook.z, lz, 'lz'); }
  cam.position.copy(camPos);
  // orientamento: in gioco fisso, con la sola inclinazione. Altrove verso il punto inquadrato. Tra i due si passa morbidi
  if (gioco) _qCam.setFromAxisAngle(_asseX, -CAMERA.inclina * Math.PI / 180);
  else { _mCam.lookAt(camPos, _vCam.set(camLook.x, 1, camLook.z), cam.up); _qCam.setFromRotationMatrix(_mCam); }
  if (dt > 1 || cam.quaternion.angleTo(_qCam) < .002) cam.quaternion.copy(_qCam); else cam.quaternion.slerp(_qCam, Math.min(1, dt * 5));
  if (Math.abs(cam.fov - fov) > .01) { cam.fov = dt > 1 ? fov : cam.fov + (fov - cam.fov) * Math.min(1, dt * 3); cam.updateProjectionMatrix(); }
}
// La folla: alla nuova partita prende i colori delle due squadre e si riempie secondo l'importanza (amichevole meno gente,
// carriera secondo il livello dello stadio, coppe a eliminazione e finali piene); esulta sui tiri pericolosi e sui gol.
const TIFO = { partita: null, tiro: -1, gol: 0, base: .55 };
// quanta gente si disegna: l'importanza della partita per la qualità grafica (meno tifosi se il dispositivo arranca)
function pienone() { if (SPALTI) SPALTI.densita(TIFO.base * [1, .8, .6, .4][QUAL.livello || 0]); }
function folla(dt) {
  const [h, a] = G.teams;
  if (h && TIFO.partita !== h.club.id + a.club.id) {
    TIFO.partita = h.club.id + a.club.id; SPALTI.colora(h.club, a.club); TIFO.tiro = G.shotId; TIFO.gol = G.goals.length;
    const c = G.comp, liv = K ? K.stadio || 1 : 1, ko = c && (c.tipo === 'coppa' || (c.tipo === 'castelli' && /final|semi|quart/i.test(c.titolo || '')));
    TIFO.base = !c ? .55 : ko ? (/finale/i.test(c.titolo || '') ? 1 : .85) : .55 + .09 * (liv - 1); pienone();
  }
  if (h && G.shotId !== TIFO.tiro) { TIFO.tiro = G.shotId; if (G.shooter && G.state === 'play') SPALTI.esulta(G.shooter.team.idx, .55, 1); } // tiro: un sussulto
  if (h && G.goals.length !== TIFO.gol) { TIFO.gol = G.goals.length; if (G.scorer) SPALTI.esulta(G.scorer.team.idx, 1, 6); } // gol: salti e braccia al cielo
  // il brusio: quanta gente c'è e quanto è vicina la palla alla porta (ultimi 25 metri)
  if (h && G.ball) AU.pubblico(TIFO.base, G.state === 'play' ? clamp((Math.abs(G.ball.x) - (HL - 25)) / 12, 0, 1) : G.state === 'goal' ? 1 : 0);
  SPALTI.muovi(dt, G.t);
}
function draw(dt) {
  const b = G.ball;
  if (b) {
    if (!REGIA.figure()) for (const p of all()) { allinea(p, dt); pose(p, dt); inclina(p, dt); if (p.fig.skinned && !G.senzaPiedi) bloccaPiedi(p.fig, dt, !!p.fig.piediAttivi); } // durante il replay le figure le mette in posa la regia
    else for (const p of all()) p.fig.root.rotation.x = p.fig.root.rotation.z = 0;
    const sp = hyp(b.vx, b.vz);
    ballMesh.position.set(b.x, b.y, b.z); if (sp > .3) { ballMesh.rotation.z -= b.vx * dt / BR * .6; ballMesh.rotation.x += b.vz * dt / BR * .6; ballMesh.rotation.y += (b.c || 0) * dt * 25; }
    ballShadow.position.set(b.x, .04, b.z); ballShadow.scale.setScalar(1.25 + b.y * .16); ballShadow.material.opacity = .62 / (1 + Math.max(0, b.y - BR) * .32); // a terra scura e stretta, in aria larga e chiara: si capisce dove scende un cross
    // segni sopra le teste come Dream League (li disegna la regia): niente anello ai piedi né freccia della levetta
    const c = G.ctrl; G.segno = !!c && !G.auto && G.state !== 'full'; ring.visible = arrow.visible = freccia.visible = false;
    // in difesa: il compagno che si prenderebbe con «Cambia giocatore» (segnalino grigio), ricalcolato ogni tanto
    if (!G.segno || modoAttacco() || G.state !== 'play') G.prossimo = null;
    else if (G.t >= (G.prossimoT || 0)) { G.prossimoT = G.t + SEGNI.cambio; const m = migliorDifensore(G.teams[0], c); G.prossimo = m ? m.p : null; }
    segnoAlto(b);
  }
  if (dt > 0) { // rete, bandierine e particelle
    for (const p of PORTE) p.muovi(dt, G.ball);
    if (G.state !== 'goal' && G.state !== 'menu' && !REGIA.figure()) { const k = Math.floor(G.t / 7) * .25; for (const bo of boards) bo.material.map.offset.x = k; } // tabelloni LED: un pannello nuovo ogni 7 secondi
    if (BANDIERINE && G.ball) BANDIERINE.muovi(dt, [{ x: G.ball.x, z: G.ball.z, vx: G.ball.vx, vz: G.ball.vz, alto: G.ball.y }, ...all().map((p) => ({ x: p.x, z: p.z, vx: p.vx, vz: p.vz, alto: 0 }))]);
    PART.muovi(dt); if (SPALTI) folla(dt); if (BORDO && G.ball) BORDO.muovi(dt, G.ball.x, G.ball.z); rilievoDivise();
  }
  if (G.buioT && G.t >= G.buioT) { G.buioT = 0; updateCamera(9); } // a metà della dissolvenza della rimessa: stacco sul punto di battuta
  updateCamera(dt); REGIA.dopo(dt); seguiOmbre(); dettagliFigure(); if (RESA) RESA.disegna(); else renderer.render(scene, cam);
}
const REGIA = creaRegia({ scene, cam, G, $, all, pose, hyp, clamp, sgn, HL, HW, ballMesh, ballShadow, ring, arrow, camPos, camLook, boards, img, cdist, lum,
  makeSkinned, pickKits, paintBoards, updateCamera, offsideLine, hasFx, potenza: () => potenzaBarra(), model: () => MODEL, crest: () => CREST });
window.__regia = REGIA;

/* ------------------------------------------------------------------ HUD */
let bannerT = 0;
function banner(t, s, ms, c) { const el = $('#banner'); el.dataset.c = c || ''; el.querySelector('.t').textContent = t; el.querySelector('.s').textContent = s || ''; el.classList.add('su'); clearTimeout(bannerT); bannerT = setTimeout(() => el.classList.remove('su'), ms); }
let lastClock = '', lastChi = null, lastAtt = null, lastTipo = '';
// dissolvenza scura breve (rimessa laterale)
function buio() { const el = $('#buio'); el.style.setProperty('--d', `${FERMI.buio}s`); el.classList.remove('va'); void el.offsetWidth; el.classList.add('va'); }
// La potenza mentre si tiene premuto un tasto di calcio (da 0 a 1), o -1: la barra la disegna la regia sotto il nome
const potenzaBarra = () => (G.charge >= 0 && G.ctrl && G.ball && G.ball.owner === G.ctrl ? potenza() : -1);
function hud() {
  if (!G.teams.length) return;
  $('#sbS').textContent = `${G.teams[0].score} - ${G.teams[1].score}`;
  const m = ((G.half - 1) + Math.min(1, G.clock / HALF_SECS)) * 45, txt = `${String(Math.floor(m)).padStart(2, '0')}:${String(Math.floor(m % 1 * 60)).padStart(2, '0')}`;
  if (txt !== lastClock) { $('#sbT').textContent = txt; lastClock = txt; }
  if (G.ctrl !== lastChi) { lastChi = G.ctrl; $('#chi').innerHTML = G.ctrl ? `<i>${G.ctrl.num}</i>${G.ctrl.name.replace(/[<>&]/g, '')}` : ''; }
  // le scritte dei tre tasti cambiano col possesso (A tiro o scivolata, B passaggio o pressing, C lancio o cambio)
  const att = modoAttacco();
  if (att !== lastAtt) { lastAtt = att; $('#bA').textContent = att ? 'Calcio basso' : 'Pressing'; $('#bD').textContent = att ? 'Calcio alto' : 'Cambia giocatore'; $('#hud').classList.toggle('difesa', !att); }
  if (G.ctrl) $('#en').firstElementChild.style.width = `${G.ctrl.en * 100}%`;
  // palle ferme: la scritta col tipo sotto il tabellone, comandi nascosti (tornano quando si può battere). Sui calci piazzati le
  // tre icone in alto a destra (per ora solo lo spazio)
  const fermo = G.state === 'restart' && !G.so, tipo = fermo ? G.tipoFermo || '' : '';
  if (tipo !== lastTipo) { lastTipo = tipo; $('#tipo').textContent = tipo; }
  const hh = $('#hud'); hh.classList.toggle('fermo', fermo); hh.classList.toggle('piazzato', fermo && !!G.fk);
}
const radar = $('#radar'), rx = radar.getContext('2d');
function drawRadar() {
  const w = radar.width, h = radar.height; rx.clearRect(0, 0, w, h);
  rx.fillStyle = 'rgba(10,10,12,.62)'; rx.fillRect(0, 0, w, h); rx.strokeStyle = 'rgba(255,255,255,.45)'; rx.lineWidth = 2; rx.strokeRect(5, 5, w - 10, h - 10);
  rx.beginPath(); rx.moveTo(w / 2, 5); rx.lineTo(w / 2, h - 5); rx.stroke();
  const X = (x) => 5 + (x + HL) / (HL * 2) * (w - 10), Z = (z) => 5 + (z + HW) / (HW * 2) * (h - 10);
  for (const t of G.teams) for (const p of t.players) { rx.fillStyle = p === G.ctrl ? '#D9F51F' : (t.idx ? '#ff5a5a' : '#ffffff'); rx.beginPath(); rx.arc(X(p.x), Z(p.z), p === G.ctrl ? 6 : 4.4, 0, 7); rx.fill(); }
  rx.fillStyle = '#ffb300'; rx.beginPath(); rx.arc(X(G.ball.x), Z(G.ball.z), 3.6, 0, 7); rx.fill();
}

/* ------------------------------------------------------------------ audio: effetti, pubblico e musica (src/audio.js) */
const AU = creaAudio();

/* ------------------------------------------------------------------ comandi */
function bindInput() {
  // levetta a base fissa (come Dream League): il centro è quello del cerchio disegnato, ovunque si tocchi la metà sinistra
  const zona = $('#stickZona'), stick = $('#stick'), knob = stick.firstElementChild; let sid = null, ox = 0, oy = 0; const R = LEVETTA.raggio;
  const loc = (e) => (G.rot ? [e.clientY, window.innerWidth - e.clientX] : [e.clientX, e.clientY]); // dal tocco sullo schermo al punto nel gioco
  const centro = () => { ox = zona.offsetLeft + stick.offsetLeft + stick.offsetWidth / 2; oy = zona.offsetTop + stick.offsetTop + stick.offsetHeight / 2; };
  const muovi = (e) => {
    const q = loc(e); let dx = q[0] - ox, dy = q[1] - oy; const l = hyp(dx, dy);
    if (l > R) { dx *= R / l; dy *= R / l; } G.in.jx = dx / R; G.in.jy = dy / R; knob.style.transform = `translate(${dx}px,${dy}px)`;
    stick.classList.toggle('scatto', hyp(dx, dy) >= R * LEVETTA.scatto);
  };
  zona.addEventListener('pointerdown', (e) => { if (sid !== null) return; sid = e.pointerId; zona.setPointerCapture(sid); centro(); muovi(e); e.preventDefault(); });
  zona.addEventListener('pointermove', (e) => { if (e.pointerId === sid) muovi(e); });
  const end = (e) => { if (e.pointerId !== sid) return; sid = null; G.in.jx = G.in.jy = 0; knob.style.transform = ''; stick.classList.remove('scatto'); };
  zona.addEventListener('pointerup', end); zona.addEventListener('pointercancel', end);
  const btn = (id, down, up) => {
    const el = $(id);
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); el.setPointerCapture(e.pointerId); el.classList.add('giu'); down(); });
    const u = () => { el.classList.remove('giu'); up && up(); }; el.addEventListener('pointerup', u); el.addEventListener('pointercancel', u);
  };
  btn('#bA', () => pressA(true), () => pressA(false)); btn('#bD', () => pressD(true), () => pressD(false)); btn('#bB', () => pressB(true), () => pressB(false));
  const keys = new Set();
  // le frecce sono la levetta tutta inclinata (scatto): con Maiusc si corre senza scattare
  const axis = () => {
    const x = (keys.has('ArrowRight') || keys.has('d') ? 1 : 0) - (keys.has('ArrowLeft') || keys.has('a') ? 1 : 0), y = (keys.has('ArrowDown') || keys.has('s') ? 1 : 0) - (keys.has('ArrowUp') || keys.has('w') ? 1 : 0);
    const l = hyp(x, y) || 1, k = (keys.has('Shift') || keys.has('l') ? LEVETTA.tastieraCorsa : 1) / l; G.in.jx = x * k; G.in.jy = y * k;
  };
  window.addEventListener('keydown', (e) => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; if (e.repeat) return;
    if (k.startsWith('Arrow') || k === ' ') e.preventDefault();
    keys.add(k); axis();
    if (k === 'x' || k === 'k') pressA(true); else if (k === 'c' || k === 'i') pressD(true); else if (k === ' ' || k === 'j') pressB(true); else if (k === 'p' || k === 'Escape') pause(!G.paused);
  });
  window.addEventListener('keyup', (e) => { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; keys.delete(k); axis(); if (k === ' ' || k === 'j') pressB(false); else if (k === 'x' || k === 'k') pressA(false); else if (k === 'c' || k === 'i') pressD(false); });
  window.addEventListener('contextmenu', (e) => e.preventDefault());
}

/* ------------------------------------------------------------------ schermate */
const show = (id) => { for (const s of ['#home', '#nuovo', '#hub', '#pan', '#scelta', '#pre', '#vs', '#stop', '#cambi', '#fine']) $(s).classList.toggle('nas', s !== id); };
const sel = { mia: null, loro: null, diff: 'normale', form: '4-3-3', ment: 0, ora: 'giorno' };
const SAVE = 'fantatitano-partita';
try { const v = JSON.parse(localStorage.getItem(SAVE) || '{}'); if (FORMS[v.form]) sel.form = v.form; if ([-1, 0, 1].includes(v.ment)) sel.ment = v.ment; if (DIFF[v.diff]) sel.diff = v.diff; if (v.ora === 'notte' || v.ora === 'giorno') sel.ora = v.ora; } catch (e) { /* si parte dai valori di base */ }
const save = () => { try { localStorage.setItem(SAVE, JSON.stringify({ form: sel.form, ment: sel.ment, diff: sel.diff, ora: sel.ora })); } catch (e) { /* senza memoria si gioca lo stesso */ } };
const esc = (n) => String(n).replace(/[<>&"]/g, '');
// Valore del giocatore da 55 a 88, confrontato con quelli del suo ruolo
const RANGE = {}; for (const c of CLUBS) for (const [, r, , q] of c.xi) { const v = RANGE[r] || (RANGE[r] = [q, q]); v[0] = Math.min(v[0], q); v[1] = Math.max(v[1], q); }
const ovr = (r, q) => Math.round(55 + clamp((q - RANGE[r][0]) / (RANGE[r][1] - RANGE[r][0] || 1), 0, 1) * 33);
const RUOLO = { P: 'POR', D: 'DIF', C: 'CEN', A: 'ATT' };
function drawSide(el, c, formName, kit, gk) {
  const f = FORMS[formName];
  el.innerHTML = `<div class="testa"><img src="${img(c.id + '-mini')}" alt=""><div><b>${esc(c.name)}</b><span class="st">${'★'.repeat(c.str)}<s>${'★'.repeat(5 - c.str)}</s></span></div><em>${formName}</em></div><div class="erba">`
    + c.xi.map(([name, role, num, q], i) => { const [x, z] = f.pos[i], k = i ? kit : gk; return `<div class="pl" style="left:${(50 + z / 23 * 37).toFixed(1)}%;top:${(i ? 67 - (x + 35) / 46 * 54 : 88).toFixed(1)}%"><b style="background:${k.shirt};color:${k.ink}">${num}</b><span>${esc(name)}</span><i>${RUOLO[f.roles[i]]} ${ovr(role, q)}</i></div>`; }).join('') + '</div>';
}
// La mia rosa: titolari e riserve; toccando un titolare e una riserva dello stesso ruolo si scambiano
let rXi = -1, rPan = -1;
function drawRosa(msg) {
  const H = club(sel.mia), pan = H.pan || [], riga = (x, attr, scelto) => `<button class="gioc${scelto ? ' sel' : ''}" ${attr}><b>${x[2]} ${esc(x[0])}</b><span>${RUOLO[x[1]]}</span><em>${ovr(x[1], x[3])}</em></button>`;
  $('#campoA').innerHTML = `<div class="rosa"><div><h4>Titolari</h4>${H.xi.map((x, i) => riga(x, `data-x="${i}"`, i === rXi)).join('')}</div><div><h4>Riserve</h4>${pan.map((x, i) => riga(x, `data-n="${i}"`, i === rPan)).join('') || '<p class="vuoto">Nessuna riserva</p>'}`
    + `<p class="nota">${msg || (pan.length ? 'Tocca un titolare e una riserva dello stesso ruolo per scambiarli' : '')}</p></div></div>`;
}
function tapRosa(e) {
  const b = e.target.closest('button'); if (!b || !K || !G.comp || G.comp.tipo !== 'rosa') return;
  if (b.dataset.x) rXi = +b.dataset.x; else if (b.dataset.n) rPan = +b.dataset.n; else return;
  if (rXi < 0 || rPan < 0) return drawRosa();
  const H = club(K.club), entra = H.pan[rPan][0], ok = CAR.cambiaTitolare(K, CLUBS, rXi, rPan); rXi = rPan = -1; if (ok) { applicaMio(); salvaK(); }
  showPre(ok ? `${esc(entra)} è titolare` : 'Devono avere lo stesso ruolo');
}
function showPre(msg) {
  const c = G.comp, rosa = !!c && c.tipo === 'rosa', H = club(sel.mia), A = club(sel.loro), [kh, ka, g1, g2] = kitsFor(H, A, !!(c && c.fuori));
  drawSide($('#campoH'), H, sel.form, kh, g1);
  if (rosa) drawRosa(typeof msg === 'string' ? msg : '');
  else drawSide($('#campoA'), A, aiForm(A), ka, g2);
  $('#gioca').classList.toggle('nas', rosa); $('#preInd').textContent = c ? '‹ Indietro' : '‹ Squadre';
  $('#preT').textContent = rosa ? 'La mia rosa' : c ? c.titolo : `Amichevole · ${sel.diff}`; show('#pre');
}
/* ------------------------------------------------------------------ carriera: dashboard e pannelli (la logica è in carriera.js) */
let K = null; // la carriera: sul dispositivo e, con l'accesso, anche sull'account (cloud.js)
const stelle = (n) => `<span class="st">${'★'.repeat(n)}<s>${'★'.repeat(5 - n)}</s></span>`;
const mini = (id) => `<img src="${img(id + '-mini')}" alt="">`;
const mon = (n) => Number(n).toLocaleString('it-IT');
const fmtTempo = (ms) => { const h = Math.max(0, Math.floor(ms / 36e5)); return h >= 24 ? `${Math.floor(h / 24)}g ${h % 24}h` : `${h}h ${Math.floor((ms % 36e5) / 6e4)}m`; };
function avviso(t) { const el = $('#avviso'); el.textContent = t; el.classList.add('su'); clearTimeout(avviso.t); avviso.t = setTimeout(() => el.classList.remove('su'), 2800); }

/* --- il club dell'utente: nome, colori e stemma scelti all'inizio. Prende il posto della SM Academy U22 e parte dai suoi ragazzi,
   più il capitano ingaggiato: così le altre quindici squadre restano quelle vere. */
const POSTO = 'academy';
const COLORI = [['#4B06FC', '#D9F51F'], ['#C0392B', '#FFFFFF'], ['#111111', '#D9F51F'], ['#1D4F8A', '#FFFFFF'], ['#2E8B57', '#F2B822'], ['#E0B400', '#111111'], ['#7A1F3D', '#E8C77A'], ['#FF7A1A', '#1B2A5C']];
const STILI = [['', 'Tinta unita'], ['righe', 'Righe'], ['righine', 'Righine'], ['fasce', 'Fasce'], ['onde', 'Onde'], ['banda', 'Banda'], ['diagonale', 'Diagonale'], ['meta', 'Metà'], ['quarti', 'Quarti'], ['terzi', 'Terzi'], ['scacchi', 'Scacchi'], ['v', 'V'], ['chevron', 'Chevron'], ['petto', 'Fascia sul petto'], ['spalle', 'Spalle'], ['maniche', 'Maniche'], ['fianchi', 'Fianchi'], ['sfumata', 'Sfumata'], ['mimetica', 'Mimetica'], ['pennellata', 'Pennellata']];
const NOMI = ['Titani FC', 'Real Montale', 'Atletico Borgo', 'Sporting Serravalle', 'Libera Acquaviva', 'Rocca United', 'Guaita Calcio', 'Cesta FC', 'Dogana Stars', 'Chiesanuova FC', 'Torri Unite', 'Olimpia Titano'];
const sigla = (n) => (String(n).replace(/[^A-Za-zÀ-ÿ ]/g, '').split(/\s+/).filter((w) => w.length > 2 && !/^(fc|real|united|calcio)$/i.test(w))[0] || String(n) || 'MIO').slice(0, 3).toUpperCase();
// Lo stemma del club: uno scudo coi colori e il disegno scelti, la sigla e la corona di Fantatitano
function disegnaStemma(m, w) {
  const h = Math.round(w * 1.18), [c, x] = cv(w, h), k = w / 240, sh = () => { x.beginPath(); x.moveTo(20 * k, 34 * k); x.lineTo(220 * k, 34 * k); x.lineTo(220 * k, 150 * k); x.quadraticCurveTo(220 * k, 238 * k, 120 * k, 278 * k); x.quadraticCurveTo(20 * k, 238 * k, 20 * k, 150 * k); x.closePath(); };
  x.save(); sh(); x.clip(); x.fillStyle = m.c1; x.fillRect(0, 0, w, h); x.fillStyle = m.c2;
  if (m.stile === 'righe') for (let i = 0; i < 4; i++) x.fillRect((44 + i * 48) * k, 0, 24 * k, h);
  else if (m.stile === 'banda') { x.beginPath(); x.moveTo(0, 80 * k); x.lineTo(w, 180 * k); x.lineTo(w, 240 * k); x.lineTo(0, 140 * k); x.fill(); }
  else if (m.stile === 'meta') x.fillRect(120 * k, 0, w, h);
  else if (m.stile === 'fasce') for (let i = 0; i < 5; i++) x.fillRect(0, (40 + i * 56) * k, w, 28 * k);
  else if (m.stile === 'scacchi') for (let i = 0; i < 6; i++) for (let j = 0; j < 7; j++) if ((i + j) & 1) x.fillRect(i * 40 * k, j * 40 * k, 40 * k, 40 * k);
  else if (m.stile === 'v') { x.beginPath(); x.moveTo(0, 60 * k); x.lineTo(120 * k, 150 * k); x.lineTo(w, 60 * k); x.lineTo(w, 100 * k); x.lineTo(120 * k, 190 * k); x.lineTo(0, 100 * k); x.fill(); }
  x.restore(); sh(); x.lineWidth = 12 * k; x.strokeStyle = m.stile ? '#FFFFFF' : m.c2; x.stroke();
  x.fillStyle = '#D9F51F'; x.strokeStyle = '#0A0A0C'; x.lineWidth = 4 * k; x.beginPath(); // corona
  for (const [px, py] of [[78, 30], [86, 4], [104, 20], [120, 0], [136, 20], [154, 4], [162, 30]]) x.lineTo(px * k, py * k);
  x.closePath(); x.stroke(); x.fill();
  x.font = `${Math.round(78 * k)}px Anton, Impact, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
  x.lineWidth = 14 * k; x.strokeStyle = 'rgba(10,10,12,.55)'; x.strokeText(m.sigla || 'MIO', 120 * k, 152 * k); x.fillStyle = '#FFFFFF'; x.fillText(m.sigla || 'MIO', 120 * k, 152 * k);
  return c.toDataURL('image/png');
}
const forzaClub = (c) => clamp(Math.round((c.xi.reduce((s, x) => s + ovr(x[1], x[3]), 0) / c.xi.length - 58) / 5), 1, 5);
/** Mette sul posto della SM Academy U22 il club dell'utente (nome, sigla, colori, stemma), o la rimette com'era se non c'è. */
function applicaMio() {
  const c = club(POSTO); if (!c) return;
  if (!c.orig) c.orig = { name: c.name, short: c.short, c1: c.c1, c2: c.c2, st: c.st, col: c.col, rag: c.rag, str: c.str };
  const m = K && K.club === POSTO && K.mio && K.mio.nome ? K.mio : null;
  if (m) { Object.assign(c, { name: m.nome, short: m.sigla, c1: m.c1, c2: m.c2, st: m.stile || undefined, col: m.colletto || undefined, rag: m.colletto ? !!m.raglan : undefined }); c.str = forzaClub(c); IMGX[POSTO] = disegnaStemma(m, 240); IMGX[POSTO + '-mini'] = disegnaStemma(m, 96); }
  else { Object.assign(c, c.orig); delete IMGX[POSTO]; delete IMGX[POSTO + '-mini']; }
  stemmi3d.delete(POSTO); loadImg(img(POSTO + '-mini')).then((i) => { CREST[POSTO] = i; stemmi3d.delete(POSTO); });
}
// Le doti di un giocatore, ricavate dal suo valore e dal ruolo (con un po' di differenza tra uno e l'altro): servono alle carte
const DOTI = { P: [['PAR', 5], ['RIF', 4], ['PRE', 3], ['POS', 2], ['RIN', -3], ['PAS', -10], ['VEL', -15], ['POT', -4]], D: [['VEL', 0], ['ACC', -3], ['RES', 4], ['POT', 5], ['CON', -2], ['PAS', -1], ['TIR', -14], ['DIF', 9]], C: [['VEL', -2], ['ACC', 1], ['RES', 4], ['POT', -2], ['CON', 4], ['PAS', 6], ['TIR', -4], ['DIF', -1]], A: [['VEL', 4], ['ACC', 4], ['RES', 0], ['POT', 1], ['CON', 3], ['PAS', -2], ['TIR', 7], ['DIF', -22]] };
const attributi = (x) => DOTI[x[1]].map(([k, d]) => [k, clamp(ovr(x[1], x[3]) + d + (hash(x[0] + k) % 11) - 5, 30, 95)]);
// Maglia e icone disegnate, per le carte della dashboard
/** Il disegno della maglia come immagine, dalle stesse funzioni che colorano la divisa 3D (src/divisa.js): l'anteprima è
 *  com'è in campo. Il corpo della maglia (26..74 sull'asse x) è largo come il busto, le maniche stanno fuori. */
const _maglie = new Map();
function tramaMaglia(c1, c2, st) {
  const chiave = c1 + c2 + st; if (_maglie.has(chiave)) return _maglie.get(chiave);
  const f = DISEGNI[st]; if (!f) { _maglie.set(chiave, ''); return ''; }
  const W = 100, H = 90, [c, x] = cv(W, H), im = x.createImageData(W, H), a = new T.Color(c1), b = new T.Color(c2);
  for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
    const k = clamp(f((px - 50) / 24 * .19, 1.5 - (py - 2) / 86 * .555), 0, 1), i = (py * W + px) * 4;
    im.data[i] = (a.r + (b.r - a.r) * k) * 255; im.data[i + 1] = (a.g + (b.g - a.g) * k) * 255; im.data[i + 2] = (a.b + (b.b - a.b) * k) * 255; im.data[i + 3] = 255;
  }
  x.putImageData(im, 0, 0); const u = c.toDataURL(); _maglie.set(chiave, u); return u;
}
function maglia(c1, c2, st, colletto = 'giro', raglan = false) {
  const id = 'mg' + hash(c1 + c2 + st + colletto + raglan), f = 'M30 5 L42 2 Q50 9 58 2 L70 5 L95 22 L84 40 L74 34 L74 88 L26 88 L26 34 L16 40 L5 22 Z', u = tramaMaglia(c1, c2, st);
  const dis = u ? `<image href="${u}" width="100" height="90"/>` : '';
  const rag = raglan ? `<path d="M42 2 L30 5 L5 22 L16 40 L26 34 Z M58 2 L70 5 L95 22 L84 40 L74 34 Z" fill="${c2}"/><path d="M42 3 L26 34 M58 3 L74 34" stroke="rgba(0,0,0,.25)" stroke-width="1"/>` : '';
  const collo = colletto === 'v' ? `<path d="M41 2 L50 19 L59 2 Z" fill="rgba(0,0,0,.45)"/><path d="M40 1 L50 19 L60 1" fill="none" stroke="${c2}" stroke-width="4"/>`
    : colletto === 'polo' ? `<path d="M40 1 L50 4 L60 1 L64 4 L54 14 L50 6 L46 14 L36 4 Z" fill="${c2}" stroke="rgba(0,0,0,.3)" stroke-width=".8"/><rect x="48.2" y="6" width="3.6" height="18" fill="${c2}" stroke="rgba(0,0,0,.25)" stroke-width=".6"/><circle cx="50" cy="13" r="1" fill="rgba(0,0,0,.45)"/><circle cx="50" cy="19" r="1" fill="rgba(0,0,0,.45)"/>`
    : `<path d="M42 2 Q50 13 58 2" fill="none" stroke="${c2}" stroke-width="5"/>`;
  // ombreggiatura: fianchi in ombra, luce al centro, qualche piega: sembra stoffa e non un disegno piatto
  const luce = `<linearGradient id="${id}l" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".32"/><stop offset=".3" stop-color="#000" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".1"/><stop offset=".7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".32"/></linearGradient>`;
  const pieghe = '<path d="M33 48 Q40 56 36 70 M66 46 Q60 58 65 72 M44 80 Q50 76 57 81" fill="none" stroke="rgba(0,0,0,.12)" stroke-width="2.2" stroke-linecap="round"/>';
  return `<svg viewBox="0 0 100 90" class="maglia"><defs><clipPath id="${id}"><path d="${f}"/></clipPath>${luce}</defs><g clip-path="url(#${id})"><rect width="100" height="90" fill="${c1}"/>${dis}${rag}<rect x="0" y="0" width="16" height="40" fill="${c2}" opacity=".9" transform="rotate(-34 5 22)"/><rect x="84" y="0" width="16" height="40" fill="${c2}" opacity=".9" transform="rotate(34 95 22)"/>${pieghe}<rect width="100" height="90" fill="url(#${id}l)"/>${collo}</g><path d="${f}" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="1.5"/></svg>`;
}
const COPPA = '<svg viewBox="0 0 64 64" class="icona"><path d="M18 8h28v10a14 14 0 0 1-28 0z" fill="currentColor"/><path d="M18 12H9a9 9 0 0 0 11 13M46 12h9a9 9 0 0 1-11 13" fill="none" stroke="currentColor" stroke-width="4"/><rect x="29" y="31" width="6" height="12" fill="currentColor"/><path d="M20 56h24l-3-12H23z" fill="currentColor"/></svg>';
const TORRI = '<svg viewBox="0 0 64 64" class="icona"><path d="M2 60 L14 40 L22 46 L32 26 L42 46 L50 40 L62 60Z" fill="currentColor" opacity=".45"/><path d="M10 40v-14h2v-3h2v3h2v-3h2v3h2v14zM27 30V10h2V7h2v3h2V7h2v3h2v20zM44 40V26h2v-3h2v3h2v-3h2v3h2v14z" fill="currentColor"/></svg>';

/* --- ingresso: il club (nome, colori, stemma) e poi il capitano. Lo stesso modulo serve a «Personalizza» dal mio club */
const NV = { passo: 1, modifica: false, col: 0, stile: '', colletto: 'giro', raglan: false, cap: null };
const COLLETTI = [['giro', 'Girocollo'], ['v', 'Scollo a V'], ['polo', 'Polo']];
function candidatiCapitano() { // nove tra i migliori, uno per squadra: un portiere, due difensori, tre centrocampisti, tre attaccanti
  const tutti = []; for (const c of CLUBS) if (c.id !== POSTO) c.xi.forEach((x, i) => tutti.push({ c, x, i, v: ovr(x[1], x[3]) }));
  tutti.sort((a, b) => b.v - a.v || b.x[3] - a.x[3]);
  const out = [], vuoi = { P: 1, D: 2, C: 3, A: 3 }, prese = new Set();
  for (const t of tutti) { if (out.filter((o) => o.x[1] === t.x[1]).length >= vuoi[t.x[1]] || prese.has(t.c.id)) continue; out.push(t); prese.add(t.c.id); if (out.length === 9) break; }
  return out.sort((a, b) => 'PDCA'.indexOf(a.x[1]) - 'PDCA'.indexOf(b.x[1]) || b.v - a.v);
}
const cartaGiocatore = (t, scelto) => `<button class="cap${scelto ? ' sel' : ''}" data-cap="${t.c.id}:${t.i}"><div class="cn">${esc(t.x[0])}<small>${esc(t.c.name)}</small></div><div class="at">${attributi(t.x).map(([k, v]) => `<span><i>${k}</i><b class="${v >= 80 ? 'a' : v >= 60 ? 'b' : 'c'}">${v}</b></span>`).join('')}</div><div class="sc"><em>${t.v}</em>${mini(t.c.id)}<b>${t.x[2]}</b><u>${RUOLO[t.x[1]]}</u></div></button>`;
function mioDaModulo() { const nome = ($('#nvClub').value.trim() || NOMI[0]).slice(0, 22), sg = ($('#nvSigla').value.trim() || sigla(nome)).slice(0, 3).toUpperCase(); return { nome, sigla: sg, c1: COLORI[NV.col][0], c2: COLORI[NV.col][1], stile: NV.stile, colletto: NV.colletto, raglan: NV.raglan }; }
function anteprimaClub() { const m = mioDaModulo(); $('#nvStemma').src = disegnaStemma(m, 160); $('#nvMaglia').innerHTML = maglia(m.c1, m.c2, m.stile, m.colletto, m.raglan); for (const b of $('#nvCol').children) b.classList.toggle('on', +b.dataset.col === NV.col); for (const b of $('#nvStile').children) b.classList.toggle('on', b.dataset.stile === NV.stile); for (const b of $('#nvColletto').children) b.classList.toggle('on', b.dataset.colletto ? b.dataset.colletto === NV.colletto : NV.raglan); }
function drawNuovo() {
  const el = $('#nuovo');
  if (NV.passo === 1) {
    const m = NV.modifica && K && K.mio ? K.mio : null;
    el.innerHTML = `<button class="indietro" id="nvInd">‹ Indietro</button><h2 class="h">${NV.modifica ? 'Personalizza il club' : 'Il tuo club'}</h2>
      <div class="nv"><div class="campi">${NV.modifica ? '' : '<label>Il tuo nome<input id="nvNome" maxlength="18" placeholder="Mister" autocomplete="off"></label>'}
        <label>Nome del club<span class="riga"><input id="nvClub" maxlength="22" autocomplete="off" placeholder="${NOMI[0]}"><button id="nvDado" aria-label="Nome a caso">🎲</button></span></label>
        <label>Sigla<input id="nvSigla" maxlength="3" autocomplete="off" placeholder="TIT"></label>
        <div class="lbl">Colori</div><div class="col" id="nvCol">${COLORI.map(([a, b], i) => `<button data-col="${i}" style="background:linear-gradient(135deg,${a} 50%,${b} 50%)"></button>`).join('')}</div>
        <div class="lbl">Disegno</div><div class="seg" id="nvStile">${STILI.map(([k, n]) => `<button data-stile="${k}">${n}</button>`).join('')}</div>
        <div class="lbl">Colletto e maniche</div><div class="seg" id="nvColletto">${COLLETTI.map(([k, n]) => `<button data-colletto="${k}">${n}</button>`).join('')}<button data-raglan="1">Maniche raglan</button></div></div>
      <div class="ante"><img id="nvStemma" alt=""><div id="nvMaglia"></div></div></div>
      <button class="btn" id="nvAvanti">${NV.modifica ? 'Salva' : 'Avanti: il capitano'}</button>`;
    if (m) { $('#nvClub').value = m.nome; $('#nvSigla').value = m.sigla; NV.col = Math.max(0, COLORI.findIndex(([a, b]) => a === m.c1 && b === m.c2)); NV.stile = m.stile || ''; NV.colletto = m.colletto || 'giro'; NV.raglan = !!m.raglan; }
    anteprimaClub();
  } else {
    const cand = candidatiCapitano();
    el.innerHTML = `<button class="indietro" id="nvInd">‹ Il club</button><h2 class="h">Ingaggia il tuo capitano</h2><div class="caps">${cand.map((t) => cartaGiocatore(t, NV.cap === `${t.c.id}:${t.i}`)).join('')}</div>
      <button class="btn ingaggia" id="nvAvanti" ${NV.cap ? '' : 'disabled'}>${NV.cap ? `Ingaggia ${esc(club(NV.cap.split(':')[0]).xi[+NV.cap.split(':')[1]][0])}` : 'Tocca un giocatore'}</button>`;
  }
}
function apriNuovo(modifica = false) { Object.assign(NV, { passo: 1, modifica, cap: null }); if (!modifica) { NV.col = 0; NV.stile = ''; NV.colletto = 'giro'; NV.raglan = false; } drawNuovo(); show('#nuovo'); }
function tapNuovo(e) {
  const b = e.target.closest('button'); if (!b) return;
  if (b.id === 'nvInd') { if (NV.passo === 2) { NV.passo = 1; drawNuovo(); return $('#nvClub') && ($('#nvClub').value = NV.club || '', $('#nvSigla').value = NV.sigla || '', $('#nvNome') && ($('#nvNome').value = NV.nome || ''), anteprimaClub()); } return NV.modifica ? panClubMio() : show('#home'); }
  if (b.id === 'nvDado') { const n = NOMI[(NOMI.indexOf($('#nvClub').value) + 1 + Math.floor(rnd(NOMI.length - 1))) % NOMI.length]; $('#nvClub').value = n; $('#nvSigla').value = sigla(n); return anteprimaClub(); }
  if (b.dataset.col) { NV.col = +b.dataset.col; return anteprimaClub(); }
  if (b.dataset.stile !== undefined) { NV.stile = b.dataset.stile; return anteprimaClub(); }
  if (b.dataset.colletto) { NV.colletto = b.dataset.colletto; return anteprimaClub(); }
  if (b.dataset.raglan) { NV.raglan = !NV.raglan; return anteprimaClub(); }
  if (b.dataset.cap) { NV.cap = b.dataset.cap; return drawNuovo(); }
  if (b.id !== 'nvAvanti') return;
  if (NV.passo === 1) {
    const m = mioDaModulo();
    if (NV.modifica) { K.mio = { ...K.mio, ...m }; applicaMio(); salvaK(); avviso('Club aggiornato'); return panClubMio(); }
    Object.assign(NV, { nome: ($('#nvNome').value.trim() || 'Mister').slice(0, 18), club: $('#nvClub').value, sigla: $('#nvSigla').value, mio: m, passo: 2 }); return drawNuovo();
  }
  const [da, i] = NV.cap.split(':');
  CAR.applica(null, CLUBS); K = CAR.nuova(CLUBS, NV.nome, POSTO, Math.random, NV.mio); CAR.applica(K, CLUBS); CAR.scegliCapitano(K, CLUBS, da, +i); applicaMio(); salvaK();
  avviso(`Benvenuto, ${K.nome}: ${K.mio.capitano} è il tuo capitano`); casa();
}

/* --- la dashboard */
function drawHub() {
  const me = club(K.club), p = CAR.prossima(K), tab = CAR.classifica(K, CLUBS), pos = tab.findIndex((r) => r.id === K.club), oggi = new Date(), st = CAR.statoSfide(K, oggi);
  const fm = formaMaglia(me), kit = maglia(me.c1, me.c2, me.st, fm.colletto, fm.raglan);
  $('#hGem').innerHTML = `<i>◆</i>${mon(K.gemme)}`; $('#hMon').innerHTML = `<i>●</i>${mon(K.monete)}`; $('#hNome').textContent = K.nome; $('#hClub').innerHTML = `${esc(me.name)} ${stelle(me.str)}`; $('#hStemma').src = img(me.id + '-mini');
  $('#hSettT').textContent = fmtTempo(CAR.fineSettimana(oggi) - oggi); $('#hSettP').textContent = `${st.conti.w[0]}/${st.conti.w[1]}`;
  $('#hPremiN').textContent = st.daRiscuotere || ''; $('#hPremi').classList.toggle('pieno', st.daRiscuotere > 0);
  $('#hCampN').textContent = st.daRiscuotere || '';
  const avv = (id, righe) => `<div class="avv"><img src="${img(id)}" alt=""><div><b>${esc(club(id).name)}</b>${righe}</div></div>`;
  // il campionato: prossima partita col tasto, la maglia grande, la giornata e gli ultimi cinque risultati
  const forma = ultimi(5).map((r) => `<i class="${r}">${r.toUpperCase()}</i>`).join('');
  $('#cCamp').innerHTML = `<div class="tt"><h3><b>Fantatitano</b> Campionato</h3></div><div class="testa">`
    + (p ? avv(p.avv, `${stelle(club(p.avv).str)}<i>Partita ${p.giornata} di ${p.totale} · ${p.inCasa ? 'in casa' : 'in trasferta'}</i>`) : avv(K.campione, `<i>Campione · tu ${pos + 1}º</i><i class="vai">Tocca per la nuova stagione</i>`))
    + `<span class="gioca${p ? '' : ' no'}">${p ? 'Gioca<br>adesso' : 'Nuova<br>stagione'}</span></div><div class="kit">${kit}</div>`
    + `<div class="md">Matchday${p ? ` · ${p.giornata}` : ''}</div><div class="forma">${forma || '<span>Prima giornata</span>'}</div>`;
  // sugli schermi bassi quattro righe di classifica, se no cinque
  const nr = innerHeight <= 480 ? 4 : 5, da = clamp(pos - 2, 0, tab.length - nr);
  $('#cClass').innerHTML = `<div class="tt"><h3>Classifica · stagione ${K.stagione}</h3><em>»</em></div><div class="corpo"><table class="mini"><tr><th>G</th><th></th><th>Squadra</th><th>DR</th><th>PUN</th></tr>${tab.slice(da, da + nr).map((r, i) => `<tr class="${r.id === K.club ? 'io' : ''}"><td>${r.g || '–'}</td><td>${da + i + 1}</td><td>${mini(r.id)}${esc(club(r.id).name)}</td><td>${r.gf - r.gs}</td><td>${r.pt}</td></tr>`).join('')}</table><img class="logo" src="img/corona-lime.png" alt=""></div>`;
  // la fine si calcola solo quando la competizione è finita
  const cupCard = (titolo, icona, pr, fineF) => { const fine = pr ? null : fineF(); return `<div class="tt"><h3>${titolo}</h3><em>»</em></div><div class="corpo"><div><span class="pp">${pr ? 'Prossima partita' : fine.titolo}</span>${pr ? avv(pr.avv, `${stelle(club(pr.avv).str)}<i>${pr.nome}</i>`) : avv(fine.id, `<i>${fine.testo}</i>`)}</div>${icona}</div>`; };
  const kc = K.castelli, cc = CAR.castelliProssima(K), camC = CAR.castelliCampione(K);
  $('#cCast').innerHTML = cupCard('Trofeo dei Castelli', TORRI, cc, () => ({ titolo: kc.vinta ? 'Vinto!' : 'Trofeo finito', id: camC || K.club, testo: kc.vinta ? 'Il trofeo è tuo' : `Lo vince ${esc(club(camC).name)} · tu fuori ${kc.fuori === 'gironi' ? 'ai gironi' : CAR.TURNI_KO[kc.fuori].toLowerCase()}` }));
  const k = K.coppa, cp = CAR.coppaProssima(K);
  $('#cCoppa').innerHTML = cupCard('Coppa Titano', COPPA, cp, () => ({ titolo: k.vinta ? 'Vinta!' : 'Coppa finita', id: k.campione || K.club, testo: k.vinta ? 'La coppa è tua' : `La vince ${esc(club(k.campione).name)} · tu fuori: ${CAR.TURNI[k.fuori].toLowerCase()}` }));
  // le sfide in quattro anelli che si riempiono
  $('#tSfide').innerHTML = `<h4>Sfide</h4><div class="anelli">${Object.entries({ d: 'Oggi', w: 'Sett.', c: 'Carriera', s: 'Stagione' }).map(([g, n]) => `<span class="anello"><i>${n}</i><b style="--p:${Math.round(st.conti[g][0] / Math.max(1, st.conti[g][1]) * 100)}">${st.conti[g][0]}/${st.conti[g][1]}</b></span>`).join('')}</div>${st.daRiscuotere ? `<em class="bollo">${st.daRiscuotere}</em>` : ''}`;
  const cap = me.xi.find((x) => K.mio && x[0] === K.mio.capitano) || me.xi.slice().sort((a, b) => ovr(b[1], b[3]) - ovr(a[1], a[3]))[0];
  $('#tRosa').innerHTML = `<div class="txt"><h4>Squadra</h4><span class="sx">${K.mio && cap[0] === K.mio.capitano ? 'Capitano' : 'Il migliore'}</span><b class="big">${esc(cap[0])}</b><span class="rr">${RUOLO[cap[1]]} · ${ovr(cap[1], cap[3])}</span></div><img class="ritratto" src="${ritratto(K.club, cap[0], cap[2], RUOLO[cap[1]] === 'POR')}" alt="">`;
  const t = consigliato(); $('#tMerc').innerHTML = `<div class="tit"><h4>Trasferimenti</h4>${t ? `<span class="frecce"><i>←</i><i>→</i></span><span class="valore">${t.v}</span>` : ''}</div><h5>Mercato</h5><p>Rinforza la squadra: scambia i tuoi giocatori con quelli delle altre.</p>${t ? `<div class="mcard"><em>${t.v}</em>${mini(t.c.id)}<b>${esc(t.x[0])}</b><u>${RUOLO[t.x[1]]}</u></div>` : ''}`;
  const sedute = Object.values(K.allen || {}).reduce((a, b) => a + b, 0);
  $('#tClub').innerHTML = `<h4>Il mio club</h4><button data-club="stadio">Stadio <span>${K.stadio}</span></button><button data-club="allenamento">Allena <span>${sedute}</span></button><button data-club="personalizza">Stemma <span>›</span></button><button data-club="amichevole">Amichevole <span>›</span></button>`;
  $('#hFoto').src = ritratto(K.club, K.nome, '', false, true);
  aggiornaCloud();
}
/** Gli ultimi n risultati del campionato del club dell'utente, dal più vecchio: 'v', 'n' o 'p'. */
function ultimi(n) {
  const out = [];
  for (let g = 0; g < (K.ris || []).length; g++) {
    const i = (K.cal[g] || []).findIndex(([a, b]) => a === K.club || b === K.club), r = K.ris[g] && K.ris[g][i]; if (i < 0 || !r) continue;
    const [f, s] = K.cal[g][i][0] === K.club ? r : [r[1], r[0]]; out.push(f > s ? 'v' : f < s ? 'p' : 'n');
  }
  return out.slice(-n);
}
/*
 * Ritratto di un giocatore (o del mister) dal modello 3D del gioco: la stessa faccia, capelli e divisa che ha in campo,
 * disegnati una volta in un'immagine piccola e tenuti in memoria. mister: senza numero né nome sulla schiena.
 */
const RITRATTI = new Map();
function ritratto(clubId, nome, num, portiere, mister = false) {
  const chiave = `${clubId}|${nome}|${portiere ? 1 : 0}`; if (RITRATTI.has(chiave)) return RITRATTI.get(chiave);
  if (!MODEL || !MODEL.scene) return '';
  let url = '';
  try {
    const c = club(clubId), ks = pickKits(c, CLUBS.find((x) => x.id !== clubId) || c), kit = portiere ? ks[2] : ks[0];
    const fig = makeSkinned(kit, hash(clubId + nome), mister ? '' : num, portiere ? null : clubId, mister ? '' : nome, {}); FIGURE.delete(fig);
    const kr = fig.metri / 2.72; // le distanze della ripresa erano pensate per una figura di 2,72 m
    const sc = new T.Scene(), luce = new T.DirectionalLight(0xffffff, 2.6), viso = new T.DirectionalLight(0xffffff, 1.6), taglio = new T.DirectionalLight(0xB9A4FF, 2.2);
    luce.position.set(1.4, 2.4, 3); viso.position.set(-.6, .4, 3); taglio.position.set(-2, 1.5, -2); sc.add(new T.HemisphereLight(0xdfe6ff, 0x2a2550, 1.8), luce, viso, taglio, fig.root);
    fig.mixer.update(0); fig.root.updateMatrixWorld(true);
    const testa = fig.bones.Head.getWorldPosition(new T.Vector3()), cam = new T.PerspectiveCamera(26, 1, .05, 20), L = 256;
    cam.position.set(testa.x + .28 * kr, testa.y + .1 * kr, testa.z + 1.15 * kr); cam.lookAt(testa.x, testa.y - .02 * kr, testa.z);
    const rt = new T.WebGLRenderTarget(L, L), prima = renderer.getRenderTarget(), col = renderer.getClearColor(new T.Color()), alfa = renderer.getClearAlpha();
    rt.texture.colorSpace = T.SRGBColorSpace;
    renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(sc, cam);
    const px = new Uint8Array(L * L * 4); renderer.readRenderTargetPixels(rt, 0, 0, L, L, px);
    renderer.setRenderTarget(prima); renderer.setClearColor(col, alfa); rt.dispose();
    const [cv2, x] = cv(L, L), dati = x.createImageData(L, L);
    // le righe arrivano dal basso: si capovolgono
    for (let r = 0; r < L; r++) dati.data.set(px.subarray((L - 1 - r) * L * 4, (L - r) * L * 4), r * L * 4);
    x.putImageData(dati, 0, 0); url = cv2.toDataURL('image/png');
  } catch (e) { url = ''; }
  RITRATTI.set(chiave, url); return url;
}
// Il giocatore più forte che si può prendere adesso al posto del più debole del suo ruolo (o, se non basta niente, il più vicino)
function consigliato() {
  const me = club(K.club), debole = {}; for (const x of me.xi) { const v = ovr(x[1], x[3]); if (!debole[x[1]] || v < debole[x[1]]) debole[x[1]] = v; }
  const tutti = []; for (const c of CLUBS) if (c.id !== K.club) c.xi.forEach((x, i) => { const v = ovr(x[1], x[3]); if (v > debole[x[1]]) tutti.push({ c, x, i, v, costo: CAR.costoScambio(v, debole[x[1]]) }); });
  return tutti.filter((t) => t.costo <= K.monete).sort((a, b) => b.v - a.v)[0] || tutti.sort((a, b) => a.costo - b.costo)[0] || null;
}
function pan(titolo, html) { $('#panT').textContent = titolo; $('#panC').innerHTML = html; show('#pan'); }
const riga = (a, b, r, rg) => `<div class="${a === K.club || b === K.club ? 'io' : ''}"><span>${esc(club(a).name)} – ${esc(club(b).name)}</span><b>${r[0]}-${r[1]}${rg ? ` (${rg[0]}-${rg[1]} rig.)` : ''}</b></div>`;
const tabella = (tab, corta) => `<table class="tab"><tr><th></th><th>Squadra</th><th>G</th>${corta ? '' : '<th>V</th><th>N</th><th>P</th>'}<th>GF</th><th>GS</th><th>DR</th><th>PT</th></tr>${tab.map((r, i) => `<tr class="${r.id === K.club ? 'io' : ''}"><td>${i + 1}</td><td>${mini(r.id)}${esc(club(r.id).name)}</td><td>${r.g}</td>${corta ? '' : `<td>${r.v}</td><td>${r.n}</td><td>${r.p}</td>`}<td>${r.gf}</td><td>${r.gs}</td><td>${r.gf - r.gs}</td><td>${r.pt}</td></tr>`).join('')}</table>`;
function panClassifica() {
  const g = K.giornata - 1;
  pan(`Campionato · stagione ${K.stagione}`, tabella(CAR.classifica(K, CLUBS)) + (g >= 0 ? `<div class="sez">Giornata ${g + 1}</div><div class="ris2">${K.cal[g].map(([a, b], i) => riga(a, b, K.ris[g][i])).join('')}</div>` : ''));
}
function gioca(tipo, avv, titolo, fuori, rigori) { sel.mia = K.club; sel.loro = avv; G.comp = { tipo, titolo, fuori: !!fuori, rigori: !!rigori }; showPre(); }
// Come nelle schermate dei tornei: prima il quadro, e in cima il tasto per giocare la prossima partita
function giocaCoppa() { const p = CAR.coppaProssima(K); if (p) gioca('coppa', p.avv, `Coppa Titano · ${p.nome.toLowerCase()}`, false, true); }
function giocaCastelli() { const p = CAR.castelliProssima(K); if (p) gioca('castelli', p.avv, `Trofeo dei Castelli · ${p.nome.toLowerCase()}`, p.fase === 'gironi' && !p.inCasa, p.fase === 'ko'); }
const tastoGioca = (p, az) => (p ? `<button class="btn gioca2" data-az="${az}">Gioca · ${esc(p.nome)} contro ${esc(club(p.avv).name)}</button>` : '');
function panCoppa() {
  const k = K.coppa;
  pan('Coppa Titano', tastoGioca(CAR.coppaProssima(K), 'giocaCoppa') + k.storia.map((t, i) => `<div class="sez">${CAR.TURNI[i]}</div><div class="ris2">${t.map((m) => riga(m.a, m.b, m.r, m.rg)).join('')}</div>`).join('') || '<p class="vuoto">La coppa comincia dagli ottavi di finale: sedici squadre, partita secca, rigori in caso di parità.</p>');
}
function panCastelli() {
  const k = K.castelli, mio = CAR.castelliGirone(K);
  pan('Trofeo dei Castelli', tastoGioca(CAR.castelliProssima(K), 'giocaCastelli') + `<p class="nota2">Quattro gironi da quattro, tre giornate: le prime due vanno ai quarti, poi semifinale e finale con i rigori in caso di parità.</p><div class="gironi">${k.gironi.map((g, gi) => `<div class="${gi === mio ? 'mio' : ''}"><div class="sez">Girone ${'ABCD'[gi]}</div>${tabella(CAR.castelliTabella(K, gi), true)}</div>`).join('')}</div>`
    + (k.ko ? k.ko.storia.map((t, i) => `<div class="sez">${CAR.TURNI_KO[i]}</div><div class="ris2">${t.map((m) => riga(m.a, m.b, m.r, m.rg)).join('')}</div>`).join('') : ''));
}
let sTab = 'd';
function panSfide(tab) {
  if (tab) sTab = tab;
  const st = CAR.statoSfide(K), premio = (x) => [x.monete ? `● ${mon(x.monete)}` : '', x.gemme ? `◆ ${x.gemme}` : ''].filter(Boolean).join(' ');
  const fine = (x, id) => (x.preso ? '<span class="fatto">✓</span>' : x.fatto ? `<button data-riscuoti="${sTab}:${id}">Riscuoti</button>` : '<span></span>');
  const righe = st[sTab].map((x) => `<div class="sfida${x.fatto ? ' ok' : ''}"><div><b>${x.t}</b><span class="barra"><i style="width:${(x.prog / x.n) * 100}%"></i></span></div><em>${x.prog}/${x.n}</em><u>${premio(x)}</u>${fine(x, x.id)}</div>`).join('');
  const b = st.bonus[sTab], bonus = b ? `<div class="sfida bonus${b.fatto ? ' ok' : ''}"><div><b>Tutte fatte</b></div><em></em><u>${premio(b)}</u>${fine(b, 'tutte')}</div>` : '';
  const quando = sTab === 'd' ? 'Ripartono a mezzanotte' : sTab === 'w' ? `Ripartono tra ${fmtTempo(CAR.fineSettimana(new Date()) - new Date())}` : sTab === 's' ? `Valgono per la stagione ${K.stagione}` : 'Si fanno una volta sola';
  pan('Sfide', `<div class="seg">${Object.entries(CAR.GRUPPI).map(([g, n]) => `<button data-stab="${g}" class="${g === sTab ? 'on' : ''}">${n} ${st.conti[g][0]}/${st.conti[g][1]}</button>`).join('')}${st.daRiscuotere ? '<button data-az="tutto" class="oro">Riscuoti tutto</button>' : ''}</div><p class="nota2">${quando}</p>${righe}${bonus}`);
}
function riscuotiTutto() { const r = CAR.riscuotiTutto(K); if (!r.n) return avviso('Niente da riscuotere: completa le sfide'); salvaK(); avviso(`Premi riscossi: ${[r.monete ? `+${mon(r.monete)} monete` : '', r.gemme ? `+${r.gemme} gemme` : ''].filter(Boolean).join(', ')}`); }
let cTab = 'stadio';
function panClubMio(tab, msg) {
  if (tab) cTab = tab;
  const me = club(K.club), s = CAR.STADIO[K.stadio - 1], prox = CAR.STADIO[K.stadio], borsa = `<div class="borsa">● <b>${mon(K.monete)}</b> ◆ <b>${K.gemme}</b></div>`;
  const tabs = `<div class="seg">${[['stadio', 'Stadio'], ['allenamento', 'Allenamento']].map(([k, n]) => `<button data-ctab="${k}" class="${k === cTab ? 'on' : ''}">${n}</button>`).join('')}<button data-club="personalizza">Personalizza</button><button data-club="amichevole">Amichevole</button></div>`;
  let corpo;
  if (cTab === 'stadio') {
    corpo = `<div class="stadio"><div class="liv">${[1, 2, 3, 4, 5].map((n) => `<i class="${n <= K.stadio ? 'on' : ''}"></i>`).join('')}</div><b>Livello ${K.stadio} di 5 · ${mon(s.posti)} posti</b><span>+${mon(s.bonus)} monete a ogni partita in casa</span>`
      + (prox ? `<button data-az="stadio" class="${K.monete < prox.monete || K.gemme < prox.gemme ? 'no' : ''}">Amplia a ${mon(prox.posti)} posti (+${mon(prox.bonus)} a partita) · ● ${mon(prox.monete)}${prox.gemme ? ` ◆ ${prox.gemme}` : ''}</button>` : '<em>Lo stadio è al massimo</em>') + '</div>';
  } else {
    const riga2 = (x, dove, i) => { const n = (K.allen || {})[x[0]] || 0, c = CAR.costoAllenamento(K, x[0]), max = n >= CAR.ALLENA.max; return `<button class="gioc" data-allena="${dove}:${i}" ${max || c > K.monete ? 'disabled' : ''}><b>${x[2]} ${esc(x[0])}</b><span>${RUOLO[x[1]]} · sedute ${n}/${CAR.ALLENA.max}</span><em>${ovr(x[1], x[3])}</em><u>${max ? 'al massimo' : `● ${mon(c)}`}</u></button>`; };
    corpo = `<p class="nota2">Ogni seduta alza di un punto la quotazione del giocatore (fino a ${CAR.ALLENA.max} sedute a testa).</p><div class="lista">${me.xi.map((x, i) => riga2(x, 'xi', i)).join('')}${(me.pan || []).map((x, i) => riga2(x, 'pan', i)).join('')}</div>`;
  }
  pan(me.name, `${borsa}${msg ? `<p class="avviso">${msg}</p>` : ''}${tabs}${corpo}`);
}
function panInfo() {
  pan('Come si gioca', `<div class="info"><div><div class="sez">In campo</div><p>Levetta a sinistra per muovere il giocatore. <b>Passa</b>, <b>Cross</b> e <b>Tira</b>: tieni premuto e la barra sotto il giocatore mostra la potenza (la tacca bianca è quella giusta per il compagno che punti, il rosso nel tiro manda la palla alta); un tocco veloce su Passa o Cross fa il passaggio dosato da solo. <b>Scatto</b> per correre. Senza palla: <b>Cambia</b> giocatore e <b>Scivolata</b> (da dietro è fallo). La scritta sopra la mappa cambia la mentalità; dalla pausa si fanno le sostituzioni.</p>
    <div class="sez">La carriera</div><p>Campionato a 16 squadre, Coppa Titano a eliminazione diretta e Trofeo dei Castelli a gironi. Le partite danno monete; le sfide danno monete e gemme. Con le monete si fanno scambi al mercato e sedute di allenamento; con monete e gemme si amplia lo stadio, che rende di più a ogni partita in casa.</p></div>
    <div><div class="sez">Il salvataggio</div><p>La carriera resta su questo dispositivo. Con l'accesso all'account Fantatitano si salva anche sull'account e si ritrova su un altro telefono: dentro l'app è automatico, qui si accede dal profilo in alto a destra.</p>
    <div class="sez">Tastiera</div><p>Frecce per muoversi, X passa, C cross, Spazio tira, Shift scatto, P pausa.</p></div></div>`);
}
function accountHtml() {
  const a = CLOUD.info(), u = a.utente;
  if (u) return `<div class="acc"><p>Connesso come <b>${esc(u.nome || u.email)}</b>${u.email && u.nome !== u.email ? ` (${esc(u.email)})` : ''}. La carriera si salva anche sul tuo account.</p><p class="nota2" id="accStato">${testoCloud(a.stato)}</p><div class="seg"><button data-az="salvaora">Salva adesso</button><button data-az="esci">Esci</button></div></div>`;
  if (a.stato === 'spento') return '<div class="acc"><p>Il salvataggio sull\'account non è raggiungibile adesso: la carriera resta su questo dispositivo. Riprova più tardi.</p></div>';
  return `<div class="acc"><p>Accedi con l'account Fantatitano per salvare la carriera e ritrovarla su un altro telefono.</p><div class="form"><input id="accEmail" type="email" autocomplete="username" placeholder="Email" enterkeyhint="next"><input id="accPw" type="password" autocomplete="current-password" placeholder="Password" enterkeyhint="go"><button data-az="accedi" class="oro">Accedi</button></div><p class="nota2" id="accErr"></p><p class="nota2">Non hai un account? Crealo nell'app Fantatitano su <b>fantatitano.site</b>, poi torna qui.</p></div>`;
}
function panProfilo() {
  const st = K ? K.stat : null, top = K && CAR.capocannoniere(K), d = (v, e) => `<div><b>${v}</b><span>${e}</span></div>`;
  pan(K ? K.nome : 'Account', `<div class="sez">Account</div>${accountHtml()}` + (K ? `<div class="sez">${esc(club(K.club).name)}</div><div class="dati">${d(K.stagione, 'Stagione')}${d(st.g, 'Partite')}${d(`${st.v}-${st.n}-${st.p}`, 'Vinte-pari-perse')}${d(`${st.gf}-${st.gs}`, 'Gol fatti-subiti')}</div>`
    + `<div class="sez">Capocannoniere</div><p class="vuoto">${top ? `${esc(top.nome)} · ${top.gol} gol` : 'Ancora nessun gol'}</p>`
    + `<div class="sez">Trofei</div><p class="vuoto">${K.trofei.length ? K.trofei.map((t) => `${t.tipo} (stagione ${t.stagione})`).join(' · ') : 'Ancora nessuno'}</p>`
    + `<div class="sez">Mercato</div><p class="vuoto">${K.movimenti.length ? K.movimenti.slice(0, 6).map((m) => `${esc(m.preso)} per ${esc(m.ceduto)} (${esc(club(m.da).name)})`).join(' · ') : 'Ancora nessuno scambio'}</p>` : ''));
}
// Mercato: si sceglie un titolare di un'altra squadra, poi chi cedere in cambio tra i propri dello stesso ruolo
let mRuolo = 'T', mPreso = null;
function panMercato(msg) {
  const me = club(K.club), val = (x) => ovr(x[1], x[3]), borsa = `<div class="borsa">Monete <b>${mon(K.monete)}</b></div>`;
  const scheda = (c, x, v, extra, attr) => { const tag = attr ? 'button' : 'div'; return `<${tag} class="gioc${attr ? '' : ' sel'}" ${attr || ''}>${c ? mini(c.id) : ''}<b>${esc(x[0])}</b><span>${RUOLO[x[1]]} · valore ${v}${c ? ` · ${esc(c.name)}` : ''}</span><em>${extra}</em></${tag}>`; };
  if (mPreso) {
    const c = club(mPreso[0]), x = c.xi[mPreso[1]], v = val(x);
    return pan('Mercato', `${borsa}<div class="sez">Prendi</div>${scheda(c, x, v, mon(CAR.prezzo(v)))}<div class="sez">Chi cedi in cambio?</div>`
      + me.xi.map((y, j) => { if (y[1] !== x[1]) return ''; const k = CAR.costoScambio(v, val(y)); return scheda(null, y, val(y), k > 0 ? `paghi ${mon(k)}` : k < 0 ? `incassi ${mon(-k)}` : 'alla pari', `data-out="${j}" ${k > K.monete ? 'disabled' : ''}`); }).join('')
      + (me.xi.every((y) => y[1] !== x[1] || CAR.costoScambio(v, val(y)) > K.monete) ? '<p class="avviso">Non hai abbastanza monete: si guadagnano giocando le partite e completando le sfide.</p>' : '')
      + '<div class="seg" style="margin-top:10px"><button data-az="annulla">Annulla</button></div>');
  }
  const tutti = []; for (const c of CLUBS) if (c.id !== K.club) c.xi.forEach((x, i) => { if (mRuolo === 'T' || x[1] === mRuolo) tutti.push({ c, x, i, v: val(x) }); });
  tutti.sort((a, b) => b.v - a.v || a.x[0].localeCompare(b.x[0]));
  pan('Mercato', `${borsa}${msg ? `<p class="avviso">${msg}</p>` : ''}<div class="seg">${[['T', 'Tutti'], ['P', 'Portieri'], ['D', 'Difensori'], ['C', 'Centrocampisti'], ['A', 'Attaccanti']].map(([r, n]) => `<button data-r="${r}" class="${r === mRuolo ? 'on' : ''}">${n}</button>`).join('')}</div><div class="lista">`
    + tutti.map(({ c, x, i, v }) => scheda(c, x, v, mon(CAR.prezzo(v)), `data-p="${c.id}:${i}"`)).join('') + '</div>');
}
let armato = false;
function panImp() {
  pan('Impostazioni', `<div class="sez">Difficoltà</div><div class="seg">${Object.keys(DIFF).map((d) => `<button data-d="${d}" class="${d === sel.diff ? 'on' : ''}">${d}</button>`).join('')}</div>`
    + `<div class="sez">Audio</div><div class="seg"><button data-az="audio" class="${AU.on ? 'on' : ''}">${AU.on ? 'Acceso' : 'Spento'}</button></div>`
    + `<label class="vol">Volume musica<input type="range" min="0" max="100" step="5" data-vol="musica" value="${Math.round(AU.vol.musica * 100)}"><b>${Math.round(AU.vol.musica * 100)}</b></label>`
    + `<label class="vol">Volume effetti<input type="range" min="0" max="100" step="5" data-vol="effetti" value="${Math.round(AU.vol.effetti * 100)}"><b>${Math.round(AU.vol.effetti * 100)}</b></label>`
    + `<div class="sez">Account</div>${accountHtml()}`
    + (K ? `<div class="sez">Carriera</div><div class="seg"><button data-az="reset">${armato ? 'Sicuro? Tocca ancora per cancellare tutto, anche dall\'account' : 'Ricomincia la carriera da capo'}</button></div>` : ''));
}
const casa = () => { if (K) { drawHub(); show('#hub'); } else { drawHome(); show('#home'); } };
function drawHome() { $('#carr').textContent = K ? 'Continua la carriera' : 'Inizia la carriera'; const u = CLOUD.info().utente; $('#hAcc').textContent = u ? `Connesso come ${u.nome || u.email}` : 'Accedi con l\'account Fantatitano'; }

/* --- salvataggio: sempre sul dispositivo, e sull'account se c'è l'accesso */
let syncT = 0;
function salvaK() { if (!K) return; CAR.salva(K); clearTimeout(syncT); syncT = setTimeout(sincronizza, 1200); }
const testoCloud = (s) => ({ salvato: 'Salvata sull\'account', salvo: 'Salvataggio sull\'account…', errore: 'Salvataggio sull\'account non riuscito: si riprova alla prossima partita', pronto: 'Collegato all\'account' }[s] || '');
function aggiornaCloud() {
  const a = CLOUD.info(), el = $('#hCloud'); if (el) { el.className = a.utente ? a.stato : 'fuori'; el.title = a.utente ? testoCloud(a.stato) : 'Solo su questo dispositivo: accedi per salvare sull\'account'; }
  const s = $('#accStato'); if (s) s.textContent = testoCloud(a.stato);
  if (!$('#home').classList.contains('nas')) drawHome();
}
async function sincronizza(forza = false) {
  if (!K || !CLOUD.info().utente) return;
  const r = await CLOUD.salva(K, forza);
  if (r.conflitto) { // un altro dispositivo ha salvato dopo: si sceglie quale tenere
    const o = await CLOUD.carica().catch(() => null), q = CLOUD.scegli(K, o && o.dati);
    if (q === 'online') adotta(o.dati, 'Ripresa la copia più avanti dal tuo account'); else if (q === 'chiedi') chiediQuale(o.dati); else await CLOUD.salva(K, true);
  }
}
function adotta(dati, msg) {
  const nuova = CAR.completa(JSON.parse(JSON.stringify(dati)), CLUBS); if (!nuova) return;
  CAR.applica(null, CLUBS); K = nuova; CAR.applica(K, CLUBS); applicaMio(); CAR.salva(K); if (msg) avviso(msg);
  if (!$('#hub').classList.contains('nas') || !$('#home').classList.contains('nas') || !$('#pan').classList.contains('nas')) casa();
}
// Dopo l'accesso (o all'avvio con la sessione già aperta): si confronta la copia del telefono con quella dell'account
async function allAccesso() {
  let o = null; try { o = await CLOUD.carica(); } catch (e) { return; }
  const q = CLOUD.scegli(K, o && o.dati);
  if (q === 'online') adotta(o.dati, 'Carriera ritrovata dal tuo account'); else if (q === 'locale') sincronizza(true); else if (q === 'chiedi') chiediQuale(o.dati);
}
function chiediQuale(online) {
  const desc = (C) => { const c = club(C.club), nome = C.mio && C.mio.nome && C.club === POSTO ? C.mio.nome : c ? c.name : C.club; return `<b>${esc(nome)}</b><span>${esc(C.nome)} · stagione ${C.stagione}, giornata ${C.giornata} · ${C.trofei.length} trofei</span>`; };
  chiediQuale.online = online;
  pan('Due carriere', `<p class="nota2">Sul tuo account c'è una carriera diversa da quella di questo telefono. Quale tieni? L'altra viene sostituita.</p><div class="due"><button data-az="tieniOnline">${desc(online)}<em>Quella dell'account</em></button><button data-az="tieniLocale">${desc(K)}<em>Quella di questo telefono</em></button></div>`);
}
async function tapAccount(az) {
  if (az === 'accedi') { const e = $('#accErr'); e.textContent = 'Accesso…'; const r = await CLOUD.accedi($('#accEmail').value, $('#accPw').value); if (!r.ok) { e.textContent = r.errore; return true; } avviso('Accesso fatto'); await allAccesso(); if (!$('#pan').classList.contains('nas') && $('#panT').textContent !== 'Due carriere') casa(); return true; }
  if (az === 'esci') { await CLOUD.esci(); avviso('Sei uscito: la carriera resta su questo dispositivo'); if (!$('#pan').classList.contains('nas')) panProfilo(); return true; }
  if (az === 'salvaora') { await sincronizza(); avviso(CLOUD.info().stato === 'salvato' ? 'Salvata sull\'account' : 'Salvataggio non riuscito'); return true; }
  if (az === 'tieniOnline') { adotta(chiediQuale.online, 'Tenuta la carriera dell\'account'); casa(); return true; }
  if (az === 'tieniLocale') { await CLOUD.salva(K, true); avviso('Tenuta la carriera di questo telefono'); casa(); return true; }
  return false;
}
// Pulsanti a scelta singola per modulo e mentalità: gli stessi prima della partita e in pausa
function tactics() {
  const forms = Object.keys(FORMS).map((n) => `<button data-f="${n}" class="${n === sel.form ? 'on' : ''}">${n}</button>`).join('');
  const ments = MENT.names.map((n, k) => `<button data-m="${k - 1}" class="${k - 1 === sel.ment ? 'on' : ''}">${n}</button>`).join('');
  for (const id of ['#segForm', '#segFormP']) $(id).innerHTML = forms; for (const id of ['#segMent', '#segMentP']) $(id).innerHTML = ments;
  $('#segOra').innerHTML = [['giorno', '☀ Giorno'], ['notte', '☾ Notte']].map(([k, n]) => `<button data-o="${k}" class="${k === sel.ora ? 'on' : ''}">${n}</button>`).join(''); if (ATMO) ATMO.applica(sel.ora);
  $('#ment span').textContent = MENT.hud[sel.ment + 1]; save();
  const t = G.teams[0]; if (t && t.human) setTactics(t, sel.form, sel.ment);
  if (!$('#pre').classList.contains('nas')) showPre();
}
function buildMenu() {
  const g = $('#griglia');
  g.innerHTML = CLUBS.map((c) => `<button class="sq" data-id="${c.id}"><img src="${img(c.id)}" alt=""><span>${c.name}</span></button>`).join('');
  const refresh = () => {
    for (const el of g.children) { el.classList.toggle('mia', el.dataset.id === sel.mia); el.classList.toggle('loro', el.dataset.id === sel.loro); }
    $('#sceltaT').textContent = !sel.mia ? 'Scegli la tua squadra' : !sel.loro ? "Scegli l'avversaria" : 'Tutto pronto';
    $('#sceltaP').textContent = !sel.mia ? 'Passo 1 di 2' : !sel.loro ? 'Passo 2 di 2' : `${club(sel.mia).name} — ${club(sel.loro).name}`;
    $('#inizio').disabled = !(sel.mia && sel.loro);
  };
  g.addEventListener('click', (e) => {
    const b = e.target.closest('.sq'); if (!b) return; const id = b.dataset.id;
    if (id === sel.mia) { sel.mia = null; sel.loro = null; } else if (!sel.mia) sel.mia = id; else sel.loro = id === sel.loro ? null : id;
    refresh();
  });
  $('#diff').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; sel.diff = b.dataset.d; for (const x of $('#diff').children) x.classList.toggle('on', x === b); save(); });
  const vai = () => { AU.init(); try { screen.orientation.lock('landscape').catch(() => {}); } catch (e) { /* dove non si può bloccare ci pensa resize() */ } G.comp = null; sel.mia = sel.loro = null; show('#scelta'); refresh(); };
  $('#vai').onclick = vai;
  $('#indietro').onclick = casa;
  $('#inizio').onclick = () => showPre(); $('#preInd').onclick = () => { if (G.comp) casa(); else { show('#scelta'); refresh(); } };
  // ingresso e dashboard
  $('#nuovo').addEventListener('click', tapNuovo);
  $('#nuovo').addEventListener('input', (e) => { if (e.target.id === 'nvSigla') e.target.dataset.mano = 1; if (e.target.id === 'nvClub' && !$('#nvSigla').dataset.mano) $('#nvSigla').value = sigla(e.target.value); if (NV.passo === 1) anteprimaClub(); });
  $('#carr').onclick = () => { AU.init(); if (K) casa(); else apriNuovo(); };
  $('#hAcc').onclick = () => panProfilo();
  $('#cCamp').onclick = () => { const p = CAR.prossima(K); if (p) gioca('camp', p.avv, `Campionato · giornata ${p.giornata} di ${p.totale} · ${p.inCasa ? 'in casa' : 'in trasferta'}`, !p.inCasa); else { CAR.nuovaStagione(K, CLUBS); salvaK(); drawHub(); } };
  $('#cCoppa').onclick = panCoppa; $('#cCast').onclick = panCastelli;
  $('#cClass').onclick = panClassifica; $('#tMerc').onclick = () => { mPreso = null; panMercato(); }; $('#tSfide').onclick = () => panSfide();
  $('#hImp').onclick = () => { armato = false; panImp(); }; $('#hInfo').onclick = panInfo; $('#hHome').onclick = () => { drawHome(); show('#home'); }; $('#hProf').onclick = panProfilo;
  $('#hSett').onclick = () => panSfide('w'); $('#hPremi').onclick = () => { riscuotiTutto(); drawHub(); }; $('#hCamp').onclick = () => panSfide();
  const clubAz = (k) => (k === 'personalizza' ? (K.mio && K.club === POSTO ? apriNuovo(true) : avviso('Si personalizza il club creato all\'inizio della carriera')) : k === 'amichevole' ? vai() : panClubMio(k));
  $('#tClub').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) clubAz(b.dataset.club); });
  $('#campoA').addEventListener('click', tapRosa);
  $('#tRosa').onclick = () => { rXi = rPan = -1; sel.mia = K.club; sel.loro = CLUBS.find((c) => c.id !== K.club).id; G.comp = { tipo: 'rosa' }; showPre(); };
  $('#panInd').onclick = casa; $('#continua').onclick = () => { toMenu(); };
  // i cursori del volume (impostazioni): musica ed effetti separati, salvati sul dispositivo
  $('#panC').addEventListener('input', (e) => { const r = e.target.closest('input[data-vol]'); if (!r) return; AU.init(); AU.volume(r.dataset.vol, r.value / 100); r.nextElementSibling.textContent = r.value; if (r.dataset.vol === 'effetti') AU.calcio(12, 'passaggio'); });
  $('#panC').addEventListener('click', async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.az && await tapAccount(b.dataset.az)) return;
    if (b.dataset.stab) return panSfide(b.dataset.stab);
    if (b.dataset.riscuoti) { const [g, id] = b.dataset.riscuoti.split(':'), r = CAR.riscuoti(K, g, id); if (r.ok) { salvaK(); avviso(`Premio riscosso: ${[r.monete ? `+${mon(r.monete)} monete` : '', r.gemme ? `+${r.gemme} gemme` : ''].filter(Boolean).join(', ')}`); } return panSfide(); }
    if (b.dataset.az === 'giocaCoppa') return giocaCoppa();
    if (b.dataset.az === 'giocaCastelli') return giocaCastelli();
    if (b.dataset.az === 'tutto') { riscuotiTutto(); return panSfide(); }
    if (b.dataset.ctab) return panClubMio(b.dataset.ctab);
    if (b.dataset.club) return clubAz(b.dataset.club);
    if (b.dataset.az === 'stadio') { const r = CAR.miglioraStadio(K); if (r.ok) salvaK(); return panClubMio('stadio', r.ok ? `Stadio ampliato: livello ${r.livello}` : r.motivo === 'massimo' ? 'Lo stadio è già al massimo' : 'Servono più monete o gemme'); }
    if (b.dataset.allena) { const [dove, i] = b.dataset.allena.split(':'), me = club(K.club), x = (dove === 'pan' ? me.pan : me.xi)[+i], r = CAR.allena(K, CLUBS, dove, +i); if (r.ok) { applicaMio(); salvaK(); } return panClubMio('allenamento', r.ok ? `${esc(x[0])} sale a ${ovr(x[1], x[3] + 1)}` : r.motivo === 'massimo' ? 'Già allenato al massimo' : 'Servono più monete'); }
    if (b.dataset.r) { mRuolo = b.dataset.r; return panMercato(); }
    if (b.dataset.p) { const [id, i] = b.dataset.p.split(':'); mPreso = [id, +i]; return panMercato(); }
    if (b.dataset.az === 'annulla') { mPreso = null; return panMercato(); }
    if (b.dataset.out) { const x = club(mPreso[0]).xi[mPreso[1]], r = CAR.scambio(K, CLUBS, ovr, mPreso[0], mPreso[1], +b.dataset.out); mPreso = null; if (r.ok) { applicaMio(); salvaK(); } return panMercato(r.ok ? `${esc(x[0])} è tuo${r.costo > 0 ? `: pagato ${mon(r.costo)}` : r.costo < 0 ? `: incassato ${mon(-r.costo)}` : ''}.` : 'Scambio non riuscito.'); }
    if (b.dataset.d) { sel.diff = b.dataset.d; save(); for (const x of $('#diff').children) x.classList.toggle('on', x.dataset.d === sel.diff); }
    else if (b.dataset.az === 'audio') { AU.init(); AU.toggle(); }
    else if (b.dataset.az !== 'reset') return;
    else { if (!armato) armato = true; else { armato = false; CAR.cancella(); CLOUD.cancella(); K = null; CAR.applica(null, CLUBS); applicaMio(); drawHome(); return show('#home'); } }
    panImp();
  });
  $('#gioca').onclick = () => startMatch(sel.mia, sel.loro, sel.diff);
  for (const id of ['#segForm', '#segFormP', '#segMent', '#segMentP', '#segOra']) $(id).addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.f) sel.form = b.dataset.f; else if (b.dataset.o) sel.ora = b.dataset.o; else sel.ment = +b.dataset.m; tactics(); });
  // in campo: le frecce ai lati del riquadro sotto la minimappa cambiano mentalità
  for (const f of document.querySelectorAll('#ment button')) f.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); sel.ment = clamp(sel.ment + +f.dataset.d, -1, 1); tactics(); });
  $('#replay').addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); }); // pulsante replay in alto a destra: per ora solo segnaposto
  for (const x of $('#diff').children) x.classList.toggle('on', x.dataset.d === sel.diff);
  tactics();
  $('#apriCambi').onclick = () => { cOut = null; cIn = -1; drawCambi(); show('#cambi'); }; $('#cambiOk').onclick = () => show('#stop'); $('#cambiL').addEventListener('click', tapCambi);
  $('#pausa').onclick = () => pause(true); $('#riprendi').onclick = () => pause(false);
  $('#esci').onclick = () => { G.paused = false; toMenu(); };
  $('#audio').onclick = () => { AU.init(); AU.toggle(); }; $('#audio').style.opacity = AU.on ? 1 : .4;
  AU.musica(true); // la musica dei menu parte al primo tocco (prima i browser non lasciano suonare)
  $('#rivincita').onclick = () => startMatch(sel.mia, sel.loro, sel.diff);
  $('#cambia').onclick = () => { toMenu(); G.comp = null; show('#scelta'); refresh(); };
}
const club = (id) => CLUBS.find((c) => c.id === id);
function startMatch(h, a, d) {
  AU.init(); AU.musica(false); G.diff = DIFF[d] || DIFF.normale; G.shown = false; G.paused = false; G.auto = false; // la musica dei menu sfuma: comincia la partita
  const H = club(h), A = club(a);
  $('#vsH').src = img(H.id); $('#vsA').src = img(A.id); $('#vsHn').textContent = H.name; $('#vsAn').textContent = A.name;
  show('#vs'); $('#hud').classList.add('nas'); G.state = 'menu';
  setTimeout(() => { show(null); $('#hud').classList.remove('nas'); newMatch(H, A); AU.amb(1); }, 1900);
}
// Schermata delle sostituzioni: si tocca chi esce e chi entra
let cOut = null, cIn = -1;
// L'energia non si vede durante il gioco (come Dream League): sta qui, una barretta per giocatore (in panchina sono freschi)
const barraEn = (en) => `<s class="enb" data-l="${en < .4 ? 'b' : en < .7 ? 'm' : 'a'}"><i style="width:${Math.round(clamp(en, 0, 1) * 100)}%"></i></s>`;
function drawCambi(msg) {
  const t = G.teams[0], fuori = (p) => `${p.inj ? ' <u class="inf">infortunato</u>' : ''}${p.yel ? ' <i class="g"></i>' : ''}`;
  $('#cambiT').textContent = `Sostituzioni · ${t.subs} di ${SUB.max}`; $('#cambiM').textContent = msg || (t.subs >= SUB.max ? 'Cambi finiti' : 'Tocca chi esce e chi entra');
  $('#cambiL').innerHTML = `<div><h4>In campo</h4>${t.players.map((p, k) => `<button class="gioc${cOut === p ? ' sel' : ''}" data-o="${k}"><b>${p.num} ${esc(p.name)}</b><span>${RUOLO[p.role]}${fuori(p)}</span><em>${Math.round(p.en * 100)}%</em>${barraEn(p.en)}</button>`).join('')}</div>`
    + `<div><h4>Panchina</h4>${t.bench.map((b, k) => `<button class="gioc${cIn === k ? ' sel' : ''}" data-b="${k}" ${b.used ? 'disabled' : ''}><b>${b.num} ${esc(b.name)}</b><span>${RUOLO[b.role]}${b.used ? ' · già entrato' : ''}</span><em>${ovr(b.role, b.q)}</em>${barraEn(1)}</button>`).join('')}</div>`;
}
function tapCambi(e) {
  const b = e.target.closest('button'), t = G.teams[0]; if (!b) return;
  if (b.dataset.o) cOut = t.players[+b.dataset.o]; else if (b.dataset.b) cIn = +b.dataset.b; else return;
  if (!cOut || cIn < 0) return drawCambi();
  const esce = cOut, p = sostituisci(t, esce, cIn), ruoli = (esce.i === 0) !== (t.bench[cIn].role === 'P'); cOut = null; cIn = -1;
  drawCambi(p ? `Entra ${p.name}, esce ${esce.name}` : ruoli ? 'Il portiere si cambia solo con un portiere' : 'Cambio non possibile'); hud();
}
function pause(v) { if (G.state === 'menu' || G.state === 'full') return; G.paused = v; show(v ? '#stop' : null); AU.pausa(v); $('#apriCambi').classList.toggle('nas', !G.teams[0] || !!G.so); } // sempre: lì si vede anche l'energia
function toMenu() { G.state = 'menu'; clearMatch(); G.ball = null; G.ctrl = null; ballMesh.visible = ballShadow.visible = ring.visible = arrow.visible = freccia.visible = false; $('#hud').classList.add('nas'); casa(); AU.amb(0); AU.pausa(false); AU.musica(true); }
function vote(p) {
  const t = p.team, s = p.s, V = VOTE, conc = t.opp.score;
  let v = 6 + s.g * V.g + s.a * V.a + s.kp * V.kp + (s.sot - s.g) * V.sot + s.tk * V.tk + s.int * V.int + s.sv * V.sv + (s.pa > 3 ? (s.pc / s.pa - .7) * V.pass : 0)
    + s.fl * V.fl + s.og * V.og + (p.red ? V.red : p.yel ? V.yel : 0) + (t.score === conc ? 0 : sgn(t.score - conc) * V.win);
  if (p.i === 0 || p.role === 'D') v += conc === 0 ? V.clean : conc * (p.i === 0 ? V.concGk : V.concD);
  return clamp(Math.round(v * 2) / 2, 3, 10);
}
function showEnd() {
  const [h, a] = G.teams, w = h.score > a.score, l = h.score < a.score;
  $('#esito').textContent = w ? 'Vittoria!' : l ? 'Sconfitta' : 'Pareggio';
  $('#fH').src = img(h.club.id); $('#fA').src = img(a.club.id); $('#fS').textContent = `${h.score} - ${a.score}`;
  const c = G.comp, carr = !!(K && c && ['camp', 'coppa', 'castelli'].includes(c.tipo)); let nota = '';
  if (carr) { // carriera: si registra il risultato e si simulano le altre partite
    const marc = G.goals.filter((g) => g.t === 0 && !g.name.startsWith('Autogol')).map((g) => g.name);
    if (c.tipo === 'camp') { const r = CAR.giocaCampionato(K, CLUBS, h.score, a.score, marc); G.premio = r ? r.monete : 0; if (r) nota = r.finita ? (r.campione === K.club ? 'Campioni!' : `Stagione finita · ${r.posizione}º posto`) : `Campionato · ora sei ${r.posizione}º`; }
    else {
      const ko = (r, nome) => { if (r.rigori) { $('#esito').textContent = r.passa ? 'Avanti ai rigori!' : 'Fuori ai rigori'; $('#fS').textContent = `${h.score} - ${a.score} (${r.rigori[0]}-${r.rigori[1]} rig.)`; } return r.vinta ? `${nome}: è tuo!` : r.passa ? `${nome} · ${r.turno.toLowerCase()} superato` : `${nome} · eliminato: ${r.turno.toLowerCase()}`; };
      if (c.tipo === 'coppa') { const r = CAR.giocaCoppa(K, CLUBS, h.score, a.score, marc, Math.random, G.soRes); G.premio = r ? r.monete : 0; if (r) nota = ko(r, 'Coppa Titano'); }
      else { const r = CAR.giocaCastelli(K, CLUBS, h.score, a.score, marc, Math.random, G.soRes); G.premio = r ? r.monete : 0; if (r) nota = r.fase === 'gironi' ? `Trofeo dei Castelli · ${r.posizione}º nel girone${r.finiti ? (r.passa ? ': ai quarti!' : ': eliminato') : ''}` : ko(r, 'Trofeo dei Castelli'); }
    }
    salvaK(); G.comp = null;
  }
  if (carr && G.premio) nota += ` · +${mon(G.premio)} monete`;
  $('#esitoC').textContent = nota; $('#continua').classList.toggle('nas', !carr); $('#rivincita').classList.toggle('nas', carr); $('#cambia').classList.toggle('nas', carr);
  $('#marc').textContent = G.goals.map((g) => `${g.name} ${g.min}' (${G.teams[g.t].club.short})`).join(' · ');
  const tot = G.stats.poss[0] + G.stats.poss[1] || 1, ph = Math.round(G.stats.poss[0] / tot * 100);
  $('#cart').innerHTML = G.cards.map((c) => `<span><i class="${c.c}"></i>${c.name.replace(/[<>&]/g, '')} ${c.min}' (${G.teams[c.t].club.short})</span>`).join('');
  $('#flH').textContent = G.stats.fouls[0]; $('#flA').textContent = G.stats.fouls[1]; $('#fgH').textContent = G.stats.offs[0]; $('#fgA').textContent = G.stats.offs[1];
  const esc = (n) => n.replace(/[<>&]/g, ''), fmt = (v) => String(v).replace('.', ',');
  const rows = G.teams.map((t) => t.players.concat(t.off, t.out).sort((p, q) => p.i - q.i).map((p) => ({ p, v: vote(p) })));
  const best = rows.flat().sort((x, y) => y.v - x.v || y.p.s.g - x.p.s.g || y.p.s.a - x.p.s.a)[0];
  $('#mvp').innerHTML = `Migliore in campo <b>${esc(best.p.name)}</b> (${best.p.team.club.short}) <b>${fmt(best.v)}</b>`;
  $('#pagL').innerHTML = rows.map((r, k) => `<div><h4>${G.teams[k].club.short}</h4>${r.map(({ p, v }) => `<p><b>${fmt(v)}</b> ${esc(p.name)}${p.s.g ? ` <u>${p.s.g > 1 ? p.s.g + ' gol' : 'gol'}</u>` : ''}${p.s.a ? ' <u>assist</u>' : ''}${p.red ? '<i class="r"></i>' : p.yel ? '<i class="g"></i>' : ''}</p>`).join('')}</div>`).join('');
  $('#tH').textContent = G.stats.shots[0]; $('#tA').textContent = G.stats.shots[1]; $('#pH').textContent = `${ph}%`; $('#pA').textContent = `${100 - ph}%`;
  $('#fTito').src = img(w ? 'saluta' : l ? 'braccia' : 'indica');
  $('#hud').classList.add('nas'); show('#fine'); AU.amb(0); AU.pausa(false); AU.musica(true); // fine partita: torna la musica
}

/* ------------------------------------------------------------------ avvio */
// Solo orizzontale: se lo schermo è in verticale (anche col blocco della rotazione) il gioco si disegna ruotato di lato
function resize() {
  const iw = window.innerWidth, ih = window.innerHeight, rot = ih > iw, w = rot ? ih : iw, h = rot ? iw : ih, root = document.documentElement, st = document.body.style;
  G.rot = rot; st.width = `${w}px`; st.height = `${h}px`; st.left = rot ? `${iw}px` : '0'; st.transform = rot ? 'rotate(90deg)' : 'none';
  root.style.setProperty('--vw', `${w / 100}px`); root.style.setProperty('--vh', `${h / 100}px`);
  // la dashboard è disegnata per un telefono in orizzontale (circa 430 px di altezza): sugli schermi più alti si ingrandisce tutta
  root.style.setProperty('--zh', String(clamp(Math.min(h / 420, w / 880), 1, 1.8)));
  root.classList.toggle('rot', rot); root.classList.toggle('largo', w / h >= 1.3); root.classList.toggle('basso', h <= 480); root.classList.toggle('bassissimo', h <= 430);
  renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
}
const CREST = {};
function loadImg(src) { return new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }); }
let last = 0, frame = 0;
// Qualità automatica: durante la partita prima scende la risoluzione (src/prestazioni.js), se non basta, o se a pesare è il
// processore, si alleggerisce un passo alla volta: ombre più piccole e meno morbide, poi senza ombre del sole, poi prato
// senza normali e rugosità. I dettagli tolti non tornano da soli (niente su e giù durante la partita), la risoluzione sì.
const QUAL = { livello: 0 };
function qualita(dt) {
  if (!PERF.aggiorna(dt, G.state === 'play' && !G.paused) || QUAL.livello >= 3) return;
  QUAL.livello++;
  if (QUAL.livello === 1) { if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } sun.shadow.mapSize.set(1024, 1024); renderer.shadowMap.type = T.PCFShadowMap; }
  else if (QUAL.livello === 2) sun.castShadow = false;
  else scene.traverse((o) => { if (o.material && o.material.isMeshStandardMaterial) { o.material.normalMap = o.material.roughnessMap = null; } if (o.isSpotLight) o.visible = false; }); // di notte restano i fasci e la luce dall'alto, non i faretti
  // per primi se ne vanno i dettagli della folla e le ombre del bordo campo, poi (al livello 3) steward e fotografi
  if (SPALTI) SPALTI.dettaglio(QUAL.livello < 1); if (BORDO) BORDO.qualita(QUAL.livello);
  if (QUAL.livello >= 2) G.senzaPiedi = true; // dal livello 2 anche i piedi piantati (mezzo millisecondo a fotogramma sul processore)
  scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; });
  pienone();
}
// Dopo un gol (sequenza della regia), da GOLSEQ.lento secondi veri per GOLSEQ.durataLento: il gioco va a velocità GOLSEQ.vel.
// G.stateT corre col gioco, quindi il tratto lento in G.stateT va da lento a lento + durataLento · vel
function rallenta() {
  if (G.state !== 'goal' || G.auto || G.noRegia || !MODEL) return 1; const t = G.stateT, a = GOLSEQ.lento;
  return t >= a && t < a + GOLSEQ.durataLento * GOLSEQ.vel ? GOLSEQ.vel : 1;
}
function loop(ts) {
  requestAnimationFrame(loop);
  const vero = (ts - last) / 1000 || 0, dt = Math.min(.05, vero); last = ts; qualita(Math.min(vero, .5)); // la qualità guarda il tempo vero tra i fotogrammi
  PERF.inizio();
  const lento = rallenta(); // il leggero rallentatore dopo il gol
  if (!G.paused && !G.rivede) { if (G.state === 'menu') G.t += dt; else { const n = dt > .022 ? 2 : 1; for (let i = 0; i < n; i++) step(dt * lento / n); } } // durante un replay il gioco resta fermo
  if (G.ball && G.state !== 'menu') { hud(); if (frame++ % 3 === 0) drawRadar(); }
  draw(G.paused ? 0 : dt * lento);
  PERF.fine();
}
async function boot() {
  resize(); window.addEventListener('resize', resize);
  await Promise.all([buildPitch(), loadModel()]); // il campo carica le sue texture mentre arriva il modello
  try { await Promise.race([document.fonts.load('40px Anton'), new Promise((r) => setTimeout(r, 2500))]); } catch (e) { /* si disegna col font di sistema */ }
  const lock = await loadImg('img/corona-lime.png');
  buildStadium(lock); paintBoards(CLUBS[0], CLUBS[1], null);
  RESA = creaResa(T, { renderer, scene, cam, torri: FARI.luci.map((l) => l.pos) }); // riflessi, tonalità e alone (src/grafica/resa.js)
  ATMO = creaAtmosfera(T, { scene, hemi, sun, sole: SOLE, fari: FARI, sfondo: SFONDO, campo: CAMPO, tribune: SPALTI.materiali, resa: RESA }); ATMO.applica(sel.ora); // giorno o notte, scelto prima della partita
  buildMenu(); bindInput();
  K = CAR.carica(); if (K && !club(K.club)) K = null;
  CAR.applica(K, CLUBS); applicaMio(); // le rose cambiate col mercato e il club dell'utente, prima di caricare gli stemmi
  Promise.all(CLUBS.map((c) => loadImg(img(c.id + '-mini')).then((i) => { CREST[c.id] = i; }))).then(() => { if (G.teams.length) paintBoards(G.teams[0].club, G.teams[1].club, CREST); });
  $('#carica').remove(); casa(); requestAnimationFrame(loop);
  CLOUD.quandoCambia(aggiornaCloud); CLOUD.avvia().then((a) => { if (a.utente) allAccesso(); aggiornaCloud(); }); // l'account non blocca mai l'avvio
}
window.__g = { G, step, draw, cam, CFG: { HL, HW, GH, GT, BR, LINEE, CAMERA }, altezza: (p) => p.fig.metri || 0, valoreTiro, bestPassF: bestPass, bordo: () => BORDO, AU, creaAudio, toMenu, pause, panImp, pickKits, kitDist, cdist, apriNuovo, spalti: () => SPALTI, camFov: () => cam.fov, atmo: () => ATMO, porte: () => PORTE, bandierine: () => BANDIERINE, PART, renderer, sun, scene, QUAL, PERF, resa: () => RESA, dettagliFigure, shootDiretto: (p, z, pow) => shoot(p, z, pow, .6), slide, switchCtrl, migliorDifensore, bestPass, puntoIncontro, startMatch, newMatch, club, GESTI, gesto, sbilancia, parata, DIFF, MATE, RUN, DEF, FOUL, TIRE: MOTO.FATICA, CORPO: MOTO.CORPO, VOTE, AIR, vote, cross, corner, header, penalty, penSpot, freeKick, foul, pass, gain, pressA, pressB, pressD, FORMS, MENT, SUB, sostituisci, aiSubs, setTactics, sel, tactics, showPre, CAR, carriera: () => K, CLUBS, drawHub, CLOUD, applicaMio, candidatiCapitano, attributi, salvaK, allAccesso, adotta, panSfide, panClubMio, panCastelli, panProfilo, img, model: () => MODEL };
boot();
})();
