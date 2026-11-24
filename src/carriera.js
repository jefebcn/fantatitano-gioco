/* Carriera: cinque divisioni (DIVISIONI in src/config.js), si parte dall'ultima. In ognuna un campionato a 16 squadre (15
   giornate, girone unico), la Coppa Titano a eliminazione diretta e il Trofeo dei Castelli a gironi. A fine stagione si
   sale con tre obiettivi su quattro e si scende arrivando tra le ultime due. Poi: sfide giornaliere, settimanali, di
   carriera e di stagione, percorso premi, mercato (lista trasferimenti, osservatore, agente, offerte a tempo),
   allenatori da usare sui giocatori, strutture del club, monete e diamanti, statistiche e trofei.
   Qui c'è solo la logica, senza schermate: lo stato è un oggetto semplice che si salva così com'è sul dispositivo e, con
   l'accesso, anche sull'account (vedi cloud.js). */
import { ECONOMIA, METEO, DIVISIONI, STAGIONE } from './config.js';

export const KEY = 'fantatitano-carriera';
export const TURNI = ['Ottavi di finale', 'Quarti di finale', 'Semifinale', 'Finale'];
// Trofeo dei Castelli, dopo i gironi
export const TURNI_KO = ['Quarti di finale', 'Semifinale', 'Finale'];
/** Le strutture del club, le rarità e le categorie degli allenatori: i numeri stanno in ECONOMIA (src/config.js). */
export const STRUTTURE = ['centro', 'infermeria', 'foresteria', 'commerciale', 'osservatori', 'curva', 'stadio'];
export const RARITA = ['comune', 'raro', 'leggendario'];
export const CATEGORIE = ['tecnico', 'fisico', 'difesa', 'portieri'];
// quanto spesso esce ogni categoria quando un allenatore arriva in premio
const PESI_CATEGORIE = [['tecnico', .35], ['fisico', .35], ['difesa', .2], ['portieri', .1]];

/* Le squadre inventate delle divisioni basse e chi fabbrica i giocatori (src/dati/divisioni.js) arrivano da fuori, così
   questo file non dipende dalle schermate. La fabbrica ha: perDiv (le squadre di ogni divisione), inizio (la rosa di
   partenza), nuovoGiocatore, reali (i giocatori veri tra due valutazioni), scheda (valutazione e statistiche). */
let ALTRE = [], FABBRICA = null;
/** Dice alla carriera quali squadre esistono oltre a quelle vere e chi fabbrica i giocatori. */
export function registra(altre, fabbrica) { ALTRE = altre || []; FABBRICA = fabbrica || null; }
const tutte = (clubs) => (ALTRE.length ? clubs.concat(ALTRE) : clubs);
const trova = (clubs, id) => clubs.find((c) => c.id === id) || ALTRE.find((c) => c.id === id);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
// un numero tra 0 e 1 sempre uguale per la stessa scritta: serve a far uscire dal mercato gli stessi giocatori a ogni apertura
const caso = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } h ^= h >>> 15; h = Math.imul(h, 2246822519); h ^= h >>> 13; return (h >>> 0) / 4294967296; };

/** La divisione in cui si gioca (una riga di DIVISIONI) e le sue squadre, club dell'utente compreso. */
export const divisione = (C) => DIVISIONI[(C.div || 1) - 1];
export const lega = (C, clubs) => (C.squadre ? C.squadre.map((id) => trova(clubs, id)).filter(Boolean) : clubs);
/** Quante monete vale una vittoria nella divisione in cui si gioca. */
export const vittoria = (C) => divisione(C).vittoria;
/** Un importo scritto «in vittorie» in monete della divisione in cui si gioca, arrotondato. */
export const inMonete = (C, v) => { const a = ECONOMIA.premi.arrotonda; return v ? Math.max(a, Math.round(v * vittoria(C) / a) * a) : 0; };

// Le sfide. m è il contatore che le fa avanzare, n quanto serve, v il premio in vittorie (monete della divisione), gemme
// i diamanti. Giornaliere e settimanali ripartono da zero, quelle di stagione a ogni stagione
export const SFIDE = {
  d: [
    { id: 'd1', t: 'Gioca una partita', m: 'gioca', n: 1, v: .15 },
    { id: 'd2', t: 'Vinci una partita', m: 'vinte', n: 1, v: .25 },
    { id: 'd3', t: 'Segna 3 gol', m: 'gol', n: 3, v: .2 },
    { id: 'd4', t: 'Chiudi una partita senza subire gol', m: 'inviolate', n: 1, v: .25 },
    { id: 'd5', t: 'Gioca una partita di coppa', m: 'coppa', n: 1, v: .15 },
  ],
  w: [
    { id: 'w1', t: 'Vinci 5 partite', m: 'vinte', n: 5, v: 1 },
    { id: 'w2', t: 'Segna 12 gol', m: 'gol', n: 12, v: .75 },
    { id: 'w3', t: 'Gioca 3 partite di coppa', m: 'coppa', n: 3, v: .75 },
    { id: 'w4', t: 'Compra un giocatore al mercato', m: 'acquisti', n: 1, v: .5 },
    { id: 'w5', t: 'Usa 3 allenatori', m: 'allenamenti', n: 3, v: .5 },
  ],
  c: [
    { id: 'c1', t: 'Arriva nel Campionato Sammarinese', m: 'cima', n: 1, gemme: 50 },
    { id: 'c2', t: 'Vinci la Coppa Titano', m: 'coppe', n: 1, gemme: 30 },
    { id: 'c3', t: 'Vinci il Trofeo dei Castelli', m: 'castelli', n: 1, gemme: 30 },
    { id: 'c4', t: 'Porta una struttura a 3 stelle', m: 'stelle', n: 3, gemme: 20 },
  ],
  s: [
    { id: 's1', t: 'Vinci 5 partite di campionato', m: 'vinteCamp', n: 5, v: .75 },
    { id: 's2', t: 'Vinci 10 partite di campionato', m: 'vinteCamp', n: 10, v: 1.5 },
    { id: 's3', t: 'Chiudi il campionato tra le prime 4', m: 'top4', n: 1, gemme: 10 },
    { id: 's4', t: 'Segna 25 gol in campionato', m: 'golCamp', n: 25, v: 1 },
    { id: 's5', t: 'Arriva ai quarti di Coppa Titano', m: 'quarti', n: 1, v: .75 },
    { id: 's6', t: 'Passa i gironi del Trofeo dei Castelli', m: 'gironi', n: 1, v: .75 },
    { id: 's7', t: 'Chiudi 3 partite senza subire gol', m: 'inviolate', n: 3, v: .75 },
    { id: 's8', t: 'Vinci 3 partite di fila', m: 'serieMax', n: 3, gemme: 10 },
  ],
};
// tutte le giornaliere fatte: un allenatore comune; tutte le settimanali: diamanti e un allenatore raro
export const BONUS = { d: { allenatore: 'comune' }, w: { gemme: ECONOMIA.diamanti.settimana, allenatore: 'raro' } };
export const GRUPPI = { d: 'Giornaliere', w: 'Settimanali', c: 'Carriera', s: 'Stagione' };

const mescola = (a, rnd) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function poisson(l, rnd) { const L = Math.exp(-l); let k = 0, p = 1; do { k++; p *= rnd(); } while (p > L); return k - 1; }
// la forza di una squadra nelle partite simulate: le stelle, o per le squadre inventate il numero preciso da cui escono
const forza = (clubs, id) => { const c = trova(clubs, id) || { str: 3 }; return c.forza || c.str; };

/** Risultato di una partita non giocata dall'utente: più gol a chi è più forte, un piccolo vantaggio a chi gioca in casa. */
export function simula(clubs, casa, fuori, rnd = Math.random) {
  const a = forza(clubs, casa), b = forza(clubs, fuori);
  return [poisson(1.25 * Math.pow(a / b, .65) + .15, rnd), poisson(1.25 * Math.pow(b / a, .65), rnd)];
}

/** Calendario a girone unico col metodo del cerchio: 15 giornate da 8 partite, ognuno incontra tutti una volta. */
export function calendario(ids, rnd = Math.random) {
  const t = mescola(ids, rnd), n = t.length, cal = [];
  for (let r = 0; r < n - 1; r++) {
    const g = [];
    for (let i = 0; i < n / 2; i++) { const a = t[i], b = t[n - 1 - i]; g.push((i ? i : r) % 2 ? [b, a] : [a, b]); } // casa e trasferta si alternano perché a ogni giornata si scala di un posto
    cal.push(g); t.splice(1, 0, t.pop());
  }
  return cal;
}

function nuovaCoppa(ids, rnd) { return { turno: 0, squadre: mescola(ids, rnd), storia: [], fuori: null, vinta: false, campione: null }; }
// Trofeo dei Castelli: quattro gironi da quattro, tre giornate di sola andata; le prime due di ogni girone vanno ai quarti
function nuoviCastelli(ids, rnd) { const t = mescola(ids, rnd); return { gironi: [0, 1, 2, 3].map((g) => t.slice(g * 4, g * 4 + 4)), giornata: 0, ris: [], ko: null, fuori: null, vinta: false, campione: null }; }
// Chi gioca con chi nelle tre giornate: indici nel girone, il primo è in casa
const GIRO = [[[0, 1], [2, 3]], [[0, 2], [3, 1]], [[3, 0], [1, 2]]];
const idCarriera = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
function nuoveSfide() { return { d: { chiave: '', c: {} }, w: { chiave: '', c: {} }, s: { chiave: 1, c: {} }, presi: {} }; }
const allenatoriVuoti = () => Object.fromEntries(RARITA.map((r) => [r, Object.fromEntries(CATEGORIE.map((c) => [c, 0]))]));
const mercatoVuoto = () => ({ n: 0, rinnovi: 0, lista: null, osservato: null, agente: null, offerte: { chiave: '', prese: [] } });
// le squadre di una divisione più il club dell'utente; nelle prove senza squadre inventate sono tutte quelle date
const squadreDi = (div, clubId, clubs) => (FABBRICA ? FABBRICA.perDiv[div].concat(clubId) : clubs.map((c) => c.id));
// calendario e coppe di una stagione nuova, con le squadre della divisione in cui si è
function apriStagione(C, rnd) { const ids = C.squadre; C.giornata = 0; C.cal = calendario(ids, rnd); C.ris = []; C.coppa = nuovaCoppa(ids, rnd); C.castelli = nuoviCastelli(ids, rnd); C.campione = null; }

/** Una carriera nuova: ultima divisione, la rosa di partenza, monete e diamanti d'inizio, strutture a zero stelle. */
export function nuova(clubs, nome, clubId, rnd = Math.random, mio = null) {
  const I = ECONOMIA.inizio, div = DIVISIONI.length;
  const C = { v: 2, id: idCarriera(), rev: 0, agg: Date.now(), nome: String(nome || 'Mister').slice(0, 18), club: clubId, mio, stagione: 1, div, squadre: squadreDi(div, clubId, clubs),
    stat: { g: 0, v: 0, n: 0, p: 0, gf: 0, gs: 0, marc: {} }, trofei: [], storia: [], monete: I.monete, gemme: I.diamanti, stadio: 1, strutture: Object.fromEntries(STRUTTURE.map((s) => [s, 0])),
    allenatori: allenatoriVuoti(), contatti: 0, crescita: {}, mercato: mercatoVuoto(), serie: { giorno: '', n: 0 }, centro: '', caldo: 0, energia: {}, incarichi: {},
    sfide: nuoveSfide(), rose: {}, panchine: {}, movimenti: [], avatar: 0, storico: [], percorso: { stagione: 1, punti: 0, presi: [] }, oggetti: {}, scelte: {}, volti: {} };
  if (FABBRICA) { C.rose[clubId] = FABBRICA.inizio.xi.map((x) => x.slice()); C.panchine[clubId] = FABBRICA.inizio.pan.map((x) => x.slice()); }
  apriStagione(C, rnd);
  return C;
}

/* ---------- obiettivi, promozione e retrocessione ---------- */
/** La valutazione media degli undici titolari del club (0 se non si sa calcolare). */
export function mediaTitolari(C, clubs) {
  const mio = trova(clubs, C.club); if (!mio || !FABBRICA) return 0;
  return mio.xi.reduce((s, x) => s + FABBRICA.scheda(x, mio.id).val, 0) / mio.xi.length;
}
/**
 * I quattro obiettivi della stagione (DIVISIONI in src/config.js): posizione finale, turni di Coppa Titano, Trofeo dei
 * Castelli, valutazione media dei titolari. Per ognuno: n (quanto serve), ora (a che punto si è), fatto (vale adesso),
 * sicuro (non si può più perdere) e mancato (non si può più raggiungere). La posizione vale quella di adesso finché il
 * campionato non è finito. Nella divisione più alta l'obiettivo «rosa» non c'è.
 */
export function obiettivi(C, clubs) {
  const O = divisione(C).obiettivi, tab = classifica(C, clubs), pos = tab.findIndex((r) => r.id === C.club) + 1, k = C.coppa, t = C.castelli;
  // turni superati in Coppa Titano; nel Trofeo dei Castelli un punto per i gironi e uno per ogni turno dopo
  const coppa = k.fuori === null ? k.turno : k.fuori, castelli = !t.ko || t.fuori === 'gironi' ? 0 : 1 + (t.ko.fuori === null ? t.ko.turno : t.ko.fuori);
  // il posto in campionato: a campionato finito conta dove si è arrivati; prima è sicuro se, anche perdendole tutte,
  // troppo poche squadre possono raggiungerci, ed è mancato se, anche vincendole tutte, troppe restano davanti
  const giornate = C.cal.length, finito = C.giornata >= giornate, mia = tab[pos - 1], massimo = (r) => r.pt + 3 * (giornate - r.g);
  const possonoArrivare = tab.filter((r) => r.id !== C.club && massimo(r) >= mia.pt).length, giaLontane = tab.filter((r) => r.id !== C.club && r.pt > massimo(mia)).length;
  const dentro = pos > 0 && pos <= O.posizione;
  // nelle coppe un turno superato resta; chi è uscito prima del turno che serve non ci arriva più
  const out = [
    { id: 'posizione', n: O.posizione, ora: pos, fatto: dentro, sicuro: finito ? dentro : possonoArrivare < O.posizione, mancato: finito ? !dentro : giaLontane >= O.posizione },
    { id: 'coppa', n: O.coppa, ora: coppa, fatto: coppa >= O.coppa, sicuro: coppa >= O.coppa, mancato: k.fuori !== null && coppa < O.coppa },
    { id: 'castelli', n: O.castelli, ora: castelli, fatto: castelli >= O.castelli, sicuro: castelli >= O.castelli, mancato: castelli < O.castelli && (t.fuori === 'gironi' || !!(t.ko && t.ko.fuori !== null)) },
  ];
  // la media dei titolari dipende da chi si schiera: vale com'è adesso, e si può sempre sistemare
  if (O.media) { const media = mediaTitolari(C, clubs); out.push({ id: 'rosa', n: O.media, ora: Math.floor(media * 10) / 10, fatto: media >= O.media, sicuro: media >= O.media, mancato: false }); }
  return out;
}
/**
 * Come finisce la stagione, a campionato finito: posizione, obiettivi fatti, se si sale o si scende e in che divisione
 * si giocherà. Chi arriva tra le ultime scende anche se ha fatto gli obiettivi.
 */
export function esitoStagione(C, clubs) {
  const tab = classifica(C, clubs), pos = tab.findIndex((r) => r.id === C.club) + 1, ob = obiettivi(C, clubs), fatti = ob.filter((o) => o.fatto).length;
  const scende = C.div < DIVISIONI.length && pos > tab.length - STAGIONE.retrocedono, sale = !scende && C.div > 1 && fatti >= STAGIONE.servono;
  return { pos, obiettivi: ob, fatti, servono: STAGIONE.servono, sale, scende, div: C.div + (scende ? 1 : 0) - (sale ? 1 : 0) };
}
/**
 * Chiude la stagione e apre la prossima: premi di fine stagione (diamanti della divisione e un allenatore leggendario),
 * premi della promozione (diamanti, un altro leggendario, un contatto dell'agente), cambio di divisione, calendario e
 * coppe nuovi. Torna l'esito con i premi dati.
 */
export function nuovaStagione(C, clubs, rnd = Math.random) {
  const e = esitoStagione(C, clubs), D = divisione(C), premi = { gemme: D.fine, leggendari: 1, contatti: 0 };
  muovi(C, 0, D.fine, 'stagione', `Fine stagione: ${D.nome}`); daiAllenatore(C, 'leggendario', null, rnd);
  if (e.sale) { const g = ECONOMIA.diamanti.promozione; muovi(C, 0, g, 'promozione', `Promozione: ${DIVISIONI[e.div - 1].nome}`); daiAllenatore(C, 'leggendario', null, rnd); C.contatti = (C.contatti || 0) + 1; premi.gemme += g; premi.leggendari++; premi.contatti++; }
  C.storia.push({ stagione: C.stagione, div: C.div, pos: e.pos, fatti: e.fatti, esito: e.sale ? 'sale' : e.scende ? 'scende' : 'resta' });
  if (e.div !== C.div) { C.div = e.div; C.squadre = squadreDi(C.div, C.club, clubs); C.mercato = { ...mercatoVuoto(), n: C.mercato.n }; }
  C.stagione++; apriStagione(C, rnd);
  C.sfide.s = { chiave: C.stagione, c: {} }; C.percorso = { stagione: C.stagione, punti: 0, presi: [] };
  return { ...e, premi };
}

/** Controlla una carriera salvata. Quelle di prima delle divisioni (versione 1) non si possono continuare: si riparte. */
export function completa(C) {
  if (!(C && C.v === 2 && C.club && Array.isArray(C.cal) && Array.isArray(C.squadre))) return null;
  if (!C.mercato) C.mercato = mercatoVuoto(); if (!C.crescita) C.crescita = {}; if (!C.allenatori) C.allenatori = allenatoriVuoti(); if (!C.strutture) C.strutture = {};
  if (!C.percorso || C.percorso.stagione !== C.stagione) C.percorso = { stagione: C.stagione, punti: 0, presi: [] };
  if (!C.oggetti || typeof C.oggetti !== 'object') C.oggetti = {}; if (!C.scelte || typeof C.scelte !== 'object') C.scelte = {};
  // il volto di ogni giocatore inventato della mia rosa (src/casa/ritratti.js): nome → volto
  if (!C.volti || typeof C.volti !== 'object') C.volti = {};
  return C;
}
export function carica(store = globalThis.localStorage) {
  try { return completa(JSON.parse(store.getItem(KEY) || 'null')); } catch (e) { return null; }
}
/** Salva sul dispositivo; rev conta i salvataggi e agg dice quando, così tra due copie della stessa carriera si tiene la più avanti. */
export function salva(C, store = globalThis.localStorage) { try { C.rev = (C.rev || 0) + 1; C.agg = Date.now(); store.setItem(KEY, JSON.stringify(C)); return true; } catch (e) { return false; } }
export function cancella(store = globalThis.localStorage) { try { store.removeItem(KEY); } catch (e) { /* niente da cancellare */ } }

/** La prossima partita di campionato dell'utente, o null se la stagione è finita. */
export function prossima(C) {
  const g = C.cal[C.giornata]; if (!g) return null;
  const m = g.find((x) => x.includes(C.club));
  return { giornata: C.giornata + 1, totale: C.cal.length, casa: m[0], fuori: m[1], avv: m[0] === C.club ? m[1] : m[0], inCasa: m[0] === C.club };
}

export function classifica(C, clubs) {
  const sq = lega(C, clubs), T = {}; for (const c of sq) T[c.id] = { id: c.id, g: 0, v: 0, n: 0, p: 0, gf: 0, gs: 0, pt: 0 };
  C.ris.forEach((giornata, r) => giornata.forEach((res, k) => {
    if (!res) return; const [a, b] = C.cal[r][k], A = T[a], B = T[b];
    A.g++; B.g++; A.gf += res[0]; A.gs += res[1]; B.gf += res[1]; B.gs += res[0];
    if (res[0] > res[1]) { A.v++; A.pt += 3; B.p++; } else if (res[0] < res[1]) { B.v++; B.pt += 3; A.p++; } else { A.n++; B.n++; A.pt++; B.pt++; }
  }));
  // a parità di punti: differenza reti, poi gol fatti, poi il nome della squadra
  const nome = {}; for (const c of sq) nome[c.id] = c.name;
  return Object.values(T).sort((x, y) => y.pt - x.pt || (y.gf - y.gs) - (x.gf - x.gs) || y.gf - x.gf || nome[x.id].localeCompare(nome[y.id], 'it'));
}

/**
 * La forma di ogni squadra: gli ultimi `quanti` risultati di campionato, dal più vecchio al più recente, come lettere
 * 'v' (vinta), 'n' (pari), 'p' (persa). Si ricava dai risultati salvati giornata per giornata: non c'è niente in più da
 * salvare. Chi ha giocato meno partite ha l'elenco più corto.
 */
export function forma(C, quanti = 5) {
  const out = {};
  C.ris.forEach((giornata, r) => giornata.forEach((res, k) => {
    if (!res) return; const [a, b] = C.cal[r][k];
    (out[a] || (out[a] = [])).push(res[0] > res[1] ? 'v' : res[0] < res[1] ? 'p' : 'n');
    (out[b] || (out[b] = [])).push(res[1] > res[0] ? 'v' : res[1] < res[0] ? 'p' : 'n');
  }));
  for (const id of Object.keys(out)) out[id] = out[id].slice(-quanti);
  return out;
}

/* ---------- monete e diamanti ---------- */
/**
 * Ogni entrata e ogni uscita passa di qui: cambia il saldo e la scrive nello storico (i più recenti in testa).
 * causale è un codice breve (partita, stadio, sfida, percorso, mercato...), dettaglio una frase per chi legge.
 * Quando il saldo passerà sul server (docs/home-spec.md, §4) questa funzione sarà l'unico punto da cambiare.
 */
export function muovi(C, monete, gemme, causale, dettaglio = '', quando = Date.now()) {
  if (!monete && !gemme) return;
  C.monete += monete || 0; C.gemme += gemme || 0;
  if (!Array.isArray(C.storico)) C.storico = [];
  C.storico.unshift({ t: quando, m: monete || 0, g: gemme || 0, c: causale, d: dettaglio, sm: C.monete, sg: C.gemme });
  if (C.storico.length > ECONOMIA.storico) C.storico.length = ECONOMIA.storico;
}
/** Il giudizio sulle finanze del club: quante vittorie vale il saldo in monete. */
export function finanze(C) { const v = C.monete / vittoria(C); return ECONOMIA.finanze.find(([fino]) => v < fino)[1]; }

/* ---------- percorso premi della stagione ---------- */
const percorsoDi = (C) => { if (!C.percorso || C.percorso.stagione !== C.stagione) C.percorso = { stagione: C.stagione, punti: 0, presi: [] }; return C.percorso; };
/** Aggiunge al percorso i punti di una fonte (partita, vinta, sfidaD, sfidaW, sfidaS, sfidaC, turno). */
export function puntiPercorso(C, fonte, n = 1) { percorsoDi(C).punti += (ECONOMIA.percorso.punti[fonte] || 0) * n; }
/**
 * Lo stato del percorso: livello raggiunto, punti nel livello in corso, i premi coi loro stati, quanti da ritirare.
 * Ogni premio è in monete (della divisione in cui si gioca), in diamanti o un allenatore.
 */
export function statoPercorso(C) {
  const P = percorsoDi(C), E = ECONOMIA.percorso, livello = Math.min(E.premi.length, Math.floor(P.punti / E.perLivello));
  const premi = E.premi.map((x, i) => ({ livello: i + 1, monete: inMonete(C, x.v), gemme: x.g || 0, allenatore: x.a || null, raggiunto: i < livello, preso: P.presi.includes(i + 1) }));
  // livello: quanti livelli sono stati raggiunti, 0 all'inizio. inCorso: il livello che si sta facendo, da 1: è quello che si mostra
  return { livello, inCorso: Math.min(E.premi.length, livello + 1), livelli: E.premi.length, punti: P.punti, nelLivello: livello >= E.premi.length ? E.perLivello : P.punti % E.perLivello, perLivello: E.perLivello, premi, daRitirare: premi.filter((x) => x.raggiunto && !x.preso).length };
}
/** Ritira il premio di un livello raggiunto (0 = tutti quelli da ritirare). */
export function ritiraPercorso(C, livello = 0, rnd = Math.random) {
  const st = statoPercorso(C), tot = { ok: false, monete: 0, gemme: 0, allenatori: 0, n: 0 };
  for (const x of st.premi) {
    if (!x.raggiunto || x.preso || (livello && x.livello !== livello)) continue;
    C.percorso.presi.push(x.livello); muovi(C, x.monete, x.gemme, 'percorso', `Percorso premi, livello ${x.livello}`);
    if (x.allenatore) { daiAllenatore(C, x.allenatore, null, rnd); tot.allenatori++; }
    tot.ok = true; tot.monete += x.monete; tot.gemme += x.gemme; tot.n++;
  }
  return tot;
}

/* ---------- negozio: quello che si compra con diamanti e monete (docs/home-spec.md, §5.5) ---------- */
/**
 * Gli oggetti del negozio, per tipo. `tutti` sono i codici che esistono, `gratis` quelli che si hanno dall'inizio, `rari`
 * (solo nei pezzi dello stemma) quelli che costano diamanti invece di monete. Sono cose da vedere, non da vincere: nessun
 * oggetto cambia la forza della squadra.
 */
export const NEGOZIO = {
  avatar: { nome: 'Avatar del manager', tutti: [0, 1, 2, 3, 4, 5, 6, 7], gratis: [0, 1, 2, 3] },
  cornice: { nome: 'Cornice del ritratto', tutti: ['semplice', 'oro', 'azzurra', 'lime', 'fuoco'], gratis: ['semplice'] },
  scarpini: { nome: 'Scarpini della squadra', tutti: ['misti', 'neri', 'bianchi', 'oro', 'azzurri', 'lime', 'arancio', 'rosa'], gratis: ['misti'] },
  pallone: { nome: 'Pallone di casa', tutti: ['classico', 'oro', 'azzurro', 'notte', 'arancio'], gratis: ['classico'] },
  disegno: { nome: 'Disegno speciale della divisa', tutti: ['onde', 'chevron', 'sfumata', 'mimetica', 'pennellata'], gratis: [] },
  terza: { nome: 'Terza maglia', tutti: ['terza'], gratis: [] },
  forma: { nome: 'Forma dello stemma', tutti: ['scudo', 'tondo', 'stendardo', 'rombo', 'esagono'], gratis: ['scudo', 'tondo', 'stendardo'], rari: [] },
  simbolo: { nome: 'Simbolo dello stemma', tutti: ['corona', 'stella', 'pallone', 'torre', 'nessuno', 'fulmine', 'tretorri', 'alloro'], gratis: ['corona', 'stella', 'pallone', 'torre', 'nessuno'], rari: ['tretorri', 'alloro'] },
  bordo: { nome: 'Bordo dello stemma', tutti: ['semplice', 'doppio', 'sottile', 'punti', 'oro'], gratis: ['semplice', 'doppio', 'sottile'], rari: ['oro'] },
};
const STEMMA = ['forma', 'simbolo', 'bordo'];
const oggettiDi = (C) => (C.oggetti && typeof C.oggetti === 'object' ? C.oggetti : (C.oggetti = {}));
/** Vero se la carriera ha quell'oggetto (gratis o comprato). */
export function possiede(C, tipo, cosa) { const N = NEGOZIO[tipo]; return !!N && N.tutti.includes(cosa) && (N.gratis.includes(cosa) || (oggettiDi(C)[tipo] || []).includes(cosa)); }
/** Quanto costa: { monete, gemme }. I pezzi dello stemma costano monete, quelli rari diamanti. */
export function costoOggetto(tipo, cosa) {
  const N = NEGOZIO[tipo]; if (!N || !N.tutti.includes(cosa) || N.gratis.includes(cosa)) return { monete: 0, gemme: 0 };
  const c = STEMMA.includes(tipo) ? ECONOMIA.negozio[N.rari.includes(cosa) ? 'stemmaRaro' : 'stemma'] : ECONOMIA.negozio[tipo];
  return { monete: c.m || 0, gemme: c.g || 0 };
}
/** Compra un oggetto: si paga una volta sola e resta per sempre. */
export function compraOggetto(C, tipo, cosa) {
  const N = NEGOZIO[tipo]; if (!N || !N.tutti.includes(cosa)) return { ok: false, motivo: 'cosa' };
  if (possiede(C, tipo, cosa)) return { ok: false, motivo: 'presa' };
  const c = costoOggetto(tipo, cosa); if (C.monete < c.monete || C.gemme < c.gemme) return { ok: false, motivo: 'soldi', ...c };
  muovi(C, -c.monete, -c.gemme, 'negozio', `${N.nome}: ${cosa}`); const O = oggettiDi(C); (O[tipo] = O[tipo] || []).push(cosa);
  return { ok: true, ...c };
}
/** Quanti pezzi dello stemma si hanno, in percentuale su tutti quelli che esistono. */
export function pezziStemma(C) {
  let ho = 0, tot = 0; for (const t of STEMMA) for (const x of NEGOZIO[t].tutti) { tot++; if (possiede(C, t, x)) ho++; }
  return Math.round(ho / tot * 100);
}

/* ---------- sfide ---------- */
const due = (n) => String(n).padStart(2, '0');
export const giornoDi = (d) => `${d.getFullYear()}-${due(d.getMonth() + 1)}-${due(d.getDate())}`;
/** Settimana ISO (da lunedì), nell'ora del telefono. */
export function settimanaDi(d) {
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate()), w = (t.getDay() + 6) % 7; t.setDate(t.getDate() - w + 3);
  const p = new Date(t.getFullYear(), 0, 4), n = 1 + Math.round(((t - p) / 864e5 - 3 + ((p.getDay() + 6) % 7)) / 7);
  return `${t.getFullYear()}-W${due(n)}`;
}
/** Quando ripartono le sfide della settimana: lunedì a mezzanotte. */
export function fineSettimana(d) { const t = new Date(d.getFullYear(), d.getMonth(), d.getDate()); t.setDate(t.getDate() + ((8 - t.getDay()) % 7 || 7)); return t; }
/** Porta le sfide al giorno e alla settimana di oggi: se sono cambiati, i contatori ripartono da zero. */
export function aggiornaSfide(C, oggi = new Date()) {
  const S = C.sfide || (C.sfide = nuoveSfide()), g = giornoDi(oggi), w = settimanaDi(oggi);
  if (S.d.chiave !== g) S.d = { chiave: g, c: {} };
  if (S.w.chiave !== w) S.w = { chiave: w, c: {} };
  if (S.s.chiave !== C.stagione) S.s = { chiave: C.stagione, c: {} };
  return S;
}
const piu = (o, k, n = 1) => { o[k] = (o[k] || 0) + n; };
/** Fa avanzare le sfide: tipo è il contatore, n di quanto. */
export function evento(C, tipo, n = 1, oggi = new Date()) { const S = aggiornaSfide(C, oggi); for (const g of ['d', 'w', 's']) piu(S[g].c, tipo, n); }
function valoreSfida(C, gruppo, def) {
  if (gruppo === 'c') {
    if (def.m === 'cima') return C.div === 1 ? 1 : 0;
    if (def.m === 'coppe') return C.trofei.filter((t) => t.tipo === 'Coppa Titano').length;
    if (def.m === 'castelli') return C.trofei.filter((t) => t.tipo === 'Trofeo dei Castelli').length;
    if (def.m === 'stelle') return Math.max(...STRUTTURE.map((q) => stelle(C, q)));
  }
  return C.sfide[gruppo].c[def.m] || 0;
}
const chiavePremio = (C, gruppo, id) => (gruppo === 'c' ? `c:${id}` : `${gruppo}:${C.sfide[gruppo].chiave}:${id}`);
/** Lo stato di tutte le sfide, per le schermate: avanzamento, fatte, già riscosse, quante restano da riscuotere. */
export function statoSfide(C, oggi = new Date()) {
  aggiornaSfide(C, oggi);
  const out = { daRiscuotere: 0, conti: {}, bonus: {} };
  for (const g of Object.keys(SFIDE)) {
    out[g] = SFIDE[g].map((def) => { const prog = Math.min(def.n, valoreSfida(C, g, def)), fatto = prog >= def.n, preso = !!C.sfide.presi[chiavePremio(C, g, def.id)]; if (fatto && !preso) out.daRiscuotere++; return { ...def, monete: inMonete(C, def.v), prog, fatto, preso }; });
    out.conti[g] = [out[g].filter((x) => x.fatto).length, out[g].length];
    if (BONUS[g]) { const fatto = out[g].every((x) => x.fatto), preso = !!C.sfide.presi[chiavePremio(C, g, 'tutte')]; out.bonus[g] = { ...BONUS[g], fatto, preso }; if (fatto && !preso) out.daRiscuotere++; }
  }
  return out;
}
/** Riscuote il premio di una sfida fatta (id 'tutte' per il premio di gruppo): monete, diamanti, se c'è un allenatore, e i punti del percorso premi. */
export function riscuoti(C, gruppo, id, oggi = new Date(), rnd = Math.random) {
  const st = statoSfide(C, oggi), x = id === 'tutte' ? st.bonus[gruppo] : (st[gruppo] || []).find((y) => y.id === id);
  if (!x || !x.fatto || x.preso) return { ok: false };
  C.sfide.presi[chiavePremio(C, gruppo, id)] = 1; muovi(C, x.monete || 0, x.gemme || 0, 'sfida', id === 'tutte' ? `Tutte le sfide: ${GRUPPI[gruppo]}` : x.t);
  if (x.allenatore) daiAllenatore(C, x.allenatore, null, rnd);
  const fonte = id === 'tutte' ? '' : { d: 'sfidaD', w: 'sfidaW', s: 'sfidaS', c: 'sfidaC' }[gruppo];
  if (fonte) puntiPercorso(C, fonte);
  return { ok: true, monete: x.monete || 0, gemme: x.gemme || 0, allenatore: x.allenatore || null, punti: ECONOMIA.percorso.punti[fonte] || 0 };
}
/** Riscuote tutto quello che c'è da riscuotere. */
export function riscuotiTutto(C, oggi = new Date()) {
  const st = statoSfide(C, oggi), tot = { monete: 0, gemme: 0, punti: 0, n: 0 };
  for (const g of Object.keys(SFIDE)) {
    for (const x of st[g]) if (x.fatto && !x.preso) { const r = riscuoti(C, g, x.id, oggi); tot.monete += r.monete; tot.gemme += r.gemme; tot.punti += r.punti; tot.n++; }
    if (st.bonus[g] && st.bonus[g].fatto && !st.bonus[g].preso) { const r = riscuoti(C, g, 'tutte', oggi); tot.monete += r.monete; tot.gemme += r.gemme; tot.n++; }
  }
  return tot;
}

/* ---------- le strutture del club: da zero a cinque stelle ---------- */
/** Quante stelle ha una struttura. */
export const stelle = (C, quale) => clamp((C.strutture || {})[quale] || 0, 0, ECONOMIA.strutture.costi.length);
/** Quanto costa la prossima stella di una struttura: { monete, gemme }, o niente se è al massimo. */
export function costoStruttura(C, quale) { const n = stelle(C, quale), S = ECONOMIA.strutture; return n >= S.costi.length ? null : { monete: S.costi[n], gemme: S.diamanti[n] }; }
/** Una stella in più a una struttura, se ci sono monete e diamanti. */
export function miglioraStruttura(C, quale) {
  if (!STRUTTURE.includes(quale)) return { ok: false, motivo: 'cosa' };
  const c = costoStruttura(C, quale); if (!c) return { ok: false, motivo: 'massimo' };
  if (C.monete < c.monete || C.gemme < c.gemme) return { ok: false, motivo: 'soldi', ...c };
  muovi(C, -c.monete, -c.gemme, 'struttura', `Struttura: ${quale}, stella ${stelle(C, quale) + 1}`); C.strutture[quale] = stelle(C, quale) + 1;
  // la partita legge il livello dello stadio da qui (da 1 a 5) per riempire le tribune
  if (quale === 'stadio') C.stadio = Math.max(1, C.strutture.stadio);
  return { ok: true, stelle: C.strutture[quale], ...c };
}
/** Quanti giocatori può avere la rosa (Foresteria), quanti posti ha lo stadio, quali moduli sono aperti (Centro allenamento). */
export const rosaMax = (C) => ECONOMIA.strutture.foresteria[stelle(C, 'foresteria')];
export const postiStadio = (C) => ECONOMIA.strutture.stadio.posti[stelle(C, 'stadio')];
export const moduliAperti = (C, moduli) => moduli.slice(0, ECONOMIA.strutture.centro.moduli[stelle(C, 'centro')]);
/** Le monete di una vittoria, con l'Ufficio commerciale, e l'incasso di una partita in casa, con lo Stadio. */
export const premioVittoria = (C) => vittoria(C) * (1 + stelle(C, 'commerciale') * ECONOMIA.strutture.commerciale);
const bonusCasa = (C) => inMonete(C, ECONOMIA.strutture.stadio.incasso[stelle(C, 'stadio')]);
/**
 * Di quanto salgono le statistiche dei titolari nella prossima partita: il riscaldamento, se è stato fatto, e in casa
 * la Curva dei tifosi. È una frazione (0,05 = cinque per cento).
 */
export const bonusPartita = (C, inCasa) => ((C.caldo || 0) > 0 ? ECONOMIA.energia.riscaldamento.bonus : 0) + (inCasa ? stelle(C, 'curva') * ECONOMIA.strutture.curva : 0);

/* ---------- gli allenatori: oggetti in inventario, da usare su un giocatore ---------- */
/** Mette in inventario un allenatore; senza categoria ne esce una a caso. Torna la categoria. */
export function daiAllenatore(C, rarita, categoria = null, rnd = Math.random) {
  let cat = categoria; if (!cat) { let u = rnd(); cat = PESI_CATEGORIE[PESI_CATEGORIE.length - 1][0]; for (const [c, p] of PESI_CATEGORIE) { if (u < p) { cat = c; break; } u -= p; } }
  const A = C.allenatori || (C.allenatori = allenatoriVuoti()); A[rarita][cat] = (A[rarita][cat] || 0) + 1;
  return cat;
}
/** Quanti allenatori ci sono in inventario, in tutto. */
export const quantiAllenatori = (C) => RARITA.reduce((s, r) => s + CATEGORIE.reduce((t, c) => t + (((C.allenatori || {})[r] || {})[c] || 0), 0), 0);
/** Compra un allenatore raro o leggendario coi diamanti. */
export function compraAllenatore(C, rarita, categoria) {
  const g = (ECONOMIA.allenatori.rarita[rarita] || {}).diamanti; if (!g || !CATEGORIE.includes(categoria)) return { ok: false, motivo: 'cosa' };
  if (C.gemme < g) return { ok: false, motivo: 'soldi', gemme: g };
  muovi(C, 0, -g, 'allenatore', `Allenatore ${rarita}: ${categoria}`); daiAllenatore(C, rarita, categoria);
  return { ok: true, gemme: g };
}
/** Di quanto è cresciuto un giocatore del club e quanto può ancora crescere: { stat, pot }. */
export const crescitaDi = (C, nome) => (C.crescita || {})[nome] || { stat: {}, pot: ECONOMIA.allenatori.potenziale };
/**
 * Usa un allenatore su un giocatore del club (dove: 'xi' titolari o 'pan' riserve; i: quale). Alza le statistiche della
 * sua categoria; la valutazione sale di conseguenza, ma mai oltre il potenziale del giocatore. Quello dei portieri va
 * solo sui portieri, gli altri solo sui giocatori di movimento. Il leggendario può alzare di uno il potenziale.
 */
export function usaAllenatore(C, clubs, dove, i, rarita, categoria, rnd = Math.random, oggi = new Date()) {
  const A = ECONOMIA.allenatori, R = A.rarita[rarita], chiavi = A.categorie[categoria], mio = trova(clubs, C.club), x = mio && (dove === 'pan' ? mio.pan : mio.xi)[i];
  if (!x || !R || !chiavi || !FABBRICA) return { ok: false, motivo: 'giocatore' };
  if (!(((C.allenatori || {})[rarita] || {})[categoria] > 0)) return { ok: false, motivo: 'nessuno' };
  if ((categoria === 'portieri') !== (x[1] === 'P')) return { ok: false, motivo: 'categoria' };
  const prima = crescitaDi(C, x[0]), s0 = FABBRICA.scheda(x, mio.id), nuovo = { stat: { ...prima.stat }, pot: prima.pot };
  if (R.potenziale && rnd() < R.potenziale) nuovo.pot++;
  if (s0.val - s0.base >= nuovo.pot) return { ok: false, motivo: 'potenziale' };
  C.crescita = C.crescita || {}; C.crescita[x[0]] = nuovo;
  // un punto alla volta a tutte le statistiche della categoria, finché la valutazione resta entro il potenziale
  let s1 = s0;
  for (let p = 0; p < R.punti; p++) {
    for (const k of chiavi) nuovo.stat[k] = (nuovo.stat[k] || 0) + 1;
    s1 = FABBRICA.scheda(x, mio.id);
    if (s1.val - s1.base > nuovo.pot) { for (const k of chiavi) nuovo.stat[k]--; s1 = FABBRICA.scheda(x, mio.id); break; }
  }
  C.allenatori[rarita][categoria]--; evento(C, 'allenamenti', 1, oggi);
  return { ok: true, prima: s0.val, dopo: s1.val, potenziale: nuovo.pot > prima.pot };
}

// I giorni giocati di fila (la serie di sette giorni, in diamanti, col contatto dell'agente al settimo) e gli allenatori
// comuni che il Centro allenamento dà ogni settimana: tutti e due scattano con la prima partita del giorno o della settimana
function giornoGiocato(C, oggi, rnd) {
  const g = giornoDi(oggi), S = C.serie || (C.serie = { giorno: '', n: 0 }), D = ECONOMIA.diamanti.serie;
  if (S.giorno !== g) {
    const ieri = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate() - 1);
    S.n = S.giorno === giornoDi(ieri) && S.n < D.length ? S.n + 1 : 1; S.giorno = g;
    muovi(C, 0, D[S.n - 1], 'serie', `Giorni di fila: ${S.n} di ${D.length}`, oggi.getTime());
    if (S.n === D.length) C.contatti = (C.contatti || 0) + 1;
  }
  const w = settimanaDi(oggi);
  if (C.centro !== w) { C.centro = w; for (let k = stelle(C, 'centro') * ECONOMIA.strutture.centro.allenatori; k > 0; k--) daiAllenatore(C, 'comune', null, rnd); }
}

// Una partita giocata dall'utente: statistiche, sfide, premio in monete. comp: 'camp', 'coppa' o 'castelli'
function conta(C, gf, gs, marcatori, comp = 'camp', oggi = new Date(), rnd = Math.random) {
  const s = C.stat; s.g++; s.gf += gf; s.gs += gs; if (gf > gs) s.v++; else if (gf < gs) s.p++; else s.n++;
  for (const n of marcatori || []) s.marc[n] = (s.marc[n] || 0) + 1;
  const S = aggiornaSfide(C, oggi);
  for (const g of ['d', 'w', 's']) {
    const c = S[g].c; piu(c, 'gioca'); piu(c, 'gol', gf); if (gf > gs) piu(c, 'vinte'); if (gs === 0) piu(c, 'inviolate'); if (comp !== 'camp') piu(c, 'coppa');
    if (comp === 'camp') { piu(c, 'golCamp', gf); if (gf > gs) piu(c, 'vinteCamp'); }
    c.serie = gf > gs ? (c.serie || 0) + 1 : 0; c.serieMax = Math.max(c.serieMax || 0, c.serie);
  }
  puntiPercorso(C, 'partita'); if (gf > gs) puntiPercorso(C, 'vinta');
  // premio partita: la vittoria della divisione (con l'Ufficio commerciale), una parte per pareggio e sconfitta
  const P = ECONOMIA.premi, a = P.arrotonda, m = Math.max(a, Math.round((gf > gs ? 1 : gf < gs ? P.sconfitta : P.pareggio) * premioVittoria(C) / a) * a);
  muovi(C, m, 0, 'partita', `${gf > gs ? 'Vittoria' : gf < gs ? 'Sconfitta' : 'Pareggio'} ${gf}-${gs} (${{ camp: 'campionato', coppa: 'Coppa Titano', castelli: 'Trofeo dei Castelli' }[comp]})`);
  // il riscaldamento vale per le partite pagate; dopo ogni partita la lista trasferimenti cambia
  if (C.caldo > 0) C.caldo--;
  const M = C.mercato || (C.mercato = mercatoVuoto()); M.n++; M.rinnovi = 0;
  giornoGiocato(C, oggi, rnd);
  return m;
}

const libero = (rosa, i, n) => !rosa.some((x, k) => k !== i && x[2] === n);
const primoNumeroLibero = (rosa, i) => { for (let n = 2; n < 100; n++) if (libero(rosa, i, n)) return n; return 99; };
/**
 * Il capitano: un titolare di un'altra squadra (da, iIn) entra nel proprio club al posto del titolare più debole dello stesso ruolo,
 * che va in panchina. La squadra che lo perde mette al suo posto la sua riserva migliore di quel ruolo. Il capitano non costa niente:
 * è il premio di partenza.
 */
export function scegliCapitano(C, clubs, da, iIn) {
  const mio = trova(clubs, C.club), altro = trova(clubs, da);
  if (!mio || !altro || altro === mio || !altro.xi[iIn]) return false;
  const cap = altro.xi[iIn].slice(), ruolo = cap[1], xi = mio.xi.map((x) => x.slice()), pan = (mio.pan || []).map((x) => x.slice());
  const axi = altro.xi.map((x) => x.slice()), apan = (altro.pan || []).map((x) => x.slice());
  let j = -1; xi.forEach((x, k) => { if (x[1] === ruolo && (j < 0 || x[3] < xi[j][3])) j = k; }); if (j < 0) return false;
  const giu = xi[j]; xi[j] = cap; pan.push(giu);
  let r = -1; apan.forEach((x, k) => { if (x[1] === ruolo && (r < 0 || x[3] > apan[r][3])) r = k; });
  axi[iIn] = r >= 0 ? apan.splice(r, 1)[0] : giu.slice();
  for (const rosa of [xi.concat(pan), axi.concat(apan)]) rosa.forEach((x, k) => { if (!libero(rosa, k, x[2])) x[2] = primoNumeroLibero(rosa, k); });
  C.rose[mio.id] = xi; C.panchine[mio.id] = pan; C.rose[altro.id] = axi; C.panchine[altro.id] = apan;
  C.mio = { ...(C.mio || {}), capitano: cap[0] }; applica(C, clubs);
  return true;
}

/* ---------- il valore dei giocatori ---------- */
const arrotonda = (n) => { const a = ECONOMIA.premi.arrotonda; return Math.max(a, Math.round(n / a) * a); };
/** Il valore in monete di un giocatore dalla sua valutazione: ECONOMIA.valore.base a valutazione `a`, e raddoppia ogni `raddoppia` punti. */
export function prezzo(val) { const V = ECONOMIA.valore; return arrotonda(V.base * Math.pow(2, (val - V.a) / V.raddoppia)); }
/** Quanto si incassa vendendo un giocatore di quella valutazione. */
export const incasso = (val) => arrotonda(prezzo(val) * ECONOMIA.valore.vendita);
/** Mette nelle squadre le rose della carriera (o quelle di partenza se C è null). La rosa di partenza resta in xi0. */
export function applica(C, clubs) {
  for (const c of tutte(clubs)) {
    if (!c.xi0) { c.xi0 = c.xi; c.pan0 = c.pan || []; }
    c.xi = (C && C.rose && C.rose[c.id]) || c.xi0; c.pan = (C && C.panchine && C.panchine[c.id]) || c.pan0;
  }
}
/** Un titolare e una riserva dello stesso ruolo della propria squadra si scambiano il posto. */
export function cambiaTitolare(C, clubs, iXi, iPan) {
  const mio = trova(clubs, C.club), a = mio && mio.xi[iXi], b = mio && (mio.pan || [])[iPan];
  if (!a || !b || a[1] !== b[1]) return false;
  const xi = mio.xi.map((x) => x.slice()), pan = mio.pan.map((x) => x.slice()); xi[iXi] = b.slice(); pan[iPan] = a.slice();
  C.rose[mio.id] = xi; C.panchine = C.panchine || {}; C.panchine[mio.id] = pan; applica(C, clubs);
  return true;
}
/* ---------- la rosa: chi entra e chi esce ---------- */
const copia = (l) => (l || []).map((x) => x.slice());
const valDi = (C, x) => (FABBRICA ? FABBRICA.scheda(x, C.club).val : x[3]);
/** Quanti giocatori ha il club, tra titolari e riserve. */
export const quantiInRosa = (C, clubs) => { const mio = trova(clubs, C.club); return mio ? mio.xi.length + (mio.pan || []).length : 0; };
// Toglie dalla rosa un giocatore del club. Se è un titolare entra al suo posto la riserva più forte dello stesso reparto
// (per un giocatore di movimento, se non c'è, la più forte tra le altre). Torna il giocatore tolto e la sua valutazione.
function togli(C, clubs, dove, i) {
  const mio = trova(clubs, C.club), xi = copia(mio && mio.xi), pan = copia(mio && mio.pan), x = (dove === 'pan' ? pan : xi)[i];
  if (!x) return { ok: false, motivo: 'giocatore' };
  if (xi.length + pan.length <= ECONOMIA.valore.minimo) return { ok: false, motivo: 'pochi' };
  const val = valDi(C, x);
  if (dove === 'pan') pan.splice(i, 1);
  else {
    let j = -1; pan.forEach((y, k) => { if (y[1] === x[1] && (j < 0 || valDi(C, y) > valDi(C, pan[j]))) j = k; });
    if (j < 0 && x[1] !== 'P') pan.forEach((y, k) => { if (y[1] !== 'P' && (j < 0 || valDi(C, y) > valDi(C, pan[j]))) j = k; });
    if (j < 0) return { ok: false, motivo: x[1] === 'P' ? 'portiere' : 'pochi' };
    xi[i] = pan.splice(j, 1)[0];
  }
  C.rose[mio.id] = xi; C.panchine[mio.id] = pan; if (C.crescita) delete C.crescita[x[0]]; if (C.energia) delete C.energia[x[0]];
  for (const t of Object.keys(C.incarichi || {})) if (C.incarichi[t] === x[0]) delete C.incarichi[t];
  applica(C, clubs);
  return { ok: true, x, val };
}
/** Vende un giocatore del club: si incassa una parte del suo valore. */
export function vendi(C, clubs, dove, i) {
  const r = togli(C, clubs, dove, i); if (!r.ok) return r;
  const m = incasso(r.val); muovi(C, m, 0, 'mercato', `Venduto ${r.x[0]}`);
  C.movimenti.unshift({ stagione: C.stagione, ceduto: r.x[0], costo: -m }); C.movimenti.length = Math.min(C.movimenti.length, 30);
  return { ok: true, monete: m, nome: r.x[0] };
}
/** Che allenatore dà lo svincolo di un giocatore di quella valutazione. */
export const raritaSvincolo = (val) => ECONOMIA.allenatori.svincolo.find(([sotto]) => val < sotto)[1];
/** Svincola un giocatore del club: niente monete, ma un allenatore (più raro se il giocatore è forte). */
export function svincola(C, clubs, dove, i, rnd = Math.random) {
  const r = togli(C, clubs, dove, i); if (!r.ok) return r;
  const rarita = raritaSvincolo(r.val), movimento = CATEGORIE.filter((c) => c !== 'portieri');
  const categoria = daiAllenatore(C, rarita, r.x[1] === 'P' ? 'portieri' : movimento[Math.floor(rnd() * movimento.length)]);
  return { ok: true, rarita, categoria, nome: r.x[0] };
}
// Una squadra vera perde un giocatore: se era titolare entra la sua riserva più forte dello stesso reparto, o un giocatore nuovo
function lascia(C, clubs, da, nome) {
  const c = trova(clubs, da); if (!c) return;
  const xi = copia(c.xi), pan = copia(c.pan), p = pan.findIndex((x) => x[0] === nome), k = xi.findIndex((x) => x[0] === nome);
  if (p >= 0) pan.splice(p, 1);
  else if (k >= 0) {
    let j = -1; pan.forEach((y, n) => { if (y[1] === xi[k][1] && (j < 0 || y[3] > pan[j][3])) j = n; });
    xi[k] = j >= 0 ? pan.splice(j, 1)[0] : FABBRICA.nuovoGiocatore(`sostituto/${da}/${nome}`, xi[k][1], DIVISIONI[0].val[0], xi.concat(pan).map((x) => x[0]));
  } else return;
  C.rose[da] = xi; C.panchine[da] = pan;
}
// Un giocatore entra nella rosa del club, tra le riserve. `da` è la squadra vera da cui arriva, se arriva da una squadra.
function ingaggia(C, clubs, x, da) {
  const mio = trova(clubs, C.club), xi = copia(mio.xi), pan = copia(mio.pan), g = x.slice(); g[4] = g[4] || da || 'inv';
  if (da) lascia(C, clubs, da, g[0]);
  const rosa = xi.concat(pan, [g]); if (!libero(rosa, rosa.length - 1, g[2])) g[2] = primoNumeroLibero(rosa, rosa.length - 1);
  pan.push(g); C.rose[mio.id] = xi; C.panchine[mio.id] = pan; applica(C, clubs);
}
// Si può comprare? Serve posto in rosa (Foresteria) e servono le monete (e i diamanti, per le offerte a tempo)
function puoComprare(C, clubs, monete, gemme = 0) {
  if (quantiInRosa(C, clubs) >= rosaMax(C)) return { ok: false, motivo: 'rosa', massimo: rosaMax(C) };
  if (C.monete < monete || C.gemme < gemme) return { ok: false, motivo: 'soldi', monete, gemme };
  return { ok: true };
}
function compra(C, clubs, g, monete, gemme, come, oggi) {
  const p = puoComprare(C, clubs, monete, gemme); if (!p.ok) return p;
  muovi(C, -monete, -gemme, 'mercato', `${come}: ${g.x[0]}`); ingaggia(C, clubs, g.x, g.da);
  C.movimenti.unshift({ stagione: C.stagione, preso: g.x[0], da: g.da || null, costo: monete }); C.movimenti.length = Math.min(C.movimenti.length, 30);
  evento(C, 'acquisti', 1, oggi);
  return { ok: true, monete, gemme, nome: g.x[0] };
}

/* ---------- mercato: lista trasferimenti, osservatore, agente, offerte a tempo ---------- */
const REPARTI_LISTA = ['P', 'D', 'D', 'C', 'C', 'A', 'D', 'C', 'A'];
const nomiMiei = (C, clubs) => { const mio = trova(clubs, C.club); return mio ? mio.xi.concat(mio.pan || []).map((x) => x[0]) : []; };
// Un giocatore per il mercato, sempre lo stesso dallo stesso seme: della divisione `div`, con la valutazione tra min e
// max (frazioni della fascia della divisione, da 0 a 1). Nella divisione più alta è un giocatore vero, preso tra quelli
// con quella valutazione; `cima` chiede i migliori, oltre la fascia. Senza reparto ne esce uno a caso.
function pesca(C, clubs, seme, div, reparto, min, max, cima = false) {
  if (!FABBRICA) return null;
  const D = DIVISIONI[div - 1], [lo, hi] = D.val, a = Math.round(lo + (hi - lo) * min), b = Math.round(lo + (hi - lo) * max), rep = reparto || REPARTI_LISTA[Math.floor(caso(`${seme}/r`) * REPARTI_LISTA.length)];
  if (D.vere) {
    const miei = nomiMiei(C, clubs), veri = (da, fino) => FABBRICA.reali(da, fino).filter((g) => !miei.includes(g.x[0]) && (!reparto || g.x[1] === reparto));
    let lista = cima ? veri(hi + 1, 99) : veri(a, b); if (!lista.length) lista = veri(lo, 99); if (!lista.length) return null;
    const g = lista[Math.floor(caso(seme) * lista.length)];
    return { x: g.x.slice(), da: g.da, val: g.val, prezzo: prezzo(g.val) };
  }
  // due numeri a caso invece di uno: escono più spesso le valutazioni di mezzo
  const val = Math.round(a + (b - a) * (caso(`${seme}/a`) + caso(`${seme}/b`)) / 2), x = FABBRICA.nuovoGiocatore(seme, rep, val, nomiMiei(C, clubs));
  return { x, da: null, val, prezzo: prezzo(val) };
}
/**
 * La lista trasferimenti: giocatori della divisione in cui si gioca, a prezzo pieno. Cambia dopo ogni partita. Per ogni
 * giocatore: x (il giocatore), da (la squadra vera da cui arriva, se c'è), val, prezzo, preso.
 */
export function listaMercato(C, clubs) {
  const M = C.mercato || (C.mercato = mercatoVuoto()), chiave = `${C.stagione}/${C.div}/${M.n}/${M.rinnovi || 0}`;
  if (!M.lista || M.lista.chiave !== chiave) {
    const giocatori = [], visti = new Set();
    for (let k = 0; giocatori.length < ECONOMIA.mercato.lista.quanti && k < 40; k++) { const g = pesca(C, clubs, `${C.id}/lista/${chiave}/${k}`, C.div, null, 0, 1); if (g && !visti.has(g.x[0])) { visti.add(g.x[0]); giocatori.push({ ...g, preso: false }); } }
    M.lista = { chiave, giocatori };
  }
  return M.lista.giocatori;
}
/** Compra il giocatore k della lista trasferimenti. */
export function compraLista(C, clubs, k, oggi = new Date()) {
  const g = listaMercato(C, clubs)[k]; if (!g || g.preso) return { ok: false, motivo: 'giocatore' };
  const r = compra(C, clubs, g, g.prezzo, 0, 'Lista trasferimenti', oggi); if (r.ok) g.preso = true;
  return r;
}
/** Rinnova subito la lista trasferimenti, per diamanti. */
export function rinnovaLista(C) {
  const g = ECONOMIA.mercato.lista.rinnovo; if (C.gemme < g) return { ok: false, motivo: 'soldi', gemme: g };
  muovi(C, 0, -g, 'mercato', 'Lista trasferimenti rinnovata'); C.mercato.rinnovi = (C.mercato.rinnovi || 0) + 1;
  return { ok: true, gemme: g };
}

/** Le fasce dell'osservatore e quanto costa una ricerca in ognuna (meno con la struttura Osservatori). */
export const FASCE = ['bassa', 'media', 'alta'];
export const costoOsservatore = (C, fascia) => inMonete(C, ECONOMIA.mercato.osservatore.fasce[fascia] * (1 - stelle(C, 'osservatori') * ECONOMIA.strutture.osservatori));
/**
 * L'osservatore: per monete trova un giocatore della fascia scelta (un terzo delle valutazioni della divisione), del
 * reparto scelto, e lo offre con lo sconto. Resta in attesa finché non si compra o si lascia.
 */
export function osserva(C, clubs, fascia, reparto = null) {
  const M = C.mercato, i = FASCE.indexOf(fascia); if (i < 0) return { ok: false, motivo: 'cosa' };
  if (M.osservato) return { ok: false, motivo: 'aperta' };
  const costo = costoOsservatore(C, fascia); if (C.monete < costo) return { ok: false, motivo: 'soldi', monete: costo };
  M.ricerche = (M.ricerche || 0) + 1;
  const g = pesca(C, clubs, `${C.id}/osservatore/${M.ricerche}`, C.div, reparto, i / 3, (i + 1) / 3); if (!g) return { ok: false, motivo: 'nessuno' };
  muovi(C, -costo, 0, 'osservatore', `Osservatore: fascia ${fascia}`);
  M.osservato = { ...g, pieno: g.prezzo, prezzo: arrotonda(g.prezzo * (1 - ECONOMIA.mercato.osservatore.sconto)), fascia };
  return { ok: true, monete: costo, giocatore: M.osservato };
}
/** Quanto costa chiamare l'agente: un contatto e monete. Un contatto si può anche comprare coi diamanti. */
export const costoAgente = (C) => inMonete(C, ECONOMIA.mercato.agente.vittorie);
export function compraContatto(C) {
  const g = ECONOMIA.mercato.agente.diamanti; if (C.gemme < g) return { ok: false, motivo: 'soldi', gemme: g };
  muovi(C, 0, -g, 'agente', 'Contatto dell\'agente'); C.contatti = (C.contatti || 0) + 1;
  return { ok: true, gemme: g };
}
/**
 * L'agente: per un contatto e monete trova un giocatore della divisione sopra, a prezzo pieno (dalla Serie Cadetta sono
 * i giocatori veri del Campionato Sammarinese; in cima, i migliori). Resta in attesa finché non si compra o si lascia.
 */
export function agente(C, clubs, reparto = null) {
  const M = C.mercato; if (M.agente) return { ok: false, motivo: 'aperta' };
  if (!(C.contatti > 0)) return { ok: false, motivo: 'contatto' };
  const costo = costoAgente(C); if (C.monete < costo) return { ok: false, motivo: 'soldi', monete: costo };
  M.chiamate = (M.chiamate || 0) + 1;
  const g = pesca(C, clubs, `${C.id}/agente/${M.chiamate}`, Math.max(1, C.div - 1), reparto, .5, 1, C.div === 1); if (!g) return { ok: false, motivo: 'nessuno' };
  C.contatti--; muovi(C, -costo, 0, 'agente', 'Agente: ricerca');
  M.agente = g;
  return { ok: true, monete: costo, giocatore: g };
}
/** Compra il giocatore trovato dall'osservatore o dall'agente (chi: 'osservato' o 'agente'), oppure lo lascia andare. */
export function compraTrovato(C, clubs, chi, oggi = new Date()) {
  const g = C.mercato[chi]; if (!g) return { ok: false, motivo: 'giocatore' };
  const r = compra(C, clubs, g, g.prezzo, 0, chi === 'agente' ? 'Agente' : 'Osservatore', oggi); if (r.ok) C.mercato[chi] = null;
  return r;
}
export function lasciaTrovato(C, chi) { C.mercato[chi] = null; }
/**
 * Le offerte a tempo: giocatori della divisione sopra (in cima, i migliori) che costano il loro valore in monete più
 * diamanti. Cambiano ogni ECONOMIA.mercato.offerte.ore ore. Per ognuna: il giocatore, prezzo, gemme, scade, presa.
 */
export function offerte(C, clubs, oggi = new Date()) {
  const O = ECONOMIA.mercato.offerte, durata = O.ore * 36e5, giro = Math.floor(oggi.getTime() / durata), M = C.mercato;
  if (!M.offerte || M.offerte.chiave !== giro) M.offerte = { chiave: giro, prese: [] };
  const out = [];
  for (let k = 0; k < O.quante; k++) { const g = pesca(C, clubs, `${C.id}/offerta/${giro}/${k}`, Math.max(1, C.div - 1), null, .6, 1, C.div === 1); if (g) out.push({ ...g, k, gemme: O.diamanti, scade: (giro + 1) * durata, presa: M.offerte.prese.includes(k) }); }
  return out;
}
/** Compra l'offerta a tempo k. */
export function compraOfferta(C, clubs, k, oggi = new Date()) {
  const g = offerte(C, clubs, oggi).find((x) => x.k === k); if (!g || g.presa) return { ok: false, motivo: 'giocatore' };
  const r = compra(C, clubs, g, g.prezzo, g.gemme, 'Offerta a tempo', oggi); if (r.ok) C.mercato.offerte.prese.push(k);
  return r;
}

/** Registra la partita di campionato dell'utente (gol fatti e subiti), simula le altre sette e passa alla giornata dopo. */
export function giocaCampionato(C, clubs, gf, gs, marcatori, rnd = Math.random, oggi = new Date()) {
  const p = prossima(C); if (!p) return null;
  C.ris[C.giornata] = C.cal[C.giornata].map(([a, b]) => (a === C.club ? [gf, gs] : b === C.club ? [gs, gf] : simula(clubs, a, b, rnd)));
  let monete = conta(C, gf, gs, marcatori, 'camp', oggi, rnd); C.giornata++;
  if (p.inCasa) { const b = bonusCasa(C); if (b) { muovi(C, b, 0, 'incasso', 'Incasso dello stadio'); monete += b; } }
  const tab = classifica(C, clubs), pos = tab.findIndex((r) => r.id === C.club) + 1, finita = C.giornata >= C.cal.length;
  if (finita) {
    C.campione = tab[0].id; if (pos <= 4) evento(C, 'top4', 1, oggi);
    if (tab[0].id === C.club) { const m = inMonete(C, ECONOMIA.premi.campionato); C.trofei.push({ stagione: C.stagione, tipo: 'Campionato', div: C.div }); muovi(C, m, 0, 'trofeo', `${divisione(C).nome}: vinto`); monete += m; }
    // chi non vince ha il premio del suo piazzamento, dal secondo posto fin dove arriva l'elenco
    else if (ECONOMIA.premi.piazzamento[pos - 2]) { const m = inMonete(C, ECONOMIA.premi.piazzamento[pos - 2]); muovi(C, m, 0, 'piazzamento', `${divisione(C).nome}: ${pos}° posto`); monete += m; }
  }
  return { posizione: pos, finita, campione: C.campione, monete };
}

// Eliminazione diretta (Coppa Titano e fase finale del Trofeo dei Castelli): k = { turno, squadre, storia, fuori, vinta, campione }
function koProssima(k, club, turni) {
  if (!k || k.fuori !== null || k.vinta || k.campione) return null;
  const i = k.squadre.indexOf(club); if (i < 0) return null;
  return { turno: k.turno, nome: turni[k.turno], avv: k.squadre[i ^ 1] };
}
/** La prossima partita di coppa dell'utente, o null se è fuori o la coppa è finita. */
export function coppaProssima(C) { return koProssima(C.coppa, C.club, TURNI); }

// passa chi segna di più; in parità decidono i rigori, simulati tiro per tiro
function rigori(rnd) { let a = 0, b = 0; for (let i = 0; i < 5; i++) { a += rnd() < .76; b += rnd() < .76; } while (a === b) { a += rnd() < .76; b += rnd() < .76; } return [a, b]; }

/** Registra la partita di coppa dell'utente, simula le altre del turno e prepara il turno dopo. `rig` sono i rigori giocati dall'utente
 * [segnati, subiti]; se manca e la partita è finita pari, vengono simulati. Se l'utente esce, la coppa va avanti da sola fino alla finale. */
export function giocaCoppa(C, clubs, gf, gs, marcatori, rnd = Math.random, rig = null, oggi = new Date()) {
  const pr = coppaProssima(C); if (!pr) return null;
  const esito = koGioca(C, clubs, C.coppa, pr, conta(C, gf, gs, marcatori, 'coppa', oggi, rnd), gf, gs, rnd, rig, ECONOMIA.premi.coppa, 'Coppa Titano');
  if (esito.passa && pr.turno === 0) evento(C, 'quarti', 1, oggi);
  return esito;
}
function koGioca(C, clubs, k, pr, premio, gf, gs, rnd, rig, premioVinta, trofeo) {
  let esito = { passa: gf > gs, rigori: null, vinta: false, turno: pr.nome, monete: premio };
  const avanti = (utente) => {
    const dopo = [], giocate = [];
    for (let i = 0; i < k.squadre.length; i += 2) {
      const a = k.squadre[i], b = k.squadre[i + 1]; let r, rg = null;
      if (utente && (a === C.club || b === C.club)) { r = a === C.club ? [gf, gs] : [gs, gf]; if (gf === gs) { const miei = rig && rig[0] !== rig[1] ? rig.slice(0, 2) : rigori(rnd); rg = a === C.club ? miei : [miei[1], miei[0]]; esito.rigori = miei; esito.passa = miei[0] > miei[1]; } }
      else { r = simula(clubs, a, b, rnd); if (r[0] === r[1]) rg = rigori(rnd); }
      const vince = r[0] > r[1] || (r[0] === r[1] && rg[0] > rg[1]) ? a : b;
      dopo.push(vince); giocate.push({ a, b, r, rg });
    }
    k.storia.push(giocate); k.squadre = dopo; k.turno++;
  };
  avanti(true);
  if (!esito.passa) { k.fuori = pr.turno; while (k.squadre.length > 1) avanti(false); k.campione = k.squadre[0]; }
  else { // turno superato
    const vinta = k.squadre.length === 1, m = inMonete(C, ECONOMIA.premi.turno) + (vinta ? inMonete(C, premioVinta) : 0);
    muovi(C, m, vinta ? ECONOMIA.diamanti.coppa : 0, vinta ? 'trofeo' : 'turno', vinta ? `${trofeo}: vinto` : `${trofeo}: turno superato`); esito.monete += m; puntiPercorso(C, 'turno');
    // arrivare in finale dà un allenatore leggendario e un contatto dell'agente
    if (k.squadre.length === 2) { daiAllenatore(C, 'leggendario', null, rnd); C.contatti = (C.contatti || 0) + 1; esito.finale = true; }
  }
  if (esito.passa && k.squadre.length === 1) { k.vinta = true; k.campione = C.club; esito.vinta = true; C.trofei.push({ stagione: C.stagione, tipo: trofeo }); }
  return esito;
}

/* ---------- Trofeo dei Castelli ---------- */
export const castelliGirone = (C) => C.castelli.gironi.findIndex((g) => g.includes(C.club));
/** La classifica di un girone del Trofeo dei Castelli. */
export function castelliTabella(C, gi) {
  const k = C.castelli, T = {}; for (const id of k.gironi[gi]) T[id] = { id, g: 0, v: 0, n: 0, p: 0, gf: 0, gs: 0, pt: 0 };
  k.ris.forEach((giro, r) => (giro[gi] || []).forEach((res, j) => {
    if (!res) return; const [ia, ib] = GIRO[r][j], A = T[k.gironi[gi][ia]], B = T[k.gironi[gi][ib]];
    A.g++; B.g++; A.gf += res[0]; A.gs += res[1]; B.gf += res[1]; B.gs += res[0];
    if (res[0] > res[1]) { A.v++; A.pt += 3; B.p++; } else if (res[0] < res[1]) { B.v++; B.pt += 3; A.p++; } else { A.n++; B.n++; A.pt++; B.pt++; }
  }));
  return Object.values(T).sort((x, y) => y.pt - x.pt || (y.gf - y.gs) - (x.gf - x.gs) || y.gf - x.gf || x.id.localeCompare(y.id));
}
/** La prossima partita dell'utente nel Trofeo dei Castelli, o null se è fuori o il trofeo è finito. */
export function castelliProssima(C) {
  const k = C.castelli; if (k.fuori !== null || k.vinta || k.campione) return null;
  if (k.ko) { const p = koProssima(k.ko, C.club, TURNI_KO); return p && { ...p, fase: 'ko', inCasa: false }; }
  const gi = castelliGirone(C), g = k.gironi[gi], [ia, ib] = GIRO[k.giornata].find(([a, b]) => g[a] === C.club || g[b] === C.club);
  return { fase: 'gironi', girone: gi, giornata: k.giornata + 1, totale: 3, nome: `Gironi · giornata ${k.giornata + 1} di 3`, avv: g[ia] === C.club ? g[ib] : g[ia], inCasa: g[ia] === C.club };
}
// I quarti: la prima di un girone contro la seconda di un altro, e le due prime dello stesso lato si incontrano solo in finale
function castelliTabellone(C) { const t = [0, 1, 2, 3].map((gi) => castelliTabella(C, gi).map((r) => r.id)); return [t[0][0], t[1][1], t[2][0], t[3][1], t[1][0], t[0][1], t[3][0], t[2][1]]; }
/** Registra la partita dell'utente nel Trofeo dei Castelli e simula le altre di quella giornata (o di quel turno). */
export function giocaCastelli(C, clubs, gf, gs, marcatori, rnd = Math.random, rig = null, oggi = new Date()) {
  const k = C.castelli, pr = castelliProssima(C); if (!pr) return null;
  const premio = conta(C, gf, gs, marcatori, 'castelli', oggi, rnd);
  if (pr.fase === 'ko') { // la fase finale tiene il suo stato in k.ko; qui si riporta l'esito sul trofeo
    const e = koGioca(C, clubs, k.ko, pr, premio, gf, gs, rnd, rig, ECONOMIA.premi.castelli, 'Trofeo dei Castelli');
    if (k.ko.vinta) k.vinta = true; if (k.ko.fuori !== null) k.fuori = k.ko.fuori; if (k.ko.campione) k.campione = k.ko.campione;
    return e;
  }
  let monete = premio; if (pr.inCasa) { const b = bonusCasa(C); if (b) { muovi(C, b, 0, 'incasso', 'Incasso dello stadio'); monete += b; } }
  k.ris[k.giornata] = k.gironi.map((g) => GIRO[k.giornata].map(([ia, ib]) => (g[ia] === C.club ? [gf, gs] : g[ib] === C.club ? [gs, gf] : simula(clubs, g[ia], g[ib], rnd))));
  k.giornata++;
  const tab = castelliTabella(C, pr.girone), pos = tab.findIndex((r) => r.id === C.club) + 1, esito = { fase: 'gironi', posizione: pos, finiti: k.giornata >= 3, passa: null, monete };
  if (esito.finiti) {
    k.ko = { turno: 0, squadre: castelliTabellone(C), storia: [], fuori: null, vinta: false, campione: null };
    esito.passa = pos <= 2;
    if (esito.passa) evento(C, 'gironi', 1, oggi);
    else { // fuori ai gironi: il trofeo va avanti da solo fino alla finale
      k.fuori = 'gironi'; const ko = k.ko;
      while (ko.squadre.length > 1) { const dopo = [], giocate = []; for (let i = 0; i < ko.squadre.length; i += 2) { const a = ko.squadre[i], b = ko.squadre[i + 1], r = simula(clubs, a, b, rnd), rg = r[0] === r[1] ? rigori(rnd) : null; dopo.push(r[0] > r[1] || (rg && rg[0] > rg[1]) ? a : b); giocate.push({ a, b, r, rg }); } ko.storia.push(giocate); ko.squadre = dopo; ko.turno++; }
      k.campione = ko.campione = ko.squadre[0];
    }
  }
  return esito;
}
/** Chi ha vinto il Trofeo dei Castelli, se è finito. */
export const castelliCampione = (C) => C.castelli.campione || (C.castelli.ko && C.castelli.ko.campione) || null;

export function capocannoniere(C) { return marcatori(C, 1)[0] || null; }
/** I migliori marcatori del club in tutta la carriera, dal primo: [{ nome, gol }]. */
export function marcatori(C, quanti = 3) { return Object.entries(C.stat.marc).sort((a, b) => b[1] - a[1]).slice(0, quanti).map(([nome, gol]) => ({ nome, gol })); }

/* ---------- per la home ---------- */
/** Di quanti posti è salita (o scesa, se negativo) ogni squadra con l'ultima giornata giocata. */
export function salite(C, clubs) {
  const ora = classifica(C, clubs).map((r) => r.id), out = {};
  if (!C.ris.length) { for (const id of ora) out[id] = 0; return out; }
  const prima = classifica({ ...C, ris: C.ris.slice(0, -1) }, clubs).map((r) => r.id);
  for (const id of ora) out[id] = C.ris.length > 1 ? prima.indexOf(id) - ora.indexOf(id) : 0;
  return out;
}
/**
 * Le notifiche della home, calcolate dai dati: premi delle sfide e del percorso da ritirare, partite di coppa da giocare,
 * miglioramenti che ci si può permettere. Ognuna dice dove porta (vai).
 */
export function notifiche(C, oggi = new Date()) {
  const out = [], st = statoSfide(C, oggi), pe = statoPercorso(C);
  if (st.daRiscuotere) out.push({ t: st.daRiscuotere === 1 ? 'Un premio delle sfide da riscuotere' : `${st.daRiscuotere} premi delle sfide da riscuotere`, vai: 'sfide' });
  if (pe.daRitirare) out.push({ t: pe.daRitirare === 1 ? 'Un premio del percorso da ritirare' : `${pe.daRitirare} premi del percorso da ritirare`, vai: 'percorso' });
  const cp = coppaProssima(C), cc = castelliProssima(C);
  if (cp) out.push({ t: `Coppa Titano: ${cp.nome} da giocare`, vai: 'coppa' });
  if (cc) out.push({ t: `Trofeo dei Castelli: ${cc.nome} da giocare`, vai: 'castelli' });
  if (STRUTTURE.some((q) => { const c = costoStruttura(C, q); return c && C.monete >= c.monete && C.gemme >= c.gemme; })) out.push({ t: 'Puoi migliorare una struttura del club', vai: 'club' });
  if (quantiAllenatori(C)) out.push({ t: 'Hai allenatori da usare sui giocatori', vai: 'squadra' });
  return out;
}

/* ---------- energia dei giocatori del club, tra una partita e l'altra ---------- */
/** L'energia salvata di un giocatore del club, da 0 a 100 (100 se non ha ancora giocato). */
export const energiaDi = (C, nome) => { const e = (C.energia || {})[nome]; return typeof e === 'number' ? Math.max(0, Math.min(100, Math.round(e))) : 100; };
/** Quanta energia recupera ogni giocatore tra una partita e l'altra: di più con l'Infermeria. */
export const recupero = (C) => Math.round(ECONOMIA.energia.recupero * (1 + stelle(C, 'infermeria') * ECONOMIA.strutture.infermeria));
/**
 * Dopo una partita di carriera: chi ha giocato resta con l'energia con cui è uscito dal campo, poi tutta la rosa
 * recupera. `finali` è l'elenco { nome, energia } dei giocatori del club scesi in campo.
 */
export function energiaDopoPartita(C, clubs, finali) {
  const mio = trova(clubs, C.club); if (!mio) return;
  const E = C.energia || (C.energia = {}), su = recupero(C);
  for (const g of finali) E[g.nome] = Math.max(0, Math.min(100, Math.round(g.energia)));
  const rosa = new Set(mio.xi.concat(mio.pan || []).map((x) => x[0]));
  for (const nome of rosa) E[nome] = Math.min(100, energiaDi(C, nome) + su);
  // chi non è più in rosa non si tiene, e chi è al massimo non serve scriverlo
  for (const nome of Object.keys(E)) if (!rosa.has(nome) || E[nome] >= 100) delete E[nome];
}
/** La chiave della prossima partita di una competizione: la stessa partita ha sempre la stessa. */
const chiavePartita = (C, tipo) => `${C.stagione}/${tipo}/${tipo === 'camp' ? C.giornata : tipo === 'coppa' ? C.coppa.turno : `${C.castelli.giornata}-${C.castelli.ko ? C.castelli.ko.turno : 'g'}`}`;
/**
 * Lo stato del riscaldamento: costo in monete, di quanto alza le statistiche dei titolari (in percento), per quante
 * partite vale (di più col Centro allenamento), se è già attivo, se si può pagare.
 */
export function statoRiscaldamento(C) {
  const R = ECONOMIA.energia.riscaldamento, monete = inMonete(C, R.vittorie), fatto = (C.caldo || 0) > 0;
  return { monete, bonus: Math.round(R.bonus * 100), partite: ECONOMIA.strutture.centro.riscaldamento[stelle(C, 'centro')], restano: C.caldo || 0, fatto, serve: !fatto, puo: C.monete >= monete };
}
/** Riscaldamento: per monete, le statistiche dei titolari salgono nelle prossime partite. Non si somma a uno già attivo. */
export function riscaldamento(C) {
  const st = statoRiscaldamento(C);
  if (st.fatto) return { ok: false, motivo: 'fatto' };
  if (!st.puo) return { ok: false, motivo: 'monete', monete: st.monete };
  muovi(C, -st.monete, 0, 'riscaldamento', 'Riscaldamento prima della partita'); C.caldo = st.partite;
  return { ok: true, monete: st.monete, bonus: st.bonus, partite: st.partite };
}

/** Gli interventi del fisioterapista, dal più piccolo. */
export const INTERVENTI = ['piccolo', 'medio', 'completo'];
/**
 * Il fisioterapista: quanti punti di energia mancano a tutta la rosa e, per ogni intervento, quanta energia ridà a
 * ogni giocatore, quanto costa e se si può pagare. Quello completo si può pagare anche in diamanti.
 */
export function statoFisio(C, clubs) {
  const F = ECONOMIA.energia.fisio, mio = trova(clubs, C.club), rosa = mio ? mio.xi.concat(mio.pan || []) : [], manca = rosa.reduce((s, x) => s + 100 - energiaDi(C, x[0]), 0);
  const interventi = INTERVENTI.map((id) => { const monete = inMonete(C, F[id].vittorie); return { id, energia: F[id].energia, monete, puo: C.monete >= monete }; });
  return { manca, interventi, gemme: ECONOMIA.diamanti.fisio, puoGemme: C.gemme >= ECONOMIA.diamanti.fisio };
}
/** Fisioterapista: ogni giocatore della rosa recupera l'energia dell'intervento scelto. `conDiamanti` vale solo per quello completo. */
export function fisioterapia(C, clubs, quale = 'completo', conDiamanti = false) {
  const st = statoFisio(C, clubs), x = st.interventi.find((y) => y.id === quale), mio = trova(clubs, C.club);
  if (!x || (conDiamanti && quale !== 'completo')) return { ok: false, motivo: 'cosa' };
  if (!st.manca) return { ok: false, motivo: 'pieni' };
  if (conDiamanti ? !st.puoGemme : !x.puo) return { ok: false, motivo: 'soldi', monete: x.monete, gemme: st.gemme };
  const E = C.energia || (C.energia = {});
  for (const g of mio.xi.concat(mio.pan || [])) { const e = Math.min(100, energiaDi(C, g[0]) + x.energia); if (e >= 100) delete E[g[0]]; else E[g[0]] = e; }
  muovi(C, conDiamanti ? 0 : -x.monete, conDiamanti ? -st.gemme : 0, 'fisioterapista', `Fisioterapista: intervento ${quale}`);
  return { ok: true, monete: conDiamanti ? 0 : x.monete, gemme: conDiamanti ? st.gemme : 0 };
}

/* ---------- la rosa del club: chi gioca e dove, gli incarichi ---------- */
/**
 * Mette in campo e in panchina i giocatori del club nell'ordine dato. Devono essere gli stessi di prima: undici titolari,
 * il primo è un portiere e gli altri no (il posto di ogni titolare è quello del modulo, nello stesso ordine).
 */
export function schiera(C, clubs, xi, pan) {
  const mio = trova(clubs, C.club); if (!mio) return { ok: false, motivo: 'squadra' };
  const nomi = (l) => l.map((x) => x[0]).sort().join('|');
  if (xi.length !== 11 || nomi(xi.concat(pan)) !== nomi(mio.xi.concat(mio.pan || []))) return { ok: false, motivo: 'giocatore' };
  if (xi[0][1] !== 'P' || xi.slice(1).some((x) => x[1] === 'P')) return { ok: false, motivo: 'portiere' };
  C.rose[mio.id] = xi.map((x) => x.slice()); C.panchine = C.panchine || {}; C.panchine[mio.id] = pan.map((x) => x.slice()); applica(C, clubs);
  return { ok: true };
}
/** Scambia di posto due giocatori del club: a e b dicono dove ('xi' titolari, 'pan' panchina) e quale (i). */
export function spostaGiocatori(C, clubs, a, b) {
  const mio = trova(clubs, C.club); if (!mio) return { ok: false, motivo: 'squadra' };
  const liste = { xi: mio.xi.map((x) => x.slice()), pan: (mio.pan || []).map((x) => x.slice()) }, ga = liste[a.dove] && liste[a.dove][a.i], gb = liste[b.dove] && liste[b.dove][b.i];
  if (!ga || !gb || ga === gb) return { ok: false, motivo: 'giocatore' };
  liste[a.dove][a.i] = gb; liste[b.dove][b.i] = ga;
  return schiera(C, clubs, liste.xi, liste.pan);
}
/** Gli incarichi che si possono dare a un titolare. */
export const INCARICHI = ['capitano', 'rigori', 'punizioni', 'angoli'];
/** Dà un incarico (capitano, rigori, punizioni, angoli) a un titolare del club. */
export function assegnaIncarico(C, clubs, tipo, nome) {
  const mio = trova(clubs, C.club);
  if (!mio || !INCARICHI.includes(tipo) || !mio.xi.some((x) => x[0] === nome)) return false;
  if (tipo === 'capitano') C.mio = { ...(C.mio || {}), capitano: nome }; else C.incarichi = { ...(C.incarichi || {}), [tipo]: nome };
  return true;
}
/** Chi ha un incarico, se è ancora tra i titolari (altrimenti niente: lo sceglie la schermata tra i più adatti). */
export function incaricato(C, clubs, tipo) {
  const mio = trova(clubs, C.club), nome = tipo === 'capitano' ? (C.mio || {}).capitano : (C.incarichi || {})[tipo];
  return mio && nome && mio.xi.some((x) => x[0] === nome) ? nome : null;
}

/* ---------- orario e tempo di una partita (solo da mostrare, più giorno o notte in campo) ---------- */
/** Orario, cielo e gradi della prossima partita di `tipo`: sempre gli stessi per la stessa partita. */
export function meteoPartita(C, tipo) {
  let h = 2166136261; for (const ch of C ? chiavePartita(C, tipo) + C.id : String(tipo)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } h >>>= 0;
  const [orario, ora] = METEO.orari[h % METEO.orari.length], cielo = METEO.cieli[(h >>> 4) % METEO.cieli.length];
  return { orario, ora, cielo, gradi: METEO.gradi[0] + ((h >>> 8) % (METEO.gradi[1] - METEO.gradi[0] + 1)) };
}
