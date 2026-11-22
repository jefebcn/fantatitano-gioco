// Le carte dei giocatori, sul modello di Alex (docs/riferimenti/modello-carte.png): una cornice a scudo colorata secondo
// la valutazione (bronzo sotto 65, argento-azzurro da 65 a 74, oro da 75), la valutazione in un cerchio scuro in alto a
// sinistra, il ruolo, il ritratto, il nome, lo stemma del club e la barretta dell'energia.
// Ci sono tre misure. La carta grande ha tutto dentro la cornice, col nome su una fascia scura: sta dove c'è posto (la
// Squadra, la panchina). La carta piccola dei campi stretti tiene dentro valutazione, ritratto e ruolo, con energia e nome
// sotto. La carta mini ha solo cornice, ritratto e valutazione (nella Home).
// I ritratti sono foto del modello 3D: farle costa, quindi arrivano un po' alla volta.
import { icona } from './icone.js';
import { ritratto } from './casa.js';
import { ritrattoNuovo } from './ritratti.js';
import { RITRATTI } from '../config.js';

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

/**
 * La carta di un giocatore, piccola o grande, da mettere su un campo o in una griglia.
 * sc: la sua scheda (DATI.scheda); club: l'id del club di cui porta la maglia nel ritratto; energia: da 0 a 100;
 * capitano: ha la fascia; incarichi: elenco tra 'rigori', 'punizioni' e 'angoli'; fuori: 0 nel suo ruolo, 1 in un ruolo
 * vicino, 2 fuori ruolo; migliorato: ha fatto sedute di allenamento (stellina); stile: dove sta (left, top, width);
 * grande: la carta con tutto dentro la cornice; stemma: l'immagine dello stemma del club (solo nella grande);
 * ferma: sta in una griglia invece che in un punto del campo; dati: attributi in più sull'elemento.
 */
export function cartaCampo(sc, { club, energia = 100, capitano = false, incarichi = [], fuori = 0, migliorato = false, stile = '', grande = false, stemma = '', ferma = false, dati = '' } = {}) {
  const corto = nomeCorto(sc.nome), segni = (capitano ? '<em class="fasciaC">C</em>' : '') + incarichi.map((k) => `<em class="gSegno">${icona(SEGNI[k])}</em>`).join('');
  return `<span class="gC f-${sc.fascia}${grande ? ' grande' : ''}${ferma ? ' ferma' : ''}"${stile ? ` style="${stile}"` : ''}${dati ? ' ' + dati : ''}><span class="gS">${icona('carta-' + sc.fascia, 'scudo')}`
    + `<img class="gFoto" alt="" data-ritr="${chiRitratto(club, sc, grande)}">${icona('sagoma', 'gFoto')}`
    + `<em class="gVal">${sc.val}</em><u class="gRuolo">${sc.ruolo}</u>${segni ? `<span class="gSegni">${segni}</span>` : ''}${fuori === 2 ? `<em class="gAvviso">${icona('fuori-ruolo')}</em>` : ''}${migliorato ? `<em class="gStella">${icona('stella')}</em>` : ''}</span>`
    + `${grande && stemma ? `<img class="gStemma" src="${stemma}" alt="">` : ''}<i class="gEn e-${livelloEnergia(energia)}"><b style="width:${Math.round(energia)}%"></b></i><b class="gNome" data-adatta${corto ? ` data-corto="${pulito(corto)}"` : ''}>${pulito(sc.nome)}</b></span>`;
}

/**
 * Chi è il giocatore di un ritratto, scritto nell'attributo data-ritr dell'immagine: squadra in cui gioca adesso, nome,
 * numero, se è portiere, squadra vera da cui viene ('inv' per gli inventati) e se serve la misura grande.
 */
export const chiRitratto = (club, sc, grande = false) => `${pulito(club)}|${pulito(sc.nome)}|${sc.numero}|${sc.reparto === 'P' ? 1 : 0}|${pulito(sc.origine || 'inv')}|${grande ? 1 : 0}`;

/**
 * Riempie i ritratti dentro `radice` (le immagini con data-ritr), pochi alla volta, per non fermare la schermata. Ogni
 * ritratto è quello nuovo, composto da testa e maglia (src/casa/ritratti.js); se per quel giocatore non c'è ancora, o
 * i file non arrivano, resta quello vecchio ripreso dal modello 3D. Quelli già fatti arrivano subito dalla memoria.
 */
export function riempiRitratti(radice) {
  const coda = [...radice.querySelectorAll('img[data-ritr]:not([src])')];
  const prossimo = () => {
    const el = coda.shift(); if (!el) return;
    if (!el.isConnected) return prossimo();
    const [club, nome, num, por, origine, grande] = el.dataset.ritr.split('|');
    ritrattoNuovo(club, nome, origine, por === '1', grande === '1').catch(() => '').then((url) => {
      const foto = url || ritratto(club, nome, +num, por === '1');
      if (foto) el.src = foto; else el.removeAttribute('data-ritr');
      prossimo();
    });
  };
  for (let i = 0; i < RITRATTI.insieme; i++) prossimo();
}
