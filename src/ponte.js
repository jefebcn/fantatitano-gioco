/* Il ponte tra home e partita (docs/ponte-partita.md). La home prepara una richiesta, la partita la gioca e alla fine
   restituisce un esito. Qui ci sono solo l'elenco di quello che la partita sa fare e i controlli di forma di richiesta ed
   esito, usati da tutte e due le parti e dalle prove. Niente che tocchi lo schermo: questo file gira anche in Node. */

/** Cosa sa fare la partita oggi: la home accende solo quello che compare qui. */
export const SA_FARE = { tipi: ['campionato', 'coppa', 'castelli', 'amichevole', 'scenario'], allenamenti: ['rigori'], energiaIniziale: true };

/** La partita mette qui la sua funzione quando è pronta: la home chiama ponte.avviaPartita(richiesta). */
export const ponte = { avviaPartita: null };

const REPARTI = ['P', 'D', 'C', 'A'], DIFFICOLTA = ['facile', 'normale', 'difficile'];
const numero = (v, min, max) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const testo = (v) => typeof v === 'string' && v.length > 0;
const coppia = (v) => Array.isArray(v) && v.length === 2 && v.every((x) => numero(x, 0, 999));

function controllaGiocatore(g, dove, errori) {
  if (!g || typeof g !== 'object') return errori.push(`${dove}: manca il giocatore`);
  if (!testo(g.id)) errori.push(`${dove}: manca id`);
  if (!testo(g.nome)) errori.push(`${dove}: manca nome`);
  if (!REPARTI.includes(g.reparto)) errori.push(`${dove}: reparto deve essere P, D, C o A`);
  if (!numero(g.numero, 1, 99)) errori.push(`${dove}: numero tra 1 e 99`);
  if (!numero(g.forza, 1, 99)) errori.push(`${dove}: forza tra 1 e 99`);
  if (g.energia !== undefined && !numero(g.energia, 0, 100)) errori.push(`${dove}: energia tra 0 e 100`);
}

/**
 * Controlla la richiesta (docs/ponte-partita.md, §3). moduli: le chiavi di FORMS che la partita conosce; divisioni: gli
 * id delle divisioni che hanno uno stadio.
 * Ritorna l'elenco degli errori: vuoto se la richiesta si può giocare. I campi che la partita non conosce vengono ignorati.
 */
export function controllaRichiesta(r, moduli = null, divisioni = null) {
  const errori = [];
  if (!r || typeof r !== 'object') return ['manca la richiesta'];
  if (r.versione !== 1) errori.push('versione deve essere 1');
  // lo stadio (§11): facoltativo. La divisione di chi gioca in casa decide il tipo di stadio, le stelle quanto è pieno
  if (r.stadio !== undefined && r.stadio !== null) {
    const st = r.stadio;
    if (typeof st !== 'object') errori.push('stadio: { divisione, stelle }');
    else {
      if (st.divisione !== undefined && divisioni && !divisioni.includes(st.divisione)) errori.push(`stadio.divisione «${st.divisione}» non è una divisione (${divisioni.join(', ')})`);
      if (st.stelle !== undefined && !numero(st.stelle, 0, 5)) errori.push('stadio.stelle tra 0 e 5');
    }
  }
  if (!SA_FARE.tipi.includes(r.tipo)) errori.push(`tipo «${r.tipo}» non ancora giocabile (la partita sa fare: ${SA_FARE.tipi.join(', ')})`);
  if (r.tipo === 'scenario') {
    const sc = r.scenario;
    if (!sc || typeof sc !== 'object') errori.push('scenario: servono minuto e punteggio');
    else {
      if (!Number.isInteger(sc.minuto) || !numero(sc.minuto, 1, 89)) errori.push('scenario.minuto: intero tra 1 e 89');
      if (!coppia(sc.punteggio) || !sc.punteggio.every(Number.isInteger)) errori.push('scenario.punteggio: [casa, ospite]');
      if (sc.palla !== undefined && !['utente', 'avversario'].includes(sc.palla)) errori.push("scenario.palla: 'utente' o 'avversario'");
    }
  }
  if (r.difficolta !== undefined && !DIFFICOLTA.includes(r.difficolta)) errori.push('difficolta deve essere facile, normale o difficile');
  if (r.allaFine !== undefined && typeof r.allaFine !== 'function') errori.push('allaFine deve essere una funzione');
  if (!Array.isArray(r.squadre) || r.squadre.length !== 2) { errori.push('squadre: ne servono due'); return errori; }
  if (r.squadre.filter((s) => s && s.utente).length !== 1) errori.push("squadre: una sola deve avere utente: true");
  r.squadre.forEach((s, k) => {
    const dove = `squadre[${k}]`;
    if (!s || typeof s !== 'object') return errori.push(`${dove}: manca`);
    if (!testo(s.id) || !testo(s.nome) || !testo(s.sigla)) errori.push(`${dove}: servono id, nome e sigla`);
    if (moduli && !moduli.includes(s.modulo)) errori.push(`${dove}: modulo «${s.modulo}» sconosciuto`);
    if (s.mentalita !== undefined && ![-1, 0, 1].includes(s.mentalita)) errori.push(`${dove}: mentalita deve essere -1, 0 o 1`);
    if (!s.maglia || !testo(s.maglia.c1) || !testo(s.maglia.c2)) errori.push(`${dove}: maglia con c1 e c2`);
    if (!Array.isArray(s.titolari) || s.titolari.length !== 11) errori.push(`${dove}: servono undici titolari`);
    else { s.titolari.forEach((g, i) => controllaGiocatore(g, `${dove}.titolari[${i}]`, errori)); if (s.titolari[0] && s.titolari[0].reparto !== 'P') errori.push(`${dove}: il primo titolare è il portiere`); }
    if (s.panchina !== undefined) { if (!Array.isArray(s.panchina) || s.panchina.length > 8) errori.push(`${dove}: panchina di al massimo 8`); else s.panchina.forEach((g, i) => controllaGiocatore(g, `${dove}.panchina[${i}]`, errori)); }
  });
  return errori;
}

/** Controlla l'esito (docs/ponte-partita.md, §4). Ritorna l'elenco degli errori: vuoto se la forma è giusta. */
export function controllaEsito(e) {
  const errori = [];
  if (!e || typeof e !== 'object') return ["manca l'esito"];
  if (e.versione !== 1) errori.push('versione deve essere 1');
  // partenza: solo negli scenari, il minuto e il punteggio da cui si è cominciato
  const da = e.partenza;
  if (da !== null && da !== undefined && !(numero(da.minuto, 1, 89) && coppia(da.punteggio))) errori.push('partenza: null oppure { minuto, punteggio }');
  if (typeof e.finita !== 'boolean') errori.push('finita deve essere vero o falso');
  if (!numero(e.minuti, 0, 120)) errori.push('minuti tra 0 e 120');
  if (!numero(e.secondiVeri, 0, 1e6)) errori.push('secondiVeri deve essere un numero');
  if (!coppia(e.punteggio)) errori.push('punteggio: [casa, ospite]');
  if (e.rigori !== null && !coppia(e.rigori)) errori.push('rigori: null oppure [casa, ospite]');
  for (const k of ['marcatori', 'cartellini', 'cambi', 'giocatori']) if (!Array.isArray(e[k])) errori.push(`${k}: deve essere un elenco`);
  if (errori.length) return errori;
  e.marcatori.forEach((m, i) => {
    if (![0, 1].includes(m.squadra) || !testo(m.nome) || !numero(m.minuto, 1, 120)) errori.push(`marcatori[${i}]: servono squadra, nome e minuto`);
    if (!['azione', 'rigore', 'punizione', 'angolo', 'testa', 'autogol'].includes(m.tipo)) errori.push(`marcatori[${i}]: tipo sconosciuto`);
    if (m.assist !== null && !(m.assist && testo(m.assist.id) && testo(m.assist.nome))) errori.push(`marcatori[${i}]: assist null oppure { id, nome }`);
  });
  e.cartellini.forEach((c, i) => { if (![0, 1].includes(c.squadra) || !testo(c.id) || !['giallo', 'rosso'].includes(c.colore)) errori.push(`cartellini[${i}]: servono squadra, id e colore`); });
  e.cambi.forEach((c, i) => { if (![0, 1].includes(c.squadra) || !testo(c.esce) || !testo(c.entra)) errori.push(`cambi[${i}]: servono squadra, esce ed entra`); });
  e.giocatori.forEach((g, i) => {
    if (![0, 1].includes(g.squadra) || !testo(g.id) || !testo(g.nome)) errori.push(`giocatori[${i}]: servono squadra, id e nome`);
    if (!numero(g.energia, 0, 100) || !numero(g.minuti, 0, 120) || !numero(g.voto, 0, 10)) errori.push(`giocatori[${i}]: energia, minuti o voto fuori misura`);
    for (const k of ['gol', 'assist', 'tiri', 'tiriInPorta', 'passaggi', 'passaggiRiusciti', 'contrasti', 'intercetti', 'parate', 'falli']) if (!numero(g[k], 0, 999)) errori.push(`giocatori[${i}]: ${k} deve essere un numero`);
  });
  const S = e.squadre || {};
  for (const k of ['tiri', 'tiriInPorta', 'possesso', 'parate', 'falli', 'fuorigioco', 'angoli', 'ammonizioni', 'espulsioni', 'pali']) if (!coppia(S[k])) errori.push(`squadre.${k}: [casa, ospite]`);
  // i conti devono tornare: i gol dei marcatori sono il punteggio, tolti quelli che c'erano già alla partenza di uno scenario
  if (!errori.length) for (const k of [0, 1]) if (e.marcatori.filter((m) => m.squadra === k).length !== e.punteggio[k] - (da ? da.punteggio[k] : 0)) errori.push(`i marcatori della squadra ${k} non tornano col punteggio`);
  if (e.migliore !== null && !testo(e.migliore)) errori.push('migliore: id di un giocatore oppure null');
  return errori;
}
