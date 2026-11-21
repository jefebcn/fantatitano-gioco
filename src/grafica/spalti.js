/* Gli spalti: gradoni in cemento (texture CC0 di ambientCG in public/textures/stadium, o cemento disegnato al momento),
   scale di accesso, muretti, ringhiere, tunnel d'ingresso, striscioni e bandiere coi colori delle due squadre, e la folla.

   La folla sono migliaia di persone (il modello dei calciatori, in piedi e semplificato): due InstancedMesh per tribuna,
   prime file dettagliate e il resto leggero, e la tribuna alle spalle della telecamera viene scartata intera.
   Ogni tifoso ha un colore (della sua squadra, o un po' di neutri) e una fase sua; ondeggia e salta alzando le braccia
   nello shader, senza calcoli per tifoso sul processore: da qui si cambiano solo due numeri (quanto esulta ogni settore). */

import { unisci } from './unisci.js';
import { TIFOSO } from './tifoso-dati.js';

const RIS = 'textures/stadium/';
const hyp = Math.hypot;
// gradoni: quante file, quanto profonda e quanto alta ogni fila, altezza del muretto davanti
export const GRADONI = { file: 20, prof: 0.85, alt: 0.5, muro: 1.6, posto: 0.78, scale: 16 };
// Lo stadio chiuso come in Dream League (una conca): i lati lunghi arrivano fino agli angoli (le curve ci si appoggiano,
// niente buchi) e hanno un secondo anello (`sopra`: file, quota del muretto, quanto sta indietro rispetto al primo). Il tetto
// è alla stessa quota su tutti e quattro i lati, arriva fino a `sporge` metri dal muretto (negativo: copre solo la parte
// alta, come una pensilina), con travi a sbalzo ogni `trave` metri e i fari sul bordo
export const CONCA = { sopra: { file: 14, y: 15, z: -13 }, tetto: { y: 29, sporge: -7, spessore: 0.5, trave: 12 } };

function cementoDiRiserva(T) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  x.fillStyle = '#b9b6b0'; x.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 2500; i++) { const v = 150 + Math.random() * 60; x.fillStyle = `rgba(${v},${v},${v - 4},.35)`; x.fillRect(Math.random() * 128, Math.random() * 128, 1 + Math.random() * 2, 1 + Math.random() * 2); }
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
}

/** I gradoni di una tribuna lunga `len` (coordinate locali: x lungo la tribuna, z verso il dietro negativo, y in alto). */
function geometriaGradoni(T, len, file = GRADONI.file) {
  const G = { ...GRADONI, file }, pos = [], uv = [], nor = [], idx = [];
  const quad = (a, b, c, d, n) => {
    // giro dei vertici coerente con la normale (altrimenti la faccia viene scartata vista dal lato giusto)
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]], cr = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    if (cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2] < 0) [b, d] = [d, b];
    const k = pos.length / 3; for (const p of [a, b, c, d]) { pos.push(...p); nor.push(...n); uv.push((p[0] + p[2] * 0.3) / 4, (p[1] - p[2]) / 4); } idx.push(k, k + 1, k + 2, k, k + 2, k + 3); };
  const L = len / 2;
  quad([-L, 0, 0.01], [L, 0, 0.01], [L, G.muro, 0.01], [-L, G.muro, 0.01], [0, 0, 1]); // muretto davanti
  for (let r = 0; r < G.file; r++) {
    const y = G.muro + r * G.alt, z0 = -r * G.prof, z1 = -(r + 1) * G.prof;
    quad([-L, y, z0], [-L, y, z1], [L, y, z1], [L, y, z0], [0, 1, 0]); // pedata
    if (r < G.file - 1) quad([-L, y, z1], [-L, y + G.alt, z1], [L, y + G.alt, z1], [L, y, z1], [0, 0, 1]); // alzata
  }
  const yt = G.muro + (G.file - 1) * G.alt, zt = -G.file * G.prof;
  quad([L, 0, zt], [-L, 0, zt], [-L, yt + 2.5, zt], [L, yt + 2.5, zt], [0, 0, -1]); // muro di fondo
  for (const s of [-1, 1]) quad([s * L, 0, 0], [s * L, 0, zt], [s * L, yt + 2.5, zt], [s * L, G.muro, 0], [s, 0, 0]); // fianchi
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  return g;
}

// colori a caso ma sempre uguali (dal seme)
function casuale(seme) { let s = seme >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

export function creaSpalti(T, scene, { HL, HW, max = 18000, renderer = null }) {
  const loader = new T.TextureLoader(), materiali = [];
  // tribune scure, come uno stadio ripreso in TV di sera: il pubblico e il campo risaltano
  const cemento = new T.MeshStandardMaterial({ color: 0x8b8882, roughness: 0.95, metalness: 0, map: cementoDiRiserva(T) });
  const scaleM = new T.MeshStandardMaterial({ color: 0xa39d90, roughness: 0.9, metalness: 0 });
  loader.load(RIS + 'concrete_albedo.webp', (t) => { t.wrapS = t.wrapT = T.RepeatWrapping; t.colorSpace = T.SRGBColorSpace; cemento.map = t; scaleM.map = t; cemento.needsUpdate = scaleM.needsUpdate = true; });
  loader.load(RIS + 'concrete_roughness.webp', (t) => { t.wrapS = t.wrapT = T.RepeatWrapping; cemento.roughnessMap = t; cemento.needsUpdate = true; });
  materiali.push(cemento, scaleM);
  const ferro = new T.MeshStandardMaterial({ color: 0x9aa3b2, metalness: 0.7, roughness: 0.35 });
  const tetto = new T.MeshStandardMaterial({ color: 0x2b3245, roughness: 0.6, metalness: 0.3 });
  // le quattro tribune: posizione, lunghezza e rotazione. Il settore 1 è quello degli ospiti, la curva dalla parte delle x positive.
  // I lati lunghi vanno da un angolo all'altro (fino al fondo delle curve) e hanno il secondo anello: la conca è chiusa
  const fondoCurva = HL + 8.5 + GRADONI.file * GRADONI.prof, C = CONCA;
  const tribune = [
    { len: fondoCurva * 2, x: 0, z: -(HW + 6.5), ry: 0, settore: 0, tunnel: true, sopra: true },
    { len: fondoCurva * 2, x: 0, z: HW + 6.5, ry: Math.PI, settore: 0, sopra: true }, // alle spalle della telecamera di gioco: la folla qui non si disegna (vedi sotto)
    { len: HW * 2 + 13, x: HL + 8.5, z: 0, ry: -Math.PI / 2, settore: 1 },
    { len: HW * 2 + 13, x: -(HL + 8.5), z: 0, ry: Math.PI / 2, settore: 0 },
  ];
  const fascia = new T.MeshStandardMaterial({ color: 0x1d2540, roughness: 0.7, metalness: 0.2 }); // la fronte del secondo anello
  const acciaio = new T.MeshStandardMaterial({ color: 0xb8c0cc, metalness: 0.75, roughness: 0.35 }); // travi del tetto, a vista
  const G = GRADONI, posti = [], striscioni = [], bandiere = [];
  for (const tr of tribune) {
    const g = new T.Group(); g.position.set(tr.x, 0, tr.z); g.rotation.y = tr.ry; scene.add(g); tr.g = g;
    g.add(new T.Mesh(geometriaGradoni(T, tr.len), cemento));
    // secondo anello: gli stessi gradoni più in alto e più indietro, con la fronte scura
    const S = C.sopra;
    if (tr.sopra) {
      const su = new T.Mesh(geometriaGradoni(T, tr.len, S.file), cemento); su.position.set(0, S.y, S.z); g.add(su);
      const fr = new T.Mesh(new T.BoxGeometry(tr.len, 2.4, 0.5), fascia); fr.position.set(0, S.y + 0.4, S.z + 0.3); g.add(fr);
    }
    // tetto alla stessa quota su tutti i lati, dal fondo della tribuna fino a poco oltre il muretto, con le travi a sbalzo a vista
    const fondo = tr.sopra ? S.z - S.file * G.prof : -G.file * G.prof, Tt = C.tetto, prof = Tt.sporge - fondo;
    const cop = new T.Mesh(new T.BoxGeometry(tr.len, Tt.spessore, prof), tetto); cop.position.set(0, Tt.y, fondo + prof / 2); g.add(cop);
    const nT = Math.max(2, Math.round(tr.len / Tt.trave));
    for (let k = 0; k <= nT; k++) {
      const x = -tr.len / 2 + k * tr.len / nT;
      const trave = new T.Mesh(new T.BoxGeometry(0.35, 1.2, prof), acciaio); trave.position.set(x, Tt.y - 0.85, fondo + prof / 2); g.add(trave);
      const pil = new T.Mesh(new T.BoxGeometry(0.6, Tt.y, 0.6), acciaio); pil.position.set(x, Tt.y / 2, fondo - 0.4); g.add(pil);
      const tir = new T.Mesh(new T.BoxGeometry(0.15, 0.15, Math.hypot(prof * 0.7, 6)), acciaio); tir.position.set(x, Tt.y + 3, fondo + prof * 0.35); tir.rotation.x = Math.atan2(6, prof * 0.7); g.add(tir); // tirante
      const ant = new T.Mesh(new T.BoxGeometry(0.4, 6, 0.4), acciaio); ant.position.set(x, Tt.y + 3, fondo - 0.4); g.add(ant); // antenna del tirante
    }
    const bordo = new T.Mesh(new T.BoxGeometry(tr.len, 1.4, 0.5), acciaio); bordo.position.set(0, Tt.y - 0.5, Tt.sporge); g.add(bordo); // trave di bordo
    // scale di accesso: ogni GRADONI.scale metri una fascia di gradini più chiari, senza posti
    const nS = Math.floor(tr.len / G.scale), scaleX = [];
    for (let k = 1; k < nS; k++) scaleX.push(-tr.len / 2 + k * tr.len / nS);
    const scalino = new T.BoxGeometry(1.4, G.alt / 2, G.prof / 2), sc = new T.InstancedMesh(scalino, scaleM, scaleX.length * G.file * 2), m4 = new T.Matrix4(); let n = 0;
    for (const sx of scaleX) for (let r = 0; r < G.file; r++) for (const h of [0, 1]) { m4.makeTranslation(sx, G.muro + r * G.alt + G.alt * (h ? 0.5 : 0) + G.alt / 4 - (h ? 0 : 0), -r * G.prof - G.prof * (h ? 0.75 : 0.25)); sc.setMatrixAt(n++, m4); }
    g.add(sc);
    // ringhiera sul muretto: montanti e due corrimano
    const nP = Math.floor(tr.len / 2.5), mont = new T.InstancedMesh(new T.CylinderGeometry(0.035, 0.035, 1, 6), ferro, nP + 1);
    for (let k = 0; k <= nP; k++) { m4.makeTranslation(-tr.len / 2 + k * tr.len / nP, G.muro + 0.5, 0.05); mont.setMatrixAt(k, m4); }
    g.add(mont);
    for (const hy of [0.55, 1]) { const c = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, tr.len, 6), ferro); c.rotation.z = Math.PI / 2; c.position.set(0, G.muro + hy, 0.05); g.add(c); }
    // tunnel d'ingresso al campo, sotto la tribuna principale
    if (tr.tunnel) {
      const bocca = new T.Mesh(new T.BoxGeometry(4.6, 2.9, 0.4), new T.MeshBasicMaterial({ color: 0x07080c })); bocca.position.set(0, 1.45, 0.05); g.add(bocca);
      for (const s of [-1, 1]) { const m = new T.Mesh(new T.BoxGeometry(0.4, 3.1, 3.2), cemento); m.position.set(s * 2.5, 1.55, 1.6); g.add(m); }
      const cop = new T.Mesh(new T.CylinderGeometry(2.7, 2.7, 3.2, 20, 1, true, -Math.PI / 2, Math.PI), new T.MeshStandardMaterial({ color: 0x4B06FC, roughness: 0.5, side: T.DoubleSide })); cop.rotation.x = Math.PI / 2; cop.position.set(0, 3.1, 1.6); cop.scale.set(1, 1, 0.45); g.add(cop); tr.copertura = cop;
    }
    // posti a sedere (tranne scale e tunnel)
    for (let r = 0; r < G.file; r++) for (let x = -tr.len / 2 + 0.8; x < tr.len / 2 - 0.8; x += G.posto) {
      if (scaleX.some((sx) => Math.abs(x - sx) < 1.1) || (tr.tunnel && r < 6 && Math.abs(x) < 3.4)) continue;
      const p = new T.Vector3(x, G.muro + r * G.alt, -r * G.prof - G.prof * 0.45).applyMatrix4(g.matrixWorld.compose(g.position, g.quaternion, g.scale));
      posti.push({ p, ry: tr.ry, settore: tr.settore, tr, fila: r });
    }
    if (tr.sopra) for (let r = 0; r < S.file; r++) for (let x = -tr.len / 2 + 0.8; x < tr.len / 2 - 0.8; x += G.posto) { // il secondo anello (sempre sagome: è lontano)
      if (scaleX.some((sx) => Math.abs(x - sx) < 1.1)) continue;
      const p = new T.Vector3(x, S.y + G.muro + r * G.alt, S.z - r * G.prof - G.prof * 0.45).applyMatrix4(g.matrixWorld.compose(g.position, g.quaternion, g.scale));
      posti.push({ p, ry: tr.ry, settore: tr.settore, tr, fila: G.file + r });
    }
    // striscioni sul muretto e bandiere sui gradoni
    for (let k = 0; k < 3; k++) {
      const c = document.createElement('canvas'); c.width = 512; c.height = 96; const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace;
      const s = new T.Mesh(new T.PlaneGeometry(7, 1.3), new T.MeshStandardMaterial({ map: tex, roughness: 0.85 })); s.position.set((k - 1) * tr.len * 0.28 + (tr.tunnel ? 9 : 0), G.muro - 0.75, 0.04); g.add(s);
      striscioni.push({ c, tex, settore: tr.settore, k });
    }
    for (let k = 0; k < 2; k++) {
      const pg = new T.PlaneGeometry(2.2, 1.4, 10, 1), f = new T.Mesh(pg, new T.MeshStandardMaterial({ color: 0xffffff, side: T.DoubleSide, roughness: 0.9, vertexColors: true }));
      pg.setAttribute('color', new T.Float32BufferAttribute(new Float32Array(pg.attributes.position.count * 3).fill(1), 3));
      const asta = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 3.2, 6), ferro), r = 6 + k * 7, x = (k ? 0.22 : -0.3) * tr.len;
      asta.position.set(x, G.muro + r * G.alt + 1.6, -r * G.prof); f.position.set(x + 1.1, G.muro + r * G.alt + 2.5, -r * G.prof); g.add(asta, f);
      bandiere.push({ f, pg, settore: tr.settore, fase: Math.random() * 6 });
    }
    unisci(T, g, [cemento, ferro, tetto, fascia, acciaio]); // gradoni e muri, corrimano e aste, tetto, travi: una mesh per materiale
  }
  // ---------------------------------------------------------------- la folla
  // Una folla per tribuna (una InstancedMesh), ognuna con la sua sfera d'ingombro: quella alle
  // spalle della telecamera non si disegna affatto. I posti sono in ordine sparso, così i primi n sono sparsi su tutto lo spalto.
  const rand = casuale(20261118), totale = Math.min(max, posti.length);
  // Il tifoso è una persona vera: il modello dei calciatori messo in piedi e semplificato (scripts/tifoso.mjs, circa 170
  // vertici). In 3D nelle prime due file, dietro è una sagoma (vedi sagome più sotto), cioè la stessa persona fotografata in
  // tre pose e colorata coi suoi colori, due triangoli. Ogni vertice del 3D sa che cos'è: 0 maglia, 1 pelle, 2 braccio,
  // 3 avambraccio, 4 capelli o berretto, 5 visiera, 6 sciarpa, 7 pantaloni, 8 scarpe. Visiera e sciarpa sono due pannelli.
  const H = 1.72, FILE_VICINE = 2, SP = TIFOSO.spalla.map((v) => v * H), GOM = TIFOSO.gomito[1] * H;
  const MANI_SU = SP[1] + Math.hypot(...TIFOSO.mano.map((v, i) => (v - TIFOSO.spalla[i]) * H)); // dove arrivano le mani con le braccia alzate
  const tifoso = () => {
    const L = TIFOSO.lod[0], pos = L.p.map((v) => v / 1000 * H), parte = L.c.slice(), idx = L.i.slice();
    // pannelli piatti di due triangoli: quadro(larghezza, altezza, centro, orizzontale o verticale verso il campo)
    const quadro = (w, h, cx, cy, cz, pt, piano) => { const o = pos.length / 3; for (const [a, c] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { pos.push(cx + a * w / 2, piano ? cy : cy + c * h / 2, piano ? cz - c * h / 2 : cz); parte.push(pt); } idx.push(o, o + 1, o + 2, o, o + 2, o + 3); };
    const t = TIFOSO.testa, tw = (t.max[0] - t.min[0]) * H, th = (t.max[1] - t.min[1]) * H;
    quadro(tw * 0.85, 0.11, 0, t.min[1] * H + th * 0.3, t.max[2] * H + 0.04, 5, true); // visiera (solo chi ha il berretto)
    quadro(0.8, 0.13, 0, MANI_SU + 0.02, 0.07, 6, false); // sciarpa tesa sopra la testa (solo durante i cori)
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('aParte', new T.Float32BufferAttribute(parte, 1)); g.setIndex(idx); g.computeVertexNormals(); return g;
  };
  const DETT = tifoso();
  // il movimento delle braccia (spalla e gomito veri del modello), uguale nel 3D e nelle foto delle sagome
  const BRACCIA = `if (aParte > 1.5 && aParte < 3.5) {
    vec3 q = transformed;
    if (aParte > 2.5) { q.y -= ${GOM.toFixed(3)}; q = vec3(q.x, q.y * cos(a2) - q.z * sin(a2), q.y * sin(a2) + q.z * cos(a2)); q.y += ${GOM.toFixed(3)}; } // gomito
    q.y -= ${SP[1].toFixed(3)}; transformed = vec3(q.x, q.y * cos(a1) - q.z * sin(a1) + ${SP[1].toFixed(3)}, q.y * sin(a1) + q.z * cos(a1)); // spalla
  }`;
  const U = { uT: { value: 0 }, uEsulta: { value: new T.Vector2() }, uCoro: { value: new T.Vector2() }, uMossa: { value: 0.5 } };
  const MAT = (() => {
    const m = new T.MeshLambertMaterial({ color: 0xffffff });
    m.customProgramCacheKey = () => 'folla';
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      // colori netti tra maglia, pantaloni e pelle: un colore per triangolo (flat), niente sfumature sui triangoli grandi
      sh.fragmentShader = sh.fragmentShader.replace('#include <color_pars_fragment>', 'flat varying vec4 vColor;');
      sh.vertexShader = sh.vertexShader.replace('#include <color_pars_vertex>', 'flat varying vec4 vColor;').replace('#include <common>', '#include <common>\nattribute float aParte; attribute vec4 aInfo; attribute vec3 aPelle, aCapo, aSciarpa; uniform float uT, uMossa; uniform vec2 uEsulta, uCoro;')
        .replace('#include <color_vertex>', `#include <color_vertex>
// aInfo: x fase, y settore, z maniche lunghe, w = sciarpa + 2 * berretto
float manica = aInfo.z, berretto = step(1.5, aInfo.w);
float hp = fract(aInfo.x * 13.7), hs = fract(aInfo.x * 29.3);
if (aParte < 0.5) vColor.xyz = instanceColor.xyz;
else if (aParte < 1.5) vColor.xyz = aPelle;
else if (aParte < 2.5) vColor.xyz = instanceColor.xyz; // la manica
else if (aParte < 3.5) vColor.xyz = mix(aPelle, instanceColor.xyz, manica);
else if (aParte < 4.5) vColor.xyz = aCapo;
else if (aParte < 5.5) vColor.xyz = aCapo * 0.75;
else if (aParte < 6.5) vColor.xyz = mod(floor((position.x + 0.4) / 0.13), 2.0) < 0.5 ? instanceColor.xyz : aSciarpa; // sciarpa a strisce coi due colori
else if (aParte < 7.5) vColor.xyz = hp < 0.45 ? vec3(0.04, 0.07, 0.16) : hp < 0.8 ? vec3(0.02, 0.02, 0.025) : vec3(0.18, 0.18, 0.2); // jeans, neri o grigi
else vColor.xyz = hs < 0.6 ? vec3(0.02) : vec3(0.7);`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>
{
  float f = aInfo.x * 6.2831, settore = aInfo.y, e = settore < 0.5 ? uEsulta.x : uEsulta.y, varia = 0.7 + 0.6 * fract(aInfo.x * 7.31);
  float sciarpa = mod(aInfo.w, 2.0), c = (settore < 0.5 ? uCoro.x : uCoro.y) * sciarpa, lato = sign(position.x);
  // braccia: ognuna con la sua fase (agitano asincrone) e il gomito che si piega, nei cori su dritte a tenere la sciarpa
  float a1 = mix(-e * (2.35 + 0.45 * sin(uT * 7.0 + f + lato * 1.7)) * varia, -3.0, c);
  float a2 = mix(-e * (0.3 + 0.35 * sin(uT * 5.0 + f * 1.3 + lato)) * varia, 0.0, c);
  ${BRACCIA}
  if (aParte > 4.5 && aParte < 5.5 && berretto < 0.5) transformed = vec3(0.0, ${(TIFOSO.testa.min[1] * H).toFixed(3)}, 0.0); // niente berretto: niente visiera
  if (aParte > 5.5 && aParte < 6.5) { if (c < 0.02) transformed = vec3(0.0, ${(SP[1] - 0.1).toFixed(3)}, 0.0); else { transformed.x *= c; transformed.x += sin(uT * 3.2 + f) * 0.06 * c; } } // la sciarpa si apre col coro
  transformed.y += e * max(0.0, sin(uT * 9.0 + f)) * 0.34 * varia + sin(uT * 1.7 + f) * 0.015 * uMossa + c * max(0.0, sin(uT * 4.4 + f * 0.2)) * 0.06; // salta quando esulta, nei cori a tempo
  transformed.x += sin(uT * 1.3 + f * 1.7) * 0.035 * uMossa; // ondeggia
}`);
    };
    materiali.push(m); return m;
  })();
  /*
   * Le sagome per le file lontane. All'avvio si fotografa il tifoso 3D in tre pose (fermo, braccia al cielo, sciarpa tesa)
   * in una texture piccola che non porta colori ma tre maschere già illuminate: R maglia (e sciarpa), G pelle, B il resto
   * scuro (capelli, pantaloni, scarpe). Ogni sagoma è un rettangolo girato verso il campo che prende la posa giusta e si
   * colora coi colori suoi (maglia, pelle, pantaloni): da lontano non si distingue dal 3D e costa due triangoli.
   */
  const CELLA = { w: 0.95, h: MANI_SU + 0.3, px: [96, 192] };
  const sagome = (() => {
    if (!renderer) return null;
    const rt = new T.WebGLRenderTarget(CELLA.px[0] * 3, CELLA.px[1], { generateMipmaps: true, minFilter: T.LinearMipmapLinearFilter, magFilter: T.LinearFilter });
    const sc2 = new T.Scene(), cam = new T.OrthographicCamera(0, CELLA.w * 3, CELLA.h - 0.05, -0.05, -5, 5);
    [[0, 0, 0], [-2.5, -0.45, 0], [-3, 0, 1]].forEach(([a1, a2, sciarpa], k) => {
      const m = new T.ShaderMaterial({ uniforms: { a1: { value: a1 }, a2: { value: a2 }, sciarpa: { value: sciarpa } },
        vertexShader: `attribute float aParte; uniform float a1, a2, sciarpa; flat varying vec3 vMasc; varying float vLuce;
void main() { vec3 transformed = position; ${BRACCIA}
  if (aParte > 4.5 && aParte < 5.5) transformed = vec3(0.0, -9.0, 0.0); // la visiera no: nelle sagome nessuno ha il berretto
  if (aParte > 5.5 && aParte < 6.5 && sciarpa < 0.5) transformed = vec3(0.0, -9.0, 0.0);
  vMasc = (aParte < 0.5 || (aParte > 1.5 && aParte < 2.5) || (aParte > 5.5 && aParte < 6.5)) ? vec3(1.0, 0.0, 0.0) : (aParte < 1.5 || aParte < 3.5) ? vec3(0.0, 1.0, 0.0) : vec3(0.0, 0.0, 1.0);
  vLuce = 0.5 + 0.55 * max(dot(normalize(normal), normalize(vec3(0.35, 0.8, 0.6))), 0.0);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0); }`,
        fragmentShader: 'flat varying vec3 vMasc; varying float vLuce; void main() { gl_FragColor = vec4(vMasc * min(vLuce, 1.0), 1.0); }' });
      const mesh = new T.Mesh(DETT, m); mesh.position.x = CELLA.w * (k + 0.5); sc2.add(mesh);
    });
    const prima = renderer.getRenderTarget(), colore = renderer.getClearColor(new T.Color()), alfa = renderer.getClearAlpha();
    renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(sc2, cam);
    renderer.setRenderTarget(prima); renderer.setClearColor(colore, alfa);
    return rt.texture;
  })();
  const MATS = sagome && (() => {
    const m = new T.MeshBasicMaterial({ map: sagome, color: 0xffffff, alphaTest: 0.45 });
    m.customProgramCacheKey = () => 'sagome';
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 aInfo; attribute vec3 aPelle; uniform float uT, uMossa; uniform vec2 uEsulta, uCoro; flat varying vec3 vMaglia, vPelle, vScuro;')
        .replace('#include <uv_vertex>', `#include <uv_vertex>
float f = aInfo.x * 6.2831, settore = aInfo.y, e = settore < 0.5 ? uEsulta.x : uEsulta.y, varia = 0.7 + 0.6 * fract(aInfo.x * 7.31);
float c = (settore < 0.5 ? uCoro.x : uCoro.y) * mod(aInfo.w, 2.0);
float posa = c > 0.4 ? 2.0 : (e > 0.3 && sin(uT * 6.0 + f) > -0.3 ? 1.0 : 0.0); // ferma, braccia al cielo (a scatti, come chi le agita) o sciarpa
vMapUv = vec2((uv.x + posa) / 3.0, uv.y);
float hp = fract(aInfo.x * 13.7); vMaglia = instanceColor.xyz; vPelle = aPelle; vScuro = hp < 0.45 ? vec3(0.04, 0.07, 0.16) : hp < 0.8 ? vec3(0.02, 0.02, 0.025) : vec3(0.18, 0.18, 0.2);`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>
transformed.y += e * max(0.0, sin(uT * 9.0 + f)) * 0.34 * varia + sin(uT * 1.7 + f) * 0.015 * uMossa + c * max(0.0, sin(uT * 4.4 + f * 0.2)) * 0.06;
transformed.x += sin(uT * 1.3 + f * 1.7) * 0.035 * uMossa;`);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nflat varying vec3 vMaglia, vPelle, vScuro;')
        .replace('#include <map_fragment>', `vec4 masc = texture2D(map, vMapUv);
diffuseColor = vec4((vMaglia * masc.r + vPelle * masc.g + vScuro * masc.b) / max(masc.a, 0.001) * diffuse, masc.a); // le maschere già illuminate, coi colori del tifoso`)
        .replace('#include <color_fragment>', '');
    };
    materiali.push(m); return m;
  })();
  const QUAD = (() => { const g = new T.PlaneGeometry(CELLA.w, CELLA.h); g.translate(0, CELLA.h / 2 - 0.05, 0); return g; })();

  const m4 = new T.Matrix4(), q = new T.Quaternion(), sc = new T.Vector3(), asse = new T.Vector3(0, 1, 0), pelle = [0xf1c9a5, 0xe0ac7e, 0xc68642, 0x8d5524, 0x5c3a1e, 0xf6d7bd].map((c) => new T.Color(c));
  const folle = []; let N = 0;
  const gruppo = (suoi, geo, mat, visibile) => { // una InstancedMesh per un gruppo di posti, con i suoi attributi
    const n = suoi.length; if (!n) return null;
    const info = new Float32Array(n * 4), cute = new Float32Array(n * 3), capo = new Float32Array(n * 3), sciarpa = new Float32Array(n * 3), m = new T.InstancedMesh(geo.clone(), mat, n);
    for (let i = 0; i < n; i++) {
      const s = suoi[i], k = 0.9 + rand() * 0.2; q.setFromAxisAngle(asse, s.ry + (rand() - 0.5) * (mat === MATS ? 0.2 : 0.5)); sc.set(k, k, k); m4.compose(s.p, q, sc);
      m.setMatrixAt(i, m4); m.setColorAt(i, pelle[0]); pelle[Math.floor(rand() * pelle.length)].toArray(cute, i * 3);
      info[i * 4] = rand(); info[i * 4 + 1] = s.settore;
    }
    // l'ingombro deve tenere conto dei salti, delle braccia e delle sciarpe alzate (lo shader sposta i vertici)
    m.computeBoundingSphere(); m.boundingSphere.radius += 2;
    const A = { aInfo: new T.InstancedBufferAttribute(info, 4), aPelle: new T.InstancedBufferAttribute(cute, 3), aCapo: new T.InstancedBufferAttribute(capo, 3), aSciarpa: new T.InstancedBufferAttribute(sciarpa, 3) };
    for (const k in A) m.geometry.setAttribute(k, A[k]);
    m.visible = visibile; scene.add(m); const f = { m, info, A, n, capo, sciarpa }; folle.push(f); return f;
  };
  for (const tr of tribune) {
    const tutti = posti.filter((s) => s.tr === tr);
    for (let i = tutti.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [tutti[i], tutti[j]] = [tutti[j], tutti[i]]; }
    const presi = tutti.slice(0, Math.min(tutti.length, Math.round(totale * tutti.length / posti.length)));
    const vicini = presi.filter((s) => s.fila < FILE_VICINE), lontani = presi.filter((s) => s.fila >= FILE_VICINE);
    const v3d = gruppo(vicini, DETT, MAT, true);
    if (MATS) { tr.sagomeVicine = gruppo(vicini, QUAD, MATS, false); gruppo(lontani, QUAD, MATS, true); } else gruppo(lontani, DETT, MAT, true);
    tr.folla3d = v3d; N += presi.length;
  }

  // colori: maglie della squadra di casa negli spalti di casa, degli ospiti nella curva ospiti (più un po' di neutri)
  let squadre = null;
  function colora(casa, ospiti) {
    squadre = [casa, ospiti]; const r = casuale(hashStr((casa.name || '') + (ospiti.name || ''))), col = new T.Color(), grigio = new T.Color();
    // Il pubblico di uno stadio vero: metà coi colori della squadra (smorzati: nessuno ha la maglia accesa come in campo),
    // l'altra metà vestita come capita, con giacche e felpe di tutti i giorni
    const comuni = [0x23283a, 0x2f3338, 0x4a4f58, 0x6b6f76, 0x9a9c9f, 0xd6d3cc, 0x2d3b55, 0x3e5a78, 0x5a4a3c, 0x7a6a55, 0x4c5a40, 0x6e2f35, 0x8a5a2f, 0x1c1c20, 0xb8a98f, 0x55606e].map((c) => new T.Color(c));
    const smorza = (c, quanto, luce) => { const l = c.r * 0.3 + c.g * 0.59 + c.b * 0.11; grigio.setRGB(l, l, l); c.lerp(grigio, quanto).multiplyScalar(luce); };
    const capelli = [0x1c1410, 0x2e2018, 0x5a3a20, 0x8a6a3a, 0x111111, 0xc9a25a, 0x9c9a96].map((c) => new T.Color(c)), c2 = new T.Color();
    for (const { m, info, A, n, capo, sciarpa } of folle) {
      for (let i = 0; i < n; i++) {
        const mia = info[i * 4 + 1] > 0.5 ? 1 : 0, u = r(), altra = u >= 0.42 && u < 0.5, sq = squadre[altra ? 1 - mia : mia], tifa = u < 0.5;
        if (tifa) { col.set(u < 0.27 ? sq.c1 : u < 0.42 ? sq.c2 : r() < 0.6 ? sq.c1 : sq.c2); smorza(col, 0.3 + r() * 0.2, 0.72 + r() * 0.2); }
        else { col.copy(comuni[Math.floor(r() * comuni.length)]).multiplyScalar(0.8 + r() * 0.3); }
        m.setColorAt(i, col); info[i * 4 + 2] = r() < 0.3 ? 1 : 0; // maniche lunghe o braccia scoperte
        const conSciarpa = tifa && r() < 0.45, berretto = r() < 0.18; info[i * 4 + 3] = (conSciarpa ? 1 : 0) + (berretto ? 2 : 0);
        if (berretto) { c2.set(tifa && r() < 0.6 ? sq.c1 : tifa ? sq.c2 : 0x2a2c33); smorza(c2, 0.3, 0.85); } else c2.copy(capelli[Math.floor(r() * capelli.length)]);
        c2.toArray(capo, i * 3);
        c2.set(u < 0.3 ? sq.c2 : sq.c1); smorza(c2, 0.2, 0.9); c2.toArray(sciarpa, i * 3); // la sciarpa ha l'altro colore della squadra, a strisce con quello della maglia
      }
      m.instanceColor.needsUpdate = A.aInfo.needsUpdate = A.aCapo.needsUpdate = A.aSciarpa.needsUpdate = true;
    }
    for (const s of striscioni) disegnaStriscione(s, squadre[s.settore]);
    for (const b of bandiere) { const sq = squadre[b.settore], a = new T.Color(sq.c1), c2 = new T.Color(sq.c2), col3 = b.pg.attributes.color; for (let i = 0; i < col3.count; i++) { const x = b.pg.attributes.position.getX(i), c = Math.floor((x + 1.1) / 0.44) % 2 ? a : c2; col3.setXYZ(i, c.r, c.g, c.b); } col3.needsUpdate = true; }
    if (tribune[0].copertura) tribune[0].copertura.material.color.set(casa.c1);
  }
  function disegnaStriscione(s, sq) {
    const x = s.c.getContext('2d'), testo = [`FORZA ${sq.short || sq.name}`, (sq.name || '').toUpperCase(), 'SEMPRE CON VOI'][s.k];
    x.fillStyle = sq.c1; x.fillRect(0, 0, 512, 96); x.fillStyle = sq.c2; x.fillRect(0, 0, 512, 14); x.fillRect(0, 82, 512, 14);
    x.fillStyle = sq.c2; x.textAlign = 'center'; x.textBaseline = 'middle'; let fs = 54; do { x.font = `${fs}px Anton, Impact, sans-serif`; fs -= 2; } while (x.measureText(testo).width > 470 && fs > 20);
    x.fillText(testo, 256, 50); s.tex.needsUpdate = true;
  }
  // ---------------------------------------------------------------- esultanza e animazione
  const es = [0, 0], fino = [0, 0], coro = [0, 0], cantaFino = [0, 0]; let prossimoCoro = 12 + Math.random() * 15;
  /** I cori: il settore alza le sciarpe tese sopra la testa e salta a tempo per `durata` secondi. */
  function canta(settore, durata = 9) { cantaFino[settore] = Math.max(cantaFino[settore], durata); }
  function esulta(settore, forza = 1, durata = 5) { es[settore] = Math.max(es[settore], forza); fino[settore] = Math.max(fino[settore], durata); if (forza >= 1) canta(settore, durata + 4); }
  function densita(d) { const k = Math.max(0.1, Math.min(1, d)); for (const f of folle) f.m.count = Math.round(f.n * k); }
  /** Dettagli della folla sì o no (lo scaler della qualità li toglie per primi): anche le prime file diventano sagome. */
  function dettaglio(on) { for (const tr of tribune) if (tr.folla3d && tr.sagomeVicine) { tr.folla3d.m.visible = on; tr.sagomeVicine.m.visible = !on; } }
  function muovi(dt, t) {
    U.uT.value = t;
    for (let k = 0; k < 2; k++) { fino[k] -= dt; if (fino[k] <= 0) es[k] = Math.max(0, es[k] - dt * 1.5); }
    // ogni tanto un coro spontaneo, più spesso dalla parte dei tifosi di casa
    prossimoCoro -= dt; if (prossimoCoro <= 0) { canta(Math.random() < 0.7 ? 0 : 1, 7 + Math.random() * 5); prossimoCoro = 25 + Math.random() * 25; }
    for (let k = 0; k < 2; k++) { cantaFino[k] -= dt; coro[k] += ((cantaFino[k] > 0 ? 1 : 0) - coro[k]) * Math.min(1, dt * 2.2); }
    U.uEsulta.value.set(es[0], es[1]); U.uCoro.value.set(coro[0], coro[1]); U.uMossa.value = 0.5 + Math.max(es[0], es[1]);
    for (const b of bandiere) { b.fase += dt * (2 + es[b.settore] * 4); const p = b.pg.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, Math.sin(b.fase + x * 2.2) * 0.16 * (x + 1.1) / 2.2); } p.needsUpdate = true; }
  }
  return { colora, esulta, canta, densita, dettaglio, muovi, materiali, get squadre() { return squadre; }, N };
}
function hashStr(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
