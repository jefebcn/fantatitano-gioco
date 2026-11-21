// La rosa del club vista dalle schermate: quanto rende un giocatore in un posto, quali sono gli undici migliori per un
// modulo, chi tira rigori, punizioni e calci d'angolo quando non l'ha scelto l'utente.
import * as CAR from '../carriera.js';
import { CARTE } from '../config.js';
import { adatto } from '../dati/scala.js';

/** Quanto rende un giocatore in un posto: la valutazione, meno qualcosa se non è il suo ruolo e se è stanco. */
export function resa(sc, ruoloPosto, energia) {
  const M = CARTE.migliore, f = adatto(sc.ruolo, ruoloPosto);
  return sc.val - (f === 1 ? M.vicino : f === 2 ? M.fuori : 0) - (100 - energia) * M.energia;
}
// in porta va solo un portiere, e un portiere va solo in porta
const puo = (g, posto) => (posto.ruolo === 'POR') === (g.sc.reparto === 'P');
const vale = (g, posto) => (puo(g, posto) ? resa(g.sc, posto.ruolo, g.energia) : -1e6);

/**
 * Gli undici migliori per un modulo. `giocatori`: tutta la rosa, prima i titolari nell'ordine dei posti e poi gli
 * altri, ognuno con sc (la scheda) ed energia. `posti`: i posti del modulo, col ruolo.
 * Parte dalla formazione che c'è e la migliora finché uno scambio (tra due titolari, o tra un titolare e uno fuori)
 * la fa rendere di più: se non ce ne sono, la formazione è già la migliore.
 * Torna: ordine (per ogni posto, quale giocatore dell'elenco), fuori (gli altri, dal più forte), cambiata (vero se è
 * diversa da quella di partenza).
 */
export function squadraMigliore(giocatori, posti) {
  const n = posti.length, dentro = giocatori.map((_, i) => i).slice(0, n), fuori = giocatori.map((_, i) => i).slice(n), v = (i, k) => vale(giocatori[i], posti[k]);
  let cambiata = false, mosso = true;
  for (let giri = 0; mosso && giri < 200; giri++) {
    mosso = false;
    for (let a = 0; a < n; a++) {
      for (let b = a + 1; b < n; b++) if (v(dentro[b], a) + v(dentro[a], b) > v(dentro[a], a) + v(dentro[b], b) + 1e-9) { [dentro[a], dentro[b]] = [dentro[b], dentro[a]]; mosso = cambiata = true; }
      for (let f = 0; f < fuori.length; f++) if (v(fuori[f], a) > v(dentro[a], a) + 1e-9) { [dentro[a], fuori[f]] = [fuori[f], dentro[a]]; mosso = cambiata = true; }
    }
  }
  const REPARTI = 'PDCA';
  fuori.sort((a, b) => REPARTI.indexOf(giocatori[a].sc.reparto) - REPARTI.indexOf(giocatori[b].sc.reparto) || giocatori[b].sc.val - giocatori[a].sc.val || giocatori[a].sc.nome.localeCompare(giocatori[b].sc.nome));
  return { ordine: dentro, fuori, cambiata };
}

// la statistica che conta per ogni incarico: chi tira meglio i rigori, chi calcia e passa meglio le punizioni, chi passa
// meglio gli angoli; il capitano è il più forte
const DOTE = { capitano: (sc) => sc.val, rigori: (sc, s) => s.TIR || 0, punizioni: (sc, s) => (s.TIR || 0) + (s.PAS || 0), angoli: (sc, s) => s.PAS || 0 };
/**
 * Chi ha ogni incarico tra i titolari (`schede`: le loro schede, nell'ordine dei posti): quello scelto dall'utente se è
 * ancora in campo, se no il più adatto tra i giocatori di movimento. Torna i nomi: capitano, rigori, punizioni, angoli.
 */
export function incarichi(C, clubs, schede) {
  const out = {};
  for (const tipo of CAR.INCARICHI) {
    const scelto = CAR.incaricato(C, clubs, tipo); if (scelto) { out[tipo] = scelto; continue; }
    // il capitano scelto all'inizio, se è finito in panchina, non ha un sostituto: la fascia resta sua
    if (tipo === 'capitano' && (C.mio || {}).capitano) { out[tipo] = null; continue; }
    const adatti = schede.filter((sc) => sc.reparto !== 'P').map((sc) => ({ sc, p: DOTE[tipo](sc, Object.fromEntries(sc.stat)) })).sort((a, b) => b.p - a.p || a.sc.nome.localeCompare(b.sc.nome));
    out[tipo] = adatti.length ? adatti[0].sc.nome : null;
  }
  return out;
}
