// Le illustrazioni del gioco in pagina. Arrivano da assets/arrivo, lo script scripts/importa_immagini.py le prepara alle
// tre grandezze (1x, 2x, 3x) in public/img/illustrazioni e ne scrive l'elenco in illustrazioni.js: qui si chiede solo
// «c'è?» e si ottiene il pezzo di pagina giusto. Se un'illustrazione manca chi chiama resta col suo segnaposto.
import { ILLUSTRAZIONI } from './illustrazioni.js';

const DOVE = 'img/illustrazioni/';
/** Vero se l'illustrazione con questo nome è stata consegnata e importata. */
export const pronta = (nome) => !!ILLUSTRAZIONI[nome];
/** L'illustrazione come sfondo: il valore da dare a `background-image` (il browser prende la grandezza giusta per lo schermo). Vuoto se manca. */
export const fondo = (nome) => (pronta(nome) ? `image-set(${[1, 2, 3].map((k) => `url(${DOVE}${nome}@${k}x.webp) ${k}x`).join(',')})` : '');
/** L'attributo `style` che passa l'illustrazione allo stile come variabile `--sfondo`. Vuoto se manca. */
export const stileFondo = (nome) => (pronta(nome) ? ` style="--sfondo:${fondo(nome)}"` : '');
/**
 * L'illustrazione come immagine. largo: quanti pixel è larga sullo schermo, più o meno: serve al browser per scegliere
 * tra le tre grandezze. Vuoto se manca.
 */
export function figura(nome, classe = '', largo = 0) {
  if (!pronta(nome)) return '';
  const w = ILLUSTRAZIONI[nome][0], serie = [1, 2, 3].map((k) => `${DOVE}${nome}@${k}x.webp ${w * k}w`).join(',');
  return `<img${classe ? ` class="${classe}"` : ''} src="${DOVE}${nome}@2x.webp" srcset="${serie}" sizes="${largo || w}px" alt="" decoding="async">`;
}
