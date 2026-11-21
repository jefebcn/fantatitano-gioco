// Le carte dei giocatori: uno scudo colorato secondo la valutazione (bronzo sotto 65, argento-azzurro da 65 a 74, oro
// da 75), la valutazione in un cerchio in alto a sinistra, il ritratto. Per ora c'è la carta piccola, senza nome né
// ruolo, usata nella Home. La carta intera, con nome, stemma, energia e ruolo, arriva con la Sfida e la Squadra.
import { icona } from './icone.js';

/**
 * La carta piccola di un giocatore: scudo, ritratto e valutazione.
 * val: la valutazione; fascia: 'bronzo', 'argento' o 'oro'; foto: l'immagine del ritratto (se manca, il segnaposto).
 */
export const miniCarta = ({ val, fascia, foto }) => `<span class="gCarta f-${fascia}">${icona('carta-' + fascia, 'scudo')}${foto ? `<img class="gFoto" src="${foto}" alt="">` : icona('segnaposto-giocatore', 'gFoto')}<em class="gVal">${val}</em></span>`;
