/* Carriera: campionato a 16 squadre (15 giornate, girone unico), Coppa Titano a eliminazione diretta, Trofeo dei Castelli a gironi,
   sfide giornaliere, settimanali, di carriera e di stagione, stadio, allenamento, monete e gemme, statistiche e trofei.
   Qui c'è solo la logica, senza schermate: lo stato è un oggetto semplice che si salva così com'è sul dispositivo e, con
   l'accesso, anche sull'account (vedi cloud.js). */
import { ECONOMIA, METEO } from './config.js';

export const KEY = 'fantatitano-carriera';
export const TURNI = ['Ottavi di finale', 'Quarti di finale', 'Semifinale', 'Finale'];
export const TURNI_KO = ['Quarti di finale', 'Semifinale', 'Finale']; // Trofeo dei Castelli, dopo i gironi
// Monete: quante all'inizio, per risultato, per gol segnato, per turno di coppa superato, per i trofei; quanto vale chi si cede rispetto al suo prezzo
export const PREMI = { inizio: 500, gemme: 20, v: 300, n: 120, p: 50, gol: 20, turno: 150, campione: 3000, coppa: 2000, castelli: 1500, cessione: .7 };
// Stadio: posti e monete in più per ogni partita giocata in casa; per salire di livello servono monete e, dal terzo, gemme
export const STADIO = [
  { posti: 1000, bonus: 0 }, { posti: 2500, bonus: 60, monete: 1500, gemme: 0 }, { posti: 5000, bonus: 130, monete: 4000, gemme: 10 },
  { posti: 8000, bonus: 220, monete: 9000, gemme: 25 }, { posti: 12000, bonus: 350, monete: 18000, gemme: 50 },
];
// Allenamento: ogni seduta alza di un punto la quotazione di un giocatore; costa base + passo per ogni seduta già fatta, fino a max
export const ALLENA = { base: 200, passo: 150, max: 6 };
// Le sfide. m è il contatore che le fa avanzare, n quanto serve. Giornaliere e settimanali ripartono da zero, quelle di stagione a ogni stagione
export const SFIDE = {
  d: [
    { id: 'd1', t: 'Gioca una partita', m: 'gioca', n: 1, monete: 100 },
    { id: 'd2', t: 'Vinci una partita', m: 'vinte', n: 1, monete: 150 },
    { id: 'd3', t: 'Segna 3 gol', m: 'gol', n: 3, monete: 120 },
    { id: 'd4', t: 'Chiudi una partita senza subire gol', m: 'inviolate', n: 1, monete: 150 },
    { id: 'd5', t: 'Gioca una partita di coppa', m: 'coppa', n: 1, monete: 100 },
  ],
  w: [
    { id: 'w1', t: 'Vinci 5 partite', m: 'vinte', n: 5, monete: 600 },
    { id: 'w2', t: 'Segna 12 gol', m: 'gol', n: 12, monete: 500 },
    { id: 'w3', t: 'Gioca 3 partite di coppa', m: 'coppa', n: 3, monete: 400 },
    { id: 'w4', t: 'Compra un giocatore al mercato', m: 'acquisti', n: 1, monete: 300 },
    { id: 'w5', t: 'Fai 3 sedute di allenamento', m: 'allenamenti', n: 3, monete: 300 },
  ],
  c: [
    { id: 'c1', t: 'Vinci il campionato', m: 'campionati', n: 1, gemme: 50 },
    { id: 'c2', t: 'Vinci la Coppa Titano', m: 'coppe', n: 1, gemme: 30 },
    { id: 'c3', t: 'Vinci il Trofeo dei Castelli', m: 'castelli', n: 1, gemme: 30 },
    { id: 'c4', t: 'Porta lo stadio al livello 3', m: 'stadio', n: 3, gemme: 20 },
  ],
  s: [
    { id: 's1', t: 'Vinci 5 partite di campionato', m: 'vinteCamp', n: 5, monete: 400 },
    { id: 's2', t: 'Vinci 10 partite di campionato', m: 'vinteCamp', n: 10, monete: 800 },
    { id: 's3', t: 'Chiudi il campionato tra le prime 4', m: 'top4', n: 1, gemme: 10 },
    { id: 's4', t: 'Segna 25 gol in campionato', m: 'golCamp', n: 25, monete: 600 },
    { id: 's5', t: 'Arriva ai quarti di Coppa Titano', m: 'quarti', n: 1, monete: 400 },
    { id: 's6', t: 'Passa i gironi del Trofeo dei Castelli', m: 'gironi', n: 1, monete: 400 },
    { id: 's7', t: 'Chiudi 3 partite senza subire gol', m: 'inviolate', n: 3, monete: 400 },
    { id: 's8', t: 'Vinci 3 partite di fila', m: 'serieMax', n: 3, gemme: 10 },
  ],
};
export const BONUS = { d: { gemme: 5 }, w: { gemme: 15 } }; // tutte le giornaliere (o tutte le settimanali) fatte
export const GRUPPI = { d: 'Giornaliere', w: 'Settimanali', c: 'Carriera', s: 'Stagione' };

const mescola = (a, rnd) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function poisson(l, rnd) { const L = Math.exp(-l); let k = 0, p = 1; do { k++; p *= rnd(); } while (p > L); return k - 1; }
const forza = (clubs, id) => (clubs.find((c) => c.id === id) || { str: 3 }).str;

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

export function nuova(clubs, nome, clubId, rnd = Math.random, mio = null) {
  const ids = clubs.map((c) => c.id);
  return { v: 1, id: idCarriera(), rev: 0, agg: Date.now(), nome: String(nome || 'Mister').slice(0, 18), club: clubId, mio, stagione: 1, giornata: 0, cal: calendario(ids, rnd), ris: [], coppa: nuovaCoppa(ids, rnd),
    castelli: nuoviCastelli(ids, rnd), stat: { g: 0, v: 0, n: 0, p: 0, gf: 0, gs: 0, marc: {} }, trofei: [], campione: null, monete: PREMI.inizio, gemme: PREMI.gemme,
    stadio: 1, allen: {}, sfide: nuoveSfide(), rose: {}, panchine: {}, movimenti: [], allenatore: 1, avatar: 0, storico: [], percorso: { stagione: 1, punti: 0, presi: [] }, oggetti: {}, scelte: {}, consigli: 0 };
}

export function nuovaStagione(C, clubs, rnd = Math.random) {
  const ids = clubs.map((c) => c.id);
  C.stagione++; C.giornata = 0; C.cal = calendario(ids, rnd); C.ris = []; C.coppa = nuovaCoppa(ids, rnd); C.castelli = nuoviCastelli(ids, rnd); C.campione = null;
  C.sfide.s = { chiave: C.stagione, c: {} }; C.percorso = { stagione: C.stagione, punti: 0, presi: [] };
  return C;
}

/** Completa una carriera salvata da una versione precedente del gioco con i campi che allora non c'erano. */
export function completa(C, clubs = null, rnd = Math.random) {
  if (!(C && C.v === 1 && C.club && Array.isArray(C.cal))) return null;
  if (typeof C.monete !== 'number') C.monete = PREMI.inizio; C.rose = C.rose || {}; C.movimenti = C.movimenti || []; // prima del mercato
  if (typeof C.gemme !== 'number') C.gemme = PREMI.gemme; if (!C.stadio) C.stadio = 1; C.allen = C.allen || {}; C.panchine = C.panchine || {};
  if (!C.sfide) C.sfide = nuoveSfide(); if (!C.id) C.id = idCarriera(); if (typeof C.rev !== 'number') C.rev = 0; if (!C.agg) C.agg = Date.now(); if (C.mio === undefined) C.mio = null;
  if (!C.castelli) C.castelli = nuoviCastelli(clubs ? clubs.map((c) => c.id) : [...new Set(C.cal[0].flat())], rnd);
  // prima della home nuova: allenatore, avatar, storico di entrate e uscite, percorso premi
  if (!C.allenatore) C.allenatore = 1; if (typeof C.avatar !== 'number') C.avatar = 0; if (!Array.isArray(C.storico)) C.storico = [];
  if (!C.percorso || C.percorso.stagione !== C.stagione) C.percorso = { stagione: C.stagione, punti: 0, presi: [] };
  // prima del negozio: oggetti comprati e scelte. Chi aveva già un avatar o un disegno poi diventati a pagamento se li tiene
  if (!C.oggetti || typeof C.oggetti !== 'object') C.oggetti = {}; if (!C.scelte || typeof C.scelte !== 'object') C.scelte = {}; if (typeof C.consigli !== 'number') C.consigli = 0;
  if (!NEGOZIO.avatar.gratis.includes(C.avatar) && NEGOZIO.avatar.tutti.includes(C.avatar) && !(C.oggetti.avatar || []).includes(C.avatar)) (C.oggetti.avatar = C.oggetti.avatar || []).push(C.avatar);
  if (C.mio && NEGOZIO.disegno.tutti.includes(C.mio.stile) && !(C.oggetti.disegno || []).includes(C.mio.stile)) (C.oggetti.disegno = C.oggetti.disegno || []).push(C.mio.stile);
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
  const T = {}; for (const c of clubs) T[c.id] = { id: c.id, g: 0, v: 0, n: 0, p: 0, gf: 0, gs: 0, pt: 0 };
  C.ris.forEach((giornata, r) => giornata.forEach((res, k) => {
    if (!res) return; const [a, b] = C.cal[r][k], A = T[a], B = T[b];
    A.g++; B.g++; A.gf += res[0]; A.gs += res[1]; B.gf += res[1]; B.gs += res[0];
    if (res[0] > res[1]) { A.v++; A.pt += 3; B.p++; } else if (res[0] < res[1]) { B.v++; B.pt += 3; A.p++; } else { A.n++; B.n++; A.pt++; B.pt++; }
  }));
  // a parità di punti: differenza reti, poi gol fatti, poi il nome della squadra
  const nome = {}; for (const c of clubs) nome[c.id] = c.name;
  return Object.values(T).sort((x, y) => y.pt - x.pt || (y.gf - y.gs) - (x.gf - x.gs) || y.gf - x.gf || nome[x.id].localeCompare(nome[y.id], 'it'));
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
/** Il giudizio sulle finanze del club, dal saldo in monete. */
export function finanze(C) { return ECONOMIA.finanze.find(([fino]) => C.monete < fino)[1]; }

/* ---------- percorso premi della stagione ---------- */
const percorsoDi = (C) => { if (!C.percorso || C.percorso.stagione !== C.stagione) C.percorso = { stagione: C.stagione, punti: 0, presi: [] }; return C.percorso; };
/** Aggiunge al percorso i punti di una fonte (partita, vinta, sfidaD, sfidaW, sfidaS, sfidaC, turno). */
export function puntiPercorso(C, fonte, n = 1) { percorsoDi(C).punti += (ECONOMIA.percorso.punti[fonte] || 0) * n; }
/** Lo stato del percorso: livello raggiunto, punti nel livello in corso, i premi coi loro stati, quanti da ritirare. */
export function statoPercorso(C) {
  const P = percorsoDi(C), E = ECONOMIA.percorso, livello = Math.min(E.premi.length, Math.floor(P.punti / E.perLivello));
  const premi = E.premi.map((x, i) => ({ livello: i + 1, monete: x.m || 0, gemme: x.g || 0, raggiunto: i < livello, preso: P.presi.includes(i + 1) }));
  // livello: quanti livelli sono stati raggiunti, 0 all'inizio. inCorso: il livello che si sta facendo, da 1: è quello che si mostra
  return { livello, inCorso: Math.min(E.premi.length, livello + 1), livelli: E.premi.length, punti: P.punti, nelLivello: livello >= E.premi.length ? E.perLivello : P.punti % E.perLivello, perLivello: E.perLivello, premi, daRitirare: premi.filter((x) => x.raggiunto && !x.preso).length };
}
/** Ritira il premio di un livello raggiunto (0 = tutti quelli da ritirare). */
export function ritiraPercorso(C, livello = 0) {
  const st = statoPercorso(C), tot = { ok: false, monete: 0, gemme: 0, n: 0 };
  for (const x of st.premi) {
    if (!x.raggiunto || x.preso || (livello && x.livello !== livello)) continue;
    C.percorso.presi.push(x.livello); muovi(C, x.monete, x.gemme, 'percorso', `Percorso premi, livello ${x.livello}`);
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
/** Cambia subito il giocatore consigliato al mercato: costa diamanti, conta solo quante volte è stato fatto. */
export function rinnovaConsigli(C) {
  const g = ECONOMIA.negozio.rinnovo.g; if (C.gemme < g) return { ok: false, motivo: 'soldi', gemme: g };
  muovi(C, 0, -g, 'negozio', 'Nuovo giocatore consigliato'); C.consigli = (C.consigli || 0) + 1;
  return { ok: true };
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
    if (def.m === 'campionati') return C.trofei.filter((t) => t.tipo === 'Campionato').length;
    if (def.m === 'coppe') return C.trofei.filter((t) => t.tipo === 'Coppa Titano').length;
    if (def.m === 'castelli') return C.trofei.filter((t) => t.tipo === 'Trofeo dei Castelli').length;
    if (def.m === 'stadio') return C.stadio;
  }
  return C.sfide[gruppo].c[def.m] || 0;
}
const chiavePremio = (C, gruppo, id) => (gruppo === 'c' ? `c:${id}` : `${gruppo}:${C.sfide[gruppo].chiave}:${id}`);
/** Lo stato di tutte le sfide, per le schermate: avanzamento, fatte, già riscosse, quante restano da riscuotere. */
export function statoSfide(C, oggi = new Date()) {
  aggiornaSfide(C, oggi);
  const out = { daRiscuotere: 0, conti: {}, bonus: {} };
  for (const g of Object.keys(SFIDE)) {
    out[g] = SFIDE[g].map((def) => { const prog = Math.min(def.n, valoreSfida(C, g, def)), fatto = prog >= def.n, preso = !!C.sfide.presi[chiavePremio(C, g, def.id)]; if (fatto && !preso) out.daRiscuotere++; return { ...def, prog, fatto, preso }; });
    out.conti[g] = [out[g].filter((x) => x.fatto).length, out[g].length];
    if (BONUS[g]) { const fatto = out[g].every((x) => x.fatto), preso = !!C.sfide.presi[chiavePremio(C, g, 'tutte')]; out.bonus[g] = { ...BONUS[g], fatto, preso }; if (fatto && !preso) out.daRiscuotere++; }
  }
  return out;
}
/** Riscuote il premio di una sfida fatta (id 'tutte' per il premio di gruppo). */
export function riscuoti(C, gruppo, id, oggi = new Date()) {
  const st = statoSfide(C, oggi), x = id === 'tutte' ? st.bonus[gruppo] : (st[gruppo] || []).find((y) => y.id === id);
  if (!x || !x.fatto || x.preso) return { ok: false };
  C.sfide.presi[chiavePremio(C, gruppo, id)] = 1; muovi(C, x.monete || 0, x.gemme || 0, 'sfida', id === 'tutte' ? `Tutte le sfide: ${GRUPPI[gruppo]}` : x.t);
  if (id !== 'tutte') puntiPercorso(C, { d: 'sfidaD', w: 'sfidaW', s: 'sfidaS', c: 'sfidaC' }[gruppo]);
  return { ok: true, monete: x.monete || 0, gemme: x.gemme || 0 };
}
/** Riscuote tutto quello che c'è da riscuotere. */
export function riscuotiTutto(C, oggi = new Date()) {
  const st = statoSfide(C, oggi), tot = { monete: 0, gemme: 0, n: 0 };
  for (const g of Object.keys(SFIDE)) {
    for (const x of st[g]) if (x.fatto && !x.preso) { const r = riscuoti(C, g, x.id, oggi); tot.monete += r.monete; tot.gemme += r.gemme; tot.n++; }
    if (st.bonus[g] && st.bonus[g].fatto && !st.bonus[g].preso) { const r = riscuoti(C, g, 'tutte', oggi); tot.monete += r.monete; tot.gemme += r.gemme; tot.n++; }
  }
  return tot;
}

// Una partita giocata dall'utente: statistiche, sfide, premio in monete. comp: 'camp', 'coppa' o 'castelli'
function conta(C, gf, gs, marcatori, comp = 'camp', oggi = new Date()) {
  const s = C.stat; s.g++; s.gf += gf; s.gs += gs; if (gf > gs) s.v++; else if (gf < gs) s.p++; else s.n++;
  for (const n of marcatori || []) s.marc[n] = (s.marc[n] || 0) + 1;
  const S = aggiornaSfide(C, oggi);
  for (const g of ['d', 'w', 's']) {
    const c = S[g].c; piu(c, 'gioca'); piu(c, 'gol', gf); if (gf > gs) piu(c, 'vinte'); if (gs === 0) piu(c, 'inviolate'); if (comp !== 'camp') piu(c, 'coppa');
    if (comp === 'camp') { piu(c, 'golCamp', gf); if (gf > gs) piu(c, 'vinteCamp'); }
    c.serie = gf > gs ? (c.serie || 0) + 1 : 0; c.serieMax = Math.max(c.serieMax || 0, c.serie);
  }
  puntiPercorso(C, 'partita'); if (gf > gs) puntiPercorso(C, 'vinta');
  // premio partita
  const m = (gf > gs ? PREMI.v : gf < gs ? PREMI.p : PREMI.n) + gf * PREMI.gol;
  muovi(C, m, 0, 'partita', `${gf > gs ? 'Vittoria' : gf < gs ? 'Sconfitta' : 'Pareggio'} ${gf}-${gs} (${{ camp: 'campionato', coppa: 'Coppa Titano', castelli: 'Trofeo dei Castelli' }[comp]})`); return m;
}
const bonusCasa = (C) => (STADIO[(C.stadio || 1) - 1] || STADIO[0]).bonus;

/* ---------- il club ---------- */
/** Stadio: sale di un livello se ci sono monete e gemme. */
export function miglioraStadio(C) {
  const prox = STADIO[C.stadio]; if (!prox) return { ok: false, motivo: 'massimo' };
  if (C.monete < prox.monete || C.gemme < prox.gemme) return { ok: false, motivo: 'soldi', monete: prox.monete, gemme: prox.gemme };
  muovi(C, -prox.monete, -prox.gemme, 'stadio', `Stadio al livello ${C.stadio + 1}`); C.stadio++;
  return { ok: true, livello: C.stadio };
}
/** Allenatore: sale di un livello se ci sono monete e diamanti. Più sedute per giocatore e sedute meno care. */
export function miglioraAllenatore(C) {
  const prox = ECONOMIA.allenatore.livelli[C.allenatore || 1]; if (!prox) return { ok: false, motivo: 'massimo' };
  if (C.monete < prox.monete || C.gemme < prox.gemme) return { ok: false, motivo: 'soldi', monete: prox.monete, gemme: prox.gemme };
  muovi(C, -prox.monete, -prox.gemme, 'allenatore', `Allenatore al livello ${(C.allenatore || 1) + 1}`); C.allenatore = (C.allenatore || 1) + 1;
  return { ok: true, livello: C.allenatore };
}
/** La valutazione dell'allenatore (60-99) e quante sedute per giocatore permette. */
export const votoAllenatore = (C) => ECONOMIA.allenatore.livelli[(C.allenatore || 1) - 1].voto;
export const seduteMax = (C) => ALLENA.max + ((C.allenatore || 1) - 1) * ECONOMIA.allenatore.sedute;
export const costoAllenamento = (C, nome) => Math.round((ALLENA.base + ALLENA.passo * ((C.allen || {})[nome] || 0)) * (1 - ((C.allenatore || 1) - 1) * ECONOMIA.allenatore.sconto) / 10) * 10;
/** Allenamento: il giocatore i della propria squadra (dove = 'xi' titolari, 'pan' riserve) sale di un punto. */
export function allena(C, clubs, dove, i, oggi = new Date()) {
  const mio = clubs.find((c) => c.id === C.club), rosa = mio && (dove === 'pan' ? mio.pan : mio.xi), x = rosa && rosa[i];
  if (!x) return { ok: false, motivo: 'giocatore' };
  const fatte = C.allen[x[0]] || 0, costo = costoAllenamento(C, x[0]);
  if (fatte >= seduteMax(C)) return { ok: false, motivo: 'massimo' };
  if (costo > C.monete) return { ok: false, motivo: 'monete', costo };
  const copia = rosa.map((y) => y.slice()); copia[i][3] += 1;
  if (dove === 'pan') { C.panchine[mio.id] = copia; C.rose[mio.id] = mio.xi.map((y) => y.slice()); } else { C.rose[mio.id] = copia; C.panchine[mio.id] = (mio.pan || []).map((y) => y.slice()); }
  muovi(C, -costo, 0, 'allenamento', `Allenamento di ${x[0]}`); C.allen[x[0]] = fatte + 1; evento(C, 'allenamenti', 1, oggi); applica(C, clubs);
  return { ok: true, costo, sedute: fatte + 1 };
}
const libero = (rosa, i, n) => !rosa.some((x, k) => k !== i && x[2] === n);
const primoNumeroLibero = (rosa, i) => { for (let n = 2; n < 100; n++) if (libero(rosa, i, n)) return n; return 99; };
/**
 * Il capitano: un titolare di un'altra squadra (da, iIn) entra nel proprio club al posto del titolare più debole dello stesso ruolo,
 * che va in panchina. La squadra che lo perde mette al suo posto la sua riserva migliore di quel ruolo e, se la nostra panchina è piena,
 * riceve la nostra riserva più debole di quel ruolo. Il capitano non costa niente.
 */
export function scegliCapitano(C, clubs, da, iIn) {
  const mio = clubs.find((c) => c.id === C.club), altro = clubs.find((c) => c.id === da);
  if (!mio || !altro || altro === mio || !altro.xi[iIn]) return false;
  const cap = altro.xi[iIn].slice(), ruolo = cap[1], xi = mio.xi.map((x) => x.slice()), pan = (mio.pan || []).map((x) => x.slice());
  const axi = altro.xi.map((x) => x.slice()), apan = (altro.pan || []).map((x) => x.slice());
  let j = -1; xi.forEach((x, k) => { if (x[1] === ruolo && (j < 0 || x[3] < xi[j][3])) j = k; }); if (j < 0) return false;
  const giu = xi[j]; xi[j] = cap; pan.push(giu);
  if (pan.length > 7) { let w = -1; pan.forEach((x, k) => { if (x[1] === ruolo && x !== giu && (w < 0 || x[3] < pan[w][3])) w = k; }); if (w >= 0) apan.push(pan.splice(w, 1)[0]); }
  let r = -1; apan.forEach((x, k) => { if (x[1] === ruolo && (r < 0 || x[3] > apan[r][3])) r = k; });
  axi[iIn] = r >= 0 ? apan.splice(r, 1)[0] : giu.slice();
  for (const rosa of [xi.concat(pan), axi.concat(apan)]) rosa.forEach((x, k) => { if (!libero(rosa, k, x[2])) x[2] = primoNumeroLibero(rosa, k); });
  C.rose[mio.id] = xi; C.panchine[mio.id] = pan; C.rose[altro.id] = axi; C.panchine[altro.id] = apan;
  C.mio = { ...(C.mio || {}), capitano: cap[0] }; applica(C, clubs);
  return true;
}

/* ---------- mercato: si prende un titolare di un'altra squadra cedendo in cambio un proprio giocatore dello stesso ruolo ---------- */
/** Prezzo in monete di un giocatore dato il suo valore (55-82): cresce col quadrato, i più forti costano molto di più. */
export function prezzo(valore) { return Math.round(Math.pow(Math.max(0, valore - ECONOMIA.prezzoDa), 2) * ECONOMIA.prezzo) * 10; }
/** Quanto si paga (o si incassa, se negativo) prendendo un giocatore di valore vIn e cedendone uno di valore vOut. */
export function costoScambio(vIn, vOut) { return prezzo(vIn) - Math.round(prezzo(vOut) * PREMI.cessione / 10) * 10; }
/** Mette nelle squadre le rose della carriera (o quelle di partenza se C è null). La rosa di partenza resta in xi0. */
export function applica(C, clubs) {
  for (const c of clubs) {
    if (!c.xi0) { c.xi0 = c.xi; c.pan0 = c.pan || []; }
    c.xi = (C && C.rose && C.rose[c.id]) || c.xi0; c.pan = (C && C.panchine && C.panchine[c.id]) || c.pan0;
  }
}
/** Un titolare e una riserva dello stesso ruolo della propria squadra si scambiano il posto. */
export function cambiaTitolare(C, clubs, iXi, iPan) {
  const mio = clubs.find((c) => c.id === C.club), a = mio && mio.xi[iXi], b = mio && (mio.pan || [])[iPan];
  if (!a || !b || a[1] !== b[1]) return false;
  const xi = mio.xi.map((x) => x.slice()), pan = mio.pan.map((x) => x.slice()); xi[iXi] = b.slice(); pan[iPan] = a.slice();
  C.rose[mio.id] = xi; C.panchine = C.panchine || {}; C.panchine[mio.id] = pan; applica(C, clubs);
  return true;
}
/** Scambia il giocatore iIn della squadra `da` col proprio giocatore iOut. `valore(ruolo, q)` dà il valore di un giocatore. */
export function scambio(C, clubs, valore, da, iIn, iOut) {
  const mio = clubs.find((c) => c.id === C.club), altro = clubs.find((c) => c.id === da);
  if (!mio || !altro || altro === mio) return { ok: false, motivo: 'squadra' };
  const preso = altro.xi[iIn], ceduto = mio.xi[iOut];
  if (!preso || !ceduto || preso[1] !== ceduto[1]) return { ok: false, motivo: 'ruolo' };
  const costo = costoScambio(valore(preso[1], preso[3]), valore(ceduto[1], ceduto[3]));
  if (costo > C.monete) return { ok: false, motivo: 'monete', costo };
  const a = mio.xi.map((x) => x.slice()), b = altro.xi.map((x) => x.slice());
  a[iOut] = preso.slice(); b[iIn] = ceduto.slice();
  if (!libero(a, iOut, a[iOut][2])) a[iOut][2] = ceduto[2]; if (!libero(b, iIn, b[iIn][2])) b[iIn][2] = preso[2]; // numero già preso: si prende quello di chi è partito
  C.rose[mio.id] = a; C.rose[altro.id] = b; muovi(C, -costo, 0, 'mercato', `${preso[0]} per ${ceduto[0]}`);
  C.movimenti.unshift({ stagione: C.stagione, preso: preso[0], ceduto: ceduto[0], da: altro.id, costo }); C.movimenti.length = Math.min(C.movimenti.length, 30);
  evento(C, 'acquisti'); applica(C, clubs);
  return { ok: true, costo };
}

/** Registra la partita di campionato dell'utente (gol fatti e subiti), simula le altre sette e passa alla giornata dopo. */
export function giocaCampionato(C, clubs, gf, gs, marcatori, rnd = Math.random) {
  const p = prossima(C); if (!p) return null;
  C.ris[C.giornata] = C.cal[C.giornata].map(([a, b]) => (a === C.club ? [gf, gs] : b === C.club ? [gs, gf] : simula(clubs, a, b, rnd)));
  let monete = conta(C, gf, gs, marcatori, 'camp'); C.giornata++;
  if (p.inCasa) { const b = bonusCasa(C); muovi(C, b, 0, 'incasso', 'Incasso dello stadio'); monete += b; }
  const tab = classifica(C, clubs), pos = tab.findIndex((r) => r.id === C.club) + 1, finita = C.giornata >= C.cal.length;
  if (finita) {
    C.campione = tab[0].id; if (pos <= 4) evento(C, 'top4');
    if (tab[0].id === C.club) { C.trofei.push({ stagione: C.stagione, tipo: 'Campionato' }); muovi(C, PREMI.campione, 0, 'trofeo', 'Campionato vinto'); monete += PREMI.campione; }
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
export function giocaCoppa(C, clubs, gf, gs, marcatori, rnd = Math.random, rig = null) {
  const pr = coppaProssima(C); if (!pr) return null;
  const esito = koGioca(C, clubs, C.coppa, pr, conta(C, gf, gs, marcatori, 'coppa'), gf, gs, rnd, rig, PREMI.coppa, 'Coppa Titano');
  if (esito.passa && pr.turno === 0) evento(C, 'quarti');
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
    const m = PREMI.turno + (k.squadre.length === 1 ? premioVinta : 0); muovi(C, m, 0, k.squadre.length === 1 ? 'trofeo' : 'turno', k.squadre.length === 1 ? `${trofeo}: vinto` : `${trofeo}: turno superato`); esito.monete += m; puntiPercorso(C, 'turno');
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
export function giocaCastelli(C, clubs, gf, gs, marcatori, rnd = Math.random, rig = null) {
  const k = C.castelli, pr = castelliProssima(C); if (!pr) return null;
  const premio = conta(C, gf, gs, marcatori, 'castelli');
  if (pr.fase === 'ko') { // la fase finale tiene il suo stato in k.ko; qui si riporta l'esito sul trofeo
    const e = koGioca(C, clubs, k.ko, pr, premio, gf, gs, rnd, rig, PREMI.castelli, 'Trofeo dei Castelli');
    if (k.ko.vinta) k.vinta = true; if (k.ko.fuori !== null) k.fuori = k.ko.fuori; if (k.ko.campione) k.campione = k.ko.campione;
    return e;
  }
  let monete = premio; if (pr.inCasa) { const b = bonusCasa(C); muovi(C, b, 0, 'incasso', 'Incasso dello stadio'); monete += b; }
  k.ris[k.giornata] = k.gironi.map((g) => GIRO[k.giornata].map(([ia, ib]) => (g[ia] === C.club ? [gf, gs] : g[ib] === C.club ? [gs, gf] : simula(clubs, g[ia], g[ib], rnd))));
  k.giornata++;
  const tab = castelliTabella(C, pr.girone), pos = tab.findIndex((r) => r.id === C.club) + 1, esito = { fase: 'gironi', posizione: pos, finiti: k.giornata >= 3, passa: null, monete };
  if (esito.finiti) {
    k.ko = { turno: 0, squadre: castelliTabellone(C), storia: [], fuori: null, vinta: false, campione: null };
    esito.passa = pos <= 2;
    if (esito.passa) evento(C, 'gironi');
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

export function capocannoniere(C) { const e = Object.entries(C.stat.marc).sort((a, b) => b[1] - a[1])[0]; return e ? { nome: e[0], gol: e[1] } : null; }

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
  const sx = STADIO[C.stadio], ax = ECONOMIA.allenatore.livelli[C.allenatore || 1];
  if (sx && C.monete >= sx.monete && C.gemme >= sx.gemme) out.push({ t: 'Puoi ampliare lo stadio', vai: 'stadio' });
  if (ax && C.monete >= ax.monete && C.gemme >= ax.gemme) out.push({ t: 'Puoi migliorare l\'allenatore', vai: 'allenatore' });
  return out;
}

/* ---------- energia dei giocatori del club, tra una partita e l'altra ---------- */
/** L'energia salvata di un giocatore del club, da 0 a 100 (100 se non ha ancora giocato). */
export const energiaDi = (C, nome) => { const e = (C.energia || {})[nome]; return typeof e === 'number' ? Math.max(0, Math.min(100, Math.round(e))) : 100; };
/**
 * Dopo una partita di carriera: chi ha giocato resta con l'energia con cui è uscito dal campo, poi tutta la rosa
 * recupera ECONOMIA.energia.recupero. `finali` è l'elenco { nome, energia } dei giocatori del club scesi in campo.
 */
export function energiaDopoPartita(C, clubs, finali) {
  const mio = clubs.find((c) => c.id === C.club); if (!mio) return;
  const E = C.energia || (C.energia = {});
  for (const g of finali) E[g.nome] = Math.max(0, Math.min(100, Math.round(g.energia)));
  const rosa = new Set(mio.xi.concat(mio.pan || []).map((x) => x[0]));
  for (const nome of rosa) E[nome] = Math.min(100, energiaDi(C, nome) + ECONOMIA.energia.recupero);
  // chi non è più in rosa non si tiene, e chi è al massimo non serve scriverlo
  for (const nome of Object.keys(E)) if (!rosa.has(nome) || E[nome] >= 100) delete E[nome];
}
/** La chiave della prossima partita di una competizione: serve a fare il riscaldamento una volta sola per partita. */
const chiavePartita = (C, tipo) => `${C.stagione}/${tipo}/${tipo === 'camp' ? C.giornata : tipo === 'coppa' ? C.coppa.turno : `${C.castelli.giornata}-${C.castelli.ko ? C.castelli.ko.turno : 'g'}`}`;
/** Lo stato del riscaldamento per la prossima partita di `tipo`: costo, bonus, se è già fatto, se serve, se si può pagare. */
export function statoRiscaldamento(C, clubs, tipo) {
  const R = ECONOMIA.energia.riscaldamento, mio = clubs.find((c) => c.id === C.club);
  const fatto = C.riscaldato === chiavePartita(C, tipo), serve = !!mio && mio.xi.some((x) => energiaDi(C, x[0]) < 100);
  return { monete: R.monete, bonus: R.bonus, fatto, serve, puo: C.monete >= R.monete };
}
/** Riscaldamento: per ECONOMIA.energia.riscaldamento.monete i titolari guadagnano un po' di energia. Una volta per partita. */
export function riscaldamento(C, clubs, tipo) {
  const st = statoRiscaldamento(C, clubs, tipo), mio = clubs.find((c) => c.id === C.club);
  if (st.fatto) return { ok: false, motivo: 'fatto' };
  if (!st.serve) return { ok: false, motivo: 'pieni' };
  if (!st.puo) return { ok: false, motivo: 'monete', monete: st.monete };
  const E = C.energia || (C.energia = {});
  for (const x of mio.xi) { const e = Math.min(100, energiaDi(C, x[0]) + st.bonus); if (e >= 100) delete E[x[0]]; else E[x[0]] = e; }
  muovi(C, -st.monete, 0, 'riscaldamento', 'Riscaldamento prima della partita'); C.riscaldato = chiavePartita(C, tipo);
  return { ok: true, monete: st.monete, bonus: st.bonus };
}

/* ---------- orario e tempo di una partita (solo da mostrare, più giorno o notte in campo) ---------- */
/** Orario, cielo e gradi della prossima partita di `tipo`: sempre gli stessi per la stessa partita. */
export function meteoPartita(C, tipo) {
  let h = 2166136261; for (const ch of C ? chiavePartita(C, tipo) + C.id : String(tipo)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } h >>>= 0;
  const [orario, ora] = METEO.orari[h % METEO.orari.length], cielo = METEO.cieli[(h >>> 4) % METEO.cieli.length];
  return { orario, ora, cielo, gradi: METEO.gradi[0] + ((h >>> 8) % (METEO.gradi[1] - METEO.gradi[0] + 1)) };
}
