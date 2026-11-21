// Le carte di navigazione (docs/navigazione.md §1): una fascia in alto col titolo e «>>», il riassunto al centro, una
// fascia sottile in basso con una frase o un tempo. Tutta la carta si tocca. I colori della fascia: oro la Carriera,
// rosso scuro lo Scenario, azzurro o blu le altre.
import { ILLUSTRAZIONI } from './illustrazioni.js';
import { icona } from './icone.js';
import { t } from './testi.js';

/**
 * Una carta di navigazione come testo HTML.
 * rotta: la schermata che apre; titolo; colore: 'oro', 'rossa', 'azzurra' o 'blu'; corpo: l'HTML del riassunto;
 * piede: la frase in basso (facoltativa); bollino: c'è qualcosa da ritirare; chiusa: non si apre e in basso dice «In arrivo»;
 * sfondo: il nome dell'illustrazione di fondo (si usa se è stata consegnata, se no resta il fondo pulito).
 */
export function carta({ rotta, titolo, colore = 'azzurra', corpo, piede = '', bollino = false, chiusa = false, sfondo = '', classe = '' }) {
  const img = sfondo && ILLUSTRAZIONI[sfondo] ? ` style="--sfondo:image-set(url(img/illustrazioni/${sfondo}@1x.webp) 1x,url(img/illustrazioni/${sfondo}@2x.webp) 2x,url(img/illustrazioni/${sfondo}@3x.webp) 3x)"` : '';
  return `<button class="carta tono-${colore}${chiusa ? ' chiusa' : ''}${img ? ' illustrata' : ''}${bollino ? ' avvisa' : ''}${classe ? ' ' + classe : ''}" data-vai="${rotta}"${chiusa ? ' data-chiusa="1"' : ''}${img}>`
    + `<span class="fascia"><b>${titolo}</b>${chiusa ? icona('lucchetto') : icona('avanti')}</span><span class="corpo">${corpo}</span>`
    + (chiusa ? `<span class="piede">${t('inArrivo')}</span>` : piede ? `<span class="piede">${piede}</span>` : '') + (bollino ? '<em class="bollino">!</em>' : '') + '</button>';
}

/**
 * Fa stare su una riga i testi segnati con data-adatta dentro `radice`: se un testo è più largo del suo posto il
 * carattere si rimpicciolisce a passi fino a `data-min` (12 se non è scritto); se ancora non ci sta e c'è data-corto,
 * si usa quel testo più breve; se nemmeno quello ci sta e c'è data-sparisce, il testo non si mostra. Così niente viene
 * tagliato coi puntini e niente va a capo male.
 */
export function adatta(radice) {
  for (const el of radice.querySelectorAll('[data-adatta]')) {
    el.style.fontSize = ''; el.hidden = false; if (el.dataset.intero) el.textContent = el.dataset.intero;
    const min = +el.dataset.min || 12; let px = parseFloat(getComputedStyle(el).fontSize);
    while (el.scrollWidth > el.clientWidth + .5 && px > min) { px = Math.max(min, px - 1); el.style.fontSize = `${px}px`; }
    if (el.scrollWidth > el.clientWidth + .5 && el.dataset.corto) { el.dataset.intero = el.textContent; el.textContent = el.dataset.corto; }
    // ultimo passo, solo per i testi che si possono togliere (data-sparisce): meglio niente che un testo tagliato
    if (el.scrollWidth > el.clientWidth + .5 && el.dataset.sparisce !== undefined) el.hidden = true;
  }
}
