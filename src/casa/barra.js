// La barra in alto, fissa e uguale in tutte le schermate della home (docs/navigazione.md §1):
// a sinistra Home, che fuori dalla home diventa Indietro, poi Impostazioni e Info. Al centro le sfide della settimana e
// il percorso premi, con tempo e progresso. A destra diamanti e monete col «+». All'estremità lo stemma, il manager, il
// club e le stelle. I bollini «!» dicono dove c'è qualcosa da ritirare.
import * as CAR from '../carriera.js';
import { img, club } from '../game.js';
import { K, mon, fmtTempo } from './casa.js';
import { icona, stelline } from './icone.js';
import { adatta } from './carte.js';
import { t } from './testi.js';
import { apri, indietro, livello, quandoCambia } from './nav.js';

document.getElementById('vs').insertAdjacentHTML('beforebegin', `<div id="barraF" class="nas">
  <button class="bt" id="bCasa"></button><button class="bt" data-vai="impostazioni" aria-label="${t('barra.impostazioni')}">${icona('impostazioni')}</button><button class="bt" data-vai="info" aria-label="${t('barra.info')}">${icona('info')}</button>
  <span class="molla"></span>
  <button class="pil" data-vai="sfide" data-par="w" aria-label="${t('barra.settimana')}">${icona('calendario')}<b id="bSettT"></b><i id="bSettP"></i><em class="bollino nas" id="bSettB">!</em></button>
  <button class="pil" data-vai="percorso" aria-label="${t('barra.premi')}">${icona('premi')}<b id="bPremiL"></b><span class="barretta"><i id="bPremiP"></i></span><em class="bollino nas" id="bPremiB">!</em></button>
  <span class="molla"></span>
  <button class="val" data-vai="guadagna" aria-label="${t('barra.diamanti')}">${icona('diamante')}<b id="bDia"></b><u>${icona('piu')}</u></button>
  <button class="val" data-vai="guadagna" aria-label="${t('barra.monete')}">${icona('moneta')}<b id="bMon"></b><u>${icona('piu')}</u></button>
  <button class="prof" data-vai="profilo" aria-label="${t('barra.profilo')}"><img id="bStemma" alt=""><span><b id="bNome" data-adatta data-sparisce></b><i id="bClub" data-adatta></i><span id="bStelle"></span></span></button>
</div>`);
const el = (id) => document.getElementById(id);
// Il saldo nella barra: intero fino a 99.999, poi in migliaia («123 k») e in milioni («1,2 M»), perché stia sempre nel suo posto
const saldo = (n) => (n < 1e5 ? mon(n) : n < 1e6 ? `${Math.floor(n / 1e3)} k` : `${(Math.floor(n / 1e5) / 10).toLocaleString('it-IT')} M`);
el('barraF').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.id === 'bCasa') return livello() ? indietro() : undefined;
  if (b.dataset.par) apri(b.dataset.vai, b.dataset.par); else apri(b.dataset.vai);
});

/** Mostra o nasconde la barra. Con la barra le schermate lasciano lo spazio in alto (classe conBarra sul corpo). */
export function mostraBarra(si) {
  el('barraF').classList.toggle('nas', !si); document.body.classList.toggle('conBarra', si);
  if (si) aggiornaBarra();
}
/** Rimette nella barra i numeri del momento: tempo e progresso della settimana, livello dei premi, saldo, club. */
export function aggiornaBarra() {
  if (!K || el('barraF').classList.contains('nas')) return;
  const oggi = new Date(), st = CAR.statoSfide(K, oggi), pe = CAR.statoPercorso(K), me = club(K.club), inHome = !livello();
  const casa = el('bCasa'); casa.innerHTML = icona(inHome ? 'home' : 'indietro'); casa.classList.toggle('acceso', inHome); casa.setAttribute('aria-label', t(inHome ? 'barra.home' : 'barra.indietro'));
  el('bSettT').textContent = fmtTempo(CAR.fineSettimana(oggi) - oggi); el('bSettP').textContent = `${st.conti.w[0]}/${st.conti.w[1]}`;
  el('bSettB').classList.toggle('nas', !st.w.some((x) => x.fatto && !x.preso) && !(st.bonus.w && st.bonus.w.fatto && !st.bonus.w.preso));
  el('bPremiL').textContent = t('barra.livello', pe.livello); el('bPremiP').style.width = `${pe.livello >= pe.livelli ? 100 : Math.round(pe.nelLivello / pe.perLivello * 100)}%`;
  el('bPremiB').classList.toggle('nas', !pe.daRitirare);
  el('bDia').textContent = saldo(K.gemme); el('bMon').textContent = saldo(K.monete);
  el('bStemma').src = img(me.id + '-mini'); el('bStelle').innerHTML = stelline(me.str);
  // un nome di manager troppo lungo per il suo posto lascia il posto alla prima parola
  const nm = el('bNome'); nm.textContent = K.nome; delete nm.dataset.intero; nm.dataset.corto = K.nome.split(' ')[0];
  // un nome di club troppo lungo per il suo posto lascia il posto alla sigla
  const cl = el('bClub'); cl.textContent = me.name; delete cl.dataset.intero; cl.dataset.corto = me.short; adatta(el('barraF'));
}
quandoCambia(aggiornaBarra);
addEventListener('resize', aggiornaBarra);
