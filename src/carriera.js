/* Carriera: campionato a 16 squadre (15 giornate, girone unico), Coppa Titano a eliminazione diretta, statistiche e trofei.
   Qui c'è solo la logica, senza schermate: lo stato è un oggetto semplice che si salva così com'è sul dispositivo. */
export const KEY = 'fantatitano-carriera';
export const TURNI = ['Ottavi di finale', 'Quarti di finale', 'Semifinale', 'Finale'];
// Monete: quante all'inizio, per risultato, per gol segnato, per turno di coppa superato, per i trofei; quanto vale chi si cede rispetto al suo prezzo
export const PREMI = { inizio: 500, v: 300, n: 120, p: 50, gol: 20, turno: 150, campione: 3000, coppa: 2000, cessione: .7 };

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

export function nuova(clubs, nome, clubId, rnd = Math.random) {
  const ids = clubs.map((c) => c.id);
  return { v: 1, nome: String(nome || 'Mister').slice(0, 18), club: clubId, stagione: 1, giornata: 0, cal: calendario(ids, rnd), ris: [], coppa: nuovaCoppa(ids, rnd),
    stat: { g: 0, v: 0, n: 0, p: 0, gf: 0, gs: 0, marc: {} }, trofei: [], campione: null, monete: PREMI.inizio, rose: {}, movimenti: [] };
}

export function nuovaStagione(C, clubs, rnd = Math.random) {
  const ids = clubs.map((c) => c.id);
  C.stagione++; C.giornata = 0; C.cal = calendario(ids, rnd); C.ris = []; C.coppa = nuovaCoppa(ids, rnd); C.campione = null;
  return C;
}

export function carica(store = globalThis.localStorage) {
  try { const C = JSON.parse(store.getItem(KEY) || 'null'); if (!(C && C.v === 1 && C.club && Array.isArray(C.cal))) return null;
    if (typeof C.monete !== 'number') C.monete = PREMI.inizio; C.rose = C.rose || {}; C.movimenti = C.movimenti || []; // carriere salvate prima del mercato
    return C;
  } catch (e) { return null; }
}
export function salva(C, store = globalThis.localStorage) { try { store.setItem(KEY, JSON.stringify(C)); return true; } catch (e) { return false; } }
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
  return Object.values(T).sort((x, y) => y.pt - x.pt || (y.gf - y.gs) - (x.gf - x.gs) || y.gf - x.gf || x.id.localeCompare(y.id));
}

function conta(C, gf, gs, marcatori) {
  const s = C.stat; s.g++; s.gf += gf; s.gs += gs; if (gf > gs) s.v++; else if (gf < gs) s.p++; else s.n++;
  for (const n of marcatori || []) s.marc[n] = (s.marc[n] || 0) + 1;
  const m = (gf > gs ? PREMI.v : gf < gs ? PREMI.p : PREMI.n) + gf * PREMI.gol; C.monete += m; return m; // premio partita
}

/* ---------- mercato: si prende un titolare di un'altra squadra cedendo in cambio un proprio giocatore dello stesso ruolo ---------- */
/** Prezzo in monete di un giocatore dato il suo valore (55-88): cresce col quadrato, i più forti costano molto di più. */
export function prezzo(valore) { return Math.round(Math.pow(Math.max(0, valore - 50), 2) * .22) * 10; }
/** Quanto si paga (o si incassa, se negativo) prendendo un giocatore di valore vIn e cedendone uno di valore vOut. */
export function costoScambio(vIn, vOut) { return prezzo(vIn) - Math.round(prezzo(vOut) * PREMI.cessione / 10) * 10; }
/** Mette nelle squadre le rose della carriera (o quelle di partenza se C è null). La rosa di partenza resta in xi0. */
export function applica(C, clubs) {
  for (const c of clubs) { if (!c.xi0) c.xi0 = c.xi; c.xi = (C && C.rose && C.rose[c.id]) || c.xi0; }
}
/** Scambia il giocatore iIn della squadra `da` col proprio giocatore iOut. `valore(ruolo, q)` dà il valore di un giocatore. */
export function scambio(C, clubs, valore, da, iIn, iOut) {
  const mio = clubs.find((c) => c.id === C.club), altro = clubs.find((c) => c.id === da);
  if (!mio || !altro || altro === mio) return { ok: false, motivo: 'squadra' };
  const preso = altro.xi[iIn], ceduto = mio.xi[iOut];
  if (!preso || !ceduto || preso[1] !== ceduto[1]) return { ok: false, motivo: 'ruolo' };
  const costo = costoScambio(valore(preso[1], preso[3]), valore(ceduto[1], ceduto[3]));
  if (costo > C.monete) return { ok: false, motivo: 'monete', costo };
  const a = mio.xi.map((x) => x.slice()), b = altro.xi.map((x) => x.slice()), libero = (rosa, i, n) => !rosa.some((x, k) => k !== i && x[2] === n);
  a[iOut] = preso.slice(); b[iIn] = ceduto.slice();
  if (!libero(a, iOut, a[iOut][2])) a[iOut][2] = ceduto[2]; if (!libero(b, iIn, b[iIn][2])) b[iIn][2] = preso[2]; // numero già preso: si prende quello di chi è partito
  C.rose[mio.id] = a; C.rose[altro.id] = b; C.monete -= costo;
  C.movimenti.unshift({ stagione: C.stagione, preso: preso[0], ceduto: ceduto[0], da: altro.id, costo }); C.movimenti.length = Math.min(C.movimenti.length, 30);
  applica(C, clubs);
  return { ok: true, costo };
}

/** Registra la partita di campionato dell'utente (gol fatti e subiti), simula le altre sette e passa alla giornata dopo. */
export function giocaCampionato(C, clubs, gf, gs, marcatori, rnd = Math.random) {
  const p = prossima(C); if (!p) return null;
  C.ris[C.giornata] = C.cal[C.giornata].map(([a, b]) => (a === C.club ? [gf, gs] : b === C.club ? [gs, gf] : simula(clubs, a, b, rnd)));
  let monete = conta(C, gf, gs, marcatori); C.giornata++;
  const tab = classifica(C, clubs), pos = tab.findIndex((r) => r.id === C.club) + 1, finita = C.giornata >= C.cal.length;
  if (finita) { C.campione = tab[0].id; if (tab[0].id === C.club) { C.trofei.push({ stagione: C.stagione, tipo: 'Campionato' }); C.monete += PREMI.campione; monete += PREMI.campione; } }
  return { posizione: pos, finita, campione: C.campione, monete };
}

/** La prossima partita di coppa dell'utente, o null se è fuori o la coppa è finita. */
export function coppaProssima(C) {
  const k = C.coppa; if (k.fuori !== null || k.vinta || k.campione) return null;
  const i = k.squadre.indexOf(C.club), avv = k.squadre[i ^ 1];
  return { turno: k.turno, nome: TURNI[k.turno], avv };
}

// passa chi segna di più; in parità decidono i rigori, simulati tiro per tiro
function rigori(rnd) { let a = 0, b = 0; for (let i = 0; i < 5; i++) { a += rnd() < .76; b += rnd() < .76; } while (a === b) { a += rnd() < .76; b += rnd() < .76; } return [a, b]; }

/** Registra la partita di coppa dell'utente, simula le altre del turno e prepara il turno dopo. Se l'utente esce, la coppa va avanti da sola fino alla finale. */
export function giocaCoppa(C, clubs, gf, gs, marcatori, rnd = Math.random) {
  const k = C.coppa, pr = coppaProssima(C); if (!pr) return null;
  const premio = conta(C, gf, gs, marcatori);
  let esito = { passa: gf > gs, rigori: null, vinta: false, turno: pr.nome, monete: premio };
  const avanti = (utente) => {
    const dopo = [], giocate = [];
    for (let i = 0; i < k.squadre.length; i += 2) {
      const a = k.squadre[i], b = k.squadre[i + 1]; let r, rg = null;
      if (utente && (a === C.club || b === C.club)) { r = a === C.club ? [gf, gs] : [gs, gf]; if (gf === gs) { rg = rigori(rnd); if (b === C.club) rg = [rg[1], rg[0]]; const mio = a === C.club ? rg[0] > rg[1] : rg[1] > rg[0]; esito.rigori = a === C.club ? rg : [rg[1], rg[0]]; esito.passa = mio; } }
      else { r = simula(clubs, a, b, rnd); if (r[0] === r[1]) rg = rigori(rnd); }
      const vince = r[0] > r[1] || (r[0] === r[1] && rg[0] > rg[1]) ? a : b;
      dopo.push(vince); giocate.push({ a, b, r, rg });
    }
    k.storia.push(giocate); k.squadre = dopo; k.turno++;
  };
  avanti(true);
  if (!esito.passa) { k.fuori = pr.turno; while (k.squadre.length > 1) avanti(false); k.campione = k.squadre[0]; }
  else { const m = PREMI.turno + (k.squadre.length === 1 ? PREMI.coppa : 0); C.monete += m; esito.monete += m; } // turno superato
  if (esito.passa && k.squadre.length === 1) { k.vinta = true; k.campione = C.club; esito.vinta = true; C.trofei.push({ stagione: C.stagione, tipo: 'Coppa Titano' }); }
  return esito;
}

export function capocannoniere(C) { const e = Object.entries(C.stat.marc).sort((a, b) => b[1] - a[1])[0]; return e ? { nome: e[0], gol: e[1] } : null; }
