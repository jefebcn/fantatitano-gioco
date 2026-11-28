/* Il movimento dei giocatori, senza grafica: si prova da solo (scripts/prova-fisica.mjs) e game.js lo usa per far correre
   tutti e ventidue.

   Chi decide dove andare (l'IA o la levetta) chiede una velocità; il corpo ci arriva come un corpo vero:
   - accelera forte da fermo e sempre meno avvicinandosi alla velocità massima;
   - frena più forte di quanto acceleri;
   - la corsa cambia direzione a una velocità angolare limitata: più si va veloci, più la curva è larga;
   - girare costa velocità in proporzione all'angolo: su un'inversione completa ne resta circa metà (come in Dream League).
   La fatica abbassa velocità massima, accelerazione e prontezza. Il busto ruota verso la direzione di corsa con una
   velocità angolare limitata (niente scatti di 180° in un fotogramma) e si inclina nelle curve e quando accelera o frena.

   Tutto avanza a passi fissi di 1/120 di secondo, come il pallone: stesso risultato a ogni frame rate. */

// i valori stanno in src/config.js
import { CORPO, FATICA } from '../config.js';
export { CORPO, FATICA };

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
  const C = CORPO, acc = (o.acc || 1) * C.acc, frena = (o.frena || 1) * C.frena;
  let v = hyp(p.vx, p.vz); const w = hyp(wx, wz);
  if (v < 0.4) { // quasi fermo: si parte dritti verso dove si vuole
    const dvx = wx - p.vx, dvz = wz - p.vz, d = hyp(dvx, dvz), m = Math.min(d, acc * h);
    if (d > 1e-6) { p.vx += dvx / d * m; p.vz += dvz / d * m; }
    return;
  }
  let ux = p.vx / v, uz = p.vz / v, avanti = 1;
  if (w > 0.3) {
    // Cambio di direzione: la corsa gira verso dove si vuole andare (più piano in scatto) e girando perde velocità in
    // proporzione all'angolo. Finché la direzione voluta è di lato o alle spalle non si accelera: prima si finisce di girare.
    const cosA = clamp((wx * ux + wz * uz) / w, -1, 1), ang = Math.acos(cosA);
    if (ang > 1e-4) {
      const svolta = Math.min(ang, (C.gira + (C.giraScatto - C.gira) * clamp(v / 7, 0, 1)) * (o.lat || 1) * h), verso = wz * ux - wx * uz >= 0 ? 1 : -1;
      const c = Math.cos(svolta * verso), s = Math.sin(svolta * verso), nx = ux * c - uz * s, nz = ux * s + uz * c;
      ux = nx; uz = nz; v *= Math.exp(-C.perde * svolta / Math.PI);
    }
    avanti = Math.max(0, cosA);
  }
  // lungo la direzione di corsa: accelerare (sempre meno vicino alla velocità massima) o frenare
  const potenza = acc * Math.max(avanti > 0.995 ? C.accMin : C.accMinCurva, 1 - v / Math.max(vMax * 1.05, 1)) * avanti;
  let dv = clamp(w - v, -frena * h, potenza * h);
  if (v + dv < 0) dv = -v;
  p.vx = ux * (v + dv); p.vz = uz * (v + dv);
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

// Le clip di camminata, corsetta e corsa del modello: durata, velocità a cui il piede in appoggio resta fermo sull'erba
// (misurata sulle ossa: quanto scorre all'indietro il piede a terra, per un giocatore di 1,80 m) e in che punto
// della clip il piede destro è in appoggio (il sinistro è mezzo giro dopo). min e max: quanto si può rallentare o
// accelerare la clip prima che sembri un'altra andatura.
export const ANDATURE = {
  walk: { D: 0.967, v: 1.53, min: 0.12, max: 1.45, dx: 0.995 },
  jog: { D: 0.833, v: 2.34, min: 0.55, max: 1.75, dx: 0.86 },
  // la corsa copre anche lo scatto (7 m/s): la clip accelera fino al doppio, così il piede in appoggio non scivola
  run: { D: 0.7, v: 3.63, min: 0.6, max: 2, dx: 0.94 },
};
/** I pesi di camminata, corsetta e corsa a velocità v (gli stessi che usa l'animazione), centrati sulle velocità delle clip. */
export function pesi(v) {
  const m = clamp(v / 0.33, 0, 1), r = clamp((v - 3.05) / 0.93, 0, 1), j = clamp((v - 1.32) / 0.8, 0, 1) * (1 - r);
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
  return v > 0.8 && (tocco(0.42) || tocco(0.92)); // poco prima dell'appoggio: il piede che scende spinge la palla
}
