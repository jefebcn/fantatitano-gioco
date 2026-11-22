// La barra in alto, fissa e uguale in tutte le schermate della home (docs/navigazione.md §1), con la struttura chiesta
// da Alex il 23/11. Da sinistra: tre pulsanti quadrati, cioè Home (che più in profondità diventa Indietro), Impostazioni
// e Info. Poi il pulsante verde «Premio del giorno», che apre la serie di sette giorni. Poi due banner con un tempo in
// alto a destra e sotto una barra col suo numero: la Stagione (divisione, partita, punti in classifica) e il Percorso
// premi (sfide della settimana col loro tempo, punti verso il prossimo premio). Poi diamanti e monete in due capsule
// colorate, senza «+» perché qui non si compra niente. All'estremità lo stemma, il manager, il club e le stelle.
// I bollini «!» dicono dove c'è qualcosa da riscuotere.
import * as CAR from '../carriera.js';
import { img } from '../game.js';
import { K, mon, fmtTempo, club } from './casa.js';
import { icona, stelline } from './icone.js';
import { adatta } from './carte.js';
import { nomiDi } from '../dati/squadre.js';
import { t } from './testi.js';
import { apri, indietro, livello, quandoCambia } from './nav.js';
import { finestra } from './finestra.js';
import { ECONOMIA } from '../config.js';

document.getElementById('vs').insertAdjacentHTML('beforebegin', `<div id="barraF" class="nas">
  <button class="bt" id="bCasa"></button><button class="bt" data-vai="impostazioni" aria-label="${t('barra.impostazioni')}">${icona('impostazioni')}</button><button class="bt" data-vai="info" aria-label="${t('barra.info')}">${icona('info')}</button>
  <button class="premioG" data-az="serie">${icona('premi')}<b>${t('barra.premioGiorno').replace(' ', '<br>')}</b><em class="bollino nas" id="bSerieB">!</em></button>
  <button class="banner bStag" data-vai="carriera" aria-label="${t('barra.stagione')}">${icona('campionato')}<span class="dentro"><span class="su"><b id="bStagN"></b><i id="bStagT"></i></span><span class="giu"><span class="barretta"><i id="bStagP"></i></span><u id="bStagPt"></u></span></span></button>
  <button class="banner bPerc" data-vai="percorso" aria-label="${t('barra.premi')}">${icona('premi')}<span class="dentro"><span class="su"><b id="bPremiL"></b><i><s id="bSettP"></s> <span id="bSettT"></span></i></span><span class="giu"><span class="barretta"><i id="bPremiP"></i></span><u id="bPremiPt"></u></span></span><em class="bollino nas" id="bPremiB">!</em></button>
  <span class="molla"></span>
  <button class="val dia" data-vai="guadagna" aria-label="${t('barra.diamanti')}">${icona('diamante')}<b id="bDia"></b><em class="bollino nas" id="bDiaB">!</em></button>
  <button class="val mon" data-vai="guadagna" aria-label="${t('barra.monete')}">${icona('moneta')}<b id="bMon"></b><em class="bollino nas" id="bMonB">!</em></button>
  <button class="prof" data-vai="profilo" aria-label="${t('barra.profilo')}"><img id="bStemma" alt=""><span><b id="bNome" data-adatta data-sparisce></b><i id="bClub" data-adatta></i><span id="bStelle"></span></span></button>
</div>`);
const el = (id) => document.getElementById(id);
// Il saldo nella barra: col punto delle migliaia fino a 99.999, poi in migliaia («120 K») e in milioni («1,2 M»)
const saldo = (n) => (n < 1e5 ? mon(n) : n < 1e6 ? `${Math.floor(n / 1e3)} K` : `${(Math.floor(n / 1e5) / 10).toLocaleString('it-IT')} M`);
el('barraF').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.id === 'bCasa') return livello() ? indietro() : undefined;
  if (b.dataset.az === 'serie') return apriSerie();
  if (b.dataset.par) apri(b.dataset.vai, b.dataset.par); else apri(b.dataset.vai);
});

/**
 * La finestra del «Premio del giorno»: la serie di sette giorni. Ogni giorno con almeno una partita giocata vale i suoi
 * diamanti, sempre di più; un giorno saltato fa ripartire da uno. Il premio arriva da solo con la prima partita del giorno.
 */
function apriSerie() {
  const oggi = new Date(), D = ECONOMIA.diamanti.serie, S = K.serie || { giorno: '', n: 0 }, preso = S.giorno === CAR.giornoDi(oggi);
  const ieri = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate() - 1), inCorso = preso || S.giorno === CAR.giornoDi(ieri);
  // a che giorno della serie si è: quelli già presi, e quello di oggi se manca ancora la partita
  const fatti = inCorso ? S.n : 0, prossimo = preso ? 0 : (fatti < D.length ? fatti + 1 : 1);
  const giorni = D.map((g, i) => `<span class="giorno${i < fatti && (preso || prossimo !== 1) ? ' fatto' : ''}${i + 1 === prossimo ? ' oggi' : ''}"><i>${t('serie.giorno')}<br>${i + 1}</i>${icona('diamante')}<b>${g}</b></span>`).join('');
  finestra({ titolo: t('serie.titolo'), corpo: `<span class="serie">${giorni}</span><span class="nota">${t(preso ? 'serie.preso' : 'serie.gioca', D[Math.max(0, prossimo - 1)])}</span><span class="nota">${t('serie.regola')}</span>`, si: t('finestra.capito'), soloSi: true });
}

/** Mostra o nasconde la barra. Con la barra le schermate lasciano lo spazio in alto (classe conBarra sul corpo). */
export function mostraBarra(si) {
  el('barraF').classList.toggle('nas', !si); document.body.classList.toggle('conBarra', si);
  if (si) aggiornaBarra();
}
/** Rimette nella barra i numeri del momento: tempo e progresso della settimana, livello dei premi, saldo, club. */
export function aggiornaBarra() {
  if (!K || el('barraF').classList.contains('nas')) return;
  const oggi = new Date(), st = CAR.statoSfide(K, oggi), pe = CAR.statoPercorso(K), me = club(K.club), inHome = !livello();
  // il primo pulsante: la casetta in Home e nelle schermate aperte dalla Home (un passo indietro è la Home), la freccia più giù
  const casetta = livello() < 2, casa = el('bCasa'); casa.innerHTML = icona(casetta ? 'home' : 'indietro'); casa.classList.toggle('acceso', inHome); casa.setAttribute('aria-label', t(casetta ? 'barra.home' : 'barra.indietro'));
  // premio del giorno: il bollino resta finché non si è giocata la partita di oggi
  el('bSerieB').classList.toggle('nas', !!K.serie && K.serie.giorno === CAR.giornoDi(oggi));
  // stagione: la divisione, a che partita si è, la barra delle partite giocate e i punti in classifica
  const p = CAR.prossima(K), riga = CAR.classifica(K, CLUBS).find((r) => r.id === K.club), sT = el('bStagT');
  el('bStagN').textContent = CAR.divisione(K).nome;
  const partita = (corta) => (p ? t(corta ? 'barra.partitaCorta' : 'barra.partita', p.giornata, p.totale) : t('barra.finita')); sT.textContent = partita(false);
  el('bStagP').style.width = `${p ? Math.round((p.giornata - 1) / p.totale * 100) : 100}%`; el('bStagPt').textContent = t('barra.punti', riga ? riga.pt : 0);
  // percorso premi: il livello, le sfide della settimana col tempo che resta, i punti verso il prossimo premio
  const fine = pe.livello >= pe.livelli;
  el('bSettT').textContent = fmtTempo(CAR.fineSettimana(oggi) - oggi); el('bSettP').textContent = `${st.conti.w[0]}/${st.conti.w[1]}`;
  el('bPremiL').textContent = t('barra.livello', pe.inCorso); el('bPremiP').style.width = `${fine ? 100 : Math.round(pe.nelLivello / pe.perLivello * 100)}%`;
  el('bPremiPt').textContent = fine ? t('percorso.completo') : t('percorso.punti', pe.nelLivello, pe.perLivello);
  el('bPremiB').classList.toggle('nas', !pe.daRitirare);
  // diamanti e monete: il bollino quando c'è un premio da riscuotere che ne dà (percorso premi o sfide)
  const pronti = pe.premi.filter((x) => x.raggiunto && !x.preso).concat(...Object.keys(CAR.SFIDE).map((g) => st[g].filter((x) => x.fatto && !x.preso)), Object.values(st.bonus).filter((x) => x.fatto && !x.preso));
  el('bDiaB').classList.toggle('nas', !pronti.some((x) => x.gemme > 0)); el('bMonB').classList.toggle('nas', !pronti.some((x) => x.monete > 0));
  el('bDia').textContent = saldo(K.gemme); el('bMon').textContent = saldo(K.monete);
  el('bStemma').src = img(me.id + '-mini'); el('bStelle').innerHTML = stelline(me.str);
  // un nome di manager troppo lungo per il suo posto: prima resta la prima parola; se non ci sta nemmeno quella, sparisce
  const nm = el('bNome'); nm.textContent = nm.dataset.intero = K.nome; nm.dataset.corto = K.nome.split(' ')[0];
  // il nome del club: intero, poi breve, poi la sigla
  const cl = el('bClub'), nomi = nomiDi(me); cl.textContent = cl.dataset.intero = nomi.nome; cl.dataset.corto = nomi.breve; cl.dataset.sigla = nomi.sigla;
  // la barra si stringe a gradini finché ci sta tutto: i gradini sono nello stile, e dal secondo la partita si scrive corta
  const barra = el('barraF'); barra.classList.remove('s1', 's2', 's3', 's4'); barra.classList.add('misura');
  for (const gradino of ['s1', 's2', 's3', 's4']) { if (barra.scrollWidth <= barra.clientWidth) break; barra.classList.add(gradino); if (gradino === 's2') sT.textContent = partita(true); }
  barra.classList.remove('misura'); adatta(barra);
}
quandoCambia(aggiornaBarra);
addEventListener('resize', aggiornaBarra);
