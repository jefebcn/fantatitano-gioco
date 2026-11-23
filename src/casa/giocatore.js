// Le carte dei giocatori (carta nuova del 23/11, docs/carte-giocatori.md). La disposizione è quella delle carte di
// Dream League, mentre cornici, colori, caratteri e ritratti sono di Fantatitano. Il metallo della cornice è la rarità:
// bronzo sotto 55, argento da 55 a 69, oro da 70 in su. In alto a sinistra ci sono la valutazione, grande, e sotto il
// ruolo col colore del reparto; a destra il volto, grande. Sotto, una fascia scura col nome e le tre statistiche che
// contano di più per il ruolo; in fondo la barretta dell'energia. Chi è stato allenato ha una piccola freccia verde.
// Capitano e incarichi sono linguette sul bordo destro, che nella Squadra si trascinano su un altro.
// Nella carta grande tutto è in proporzione alla larghezza, scritte comprese: è la sola eccezione al testo di 12 px.
// Ci sono tre misure. La carta grande ha tutto dentro la cornice: sta dove c'è posto (la Squadra, i sostituti, la scheda).
// La carta piccola dei campi stretti tiene dentro valutazione, ritratto e ruolo, con energia e nome sotto. La carta mini
// ha solo cornice, ritratto e valutazione (Home, Mercato).
import { icona } from './icone.js';
import { ritratto } from './casa.js';
import { ritrattoNuovo } from './ritratti.js';
import { RITRATTI, CARTE } from '../config.js';

/**
 * La carta mini di un giocatore: cornice, ritratto e valutazione.
 * val: la valutazione; fascia: 'bronzo', 'argento' o 'oro'; foto: l'immagine del ritratto (se manca, la sagoma).
 */
export const miniCarta = ({ val, fascia, foto, ritr }) => `<span class="gCarta f-${fascia}">${icona('carta-' + fascia, 'scudo')}${ritr ? `<img class="gFoto" alt="" data-ritr="${ritr}">${icona('sagoma', 'gFoto')}` : foto ? `<img class="gFoto" src="${foto}" alt="">` : icona('sagoma', 'gFoto')}<em class="gVal">${val}</em></span>`;

// il colore della barretta dell'energia: verde, arancione sotto 70, rossa sotto 40 (come nelle sostituzioni in partita)
const livelloEnergia = (e) => (e < 40 ? 'b' : e < 70 ? 'm' : 'a');
const pulito = (s) => String(s).replace(/[<>&"]/g, '');
// il nome più corto di un giocatore, per i posti stretti: l'iniziale col punto, se c'è, e l'ultima parola
const nomeCorto = (nome) => { const p = String(nome).split(' '); return p.length < 2 ? '' : (p[0].endsWith('.') && p.length > 2 ? p[0] + ' ' : '') + p[p.length - 1]; };
// gli incarichi che si vedono accanto alla carta, coi loro segni
const SEGNI = { rigori: 'rigore', punizioni: 'punizione', angoli: 'corner' };
/** Le tre statistiche che contano di più per il ruolo (i pesi più alti di CARTE.ruoli), ognuna col valore del giocatore. */
function treStatistiche(sc) {
  const pesi = (CARTE.ruoli[sc.ruolo] || {}).pesi; if (!pesi || !sc.stat) return [];
  const valori = new Map(sc.stat);
  return Object.keys(pesi).sort((a, b) => pesi[b] - pesi[a]).slice(0, 3).map((k) => [k, valori.get(k)]);
}

/**
 * La carta di un giocatore, piccola o grande, da mettere su un campo o in una griglia.
 * sc: la sua scheda (DATI.scheda); club: l'id del club di cui porta la maglia nel ritratto; energia: da 0 a 100;
 * capitano: ha la fascia; incarichi: elenco tra 'rigori', 'punizioni' e 'angoli'; fuori: 0 nel suo ruolo, 1 in un ruolo
 * vicino, 2 fuori ruolo (nella grande il ruolo prende un bordo rosso, nella piccola c'è un triangolino); migliorato: ha fatto sedute di allenamento (freccia verde); stile: dove sta (left, top, width);
 * grande: la carta con tutto dentro la cornice, comprese le tre statistiche; stemma: l'immagine dello stemma del club (solo nella grande, sotto il ruolo);
 * ferma: sta in una griglia invece che in un punto del campo; dati: attributi in più sull'elemento;
 * taglio: quale ritaglio del ritratto (RITRATTI.taglio), se non va bene quello della sua misura.
 */
export function cartaCampo(sc, { club, energia = 100, capitano = false, incarichi = [], fuori = 0, migliorato = false, stile = '', grande = false, stemma = '', ferma = false, dati = '', taglio = grande ? 'carta' : 'piccolo' } = {}) {
  const corto = nomeCorto(sc.nome), segni = (capitano ? '<em class="fasciaC" data-inc="capitano">C</em>' : '') + incarichi.map((k) => `<em class="gSegno" data-inc="${k}">${icona(SEGNI[k])}</em>`).join('');
  const ruolo = `<u class="gRuolo r-${sc.reparto}${grande && fuori === 2 ? ' fuori' : ''}">${sc.ruolo}</u>`, barra = `<i class="gEn e-${livelloEnergia(energia)}"><b style="width:${Math.round(energia)}%"></b></i>`;
  const nome = `<b class="gNome" data-adatta${grande ? ' data-min="5"' : ''}${corto ? ` data-corto="${pulito(corto)}"` : ''}>${pulito(sc.nome)}</b>`;
  // nella grande: stemma sotto il ruolo, poi fuori dalla cornice del volto il nome, le tre statistiche e l'energia;
  // nella piccola il ruolo sta in basso dentro la cornice, con energia e nome sotto
  const statistiche = grande ? `<span class="gStat">${treStatistiche(sc).map(([k, v]) => `<i><b>${v}</b>${k}</i>`).join('')}</span>` : '';
  return `<span class="gC f-${sc.fascia}${grande ? ' grande' : ''}${ferma ? ' ferma' : ''}"${stile ? ` style="${stile}"` : ''}${dati ? ' ' + dati : ''}><span class="gS">${icona('carta-' + sc.fascia, 'scudo')}`
    + `<img class="gFoto" alt="" data-ritr="${chiRitratto(club, sc, taglio)}">${icona('sagoma', 'gFoto')}`
    + `<em class="gVal">${sc.val}</em>${ruolo}${grande && stemma ? `<img class="gStemma" src="${stemma}" alt="">` : ''}${segni ? `<span class="gSegni">${segni}</span>` : ''}${fuori === 2 && !grande ? `<em class="gAvviso">${icona('fuori-ruolo')}</em>` : ''}${migliorato ? '<em class="gFreccia"><i></i></em>' : ''}</span>`
    + (grande ? nome + statistiche + barra : barra + nome) + '</span>';
}

/**
 * Chi è il giocatore di un ritratto, scritto nell'attributo data-ritr dell'immagine: squadra in cui gioca adesso, nome,
 * numero, se è portiere, squadra vera da cui viene ('inv' per gli inventati) e quale ritaglio serve (RITRATTI.taglio).
 */
export const chiRitratto = (club, sc, taglio = 'piccolo') => `${pulito(club)}|${pulito(sc.nome)}|${sc.numero}|${sc.reparto === 'P' ? 1 : 0}|${pulito(sc.origine || 'inv')}|${taglio}`;

/**
 * Riempie i ritratti dentro `radice` (le immagini con data-ritr), pochi alla volta, per non fermare la schermata. Ogni
 * ritratto è quello nuovo, intero, con viso e maglia già dentro (src/casa/ritratti.js); se per quel giocatore non c'è,
 * o il file non arriva, resta quello vecchio ripreso dal modello 3D. Quelli già fatti arrivano subito dalla memoria.
 */
export function riempiRitratti(radice) {
  const coda = [...radice.querySelectorAll('img[data-ritr]:not([src])')];
  const prossimo = () => {
    const el = coda.shift(); if (!el) return;
    if (!el.isConnected) return prossimo();
    const [club, nome, num, por, origine, taglio] = el.dataset.ritr.split('|');
    ritrattoNuovo(club, nome, origine, taglio).catch(() => '').then((url) => {
      const foto = url || ritratto(club, nome, +num, por === '1');
      if (foto) el.src = foto; else el.removeAttribute('data-ritr');
      prossimo();
    });
  };
  for (let i = 0; i < RITRATTI.insieme; i++) prossimo();
}
