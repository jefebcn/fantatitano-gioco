// I pannelli dell'economia nuova, in forma semplice finché Mercato e Il mio club non vengono ridisegnati (passi 9 e 10):
// il club (strutture, allenatori, finanze), il mercato (offerte a tempo, lista trasferimenti, osservatore, agente) e
// «Come guadagnare». Tutta la logica sta in src/carriera.js: qui ci sono solo l'elenco e i pulsanti.
import * as CAR from '../carriera.js';
import { ECONOMIA, DIVISIONI, FORMS } from '../config.js';
import { K, DATI, club, pan, mini, mon, esc, fmtTempo, salvaK, applicaMio, borsaHtml, premioTesto } from './casa.js';
import { figura, stileFondo } from './immagini.js';
import { icona } from './icone.js';
import { t } from './testi.js';

const stelline = (n) => `<div class="liv">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</div>`;
const costoTesto = (c) => premioTesto(c.monete, c.gemme);
const NOMI_STRUTTURE = { centro: 'Centro allenamento', infermeria: 'Infermeria', foresteria: 'Foresteria', commerciale: 'Ufficio commerciale', osservatori: 'Osservatori', curva: 'Curva dei tifosi', stadio: 'Stadio' };
// l'illustrazione di ogni struttura; lo Stadio ha la sua, grande, in cima
const FIGURE_STRUTTURE = { centro: 'struttura-allenamento', infermeria: 'struttura-infermeria', foresteria: 'struttura-foresteria', commerciale: 'struttura-ufficio', osservatori: 'struttura-osservatori', curva: 'struttura-curva' };
const NOMI_RARITA = { comune: 'comuni', raro: 'rari', leggendario: 'leggendari' }, UNA_RARITA = { comune: 'comune', raro: 'raro', leggendario: 'leggendario' };
const NOMI_CATEGORIE = { tecnico: ['Tecnico', 'controllo, passaggio, tiro'], fisico: ['Fisico', 'velocità, accelerazione, resistenza, potenza'], difesa: ['Difesa', 'contrasto e posizione'], portieri: ['Portieri', 'tutte le doti del portiere'] };
const NOMI_REPARTI = { P: 'Portiere', D: 'Difensore', C: 'Centrocampista', A: 'Attaccante' }, NOMI_FASCE = { bassa: 'Fascia bassa', media: 'Fascia media', alta: 'Fascia alta' };
// cosa dà una struttura con n stelle
function effetto(q, n) {
  const S = ECONOMIA.strutture, pc = (x) => Math.round(x * 100);
  if (q === 'centro') return `${Math.min(S.centro.moduli[n], Object.keys(FORMS).length)} moduli · riscaldamento per ${S.centro.riscaldamento[n]} ${S.centro.riscaldamento[n] === 1 ? 'partita' : 'partite'} · ${n * S.centro.allenatori === 1 ? '1 allenatore comune' : `${n * S.centro.allenatori} allenatori comuni`} a settimana`;
  if (q === 'infermeria') return `+${pc(n * S.infermeria)}% di energia recuperata tra le partite`;
  if (q === 'foresteria') return `rosa fino a ${S.foresteria[n]} giocatori`;
  if (q === 'commerciale') return `+${pc(n * S.commerciale)}% di monete a ogni partita`;
  if (q === 'osservatori') return `−${pc(n * S.osservatori)}% sul costo delle ricerche dell'osservatore`;
  if (q === 'curva') return `+${pc(n * S.curva)}% alle statistiche nelle partite in casa`;
  return `${mon(S.stadio.posti[n])} posti · +${mon(CAR.inMonete(K, S.stadio.incasso[n]))} monete a ogni partita in casa`;
}

let cTab = 'strutture';
/** Il mio club: le sette strutture, gli allenatori in inventario, le finanze. */
export function panClubMio(tab, msg) {
  if (['strutture', 'allenatori', 'finanze'].includes(tab)) cTab = tab;
  const me = club(K.club), voci = [['strutture', 'Strutture'], ['allenatori', `Allenatori (${CAR.quantiAllenatori(K)})`], ['finanze', 'Finanze']];
  const tabs = `<div class="seg">${voci.map(([k, n]) => `<button data-ctab="${k}" class="${k === cTab ? 'on' : ''}">${n}</button>`).join('')}<button data-ntab="stemma">Negozio</button><button data-club="personalizza">Personalizza</button><button data-club="allenamento">${t('allenamento.titolo')}</button><button data-club="amichevole">Amichevole</button></div>`;
  let corpo;
  if (cTab === 'strutture') {
    // una struttura: le stelle, il nome, cosa dà adesso e il pulsante per farla crescere
    const testo = (q) => {
      const n = CAR.stelle(K, q), c = CAR.costoStruttura(K, q);
      return `<span class="sTesto">${stelline(n)}<b>${NOMI_STRUTTURE[q]} · ${n} ${n === 1 ? 'stella' : 'stelle'} su 5</b><span>Adesso: ${effetto(q, n)}</span>`
        + (c ? `<button data-struttura="${q}" class="${K.monete < c.monete || K.gemme < c.gemme ? 'no' : ''}">Una stella in più (${effetto(q, n + 1)}) · ${costoTesto(c)}</button>` : '<em>Al massimo</em>') + '</span>';
    };
    // in cima lo Stadio, con la sua veduta dall'alto di fondo; sotto le altre sei, ognuna col suo disegno
    corpo = `<div class="strutt stadioAlto"${stileFondo('stadio-alto')}>${testo('stadio')}</div><div class="strutture">`
      + CAR.STRUTTURE.filter((q) => q !== 'stadio').map((q) => `<div class="strutt">${figura(FIGURE_STRUTTURE[q], 'sFig', 96)}${testo(q)}</div>`).join('') + '</div>';
  } else if (cTab === 'allenatori') {
    const A = ECONOMIA.allenatori.rarita, quanti = (r, c) => ((K.allenatori || {})[r] || {})[c] || 0;
    corpo = '<p class="nota2">Un allenatore si usa su un giocatore: alza le statistiche della sua categoria (comune +1, raro +2, leggendario +3) e con loro la valutazione, fino a 10 punti in più per giocatore. Per usarlo: Squadra, tieni premuto su un giocatore, Allena.</p><div class="lista">'
      + CAR.CATEGORIE.map((c) => `<div class="gioc sel"><b>${NOMI_CATEGORIE[c][0]}</b><span>${NOMI_CATEGORIE[c][1]}</span><em>${CAR.RARITA.map((r) => `${quanti(r, c)} ${NOMI_RARITA[r]}`).join(' · ')}</em></div>`).join('') + '</div>'
      + '<div class="sez">Comprali coi diamanti</div><div class="seg">' + ['raro', 'leggendario'].map((r) => CAR.CATEGORIE.map((c) => `<button data-allenatore="${r}:${c}" class="${K.gemme < A[r].diamanti ? 'no' : ''}">${NOMI_CATEGORIE[c][0]} ${UNA_RARITA[r]} · ◆ ${A[r].diamanti}</button>`).join('')).join('') + '</div>'
      + '<p class="nota2">I comuni arrivano dalle sfide di ogni giorno e dal Centro allenamento, i rari dalle sfide della settimana e dal percorso premi, i leggendari a fine stagione, con la promozione e arrivando in finale di coppa. Anche svincolando un giocatore se ne ottiene uno.</p>';
  } else {
    const st = K.storico || [], entrate = st.reduce((t, x) => t + Math.max(0, x.m), 0), uscite = st.reduce((t, x) => t - Math.min(0, x.m), 0), d = (v, e) => `<div><b>${v}</b><span>${e}</span></div>`;
    corpo = `<div class="dati">${d(CAR.finanze(K), 'Finanze')}${d(mon(K.monete), 'Monete')}${d(K.gemme, 'Diamanti')}${d(`+${mon(entrate)}`, 'Entrate recenti')}${d(`−${mon(uscite)}`, 'Uscite recenti')}</div><p class="nota2">Il giudizio dipende da quante vittorie vale il saldo in monete. Entrate e uscite contano gli ultimi ${ECONOMIA.storico} movimenti.</p><div class="seg"><button data-az="guadagna">Vedi i movimenti e come guadagnare</button></div>`;
  }
  pan(me.name, `${borsaHtml()}${msg ? `<p class="avviso">${msg}</p>` : ''}${tabs}${corpo}`);
}

// una riga del mercato: il giocatore (con lo stemma, se arriva da una squadra vera), il ruolo preciso, la valutazione,
// piede e altezza, e a destra il prezzo
function riga(g, prezzo, attr, spento) {
  const sc = DATI.scheda(g.x, g.da || K.club), tag = attr ? 'button' : 'div';
  return `<${tag} class="gioc${attr ? '' : ' sel'}" ${attr || ''} ${spento ? 'disabled' : ''}>${g.da ? mini(g.da) : ''}<b>${esc(g.x[0])}</b><span>${sc.ruolo} · ${sc.val} · ${sc.piede === 'S' ? 'sinistro' : 'destro'} · ${sc.altezza} cm</span><em>${prezzo}</em></${tag}>`;
}
let mReparto = '';
/** Il mercato: offerte a tempo, lista trasferimenti, osservatore, agente. */
export function panMercato(msg) {
  const D = CAR.divisione(K), M = K.mercato, piena = CAR.quantiInRosa(K, CLUBS) >= CAR.rosaMax(K), sopra = DIVISIONI[Math.max(0, K.div - 2)], ora = new Date();
  const testa = `${borsaHtml()}${msg ? `<p class="avviso">${msg}</p>` : ''}<p class="nota2">Rosa: ${CAR.quantiInRosa(K, CLUBS)} giocatori su ${CAR.rosaMax(K)}${piena ? ' (piena: per comprare vendi qualcuno o fai crescere la Foresteria)' : ''}. Per vendere o svincolare un giocatore: Squadra, tieni premuto sulla sua carta.</p>`;
  const elenco = CAR.offerte(K, CLUBS, ora), scade = elenco.length ? elenco[0].scade : ora.getTime();
  const offerte = elenco.map((g) => riga(g, g.presa ? 'presa' : `● ${mon(g.prezzo)} ◆ ${g.gemme}`, `data-offerta="${g.k}"`, g.presa || piena || K.monete < g.prezzo || K.gemme < g.gemme)).join('');
  const lista = CAR.listaMercato(K, CLUBS).map((g, k) => riga(g, g.preso ? 'preso' : `● ${mon(g.prezzo)}`, `data-lista="${k}"`, g.preso || piena || K.monete < g.prezzo)).join('');
  const reparti = `<div class="seg">${[['', 'Qualsiasi ruolo'], ...Object.entries(NOMI_REPARTI)].map(([r, n]) => `<button data-reparto="${r}" class="${r === mReparto ? 'on' : ''}">${n}</button>`).join('')}</div>`;
  const trovato = (g, chi) => `${riga(g, `● ${mon(g.prezzo)}${g.pieno ? ` invece di ${mon(g.pieno)}` : ''}`)}<div class="seg"><button data-trovato="${chi}" class="${piena || K.monete < g.prezzo ? 'no' : 'oro'}">Compra</button><button data-lascia="${chi}">Lascialo andare</button></div>`;
  const osservatore = M.osservato ? trovato(M.osservato, 'osservato')
    : `<p class="nota2">Per monete trova un giocatore della ${D.nome} nella fascia che scegli, con lo sconto del ${Math.round(ECONOMIA.mercato.osservatore.sconto * 100)}%.</p>${reparti}<div class="seg">${CAR.FASCE.map((f) => `<button data-osserva="${f}" class="${K.monete < CAR.costoOsservatore(K, f) ? 'no' : ''}">${NOMI_FASCE[f]} · ● ${mon(CAR.costoOsservatore(K, f))}</button>`).join('')}</div>`;
  const agente = M.agente ? trovato(M.agente, 'agente')
    : `<p class="nota2">Per un contatto e monete trova un giocatore ${K.div === 1 ? 'tra i migliori del Campionato Sammarinese' : `della divisione sopra (${sopra.nome})`}, a prezzo pieno. Contatti: ${K.contatti || 0}.</p>${reparti}<div class="seg"><button data-agente="1" class="${!(K.contatti > 0) || K.monete < CAR.costoAgente(K) ? 'no' : ''}">Chiama l'agente · 1 contatto e ● ${mon(CAR.costoAgente(K))}</button><button data-contatto="1" class="${K.gemme < ECONOMIA.mercato.agente.diamanti ? 'no' : ''}">Compra un contatto · ◆ ${ECONOMIA.mercato.agente.diamanti}</button></div>`;
  // i due striscioni: il titolo e una riga sotto, a sinistra, sopra l'illustrazione
  const striscione = (figuraS, titolo, sotto) => `<div class="striscione">${figura(figuraS, 'stFig', 300)}<b>${titolo}</b><i>${sotto}</i></div>`;
  pan('Mercato', `${testa}${striscione('evento-occasioni', 'Offerte a tempo', `${icona('orologio')} ancora ${fmtTempo(scade - ora)}`)}<div class="lista">${offerte}</div>`
    + `${striscione('evento-scelte', 'Lista trasferimenti', D.nome)}<div class="lista">${lista}</div><div class="seg"><button data-rinnova="1" class="${K.gemme < ECONOMIA.mercato.lista.rinnovo ? 'no' : ''}">Cambia subito la lista · ◆ ${ECONOMIA.mercato.lista.rinnovo}</button></div><p class="nota2">La lista cambia da sola dopo ogni partita.</p>`
    + `<div class="sez">Osservatore</div>${osservatore}<div class="sez">Agente</div>${agente}`);
}
// i cinque modi di allenamento, nell'ordine della schermata: nome dell'illustrazione e chiave dei testi
const MODI_ALLENAMENTO = ['tutorial', 'libero', 'rigori', 'punizioni', 'angoli'];
/**
 * Allenamento (da Il mio club): cinque carte, una per modo. Per ora sono tutte «In arrivo»: si accendono quando la
 * partita sa farle partire (docs/ponte-partita.md, §5).
 */
export function panAllenamento() {
  pan(t('allenamento.titolo'), `<p class="nota2">${t('allenamento.nota')}</p><div class="allenamenti">`
    + MODI_ALLENAMENTO.map((m) => `<button class="modoA" data-az="inArrivo">${figura('allenamento-' + m, 'mFig', 150)}<b>${t('allenamento.' + m)}</b><i>${t('allenamento.' + m + '.testo')}</i><em>${icona('lucchetto')}${t('inArrivo')}</em></button>`).join('') + '</div>');
}
/** Il giocatore della lista trasferimenti da mostrare nella Home: il più forte che ci si può permettere, o il meno caro. */
export function consigliato() {
  if (!K) return null;
  const liberi = CAR.listaMercato(K, CLUBS).filter((g) => !g.preso), posso = liberi.filter((g) => g.prezzo <= K.monete).sort((a, b) => b.val - a.val), g = posso[0] || liberi.sort((a, b) => a.prezzo - b.prezzo)[0];
  return g ? { c: { id: g.da || K.club }, x: g.x, da: g.da, v: g.val, costo: g.prezzo } : null;
}

/** «Come guadagnare»: da dove arrivano monete e diamanti (importi veri, nella divisione in cui si gioca) e gli ultimi movimenti. */
export function panGuadagna() {
  const P = ECONOMIA.premi, D = CAR.divisione(K), G = ECONOMIA.diamanti, v = (n) => `● ${mon(CAR.inMonete(K, n))}`, vinta = Math.round(CAR.premioVittoria(K)), rigaF = (t, x) => `<div><span>${t}</span><b>${x}</b></div>`;
  const somma = (g, k) => CAR.statoSfide(K)[g].reduce((t, x) => t + (x[k] || 0), 0), perc = CAR.statoPercorso(K).premi;
  const fonti = [['Vittoria', `● ${mon(vinta)}`], ['Pareggio', `● ${mon(Math.round(vinta * P.pareggio))}`], ['Sconfitta', `● ${mon(Math.round(vinta * P.sconfitta))}`], ['Partita in casa (dallo Stadio)', v(ECONOMIA.strutture.stadio.incasso[CAR.stelle(K, 'stadio')]) || '● 0'],
    ['Turno di coppa superato', v(P.turno)], [`${D.nome} vinto`, v(P.campionato)], [`${D.nome}: dal 2° ${[8, 11].includes(P.piazzamento.length + 1) ? 'all\'' : 'al '}${P.piazzamento.length + 1}° posto`, `da ${v(P.piazzamento[0])} a ${v(P.piazzamento[P.piazzamento.length - 1])}`], ['Coppa Titano vinta', `${v(P.coppa)} ◆ ${G.coppa}`], ['Trofeo dei Castelli vinto', `${v(P.castelli)} ◆ ${G.coppa}`],
    ['Sette giorni di fila con una partita', `◆ ${G.serie.reduce((a, b) => a + b, 0)} e un contatto dell'agente`], ['Sfide di oggi (tutte)', `${premioTesto(somma('d', 'monete'), 0)} e un allenatore comune`],
    ['Sfide della settimana (tutte)', `${premioTesto(somma('w', 'monete'), G.settimana)} e un allenatore raro`], ['Sfide di stagione (tutte)', premioTesto(somma('s', 'monete'), somma('s', 'gemme'))], ['Sfide di carriera (tutte)', premioTesto(0, somma('c', 'gemme'))],
    ['Percorso premi (tutti i livelli)', `${premioTesto(perc.reduce((t, x) => t + x.monete, 0), perc.reduce((t, x) => t + x.gemme, 0))} e ${perc.filter((x) => x.allenatore).length} allenatori rari`],
    ['Fine stagione', `◆ ${D.fine} e un allenatore leggendario`], ['Promozione', `◆ ${G.promozione}, un allenatore leggendario e un contatto dell'agente`], ['Finale di coppa raggiunta', 'un allenatore leggendario e un contatto dell\'agente']];
  const giorno = (t) => new Date(t).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }), segno = (n) => (n > 0 ? `+${mon(n)}` : `−${mon(-n)}`);
  const mov = (K.storico || []).slice(0, 40).map((x) => `<div class="${x.m + x.g * 100 < 0 ? 'meno' : 'piu'}"><span>${giorno(x.t)} · ${esc(x.d || x.c)}</span><b>${[x.m ? `${segno(x.m)} ●` : '', x.g ? `${segno(x.g)} ◆` : ''].filter(Boolean).join(' ')}</b></div>`).join('');
  pan('Monete e diamanti', `${borsaHtml()}<div class="info"><div><div class="sez">Come si guadagnano · ${D.nome}</div><div class="ris2">${fonti.map(([t, x]) => rigaF(t, x)).join('')}</div><p class="nota2">Monete e diamanti non si comprano: si guadagnano solo giocando. Salendo di divisione i premi in monete crescono.</p><div class="seg"><button data-ntab="stemma">Negozio</button><button data-ctab="strutture">Strutture del club</button></div></div>`
    + `<div><div class="sez">Ultimi movimenti</div>${mov ? `<div class="ris2 mov">${mov}</div>` : '<p class="vuoto">Ancora nessun movimento: gioca una partita.</p>'}</div></div>`);
}

const MOTIVI = { soldi: 'Servono più monete o diamanti', rosa: 'La rosa è piena: vendi un giocatore o fai crescere la Foresteria', massimo: 'È già al massimo', aperta: 'C\'è già un giocatore in attesa', contatto: 'Serve un contatto dell\'agente', nessuno: 'Nessun giocatore trovato', giocatore: 'Questo giocatore non c\'è più' };
const perche = (r) => MOTIVI[r.motivo] || 'Non riuscito';
/** Un tocco su un pulsante di questi pannelli: se è uno dei loro lo gestisce e torna vero. */
export function toccaEconomia(b) {
  const d = b.dataset, fatto = (ok) => { if (ok) { applicaMio(); salvaK(); } return true; };
  if (d.struttura) { const r = CAR.miglioraStruttura(K, d.struttura); fatto(r.ok); panClubMio('strutture', r.ok ? `${NOMI_STRUTTURE[d.struttura]}: ${r.stelle} ${r.stelle === 1 ? 'stella' : 'stelle'}` : perche(r)); return true; }
  if (d.allenatore) { const [rar, cat] = d.allenatore.split(':'), r = CAR.compraAllenatore(K, rar, cat); fatto(r.ok); panClubMio('allenatori', r.ok ? `Allenatore ${UNA_RARITA[rar]} preso: ${NOMI_CATEGORIE[cat][0]}` : perche(r)); return true; }
  if (d.reparto !== undefined) { mReparto = d.reparto; panMercato(); return true; }
  if (d.lista) { const r = CAR.compraLista(K, CLUBS, +d.lista); fatto(r.ok); panMercato(r.ok ? `${esc(r.nome)} è tuo: lo trovi tra le riserve` : perche(r)); return true; }
  if (d.offerta) { const r = CAR.compraOfferta(K, CLUBS, +d.offerta); fatto(r.ok); panMercato(r.ok ? `${esc(r.nome)} è tuo: lo trovi tra le riserve` : perche(r)); return true; }
  if (d.rinnova) { const r = CAR.rinnovaLista(K); fatto(r.ok); panMercato(r.ok ? 'Lista trasferimenti cambiata' : perche(r)); return true; }
  if (d.osserva) { const r = CAR.osserva(K, CLUBS, d.osserva, mReparto || null); fatto(r.ok); panMercato(r.ok ? 'L\'osservatore ha trovato un giocatore' : perche(r)); return true; }
  if (d.agente) { const r = CAR.agente(K, CLUBS, mReparto || null); fatto(r.ok); panMercato(r.ok ? 'L\'agente ha trovato un giocatore' : perche(r)); return true; }
  if (d.contatto) { const r = CAR.compraContatto(K); fatto(r.ok); panMercato(r.ok ? 'Contatto dell\'agente preso' : perche(r)); return true; }
  if (d.trovato) { const r = CAR.compraTrovato(K, CLUBS, d.trovato); fatto(r.ok); panMercato(r.ok ? `${esc(r.nome)} è tuo: lo trovi tra le riserve` : perche(r)); return true; }
  if (d.lascia) { CAR.lasciaTrovato(K, d.lascia); fatto(true); panMercato(); return true; }
  return false;
}
