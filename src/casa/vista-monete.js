// «Monete e diamanti» (bozza di Alex del 24/11). A sinistra i due saldi e «Il premio più vicino»: tra percorso premi,
// sfide e sette giorni di fila, quello a cui manca meno, con cosa si vince e il pulsante per andarci. A destra da dove
// arrivano monete e diamanti, in quattro schede di tessere: un'illustrazione, un nome corto e il premio a icone.
// Gli importi sono quelli della divisione in cui si gioca. L'ultima scheda scelta resta salvata sul dispositivo.
import * as CAR from '../carriera.js';
import { ECONOMIA, PANNELLI } from '../config.js';
import { K, pan, mon, sel } from './casa.js';
import { figura } from './immagini.js';
import { premi, figuraPremio, pannello, barra } from './quadri.js';
import { t } from './testi.js';

export const SCHEDE_MONETE = ['partite', 'competizioni', 'sfide', 'bonus'];
const somma = (lista, k) => lista.reduce((tot, x) => tot + (x[k] || 0), 0);
// un premio fatto di monete, diamanti, un allenatore e contatti dell'agente: le voci per `premi`
const voci = ({ monete = 0, gemme = 0, allenatore = '', contatti = 0 }) => [monete ? ['monete', mon(monete)] : null, gemme ? ['diamanti', gemme] : null, allenatore ? [allenatore] : null, contatti ? ['contatto'] : null];

// Le tessere di una scheda: [illustrazione grande (il nome di un trofeo, o il tipo di premio), nome, voci del premio]
function tessere(scheda) {
  const P = ECONOMIA.premi, G = ECONOMIA.diamanti, D = CAR.divisione(K), v = (n) => CAR.inMonete(K, n), a = P.arrotonda;
  // quanto paga una partita: la vittoria della divisione (con l'Ufficio commerciale), una parte per pareggio e sconfitta
  const paga = (parte) => Math.max(a, Math.round(parte * CAR.premioVittoria(K) / a) * a);
  if (scheda === 'partite') {
    return [['monete', t('monete.vittoria'), [['monete', mon(paga(1))]]], ['monete', t('monete.pareggio'), [['monete', mon(paga(P.pareggio))]]], ['monete', t('monete.sconfitta'), [['monete', mon(paga(P.sconfitta))]]],
      ['monete', t('monete.stadio'), [['monete', mon(v(ECONOMIA.strutture.stadio.incasso[CAR.stelle(K, 'stadio')]))]]]];
  }
  if (scheda === 'competizioni') {
    const posti = P.piazzamento.length + 1;
    return [['trofeo-campionato', t('monete.campionato'), [['monete', mon(v(P.campionato))]]], ['trofeo-campionato', t('monete.piazzamento', posti), [['monete', t('monete.daA', mon(v(P.piazzamento[0])), mon(v(P.piazzamento[posti - 2])))]]],
      ['coppa-titano', t('monete.turno'), [['monete', mon(v(P.turno))]]], ['coppa-titano', t('monete.coppa'), voci({ monete: v(P.coppa), gemme: G.coppa })],
      ['coppa-titano', t('monete.finale'), voci({ allenatore: 'leggendario', contatti: 1 })], ['trofeo-castelli', t('monete.castelli'), voci({ monete: v(P.castelli), gemme: G.coppa })]];
  }
  if (scheda === 'sfide') {
    const st = CAR.statoSfide(K);
    return [['monete', t('monete.sfideOggi'), voci({ monete: somma(st.d, 'monete'), allenatore: 'comune' })], ['monete', t('monete.sfideSettimana'), voci({ monete: somma(st.w, 'monete'), gemme: G.settimana, allenatore: 'raro' })],
      ['monete', t('monete.sfideStagione'), voci({ monete: somma(st.s, 'monete'), gemme: somma(st.s, 'gemme') })], ['diamanti', t('monete.sfideCarriera'), voci({ gemme: somma(st.c, 'gemme') })]];
  }
  const pe = CAR.statoPercorso(K).premi, rari = pe.filter((x) => x.allenatore).length;
  return [['diamanti', t('monete.serie'), voci({ gemme: G.serie.reduce((x, y) => x + y, 0), contatti: 1 })],
    ['monete', t('monete.percorso'), [['monete', mon(somma(pe, 'monete'))], ['diamanti', somma(pe, 'gemme')], rari ? ['raro', rari] : null]],
    ['diamanti', t('monete.fineStagione'), voci({ gemme: D.fine, allenatore: 'leggendario' })],
    // dalla divisione più alta non si sale più
    K.div > 1 ? ['diamanti', t('monete.promozione'), voci({ gemme: G.promozione, allenatore: 'leggendario', contatti: 1 })] : null].filter(Boolean);
}
const tessera = ([fig, nome, premio]) => `<div class="kTess dTess">${figura(fig, 'dFig', PANNELLI.monete.figura * 1.4) || figuraPremio(fig, 'dFig', PANNELLI.monete.figura)}<b>${nome}</b>${premi(premio)}</div>`;

// dove porta il pulsante di una sfida, secondo cosa la fa avanzare: quasi tutte si fanno giocando
const DOVE = { acquisti: ['monete.vaiMercato', 'mercato'], allenamenti: ['monete.vaiSquadra', 'squadra'], stelle: ['monete.vaiClub', 'club'] };
/**
 * Il premio più vicino. Se c'è già qualcosa da ritirare è quello; se no, tra il percorso premi, le sfide non ancora
 * fatte e i sette giorni di fila, quello con la parte fatta più grande (a pari merito vince chi viene prima in
 * quest'ordine). Torna nome, parte fatta (0-1), conto, voci del premio, frase e pulsante [testo, rotta] (senza rotta: gioca).
 */
export function premioVicino(oggi = new Date()) {
  const pe = CAR.statoPercorso(K), st = CAR.statoSfide(K, oggi), E = ECONOMIA.percorso.punti, gioca = [t('home.gioca'), ''];
  if (pe.daRitirare) { const x = pe.premi.find((y) => y.raggiunto && !y.preso); return { nome: t('monete.percorsoLivello', x.livello), parte: 1, conto: t('monete.pronto'), premio: voci(x), frase: t('monete.ritiralo'), pulsante: [t('monete.ritira'), 'percorso'] }; }
  for (const g of Object.keys(CAR.SFIDE)) {
    const x = st[g].find((y) => y.fatto && !y.preso) || (st.bonus[g] && st.bonus[g].fatto && !st.bonus[g].preso ? { ...st.bonus[g], t: t('monete.tutte', CAR.GRUPPI[g]) } : null);
    if (x) return { nome: x.t, parte: 1, conto: t('monete.pronto'), premio: voci(x), frase: t('monete.ritiralo'), pulsante: [t('monete.riscuoti'), 'sfide:' + g] };
  }
  const scelte = [];
  if (pe.livello < pe.livelli) {
    const x = pe.premi[pe.inCorso - 1], mancano = pe.perLivello - pe.nelLivello;
    scelte.push({ nome: t('monete.percorsoLivello', pe.inCorso), parte: pe.nelLivello / pe.perLivello, conto: t('monete.punti', pe.nelLivello, pe.perLivello), premio: voci(x),
      frase: t(mancano <= E.partita ? 'monete.mancaGioca' : mancano <= E.partita + E.vinta ? 'monete.mancaVinci' : 'monete.mancaSfide', mancano), pulsante: gioca });
  }
  for (const g of Object.keys(CAR.SFIDE)) for (const x of st[g]) if (!x.fatto) scelte.push({ nome: x.t, parte: x.prog / x.n, conto: `${x.prog} / ${x.n}`, premio: voci(x), frase: t('monete.sfida.' + g), pulsante: DOVE[x.m] ? [t(DOVE[x.m][0]), DOVE[x.m][1]] : gioca });
  // i sette giorni di fila: contano se la partita di oggi manca ancora
  const S = K.serie || { giorno: '', n: 0 }, giorni = ECONOMIA.diamanti.serie, ieri = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate() - 1);
  if (S.giorno !== CAR.giornoDi(oggi)) {
    const fatti = S.giorno === CAR.giornoDi(ieri) && S.n < giorni.length ? S.n : 0;
    scelte.push({ nome: t('monete.serie'), parte: fatti / giorni.length, conto: t('monete.giorni', fatti, giorni.length), premio: voci({ gemme: giorni[fatti], contatti: fatti + 1 === giorni.length ? 1 : 0 }), frase: t('monete.serieGioca'), pulsante: gioca });
  }
  return scelte.reduce((meglio, x) => (!meglio || x.parte > meglio.parte ? x : meglio), null);
}

/** Disegna «Monete e diamanti». */
export function panMonete() {
  const scheda = SCHEDE_MONETE.includes(sel.monete) ? sel.monete : SCHEDE_MONETE[0], pv = premioVicino();
  const saldo = (tipo, nome, n) => `<div class="kPan dSaldo ${tipo}">${figuraPremio(tipo, 'dIco', PANNELLI.monete.icona)}<span><i>${nome}</i><b>${mon(n)}</b></span></div>`;
  const vicino = pv ? `<b class="dNome">${pv.nome}</b>${barra(pv.parte, 'verde')}<span class="dConto"><i>${pv.conto}</i>${premi(pv.premio)}</span><p class="dFrase">${pv.frase}</p>`
    + `<button class="kOro" ${pv.pulsante[1] ? `data-vai="${pv.pulsante[1]}"` : 'data-az="prossima"'}>${pv.pulsante[0]}</button>` : `<p class="dFrase">${t('monete.tuttoFatto')}</p>`;
  pan(t('monete.titolo'), `<div class="dSx">${saldo('monete', t('monete.monete'), K.monete)}${saldo('diamanti', t('monete.diamanti'), K.gemme)}${pannello('dVicino', t('monete.vicino'), vicino)}</div>`
    + pannello('dDx', '', `<div class="kSchede">${SCHEDE_MONETE.map((s) => `<button data-mtab="${s}" class="${s === scheda ? 'on' : ''}">${t('monete.scheda.' + s)}</button>`).join('')}</div><div class="dGriglia">${tessere(scheda).map(tessera).join('')}</div>`), '', 'monete');
}
