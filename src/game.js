/* Fantatitano — La Partita (prototipo). Partita 3D giocabile: motore, IA, comandi, schermate. */
import * as T from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { creaDivisa, TONI } from './divisa.js';

(() => {
const HL = 50, HW = 32, GH = 4.2, GT = 2.7, BR = 0.26, GRAV = 20;
const HALF_SECS = 120;
const DIFF = {
  facile:    { spd: .88, steal: .7,  save: .58, err: 1.7, think: .6, wait: 1.2, slide: 1.5 },
  normale:   { spd: .97, steal: 1.25, save: .7, err: 1.0, think: .4, wait: 1.0, slide: 4 },
  difficile: { spd: 1.04, steal: 1.9, save: .87, err: .6, think: .26, wait: .6, slide: 6 },
};
const MATE = { spd: 1, steal: .95, save: .72, err: 1, think: .4, wait: .9, slide: 4 };
// `wait`: secondi in cui chi difende temporeggia prima di andare sul pallone; `slide`: scivolate al secondo quando ce n'è l'occasione
// Inserimenti senza palla: ogni quanti secondi si valuta, quanti insieme, quanto durano, punteggio minimo per partire, profondità in metri,
// probabilità del dai e vai dopo un passaggio e di cercare chi si inserisce
const RUN = { every: 1.2, max: 2, life: 2.8, min: 8.5, depth: 13, oneTwo: .35, thru: .3 };
// Difesa a tre distanze dal portatore: oltre `far` ci si avvicina, fino a `near` si temporeggia, sotto si va sul pallone.
// `danger` è la distanza dalla propria porta sotto cui non si aspetta più; `slide` l'intervallo utile per la scivolata
const DEF = { far: 8.5, near: 2.4, hold: 2.3, danger: 24, slide: [1.2, 3.2] };
// Falli: probabilità che un contrasto riuscito sia fallo [di fronte, da dietro], in piedi e in scivolata; falli al secondo mentre si sta addosso
// al portatore [di fronte, da dietro]; probabilità del giallo [in piedi, in scivolata];
// distanza della barriera; quanto para il portiere su rigore rispetto a un tiro normale
const FOUL = { stand: [.08, .3], slide: [.2, .65], rate: [.45, 1.2], yellow: [.1, .4], wall: 9.15, penSave: .42 };
// Fatica: quanta energia si perde al secondo in scatto e quanta se ne recupera, quanta ne torna all'intervallo
const TIRE = { use: .045, rest: .02, half: .4 };
// Peso di ogni evento nel voto in pagella (si parte da 6)
const VOTE = { g: 1.1, a: .7, kp: .12, sot: .15, tk: .2, int: .08, sv: .4, pass: 1.2, fl: -.15, og: -1, yel: -.4, red: -1.5, clean: .6, concGk: -.35, concD: -.22, win: .25 };
// Gioco aereo: fin dove si arriva di testa, quanto si deve essere vicini, da dove si crossa (larghezza e profondità),
// velocità oltre la quale il pallone non si prende di testa (i tiri passano), probabilità che l'IA crossi quando può,
// distanza massima per tirare di testa, quante respinte del portiere finiscono in angolo
const AIR = { low: 1.55, top: 2.6, reach: 1.05, fast: 19.5, wide: 13, deep: 24, cross: .5, shot: 15, behind: .55 };
const FORM = [[-46, 0], [-30, -20], [-33, -7], [-33, 7], [-30, 20], [-13, -14], [-17, 0], [-13, 14], [7, -19], [11, 0], [7, 19]];
const $ = (s) => document.querySelector(s);
const rnd = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const hyp = Math.hypot;
const sgn = (v) => (v < 0 ? -1 : 1);
const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const img = (id) => `img/${id}.webp`;

const G = {
  state: 'menu', stateT: 0, t: 0, teams: [], ball: null, ctrl: null, clock: 0, half: 1, auto: false, diff: DIFF.normale,
  lastTouch: null, lastKicker: null, intended: null, poss: null, shotId: 0, charge: -1, paused: false, portrait: false,
  in: { jx: 0, jy: 0, sprint: false }, idle: 0, stats: null, goals: [], cards: [], next: null, taker: null,
  headId: -1, fk: null, wait: 1.1, offs: null, noOff: false, pen: false, penId: -1, penWait: 0,
};

/* ------------------------------------------------------------------ scena */
const canvas = $('#c');
const renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
const scene = new T.Scene();
scene.background = new T.Color(0x86b9ea);
scene.fog = new T.Fog(0xa9cdee, 130, 330);
const cam = new T.PerspectiveCamera(38, 1, 0.5, 500);
const camPos = new T.Vector3(0, 60, 80), camLook = new T.Vector3(0, 0, 0);
scene.add(new T.HemisphereLight(0xffffff, 0x47703a, 2.3));
const sun = new T.DirectionalLight(0xfff4dd, 1.5); sun.position.set(30, 70, 40); scene.add(sun);

const mats = new Map();
const mat = (hex) => { let m = mats.get(hex); if (!m) { m = new T.MeshLambertMaterial({ color: hex }); mats.set(hex, m); } return m; };
function ctex(c, repX = 1, repY = 1) {
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4;
  if (repX !== 1 || repY !== 1) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(repX, repY); }
  return t;
}
function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }

function buildPitch() {
  const s = 10, M = 6, [c, x] = cv((HL * 2 + M * 2) * s, (HW * 2 + M * 2) * s);
  const X = (wx) => (wx + HL + M) * s, Z = (wz) => (wz + HW + M) * s;
  for (let i = 0, wx = -HL - M; wx < HL + M; wx += 5.6, i++) { x.fillStyle = i % 2 ? '#2f8f3f' : '#35a046'; x.fillRect(X(wx), 0, 5.6 * s + 1, c.height); }
  x.strokeStyle = 'rgba(255,255,255,.92)'; x.fillStyle = 'rgba(255,255,255,.92)'; x.lineWidth = 2.4; x.lineJoin = 'round';
  x.strokeRect(X(-HL), Z(-HW), HL * 2 * s, HW * 2 * s);
  x.beginPath(); x.moveTo(X(0), Z(-HW)); x.lineTo(X(0), Z(HW)); x.stroke();
  x.beginPath(); x.arc(X(0), Z(0), 9.15 * s, 0, 7); x.stroke();
  x.beginPath(); x.arc(X(0), Z(0), 4, 0, 7); x.fill();
  for (const d of [-1, 1]) {
    const gx = d * HL;
    x.strokeRect(Math.min(X(gx), X(gx - d * 16.5)), Z(-20), 16.5 * s, 40 * s);
    x.strokeRect(Math.min(X(gx), X(gx - d * 5.5)), Z(-9.2), 5.5 * s, 18.4 * s);
    x.beginPath(); x.arc(X(gx - d * 11), Z(0), 3.5, 0, 7); x.fill();
    x.beginPath(); const a = Math.acos(5.5 / 9.15);
    x.arc(X(gx - d * 11), Z(0), 9.15 * s, d > 0 ? Math.PI - a : -a, d > 0 ? Math.PI + a : a); x.stroke();
    for (const e of [-1, 1]) { x.beginPath(); x.arc(X(gx), Z(e * HW), 1 * s, 0, 7); x.stroke(); }
  }
  const m = new T.Mesh(new T.PlaneGeometry((HL + M) * 2, (HW + M) * 2), new T.MeshLambertMaterial({ map: ctex(c) }));
  m.rotation.x = -Math.PI / 2; scene.add(m);
  const g = new T.Mesh(new T.PlaneGeometry(700, 700), mat(0x2a7d39)); g.rotation.x = -Math.PI / 2; g.position.y = -.05; scene.add(g);
  // porte
  const [nc, nx] = cv(64, 64); nx.strokeStyle = 'rgba(255,255,255,.75)'; nx.lineWidth = 3; nx.strokeRect(0, 0, 64, 64);
  const post = mat(0xffffff);
  for (const d of [-1, 1]) {
    const gx = d * HL, dep = 2.2;
    for (const e of [-1, 1]) { const p = new T.Mesh(new T.CylinderGeometry(.09, .09, GT, 8), post); p.position.set(gx, GT / 2, e * GH); scene.add(p); }
    const bar = new T.Mesh(new T.CylinderGeometry(.09, .09, GH * 2 + .18, 8), post); bar.rotation.x = Math.PI / 2; bar.position.set(gx, GT, 0); scene.add(bar);
    const net = (w, h, px, py, pz, ry, rx) => {
      const n = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: ctex(nc, w / .45, h / .45), transparent: true, side: T.DoubleSide, depthWrite: false }));
      n.position.set(px, py, pz); n.rotation.set(rx || 0, ry || 0, 0); scene.add(n);
    };
    net(GH * 2, GT, gx + d * dep, GT / 2, 0, Math.PI / 2);
    net(dep, GT, gx + d * dep / 2, GT / 2, GH, 0); net(dep, GT, gx + d * dep / 2, GT / 2, -GH, 0);
    net(dep, GH * 2, gx + d * dep / 2, GT, 0, 0, Math.PI / 2);
    for (const e of [-1, 1]) {
      const f = new T.Mesh(new T.CylinderGeometry(.04, .04, 1.6, 6), post); f.position.set(gx, .8, e * HW); scene.add(f);
      const fl = new T.Mesh(new T.PlaneGeometry(.5, .32), new T.MeshBasicMaterial({ color: 0xD9F51F, side: T.DoubleSide })); fl.position.set(gx - d * .26, 1.42, e * HW); scene.add(fl);
    }
  }
}

let boards = [], standMat = null, titoSprite = null;
function buildStadium(lockup) {
  // tribune: pubblico disegnato a puntini
  const [c, x] = cv(512, 256); x.fillStyle = '#1a2038'; x.fillRect(0, 0, 512, 256);
  const pal = ['#f2f2f2', '#d8d8e0', '#ffcf4d', '#4B06FC', '#D9F51F', '#e3577a', '#3d7bd9', '#2a2f45', '#c98f5a', '#7a4a2e'];
  for (let r = 0; r < 20; r++) for (let k = 0; k < 64; k++) {
    if (Math.random() < .12) continue;
    const px = k * 8 + (r % 2) * 4 + rnd(-1, 1), py = r * 12.8 + 4;
    x.fillStyle = pal[(Math.random() * pal.length) | 0]; x.fillRect(px, py + 3, 5.5, 7);
    x.fillStyle = ['#e8b98f', '#c98f5a', '#8a5a3a', '#f0cba8'][(Math.random() * 4) | 0]; x.beginPath(); x.arc(px + 2.7, py + 1.5, 2.3, 0, 7); x.fill();
  }
  const stand = (len, cx, cz, ry) => {
    const g = new T.Group(); g.position.set(cx, 0, cz); g.rotation.y = ry;
    const h = 30, a = .95, m = new T.Mesh(new T.PlaneGeometry(len, h), new T.MeshLambertMaterial({ map: ctex(c, len / 26, 1) }));
    m.rotation.x = -a; m.position.set(0, h / 2 * Math.cos(a) + 1.2, -h / 2 * Math.sin(a)); g.add(m);
    const w = new T.Mesh(new T.BoxGeometry(len, 1.2, .5), mat(0x0d1733)); w.position.set(0, .6, .2); g.add(w);
    scene.add(g);
  };
  stand(HL * 2 + 30, 0, -(HW + 7.5), 0); stand(HL * 2 + 30, 0, HW + 7.5, Math.PI);
  stand(HW * 2 + 15, HL + 9, 0, -Math.PI / 2); stand(HW * 2 + 15, -(HL + 9), 0, Math.PI / 2);
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
  // Monte Titano con le tre torri, sullo sfondo
  const sh = new T.Shape(); const pts = [[-130, 0], [-110, 8], [-84, 20], [-62, 34], [-52, 44], [-47, 44], [-47, 52], [-41, 52], [-41, 45], [-24, 40], [-8, 48], [-3, 56], [-3, 66], [3, 66], [3, 57], [12, 50], [30, 38], [44, 41], [50, 46], [50, 53], [55, 53], [55, 45], [70, 30], [92, 16], [112, 7], [130, 0]];
  sh.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) sh.lineTo(p[0], p[1]);
  const tg = new T.ShapeGeometry(sh), tm = new T.MeshBasicMaterial({ color: 0x4d6f9c });
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
    x.fillStyle = i % 2 ? '#fff' : '#D9F51F'; x.font = '44px Anton'; x.textBaseline = 'middle'; x.textAlign = 'left';
    x.fillText(i % 2 ? 'FANTATITANO.SITE' : 'FANTATITANO', o + 96, 35);
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
  num: new T.PlaneGeometry(.3, .3), shadow: new T.CircleGeometry(.5, 14), ring: new T.RingGeometry(.72, .95, 28), tri: new T.ConeGeometry(.22, .4, 3),
};
const shadowMat = new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .28, depthWrite: false });
const SKIN = [0xf1c9a5, 0xe0ac7e, 0xc68b5e, 0x9a6441, 0x6e452c], HAIR = [0x1c1410, 0x2e2018, 0x5a3a20, 0x8a6a3a, 0x111111, 0xc9a25a];
function numMat(n, ink) {
  const [c, x] = cv(64, 64); x.font = '50px Anton'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = ink; x.fillText(String(n), 32, 36);
  return new T.MeshBasicMaterial({ map: ctex(c), transparent: true, depthWrite: false });
}
function makeFigure(kit, seed, num) {
  const root = new T.Group(), body = new T.Group(); root.add(body);
  const skin = mat(SKIN[seed % SKIN.length]), hair = mat(HAIR[(seed >>> 4) % HAIR.length]);
  const add = (geo, m, x, y, z, par = body) => { const o = new T.Mesh(geo, m); o.position.set(x, y, z); par.add(o); return o; };
  add(GEO.torso, mat(kit.shirt), 0, 1.27, 0); add(GEO.shorts, mat(kit.shorts), 0, .9, 0);
  add(GEO.head, skin, 0, 1.7, 0); add(GEO.hair, hair, 0, 1.715, -.012);
  const leg = (sx) => {
    const hip = new T.Group(); hip.position.set(sx * .115, .86, 0); body.add(hip); add(GEO.thigh, skin, 0, -.21, 0, hip);
    const knee = new T.Group(); knee.position.set(0, -.42, 0); hip.add(knee); add(GEO.shin, mat(kit.socks), 0, -.2, 0, knee); add(GEO.boot, mat(kit.boots), 0, -.42, .065, knee);
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
  root.scale.setScalar(1.5);
  return { root, body, legL, legR, kneeL, kneeR, armL, armR, elL, elR };
}
/* --- figure con scheletro e animazioni registrate (modello GLB): se il modello non si carica restano quelle a blocchi --- */
let MODEL = null;
/** Quanto si resta a terra dopo una scivolata, un tuffo o un contrasto subito: si allunga se ci sono le clip registrate. */
const DOWN = { pl: .38, gk: .5, fall: .7 };
/** Le azioni registrate: velocità, da che secondo cominciano a sfumare (se manca: alla fine), cosa viene dopo. */
const FX = { tiro: { sp: 1.2, cut: .42 }, passaggio: { sp: 1.2, cut: .3 }, scivolata: { sp: 1.3 }, caduta: { sp: 1.25 }, tuffoS: { sp: 1.5 }, tuffoD: { sp: 1.5 }, presa: { sp: 1.1, cut: .7 } };
const hasFx = (n) => !!(MODEL && MODEL.fx && MODEL.fx[n]);
function azione(p, name) { if (hasFx(name) && p.fig.skinned) { p.fx = name; p.fxT = 0; p.fxNew = true; } }
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
    const box = new T.Box3().setFromObject(scene), k = 2.72 / (box.max.y - box.min.y);
    // capelli: portati nello spazio dell'osso della testa, così basta appenderli
    const hair = {}, hInv = new T.Matrix4().copy(head.matrixWorld).invert(); h.scene.updateMatrixWorld(true);
    h.scene.traverse((o) => { if (o.isMesh) { const geo = o.geometry.clone(); geo.applyMatrix4(o.matrixWorld).applyMatrix4(hInv); geo.computeVertexNormals(); hair[o.name] = geo; } });
    // dove stanno numero (schiena) e stemma (petto): un raggio contro il corpo nella posa a riposo, poi tutto riferito all'osso del torace
    const fermo = new T.Mesh(body.geometry, new T.MeshBasicMaterial({ side: T.DoubleSide })); fermo.matrixWorld.copy(body.matrixWorld);
    const sInv = new T.Matrix4().copy(spine.matrixWorld).invert(), rc = new T.Raycaster();
    const appoggio = (x, y, davanti, lato) => {
      rc.set(new T.Vector3(x, y, davanti ? 2 : -2), new T.Vector3(0, 0, davanti ? -1 : 1)); const hit = rc.intersectObject(fermo, false)[0]; if (!hit) return null;
      const m = new T.Matrix4().compose(new T.Vector3(x, y, hit.point.z + (davanti ? .012 : -.03)), new T.Quaternion().setFromEuler(new T.Euler(0, davanti ? 0 : Math.PI, 0)), new T.Vector3(lato, lato, lato));
      return m.premultiply(sInv);
    };
    const alto = box.max.y - box.min.y;
    MODEL = { scene, k, hair, clips: {}, fx: {}, maschera: pixel(im), pelle: pixel(ip), divise: new Map(),
      numM: appoggio(0, box.min.y + alto * .75, false, .19 / .3), stemmaM: appoggio(.075, box.min.y + alto * .775, true, .085),
      occhi: io ? new T.MeshLambertMaterial({ map: Object.assign(new T.Texture(io), { flipY: false, colorSpace: T.SRGBColorSpace, needsUpdate: true }) }) : mat(0xffffff) };
    const A = window.ANIMS; if (!A) throw new Error('mancano le animazioni');
    for (const [nome, c] of Object.entries(A.clip)) {
      const B = A.ossa.length, times = new Float32Array(c.n), pos = new Float32Array(c.n * 3);
      for (let i = 0; i < c.n; i++) { times[i] = i / A.fps; for (let j = 0; j < 3; j++) pos[i * 3 + j] = c.p[i * 3 + j] / 10000; }
      const tracks = [new T.VectorKeyframeTrack(`${A.bacino}.position`, times, pos)];
      A.ossa.forEach((b, n) => { const v = new Float32Array(c.n * 4); for (let i = 0; i < c.n; i++) for (let j = 0; j < 4; j++) v[i * 4 + j] = c.q[(i * B + n) * 4 + j] / 10000; tracks.push(new T.QuaternionKeyframeTrack(`${b}.quaternion`, times, v)); });
      MODEL.fx[nome] = new T.AnimationClip(nome, (c.n - 1) / A.fps, tracks);
    }
    if (!MODEL.fx.idle || !MODEL.fx.walk || !MODEL.fx.run) throw new Error('mancano le animazioni di base');
    if (MODEL.fx.scivolata) DOWN.pl = .81; if (MODEL.fx.tuffoS) DOWN.gk = 1.1; if (MODEL.fx.caduta) DOWN.fall = 1.35;
  } catch (e) { console.warn('modello 3D non caricato', e); MODEL = null; }
}
const CORPO = 'MI_Superhero_Male', OCCHI = 'MI_Eyes';
const ACCONCIATURE = [null, 'Hair_Buzzed', 'Hair_SimpleParted', 'Hair_Buzzed', 'Hair_SimpleParted', 'Hair_SimpleParted'];
/** Il materiale del corpo per una divisa e un tono di pelle: si disegna una volta e si riusa per tutti quelli uguali. */
function divisaMat(kit, tono) {
  const key = [kit.shirt, kit.shorts, kit.socks, kit.boots, kit.c2, kit.stile, kit.gloves, tono].join('|'); let m = MODEL.divise.get(key);
  if (!m) { const tx = new T.CanvasTexture(creaDivisa(MODEL.maschera, MODEL.pelle, kit, tono)); tx.flipY = false; tx.colorSpace = T.SRGBColorSpace; tx.anisotropy = 4; m = new T.MeshLambertMaterial({ map: tx }); MODEL.divise.set(key, m); }
  return m;
}
const stemmi3d = new Map();
function stemmaMat(id) {
  let m = stemmi3d.get(id); if (m || !CREST[id]) return m || null;
  const tx = new T.Texture(CREST[id]); tx.colorSpace = T.SRGBColorSpace; tx.needsUpdate = true;
  m = new T.MeshBasicMaterial({ map: tx, transparent: true, alphaTest: .4 }); m.userData.ratio = CREST[id].width / CREST[id].height; stemmi3d.set(id, m); return m;
}
const GEO1 = new T.PlaneGeometry(1, 1);
function makeSkinned(kit, seed, num, clubId) {
  const root = new T.Group(), body = new T.Group(); root.add(body);
  const obj = SkeletonUtils.clone(MODEL.scene); obj.scale.multiplyScalar(MODEL.k); body.add(obj);
  const tono = seed % TONI.length, pelo = mat(HAIR[(seed >>> 4) % HAIR.length]), bones = {};
  obj.traverse((o) => {
    if (o.isBone) bones[o.name] = o;
    if (o.isSkinnedMesh) { o.frustumCulled = false; o.material = o.material.name === CORPO ? divisaMat(kit, tono) : o.material.name === OCCHI ? MODEL.occhi : pelo; }
  });
  const stile = ACCONCIATURE[(seed >>> 8) % ACCONCIATURE.length];
  if (stile && MODEL.hair[stile]) bones.Head.add(new T.Mesh(MODEL.hair[stile], pelo));
  if ((seed >>> 12) % 4 === 0 && MODEL.hair.Hair_Beard) bones.Head.add(new T.Mesh(MODEL.hair.Hair_Beard, pelo));
  if (MODEL.numM) { const n = new T.Mesh(GEO.num, numMat(num, kit.ink)); n.applyMatrix4(MODEL.numM); bones.spine_03.add(n); }
  const sm = clubId && MODEL.stemmaM ? stemmaMat(clubId) : null;
  if (sm) { const c = new T.Mesh(GEO1, sm); c.scale.set(sm.userData.ratio, 1, 1); c.applyMatrix4(MODEL.stemmaM); bones.spine_03.add(c); }
  const sh = new T.Mesh(GEO.shadow, shadowMat); sh.rotation.x = -Math.PI / 2; sh.position.y = .03; sh.scale.setScalar(1.5); root.add(sh);
  const mixer = new T.AnimationMixer(obj), A = {}, w = {};
  const base = { idle: MODEL.fx.idle, walk: MODEL.fx.walk, run: MODEL.fx.run, jog: MODEL.fx.jog, esulta: MODEL.fx.esulta, gkIdle: kit.gloves ? MODEL.fx.gkIdle : null };
  for (const n in base) if (base[n]) { const a = mixer.clipAction(base[n]); a.play(); a.time = rnd(base[n].duration); a.setEffectiveWeight(n === 'idle' ? 1 : 0); A[n] = a; w[n] = n === 'idle' ? 1 : 0; }
  return { root, body, mixer, A, bones, w, act: null, old: null, fxW: 0, oldW: 0, skinned: true };
}
const lum = (h) => { const c = new T.Color(h); return .299 * c.r + .587 * c.g + .114 * c.b; };
const cdist = (a, b) => { const x = new T.Color(a), y = new T.Color(b); return hyp(x.r - y.r, x.g - y.g, x.b - y.b); };
function pickKits(h, a) {
  const kit = (c, away) => {
    const shirt = away ? '#F3F3F3' : c.c1, shorts = away ? c.c1 : (cdist(c.c1, c.c2) < .25 ? '#FFFFFF' : c.c2);
    const c2 = away ? c.c1 : (cdist(c.c1, c.c2) < .25 ? '#FFFFFF' : c.c2);
    return { shirt, shorts, socks: shirt, sleeve: shirt, boots: '#16161a', ink: lum(shirt) > .55 ? '#111' : '#fff', c2, stile: away ? null : c.st || null };
  };
  const kh = kit(h, false), ka = kit(a, cdist(h.c1, a.c1) < .45);
  // i pantaloncini dell'una non devono sembrare la maglia dell'altra
  if (cdist(ka.shorts, kh.shirt) < .4) ka.shorts = ka.shirt === '#F3F3F3' ? '#16161a' : ka.shirt;
  if (cdist(kh.shorts, ka.shirt) < .4) kh.shorts = kh.shirt;
  const gk = (other) => {
    const opts = ['#FF7A1A', '#19D3B1', '#E91E8C', '#111111'];
    const best = opts.sort((p, q) => Math.min(cdist(q, kh.shirt), cdist(q, ka.shirt), cdist(q, other || '#000') + .2) - Math.min(cdist(p, kh.shirt), cdist(p, ka.shirt), cdist(p, other || '#000') + .2))[0];
    return { shirt: best, shorts: best, socks: best, sleeve: best, boots: '#16161a', ink: lum(best) > .55 ? '#111' : '#fff', gloves: '#F3F3F3', c2: best, stile: null };
  };
  const g1 = gk(null), g2 = gk(g1.shirt);
  return [kh, ka, g1, g2];
}

const ring = new T.Mesh(GEO.ring, new T.MeshBasicMaterial({ color: 0xD9F51F, transparent: true, opacity: .95, depthWrite: false }));
ring.rotation.x = -Math.PI / 2; ring.position.y = .05; ring.visible = false; scene.add(ring);
const arrow = new T.Mesh(GEO.tri, new T.MeshBasicMaterial({ color: 0xD9F51F })); arrow.rotation.x = Math.PI; arrow.visible = false; scene.add(arrow);
const ballMesh = (() => {
  const [c, x] = cv(256, 128); x.fillStyle = '#fafafa'; x.fillRect(0, 0, 256, 128);
  const cols = ['#111', '#111', '#4B06FC', '#111', '#D9F51F', '#111'];
  for (let i = 0; i < 12; i++) { x.fillStyle = cols[i % cols.length]; x.beginPath(); const px = (i % 6) * 43 + 20 + (i > 5 ? 21 : 0), py = i > 5 ? 88 : 38; for (let k = 0; k < 5; k++) { const a = k * 1.2566 - 1.57; x.lineTo(px + Math.cos(a) * 13, py + Math.sin(a) * 15); } x.fill(); }
  const m = new T.Mesh(new T.SphereGeometry(BR, 18, 14), new T.MeshLambertMaterial({ map: ctex(c) })); m.visible = false; scene.add(m);
  return m;
})();
const ballShadow = new T.Mesh(new T.CircleGeometry(.3, 12), shadowMat); ballShadow.rotation.x = -Math.PI / 2; ballShadow.position.y = .04; ballShadow.visible = false; scene.add(ballShadow);

/* ------------------------------------------------------------------ partita */
function clearMatch() {
  for (const t of G.teams) for (const p of t.players.concat(t.off)) scene.remove(p.fig.root);
  if (MODEL) { for (const m of MODEL.divise.values()) { m.map.dispose(); m.dispose(); } MODEL.divise.clear(); }
  G.teams = [];
}
function newMatch(home, away) {
  clearMatch();
  const [kh, ka, g1, g2] = pickKits(home, away);
  const mk = (club, side, human, kit, gkit) => {
    const t = { club, side, human, score: 0, players: [], off: [], idx: side > 0 ? 0 : 1, chaser: null, cover: null };
    club.xi.forEach(([name, role, num, q], i) => {
      const fig = (MODEL ? makeSkinned : makeFigure)(i === 0 ? gkit : kit, hash(club.id + name), num, i === 0 ? null : club.id); scene.add(fig.root);
      const base = 7.3 + clamp((q - 20) / 40, -.5, .6) + (club.str - 3) * .07;
      t.players.push({ team: t, i, role, name, num, q, x: 0, z: 0, vx: 0, vz: 0, dir: side > 0 ? Math.PI / 2 : -Math.PI / 2, fig, st: 'run', stT: 0, cool: 0, stun: 0, shield: 0, ph: rnd(6), tx: 0, tz: 0, sprint: false, maxV: i === 0 ? 6.6 : base, thinkT: 0, hold: 0, diveS: 0, hit: false, saveId: -1, run: null, mark: null, jock: false, slideCd: 0, yel: 0, red: false, fkShot: false, en: 1, by: null, s: { g: 0, a: 0, kp: 0, sh: 0, sot: 0, pa: 0, pc: 0, tk: 0, int: 0, sv: 0, fl: 0, og: 0 } });
    });
    return t;
  };
  G.teams = [mk(home, 1, true, kh, g1), mk(away, -1, false, ka, g2)];
  G.teams[0].opp = G.teams[1]; G.teams[1].opp = G.teams[0];
  G.ball = { x: 0, y: BR, z: 0, vx: 0, vy: 0, vz: 0, owner: null };
  ballMesh.visible = ballShadow.visible = true;
  G.clock = 0; G.half = 1; G.goals = []; G.cards = []; G.fk = null; G.offs = null; G.noOff = G.pen = false; G.penId = -1; G.penWait = 0; G.lastPass = G.shooter = null; G.stats = { shots: [0, 0], poss: [0, 0], runs: [0, 0], slides: [0, 0], fouls: [0, 0], offs: [0, 0], pens: [0, 0], yel: [0, 0], red: [0, 0], crosses: [0, 0], heads: [0, 0], headGoals: [0, 0], corners: [0, 0] }; G.ctrl = null; G.charge = -1;
  paintBoards(home, away, CREST);
  $('#sbH').src = img(home.id + '-mini'); $('#sbA').src = img(away.id + '-mini'); $('#sbHn').textContent = home.short; $('#sbAn').textContent = away.short;
  hud(); kickoff(G.teams[0]);
  camPos.set(0, 46, 70); camLook.set(0, 0, 0);
}
const all = () => G.teams[0].players.concat(G.teams[1].players);
const diffOf = (p) => (p.team.human ? MATE : G.diff);
const userDrives = (p) => p === G.ctrl && p.team.human && !G.auto;

function kickoff(team) {
  const b = G.ball; b.x = b.z = 0; b.y = BR; b.vx = b.vy = b.vz = 0; b.owner = null;
  for (const t of G.teams) for (const p of t.players) {
    const f = FORM[p.i]; let kx = p.i === 0 ? -46 : Math.min(-1.5, -4 - (8 - f[0]) * .9), kz = f[1];
    if (t !== team && Math.abs(kz) < 10) kx = Math.min(kx, -10.5);
    if (t === team && p.i === 9) { kx = -.7; kz = 0; }
    if (t === team && p.i === 10) { kx = -1.2; kz = 5; }
    p.x = kx * t.side; p.z = kz * t.side; p.vx = p.vz = 0; p.dir = t.side > 0 ? Math.PI / 2 : -Math.PI / 2; p.st = 'run'; p.stT = 0; p.cool = p.stun = 0; p.tx = p.x; p.tz = p.z; p.fx = null; p.fxNew = false; p.fallen = false; p.run = p.mark = null; p.fkShot = false; // fxNew va azzerato insieme a fx, se no il disegno fa partire un'animazione senza nome
  }
  G.taker = team.players.find((p) => p.i === 9) || nearestTo(team, 0, 0); G.taker.x = -.7 * team.side; G.taker.z = 0; G.fk = null; G.offs = null; G.noOff = G.pen = false; G.penWait = 0;
  G.next = team; G.poss = team; G.lastTouch = G.taker; G.intended = null;
  setState('kickoff'); banner(G.half === 1 && G.clock === 0 ? "Calcio d'inizio" : '', '', 1100); AU.whistle();
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
  if (G.offs && G.state === 'play' && G.offs.includes(p)) return offside(p);
  G.offs = null; if (p !== G.taker) G.noOff = false;
  // pagella: passaggio riuscito, oppure pallone intercettato a un avversario
  const lp = G.lastPass, lk = G.lastKicker; G.lastPass = null; p.by = null;
  if (G.state === 'play') { if (lp && lp.team === p.team && lp !== p) { lp.s.pc++; p.by = lp; } else if (!G.ball.owner && lk && lk.team !== p.team && p.i) p.s.int++; }
  const b = G.ball, prev = G.poss; b.owner = p; G.lastTouch = p; G.intended = null; G.poss = p.team; p.shield = .45; p.hold = 0;
  p.thinkT = diffOf(p).think * rnd(.6, 1.3);
  if (p.team.human) { if (p.i !== 0) setCtrl(p); } else if (prev !== p.team || !G.ctrl) setCtrl(nearestTo(G.teams[0], b.x, b.z));
}
function kick(p, vx, vy, vz, anim = 'passaggio') {
  const b = G.ball; b.owner = null; b.x = p.x + Math.sin(p.dir) * .8; b.z = p.z + Math.cos(p.dir) * .8; b.y = BR;
  b.vx = vx; b.vy = vy; b.vz = vz; p.cool = .45; p.st = 'kick'; p.stT = 0; G.lastTouch = G.lastKicker = p; AU.kick(hyp(vx, vz)); azione(p, anim);
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
  const b = G.ball, h = .05, f = Math.exp(-.22 * h); let x = b.x, y = b.y, z = b.z, vx = b.vx, vy = b.vy, vz = b.vz;
  for (let t = 0; t < 3; t += h) { vy -= GRAV * h; x += vx * h; y += vy * h; z += vz * h; vx *= f; vz *= f; if (vy < 0 && y < 1.95) break; }
  return [clamp(x, -HL - 2, HL + 2), clamp(z, -HW - 2, HW + 2)];
}
const airborne = () => { const b = G.ball; return !b.owner && (b.y > 1.2 || b.vy > 4); };
// Il compagno in area a cui crossare: libero, vicino alla porta, non troppo vicino a chi crossa
function crossTarget(p) {
  const s = p.team.side; let best = null, bs = -1e9;
  for (const m of p.team.players) {
    if (m === p || m.i === 0 || m.x * s < HL - 19 || Math.abs(m.z) > 13 || hyp(m.x - p.x, m.z - p.z) < 9) continue;
    const sc = Math.min(openness(m), 5) * 1.2 - hyp(s * HL - m.x, m.z) * .15 + rnd(2); if (sc > bs) { bs = sc; best = m; }
  }
  return best;
}
const canCross = (p) => Math.abs(p.z) > AIR.wide && p.x * p.team.side > HL - AIR.deep;
// Traversone: pallone alto che scende ad altezza di testa davanti al compagno
function cross(p, m) {
  const s = p.team.side, e = 1.5 * qf(p) * (userDrives(p) ? .7 : diffOf(p).err);
  const tx = clamp((m.x + m.vx * .5) * s + 1, -HL, HL - 2.5) * s + rnd(-1, 1) * e, tz = m.z + m.vz * .5 + rnd(-1, 1) * e;
  const dx = tx - p.x, dz = tz - p.z, d = hyp(dx, dz) || 1, T = clamp(d / 18, .75, 1.35), v = d * .22 / (1 - Math.exp(-.22 * T));
  kick(p, dx / d * v, (1.95 - BR + .5 * GRAV * T * T) / T, dz / d * v, 'tiro');
  G.intended = m; m.run = null; p.s.pa++; G.lastPass = p; if (m.x * s > HL - 19) G.stats.crosses[p.team.idx]++; if (p.team.human) setCtrl(m);
}
// Colpo di testa: in porta se si è a tiro, via dall'area se si difende, altrimenti di sponda a un compagno
function header(p) {
  if (G.offs && G.offs.includes(p)) return offside(p);
  const t = p.team, s = t.side, b = G.ball, gx = s * HL, dG = hyp(gx - p.x, p.z), D = diffOf(p), toGoal = dG < AIR.shot && (gx - p.x) * s > 1.5 && Math.abs(p.z) < 12;
  if (p === G.intended && !toGoal && openness(p) > 2.6) return; // libero e lontano dalla porta: lo lascia scendere e lo controlla
  const lp = G.lastPass; G.lastPass = null; p.by = lp && lp.team === t && lp !== p ? lp : null; if (p.by) lp.s.pc++;
  let vx, vy, vz; G.intended = null; G.stats.heads[t.idx]++;
  if (toGoal) {
    const mk = openness(p) < 1.6 ? 1.6 : 1, tz = sgn(rnd(-1, 1)) * GH * rnd(.3, .95) + rnd(-1, 1) * (1.5 + dG * .16) * D.err * qf(p) * mk, dx = gx - b.x, dz = tz - b.z, d = hyp(dx, dz) || 1, sp = rnd(12, 16) / (mk > 1 ? 1.15 : 1), T = d / sp;
    vx = dx / d * sp; vz = dz / d * sp; vy = (rnd(.3, 1.7) * (rnd() < .2 * mk ? 2 : 1) - b.y + .5 * GRAV * T * T) / T; // ogni tanto finisce alto
    G.shotId++; G.headId = G.shotId; G.stats.shots[t.idx]++; p.s.sh++; if (p.by) p.by.s.kp++; G.shooter = p;
  } else {
    const m = p.x * s < -HL + 24 ? null : bestPass(p);
    if (m) { const dx = m.x - b.x, dz = m.z - b.z, d = hyp(dx, dz) || 1, sp = clamp(6 + d * .5, 8, 15); vx = dx / d * sp; vz = dz / d * sp; vy = 2.5; G.intended = m; p.s.pa++; G.lastPass = p; }
    else { vx = s * rnd(9, 13); vz = sgn(p.z || rnd(-1, 1)) * rnd(3, 8); vy = rnd(6, 9); } // respinta
  }
  b.vx = vx; b.vy = vy; b.vz = vz; p.cool = .5; p.dir = Math.atan2(vx, vz); G.lastTouch = G.lastKicker = p; G.poss = t; AU.kick(11); azione(p, 'testa'); markOffside(p);
}
function openness(m) { let d = 99; for (const o of m.team.opp.players) d = Math.min(d, hyp(o.x - m.x, o.z - m.z)); return d; }
function laneBlocked(p, m) {
  const dx = m.x - p.x, dz = m.z - p.z, L = hyp(dx, dz) || 1;
  for (const o of p.team.opp.players) { const t = clamp(((o.x - p.x) * dx + (o.z - p.z) * dz) / (L * L), 0, 1); if (t > .08 && t < .95 && hyp(p.x + dx * t - o.x, p.z + dz * t - o.z) < 1.7) return true; }
  return false;
}
function bestPass(p, ix, iz) {
  const s = p.team.side; let best = null, bs = -1e9; const dirGiven = ix !== undefined;
  for (const m of p.team.players) {
    if (m === p || (m.i === 0 && !(dirGiven && false))) continue;
    const dx = m.x - p.x, dz = m.z - p.z, d = hyp(dx, dz); if (d < 4 || d > 44) continue;
    const over = m.x * s - offsideLine(p.team, p.x), off = over > .35; if (over > 1.2 && !dirGiven) continue; // chi passa non vede il fuorigioco di poco
    let sc;
    if (dirGiven) { const dot = (dx * ix + dz * iz) / d; if (dot < .45) continue; sc = dot * 34 - d * .22 + Math.min(openness(m), 6) * .6 - (laneBlocked(p, m) ? 5 : 0) + (m.run ? 3 : 0) - (off ? 9 : 0); }
    else sc = dx * s * .55 + Math.min(openness(m), 8) * 1.3 - (laneBlocked(p, m) ? 13 : 0) - d * .08 + rnd(3) - (m.x * s < -30 ? 6 : 0) + (m.run ? 6 : 0);
    if (sc > bs) { bs = sc; best = m; }
  }
  return best;
}
function pass(p, m) {
  const d0 = hyp(m.x - p.x, m.z - p.z), lead = .3 + d0 / 70;
  let tx = m.x + m.vx * lead, tz = m.z + m.vz * lead;
  if (m.run) { const rx = m.run.x - m.x, rz = m.run.z - m.z, rl = hyp(rx, rz) || 1, k = Math.min(rl, m.maxV * 1.2 * (lead + .35)); tx = m.x + rx / rl * k; tz = m.z + rz / rl * k; }
  let dx = tx - p.x, dz = tz - p.z; const d = hyp(dx, dz) || 1;
  { const e = rnd(-1, 1) * .035 * qf(p) * (userDrives(p) ? .6 : diffOf(p).err), c = Math.cos(e), n = Math.sin(e), x = dx * c - dz * n; dz = dx * n + dz * c; dx = x; } // imprecisione
  const lob = d > 20 && laneBlocked(p, m);
  const sp = lob ? clamp(d * .78, 12, 24) : clamp(9.5 + d * .82, 12, 27);
  kick(p, dx / d * sp, lob ? clamp(d * .42, 6, 11) : .4, dz / d * sp, lob || d > 26 ? 'tiro' : 'passaggio');
  G.intended = m; m.run = null; if (p.team.human) setCtrl(m);
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
  const dx = gx - p.x, dz = tz - p.z, d = hyp(dx, dz) || 1, sp = 19 + 15 * pow, t = d / sp / .94;
  const h = .35 + pow * 1.85 + (pow > .86 ? (pow - .86) * 11 : 0) + rnd(-.25, .25) * err;
  kick(p, dx / d * sp, clamp((h - BR + .5 * GRAV * t * t) / t, 0, 15), dz / d * sp, 'tiro');
  G.shotId++; G.intended = null; G.stats.shots[p.team.idx]++; p.s.sh++; if (p.by) p.by.s.kp++; G.lastPass = null; G.shooter = p;
  if (G.pen) { G.pen = false; G.penId = G.shotId; }
}
function slide(p) { if (p.st !== 'run' || p.stun > 0) return; p.st = 'slide'; p.stT = 0; p.hit = false; azione(p, 'scivolata'); }
function switchCtrl() { const b = G.ball; const n = nearestTo(G.teams[0], b.x + b.vx * .3, b.z + b.vz * .3, G.ctrl); if (n) setCtrl(n); }

/* comandi dell'utente */
function inputWorld() { const { jx, jy } = G.in; return G.portrait ? [-jy, jx] : [jx, jy]; }
function pressA() {
  if (G.state !== 'play' || G.auto || G.penWait > 0) return; const c = G.ctrl, b = G.ball; if (!c) return;
  if (b.owner === c) {
    const [ix, iz] = inputWorld(), l = hyp(ix, iz);
    const m = l > .3 ? bestPass(c, ix / l, iz / l) || bestPass(c, Math.sin(c.dir), Math.cos(c.dir)) : bestPass(c, Math.sin(c.dir), Math.cos(c.dir)) || bestPass(c); if (m) pass(c, m);
  } else switchCtrl();
}
// Tasto Cross: traversone se c'è un compagno in area, altrimenti lancio lungo nella direzione della levetta
function pressD() {
  if (G.state !== 'play' || G.auto || G.penWait > 0) return; const c = G.ctrl, b = G.ball; if (!c || b.owner !== c) return;
  const s = c.team.side, [jx, jz] = inputWorld(), l = hyp(jx, jz), ix = l > .3 ? jx / l : Math.sin(c.dir), iz = l > .3 ? jz / l : Math.cos(c.dir);
  let m = c.x * s > HL - 34 ? crossTarget(c) : null, bs = -1e9;
  if (!m) for (const o of c.team.players) {
    if (o === c || o.i === 0) continue; const dx = o.x - c.x, dz = o.z - c.z, d = hyp(dx, dz), dot = (dx * ix + dz * iz) / (d || 1); if (d < 13 || d > 52 || dot < .5) continue;
    const sc = dot * 30 + Math.min(openness(o), 6) - Math.abs(d - 28) * .2; if (sc > bs) { bs = sc; m = o; }
  }
  if (m) cross(c, m);
}
function pressB(down) {
  if (G.state !== 'play' || G.auto) { G.charge = -1; return; } const c = G.ctrl, b = G.ball; if (!c) return;
  if (down) { if (b.owner === c) G.charge = 0; else slide(c); }
  else if (G.charge >= 0) { if (b.owner === c) userShoot(clamp(G.charge / .8, .18, 1)); G.charge = -1; }
}
function userShoot(pow) {
  const c = G.ctrl, [, iz] = inputWorld(); const gk = c.team.opp.players[0];
  const tz = Math.abs(iz) > .25 ? iz * GH * 1.06 : (gk.z > 0 ? -1 : 1) * GH * .68;
  shoot(c, tz, pow, .9);
}

/* ------------------------------------------------------------------ IA */
function homeOf(p) {
  const t = p.team, s = t.side, b = G.ball, f = FORM[p.i], bx = b.x * s, att = G.poss === t;
  let hx = f[0] + bx * .55 + (att ? 7 : -5), hz = f[1] * (att ? 1 : .8) + b.z * s * .28;
  if (p.role === 'D') hx = clamp(hx, -42, att ? 12 : 3);
  else if (p.role === 'C') hx = clamp(hx, -34, 36);
  else { if (att) hx = Math.max(hx, Math.min(bx + 13, 43)); hx = clamp(hx, -14, 44); }
  hx += Math.sin(G.t * .7 + p.i * 2.1) * 1.6; hz += Math.cos(G.t * .5 + p.i * 1.3) * 1.6;
  return [hx * s, clamp(hz, -HW + 3, HW - 3) * s];
}
function intercept(p) {
  if (airborne()) return landing();
  const b = G.ball, k = .85; let px = b.x, pz = b.z;
  for (let t = .1; t <= 2.2; t += .1) {
    const e = (1 - Math.exp(-k * t)) / k; px = b.x + b.vx * e; pz = b.z + b.vz * e;
    if (hyp(px - p.x, pz - p.z) <= p.maxV * 1.15 * t + .6) break;
  }
  return [clamp(px, -HL - 2, HL + 2), clamp(pz, -HW - 2, HW + 2)];
}
function roles() {
  const b = G.ball, bx = b.x + b.vx * .3, bz = b.z + b.vz * .3;
  for (const t of G.teams) {
    let a = null, c = null, ad = 1e9, cd = 1e9;
    for (const p of t.players) {
      if (p.i === 0 || p.stun > 0 || userDrives(p) || p === b.owner) continue;
      const d = hyp(p.x - bx, p.z - bz);
      if (d < ad) { c = a; cd = ad; a = p; ad = d; } else if (d < cd) { c = p; cd = d; }
    }
    t.chaser = a; t.chaserD = ad; t.cover = c; t.offLine = offsideLine(t);
    // marcature: ogni difensore prende l'avversario più vicino alla sua zona; chi si inserisce allarga la zona e viene seguito anche dai centrocampisti
    for (const p of t.players) p.mark = null;
    const own = b.owner; if (!own || own.team === t || G.state !== 'play') continue;
    const taken = new Set();
    for (const p of t.players) {
      if (p.i === 0 || p === a || p === c || p.role === 'A' || p.stun > 0 || userDrives(p)) continue;
      const h = homeOf(p); let m = null, md = 9;
      for (const o of t.opp.players) {
        if (o.i === 0 || o === own || taken.has(o) || (p.role === 'C' && !o.run)) continue;
        const d = hyp(o.x - h[0], o.z - h[1]) - (o.run ? 5 : 0); if (d < md) { md = d; m = o; }
      }
      if (m) { p.mark = m; taken.add(m); }
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
    if (!has || !own || own.i === 0) continue;
    t.runT = (t.runT || 0) - dt; if (t.runT > 0 || n >= RUN.max) continue; t.runT = RUN.every * rnd(.7, 1.3);
    const s = t.side, line = defLine(t); let best = null, bs = RUN.min, bx = 0, bz = 0;
    for (const p of t.players) {
      if (p.i === 0 || p === own || p.run || p.role === 'D' || p.stun > 0 || userDrives(p)) continue;
      if (hyp(p.x - own.x, p.z - own.z) > 34 || (p.x - own.x) * s < -8) continue;
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
    const px = b.x + own.vx * .25, pz = b.z + own.vz * .25, pd = hyp(px - p.x, pz - p.z);
    if (pd > DEF.slide[0] && pd < DEF.slide[1] && rnd() < D.slide * dt) { p.dir = Math.atan2(px - p.x, pz - p.z); p.slideCd = 3.5; G.stats.slides[t.idx]++; return slide(p); }
  }
  if (d > DEF.far) t.jT = 0;
  else if (d > DEF.near && !beaten) {
    t.jT += dt; const c = t.cover;
    const go = threat < DEF.danger || t.jT > D.wait || own.stun > 0 || (c && hyp(c.x - own.x, c.z - own.z) < 5.5);
    if (!go) { p.tx = own.x + own.vx * .3 + ux * DEF.hold; p.tz = own.z + own.vz * .3 + uz * DEF.hold; p.jock = true; return; }
  }
  p.tx = own.x + own.vx * .25 + (gx - own.x) * .05; p.tz = own.z + own.vz * .25 - own.z * .04; p.sprint = d > 3 || beaten;
}
function think(p, dt) {
  const b = G.ball, t = p.team, s = t.side, own = b.owner; p.sprint = false;
  if (G.state !== 'play') {
    if (G.state === 'goal') {
      const sc = G.scorer;
      if (sc && t === sc.team && p.i !== 0) { if (p === sc) { p.tx = sgn(sc.x) * (HL - 7); p.tz = sgn(sc.z || 1) * (HW - 7); } else { p.tx = sc.x - s * 1.5 + Math.sin(p.i * 2) * 1.6; p.tz = sc.z + Math.cos(p.i * 2) * 1.6; } p.sprint = true; }
      else { const h = homeOf(p); p.tx = h[0]; p.tz = h[1]; }
    } else if (G.state === 'restart') {
      const fk = G.fk, w = fk && fk.wall && fk.wall.find((q) => q.p === p);
      if (p === G.taker) { p.tx = b.x - s * (fk && fk.pen ? 2.4 : .6); p.tz = b.z; p.sprint = true; }
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
    if (p === G.intended || p === t.chaser || (G.land && hyp(G.land[0] - p.x, G.land[1] - p.z) < 4.5)) { const [ix, iz] = intercept(p); p.tx = ix; p.tz = iz; p.sprint = true; return; }
  } else if (own.team !== t) {
    const gx = -s * HL;
    if (p === t.chaser && (!t.human || G.auto || t.chaserD < 15)) return chase(p, own, dt);
    if (p === t.cover) { const dx = gx - own.x, dz = -own.z, d = hyp(dx, dz) || 1, k = Math.min(7, d * .5); p.tx = own.x + dx / d * k; p.tz = own.z + dz / d * k; return; }
    const m = p.mark;
    if (m) { const lead = m.run ? .35 : 0; p.tx = m.x + m.vx * lead + sgn(gx - m.x) * 2.8; p.tz = (m.z + m.vz * lead) * .92; p.sprint = !!m.run; return; }
    const h = homeOf(p); p.tx = h[0]; p.tz = h[1]; return;
  }
  // finché il compagno ha palla si resta in linea coi difensori: lo scatto oltre la linea parte col passaggio
  const lim = own && own.team === t ? (t.offLine - .5 + (p.run && p.run.g || 0)) * s : null, onside = () => { if (lim !== null && p.tx * s > lim * s) p.tx = lim; };
  if (p.run) { p.tx = p.run.x; p.tz = p.run.z; p.sprint = true; return onside(); }
  const h = homeOf(p); p.tx = h[0]; p.tz = h[1]; onside();
  if (own && own.team === t) { const d = hyp(p.tx - own.x, p.tz - own.z); if (d < 6) { p.tx += (p.tx - own.x) / (d || 1) * 5; p.tz += (p.tz - own.z) / (d || 1) * 5 + sgn(p.z - own.z) * 3; } }
}
function ownerThink(p, dt) {
  const t = p.team, s = t.side, gx = s * HL, D = diffOf(p), dGoal = hyp(gx - p.x, p.z);
  if (p.fkShot) { // punizione diretta: fermo sul pallone, poi tiro sopra la barriera
    p.tx = p.x; p.tz = p.z; p.thinkT -= dt; if (p.thinkT > 0) return; p.fkShot = false;
    return shoot(p, sgn(rnd(-1, 1)) * GH * rnd(.5, .9), rnd(.62, .8), D.err);
  }
  if (p.cornerKick) { // calcio d'angolo: fermo sul pallone, poi traversone
    p.tx = p.x; p.tz = p.z; p.thinkT -= dt; if (p.thinkT > 0) return; p.cornerKick = false;
    const m = crossTarget(p) || bestPass(p); if (m) return (canCross(p) && m.x * s > HL - 19 ? cross : pass)(p, m); return;
  }
  let near = null, nd = 99; for (const o of t.opp.players) { const d = hyp(o.x - p.x, o.z - p.z); if (d < nd) { nd = d; near = o; } }
  // direzione di corsa: verso la porta, scansando chi sta davanti
  let ax = gx - s * 9 - p.x, az = clamp(p.z * .35, -8, 8) - p.z; const al = hyp(ax, az) || 1; ax /= al; az /= al;
  if (near && nd < 6 && (near.x - p.x) * s > -1) { const side = sgn(p.z - near.z || rnd(-1, 1)); az += side * 1.1 * (Math.abs(p.z) > HW - 6 ? -.6 : 1); }
  p.tx = p.x + ax * 8; p.tz = clamp(p.z + az * 8, -HW + 1.5, HW - 1.5); p.sprint = nd > 2.5;
  p.thinkT -= dt; if (p.thinkT > 0) return; p.thinkT = D.think * rnd(.7, 1.4);
  if (dGoal < 29 && Math.abs(p.z) < 20 && (p.x - gx) * s < -3 && (dGoal < 17 || rnd() < .35)) {
    return shoot(p, sgn(rnd(-1, 1)) * GH * rnd(.4, .9), rnd(.45, .84), D.err * 1.25);
  }
  if (canCross(p) && rnd() < AIR.cross) { const m = crossTarget(p); if (m) return cross(p, m); }
  const thru = t.players.some((m) => m.run && (m.x - p.x) * s > 3 && !laneBlocked(p, m));
  if ((nd < 3.6 && rnd() < .6) || rnd() < .12 || (p.x * s > HL - 9 && rnd() < .7) || (thru && rnd() < RUN.thru)) { const m = bestPass(p); if (m) pass(p, m); }
}
function gkThink(p, dt) {
  const b = G.ball, t = p.team, s = t.side, gx = -s * HL, own = b.owner;
  if (own === p) {
    p.hold += dt; p.tx = gx + s * 5; p.tz = clamp(p.z, -6, 6);
    if (p.hold > 1) { const m = bestPass(p) || t.players[1]; pass(p, m); p.hold = 0; }
    return;
  }
  const toward = b.vx * -s;
  if (!own && toward > 8) {
    const tt = (p.x - b.x) / b.vx;
    if (tt > 0 && tt < 1.6) {
      const zp = b.z + b.vz * tt;
      if (Math.abs(zp) < GH + 2.5) {
        p.tx = p.x; p.tz = clamp(zp, -GH - .6, GH + .6); p.sprint = true;
        if (tt < .42 && Math.abs(zp - p.z) > 1.1 && p.st === 'run') { p.st = 'dive'; p.stT = 0; p.diveS = sgn(zp - p.z); p.diveV = clamp(Math.abs(zp - p.z) / .38, 4, 9.5); azione(p, -p.diveS * Math.sin(p.dir) > 0 ? 'tuffoS' : 'tuffoD'); }
        return;
      }
    }
  }
  const dB = hyp(b.x - gx, b.z); let out = 1.2 + clamp(dB / 16, 0, 1) * 3.2;
  if (airborne() && toward < 13) { // traversone che scende vicino alla porta: esce a prenderlo
    const [lx, lz] = landing(); if ((lx - gx) * s < 7 && (lx - gx) * s > -.5 && Math.abs(lz) < 7.5) { p.tx = lx; p.tz = lz; p.sprint = true; return; }
  }
  if (!own && dB < 17 && Math.abs(b.z) < 19 && hyp(b.vx, b.vz) < 9) { // palla vagante in area: esce
    let od = 99; for (const o of t.opp.players) od = Math.min(od, hyp(o.x - b.x, o.z - b.z));
    if (hyp(p.x - b.x, p.z - b.z) < od + 1) { p.tx = b.x; p.tz = b.z; p.sprint = true; return; }
  }
  if (own && own.team !== t && dB < 17) { let dd = 99; for (const m of t.players) if (m.i) dd = Math.min(dd, hyp(m.x - own.x, m.z - own.z)); if (dd > 3.5) out = Math.min(dB * .55, 9); }
  const k = out / (dB || 1); p.tx = gx + (b.x - gx) * k; p.tz = clamp(b.z * k * 1.0, -GH + .4, GH - .4);
  if ((p.tx - gx) * s < .8) p.tx = gx + s * .8;
}

/* ------------------------------------------------------------------ passo di simulazione */
function step(dt) {
  G.t += dt; G.stateT += dt; const b = G.ball; if (!b) return;
  if (G.state === 'play') {
    G.clock += dt; if (G.poss) G.stats.poss[G.poss.idx] += dt;
    if (G.charge >= 0) { G.charge += dt; if (G.charge > .95) pressB(false); }
    if (G.clock >= HALF_SECS) {
      if (G.half === 1) { setState('half'); banner('Intervallo', `${G.teams[0].club.short} ${G.teams[0].score} - ${G.teams[1].score} ${G.teams[1].club.short}`, 2300); AU.whistle(2); }
      else { setState('full'); banner('Fine partita', '', 1800); AU.whistle(3); }
    }
  } else if (G.state === 'kickoff') { if (G.stateT > 1.2) { gain(G.taker); G.taker.thinkT = .2; setState('play'); } }
  else if (G.state === 'goal') { if (G.stateT > 4.2) kickoff(G.next); }
  else if (G.state === 'restart') {
    if (G.stateT > G.wait) {
      const k = G.taker, fk = G.fk; k.x = b.x - k.team.side * .5; k.z = b.z; k.vx = k.vz = 0;
      if (fk && fk.pen) { // rigore: tutti fuori dall'area, portiere sulla linea
        for (const o of all()) if (o !== k) { const q = penSpot(o); o.x = q[0]; o.z = q[1]; o.vx = o.vz = 0; }
        gain(k); k.shield = 9; G.pen = true; setState('play');
        if (userDrives(k)) { G.penWait = 6; banner('', 'Mira con la levetta e tira', 2200); }
        else shoot(k, sgn(rnd(-1, 1)) * GH * rnd(.5, .88), rnd(.58, .78), diffOf(k).err * .8);
      } else {
        const far = fk ? FOUL.wall : 6;
        if (fk && fk.wall) for (const w of fk.wall) { w.p.x = w.x; w.p.z = w.z; w.p.vx = w.p.vz = 0; }
        if (fk && fk.pos) for (const [o, q] of fk.pos) { o.x = q[0]; o.z = q[1]; o.vx = o.vz = 0; }
        for (const o of k.team.opp.players) { if (fk && fk.wall && fk.wall.some((w) => w.p === o)) continue; const d = hyp(o.x - b.x, o.z - b.z); if (d < far) { o.x = b.x + (o.x - b.x) / (d || 1) * (far + .5); o.z = clamp(b.z + (o.z - b.z) / (d || 1) * (far + .5) - (fk ? 0 : sgn(b.z) * 2), -HW, HW); } }
        gain(k); k.shield = 1; setState('play');
        if (fk && fk.direct && !userDrives(k)) { k.fkShot = true; k.thinkT = .45; k.shield = 1.5; }
        if (fk && fk.corner && !userDrives(k)) { k.cornerKick = true; k.thinkT = .4; k.shield = 1.5; }
      }
      G.fk = null;
    }
  } else if (G.state === 'half') { if (G.stateT > 2.6) { G.half = 2; G.clock = 0; for (const p of all()) p.en = Math.min(1, p.en + TIRE.half); kickoff(G.teams[1]); } }
  else if (G.state === 'full') { if (G.stateT > 2 && !G.shown) { G.shown = true; showEnd(); } }

  if (G.penWait > 0) { // rigore dell'utente: tutti fermi finché non tira; se aspetta troppo parte da solo
    const k = G.taker; G.penWait -= dt;
    if (G.state !== 'play' || b.owner !== k) G.penWait = 0;
    else if (G.penWait <= 0) { G.charge = -1; shoot(k, sgn(rnd(-1, 1)) * GH * .7, .7, 1); }
  }
  roles(); runs(dt); G.land = airborne() ? landing() : null;
  const ps = all();
  for (const p of ps) {
    p.cool -= dt; p.stun -= dt; p.shield -= dt; p.slideCd -= dt; p.jock = false;
    if (G.penWait > 0) { p.tx = p.x; p.tz = p.z; p.sprint = false; }
    else if (!userDrives(p) || G.state !== 'play') think(p, dt); else userThink(p);
  }
  for (const p of ps) movePlayer(p, dt);
  for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) { // non si attraversano
    const a = ps[i], c = ps[j], dx = c.x - a.x, dz = c.z - a.z, d = hyp(dx, dz);
    if (d < .8 && d > .001) { const k = (.8 - d) / 2 / d; a.x -= dx * k; a.z -= dz * k; c.x += dx * k; c.z += dz * k; }
  }
  moveBall(dt);
  if (G.state === 'play') { contacts(dt); bounds(); }
  // cambio automatico se il giocatore scelto resta lontano e fermo
  if (G.state === 'play' && G.ctrl && !G.auto && b.owner !== G.ctrl) {
    const c = G.ctrl, l = hyp(G.in.jx, G.in.jy); G.idle = l > .2 ? 0 : G.idle + dt;
    if (G.idle > 1.2 && hyp(c.x - b.x, c.z - b.z) > 22 && G.intended !== c) switchCtrl();
  }
}
function userThink(p) {
  const b = G.ball, [ix, iz] = inputWorld(), l = hyp(ix, iz); p.sprint = G.in.sprint;
  if (l > .2) { const k = Math.min(1, l) / l; p.tx = p.x + ix * k * 6; p.tz = p.z + iz * k * 6; p.user = Math.min(1, l * 1.25); }
  else if (!b.owner && (p === G.intended || hyp(p.x - b.x, p.z - b.z) < 9)) { const [x, z] = intercept(p); p.tx = x; p.tz = z; p.user = 1; p.sprint = true; }
  else { p.tx = p.x; p.tz = p.z; p.user = 0; }
}
function movePlayer(p, dt) {
  const b = G.ball; p.stT += dt;
  if (p.st === 'kick' && p.stT > .32) p.st = 'run';
  if (p.st === 'slide') { const k = Math.max(0, 1 - p.stT / .55) * 11.5; p.vx = Math.sin(p.dir) * k; p.vz = Math.cos(p.dir) * k; if (p.stT > .55) { p.st = 'down'; p.stT = 0; } }
  else if (p.st === 'dive') { const k = Math.max(0, 1 - p.stT / .5) * (p.diveV || 8); p.vx *= .8; p.vz = p.diveS * k; if (p.stT > .5) { p.st = 'down'; p.stT = 0; } }
  else if (p.st === 'down') { p.vx *= .7; p.vz *= .7; if (p.stT > (p.i === 0 ? DOWN.gk : DOWN.pl)) { p.st = 'run'; p.stT = 0; } }
  else {
    const run = p.sprint && hyp(p.vx, p.vz) > 5; p.en = clamp(p.en + (run ? -TIRE.use : TIRE.rest) * dt, 0, 1); // fatica: lo scatto consuma
    let sp = p.maxV * (p.team.human ? 1 : G.diff.spd) * (p.sprint ? 1 + .27 * (.3 + .7 * p.en) : 1) * (.95 + .05 * p.en) * (b.owner === p ? .93 : 1) * (p.stun > 0 ? (p.fallen ? 0 : .25) : 1) * (p.jock ? .85 : 1); if (p.fallen && p.stun <= 0) p.fallen = false;
    if (G.state === 'goal' && !p.sprint) sp *= .5;
    const dx = p.tx - p.x, dz = p.tz - p.z, d = hyp(dx, dz); let wx = 0, wz = 0;
    if (d > .2) { const k = Math.min(1, d / 1.3) * sp / d; wx = dx * k; wz = dz * k; }
    const a = Math.min(1, dt * (userDrives(p) ? 11 : 8)); p.vx += (wx - p.vx) * a; p.vz += (wz - p.vz) * a;
    const v = hyp(p.vx, p.vz); let want = p.dir;
    if (p.i === 0 && b.owner !== p && G.state === 'play') want = Math.atan2(b.x - p.x, b.z - p.z); // il portiere guarda sempre la palla, anche quando si sposta di lato
    else if (v > .7 && !p.jock) want = Math.atan2(p.vx, p.vz); else if (b.owner !== p) want = Math.atan2(b.x - p.x, b.z - p.z); // anche chi temporeggia guarda il pallone
    let da = want - p.dir; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; p.dir += da * Math.min(1, dt * (v > .7 ? 13 : 6));
  }
  p.x = clamp(p.x + p.vx * dt, -HL - 3.5, HL + 3.5); p.z = clamp(p.z + p.vz * dt, -HW - 3, HW + 3);
}
function moveBall(dt) {
  const b = G.ball, o = b.owner;
  if (o) {
    const tx = o.x + Math.sin(o.dir) * .8, tz = o.z + Math.cos(o.dir) * .8, a = Math.min(1, dt * 20);
    b.x += (tx - b.x) * a; b.z += (tz - b.z) * a; b.y = BR; b.vx = o.vx; b.vz = o.vz; b.vy = 0; return;
  }
  if (G.state === 'kickoff' || G.state === 'restart') return;
  b.vy -= GRAV * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
  if (b.y <= BR) { b.y = BR; if (b.vy < -2.5) { b.vy = -b.vy * .52; b.vx *= .82; b.vz *= .82; } else b.vy = 0; }
  const f = Math.exp(-(b.y <= BR + .02 ? .85 : .22) * dt); b.vx *= f; b.vz *= f;
  if (G.state !== 'play') { // dentro la rete
    if (Math.abs(b.x) > HL + 1.9) { b.x = sgn(b.x) * (HL + 1.9); b.vx *= -.1; b.vz *= .5; }
    if (Math.abs(b.x) > HL && Math.abs(b.z) > GH - .3) { b.z = sgn(b.z) * (GH - .3); b.vz *= -.1; }
    if (Math.abs(b.x) > HL && b.y > GT - .3) { b.y = GT - .3; b.vy = 0; }
  }
}
function contacts(dt) {
  const b = G.ball, own = b.owner;
  if (!own) {
    const sp = hyp(b.vx, b.vz); let best = null, bd = 9;
    for (const p of all()) {
      if (p.cool > 0 || p.stun > 0 || p.st === 'down') continue;
      const d = hyp(p.x - b.x, p.z - b.z), gk = p.i === 0, inBox = Math.abs(p.x) > HL - 17 && Math.abs(p.z) < 20.5;
      const reach = gk && inBox ? (p.st === 'dive' ? 2.0 : 1.3) : (p.st === 'slide' ? 1.3 : 1.05), top = gk && inBox ? 2.7 : 1.55;
      if (d < reach && b.y < top && d < bd) { bd = d; best = p; }
    }
    if (!(best && best.i === 0) && b.y < AIR.top && sp < AIR.fast && (b.y >= AIR.low || (b.vy < -5 && b.y > 1))) { // pallone alto o che scende forte: chi ci arriva colpisce di testa
      let h = null, hd = 9;
      for (const p of all()) { if (p.i === 0 || p.cool > 0 || p.stun > 0 || p.st !== 'run') continue; const d = hyp(p.x - b.x, p.z - b.z) + rnd(.3); if (d < AIR.reach + .3 && d < hd) { hd = d; h = p; } }
      if (h) header(h);
      return;
    }
    if (!best) return; const p = best, gk = p.i === 0;
    if (gk && sp > 13 && G.lastKicker && G.lastKicker.team !== p.team) {
      if (p.saveId === G.shotId) return; p.saveId = G.shotId;
      const pr = ((p.team.human ? MATE.save : G.diff.save) - Math.max(0, sp - 22) * .012 + (p.st === 'dive' ? 0 : .08)) * (G.penId === G.shotId ? FOUL.penSave : 1);
      if (rnd() > pr) { p.cool = .6; return; }
      AU.kick(14); p.s.sv++; if (G.shooter && G.shooter.team !== p.team) { G.shooter.s.sot++; G.shooter = null; }
      if (sp < 21 || rnd() < .4) { if (p.st === 'run') azione(p, 'presa'); return gain(p); }
      b.vx = p.team.side * rnd(5, 9); b.vz = sgn(b.z - p.z || rnd(-1, 1)) * rnd(5, 10); b.vy = rnd(3, 6); G.lastTouch = p; p.cool = .5;
      if (rnd() < AIR.behind) { b.vx = -p.team.side * rnd(3, 6); b.vz = sgn(b.z - p.z || rnd(-1, 1)) * rnd(9, 13); } // deviata in angolo
      return;
    }
    if (sp > 19 && p !== G.intended && !gk) { // deviazione
      if (G.offs && G.offs.includes(p)) return offside(p);
      const nx = (b.x - p.x) / (bd || 1), nz = (b.z - p.z) / (bd || 1), dot = b.vx * nx + b.vz * nz;
      b.vx = (b.vx - 2 * dot * nx) * .35 + rnd(-1, 1); b.vz = (b.vz - 2 * dot * nz) * .35 + rnd(-1, 1); b.vy = rnd(1, 4); p.cool = .4; G.lastTouch = p; AU.kick(10); return;
    }
    return gain(p);
  }
  // contrasti
  if (own.shield > 0) return;
  const fx = Math.sin(own.dir), fz = Math.cos(own.dir);
  for (const d of own.team.opp.players) {
    if (d.stun > 0 || d.st === 'down' || d.cool > 0) continue;
    const dist = hyp(d.x - b.x, d.z - b.z), dBody = hyp(d.x - own.x, d.z - own.z);
    if (own.i === 0) continue;
    if (d.st === 'slide') {
      if (!d.hit && dist < 1.35) {
        d.hit = true; const back = ((d.x - own.x) * fx + (d.z - own.z) * fz) / (dBody || 1) < -.1;
        if (rnd() < FOUL.slide[back ? 1 : 0]) return foul(d, own, true, back);
        if (rnd() < .85) { b.owner = null; b.vx = Math.sin(d.dir) * 7 + rnd(-2, 2); b.vz = Math.cos(d.dir) * 7 + rnd(-2, 2); b.vy = 1.5; own.stun = DOWN.fall; own.cool = Math.max(.8, DOWN.fall); own.fallen = true; azione(own, 'caduta'); d.cool = .1; G.lastTouch = d; G.poss = d.team; G.offs = null; G.lastPass = null; d.s.tk++; AU.kick(9); return; }
      }
      continue;
    }
    if (dist < 1.15 || dBody < .95) {
      let r = userDrives(d) ? 2.6 : (d.team.human ? MATE.steal : G.diff.steal) * (d.i === 0 ? 1.6 : 1);
      const rel = ((d.x - own.x) * fx + (d.z - own.z) * fz) / (dBody || 1); if (rel < .2) r *= .3;
      if (d.i !== 0 && rnd() < FOUL.rate[rel < .2 ? 1 : 0] * dt) return foul(d, own, false, rel < .2); // spinta o trattenuta
      if (rnd() < r * dt) {
        if (rnd() < FOUL.stand[rel < .2 ? 1 : 0] * (d.i === 0 ? .5 : 1)) return foul(d, own, false, rel < .2);
        own.stun = .5; own.cool = .8; G.lastPass = null; gain(d); d.s.tk++; AU.kick(8); return;
      }
    }
  }
}
function bounds() {
  const b = G.ball; if (b.owner && b.owner.i === 0) return;
  if (Math.abs(b.x) > HL) {
    const e = sgn(b.x), az = Math.abs(b.z);
    if (az < GH + .28 && b.y < GT + .3 && (az > GH - .05 || b.y > GT - .05) && Math.abs(b.x) < HL + .8 && !b.owner) { // palo o traversa
      b.x = e * (HL - .15); b.vx *= -.55; b.vz += sgn(b.z) * 2; b.vy *= .6; AU.post(); return;
    }
    if (az < GH && b.y < GT) return goal(G.teams.find((t) => t.side === e));
    const def = G.teams.find((t) => t.side === -e);
    if (G.lastTouch && G.lastTouch.team === def) corner(def.opp, e * (HL - .6), sgn(b.z) * (HW - .6));
    else restart(def, e * (HL - 6), 0, 'Rimessa dal fondo', def.players[0]);
  } else if (Math.abs(b.z) > HW) {
    const t = G.lastTouch ? G.lastTouch.team.opp : G.teams[0];
    restart(t, clamp(b.x, -HL + 1.5, HL - 1.5), sgn(b.z) * (HW - .5), 'Rimessa laterale');
  }
}
function restart(team, x, z, label, taker) {
  const b = G.ball; b.owner = null; b.x = x; b.z = z; b.y = BR; b.vx = b.vy = b.vz = 0; G.charge = -1;
  G.fk = null; G.wait = 1.1; G.offs = null; G.noOff = true; G.pen = false; G.penWait = 0; for (const p of all()) p.fkShot = p.cornerKick = false;
  G.next = team; G.poss = team; G.intended = null; G.taker = taker || nearestTo(team, x, z);
  if (team.human) setCtrl(G.taker); else setCtrl(nearestTo(G.teams[0], x, z));
  setState('restart'); banner('', label, 900); AU.whistle();
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
// Calcio d'angolo: cinque attaccanti in area (primo palo, dischetto, secondo palo, limite), ognuno con un marcatore
function corner(team, x, z) {
  restart(team, x, z, "Calcio d'angolo"); G.wait = 2.5; G.stats.corners[team.idx]++;
  const s = team.side, e = sgn(z), pos = new Map(), slots = [[5.5, 3.2], [10.5, -.5], [7, -5.5], [13, 4], [18.5, -2]];
  const att = team.players.filter((p) => p.i && p !== G.taker).sort((a, c) => FORM[c.i][0] - FORM[a.i][0]).slice(0, 5);
  const def = team.opp.players.filter((p) => p.i).sort((a, c) => FORM[a.i][0] - FORM[c.i][0]).slice(0, 5);
  slots.forEach(([dx, dz], k) => { const px = s * (HL - dx), pz = e * dz; if (att[k]) pos.set(att[k], [px, pz]); if (def[k]) pos.set(def[k], [px + s * 1.2, pz * .85]); });
  G.fk = { corner: true, pos };
}
function penSpot(p) { // dove sta ciascuno durante un rigore
  const a = G.next.side;
  if (p.i === 0) return p.team === G.next ? [-a * (HL - 4), 0] : [a * (HL - .4), 0];
  return [a * (HL - 21 - (p.i % 3) * 1.3), (p.i - 5.5) * 3.6 + (p.team.idx ? 1.8 : 0)];
}
function penalty(team) {
  let k = null; for (const p of team.players) if (p.i && (!k || p.q > k.q)) k = p;
  restart(team, team.side * (HL - 11), 0, '', k); G.noOff = false; G.wait = 2.3; G.fk = { pen: true }; G.stats.pens[team.idx]++;
  banner('Rigore!', team.club.name, 1900);
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
function foul(d, own, sliding, behind) {
  const t = own.team, s = t.side, b = G.ball, x = own.x, z = own.z, dGoal = hyp(s * HL - x, z);
  G.stats.fouls[d.team.idx]++; b.owner = null; d.s.fl++; G.lastPass = null;
  own.stun = sliding ? DOWN.fall : .5; own.cool = Math.max(.8, own.stun); if (sliding) { own.fallen = true; azione(own, 'caduta'); }
  // chiara occasione da gol: nessun compagno di chi ha fatto fallo tra l'avversario e la porta
  const chance = dGoal < 32 && !d.team.players.some((o) => o.i && o !== d && (o.x - x) * s > 1 && Math.abs(o.z - z) < 14);
  let c = null;
  if (d.i !== 0 && d.team.players.length > 7) {
    if (chance && (sliding || behind)) c = 'r';
    else if (chance || rnd() < FOUL.yellow[sliding ? 1 : 0] * (behind ? 1.3 : 1)) c = d.yel ? 'r' : 'g';
  }
  const inBox = x * s > HL - 16.5 && Math.abs(z) < 20.2;
  if (inBox) penalty(t); else freeKick(t, x, z, 'Punizione', sliding ? own : null);
  if (c) { card(d, c === 'r'); banner(c === 'r' ? 'Espulso!' : (inBox ? 'Rigore!' : ''), `${c === 'r' ? 'Cartellino rosso' : 'Ammonito'} · ${d.name}`, 2300, c); G.wait += .8; }
  // dopo un'espulsione barriera e battitore vanno riscelti senza di lui
  if (c === 'r' && !inBox) { freeKick(t, x, z, '', sliding ? own : null); G.wait += .8; banner('Espulso!', `Cartellino rosso · ${d.name}`, 2300, 'r'); }
}
function goal(team) {
  team.score++; const lt = G.lastTouch; let k = G.lastKicker; if (!k || k.team !== team) k = lt && lt.team === team ? lt : null;
  const own = !k; G.scorer = own ? nearestTo(team, G.ball.x, G.ball.z) : k;
  const min = minute();
  const name = own ? `Autogol${lt ? ' (' + lt.name + ')' : ''}` : k.name;
  if (!own && G.headId === G.shotId && G.lastKicker === k) G.stats.headGoals[team.idx]++;
  if (own) { if (lt) lt.s.og++; } else { k.s.g++; if (G.shooter === k) { k.s.sot++; G.shooter = null; } if (k.by && k.by.team === team) k.by.s.a++; }
  G.goals.push({ t: team.idx, name, min }); G.next = team.opp; G.charge = -1;
  for (const p of team.players) if (p.i) { p.st = 'run'; }
  setState('goal'); banner('Gol!', `${name} ${min}' · ${team.club.name}`, 3400); AU.roar(); hud();
}

/* ------------------------------------------------------------------ animazione delle figure */
function startFx(f, name) {
  const a = f.mixer.clipAction(MODEL.fx[name]);
  if (f.old && f.old !== a) f.old.stop();
  f.old = f.act && f.act !== a ? f.act : null; f.oldW = f.old ? f.fxW : 0; f.fxW = 0;
  a.setLoop(T.LoopOnce, 1); a.clampWhenFinished = true; a.reset(); a.timeScale = FX[name].sp; a.play(); f.act = a;
}
function poseSkinned(p, dt) {
  const f = p.fig, v = hyp(p.vx, p.vz); f.root.position.set(p.x, 0, p.z); f.root.rotation.y = p.dir;
  if (G.dbgFx && hasFx(G.dbgFx.name)) { // per le prove: tutti fermi su un fotogramma di una clip
    for (const k in f.A) f.A[k].setEffectiveWeight(0); if (f.act) f.act.setEffectiveWeight(0);
    const a = f.mixer.clipAction(MODEL.fx[G.dbgFx.name]); if (f.dbg && f.dbg !== a) f.dbg.stop(); a.play(); a.paused = true; a.time = G.dbgFx.t; a.setEffectiveWeight(1); f.dbg = a; f.mixer.update(0); f.body.position.y = 0; return;
  } else if (f.dbg) { f.dbg.stop(); f.dbg = null; }
  // l'azione registrata in corso (tiro, scivolata, tuffo…)
  if (p.fxNew) { p.fxNew = false; startFx(f, p.fx); }
  let on = false;
  if (p.fx && f.act) {
    p.fxT += dt; const c = FX[p.fx], dur = f.act.getClip().duration / c.sp;
    if (p.fxT >= dur - .03) { if (c.next && hasFx(c.next)) { p.fx = c.next; p.fxT = 0; startFx(f, p.fx); on = true; } else p.fx = null; }
    else on = p.fxT < (c.cut || dur - .12);
  }
  f.fxW += ((on ? 1 : 0) - f.fxW) * Math.min(1, dt * (on ? 16 : 6)); f.oldW += (0 - f.oldW) * Math.min(1, dt * 9);
  if (f.act) { f.act.setEffectiveWeight(f.fxW); if (!p.fx && f.fxW < .02) { f.act.stop(); f.act = null; f.fxW = 0; } }
  if (f.old) { f.old.setEffectiveWeight(f.oldW); if (f.oldW < .02) { f.old.stop(); f.old = null; f.oldW = 0; } }
  // attesa, camminata, corsetta e corsa secondo la velocità; esultanza dopo un gol
  const tg = { idle: 0, walk: 0, run: 0, jog: 0, gkIdle: 0, esulta: 0 }; let by = 0;
  const festa = G.state === 'goal' && G.scorer && p.team === G.scorer.team && p.i !== 0 && v < 5 && f.fxW < .25;
  if (festa && f.A.esulta) { tg.esulta = 1; by = Math.abs(Math.sin(G.t * 7 + p.i)) * .3; }
  else if (f.A.jog) { const m = clamp(v / 1.2, 0, 1), r = clamp((v - 6.4) / 1.8, 0, 1), j = clamp((v - 2) / 1.8, 0, 1) * (1 - r); tg.run = m * r; tg.jog = m * j; tg.walk = m * (1 - r - j); tg.idle = 1 - m; }
  else { tg.run = clamp((v - 2.6) / 2.6, 0, 1); tg.walk = clamp(v / 2.2, 0, 1) * (1 - tg.run); tg.idle = 1 - tg.run - tg.walk; }
  if (f.A.gkIdle && G.state === 'play') { tg.gkIdle = tg.idle; tg.idle = 0; }
  const a = Math.min(1, dt * 10), rest = Math.max(0, 1 - f.fxW - f.oldW);
  for (const k in f.A) { f.w[k] += (tg[k] - f.w[k]) * a; f.A[k].setEffectiveWeight(f.w[k] * rest); }
  f.A.run.timeScale = clamp(v / 6.6, .8, 1.5); f.A.walk.timeScale = clamp(v / 1.9, .7, 1.7); if (f.A.jog) f.A.jog.timeScale = clamp(v / 4.1, .8, 1.5);
  f.mixer.update(dt); f.body.position.y = by;
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

/* ------------------------------------------------------------------ camera e disegno */
function updateCamera(dt) {
  const b = G.ball; let fx = 0, fz = 0;
  if (b) { fx = b.x; fz = b.z; if (G.state === 'goal' && G.scorer && G.stateT > .9) { fx = G.scorer.x; fz = G.scorer.z; } }
  let px, py, pz, lx, lz, fov;
  if (G.dbgCam) { cam.position.set(G.dbgCam[0], G.dbgCam[1], G.dbgCam[2]); cam.lookAt(G.dbgCam[3], G.dbgCam[4], G.dbgCam[5]); cam.fov = G.dbgCam[6] || 30; cam.updateProjectionMatrix(); return; }
  if (G.state === 'menu') { const a = G.t * .07; px = Math.sin(a) * 74; pz = Math.cos(a) * 62; py = 30; lx = 0; lz = 0; fov = G.portrait ? 62 : 40; }
  else if (!G.portrait) {
    const close = G.state === 'goal' && G.stateT > .9; lx = clamp(fx, -39, 39); lz = fz * .55; px = lx * .96; pz = lz + (close ? 26 : 39); py = close ? 13 : 25; fov = 36;
    if (cam.aspect < 1.5) { py += 8; pz += 10; }
  } else { const close = G.state === 'goal' && G.stateT > .9; lx = fx + (close ? 0 : 7); lz = fz * .8; px = fx - (close ? 18 : 23); pz = fz * .8; py = close ? 15 : 33; fov = 58; }
  const k = 1 - Math.exp(-(G.state === 'menu' ? 2 : 4.2) * dt);
  camPos.x += (px - camPos.x) * k; camPos.y += (py - camPos.y) * k; camPos.z += (pz - camPos.z) * k;
  camLook.x += (lx - camLook.x) * k; camLook.z += (lz - camLook.z) * k;
  cam.position.copy(camPos); cam.lookAt(camLook.x, 1, camLook.z);
  if (Math.abs(cam.fov - fov) > .01) { cam.fov += (fov - cam.fov) * Math.min(1, dt * 3); cam.updateProjectionMatrix(); }
}
function draw(dt) {
  const b = G.ball;
  if (b) {
    for (const p of all()) pose(p, dt);
    const sp = hyp(b.vx, b.vz);
    ballMesh.position.set(b.x, b.y, b.z); if (sp > .3) { ballMesh.rotation.z -= b.vx * dt / BR * .6; ballMesh.rotation.x += b.vz * dt / BR * .6; }
    ballShadow.position.set(b.x, .04, b.z); ballShadow.scale.setScalar(1 + b.y * .18);
    const c = G.ctrl; ring.visible = arrow.visible = !!c && !G.auto && G.state !== 'full';
    if (c) { ring.position.set(c.x, .05, c.z); arrow.position.set(c.x, 3.35 + Math.sin(G.t * 6) * .08, c.z); }
  }
  updateCamera(dt); renderer.render(scene, cam);
}

/* ------------------------------------------------------------------ HUD */
let bannerT = 0;
function banner(t, s, ms, c) { const el = $('#banner'); el.dataset.c = c || ''; el.querySelector('.t').textContent = t; el.querySelector('.s').textContent = s || ''; el.classList.add('su'); clearTimeout(bannerT); bannerT = setTimeout(() => el.classList.remove('su'), ms); }
let lastClock = '', lastChi = null, lastAtt = null;
function hud() {
  if (!G.teams.length) return;
  $('#sbS').textContent = `${G.teams[0].score} - ${G.teams[1].score}`;
  const m = ((G.half - 1) + Math.min(1, G.clock / HALF_SECS)) * 45, txt = `${String(Math.floor(m)).padStart(2, '0')}:${String(Math.floor(m % 1 * 60)).padStart(2, '0')}`;
  if (txt !== lastClock) { $('#sbT').textContent = txt; lastClock = txt; }
  if (G.ctrl !== lastChi) { lastChi = G.ctrl; $('#chi').innerHTML = G.ctrl ? `<i>${G.ctrl.num}</i>${G.ctrl.name.replace(/[<>&]/g, '')}` : ''; }
  const att = !!(G.ball && G.ctrl && G.ball.owner === G.ctrl);
  if (att !== lastAtt) { lastAtt = att; $('#bA').textContent = att ? 'Passa' : 'Cambia'; $('#bB').textContent = att ? 'Tira' : 'Scivolata'; $('#bB').style.fontSize = att ? '' : '12px'; $('#bD').classList.toggle('nas', !att); }
  if (G.ctrl) $('#en').firstElementChild.style.width = `${G.ctrl.en * 100}%`;
  const pw = $('#pow'); pw.style.opacity = G.charge >= 0 ? 1 : 0; if (G.charge >= 0) pw.firstElementChild.style.width = `${clamp(G.charge / .8, 0, 1) * 100}%`;
}
const radar = $('#radar'), rx = radar.getContext('2d');
function drawRadar() {
  const w = radar.width, h = radar.height, P = G.portrait; rx.clearRect(0, 0, w, h);
  rx.fillStyle = 'rgba(10,10,12,.62)'; rx.fillRect(0, 0, w, h); rx.strokeStyle = 'rgba(255,255,255,.45)'; rx.lineWidth = 2; rx.strokeRect(5, 5, w - 10, h - 10);
  rx.beginPath(); rx.moveTo(w / 2, 5); rx.lineTo(w / 2, h - 5); rx.stroke();
  const X = (x) => 5 + (x + HL) / (HL * 2) * (w - 10), Z = (z) => 5 + (z + HW) / (HW * 2) * (h - 10);
  for (const t of G.teams) for (const p of t.players) { rx.fillStyle = p === G.ctrl ? '#D9F51F' : (t.idx ? '#ff5a5a' : '#ffffff'); rx.beginPath(); rx.arc(X(p.x), Z(p.z), p === G.ctrl ? 6 : 4.4, 0, 7); rx.fill(); }
  rx.fillStyle = '#ffb300'; rx.beginPath(); rx.arc(X(G.ball.x), Z(G.ball.z), 3.6, 0, 7); rx.fill();
  radar.style.transform = P ? 'translateX(-50%)' : 'translateX(-50%)';
}

/* ------------------------------------------------------------------ audio (sintetizzato) */
const AU = {
  ctx: null, on: true, crowd: null,
  init() {
    if (this.ctx) { this.ctx.resume && this.ctx.resume(); return; }
    try {
      const C = window.AudioContext || window.webkitAudioContext; const x = this.ctx = new C();
      const buf = x.createBuffer(1, x.sampleRate * 2, x.sampleRate), d = buf.getChannelData(0); let l = 0;
      for (let i = 0; i < d.length; i++) { l = l * .985 + (Math.random() * 2 - 1) * .12; d[i] = l; }
      this.noise = buf; this.master = x.createGain(); this.master.gain.value = this.on ? 1 : 0; this.master.connect(x.destination);
      const src = x.createBufferSource(); src.buffer = buf; src.loop = true; const f = x.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 700; f.Q.value = .4;
      this.crowd = x.createGain(); this.crowd.gain.value = 0; src.connect(f); f.connect(this.crowd); this.crowd.connect(this.master); src.start();
    } catch (e) { this.ctx = null; }
  },
  amb(v) { if (this.ctx) this.crowd.gain.setTargetAtTime(v, this.ctx.currentTime, .4); },
  tone(fr, dur, type, vol, slide) {
    if (!this.ctx) return; const x = this.ctx, o = x.createOscillator(), g = x.createGain(); o.type = type; o.frequency.value = fr;
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, x.currentTime + dur);
    g.gain.value = vol; g.gain.exponentialRampToValueAtTime(.001, x.currentTime + dur); o.connect(g); g.connect(this.master); o.start(); o.stop(x.currentTime + dur);
  },
  kick(sp) { this.tone(150, .09, 'sine', clamp(sp / 40, .15, .6), 55); },
  post() { this.tone(900, .25, 'triangle', .35, 600); },
  whistle(n = 1) { for (let i = 0; i < n; i++) setTimeout(() => { this.tone(2350, .28, 'square', .07); this.tone(2420, .28, 'square', .05); }, i * 380); },
  roar() { if (!this.ctx) return; const t = this.ctx.currentTime; this.crowd.gain.cancelScheduledValues(t); this.crowd.gain.setTargetAtTime(1.6, t, .12); this.crowd.gain.setTargetAtTime(.35, t + 2.6, .9); },
  toggle() { this.on = !this.on; if (this.ctx) this.master.gain.value = this.on ? 1 : 0; $('#audio').style.opacity = this.on ? 1 : .4; },
};

/* ------------------------------------------------------------------ comandi */
function bindInput() {
  const zona = $('#stickZona'), stick = $('#stick'), knob = stick.firstElementChild; let sid = null, ox = 0, oy = 0; const R = 50;
  const place = (x, y) => { const r = zona.getBoundingClientRect(); stick.style.left = `${x - r.left - 56}px`; stick.style.top = `${y - r.top - 56}px`; stick.style.bottom = 'auto'; };
  zona.addEventListener('pointerdown', (e) => { if (sid !== null) return; sid = e.pointerId; zona.setPointerCapture(sid); ox = e.clientX; oy = e.clientY; place(ox, oy); e.preventDefault(); });
  zona.addEventListener('pointermove', (e) => {
    if (e.pointerId !== sid) return; let dx = e.clientX - ox, dy = e.clientY - oy; const l = hyp(dx, dy);
    if (l > R) { dx *= R / l; dy *= R / l; } G.in.jx = dx / R; G.in.jy = dy / R; knob.style.transform = `translate(${dx}px,${dy}px)`;
  });
  const end = (e) => { if (e.pointerId !== sid) return; sid = null; G.in.jx = G.in.jy = 0; knob.style.transform = ''; };
  zona.addEventListener('pointerup', end); zona.addEventListener('pointercancel', end);
  const btn = (id, down, up) => {
    const el = $(id);
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); el.setPointerCapture(e.pointerId); el.classList.add('giu'); down(); });
    const u = () => { el.classList.remove('giu'); up && up(); }; el.addEventListener('pointerup', u); el.addEventListener('pointercancel', u);
  };
  btn('#bA', pressA); btn('#bD', pressD); btn('#bB', () => pressB(true), () => pressB(false)); btn('#bC', () => { G.in.sprint = true; }, () => { G.in.sprint = false; });
  const keys = new Set();
  const axis = () => { G.in.jx = (keys.has('ArrowRight') || keys.has('d') ? 1 : 0) - (keys.has('ArrowLeft') || keys.has('a') ? 1 : 0); G.in.jy = (keys.has('ArrowDown') || keys.has('s') ? 1 : 0) - (keys.has('ArrowUp') || keys.has('w') ? 1 : 0); };
  window.addEventListener('keydown', (e) => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; if (e.repeat) return;
    if (k.startsWith('Arrow') || k === ' ') e.preventDefault();
    keys.add(k); axis();
    if (k === 'x' || k === 'k') pressA(); else if (k === 'c' || k === 'i') pressD(); else if (k === ' ' || k === 'j') pressB(true); else if (k === 'Shift' || k === 'l') G.in.sprint = true; else if (k === 'p' || k === 'Escape') pause(!G.paused);
  });
  window.addEventListener('keyup', (e) => { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; keys.delete(k); axis(); if (k === ' ' || k === 'j') pressB(false); else if (k === 'Shift' || k === 'l') G.in.sprint = false; });
  window.addEventListener('contextmenu', (e) => e.preventDefault());
}

/* ------------------------------------------------------------------ schermate */
const show = (id) => { for (const s of ['#home', '#scelta', '#vs', '#stop', '#fine']) $(s).classList.toggle('nas', s !== id); };
const sel = { mia: null, loro: null, diff: 'normale' };
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
  $('#diff').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; sel.diff = b.dataset.d; for (const x of $('#diff').children) x.classList.toggle('on', x === b); });
  $('#vai').onclick = () => { AU.init(); show('#scelta'); refresh(); };
  $('#indietro').onclick = () => show('#home');
  $('#inizio').onclick = () => startMatch(sel.mia, sel.loro, sel.diff);
  $('#pausa').onclick = () => pause(true); $('#riprendi').onclick = () => pause(false);
  $('#esci').onclick = () => { G.paused = false; toMenu(); };
  $('#audio').onclick = () => AU.toggle();
  $('#rivincita').onclick = () => startMatch(sel.mia, sel.loro, sel.diff);
  $('#cambia').onclick = () => { toMenu(); show('#scelta'); };
}
const club = (id) => CLUBS.find((c) => c.id === id);
function startMatch(h, a, d) {
  AU.init(); G.diff = DIFF[d] || DIFF.normale; G.shown = false; G.paused = false; G.auto = false;
  const H = club(h), A = club(a);
  $('#vsH').src = img(H.id); $('#vsA').src = img(A.id); $('#vsHn').textContent = H.name; $('#vsAn').textContent = A.name;
  show('#vs'); $('#hud').classList.add('nas'); G.state = 'menu';
  setTimeout(() => { show(null); $('#hud').classList.remove('nas'); newMatch(H, A); AU.amb(.35); }, 1900);
}
function pause(v) { if (G.state === 'menu' || G.state === 'full') return; G.paused = v; show(v ? '#stop' : null); AU.amb(v ? 0 : .35); }
function toMenu() { G.state = 'menu'; clearMatch(); G.ball = null; G.ctrl = null; ballMesh.visible = ballShadow.visible = ring.visible = arrow.visible = false; $('#hud').classList.add('nas'); show('#home'); AU.amb(0); }
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
  $('#marc').textContent = G.goals.map((g) => `${g.name} ${g.min}' (${G.teams[g.t].club.short})`).join(' · ');
  const tot = G.stats.poss[0] + G.stats.poss[1] || 1, ph = Math.round(G.stats.poss[0] / tot * 100);
  $('#cart').innerHTML = G.cards.map((c) => `<span><i class="${c.c}"></i>${c.name.replace(/[<>&]/g, '')} ${c.min}' (${G.teams[c.t].club.short})</span>`).join('');
  $('#flH').textContent = G.stats.fouls[0]; $('#flA').textContent = G.stats.fouls[1]; $('#fgH').textContent = G.stats.offs[0]; $('#fgA').textContent = G.stats.offs[1];
  const esc = (n) => n.replace(/[<>&]/g, ''), fmt = (v) => String(v).replace('.', ',');
  const rows = G.teams.map((t) => t.players.concat(t.off).sort((p, q) => p.i - q.i).map((p) => ({ p, v: vote(p) })));
  const best = rows.flat().sort((x, y) => y.v - x.v || y.p.s.g - x.p.s.g || y.p.s.a - x.p.s.a)[0];
  $('#mvp').innerHTML = `Migliore in campo <b>${esc(best.p.name)}</b> (${best.p.team.club.short}) <b>${fmt(best.v)}</b>`;
  $('#pagL').innerHTML = rows.map((r, k) => `<div><h4>${G.teams[k].club.short}</h4>${r.map(({ p, v }) => `<p><b>${fmt(v)}</b> ${esc(p.name)}${p.s.g ? ` <u>${p.s.g > 1 ? p.s.g + ' gol' : 'gol'}</u>` : ''}${p.s.a ? ' <u>assist</u>' : ''}${p.red ? '<i class="r"></i>' : p.yel ? '<i class="g"></i>' : ''}</p>`).join('')}</div>`).join('');
  $('#tH').textContent = G.stats.shots[0]; $('#tA').textContent = G.stats.shots[1]; $('#pH').textContent = `${ph}%`; $('#pA').textContent = `${100 - ph}%`;
  $('#fTito').src = img(w ? 'saluta' : l ? 'braccia' : 'indica');
  $('#hud').classList.add('nas'); show('#fine'); AU.amb(0);
}

/* ------------------------------------------------------------------ avvio */
function resize() {
  const w = window.innerWidth, h = window.innerHeight; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); G.portrait = h > w * 1.05;
}
const CREST = {};
function loadImg(src) { return new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }); }
let last = 0, frame = 0;
function loop(ts) {
  requestAnimationFrame(loop);
  const dt = Math.min(.05, (ts - last) / 1000 || 0); last = ts;
  if (!G.paused) { if (G.state === 'menu') G.t += dt; else { const n = dt > .022 ? 2 : 1; for (let i = 0; i < n; i++) step(dt / n); } }
  if (G.ball && G.state !== 'menu') { hud(); if (frame++ % 3 === 0) drawRadar(); }
  draw(G.paused ? 0 : dt);
}
async function boot() {
  resize(); window.addEventListener('resize', resize);
  buildPitch(); await loadModel();
  try { await Promise.race([document.fonts.load('40px Anton'), new Promise((r) => setTimeout(r, 2500))]); } catch (e) { /* si disegna col font di sistema */ }
  const lock = await loadImg('img/corona-lime.png');
  buildStadium(lock); paintBoards(CLUBS[0], CLUBS[1], null);
  buildMenu(); bindInput();
  Promise.all(CLUBS.map((c) => loadImg(img(c.id + '-mini')).then((i) => { CREST[c.id] = i; }))).then(() => { if (G.teams.length) paintBoards(G.teams[0].club, G.teams[1].club, CREST); });
  $('#carica').remove(); show('#home'); requestAnimationFrame(loop);
}
window.__g = { G, step, draw, startMatch, newMatch, club, DIFF, MATE, RUN, DEF, FOUL, TIRE, VOTE, AIR, vote, cross, corner, header, penalty, freeKick, foul, pass, gain, pressA, pressB, pressD, model: () => MODEL };
boot();
})();
