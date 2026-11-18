/* Contrasti, senza grafica: si prova da solo (scripts/prova-fisica.mjs) e game.js lo usa per i duelli spalla a spalla e
   per la scivolata. I giocatori sono oggetti semplici { x, z, vx, vz, dir, massa, en }. */

const hyp = Math.hypot, clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ---------------------------------------------------------------- spalla a spalla */

// Duelli: sotto `vicini` metri due avversari in corsa si toccano. Conta la forza (massa, velocità, freschezza): chi ne ha di
// più sposta l'altro e lo sbilancia per un attimo (meno velocità, meno controllo della palla).
export const DUELLO = { vicini: 0.95, corsa: 3, paralleli: 0.35, spinta: 14, sbilancio: 0.45, perde: 0.32 }; // spinta in m/s² finché ci si tocca

/** La forza di un giocatore nel duello: massa, quanto è lanciato, quanto è fresco (e se è già sbilanciato). */
export function forza(p) {
  const v = hyp(p.vx, p.vz);
  return ((p.massa || 75) / 75) * (0.6 + 0.4 * Math.min(1, v / 8)) * (0.7 + 0.3 * clamp(p.en === undefined ? 1 : p.en, 0, 1)) * (p.sbil > 0 ? 0.8 : 1);
}

/**
 * Due avversari a e c troppo vicini: li separa (chi è più forte si sposta meno) e, se corrono affiancati, il più forte
 * sbilancia l'altro (dt: durata del passo, per spingere uguale a ogni frame rate). Risponde null se non si toccano,
 * altrimenti { vince, perde, quanto } con quanto da 0 a 1.
 */
export function duello(a, c, dt = 1 / 60) {
  const D = DUELLO, dx = c.x - a.x, dz = c.z - a.z, d = hyp(dx, dz);
  if (d >= D.vicini || d < 1e-3) return null;
  const fa = forza(a), fc = forza(c), wa = fa / (fa + fc), sovrap = D.vicini - d, nx = dx / d, nz = dz / d;
  // ci si separa: il più forte resta dov'è, il più debole viene spostato
  a.x -= nx * sovrap * (1 - wa); a.z -= nz * sovrap * (1 - wa); c.x += nx * sovrap * wa; c.z += nz * sovrap * wa;
  const va = hyp(a.vx, a.vz), vc = hyp(c.vx, c.vz);
  if (va < D.corsa || vc < D.corsa || (a.vx * c.vx + a.vz * c.vz) / (va * vc) < D.paralleli) return { vince: null, perde: null, quanto: 0 };
  const [vince, perde, fv, fp, s] = fa >= fc ? [a, c, fa, fc, 1] : [c, a, fc, fa, -1];
  const quanto = clamp((fv - fp) / (fv + fp) * 3, 0, 1); // 0: pari; 1: nettamente più forte
  if (quanto < 0.05) return { vince: null, perde: null, quanto: 0 };
  perde.vx += nx * s * D.spinta * quanto * dt; perde.vz += nz * s * D.spinta * quanto * dt; // spinto di lato, via dal vincitore
  perde.sbil = Math.max(perde.sbil || 0, D.sbilancio * quanto);
  return { vince, perde, quanto };
}

/* ---------------------------------------------------------------- scivolata */

// La scivolata: si parte a `v0` (almeno la velocità che si ha, un po' di più) e l'erba frena (attrito). Le gambe colpiscono
// solo nella parte centrale (da `attiva` a `fine`, in secondi), quando il piede è tutto avanti: lungo la gamba, da `anca` a
// `piede` metri davanti al bacino, con uno spessore `raggio`. Tempi e misure vengono dall'animazione del modello.
export const SCIVOLATA = { v0: 8.5, spinta: 1.1, attrito: 2.2, durata: 0.75, attiva: 0.16, fine: 0.62, anca: 0.2, piede: 1.25, raggio: 0.38, giuPalla: 0.75, uomo: 0.5, dopo: 0.12 };

/** Distanza del punto (px, pz) dal segmento da (ax, az) a (bx, bz). */
export function distSegmento(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz, t = l2 > 0 ? clamp(((px - ax) * dx + (pz - az) * dz) / l2, 0, 1) : 0;
  return hyp(px - ax - dx * t, pz - az - dz * t);
}
/** La gamba tesa di chi scivola: il segmento da anca a piede nella direzione della scivolata. */
export function gamba(p) {
  const S = SCIVOLATA, fx = Math.sin(p.dir), fz = Math.cos(p.dir);
  return [p.x + fx * S.anca, p.z + fz * S.anca, p.x + fx * S.piede, p.z + fz * S.piede];
}
/** Velocità di scivolata dopo t secondi, partendo a v0: frena l'erba. */
export const velScivolata = (v0, t) => v0 * Math.exp(-SCIVOLATA.attrito * t);
/** La gamba tocca il pallone (basso) in questo momento? */
export function toccaPalla(p, b) {
  const S = SCIVOLATA; if (p.stT < S.attiva || p.stT > S.fine || b.y > S.giuPalla) return false;
  const g = gamba(p); return distSegmento(b.x, b.z, g[0], g[1], g[2], g[3]) < S.raggio + 0.11;
}
/** La gamba prende l'avversario o? */
export function toccaUomo(p, o) {
  const S = SCIVOLATA; if (p.stT < S.attiva || p.stT > S.fine) return false;
  const g = gamba(p); return distSegmento(o.x, o.z, g[0], g[1], g[2], g[3]) < S.uomo;
}
/** Da dietro: chi scivola arriva alle spalle di o (rispetto a dove o guarda). */
export function daDietro(p, o) {
  const dx = p.x - o.x, dz = p.z - o.z, d = hyp(dx, dz) || 1, ov = hyp(o.vx, o.vz);
  const fx = ov > 1 ? o.vx / ov : Math.sin(o.dir), fz = ov > 1 ? o.vz / ov : Math.cos(o.dir);
  return (dx * fx + dz * fz) / d < -0.3;
}
/**
 * Dove va il pallone colpito in scivolata: avanti nella direzione della gamba con la spinta della scivolata, più una parte
 * del moto che aveva (se arrivava contro la gamba rimbalza un po'), più un po' di caso di lato. `caso` dà numeri tra 0 e 1.
 */
export function deviazione(p, b, caso = Math.random) {
  const fx = Math.sin(p.dir), fz = Math.cos(p.dir), v = hyp(p.vx, p.vz), contro = b.vx * fx + b.vz * fz;
  const k = v * 0.7 + 3 + Math.max(0, -contro) * 0.35, lato = (caso() * 2 - 1) * 2.4;
  return { vx: fx * k - fz * lato + (b.vx - contro * fx) * 0.3, vz: fz * k + fx * lato + (b.vz - contro * fz) * 0.3, vy: 0.3 + caso() * 1.2 };
}
