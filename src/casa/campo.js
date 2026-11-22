// Il campo in prospettiva con le carte dei giocatori, per la Sfida e per la Squadra: il disegno dell'erba e il calcolo
// di dove va ogni carta secondo il modulo, e di quanto può essere grande senza coprirne un'altra.
import { CARTA_GRANDE } from '../config.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
// Le linee di un modulo si staccano dove tra un giocatore e il successivo, dalla difesa all'attacco, ci sono più di
// STACCO metri. Chi nel modulo sta a FASCIA metri dal centro, o più, va sul bordo del campo.
const STACCO = 5, FASCIA = 25;
// Carta piccola: è larga al più un LARGO-esimo del campo; lo scudo è alto ALTO volte la sua larghezza, sotto ci sono la
// barretta dell'energia (BARRA) e il nome, alto NOME[1] se lo scudo resta largo almeno GRANDE, se no NOME[0]. Per il nome
// ogni carta ha un posto largo POSTO volte lo scudo, e mai meno di NOME_LARGO (ci sta un cognome di undici lettere).
const PICCOLA = { LARGO: 8.5, ALTO: 1.19, BARRA: 3, NOME: [12, 14], GRANDE: 34, POSTO: 1.7, NOME_LARGO: 58 };
// Carta grande, col nome dentro: larga da `minimo`, perché sotto la riga con stemma, energia e ruolo non ci sta, a
// `massimo`. Il rapporto tra larghezza e altezza è uno solo, quello della foto di riferimento di Alex
// (CARTA_GRANDE.forma). Tra una linea e l'altra resta `aria`, tra due carte vicine `tra`.
const GRANDE = { minimo: 50, massimo: 84, forma: [CARTA_GRANDE.forma, CARTA_GRANDE.forma], ideale: CARTA_GRANDE.forma, aria: 4, tra: 8 };

/** Le linee di un modulo, dal portiere alle punte: per ognuna i giocatori (i: posto nel modulo, x e z: dove sta). */
export function linee(posti) {
  const por = Math.max(0, posti.findIndex((p) => p.ruolo === 'POR')), altri = posti.map((p, i) => ({ i, x: p.x, z: p.z })).filter((g) => g.i !== por).sort((a, b) => a.x - b.x || a.z - b.z);
  const out = [[{ i: por, x: posti[por].x, z: 0 }]];
  altri.forEach((g, k) => { if (!k || g.x - altri[k - 1].x > STACCO) out.push([]); out[out.length - 1].push(g); });
  return out;
}

/**
 * Dove va ogni carta su un campo largo W e alto H. Ogni linea del modulo ha la sua fascia di campo, il portiere in basso
 * e le punte in alto; in alto il campo si stringe, da 50 a `stretto` per cento di mezza larghezza. Sulla stessa linea i
 * giocatori tengono la distanza che hanno nel modulo; se così si toccherebbero si allargano tutti insieme, e se non
 * basta si mettono a distanze uguali.
 * Con `grande` prova la carta grande e, se non ci sta, ripiega sulla piccola.
 * Torna: gw (larghezza della carta), scritta (altezza del nome, per la piccola), grande (se è la carta grande),
 * forma (larghezza diviso altezza della grande), dove (per ogni posto: x e y del centro, posto: larghezza a disposizione).
 */
export function disponi(posti, W, H, { stretto = 43, grande = false } = {}) {
  const ll = linee(posti), fascia = H / ll.length, mezzoA = (y) => (stretto + (50 - stretto) * y / H) / 100 * W, centro = (k) => H - (k + .5) * fascia;
  const P = PICCOLA, G = GRANDE, larga = (nome) => Math.floor(Math.min(W / P.LARGO, (fascia - P.BARRA - nome) / P.ALTO));
  let gw = 0, forma = 0, scritta = 0, tutta = false;
  if (grande) {
    const alta = fascia - G.aria, piuLarga = Math.min(...ll.map((l, k) => 2 * mezzoA(centro(k)) / l.length - G.tra));
    gw = Math.floor(Math.min(Math.max(G.minimo, alta * G.ideale), alta * G.forma[1], piuLarga, G.massimo));
    tutta = gw >= G.minimo; if (tutta) forma = clamp(gw / alta, G.forma[0], G.forma[1]);
  }
  if (!tutta) { scritta = P.NOME[larga(P.NOME[1]) >= P.GRANDE ? 1 : 0]; gw = Math.max(20, larga(scritta)); }
  const dove = [];
  ll.forEach((linea, k) => {
    const y = centro(k), mezzo = mezzoA(y), n = linea.length, posto = Math.min(tutta ? gw + G.tra : Math.max(P.POSTO * gw, P.NOME_LARGO), 2 * mezzo / n), lim = mezzo - posto / 2;
    linea.sort((a, b) => a.z - b.z);
    let xs = linea.map((g) => clamp(g.z / FASCIA, -1, 1) * lim);
    const vicini = Math.min(...xs.slice(1).map((x, j) => x - xs[j]));
    if (vicini < posto) { const f = vicini > 0 ? posto / vicini : 0; xs = f && Math.max(-xs[0], xs[n - 1]) * f <= lim + .5 ? xs.map((x) => x * f) : xs.map((x, j) => (j - (n - 1) / 2) * posto); }
    linea.forEach((g, j) => { dove[g.i] = { x: W / 2 + xs[j], y, posto }; });
  });
  return { gw, scritta, grande: tutta, forma, dove };
}

/**
 * La misura delle carte grandi in una griglia (la panchina): colonne e righe dicono quante ce ne stanno in uno spazio
 * largo W e alto H, con `tra` punti tra una e l'altra. Torna gw e forma come `disponi`, e grande falso se non ci stanno.
 */
export function misuraGriglia(W, H, colonne, righe, tra = 6) {
  const G = GRANDE, alta = (H - tra * (righe - 1)) / righe, piuLarga = (W - tra * (colonne - 1)) / colonne;
  const gw = Math.floor(Math.min(Math.max(G.minimo, alta * G.ideale), alta * G.forma[1], piuLarga, G.massimo));
  if (gw >= G.minimo) return { gw, grande: true, forma: clamp(gw / alta, G.forma[0], G.forma[1]), scritta: 0 };
  return { gw: Math.max(20, Math.floor(Math.min(piuLarga / PICCOLA.POSTO, (alta - PICCOLA.BARRA - PICCOLA.NOME[0]) / PICCOLA.ALTO))), grande: false, forma: 0, scritta: PICCOLA.NOME[0] };
}

/**
 * Il disegno del campo in prospettiva: erba a strisce, linee di bordo e di metà campo, cerchio, le due aree. `stretto`
 * è la mezza larghezza in alto, in percento (in basso è 50): lo stesso numero che si dà a `disponi`.
 */
export function erba(stretto = 43) {
  const x = (u, v) => (50 + u * (stretto + (50 - stretto) * (1 - v))).toFixed(2), y = (v) => (100 * (1 - v)).toFixed(2), p = (u, v) => `${x(u, v)} ${y(v)}`;
  const quadro = (u, v0, v1) => `M${p(-u, v0)}L${p(-u, v1)}L${p(u, v1)}L${p(u, v0)}`, STRISCE = 8, B = .94;
  const strisce = Array.from({ length: STRISCE }, (_, i) => `<path d="M${p(-1, i / STRISCE)}L${p(1, i / STRISCE)}L${p(1, (i + 1) / STRISCE)}L${p(-1, (i + 1) / STRISCE)}z" fill="${i % 2 ? '#267F3C' : '#1F6F33'}"/>`).join('');
  const righe = `M${p(-B, .025)}L${p(-B, .975)}L${p(B, .975)}L${p(B, .025)}zM${p(-B, .5)}L${p(B, .5)}${quadro(.46, .025, .19)}${quadro(.2, .025, .085)}${quadro(.46, .975, .81)}${quadro(.2, .975, .915)}`;
  return `<svg class="erbaP" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${strisce}<path d="${righe}" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.6" vector-effect="non-scaling-stroke"/>`
    + `<ellipse cx="50" cy="50" rx="${(.19 * (stretto + (50 - stretto) * .5)).toFixed(2)}" ry="8.5" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg>`;
}
