// La Sfida (docs/navigazione.md §3.2): la schermata prima della partita. Due campi in prospettiva, a sinistra la nostra
// formazione e a destra l'avversaria, con le carte dei giocatori secondo il modulo; al centro la competizione, la fase,
// l'ora e il tempo; sotto ogni campo stemma, nome, stelle e la maglia che si userà; in basso Squadra, Riscaldamento e
// Gioca. La partita parte dal ponte (docs/ponte-partita.md): la home manda la richiesta e alla fine riceve l'esito.
import * as CAR from '../carriera.js';
import { FORMS } from '../config.js';
import { ponte } from '../ponte.js';
import { img, club, kitsFor, aiForm } from '../game.js';
import { adatto, postiModulo } from '../dati/scala.js';
import { nomiDi } from '../dati/squadre.js';
import { K, DATI, sel, salvaK, maglia, avviso, esc, mon } from './casa.js';
import { ILLUSTRAZIONI } from './illustrazioni.js';
import { icona, stelline } from './icone.js';
import { adatta, attrNome } from './carte.js';
import { cartaCampo, riempiRitratti } from './giocatore.js';
import { finestra } from './finestra.js';
import { t } from './testi.js';
import { apri, ridisegna, indietro } from './nav.js';

document.getElementById('vs').insertAdjacentHTML('beforebegin', '<div id="sfida" class="scr nas"></div>');
const radice = document.getElementById('sfida');
// la partita che si sta preparando: tipo ('camp', 'coppa', 'castelli', 'amichevole'), le due squadre, se si gioca fuori, se
// in caso di parità si va ai rigori, e (senza carriera, quando la barra in alto non c'è) come si torna a scegliere le squadre
let S = null;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
// è una partita della carriera, giocata col proprio club: contano energia, riscaldamento, risultato
const diCarriera = () => !!K && !!S && S.tipo !== 'amichevole' && S.mia === K.club;
const TIPO_PONTE = { camp: 'campionato', coppa: 'coppa', castelli: 'castelli', amichevole: 'amichevole' };

// La disposizione sui campi. Le linee di un modulo si staccano dove tra un giocatore e il successivo, dalla difesa
// all'attacco, ci sono più di STACCO metri: ogni linea ha la sua fascia di campo, il portiere in basso e le punte in alto.
// La carta è larga al più un LARGO-esimo del campo e alta quanto la fascia consente: lo scudo è alto ALTO volte la sua
// larghezza, sotto ci sono la barretta dell'energia (BARRA) e il nome: alto NOME[1] se lo scudo resta largo almeno
// GRANDE, se no NOME[0]. Per il nome ogni carta ha un posto largo POSTO volte lo scudo, e mai meno di NOME_LARGO (ci sta
// un cognome di undici lettere). In alto il campo si stringe: da 50 a STRETTO per cento di mezza larghezza. Chi nel modulo
// sta a FASCIA metri dal centro, o più, va sul bordo del campo.
const STACCO = 5, LARGO = 8.5, ALTO = 1.19, BARRA = 3, NOME = [12, 14], GRANDE = 34, POSTO = 1.7, NOME_LARGO = 58, STRETTO = 43, FASCIA = 25;
function linee(posti) {
  const por = Math.max(0, posti.findIndex((p) => p.ruolo === 'POR')), altri = posti.map((p, i) => ({ i, x: p.x, z: p.z })).filter((g) => g.i !== por).sort((a, b) => a.x - b.x || a.z - b.z);
  const out = [[{ i: por, x: posti[por].x, z: 0 }]];
  altri.forEach((g, k) => { if (!k || g.x - altri[k - 1].x > STACCO) out.push([]); out[out.length - 1].push(g); });
  return out;
}
// dove va ogni carta su un campo largo W e alto H: il centro, e quanto è largo il suo posto. Sulla stessa linea i giocatori
// tengono la distanza che hanno nel modulo; se così i nomi si toccherebbero si allargano tutti insieme, e se non basta si
// mettono a distanze uguali
function disponi(posti, W, H) {
  const ll = linee(posti), fascia = H / ll.length, larga = (nome) => Math.floor(Math.min(W / LARGO, (fascia - BARRA - nome) / ALTO));
  const grande = larga(NOME[1]) >= GRANDE, scritta = NOME[grande ? 1 : 0], gw = Math.max(20, larga(scritta)), dove = [];
  ll.forEach((linea, k) => {
    const y = H - (k + .5) * fascia, mezzo = (STRETTO + (50 - STRETTO) * y / H) / 100 * W, n = linea.length, posto = Math.min(Math.max(POSTO * gw, NOME_LARGO), 2 * mezzo / n), lim = mezzo - posto / 2;
    linea.sort((a, b) => a.z - b.z);
    let xs = linea.map((g) => clamp(g.z / FASCIA, -1, 1) * lim);
    const stretto = Math.min(...xs.slice(1).map((x, j) => x - xs[j]));
    if (stretto < posto) { const f = stretto > 0 ? posto / stretto : 0; xs = f && Math.max(-xs[0], xs[n - 1]) * f <= lim + .5 ? xs.map((x) => x * f) : xs.map((x, j) => (j - (n - 1) / 2) * posto); }
    linea.forEach((g, j) => { dove[g.i] = { x: W / 2 + xs[j], y, posto }; });
  });
  return { gw, scritta, dove };
}
// riempie un campo con le undici carte: chi gioca dove, con energia, fascia di capitano e avviso di fuori ruolo
function campo(el, c, modulo, mio) {
  const posti = postiModulo(modulo), r = el.getBoundingClientRect(); if (!r.width) return;
  const d = disponi(posti, r.width, r.height);
  el.style.setProperty('--gw', `${d.gw}px`); el.style.setProperty('--gf', `${d.scritta}px`);
  el.innerHTML = '<span class="erbaP"></span>' + c.xi.map((x, i) => {
    const sc = DATI.scheda(x, c.id), q = d.dove[i];
    return cartaCampo(sc, { club: c.id, energia: mio ? CAR.energiaDi(K, x[0]) : 100, capitano: mio && K.mio && K.mio.capitano === x[0], fuori: adatto(sc.ruolo, posti[i].ruolo), migliorato: mio && ((K.allen || {})[x[0]] || 0) > 0, stile: `left:${q.x.toFixed(1)}px;top:${q.y.toFixed(1)}px;width:${Math.floor(q.posto - 2)}px` });
  }).join('');
}
// la striscia sotto il campo: stemma, nome, stelle, modulo e la maglia che la squadra userà in questa partita
function striscia(c, modulo, kit, dove) {
  return `<img class="stemma" src="${img(c.id)}" alt=""><span class="chi"><b ${attrNome(nomiDi(c), 14)}>${esc(c.name)}</b><span>${stelline(c.str)}<u>${modulo}</u></span></span><span class="divisa">${maglia(kit.shirt, kit.c2, kit.stile || '', kit.colletto || 'giro', !!kit.raglan, dove)}</span>`;
}
// la competizione al centro: icona (o illustrazione del trofeo), nome e fase
function competizione() {
  if (S.tipo === 'camp') { const p = CAR.prossima(K); return { ico: 'campionato', immagine: 'trofeo-campionato', nome: t('carriera.campionatoNome'), fase: p ? t('carriera.partita', p.giornata, p.totale) : '' }; }
  if (S.tipo === 'coppa') { const p = CAR.coppaProssima(K); return { ico: 'coppa', immagine: 'coppa-titano', nome: t('carriera.coppa'), fase: p ? p.nome : '' }; }
  if (S.tipo === 'castelli') { const p = CAR.castelliProssima(K); return { ico: 'castelli', immagine: 'trofeo-castelli', nome: t('carriera.castelli'), fase: p ? p.nome : '' }; }
  return { ico: 'pallone', immagine: '', nome: t('home.amichevole'), fase: t('amichevole.titolo') };
}

/**
 * Apre la Sfida per una partita: tipo, club dell'utente in questa partita, avversario, in trasferta, rigori se pari.
 * Senza partita ridisegna quella di prima (dopo il riscaldamento, o tornando dalla Squadra).
 */
export function disegnaSfida(partita) {
  if (partita) S = partita;
  const H = club(S.mia), A = club(S.loro), mio = diCarriera(), [kh, ka] = kitsFor(H, A, !!S.fuori);
  const mioModulo = FORMS[sel.form] ? sel.form : '4-3-3', loroModulo = aiForm(A), comp = competizione(), m = CAR.meteoPartita(mio ? K : null, S.tipo);
  const logo = comp.immagine && ILLUSTRAZIONI[comp.immagine] ? `<img class="logo" src="img/illustrazioni/${comp.immagine}@2x.webp" alt="">` : icona(comp.ico, 'logo');
  const risc = mio ? CAR.statoRiscaldamento(K, CLUBS, S.tipo) : null;
  radice.classList.toggle('illustrata', !!ILLUSTRAZIONI['sfondo-sfida']);
  radice.innerHTML = '<div class="sCampo sx"></div>'
    + `<div class="sCentro">${logo}<b>${comp.nome}</b><i data-adatta>${comp.fase}</i><span class="vs">VS</span>${S.tipo === 'amichevole' ? '' : `<i class="luogo">${t(S.fuori ? 'carriera.inTrasferta' : 'carriera.inCasa')}</i>`}`
    + `<span class="meteo">${icona(m.cielo !== 'sereno' ? 'nuvola' : m.ora === 'giorno' ? 'sole' : 'luna')}<i>${m.orario}</i><i>${t('meteo.' + m.cielo)}</i><i>${m.gradi} °C</i></span></div>`
    + '<div class="sCampo dx"></div>'
    + `<div class="sClub sx">${striscia(H, mioModulo, kh, 'sf1')}</div><div class="sClub dx">${striscia(A, loroModulo, ka, 'sf2')}</div>`
    + `<div class="sAzioni${mio ? '' : ' coppia'}">`
    + (mio ? `<button class="azione" data-az="squadra">${icona('squadra')}<b>${t('home.squadra')}</b></button>` : `<button class="azione" data-az="cambia">${icona('indietro')}<b>${t('sfida.cambia')}</b></button>`)
    + (mio ? `<button class="azione risc${risc.fatto || !risc.serve ? ' spento' : ''}" data-az="riscaldamento">${icona('energia')}<span><b>${t('risc.nome')}</b><i>${risc.fatto ? t('risc.fatto') : !risc.serve ? t('risc.pieni') : `${t('risc.effetto', risc.bonus)} · ${icona('moneta')} ${mon(risc.monete)}`}</i></span></button>` : '')
    + `<button class="azione gioca" data-az="gioca"><b>${t('sfida.gioca')}</b>${icona('avanti')}</button></div>`;
  // le carte si mettono dopo, quando si sa quanto sono grandi i campi su questo schermo
  campo(radice.querySelector('.sCampo.sx'), H, mioModulo, mio); campo(radice.querySelector('.sCampo.dx'), A, loroModulo, false);
  adatta(radice); riempiRitratti(radice);
}
radice.addEventListener('load', () => adatta(radice), true);
addEventListener('resize', () => { if (S && !radice.classList.contains('nas')) disegnaSfida(); });

radice.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-az]'); if (!b) return;
  if (b.dataset.az === 'squadra') return apri('squadra');
  if (b.dataset.az === 'cambia') return S.indietro ? S.indietro() : indietro();
  if (b.dataset.az === 'riscaldamento') return riscalda();
  const esito = ponte.avviaPartita(richiesta());
  if (!esito.ok) avviso(esito.errori[0]);
});

/** Riscaldamento: un po' di energia in più ai titolari, per monete, una volta per partita. Si conferma in una finestra. */
function riscalda() {
  const st = CAR.statoRiscaldamento(K, CLUBS, S.tipo);
  if (st.fatto) return avviso(t('risc.giaFatto'));
  if (!st.serve) return avviso(t('risc.nonServe'));
  if (!st.puo) return avviso(t('risc.monete', mon(st.monete)));
  finestra({ titolo: t('risc.nome'), testo: t('risc.conferma', st.bonus, mon(st.monete)), si: t('risc.si'), fatto: () => { const r = CAR.riscaldamento(K, CLUBS, S.tipo); if (r.ok) { salvaK(); avviso(t('risc.ok', r.bonus)); } disegnaSfida(); } });
}

// una squadra nella forma del ponte: identità, modulo, maglia, titolari nell'ordine dei posti e panchina
function squadraPonte(c, modulo, utente, mio) {
  const posti = postiModulo(modulo);
  const g = (x, i) => { const sc = DATI.scheda(x, c.id); return { id: `${sc.origine}/${x[0]}`, nome: x[0], numero: x[2], reparto: x[1], ruolo: sc.ruolo, forza: x[3], energia: mio ? CAR.energiaDi(K, x[0]) : 100, altezza: sc.altezza, piede: sc.piede, fuoriRuolo: i < 0 ? 0 : adatto(sc.ruolo, posti[i].ruolo) }; };
  const ha = (tipo) => (mio && K.scelte && CAR.possiede(K, tipo, K.scelte[tipo]) ? K.scelte[tipo] : null);
  return { id: c.id, nome: c.name, sigla: c.short, stemma: c.id, utente, modulo, mentalita: utente ? sel.ment : 0,
    maglia: { tipo: 'prima', c1: c.c1, c2: c.c2, stile: c.st || '', colletto: c.col || '', raglan: !!c.rag }, magliaPortiere: null,
    scarpini: ha('scarpini'), pallone: !S.fuori && ha('pallone') ? ha('pallone') : 'classico', capitano: mio && K.mio ? K.mio.capitano || null : null,
    titolari: c.xi.map((x, i) => g(x, i)), panchina: (c.pan || []).slice(0, 8).map((x) => g(x, -1)) };
}
/** La richiesta per il ponte (docs/ponte-partita.md §3): la prima squadra è quella di casa. */
function richiesta() {
  const H = club(S.mia), A = club(S.loro), mio = diCarriera(), comp = competizione(), m = CAR.meteoPartita(mio ? K : null, S.tipo), partita = S;
  const noi = squadraPonte(H, FORMS[sel.form] ? sel.form : '4-3-3', true, mio), loro = squadraPonte(A, aiForm(A), false, false);
  return { versione: 1, tipo: TIPO_PONTE[S.tipo], titolo: `${comp.nome} · ${comp.fase}`, difficolta: sel.diff, ora: m.ora, meteo: { cielo: m.cielo, gradi: m.gradi, orario: m.orario },
    supplementariERigori: !!S.rigori, squadre: S.fuori ? [loro, noi] : [noi, loro], allaFine: (esito) => finePartita(partita, esito) };
}

/**
 * Alla fine della partita la home riceve l'esito (docs/ponte-partita.md §4): registra il risultato nella competizione,
 * salva l'energia con cui i giocatori sono usciti dal campo e mostra cosa si è guadagnato. Un'amichevole non lascia
 * traccia; una partita abbandonata non viene registrata.
 */
function finePartita(p, e) {
  const iu = p.fuori ? 1 : 0, gf = e.punteggio[iu], gs = e.punteggio[1 - iu];
  if (p.tipo === 'amichevole' || !K || p.mia !== K.club || !e.finita) return;
  const marcatori = e.marcatori.filter((x) => x.squadra === iu && x.tipo !== 'autogol').map((x) => x.nome), rigori = e.rigori ? [e.rigori[iu], e.rigori[1 - iu]] : null;
  let nota = '', r = null;
  if (p.tipo === 'camp') { r = CAR.giocaCampionato(K, CLUBS, gf, gs, marcatori); if (r) nota = r.finita ? (r.campione === K.club ? t('dopo.campioni') : t('dopo.stagioneFinita', r.posizione)) : t('dopo.posizione', r.posizione); }
  else {
    r = p.tipo === 'coppa' ? CAR.giocaCoppa(K, CLUBS, gf, gs, marcatori, Math.random, rigori) : CAR.giocaCastelli(K, CLUBS, gf, gs, marcatori, Math.random, rigori);
    const nome = t(p.tipo === 'coppa' ? 'carriera.coppa' : 'carriera.castelli');
    if (r) nota = r.fase === 'gironi' ? t('dopo.girone', r.posizione) + (r.finiti ? t(r.passa ? 'dopo.aiQuarti' : 'dopo.eliminato') : '') : r.vinta ? t('dopo.vinta', nome) : r.passa ? t('dopo.superato', nome, r.turno.toLowerCase()) : t('dopo.fuori', nome, r.turno.toLowerCase());
  }
  CAR.energiaDopoPartita(K, CLUBS, e.giocatori.filter((g) => g.squadra === iu).map((g) => ({ nome: g.nome, energia: g.energia })));
  salvaK(); ridisegna();
  const passa = r && r.rigori ? r.passa : null, esitoT = passa !== null ? t(passa ? 'dopo.avantiRigori' : 'dopo.fuoriRigori') : t(gf > gs ? 'dopo.vittoria' : gf < gs ? 'dopo.sconfitta' : 'dopo.pareggio');
  finestra({ titolo: `${esitoT} · ${gf}-${gs}${rigori ? ` (${rigori[0]}-${rigori[1]})` : ''}`, testo: [nota, r && r.monete ? t('dopo.premio', mon(r.monete)) : ''].filter(Boolean).join(' · '), si: t('dopo.continua'), soloSi: true });
}
