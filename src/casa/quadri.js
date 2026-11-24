// I pezzi comuni delle schermate a pannelli, sulle bozze di Alex del 24/11: Monete e diamanti (vista-monete.js), Profilo
// (vista-profilo.js), Stagione (vista-stagione.js) e Bacheca (vista-bacheca.js). Tutto il contenuto sta dentro pannelli, mai scritto sulla foto di
// sfondo; i premi si mostrano con le icone del gioco, mai a parole. Misure e colori sono in PANNELLI (src/config.js) e
// arrivano allo stile come variabili --q-*.
import { PANNELLI as P } from '../config.js';
import { figura } from './immagini.js';
import { icona } from './icone.js';

const px = (n) => `${n}px`;
const VARIABILI = {
  sfoca: px(P.sfondo.sfoca), velo: P.sfondo.velo, margine: px(P.margine), alto: px(P.alto), basso: px(P.basso), tra: px(P.tra), dentro: px(P.dentro), minimo: px(P.minimo),
  fondo: P.pannello.fondo, raggio: px(P.pannello.raggio), bordo: P.pannello.bordo,
  'tess-fondo': P.tessera.fondo, 'tess-raggio': px(P.tessera.raggio), 'tess-bordo': P.tessera.bordo,
  titolo: px(P.titolo.misura), 'titolo-colore': P.titolo.colore,
  testo: px(P.testo.misura), 'testo-colore': P.testo.colore, piccolo: px(P.testo.piccolo), secondario: P.testo.secondario,
  oro: P.oro, azzurro: P.azzurro, verde: P.verde, rosso: P.rosso,
  'mon-colonna': px(P.monete.colonna), 'mon-icona': px(P.monete.icona), 'mon-numero': px(P.monete.numero), 'mon-riga': P.monete.perRiga, 'mon-figura': px(P.monete.figura), 'mon-premio': px(P.monete.premio),
  'pro-colonna': px(P.profilo.colonna), 'pro-parte': `${P.profilo.parte * 100}%`, 'pro-avatar': px(P.profilo.avatar), 'pro-nome': px(P.profilo.nome), 'pro-scelta': px(P.profilo.scelta), 'pro-campo': px(P.profilo.campo), 'pro-raggio': px(P.profilo.raggioCampo),
  'sta-fascia': px(P.stagione.fascia), 'sta-colonna': px(P.stagione.colonna), 'sta-parte': `${P.stagione.parte * 100}%`, 'sta-anello': px(P.stagione.anello), 'sta-riga': px(P.stagione.riga), 'sta-forma': P.stagione.forma, 'sta-pallino': px(P.stagione.pallino),
  'bac-colonna': px(P.bacheca.colonna), 'bac-parte': `${P.bacheca.parte * 100}%`, 'bac-trofeo': px(P.bacheca.trofeo), 'bac-numero': px(P.bacheca.numero), 'bac-gol': px(P.bacheca.gol),
};
document.head.insertAdjacentHTML('beforeend', `<style id="misureQuadri">#pan.quadri{${Object.entries(VARIABILI).map(([k, v]) => `--q-${k}:${v}`).join(';')}}</style>`);

// l'illustrazione di ogni tipo di premio e, se manca, l'icona piccola che la sostituisce
const FIGURE = { monete: ['icona-monete', 'moneta'], diamanti: ['icona-diamanti', 'diamante'], comune: ['icona-allenatore-comune', 'allenatore'], raro: ['icona-allenatore-raro', 'allenatore'], leggendario: ['icona-allenatore-leggendario', 'allenatore'], contatto: ['icona-contatto-agente', 'agente'] };
/** L'illustrazione di un tipo di premio (monete, diamanti, comune, raro, leggendario, contatto). */
export const figuraPremio = (tipo, classe, largo) => figura(FIGURE[tipo][0], classe, largo) || icona(FIGURE[tipo][1], classe);
/**
 * Una fila di premi con le icone del gioco. Ogni voce è [tipo, testo]: il tipo sceglie l'icona, il testo è il numero
 * (o «da 300 a 60») scritto accanto; senza testo resta la sola icona, che vuol dire «uno». Le voci vuote si saltano.
 */
export const premi = (voci) => `<span class="kPremi">${voci.filter(Boolean).map(([tipo, testo = '']) => `<span class="kPr">${figuraPremio(tipo, 'kPrI', P.monete.premio)}${testo === '' ? '' : `<b>${testo}</b>`}</span>`).join('')}</span>`;
/** Un pannello: il titolo (con una scritta a destra, se serve) e il suo contenuto. */
export const pannello = (classe, titolo, corpo, lato = '') => `<section class="kPan ${classe}">${titolo ? `<header class="kTesta"><h3 class="kTitolo">${titolo}</h3>${lato}</header>` : ''}${corpo}</section>`;
/** Una barra di avanzamento, da 0 a 1. */
export const barra = (parte, classe = '') => `<span class="kBarra${classe ? ' ' + classe : ''}"><i style="width:${Math.round(Math.max(0, Math.min(1, parte)) * 100)}%"></i></span>`;
