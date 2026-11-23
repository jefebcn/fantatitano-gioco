// Valutazioni e statistiche mostrate: una sola conversione (scala) per tutti i numeri delle carte dei giocatori.
// La forza usata in partita (la quotazione nei dati delle squadre) non si tocca: qui si decide solo cosa si vede.
// I numeri stanno in src/config.js, alle voci SCALA e CARTE. I ruoli precisi, il piede e l'altezza stanno in
// src/dati/giocatori.js.
import { SCALA, CARTE, CARTA, FORMS, HL, HW } from '../config.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
/** Lo stesso numero dal nome che usa la partita (per avere sempre gli stessi valori dallo stesso giocatore). */
export const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

/**
 * LA conversione: da un valore interno al numero mostrato. Vale per la valutazione e per ogni statistica.
 * È fatta di segmenti tra i punti di SCALA.punti ed è sempre crescente; fuori dai punti continua con la pendenza
 * dell'ultimo segmento.
 */
export function scala(x) {
  const P = SCALA.punti; let i = 1;
  while (i < P.length - 1 && x > P[i][0]) i++;
  const [x0, y0] = P[i - 1], [x1, y1] = P[i];
  return y0 + (x - x0) * (y1 - y0) / (x1 - x0);
}
/** Di quanto una statistica si scosta dal profilo del ruolo, giocatore per giocatore (sempre uguale per lo stesso nome). */
export const rumore = (seme, chiave) => (hash(seme + chiave) % (SCALA.rumore * 2 + 1)) - SCALA.rumore;
/** Il metallo della carta, cioè la rarità: bronzo, argento o oro secondo la valutazione. */
export const fascia = (val) => Object.keys(CARTA.rarita).find((nome) => val >= CARTA.rarita[nome].da) || 'bronzo';
/** Colore di una statistica: rosso (bassa), giallo (media), verde (alta). */
export const coloreStat = (v) => (v >= SCALA.colori[1] ? 'verde' : v >= SCALA.colori[0] ? 'giallo' : 'rosso');
const chiaviDi = (ruolo) => CARTE.chiavi[ruolo === 'POR' ? 'P' : 'G'];
const pesata = (valori, ruolo) => { const p = CARTE.ruoli[ruolo].pesi; let s = 0, n = 0; chiaviDi(ruolo).forEach((k, i) => { s += valori[i] * (p[k] || 0); n += p[k] || 0; }); return s / n; };

/**
 * Le otto statistiche mostrate di un giocatore e la valutazione che ne esce.
 * Si parte dal valore interno del giocatore, si aggiungono il profilo del ruolo e lo scarto personale, si converte ogni
 * statistica con `scala` e si fa la media pesata secondo il ruolo. Il profilo viene spostato tutto insieme finché la
 * media pesata delle statistiche mostrate dà proprio la valutazione del giocatore: valutazione e statistiche non
 * possono contraddirsi, e chi è più forte in partita ha sempre la valutazione più alta (o uguale).
 */
export function statistiche(seme, ruolo, interno) {
  const R = CARTE.ruoli[ruolo], chiavi = chiaviDi(ruolo), grezzo = chiavi.map((k) => (R.doti[k] || 0) + rumore(seme, k));
  const centro = pesata(grezzo, ruolo), voluta = Math.round(scala(interno));
  const mostra = (d) => grezzo.map((g) => clamp(Math.round(scala(interno + g - centro + d)), SCALA.stat[0], SCALA.stat[1]));
  let d = 0, out = mostra(0);
  for (let i = 0; i < 80 && Math.round(pesata(out, ruolo)) !== voluta; i++) { d += voluta - pesata(out, ruolo); out = mostra(d); }
  // l'ultimo punto, se serve: si ritocca la statistica che pesa di più
  const forte = chiavi.reduce((a, k, i) => ((R.pesi[k] || 0) > (R.pesi[chiavi[a]] || 0) ? i : a), 0);
  for (let i = 0; i < 20 && Math.round(pesata(out, ruolo)) !== voluta; i++) out[forte] += Math.sign(voluta - pesata(out, ruolo));
  return { val: Math.round(pesata(out, ruolo)), stat: chiavi.map((k, i) => [k, out[i]]) };
}

/** 0 = il suo ruolo, 1 = ruolo vicino (rende quasi uguale), 2 = fuori ruolo. */
export function adatto(ruolo, posto) {
  if (ruolo === posto) return 0;
  return CARTE.simili.some(([a, b]) => (a === ruolo && b === posto) || (b === ruolo && a === posto)) ? 1 : 2;
}

/**
 * Il ruolo preciso di un posto del modulo, letto dalla sua posizione (FORMS in src/config.js): così un modulo nuovo
 * aggiunto là funziona da solo. `reparto` è la lettera del modulo (P, D, C, A), x e z le coordinate in metri.
 */
export function ruoloPosto(reparto, x, z) {
  const P = CARTE.posto, nx = x / HL * 50, nz = z / HW * 32, lato = nz < 0 ? 'S' : 'D';
  if (reparto === 'P') return 'POR';
  if (reparto === 'D') return Math.abs(nz) >= P.largo ? `T${lato}` : 'DC';
  if (reparto === 'A') return Math.abs(nz) >= P.largo ? `A${lato}` : 'ATT';
  if (Math.abs(nz) >= P.largoC) return nx <= P.basso ? `T${lato}` : `A${lato}`;
  return nx <= P.cdc ? 'CDC' : nx >= P.coc ? 'COC' : 'CC';
}
/** I moduli che la partita conosce, nell'ordine di FORMS: quelli nuovi compaiono qui da soli. */
export const moduli = () => Object.keys(FORMS);
/** Gli undici posti di un modulo: ruolo preciso, reparto e posizione. */
export const postiModulo = (nome) => { const f = FORMS[nome] || FORMS['4-3-3']; return f.pos.map(([x, z], i) => ({ ruolo: ruoloPosto(f.roles[i], x, z), reparto: f.roles[i], x, z })); };

/**
 * Prepara le funzioni che dipendono dai dati delle squadre.
 * clubs: le squadre come in public/data.js (rose di partenza); giocatori: l'elenco di src/dati/giocatori.js.
 * crescita: se c'è, dato un giocatore e il suo club dice di quanto sono salite le sue statistiche con gli allenatori
 * (un oggetto statistica → punti), o niente.
 */
export function creaDati(clubs, giocatori, crescita = null) {
  // dal più debole al più forte di ogni reparto, riserve comprese: nessuno resta schiacciato sul minimo
  const estremi = {};
  for (const c of clubs) for (const x of (c.xi0 || c.xi).concat(c.pan0 || c.pan || [])) { const e = estremi[x[1]] || (estremi[x[1]] = [x[3], x[3]]); e[0] = Math.min(e[0], x[3]); e[1] = Math.max(e[1], x[3]); }
  /** Il valore interno di un giocatore dal reparto e dalla quotazione (quella che usa la partita). */
  // sotto la quotazione del più debole giocatore vero (i giocatori inventati delle divisioni basse) si scende fino a
  // SCALA.basso, che è il valore di chi ha quotazione 1
  const interno = (reparto, q) => { const [a, b] = estremi[reparto], [lo, hi] = SCALA.interno; return q >= a ? lo + (q - a) / (b - a || 1) * (hi - lo) : lo - (a - q) / (a - 1) * (lo - SCALA.basso); };
  /** La quotazione che dà proprio quella valutazione mostrata: il contrario di `valore`. Può avere i decimali. */
  const quotazione = (reparto, val) => {
    const x = scalaInversa(val), [a, b] = estremi[reparto], [lo, hi] = SCALA.interno;
    return Math.round(clamp(x >= lo ? a + (x - lo) / (hi - lo) * (b - a) : a - (lo - x) / (lo - SCALA.basso) * (a - 1), 1, 99) * 1000) / 1000;
  };
  /** La valutazione mostrata: stessa firma della vecchia funzione, dipende solo da reparto e quotazione. */
  const valore = (reparto, q) => Math.round(scala(interno(reparto, q)));
  // dove trovare un giocatore: per squadra di partenza e nome, e per nome e reparto (per chi ha cambiato squadra)
  const perClub = new Map(), perNome = new Map();
  for (const [club, lista] of Object.entries(giocatori)) for (const g of lista) { const v = { club, nome: g[0], ruolo: g[1], piede: g[2], altezza: g[3] }; perClub.set(`${club}/${g[0]}`, v); const k = `${g[0]}/${CARTE.ruoli[g[1]].reparto}`; if (!perNome.has(k)) perNome.set(k, v); }
  const ripiego = { P: 'POR', D: 'DC', C: 'CC', A: 'ATT' };
  /** Ruolo, piede e altezza di un giocatore `x` ([nome, reparto, numero, quotazione]) che oggi sta nel club `clubId`. */
  const anagrafe = (x, clubId) => perClub.get(`${x[4] || clubId}/${x[0]}`) || perNome.get(`${x[0]}/${x[1]}`) || inventato(x[0], x[1]) || { club: clubId, nome: x[0], ruolo: ripiego[x[1]], piede: 'D', altezza: 180 };
  /**
   * Tutto quello che serve a disegnare la carta di un giocatore. Se il giocatore è cresciuto con gli allenatori
   * (`crescita` dice di quanto, statistica per statistica) le statistiche salgono e la valutazione si rifà da quelle;
   * `base` resta la valutazione senza allenatori.
   */
  const scheda = (x, clubId) => {
    const a = anagrafe(x, clubId), s = statistiche(`${a.club}/${a.nome}`, a.ruolo, interno(x[1], x[3])), cr = crescita ? crescita(x, clubId) : null;
    const stat = cr ? s.stat.map(([k, v]) => [k, Math.min(SCALA.stat[1], v + (cr[k] || 0))]) : s.stat, val = cr ? Math.max(s.val, Math.round(pesata(stat.map((v) => v[1]), a.ruolo))) : s.val;
    const forte = stat.reduce((m, v) => (v[1] > m[1] ? v : m))[0], migliorato = !!cr && Object.values(cr).some((v) => v > 0);
    return { nome: x[0], numero: x[2], reparto: x[1], ruolo: a.ruolo, piede: a.piede, altezza: a.altezza, val, base: s.val, migliorato, stat, forte, fascia: fascia(val), origine: a.club };
  };
  /** La valutazione di un giocatore messo in un altro posto: stesse statistiche, pesi del posto. */
  const valoreIn = (sc, posto) => {
    if (posto === sc.ruolo) return sc.val;
    if ((posto === 'POR') !== (sc.ruolo === 'POR')) return SCALA.stat[0];
    return Math.min(sc.val, Math.round(pesata(sc.stat.map((v) => v[1]), posto)));
  };
  /**
   * I candidati di «Ingaggia il tuo capitano»: uno per ruolo, con la valutazione tra SCALA.capitani.min e max e un
   * punto forte diverso dagli altri dove si può. `escluso` è il club dell'utente.
   */
  const candidatiCapitano = (escluso) => {
    const C = SCALA.capitani, tutti = [];
    for (const c of clubs) if (c.id !== escluso) (c.xi0 || c.xi).forEach((x, i) => { const s = scheda(x, c.id); if (s.val >= C.min && s.val <= C.max) tutti.push({ club: c.id, i, x, s }); });
    // quanto il punto forte stacca la seconda statistica: più stacca, più si riconosce
    const stacco = (s) => { const v = s.stat.map((x) => x[1]).sort((a, b) => b - a); return v[0] - v[1]; };
    const out = [], forti = new Set();
    // prima i ruoli con meno scelta; per ogni ruolo chi ha un punto forte che gli altri non hanno, e che stacca di più
    const perRuolo = Object.keys(CARTE.ruoli).map((r) => tutti.filter((t) => t.s.ruolo === r)).filter((l) => l.length).sort((a, b) => a.length - b.length);
    for (const lista of perRuolo) {
      const voto = (t) => (forti.has(t.s.forte) ? 0 : 1000) + stacco(t.s) * 10 + t.s.val + (hash(t.s.nome) % 10) / 100;
      const t = lista.reduce((m, v) => (voto(v) > voto(m) ? v : m));
      out.push(t); forti.add(t.s.forte);
    }
    // se i ruoli coperti sono più dei candidati che servono, esce chi ha il punto forte meno suo; l'ordine è quello dei ruoli
    const doppio = (t) => out.filter((o) => o.s.forte === t.s.forte).length > 1;
    while (out.length > C.quanti) out.splice(out.indexOf(out.reduce((m, v) => ((doppio(v) ? 0 : 1000) + stacco(v.s) * 10 + v.s.val < (doppio(m) ? 0 : 1000) + stacco(m.s) * 10 + m.s.val ? v : m))), 1);
    const ordine = Object.keys(CARTE.ruoli);
    return out.sort((a, b) => ordine.indexOf(a.s.ruolo) - ordine.indexOf(b.s.ruolo));
  };
  return { estremi, interno, valore, quotazione, anagrafe, scheda, valoreIn, candidatiCapitano };
}

/** Il contrario di `scala`: dal numero mostrato al valore interno. */
export function scalaInversa(y) {
  const P = SCALA.punti; let i = 1;
  while (i < P.length - 1 && y > P[i][1]) i++;
  const [x0, y0] = P[i - 1], [x1, y1] = P[i];
  return x0 + (y - y0) * (x1 - x0) / (y1 - y0);
}

/**
 * Ruolo preciso, piede e altezza di un giocatore inventato (quelli delle divisioni sotto il Campionato Sammarinese):
 * escono dal nome e dal reparto, sempre uguali, così restano gli stessi in ogni squadra e anche in partita, dove del
 * giocatore arrivano solo nome, reparto, numero e quotazione.
 */
export function inventato(nome, reparto) {
  const ruoli = Object.keys(CARTE.ruoli).filter((r) => CARTE.ruoli[r].reparto === reparto); if (!ruoli.length) return null;
  const h = hash(`${nome}/${reparto}`), A = CARTE.altezze[reparto] || CARTE.altezze.C;
  return { club: 'inv', nome, ruolo: ruoli[h % ruoli.length], piede: ((h >>> 8) % 100) / 100 < CARTE.sinistri ? 'S' : 'D', altezza: A[0] + ((h >>> 16) % (A[1] - A[0] + 1)) };
}
