// Le carte dei giocatori: uno scudo colorato secondo la valutazione (bronzo sotto 65, argento-azzurro da 65 a 74, oro
// da 75), la valutazione in un cerchio in alto a sinistra, il ritratto, il ruolo, l'energia, il nome.
// Ci sono la carta piccola (solo scudo, ritratto e valutazione: nella Home) e la carta da campo (con ruolo, energia e
// nome sotto: nei campi della Sfida). I ritratti sono foto del modello 3D: farle costa, quindi arrivano un po' alla volta.
import { icona } from './icone.js';
import { ritratto } from './casa.js';

/**
 * La carta piccola di un giocatore: scudo, ritratto e valutazione.
 * val: la valutazione; fascia: 'bronzo', 'argento' o 'oro'; foto: l'immagine del ritratto (se manca, il segnaposto).
 */
export const miniCarta = ({ val, fascia, foto }) => `<span class="gCarta f-${fascia}">${icona('carta-' + fascia, 'scudo')}${foto ? `<img class="gFoto" src="${foto}" alt="">` : icona('segnaposto-giocatore', 'gFoto')}<em class="gVal">${val}</em></span>`;

// il colore della barretta dell'energia: verde, arancione sotto 70, rossa sotto 40 (come nelle sostituzioni in partita)
const livelloEnergia = (e) => (e < 40 ? 'b' : e < 70 ? 'm' : 'a');
const pulito = (s) => String(s).replace(/[<>&"]/g, '');
// il nome più corto di un giocatore, per i posti stretti: l'iniziale col punto, se c'è, e l'ultima parola
const nomeCorto = (nome) => { const p = String(nome).split(' '); return p.length < 2 ? '' : (p[0].endsWith('.') && p.length > 2 ? p[0] + ' ' : '') + p[p.length - 1]; };

/**
 * La carta da campo di un giocatore, da mettere su un campo della Sfida o della Squadra.
 * sc: la sua scheda (DATI.scheda); club: l'id del club di cui porta la maglia nel ritratto; energia: da 0 a 100;
 * capitano: ha la fascia; fuori: 0 nel suo ruolo, 1 in un ruolo vicino, 2 fuori ruolo; migliorato: ha fatto sedute di
 * allenamento (stellina); stile: dove sta sul campo (left e top in percentuale).
 */
export function cartaCampo(sc, { club, energia = 100, capitano = false, fuori = 0, migliorato = false, stile = '' } = {}) {
  const corto = nomeCorto(sc.nome);
  return `<span class="gC f-${sc.fascia}"${stile ? ` style="${stile}"` : ''}><span class="gS">${icona('carta-' + sc.fascia, 'scudo')}${icona('segnaposto-giocatore', 'gFoto')}`
    + `<img class="gFoto" alt="" data-ritr="${pulito(club)}|${pulito(sc.nome)}|${sc.numero}|${sc.reparto === 'P' ? 1 : 0}">`
    + `<em class="gVal">${sc.val}</em><u class="gRuolo">${sc.ruolo}</u>${capitano ? '<em class="fasciaC">C</em>' : ''}${fuori === 2 ? `<em class="gAvviso">${icona('fuori-ruolo')}</em>` : ''}${migliorato ? `<em class="gStella">${icona('stella')}</em>` : ''}</span>`
    + `<i class="gEn e-${livelloEnergia(energia)}"><b style="width:${Math.round(energia)}%"></b></i><b class="gNome" data-adatta${corto ? ` data-corto="${pulito(corto)}"` : ''}>${pulito(sc.nome)}</b></span>`;
}

/**
 * Riempie i ritratti delle carte dentro `radice`, pochi alla volta, per non fermare la schermata: ogni foto è una
 * ripresa del modello 3D. Quelle già fatte arrivano subito dalla memoria.
 */
export function riempiRitratti(radice) {
  const coda = [...radice.querySelectorAll('img[data-ritr]:not([src])')];
  const passo = () => {
    const fino = performance.now() + 12;
    while (coda.length && performance.now() < fino) {
      const el = coda.shift(); if (!el.isConnected) continue;
      const [club, nome, num, por] = el.dataset.ritr.split('|'), url = ritratto(club, nome, +num, por === '1');
      if (url) el.src = url; else el.removeAttribute('data-ritr');
    }
    if (coda.length) setTimeout(passo, 0);
  };
  passo();
}
