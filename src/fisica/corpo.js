/* Il movimento dei giocatori, senza grafica: si prova da solo (scripts/prova-fisica.mjs) e game.js lo usa per far correre
   tutti e ventidue.

   Chi decide dove andare (l'IA o la levetta) chiede una velocità; il corpo ci arriva come un corpo vero:
   - accelera forte da fermo e sempre meno avvicinandosi alla velocità massima;
   - frena più forte di quanto acceleri;
   - per curvare serve una forza laterale che ha un limite: più si va veloci, più la curva è larga (in scatto ancora di più);
   - se la direzione chiesta è quasi alle spalle, prima frena e poi riparte.
   La fatica abbassa velocità massima, accelerazione e prontezza. Il busto ruota verso la direzione di corsa con una
   velocità angolare limitata (niente scatti di 180° in un fotogramma) e si inclina nelle curve e quando accelera o frena.

   Tutto avanza a passi fissi di 1/120 di secondo, come il pallone: stesso risultato a ogni frame rate. */

export const CORPO = {
  acc: 12, // accelerazione da fermo (m/s²)
  accMin: 0.22, // quanta accelerazione resta vicino alla velocità massima (frazione di acc)
  frena: 17, // frenata massima (m/s²)
  lat: 30, // forza laterale massima per curvare, da fermo (m/s²)
  latV: 6, // velocità a cui la forza laterale si dimezza: più veloce, curva più larga
  latScatto: 0.75, // in scatto la curva si allarga ancora
  inverti: -0.35, // coseno sotto cui la direzione chiesta è "alle spalle": prima si frena
  giro: 13, // velocità massima di rotazione del busto da fermo (rad/s)
  giroCorsa: 7.5, // e a piena corsa
  molla: 160, // quanto forte il busto insegue la direzione voluta
  smorza: 24, // e quanto si smorza (oltre questo valore niente oscillazioni)
  passoMax: 1 / 120,
};

// Fatica (en da 0 a 1): lo scatto consuma, correndo forte si consuma poco, piano si recupera. `fondo` è il tetto a cui si
// recupera e cala piano durante la partita: nel finale chi ha corso tanto non torna più fresco come all'inizio.
export const FATICA = { scatto: 0.045, corsa: 0.006, recupero: 0.022, fondoCorsa: 0.0011, fondoScatto: 0.0022, fondoMin: 0.6, intervallo: 0.4 };

const hyp = Math.hypot, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const giro = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

/** Quanto la fatica pesa: velocità massima, accelerazione, prontezza in curva. */
export function forma(en) {
  const e = clamp(en, 0, 1);
  return { v: 0.88 + 0.12 * e, acc: 0.72 + 0.28 * e, lat: 0.8 + 0.2 * e };
}

/**
 * Un passo breve di h secondi: il giocatore p (x, z, vx, vz) vuole andare a velocità (wx, wz). `o` può cambiare acc, frena e
 * lat (per lo scatto, la fatica, un infortunio). vMax è la velocità massima di questo momento (serve per la curva di potenza).
 */
export function spingi(p, wx, wz, h, vMax, o = {}) {
  const C = CORPO, acc = (o.acc || 1) * C.acc, frena = (o.frena || 1) * C.frena, latK = (o.lat || 1) * C.lat;
  const v = hyp(p.vx, p.vz), w = hyp(wx, wz);
  if (v < 0.4) { // quasi fermo: si parte dritti verso dove si vuole
    const dvx = wx - p.vx, dvz = wz - p.vz, d = hyp(dvx, dvz), m = Math.min(d, acc * h);
    if (d > 1e-6) { p.vx += dvx / d * m; p.vz += dvz / d * m; }
    return;
  }
  const ux = p.vx / v, uz = p.vz / v, lungo = wx * ux + wz * uz, nx = wx - lungo * ux, nz = wz - lungo * uz, n = hyp(nx, nz);
  const alle = w > 0.5 && lungo / w < C.inverti; // direzione quasi alle spalle: frenata decisa, poca curva
  // lungo la direzione di corsa: accelerare (sempre meno vicino alla velocità massima) o frenare
  const potenza = acc * Math.max(C.accMin, 1 - v / Math.max(vMax * 1.05, 1));
  let dv = alle ? -frena * h : clamp(lungo - v, -frena * h, potenza * h);
  if (v + dv < 0) dv = -v;
  // di lato: la forza per curvare ha un limite che cala con la velocità
  const latMax = latK / (1 + (v / C.latV) * (v / C.latV)) * (alle ? 0.35 : 1);
  const dn = Math.min(n, latMax * h);
  p.vx += ux * dv + (n > 1e-6 ? nx / n * dn : 0);
  p.vz += uz * dv + (n > 1e-6 ? nz / n * dn : 0);
}

/**
 * Il busto verso l'angolo voluto: una molla smorzata con la velocità di rotazione limitata (più bassa in piena corsa).
 * Tiene in p.wy la velocità di rotazione, che serve anche per inclinarsi in curva.
 */
export function ruota(p, voluto, h, v = 0, k = 1) {
  const C = CORPO, lim = (C.giro + (C.giroCorsa - C.giro) * clamp(v / 8, 0, 1)) * k;
  const da = giro(voluto - p.dir);
  p.wy = clamp((p.wy || 0) + (C.molla * k * k * da - C.smorza * k * (p.wy || 0)) * h, -lim, lim);
  p.dir = giro(p.dir + p.wy * h);
}

/** Fatica in un passo di h secondi a velocità v (vMax quella senza scatto). */
export function stanca(p, h, v, vMax, scatto) {
  const F = FATICA, x = clamp(v / Math.max(vMax, 1), 0, 1.3);
  if (p.fondo === undefined) p.fondo = 1;
  p.fondo = Math.max(F.fondoMin, p.fondo - (F.fondoCorsa * x * x + (scatto ? F.fondoScatto : 0)) * h);
  if (scatto && v > 5) p.en -= F.scatto * h;
  else if (x > 0.7) p.en -= F.corsa * (x - 0.7) / 0.3 * h;
  else p.en += F.recupero * (1 - x) * h;
  p.en = clamp(p.en, 0, p.fondo);
}

/* ---------------------------------------------------------------- passo della corsa */

// Le clip di camminata, corsetta e corsa del modello: durata, velocità a cui girano normali (come in poseSkinned) e in che
// punto della clip il piede destro è in appoggio (misurato sulle ossa del modello: il sinistro è mezzo giro dopo).
export const ANDATURE = {
  walk: { D: 0.967, v: 1.9, min: 0.7, max: 1.7, dx: 0.995 },
  jog: { D: 0.833, v: 4.1, min: 0.8, max: 1.5, dx: 0.86 },
  run: { D: 0.7, v: 6.6, min: 0.8, max: 1.5, dx: 0.94 },
};
/** I pesi di camminata, corsetta e corsa a velocità v (gli stessi che usa l'animazione). */
export function pesi(v) {
  const m = clamp(v / 1.2, 0, 1), r = clamp((v - 6.4) / 1.8, 0, 1), j = clamp((v - 2) / 1.8, 0, 1) * (1 - r);
  return { walk: m * (1 - r - j), jog: m * j, run: m * r };
}
/** A che ritmo gira la clip k a velocità v (moltiplicatore della velocità normale). */
export const ritmoClip = (k, v) => { const a = ANDATURE[k]; return clamp(v / a.v, a.min, a.max); };
/** Quanti passi completi (destro + sinistro) al secondo fa chi corre a velocità v. */
export function cadenza(v) {
  const w = pesi(v); let r = 0, s = 0;
  for (const k in w) { r += w[k] * ritmoClip(k, v) / ANDATURE[k].D; s += w[k]; }
  return s > 0.01 ? r / s : 0;
}
/**
 * Fa avanzare il passo (p.passo da 0 a 1: 0 appoggio destro, 0,5 sinistro). Risponde true se in questo passo breve un piede
 * sta per toccare terra: è il momento giusto per un tocco di palla.
 */
export function cammina(p, h, v) {
  const prima = p.passo || 0, ora = prima + cadenza(v) * h;
  p.passo = ora % 1;
  const tocco = (t) => (prima < t && ora >= t) || (prima < t + 1 && ora >= t + 1);
  return v > 1.2 && (tocco(0.42) || tocco(0.92)); // poco prima dell'appoggio: il piede che scende spinge la palla
}
