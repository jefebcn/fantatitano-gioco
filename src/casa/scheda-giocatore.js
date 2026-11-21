// La scheda di un giocatore del proprio club: si apre sopra la schermata (tocco lungo su una carta) e si chiude con la X
// o toccando fuori. Mostra la carta grande, le otto statistiche col nome intero, altezza, piede, valore ed energia, e le
// azioni: dargli la fascia di capitano, allenarlo, venderlo (per ora porta al Mercato).
import * as CAR from '../carriera.js';
import { img } from '../game.js';
import { coloreStat } from '../dati/scala.js';
import { K, DATI, esc, mon, salvaK, applicaMio, avviso } from './casa.js';
import { icona } from './icone.js';
import { cartaCampo, riempiRitratti } from './giocatore.js';
import { adatta } from './carte.js';
import { t } from './testi.js';
import { apri } from './nav.js';

document.getElementById('vs').insertAdjacentHTML('beforebegin', '<div id="schedaG" class="nas"><div class="foglio" role="dialog" aria-modal="true"></div></div>');
const radice = document.getElementById('schedaG'), foglio = radice.firstElementChild;
// il giocatore aperto: dove sta ('xi' o 'pan'), quale, e cosa fare quando la scheda si chiude o cambia qualcosa
let G = null;
const mioClub = () => CLUBS.find((c) => c.id === K.club);
const giocatore = () => { const c = mioClub(); return c && (G.dove === 'pan' ? c.pan : c.xi)[G.i]; };

function disegna() {
  const x = giocatore(); if (!x) return chiudiScheda();
  const c = mioClub(), sc = DATI.scheda(x, c.id), energia = CAR.energiaDi(K, x[0]), titolare = G.dove === 'xi', capitano = (K.mio || {}).capitano === x[0];
  const fatte = (K.allen || {})[x[0]] || 0, sedute = CAR.seduteMax(K), costo = CAR.costoAllenamento(K, x[0]);
  foglio.innerHTML = `<button class="chiudi" data-az="chiudi" aria-label="${t('finestra.chiudi')}">${icona('chiudi')}</button>`
    + `<div class="sgCarta">${cartaCampo(sc, { club: c.id, energia, capitano, migliorato: fatte > 0, grande: true, ferma: true, stemma: img(c.id + '-mini') })}</div>`
    + `<div class="sgDati"><h3 data-adatta>${esc(x[0])}</h3>`
    + `<div class="sgStat">${sc.stat.map(([k, v]) => `<span><i>${t('stat.' + k)}</i><b class="s-${coloreStat(v)}">${v}</b></span>`).join('')}</div>`
    + `<div class="sgInfo"><span><i>${t('scheda.altezza')}</i><b>${sc.altezza} cm</b></span><span><i>${t('scheda.piede')}</i><b>${t(sc.piede === 'S' ? 'scheda.sinistro' : 'scheda.destro')}</b></span>`
    + `<span><i>${t('scheda.valore')}</i><b>${icona('moneta')}${mon(CAR.prezzo(sc.val))}</b></span><span><i>${t('scheda.energia')}</i><b>${energia}</b></span></div></div>`
    + '<div class="sgAzioni">'
    + `<button class="azione${capitano || !titolare ? ' spento' : ''}" data-az="capitano">${icona('capitano')}<b>${t(capitano ? 'scheda.eCapitano' : 'inc.capitano')}</b></button>`
    + `<button class="azione${fatte >= sedute ? ' spento' : ''}" data-az="allena">${icona('allenamento')}<span><b>${t('scheda.allena')}</b><i>${fatte >= sedute ? t('scheda.sedute', fatte, sedute) : `${icona('moneta')} ${mon(costo)} · ${t('scheda.sedute', fatte, sedute)}`}</i></span></button>`
    + `<button class="azione" data-az="vendi">${icona('vendi')}<b>${t('scheda.vendi')}</b></button></div>`;
  foglio.style.setProperty('--gw', '96px'); foglio.style.setProperty('--ga', '.69');
  adatta(foglio); riempiRitratti(foglio);
}

radice.addEventListener('click', (e) => {
  if (e.target === radice) return chiudiScheda();
  const b = e.target.closest('button[data-az]'), x = giocatore(); if (!b || !x) return;
  if (b.dataset.az === 'chiudi') return chiudiScheda();
  if (b.dataset.az === 'vendi') { chiudiScheda(); return apri('mercato'); }
  if (b.dataset.az === 'capitano') {
    if ((K.mio || {}).capitano === x[0]) return;
    if (!CAR.assegnaIncarico(K, CLUBS, 'capitano', x[0])) return avviso(t('scheda.soloTitolare'));
    salvaK(); avviso(t('inc.dato', t('inc.capitano'), x[0])); disegna(); if (G.cambiato) G.cambiato();
  }
  if (b.dataset.az === 'allena') {
    const r = CAR.allena(K, CLUBS, G.dove, G.i);
    if (!r.ok) return avviso(r.motivo === 'massimo' ? t('scheda.massimo') : t('risc.monete', mon(r.costo)));
    applicaMio(); salvaK(); avviso(t('scheda.allenato', x[0])); disegna(); if (G.cambiato) G.cambiato();
  }
});

/** Apre la scheda di un giocatore del proprio club. dove: 'xi' o 'pan'; i: quale; cambiato: da chiamare se cambia qualcosa. */
export function apriScheda(dove, i, cambiato) { G = { dove, i, cambiato }; radice.classList.remove('nas'); disegna(); }
/** Chiude la scheda senza fare niente. */
export function chiudiScheda() { radice.classList.add('nas'); G = null; }
