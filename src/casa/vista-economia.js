// I pannelli dell'economia nuova, in forma semplice finché Mercato e Il mio club non vengono ridisegnati (passi 9 e 10):
// il club (strutture, allenatori, finanze), il mercato (offerte a tempo, lista trasferimenti, osservatore, agente) e
// «Come guadagnare». Tutta la logica sta in src/carriera.js: qui ci sono solo l'elenco e i pulsanti.
import * as CAR from '../carriera.js';
import { ECONOMIA, DIVISIONI, FORMS } from '../config.js';
import { K, DATI, club, pan, mini, mon, esc, fmtTempo, salvaK, applicaMio, premioTesto } from './casa.js';
import { figura, stileFondo } from './immagini.js';
import { miniCarta, chiRitratto, riempiRitratti } from './giocatore.js';
import { adatta } from './carte.js';
import { icona, stelline, MO, DI } from './icone.js';
import { t } from './testi.js';

// un numero col suo segno davanti: «+50», «−50», e lo zero senza segno (mai «−0»)
const conSegno = (n) => (n > 0 ? `+${mon(n)}` : n < 0 ? `−${mon(-n)}` : '0');
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
  if (q === 'osservatori') return `${conSegno(-pc(n * S.osservatori))}% sul costo delle ricerche dell'osservatore`;
  if (q === 'curva') return `+${pc(n * S.curva)}% alle statistiche nelle partite in casa`;
  return `${mon(S.stadio.posti[n])} posti · +${mon(CAR.inMonete(K, S.stadio.incasso[n]))} monete a ogni partita in casa`;
}

let cTab = 'strutture';
/** Il mio club: le sette strutture, gli allenatori in inventario, le finanze. */
export function panClubMio(tab, msg) {
  if (['strutture', 'allenatori', 'finanze'].includes(tab)) cTab = tab;
  const me = club(K.club), voci = [['strutture', 'Strutture'], ['allenatori', `Allenatori (${CAR.quantiAllenatori(K)})`], ['finanze', 'Finanze']];
  const tabs = `<div class="seg">${voci.map(([k, n]) => `<button data-ctab="${k}" class="${k === cTab ? 'on' : ''}">${n}</button>`).join('')}<button data-club="personalizza">Personalizza</button><button data-club="allenamento">${t('allenamento.titolo')}</button><button data-club="amichevole">Amichevole</button></div>`;
  let corpo;
  if (cTab === 'strutture') {
    // una struttura è una carta: il suo disegno, il nome, le stelle, cosa dà adesso, cosa darà con una stella in più e il
    // pulsante «Migliora» col prezzo
    const struttura = (q) => {
      const n = CAR.stelle(K, q), c = CAR.costoStruttura(K, q), stadio = q === 'stadio';
      return `<div class="strutt${stadio ? ' stadioAlto' : ''}"${stadio ? stileFondo('stadio-alto') : ''}>${stadio ? '' : figura(FIGURE_STRUTTURE[q], 'sFig', 220)}`
        + `<span class="sTesto"><b>${NOMI_STRUTTURE[q]}</b>${stelline(n)}<span class="sOra"><i>Adesso</i>${effetto(q, n)}</span>`
        + (c ? `<span class="sPoi"><i>Con una stella in più</i>${effetto(q, n + 1)}</span></span><button data-struttura="${q}" class="${K.monete < c.monete || K.gemme < c.gemme ? 'no' : ''}">Migliora · ${costoTesto(c)}</button>`
          : '</span><em>Al massimo</em>') + '</div>';
    };
    // in cima lo Stadio, con la sua veduta dall'alto di fondo; sotto le altre sei, tre per riga
    corpo = `${struttura('stadio')}<div class="strutture">${CAR.STRUTTURE.filter((q) => q !== 'stadio').map(struttura).join('')}</div>`;
  } else if (cTab === 'allenatori') {
    const A = ECONOMIA.allenatori.rarita, quanti = (r, c) => ((K.allenatori || {})[r] || {})[c] || 0;
    // quanti allenatori di una categoria si hanno, rarità per rarità: il medaglione, il numero e la parola
    const conta = (c) => (r) => { const n = quanti(r, c); return `<span class="pf${n ? '' : ' zero'}">${figura('icona-allenatore-' + r, 'pIco', 26)}<b>${n}</b><u>${n === 1 ? UNA_RARITA[r] : NOMI_RARITA[r]}</u></span>`; };
    corpo = '<p class="nota2">Un allenatore si usa su un giocatore: alza le statistiche della sua categoria (comune +1, raro +2, leggendario +3) e con loro la valutazione, fino a 10 punti in più per giocatore. Per usarlo: Squadra, tieni premuto su un giocatore, Allena.</p><div class="catAllen">'
      + CAR.CATEGORIE.map((c) => `<div class="catAll">${figura('icona-categoria-' + c, 'catIco', 52)}<span class="catTesto"><b>${NOMI_CATEGORIE[c][0]}</b><i>${NOMI_CATEGORIE[c][1]}</i></span><span class="catConta">${CAR.RARITA.map(conta(c)).join('')}</span></div>`).join('') + '</div>'
      + '<div class="sez">Comprali coi diamanti</div><div class="seg">' + ['raro', 'leggendario'].map((r) => CAR.CATEGORIE.map((c) => `<button data-allenatore="${r}:${c}" class="${K.gemme < A[r].diamanti ? 'no' : ''}">${NOMI_CATEGORIE[c][0]} ${UNA_RARITA[r]} · ${DI} ${A[r].diamanti}</button>`).join('')).join('') + '</div>'
      + '<p class="nota2">I comuni arrivano dalle sfide di ogni giorno e dal Centro allenamento, i rari dalle sfide della settimana e dal percorso premi, i leggendari a fine stagione, con la promozione e arrivando in finale di coppa. Anche svincolando un giocatore se ne ottiene uno.</p>';
  } else {
    const st = K.storico || [], entrate = st.reduce((t, x) => t + Math.max(0, x.m), 0), uscite = st.reduce((t, x) => t - Math.min(0, x.m), 0), d = (ico, v, e) => `<div>${icona(ico)}<b>${v}</b><span>${e}</span></div>`;
    corpo = `<div class="dati finanze">${d('finanze', CAR.finanze(K), 'Finanze')}${d('moneta', mon(K.monete), 'Monete')}${d('diamante', K.gemme, 'Diamanti')}${d('entrate', conSegno(entrate), 'Entrate recenti')}${d('uscite', conSegno(-uscite), 'Uscite recenti')}</div><p class="nota2">Il giudizio dipende da quante vittorie vale il saldo in monete. Entrate e uscite contano gli ultimi ${ECONOMIA.storico} movimenti.</p><div class="seg"><button data-az="guadagna">Vedi i movimenti e come guadagnare</button></div>`;
  }
  pan(me.name, `${msg ? `<p class="avviso">${msg}</p>` : ''}${tabs}${corpo}`);
}

// un prezzo con le icone: le monete e, se servono, i diamanti
const prezzoHtml = (m, g) => (m ? `<span>${icona('moneta')}<b>${mon(m)}</b></span>` : '') + (g ? `<span>${icona('diamante')}<b>${g}</b></span>` : '');
// Una carta del mercato: a sinistra la carta mini del giocatore (cornice della rarità, ritratto, valutazione), a destra
// il nome, il ruolo preciso con piede e altezza (e lo stemma, se arriva da una squadra vera) e sotto il prezzo.
// Chi costa troppo resta leggibile come gli altri: cambia solo il prezzo, con scritto quanto manca.
// attr: l'attributo del pulsante (senza, la carta è ferma); gemme: i diamanti del prezzo; preso: già comprato;
// piena: la rosa è piena; pieno: il prezzo senza sconto, da scrivere barrato.
function cartaMercato(g, { attr = '', gemme = 0, preso = false, piena = false, pieno = 0 } = {}) {
  const da = g.da || K.club, sc = DATI.scheda(g.x, da), tag = attr ? 'button' : 'div';
  const mancaM = Math.max(0, g.prezzo - K.monete), mancaG = Math.max(0, gemme - K.gemme), caro = mancaM > 0 || mancaG > 0;
  const manca = piena ? '<i class="mManca">Rosa piena</i>' : caro ? `<i class="mManca">${mancaM + mancaG === 1 ? 'Ti manca' : 'Ti mancano'} ${prezzoHtml(mancaM, mancaG)}</i>` : '';
  const sotto = preso ? `<span class="mStato">${icona('spunta')}Preso</span>` : `<span class="mPrezzo">${prezzoHtml(g.prezzo, gemme)}${pieno ? `<del>${mon(pieno)}</del>` : ''}</span>${manca}`;
  return `<${tag} class="mG${preso ? ' preso' : caro || piena ? ' caro' : ''}" ${attr} ${attr && (preso || piena || caro) ? 'disabled' : ''}>`
    + `<span class="mCarta">${miniCarta({ val: sc.val, fascia: sc.fascia, ritr: chiRitratto(da, sc, 'carta') })}</span>`
    + `<span class="mTesto"><b data-adatta data-due-righe>${esc(g.x[0])}</b><span class="mDati"><u class="mRuolo r-${sc.reparto}">${sc.ruolo}</u><i>${sc.piede === 'S' ? 'sinistro' : 'destro'} · ${sc.altezza} cm</i>${g.da ? mini(g.da) : ''}</span>${sotto}</span></${tag}>`;
}
let mReparto = '';
/** Il mercato: offerte a tempo, lista trasferimenti, osservatore, agente. */
export function panMercato(msg) {
  const D = CAR.divisione(K), M = K.mercato, piena = CAR.quantiInRosa(K, CLUBS) >= CAR.rosaMax(K), sopra = DIVISIONI[Math.max(0, K.div - 2)], ora = new Date();
  const testa = `${msg ? `<p class="avviso">${msg}</p>` : ''}<p class="nota2">Rosa: ${CAR.quantiInRosa(K, CLUBS)} giocatori su ${CAR.rosaMax(K)}${piena ? ' (piena: per comprare vendi qualcuno o fai crescere la Foresteria)' : ''}. Per vendere o svincolare un giocatore: Squadra, tieni premuto sulla sua carta.</p>`;
  const elenco = CAR.offerte(K, CLUBS, ora), scade = elenco.length ? elenco[0].scade : ora.getTime();
  const offerte = elenco.map((g) => cartaMercato(g, { attr: `data-offerta="${g.k}"`, gemme: g.gemme, preso: g.presa, piena })).join('');
  const lista = CAR.listaMercato(K, CLUBS).map((g, k) => cartaMercato(g, { attr: `data-lista="${k}"`, preso: g.preso, piena })).join('');
  const reparti = `<div class="seg">${[['', 'Qualsiasi ruolo'], ...Object.entries(NOMI_REPARTI)].map(([r, n]) => `<button data-reparto="${r}" class="${r === mReparto ? 'on' : ''}">${n}</button>`).join('')}</div>`;
  const trovato = (g, chi) => `<div class="lista carteM">${cartaMercato(g, { piena, pieno: g.pieno })}</div><div class="seg"><button data-trovato="${chi}" class="${piena || K.monete < g.prezzo ? 'no' : 'oro'}">Compra</button><button data-lascia="${chi}">Lascialo andare</button></div>`;
  // osservatore e agente: ognuno nel suo riquadro, con la sua icona in un tondo, il nome e che cosa fa
  const servizio = (ico, classe, titolo, nota, dentro, lato = '') => `<div class="servizio ${classe}"><div class="svTesta"><span class="svIco">${icona(ico)}</span><span class="svNome"><b>${titolo}</b><i>${nota}</i></span>${lato}</div>${dentro}</div>`;
  const osservatore = M.osservato ? servizio('osservatore', 'oss', 'Osservatore', 'Ha trovato un giocatore: compralo o lascialo andare.', trovato(M.osservato, 'osservato'))
    : servizio('osservatore', 'oss', 'Osservatore', `Per monete trova un giocatore della ${D.nome} nella fascia che scegli, con lo sconto del ${Math.round(ECONOMIA.mercato.osservatore.sconto * 100)}%.`,
      `${reparti}<div class="seg">${CAR.FASCE.map((f) => `<button data-osserva="${f}" class="${K.monete < CAR.costoOsservatore(K, f) ? 'no' : ''}">${NOMI_FASCE[f]} · ${MO} ${mon(CAR.costoOsservatore(K, f))}</button>`).join('')}</div>`);
  const contatti = K.contatti || 0, quanti = `<span class="svConta">${figura('icona-contatto-agente', 'pIco', 30) || icona('agente')}<b>${contatti}</b><i>${contatti === 1 ? 'contatto' : 'contatti'}</i></span>`;
  const agente = M.agente ? servizio('agente', 'age', 'Agente', 'Ha trovato un giocatore: compralo o lascialo andare.', trovato(M.agente, 'agente'), quanti)
    : servizio('agente', 'age', 'Agente', `Per un contatto e monete trova un giocatore ${K.div === 1 ? 'tra i migliori del Campionato Sammarinese' : `della divisione sopra (${sopra.nome})`}, a prezzo pieno.`,
      `${reparti}<div class="seg"><button data-agente="1" class="${!(K.contatti > 0) || K.monete < CAR.costoAgente(K) ? 'no' : ''}">Chiama l'agente · 1 contatto e ${MO} ${mon(CAR.costoAgente(K))}</button><button data-contatto="1" class="${K.gemme < ECONOMIA.mercato.agente.diamanti ? 'no' : ''}">Compra un contatto · ${DI} ${ECONOMIA.mercato.agente.diamanti}</button></div>`, quanti);
  // i due striscioni: il titolo e una riga sotto, a sinistra, sopra l'illustrazione
  const striscione = (figuraS, titolo, sotto) => `<div class="striscione">${figura(figuraS, 'stFig', 300)}<b>${titolo}</b><i>${sotto}</i></div>`;
  pan('Mercato', `${testa}${striscione('evento-occasioni', 'Offerte a tempo', `${icona('orologio')} ancora ${fmtTempo(scade - ora)}`)}<div class="lista carteM">${offerte}</div>`
    + `${striscione('evento-scelte', 'Lista trasferimenti', D.nome)}<div class="lista carteM">${lista}</div><div class="seg"><button data-rinnova="1" class="${K.gemme < ECONOMIA.mercato.lista.rinnovo ? 'no' : ''}">Cambia subito la lista · ${DI} ${ECONOMIA.mercato.lista.rinnovo}</button></div><p class="nota2">La lista cambia da sola dopo ogni partita.</p>`
    + `${osservatore}${agente}`);
  // i nomi lunghi si stringono, i ritratti arrivano pochi alla volta
  const dentro = document.querySelector('#panC'); adatta(dentro); riempiRitratti(dentro);
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
/** Il giocatore da mostrare nella Home: il più forte che ci si può permettere adesso, o il meno caro della lista (`posso` dice quale dei due). */
export function consigliato() {
  if (!K) return null;
  // la lista trasferimenti costa solo monete, le offerte a tempo anche diamanti: si guardano tutte e due
  const lista = CAR.listaMercato(K, CLUBS).filter((g) => !g.preso), a_tempo = CAR.offerte(K, CLUBS, new Date()).filter((g) => !g.presa);
  const posso = [...lista, ...a_tempo].filter((g) => g.prezzo <= K.monete && (g.gemme || 0) <= K.gemme).sort((x, y) => y.val - x.val || x.prezzo - y.prezzo);
  const g = posso[0] || lista.sort((x, y) => x.prezzo - y.prezzo)[0];
  return g ? { c: { id: g.da || K.club }, x: g.x, da: g.da, v: g.val, costo: g.prezzo, gemme: g.gemme || 0, posso: posso.length > 0 } : null;
}

/** «Come guadagnare»: da dove arrivano monete e diamanti (importi veri, nella divisione in cui si gioca) e gli ultimi movimenti. */
export function panGuadagna() {
  const P = ECONOMIA.premi, D = CAR.divisione(K), G = ECONOMIA.diamanti, v = (n) => `${MO} ${mon(CAR.inMonete(K, n))}`, vinta = Math.round(CAR.premioVittoria(K)), rigaF = (t, x) => `<div><span>${t}</span><b>${x}</b></div>`;
  const somma = (g, k) => CAR.statoSfide(K)[g].reduce((t, x) => t + (x[k] || 0), 0), perc = CAR.statoPercorso(K).premi;
  const fonti = [['Vittoria', `${MO} ${mon(vinta)}`], ['Pareggio', `${MO} ${mon(Math.round(vinta * P.pareggio))}`], ['Sconfitta', `${MO} ${mon(Math.round(vinta * P.sconfitta))}`], ['Partita in casa (dallo Stadio)', v(ECONOMIA.strutture.stadio.incasso[CAR.stelle(K, 'stadio')]) || `${MO} 0`],
    ['Turno di coppa superato', v(P.turno)], [`${D.nome} vinto`, v(P.campionato)], [`${D.nome}: dal 2° ${[8, 11].includes(P.piazzamento.length + 1) ? 'all\'' : 'al '}${P.piazzamento.length + 1}° posto`, `da ${v(P.piazzamento[0])} a ${v(P.piazzamento[P.piazzamento.length - 1])}`], ['Coppa Titano vinta', `${v(P.coppa)} ${DI} ${G.coppa}`], ['Trofeo dei Castelli vinto', `${v(P.castelli)} ${DI} ${G.coppa}`],
    ['Sette giorni di fila con una partita', `${DI} ${G.serie.reduce((a, b) => a + b, 0)} e un contatto dell'agente`], ['Sfide di oggi (tutte)', `${premioTesto(somma('d', 'monete'), 0)} e un allenatore comune`],
    ['Sfide della settimana (tutte)', `${premioTesto(somma('w', 'monete'), G.settimana)} e un allenatore raro`], ['Sfide di stagione (tutte)', premioTesto(somma('s', 'monete'), somma('s', 'gemme'))], ['Sfide di carriera (tutte)', premioTesto(0, somma('c', 'gemme'))],
    ['Percorso premi (tutti i livelli)', `${premioTesto(perc.reduce((t, x) => t + x.monete, 0), perc.reduce((t, x) => t + x.gemme, 0))} e ${perc.filter((x) => x.allenatore).length} allenatori rari`],
    ['Fine stagione', `${DI} ${D.fine} e un allenatore leggendario`], ['Promozione', `${DI} ${G.promozione}, un allenatore leggendario e un contatto dell'agente`], ['Finale di coppa raggiunta', 'un allenatore leggendario e un contatto dell\'agente']];
  const giorno = (t) => new Date(t).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }), segno = conSegno;
  const mov = (K.storico || []).slice(0, 40).map((x) => `<div class="${x.m + x.g * 100 < 0 ? 'meno' : 'piu'}"><span>${giorno(x.t)} · ${esc(x.d || x.c)}</span><b>${[x.m ? `${segno(x.m)} ${MO}` : '', x.g ? `${segno(x.g)} ${DI}` : ''].filter(Boolean).join(' ')}</b></div>`).join('');
  pan('Monete e diamanti', `<div class="info guadagna"><div><div class="sez">Come si guadagnano · ${D.nome}</div><div class="ris2">${fonti.map(([t, x]) => rigaF(t, x)).join('')}</div><p class="nota2">Monete e diamanti non si comprano: si guadagnano solo giocando. Salendo di divisione i premi in monete crescono.</p><div class="seg"><button data-club="personalizza">Personalizza il club</button><button data-ctab="strutture">Strutture del club</button></div></div>`
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
