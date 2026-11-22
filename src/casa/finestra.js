// Le finestre: conferme e avvisi che si aprono sopra la schermata e si chiudono con la X, con «Annulla» o toccando
// fuori. Non sono un livello della navigazione: Indietro non c'entra (docs/navigazione.md §1).
import { icona } from './icone.js';
import { t } from './testi.js';

document.getElementById('vs').insertAdjacentHTML('beforebegin', `<div id="finestra" class="nas"><div class="foglio" role="dialog" aria-modal="true">
  <button class="chiudi" data-az="no" aria-label="${t('finestra.chiudi')}">${icona('chiudi')}</button><h3 id="finT"></h3><p id="finP"></p><div class="scelte nas" id="finS"></div>
  <div class="azioni"><button class="bottone secondo" data-az="no" id="finNo"></button><button class="bottone" data-az="si" id="finSi"></button></div></div></div>`);
const radice = document.getElementById('finestra'), el = (id) => document.getElementById(id);
let quando = null;
const chiudi = (si) => { radice.classList.add('nas'); const f = quando; quando = null; if (si && f) f(); };
radice.addEventListener('click', (e) => {
  if (e.target === radice) return chiudi(false);
  const b = e.target.closest('button'); if (!b) return;
  // una delle scelte: la finestra si chiude e dice quale
  if (b.dataset.scelta !== undefined) { const f = quando; quando = null; radice.classList.add('nas'); if (f) f(b.dataset.scelta); return; }
  chiudi(b.dataset.az === 'si');
});

/**
 * Apre una finestra di conferma. titolo e testo: cosa si chiede; si: la scritta del pulsante che conferma;
 * no: quella del pulsante che annulla (se manca: «Annulla»); fatto: cosa fare quando si conferma;
 * soloSi: è un avviso, c'è un pulsante solo.
 * scelte: invece di confermare si sceglie tra più pulsanti, ognuno con testo, nota (facoltativa), valore e attiva (quella
 * in uso); `fatto` riceve il valore scelto.
 * corpo: al posto del testo, pezzi già composti dalla schermata che apre la finestra (mai testo scritto dall'utente).
 */
export function finestra({ titolo, testo = '', corpo = '', si = '', no, fatto, soloSi = false, scelte = null }) {
  el('finT').textContent = titolo; if (corpo) el('finP').innerHTML = corpo; else el('finP').textContent = testo; el('finP').classList.toggle('nas', !testo && !corpo); el('finSi').textContent = si; el('finNo').textContent = no || t('finestra.annulla');
  el('finS').innerHTML = scelte ? scelte.map((s) => `<button class="bottone${s.attiva ? '' : ' secondo'}" data-scelta="${String(s.valore).replace(/[<>&"]/g, '')}"><b>${s.testo}</b>${s.nota ? `<i>${s.nota}</i>` : ''}</button>`).join('') : '';
  el('finS').classList.toggle('note', !!scelte && scelte.some((x) => x.nota)); el('finS').classList.toggle('nas', !scelte); el('finSi').classList.toggle('nas', !!scelte); el('finNo').classList.toggle('nas', soloSi || !!scelte);
  quando = fatto; radice.classList.remove('nas');
}
/** Chiude la finestra senza fare niente (quando si cambia schermata per altre vie). */
export const chiudiFinestra = () => chiudi(false);
