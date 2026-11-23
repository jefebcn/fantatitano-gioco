// La scheda di un giocatore del proprio club: si apre sopra la schermata (tocco lungo su una carta) e si chiude con la X
// o toccando fuori. Mostra la carta grande, le otto statistiche col nome intero, altezza, piede, valore ed energia, e le
// azioni: dargli la fascia di capitano, allenarlo con un allenatore dell'inventario, venderlo o svincolarlo.
import * as CAR from '../carriera.js';
import { img } from '../game.js';
import { coloreStat } from '../dati/scala.js';
import { CARTA_GRANDE } from '../config.js';
import { K, DATI, esc, mon, salvaK, applicaMio, avviso, club } from './casa.js';
import { icona } from './icone.js';
import { cartaCampo, riempiRitratti } from './giocatore.js';
import { adatta } from './carte.js';
import { t } from './testi.js';
import { finestra } from './finestra.js';
import { ECONOMIA } from '../config.js';

document.getElementById('vs').insertAdjacentHTML('beforebegin', '<div id="schedaG" class="nas"><div class="foglio" role="dialog" aria-modal="true"></div></div>');
const radice = document.getElementById('schedaG'), foglio = radice.firstElementChild;
// il giocatore aperto: dove sta ('xi' o 'pan'), quale, e cosa fare quando la scheda si chiude o cambia qualcosa
let G = null;
const mioClub = () => club(K.club);
const giocatore = () => { const c = mioClub(); return c && (G.dove === 'pan' ? c.pan : c.xi)[G.i]; };

function disegna() {
  const x = giocatore(); if (!x) return chiudiScheda();
  const c = mioClub(), sc = DATI.scheda(x, c.id), energia = CAR.energiaDi(K, x[0]), titolare = G.dove === 'xi', capitano = (K.mio || {}).capitano === x[0];
  const cr = CAR.crescitaDi(K, x[0]), quanti = adatti(x).reduce((n, a) => n + a.quanti, 0);
  foglio.innerHTML = `<button class="chiudi" data-az="chiudi" aria-label="${t('finestra.chiudi')}">${icona('chiudi')}</button>`
    + `<div class="sgCarta">${cartaCampo(sc, { club: c.id, energia, capitano, migliorato: sc.val > sc.base, grande: true, ferma: true, stemma: img(c.id + '-mini'), taglio: 'scheda' })}</div>`
    + `<div class="sgDati"><h3 data-adatta>${esc(x[0])}</h3>`
    + `<div class="sgStat">${sc.stat.map(([k, v]) => `<span><i>${t('stat.' + k)}</i><b class="s-${coloreStat(v)}">${v}</b></span>`).join('')}</div>`
    + `<div class="sgInfo"><span><i>${t('scheda.altezza')}</i><b>${sc.altezza} cm</b></span><span><i>${t('scheda.piede')}</i><b>${t(sc.piede === 'S' ? 'scheda.sinistro' : 'scheda.destro')}</b></span>`
    + `<span><i>${t('scheda.valore')}</i><b>${icona('moneta')}${mon(CAR.prezzo(sc.val))}</b></span><span><i>${t('scheda.energia')}</i><b>${energia}</b></span>`
    + `<span><i>${t('scheda.crescita')}</i><b>${t('scheda.crescitaVal', sc.val - sc.base, cr.pot)}</b></span></div></div>`
    + '<div class="sgAzioni">'
    + `<button class="azione${capitano || !titolare ? ' spento' : ''}" data-az="capitano">${icona('capitano')}<b>${t(capitano ? 'scheda.eCapitano' : 'inc.capitano')}</b></button>`
    + `<button class="azione${quanti ? '' : ' spento'}" data-az="allena">${icona('allenamento')}<span><b>${t('scheda.allena')}</b><i>${t('scheda.allenatori', quanti)}</i></span></button>`
    + `<button class="azione" data-az="vendi">${icona('vendi')}<span><b>${t('scheda.vendi')}</b><i>${icona('moneta')} ${mon(CAR.incasso(sc.val))}</i></span></button></div>`;
  foglio.style.setProperty('--gw', '96px'); foglio.style.setProperty('--ga', CARTA_GRANDE.forma);
  adatta(foglio); riempiRitratti(foglio);
}

// Gli allenatori in inventario che si possono usare su questo giocatore: quello dei portieri solo sui portieri
const adatti = (x) => CAR.RARITA.flatMap((rarita) => CAR.CATEGORIE.filter((cat) => (cat === 'portieri') === (x[1] === 'P')).map((categoria) => ({ rarita, categoria, quanti: ((K.allenatori || {})[rarita] || {})[categoria] || 0 }))).filter((a) => a.quanti > 0);
// «Allena»: si sceglie quale allenatore usare; le statistiche della sua categoria salgono e la carta si ridisegna
function allena(x) {
  const lista = adatti(x); if (!lista.length) return avviso(t('scheda.nessunAllenatore'));
  finestra({ titolo: t('scheda.scegliAllenatore'), testo: t('scheda.comeAllena'), scelte: lista.map((a, i) => ({ testo: `${t('all.' + a.categoria)} ${t('rar.' + a.rarita)}`, nota: t('scheda.allenatoreNota', ECONOMIA.allenatori.rarita[a.rarita].punti, a.quanti), valore: i, attiva: i === 0 })),
    fatto: (i) => {
      const a = lista[+i], r = a && G ? CAR.usaAllenatore(K, CLUBS, G.dove, G.i, a.rarita, a.categoria) : { ok: false };
      if (!r.ok) return avviso(t(r.motivo === 'potenziale' ? 'scheda.alPotenziale' : 'scheda.nessunAllenatore'));
      applicaMio(); salvaK(); avviso(t('scheda.allenato', x[0], r.prima, r.dopo) + (r.potenziale ? t('scheda.potenzialeSu') : '')); disegna(); if (G.cambiato) G.cambiato();
    } });
}
// «Vendi»: si incassa metà del valore, oppure si svincola il giocatore e in cambio arriva un allenatore
function cedi(x) {
  const val = DATI.scheda(x, K.club).val, dove = G.dove, i = G.i, dopo = G.cambiato;
  finestra({ titolo: t('scheda.cediTitolo', x[0]), testo: t('scheda.cediTesto'),
    scelte: [{ testo: t('scheda.vendiPer', mon(CAR.incasso(val))), valore: 'vendi', attiva: true }, { testo: t('scheda.svincola'), nota: t('scheda.svincolaNota', t('rar.' + CAR.raritaSvincolo(val))), valore: 'svincola' }],
    fatto: (v) => {
      const r = v === 'vendi' ? CAR.vendi(K, CLUBS, dove, i) : CAR.svincola(K, CLUBS, dove, i);
      if (!r.ok) return avviso(t(r.motivo === 'portiere' ? 'scheda.servePortiere' : 'scheda.rosaCorta', ECONOMIA.valore.minimo));
      chiudiScheda(); applicaMio(); salvaK(); avviso(v === 'vendi' ? t('scheda.venduto', r.nome, mon(r.monete)) : t('scheda.svincolato', r.nome, t('rar.' + r.rarita))); if (dopo) dopo();
    } });
}

radice.addEventListener('click', (e) => {
  if (e.target === radice) return chiudiScheda();
  const b = e.target.closest('button[data-az]'), x = giocatore(); if (!b || !x) return;
  if (b.dataset.az === 'chiudi') return chiudiScheda();
  if (b.dataset.az === 'vendi') return cedi(x);
  if (b.dataset.az === 'capitano') {
    if ((K.mio || {}).capitano === x[0]) return;
    if (!CAR.assegnaIncarico(K, CLUBS, 'capitano', x[0])) return avviso(t('scheda.soloTitolare'));
    salvaK(); avviso(t('inc.dato', t('inc.capitano'), x[0])); disegna(); if (G.cambiato) G.cambiato();
  }
  if (b.dataset.az === 'allena') return allena(x);
});

/** Apre la scheda di un giocatore del proprio club. dove: 'xi' o 'pan'; i: quale; cambiato: da chiamare se cambia qualcosa. */
export function apriScheda(dove, i, cambiato) { G = { dove, i, cambiato }; radice.classList.remove('nas'); disegna(); }
/** Chiude la scheda senza fare niente. */
export function chiudiScheda() { radice.classList.add('nas'); G = null; }
