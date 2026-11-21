// Le icone delle schermate: il foglio public/img/icone.svg (scritto da scripts/icone.mjs) entra nella pagina una volta
// sola, nascosto, e ogni icona lo richiama col suo nome. Così moneta, diamante e tutte le altre sono identiche ovunque e
// prendono il colore del testo che hanno intorno.
import FOGLIO from '../../public/img/icone.svg';

document.body.insertAdjacentHTML('afterbegin', FOGLIO.replace('<svg ', '<svg id="foglioIcone" aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden" '));

/** L'icona `nome` come testo HTML. `classe` aggiunge classi di stile (misura, colore). */
export const icona = (nome, classe = '') => `<svg class="ico${classe ? ' ' + classe : ''}" aria-hidden="true"><use href="#i-${nome}"/></svg>`;
/** Le stelle di un club o di una struttura: `n` piene su `su`. */
export const stelline = (n, su = 5) => `<span class="stelline">${icona('stella').repeat(n)}${icona('stella-vuota').repeat(Math.max(0, su - n))}</span>`;
