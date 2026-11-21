// Le carte di navigazione (docs/navigazione.md §1): una fascia in alto col titolo e «>>», il riassunto al centro, una
// fascia sottile in basso con una frase o un tempo. Tutta la carta si tocca. I colori della fascia: oro la Carriera,
// rosso scuro lo Scenario, azzurro o blu le altre.
import { ILLUSTRAZIONI } from './illustrazioni.js';
import { icona } from './icone.js';
import { t } from './testi.js';

/**
 * Una carta di navigazione come testo HTML.
 * rotta: la schermata che apre; titolo; nota: una scritta piccola nella fascia, a destra (la competizione, la stagione);
 * colore: 'oro', 'rossa', 'azzurra' o 'blu'; corpo: l'HTML del riassunto;
 * piede: la frase in basso (facoltativa); bollino: c'è qualcosa da ritirare; chiusa: non si apre e in basso dice «In arrivo»;
 * sfondo: il nome dell'illustrazione di fondo (si usa se è stata consegnata, se no resta il fondo pulito).
 */
export function carta({ rotta, titolo, nota = '', colore = 'azzurra', corpo, piede = '', bollino = false, chiusa = false, sfondo = '', classe = '' }) {
  const img = sfondo && ILLUSTRAZIONI[sfondo] ? ` style="--sfondo:image-set(url(img/illustrazioni/${sfondo}@1x.webp) 1x,url(img/illustrazioni/${sfondo}@2x.webp) 2x,url(img/illustrazioni/${sfondo}@3x.webp) 3x)"` : '';
  return `<button class="carta tono-${colore}${chiusa ? ' chiusa' : ''}${img ? ' illustrata' : ''}${bollino ? ' avvisa' : ''}${classe ? ' ' + classe : ''}" data-vai="${rotta}"${chiusa ? ' data-chiusa="1"' : ''}${img}>`
    + `<span class="fascia"><b>${titolo}</b>${nota ? `<i class="nota">${nota}</i>` : ''}${chiusa ? icona('lucchetto') : icona('avanti')}</span><span class="corpo">${corpo}</span>`
    + (chiusa ? `<span class="piede">${t('inArrivo')}</span>` : piede ? `<span class="piede">${piede}</span>` : '') + (bollino ? '<em class="bollino">!</em>' : '') + '</button>';
}

/**
 * Fa stare su una riga i testi segnati con data-adatta dentro `radice`, senza mai tagliarli. Se un testo è più largo del
 * suo posto: 1) il carattere si rimpicciolisce a passi fino a `data-min` (12 se non è scritto); 2) si prova il testo più
 * breve di data-corto, poi quello di data-sigla, ognuno prima a grandezza piena e poi rimpicciolito; 3) se c'è
 * data-due-righe il testo va su due righe; 4) se c'è data-sparisce il testo non si mostra.
 */
export function adatta(radice) {
  for (const el of radice.querySelectorAll('[data-adatta]')) {
    if (el.dataset.intero === undefined) el.dataset.intero = el.textContent;
    el.hidden = false; el.classList.remove('dueRighe');
    const min = +el.dataset.min || 12, troppo = () => el.scrollWidth > el.clientWidth + .5;
    const prova = (testo) => {
      el.textContent = testo; el.style.fontSize = ''; let px = parseFloat(getComputedStyle(el).fontSize);
      while (troppo() && px > min) { px = Math.max(min, px - 1); el.style.fontSize = `${px}px`; }
      return !troppo();
    };
    if ([el.dataset.intero, el.dataset.corto, el.dataset.sigla].filter((x, i, l) => x && l.indexOf(x) === i).some(prova)) continue;
    if (el.dataset.dueRighe !== undefined) { prova(el.dataset.corto || el.dataset.intero); el.classList.add('dueRighe'); continue; }
    if (el.dataset.sparisce !== undefined) el.hidden = true;
  }
}
/** Gli attributi che fanno adattare il nome di un club: intero, poi breve, poi sigla (`n` viene da nomiDi). */
export const attrNome = (n, min = 12) => `data-adatta data-min="${min}" data-corto="${n.breve.replace(/[<>&"]/g, '')}" data-sigla="${n.sigla.replace(/[<>&"]/g, '')}"`;
