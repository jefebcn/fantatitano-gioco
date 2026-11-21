// Le divisioni sotto il Campionato Sammarinese: sessanta squadre inventate (nome, sigla, colori, stemma) e i loro
// giocatori, inventati anche loro. Le rose non stanno scritte qui: escono sempre uguali dal nome della squadra, con le
// valutazioni della divisione (DIVISIONI in src/config.js). Qui nascono anche la rosa iniziale del club dell'utente e i
// giocatori che compaiono al mercato.
import { DIVISIONI, ECONOMIA } from '../config.js';
import { hash, inventato, postiModulo } from './scala.js';

// Le squadre di ogni divisione: codice, nome (al più 14 lettere, così ci sta per intero dappertutto) e sigla.
const SQUADRE = {
  cadetta: [['acquaviva', 'Real Acquaviva', 'RAQ'], ['falciano', 'Vigor Falciano', 'VFA'], ['ventoso', 'Aurora Ventoso', 'AVE'], ['rovereta', 'Robur Rovereta', 'ROV'],
    ['fiorina', 'Audace Fiorina', 'AFI'], ['torraccia', 'Torraccia', 'TOR'], ['valdragone', 'Valdragone', 'VAL'], ['gualdicciolo', 'Gualdicciolo', 'GUA'],
    ['montegiardino', 'Montegiardino', 'MGI'], ['cittaalta', 'Città Alta', 'CIT'], ['castellaro', 'Castellaro', 'CAS'], ['stellatitano', 'Stella Titano', 'STT'],
    ['laserra', 'La Serra', 'LSE'], ['borgoantico', 'Borgo Antico', 'BAN'], ['montecerreto', 'Monte Cerreto', 'MCE']],
  contrade: [['pianello', 'Pianello', 'PIA'], ['omerelli', 'Omerelli', 'OME'], ['santacroce', 'Santa Croce', 'SCR'], ['collegio', 'Collegio', 'COL'],
    ['lemura', 'Le Mura', 'LMU'], ['magazzeni', 'Magazzeni', 'MAG'], ['lapieve', 'La Pieve', 'LPI'], ['borgoloto', 'Borgoloto', 'BLO'],
    ['portanova', 'Portanova', 'PNO'], ['lafratta', 'La Fratta', 'FRA'], ['cantone', 'Cantone', 'CAN'], ['lepiagge', 'Le Piagge', 'PGG'],
    ['laripa', 'La Ripa', 'RIP'], ['stradone', 'Lo Stradone', 'STR'], ['sanfrancesco', 'San Francesco', 'SFR']],
  borghi: [['casole', 'Casole', 'CSO'], ['teglio', 'Teglio', 'TEG'], ['galavotto', 'Galavotto', 'GAL'], ['caladino', 'Caladino', 'CLD'],
    ['confine', 'Confine', 'CNF'], ['molarini', 'Molarini', 'MOL'], ['corianino', 'Corianino', 'COR'], ['piandivello', 'Piandivello', 'PDV'],
    ['lesignano', 'Lesignano', 'LES'], ['cerbaiola', 'Cerbaiola', 'CER'], ['cinquevie', 'Cinque Vie', 'CVI'], ['pontemellini', 'Ponte Mellini', 'PME'],
    ['canepa', 'Canepa', 'CNP'], ['seggiano', 'Seggiano', 'SEG'], ['spinaroti', 'Spinaroti', 'SPI']],
  esordienti: [['carigo', 'Ca\' Rigo', 'CRI'], ['caberlone', 'Ca\' Berlone', 'CBE'], ['cachiavello', 'Ca\' Chiavello', 'CCH'], ['camelone', 'Ca\' Melone', 'CME'],
    ['caragni', 'Ca\' Ragni', 'CRA'], ['cagiannino', 'Ca\' Giannino', 'CGI'], ['camartino', 'Ca\' Martino', 'CMA'], ['montepulito', 'Monte Pulito', 'MPU'],
    ['casalino', 'Casalino', 'CSL'], ['calligaria', 'Calligaria', 'CLG'], ['capanne', 'Capanne', 'CAP'], ['crociale', 'Crociale', 'CRO'],
    ['pianacci', 'Pianacci', 'PNC'], ['montalbo', 'Montalbo', 'MAL'], ['letane', 'Le Tane', 'TAN']],
};
// quindici coppie di colori, una per squadra di ogni divisione
const COLORI = [['#C0392B', '#FFFFFF'], ['#1D4F8A', '#FFFFFF'], ['#111111', '#F2B822'], ['#2E8B57', '#FFFFFF'], ['#E0B400', '#1B2A5C'], ['#7A1F3D', '#E8C77A'], ['#FF7A1A', '#111111'],
  ['#5B2A86', '#FFFFFF'], ['#0E7C86', '#F4F1DE'], ['#FFFFFF', '#C0392B'], ['#87CEEB', '#1B2A5C'], ['#1B2A5C', '#E0B400'], ['#8B5A2B', '#F4F1DE'], ['#D6336C', '#111111'], ['#556B2F', '#F2B822']];
// i disegni della maglia e i pezzi dello stemma tra cui pesca ogni squadra (quelli che ci sono dall'inizio per tutti)
const STILI = ['', 'righe', 'fasce', 'banda', 'meta', 'scacchi', 'v', ''];
const FORME = ['scudo', 'tondo', 'stendardo', 'rombo', 'esagono'], SIMBOLI = ['corona', 'stella', 'pallone', 'torre', 'nessuno'], BORDI = ['semplice', 'doppio', 'sottile'];
// i cognomi dei giocatori inventati: chi ha lo stesso cognome di un giocatore vero viene saltato
const COGNOMI = ('Abati Agostini Albani Alberti Albertini Aldini Amadori Ambrosi Andreoli Angelini Anselmi Antonelli Arcangeli Armani Astolfi Baldacci Baldini Balducci Ballarini Bandini '
  + 'Barbieri Bartolini Bassi Battistini Belletti Belli Benassi Benedetti Bernabei Bertozzi Biagini Bianchi Bigucci Bindi Biondi Bollini Bonfini Bonini Bordoni Borghesi Boschi Braschi '
  + 'Brighi Bruschi Buldrini Busignani Caldari Calzolari Campana Canini Capanni Carattoni Carlini Casadei Casali Castellani Cavalli Ceccaroni Cecchetti Celli Cenni Cesarini Chiaruzzi '
  + 'Ciavatta Cipriani Clementi Colonna Conti Corbelli Corsini Costa Cupi Donati Draghi Ercolani Fabbri Fagioli Fantini Fattori Felici Ferri Filippi Fiorini Fontana Foschi Francini '
  + 'Franciosi Frisoni Gabrielli Galassi Galli Gambuti Gatti Gennari Ghiotti Giacomini Giardi Giorgetti Giovagnoli Grassi Graziani Gualandi Guerra Lanzi Lazzari Leardini Lombardi Lucchi '
  + 'Macina Magnani Maiani Mancini Manzaroli Marani Marchetti Mariotti Masi Massari Matteini Mazza Menghi Menicucci Micheli Mini Molari Montanari Monti Morganti Moroni Muccioli Muratori '
  + 'Nanni Negri Neri Nicolini Olivieri Orlandi Ottaviani Pagani Pagliarani Palazzi Paolini Pari Parma Pasini Pasolini Pazzaglia Pedini Pellegrini Pelliccioni Pierini Pironi Poggiali '
  + 'Pozzi Protti Raggini Raschi Ravaioli Reggini Ricci Righetti Righi Rinaldi Rocchi Rossi Rossini Ruggeri Sabbatini Salvatori Santi Santini Sarti Sartini Savini Scarponi Selva Serafini '
  + 'Severi Silvagni Simoncini Soldati Stacchini Stefanelli Stolfi Tamagnini Tasini Tentoni Terenzi Toccaceli Tomassoni Tonelli Torri Tosi Troina Ugolini Urbinati Valli Vannucci Vagnini '
  + 'Venturi Vici Villa Zafferani Zanotti Zonzini Zucchi Bacciocchi Beccari Berti Bizzocchi Camporesi Cangini Cardelli Ceccoli Cesari Crociani Depaoli Fabbrini Faetanini Forcellini '
  + 'Gasperini Gobbi Guidotti Lividini Maggioli Marcucci Michelotti Moretti Mussoni Paganelli Piva Rattini Riccardi Rosti Sansovini Taddei Tura Vandi Venerucci Zavatta Zanni Volpi Vitali '
  + 'Testa Sala Rota Riva Pace Orsi Nobili Merli Longhi Leoni Greco Fusco Fiore Colombo Bruno Basile Amato Bellini Carli Dini Ferrari Gentili Landi Marini Natali Poli Sensi Turci Zani').split(' ');
const INIZIALI = 'ABCDEFGILMNOPRSTV';
// la panchina di una squadra inventata: un portiere, due difensori, due centrocampisti, due attaccanti
const PANCHINA = [['P', 'POR'], ['D', 'DC'], ['D', 'TS'], ['C', 'CC'], ['C', 'CDC'], ['A', 'ATT'], ['A', 'AS']];
// i giocatori di una squadra inventata stanno a non più di SCARTO punti dalla media della squadra; le riserve RISERVA
// punti sotto. La squadra più forte della divisione ha la media CIMA punti sotto il massimo, la più debole FONDO sopra
// il minimo.
const SCARTO = 2, RISERVA = 3, CIMA = 2, FONDO = 3;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const mescola = (lista, seme) => lista.map((x, i) => [hash(`${seme}/${x}/${i}`), x]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
const divisione = (div) => DIVISIONI[div - 1];

/**
 * Prepara le squadre inventate e chi fabbrica i giocatori. DATI viene da creaDati (src/dati/scala.js) e serve per la
 * quotazione che dà una certa valutazione; `veri` sono le squadre vere (public/data.js); `posto` è la squadra vera di
 * cui il club dell'utente prende il posto.
 */
export function creaDivisioni(DATI, veri, posto) {
  const nomiVeri = new Set(); for (const c of veri) for (const x of (c.xi0 || c.xi).concat(c.pan0 || c.pan || [])) nomiVeri.add(x[0]);
  const cognomi = [...new Set(COGNOMI)].filter((n) => !nomiVeri.has(n)), posti = postiModulo('4-3-3');
  // tutti i nomi possibili: prima i cognomi da soli, poi con l'iniziale del nome davanti
  const conIniziale = (seme) => mescola(cognomi.flatMap((c) => INIZIALI.split('').map((i) => `${i}. ${c}`)), seme);
  /** Chi dà i nomi a una divisione: ogni nome una volta sola, col ruolo che serve. */
  const anagrafe = (seme) => {
    const liberi = mescola(cognomi, seme).concat(conIniziale(seme)), usati = new Set();
    return (reparto, ruolo) => {
      const nome = liberi.find((n) => !usati.has(n) && (!ruolo || inventato(n, reparto).ruolo === ruolo)) || liberi.find((n) => !usati.has(n));
      usati.add(nome); return nome;
    };
  };
  const numeri = (rosa) => { const presi = new Set(); for (const x of rosa) { let n = x[1] === 'P' && !presi.has(1) ? 1 : 2 + hash(x[0]) % 30; while (presi.has(n)) n = n % 98 + 1; presi.add(n); x[2] = n; } };
  const giocatore = (nome, reparto, val) => [nome, reparto, 0, DATI.quotazione(reparto, val), 'inv'];
  /** Una rosa: undici titolari nell'ordine del 4-3-3 e sette riserve; `val` dice la valutazione di ogni posto. */
  const rosa = (nomi, val) => {
    const xi = posti.map((p, i) => giocatore(nomi(p.reparto, p.ruolo), p.reparto, val(i, false)));
    const pan = PANCHINA.map(([reparto, ruolo], i) => giocatore(nomi(reparto, ruolo), reparto, val(i, true)));
    numeri(xi.concat(pan)); return { xi, pan };
  };

  const squadre = [], perDiv = { 1: veri.filter((c) => c.id !== posto).map((c) => c.id) }, nomiDiv = {};
  DIVISIONI.forEach((D, k) => {
    if (D.vere) return;
    const div = k + 1, [lo, hi] = D.val, lista = SQUADRE[D.id], nomi = nomiDiv[div] = anagrafe(D.id);
    // la rosa iniziale dell'utente prende i nomi per prima, così ha i cognomi semplici
    if (div === DIVISIONI.length) nomiDiv.inizio = nomi;
    // chi è la più forte e chi la più debole non dipende dall'ordine dell'elenco
    const forza = mescola(lista.map((s) => s[0]), `forza/${D.id}`);
    perDiv[div] = lista.map((s) => `${D.id}-${s[0]}`);
    squadre.push(...lista.map(([codice, nome, sigla], i) => ({ codice, nome, sigla, i, div, lo, hi, D, media: hi - CIMA - forza.indexOf(codice) * (hi - CIMA - lo - FONDO) / (lista.length - 1) })));
  });
  // la rosa iniziale: titolari sparsi tra il centro e il massimo delle valutazioni di partenza, riserve verso il minimo
  const [iLo, iHi] = ECONOMIA.inizio.rosa, mezzo = Math.round((iLo + iHi) / 2);
  const rosaIniziale = () => {
    const r = rosa(nomiDiv.inizio, (i, riserva) => (riserva ? iLo + hash(`inizio/r${i}`) % (mezzo - iLo + 1) : mezzo - 2 + hash(`inizio/t${i}`) % (iHi - mezzo + 3)));
    r.pan = r.pan.slice(0, ECONOMIA.inizio.panchina); return r;
  };
  const inizio = rosaIniziale();
  const inventate = squadre.map((s) => {
    const id = `${s.D.id}-${s.codice}`, val = (i, riserva) => clamp(Math.round(s.media + (hash(`${id}/${riserva ? 'r' : 't'}${i}`) % (SCARTO * 2 + 1)) - SCARTO - (riserva ? RISERVA : 0)), s.lo, s.hi);
    const r = rosa(nomiDiv[s.div], val), h = hash(id), [c1, c2] = COLORI[s.i % COLORI.length], st = STILI[h % STILI.length];
    return { id, name: s.nome, short: s.sigla, c1, c2, st: st || undefined, div: s.div, inventata: true, xi: r.xi, pan: r.pan, str: clamp(Math.round(1 + (s.media - s.lo) / (s.hi - s.lo) * 4), 1, 5), forza: clamp(1 + (s.media - s.lo) / (s.hi - s.lo) * 4, 1, 5),
      stemma: { forma: FORME[(h >>> 4) % FORME.length], simbolo: SIMBOLI[(h >>> 8) % SIMBOLI.length], bordo: BORDI[(h >>> 12) % BORDI.length], stile: st, c1, c2, sigla: s.sigla } };
  });

  /**
   * Un giocatore nuovo per il mercato: sempre lo stesso dallo stesso seme. `val` è la valutazione voluta; il nome ha
   * l'iniziale davanti e non è tra quelli di `esclusi` (i nomi già nella rosa dell'utente).
   */
  const nuovoGiocatore = (seme, reparto, val, esclusi = []) => {
    let nome = '';
    for (let k = 0; k < 50 && (!nome || esclusi.includes(nome)); k++) { const h = hash(`mercato/${seme}/${k}`); nome = `${INIZIALI[h % INIZIALI.length]}. ${cognomi[(h >>> 8) % cognomi.length]}`; }
    const x = giocatore(nome, reparto, val); x[2] = 2 + hash(nome) % 97; return x;
  };
  /** I giocatori veri (titolari e riserve delle squadre vere, tranne quella dell'utente) con la valutazione tra min e max. */
  const reali = (min, max) => {
    const out = [];
    for (const c of veri) if (c.id !== posto) for (const x of c.xi.concat(c.pan || [])) { const val = DATI.scheda(x, c.id).val; if (val >= min && val <= max) out.push({ da: c.id, x, val }); }
    return out;
  };
  return { inventate, perDiv, inizio, nuovoGiocatore, reali, divisione };
}
