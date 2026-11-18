/* Fisica del pallone, senza grafica: si prova da sola (scripts/prova-fisica.mjs) e game.js la usa per muovere la palla,
   per prevedere dove va e per calcolare con che forza calciarla.

   Assi come nel resto del gioco: x lungo il campo, z in larghezza, y in altezza. Il pallone è un oggetto semplice:
   { x, y, z, vx, vy, vz, c, t } dove c è l'effetto laterale (da -1 a 1: positivo curva a sinistra di chi calcia)
   e t la rotazione in avanti (positiva: il tiro scende prima; negativa, il pallonetto galleggia).

   Ogni passo è diviso in passi brevi (al massimo 1/120 di secondo), così il risultato è lo stesso a 30, 60 o 144 fotogrammi. */

export const FIS = {
  g: 20, // gravità del gioco (più alta del vero: le parabole sono più brevi e leggibili sul telefono)
  r: 0.26, // raggio del pallone in campo (ingrandito per vederlo)
  aria: 0.0075, // resistenza dell'aria: decelerazione = aria · velocità² (a 30 m/s circa 6,8 m/s²)
  magnus: 0.2, // curva: accelerazione laterale = magnus · effetto · velocità orizzontale
  top: 0.12, // rotazione in avanti: accelerazione verso il basso = top · t · velocità orizzontale
  giroAria: 0.3, // quanto si perde l'effetto al secondo in volo
  giroErba: 3.5, // e quando rotola
  rotola: 1.2, // attrito dell'erba quando rotola: frenata costante in m/s²
  viscoso: 0.22, // più una frenata che cresce con la velocità (erba alta, piccoli saltelli)
  rimbalzo: 0.55, // quanta velocità verticale resta dopo un rimbalzo
  strisciaRimbalzo: 0.86, // quanta velocità orizzontale resta dopo un rimbalzo
  minRimbalzo: 1.8, // sotto questa velocità verticale non rimbalza più: si appoggia e rotola
  passoMax: 1 / 120,
};

const hyp = Math.hypot;

/** Un passo breve: forze in volo o attrito sull'erba, poi il contatto col terreno. Risponde true se ha rimbalzato. */
function passoBreve(b, h) {
  const F = FIS, terra = b.y <= F.r + 0.005 && b.vy <= 0.01;
  const vh = hyp(b.vx, b.vz);
  if (terra) {
    b.y = F.r; b.vy = 0;
    if (vh > 0) {
      const giu = Math.min(vh, (F.rotola + F.viscoso * vh + F.aria * vh * vh) * h), k = (vh - giu) / vh;
      b.vx *= k; b.vz *= k;
    }
    const s = Math.exp(-F.giroErba * h); b.c *= s; b.t *= s;
  } else {
    const v = hyp(b.vx, b.vy, b.vz), a = F.aria * v;
    let ax = -a * b.vx, ay = -F.g - a * b.vy, az = -a * b.vz;
    if (vh > 0.5) {
      ax += -F.magnus * b.c * b.vz; az += F.magnus * b.c * b.vx; // perpendicolare alla direzione: (-vz, vx)
      ay -= F.top * b.t * vh;
    }
    b.vx += ax * h; b.vy += ay * h; b.vz += az * h;
    const s = Math.exp(-F.giroAria * h); b.c *= s; b.t *= s;
  }
  b.x += b.vx * h; b.y += b.vy * h; b.z += b.vz * h;
  if (b.y < F.r) {
    b.y = F.r;
    if (b.vy < -F.minRimbalzo) {
      b.vy = -b.vy * F.rimbalzo;
      const k = F.strisciaRimbalzo * (1 + 0.08 * b.t); b.vx *= k; b.vz *= k; // la rotazione in avanti fa scappare la palla dopo il rimbalzo
      b.c *= 0.6; b.t *= 0.5;
      return true;
    }
    b.vy = 0;
  }
  return false;
}

/**
 * Fa avanzare il pallone di dt secondi (dt qualsiasi). I passi brevi sono sempre lunghi uguali (1/120 s): quello che avanza
 * si tiene da parte per il fotogramma dopo, così a 30, 60 o 144 fotogrammi il pallone fa esattamente la stessa strada.
 * Risponde quante volte ha rimbalzato.
 */
export function passo(b, dt) {
  if (!(dt > 0)) return 0;
  if (b.c === undefined) b.c = 0;
  if (b.t === undefined) b.t = 0;
  const h = FIS.passoMax; let r = 0;
  b.resto = (b.resto || 0) + dt;
  while (b.resto >= h - 1e-9) { if (passoBreve(b, h)) r++; b.resto -= h; }
  return r;
}

export const copia = (b) => ({ x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy, vz: b.vz, c: b.c || 0, t: b.t || 0, resto: 0 });
export const fermo = (b) => b.y <= FIS.r + 0.005 && hyp(b.vx, b.vy, b.vz) < 0.05;

/**
 * Il percorso previsto: un punto ogni `ogni` secondi fino a `durata` (o finché si ferma). Serve all'IA per andare incontro
 * al pallone e al portiere per capire dove arriva il tiro.
 */
export function percorso(b, durata = 2.5, ogni = 0.05) {
  const q = copia(b), out = [{ t: 0, x: q.x, y: q.y, z: q.z }];
  for (let t = ogni; t <= durata + 1e-9; t += ogni) {
    passo(q, ogni); out.push({ t, x: q.x, y: q.y, z: q.z });
    if (fermo(q)) break;
  }
  return out;
}

/** Dove e quando il pallone scende sotto l'altezza h (per i traversoni: dove si colpisce di testa). null se non succede. */
export function atterraggio(b, h = 1.95, durata = 3.5) {
  const q = copia(b), dt = 1 / 60;
  if (q.y <= h && q.vy <= 0) return { x: q.x, z: q.z, t: 0 };
  let su = q.y > h;
  for (let t = dt; t <= durata; t += dt) {
    passo(q, dt);
    if (q.y > h) su = true; else if (su && q.vy < 0) return { x: q.x, z: q.z, t };
  }
  return null;
}

/** Quando e dove il pallone passa per la linea x = lx (per il portiere): { t, y, z } o null se non ci arriva entro `durata`. */
export function attraversa(b, lx, durata = 2) {
  const q = copia(b), dt = 1 / 120, verso = Math.sign(lx - q.x);
  if (!verso) return { t: 0, y: q.y, z: q.z };
  for (let t = dt; t <= durata; t += dt) {
    const px = q.x, py = q.y, pz = q.z; passo(q, dt);
    if ((q.x - lx) * verso >= 0) { const f = (lx - px) / ((q.x - px) || 1e-9); return { t: t - dt + f * dt, y: py + (q.y - py) * f, z: pz + (q.z - pz) * f }; }
    if (fermo(q)) return null;
  }
  return null;
}

/**
 * Velocità di partenza per un tiro in volo: dal punto `da` al punto `a` (con l'altezza a.y) in T secondi, con effetto c e
 * rotazione t. Si parte dalla parabola senz'aria e si corregge provando: aria ed effetto spostano l'arrivo, e a ogni giro
 * si sposta la mira di quanto si è sbagliato. Con la curva la palla parte "storta" e rientra sul bersaglio.
 */
export function mira(da, a, T, c = 0, t = 0, giri = 6) {
  const g = FIS.g;
  let vx = (a.x - da.x) / T, vz = (a.z - da.z) / T, vy = (a.y - da.y + 0.5 * g * T * T) / T;
  for (let k = 0; k < giri; k++) {
    const q = { x: da.x, y: da.y, z: da.z, vx, vy, vz, c, t }, n = Math.max(1, Math.round(T * 120)), h = T / n;
    for (let i = 0; i < n; i++) passoInVolo(q, h);
    const ex = a.x - q.x, ey = a.y - q.y, ez = a.z - q.z;
    if (Math.abs(ex) + Math.abs(ey) + Math.abs(ez) < 0.02) break;
    vx += ex / T; vy += ey / T; vz += ez / T;
  }
  return { vx, vy, vz };
}
// come passoBreve ma senza terreno: per la mira conta solo il volo fino al bersaglio
function passoInVolo(b, h) {
  const F = FIS, v = hyp(b.vx, b.vy, b.vz), vh = hyp(b.vx, b.vz), a = F.aria * v;
  let ax = -a * b.vx, ay = -F.g - a * b.vy, az = -a * b.vz;
  if (vh > 0.5) { ax += -F.magnus * b.c * b.vz; az += F.magnus * b.c * b.vx; ay -= F.top * b.t * vh; }
  b.vx += ax * h; b.vy += ay * h; b.vz += az * h;
  const s = Math.exp(-F.giroAria * h); b.c *= s; b.t *= s;
  b.x += b.vx * h; b.y += b.vy * h; b.z += b.vz * h;
}

/** Un pallone che rotola: quanta strada fa partendo a v0 e con che velocità arriva a distanza d (0 se si ferma prima). */
export function rotolaFino(v0, d) {
  const q = { x: 0, y: FIS.r, z: 0, vx: v0, vy: 0, vz: 0, c: 0, t: 0 }, h = 1 / 120;
  for (let t = 0; t < 8; t += h) { passoBreve(q, h); if (q.x >= d) return { v: q.vx, t }; if (q.vx <= 0.01) return { v: 0, t, corto: q.x }; }
  return { v: q.vx, t: 8 };
}
/** La velocità con cui far partire un rasoterra perché arrivi a distanza d alla velocità vArrivo (ricerca per bisezione). */
export function rasoterra(d, vArrivo, vMax = 32) {
  let lo = vArrivo, hi = vMax;
  if (rotolaFino(hi, d).v < vArrivo) return hi;
  for (let k = 0; k < 22; k++) { const m = (lo + hi) / 2; if (rotolaFino(m, d).v < vArrivo) lo = m; else hi = m; }
  return hi;
}
/** Quanto strada fa un rasoterra partito a v0 prima di fermarsi. */
export function gittata(v0) { const q = { x: 0, y: FIS.r, z: 0, vx: v0, vy: 0, vz: 0, c: 0, t: 0 }; while (q.vx > 0.01) passoBreve(q, 1 / 120); return q.x; }

/* ---------------------------------------------------------------- conduzione */

/**
 * Lo stop: chi riceve smorza il pallone e se lo mette davanti, verso dove vuole andare. Con meno tecnica (q) e con un
 * pallone più veloce lo stop è meno pulito: la palla resta più lontana e un avversario vicino può approfittarne.
 */
export function controlla(b, p, q = 0.5, caso = Math.random, verso = null) {
  const vin = hyp(b.vx, b.vz), vl = verso ? hyp(verso.x, verso.z) : 0;
  const ux = vl > 0.2 ? verso.x / vl : Math.sin(p.dir), uz = vl > 0.2 ? verso.z / vl : Math.cos(p.dir);
  const sporco = Math.min(1, vin / 22) * (1.2 - q), e = (caso() * 2 - 1) * 0.5 * sporco;
  const sp = hyp(p.vx, p.vz) * 0.9 + 1 + vin * 0.12 * sporco, c = Math.cos(e), s = Math.sin(e);
  b.vx = (ux * c - uz * s) * sp; b.vz = (ux * s + uz * c) * sp; b.vy = Math.min(b.vy, 0.5); b.c = 0; b.t = 0; p.tocco = COND.pausa;
}

/**
 * Il dribbling: chi ha palla non se la porta incollata, la spinge avanti di un tocco quando la raggiunge e la rincorre.
 * Il tocco è più lungo in scatto e per chi ha meno tecnica: la palla resta più a lungo lontana dal piede e un avversario
 * può arrivarci prima. Da fermo (o quasi) la palla resta sotto la suola.
 *  vicino:  sotto questa distanza "davanti al piede" scatta il tocco successivo
 *  passo:   tocco normale = velocità di corsa · passo; scatto: passoScatto
 *  perde:   oltre questa distanza dal giocatore la palla non è più sua
 *  fermo:   sotto questa velocità si tiene la palla sotto la suola
 *  errore:  di quanto (radianti) può andare storto un tocco per chi ha la tecnica più bassa
 *  pausa:   tempo minimo tra due tocchi
 */
export const COND = { vicino: 0.75, passo: 1.15, passoScatto: 1.28, perde: 3.2, fermo: 1.4, errore: 0.14, pausa: 0.2, suola: 0.55, girata: 0.6 };

/**
 * Un passo di conduzione per il giocatore p (x, z, vx, vz, dir, sprint) con tecnica q da 0 a 1. Cambia solo la velocità del
 * pallone (poi lo muove passo()). Risponde 'perso' se la palla è scappata, 'tocco' se l'ha appena spinta, altrimenti null.
 * (vx, vz) di `verso` è dove vuole andare (non serve che sia lunga 1); se manca, dove sta già correndo. Il tocco va lì:
 * così chi corre in una direzione e ne vuole un'altra sposta la palla col primo tocco utile.
 * `caso` è una funzione che dà numeri tra 0 e 1 (per le prove si passa una sequenza fissa).
 */
export function conduci(b, p, dt, q = 0.5, caso = Math.random, verso = null) {
  const rx = b.x - p.x, rz = b.z - p.z, d = hyp(rx, rz);
  if (d > COND.perde) return 'perso';
  p.tocco = (p.tocco || 0) - dt;
  const v = hyp(p.vx, p.vz), fx = Math.sin(p.dir), fz = Math.cos(p.dir);
  if (b.y > 0.9) return null; // palla alta: prima deve scendere
  if (v < COND.fermo) { // da fermo: la tiene sotto la suola, davanti a sé
    const tx = p.x + fx * COND.suola, tz = p.z + fz * COND.suola, k = 1 - Math.exp(-14 * dt);
    b.vx += ((tx - b.x) * 9 + p.vx - b.vx) * k; b.vz += ((tz - b.z) * 9 + p.vz - b.vz) * k;
    return null;
  }
  const vl = verso ? hyp(verso.x, verso.z) : 0, ux = vl > 0.2 ? verso.x / vl : p.vx / v, uz = vl > 0.2 ? verso.z / vl : p.vz / v;
  const avanti = rx * ux + rz * uz, lato = Math.abs(rx * uz - rz * ux);
  const bv = hyp(b.vx, b.vz), storta = bv > 0.5 ? (b.vx * ux + b.vz * uz) / bv < Math.cos(COND.girata) : true;
  const raggiunta = avanti < COND.vicino || (storta && d < 1.15);
  if (!raggiunta || p.tocco > 0 || d > 1.3 || lato > 0.9) return null;
  const e = (caso() * 2 - 1) * COND.errore * (1.15 - q), c = Math.cos(e), s = Math.sin(e);
  const vc = Math.max(v * Math.max(0, (p.vx * ux + p.vz * uz) / v), 3.5); // se sta girando, il tocco è corto: deve ancora prendere velocità
  const sp = vc * (p.sprint ? COND.passoScatto : COND.passo) * (1.08 - 0.16 * q), dx = ux * c - uz * s, dz = ux * s + uz * c;
  b.vx = dx * sp; b.vz = dz * sp; b.vy = p.sprint ? 0.6 : 0; p.tocco = COND.pausa;
  return 'tocco';
}
