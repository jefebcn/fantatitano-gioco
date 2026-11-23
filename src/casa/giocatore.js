// La carta del giocatore (proposta «A» approvata da Alex il 23/11, docs/carte-giocatori.md). La disposizione è quella
// delle carte di Dream League, mentre colori, caratteri e ritratti sono di Fantatitano. Il colore è la rarità: oro da
// 70, argento da 55 a 69, bronzo sotto. In alto a sinistra la valutazione e sotto il ruolo, solo scritti; il giocatore
// sta davanti, spostato a destra, e la testa esce sopra il bordo. Sotto c'è la fascia scura col cognome, con la
// barretta dell'energia sul bordo basso, e in fondo le tre statistiche del reparto.
// La carta è una sola e cambia con la larghezza: sotto CARTA.stretta.sotto punti (campo e sostituti) non ha le
// statistiche e la fascia del nome arriva in fondo; più stretta ancora perde anche il ruolo. Nei campi stretti della
// Sfida c'è la carta piccola: stessi colori e stesso ritratto, senza ruolo, con energia e nome sotto.
// Tutte le misure stanno in CARTA (src/config.js): qui diventano variabili dello stile.
import { icona } from './icone.js';
import { ritratto } from './casa.js';
import { ritrattoNuovo } from './ritratti.js';
import { RITRATTI, CARTA } from '../config.js';
import { SPORGE } from './campo.js';

const C = CARTA;
// le misure di CARTA coi nomi corti che usa lo stile (--c-nome)
const MISURE = {
  alta: C.alta, raggio: C.raggio, sp: SPORGE,
  bl: C.bordo.lato, ba: C.bordo.alto, br: C.bordo.raggio, bs: C.bordo.spesso, bc: C.bordo.colore,
  rl: C.ritratto.lato, rs: C.ritratto.sinistra, ra: C.ritratto.alto, rp: C.ritratto.sporge, os: C.ritratto.ripiego.sinistra, oa: C.ritratto.ripiego.alto,
  vm: C.valutazione.misura, vx: C.valutazione.x, vy: C.valutazione.y,
  um: C.ruolo.misura, ux: C.ruolo.x, uy: C.ruolo.y, uf: C.ruolo.fuori,
  fd: C.fascia.da, fa: C.fascia.alta, fc: C.fascia.colore, fn: C.fascia.nome, fm: C.fascia.margine,
  el: C.energia.lato, es: C.energia.spessa, ea: C.energia.alta, em: C.energia.media, eb: C.energia.bassa, ev: C.energia.vuota,
  sd: C.statistiche.da, sn: C.statistiche.numero, ss: C.statistiche.sigla, so: C.statistiche.opaco,
  kf: C.stretta.fascia, kn: C.stretta.nome, kl: C.stretta.ritratto.lato, ks: C.stretta.ritratto.sinistra, ka: C.stretta.ritratto.alto,
  pa: C.piccola.alta, pt: `${C.piccola.scritta}px`, pl: C.piccola.ritratto.lato, ps: C.piccola.ritratto.sinistra, pr: C.piccola.ritratto.alto, np: `${C.nome.punti}px`,
  gl: C.segno.largo, gf: C.segno.fuori, zy: C.freccia.y, zl: C.freccia.larga,
};
document.head.insertAdjacentHTML('beforeend', `<style id="misureCarta">:root{${Object.entries(MISURE).map(([k, v]) => `--c-${k}:${v}`).join(';')}}`
  + Object.entries(C.rarita).map(([nome, r]) => `.f-${nome}{--c-su:${r.alto};--c-giu:${r.basso};--c-testo:${r.testo}}`).join('') + '</style>');

// il colore della barretta dell'energia: verde, arancione sotto 70, rossa sotto 40 (come nelle sostituzioni in partita)
const livelloEnergia = (e) => (e < 40 ? 'b' : e < 70 ? 'm' : 'a');
const pulito = (s) => String(s).replace(/[<>&"]/g, '');
// il nome più corto di un giocatore, per i posti stretti: l'iniziale col punto, se c'è, e l'ultima parola
const nomeCorto = (nome) => { const p = String(nome).split(' '); return p.length < 2 ? '' : (p[0].endsWith('.') && p.length > 2 ? p[0] + ' ' : '') + p[p.length - 1]; };
// il cognome scritto sulla carta: il nome senza l'iniziale puntata davanti («Az. Garcia Rufer» diventa «Garcia Rufer»)
const cognome = (nome) => { const p = String(nome).split(' '); while (p.length > 1 && p[0].endsWith('.')) p.shift(); return p.join(' '); };
// gli incarichi che si vedono accanto alla carta, coi loro segni
const SEGNI = { rigori: 'rigore', punizioni: 'punizione', angoli: 'corner' };
/** Le tre statistiche del reparto (CARTA.statistiche.per), ognuna col valore del giocatore. */
function treStatistiche(sc) {
  const valori = new Map(sc.stat || []);
  return (C.statistiche.per[sc.reparto] || []).filter((k) => valori.has(k)).map((k) => [k, valori.get(k)]);
}
// le classi che dipendono dalla larghezza: stretta senza statistiche, e più stretta ancora senza ruolo
const classiLarghezza = (larga) => (larga < C.stretta.sotto ? ' stretta' : '') + (larga < C.stretta.ruoloDa ? ' senzaRuolo' : '');

/**
 * La carta di un giocatore, da mettere su un campo, in una griglia o in un riquadro.
 * sc: la sua scheda (DATI.scheda); club: l'id del club in cui gioca (serve a scegliere il volto);
 * larga: quanti punti è larga la carta (da lì vengono tutte le altre misure e cosa si vede);
 * energia: da 0 a 100, o null se la barretta non serve (mercato, home); capitano: ha la «C»; incarichi: elenco tra
 * 'rigori', 'punizioni' e 'angoli'; fuori: 0 nel suo ruolo, 1 in un ruolo vicino, 2 fuori ruolo (il ruolo diventa
 * rosso; nella piccola, che non ha il ruolo, c'è un triangolino); migliorato: ha fatto sedute di allenamento (freccia verde); stile: dove sta sul campo (left, top…);
 * ferma: sta in una griglia o in un riquadro invece che in un punto del campo; piccola: la carta dei campi stretti
 * della Sfida, con energia e nome sotto; entra: la larghezza la decide il riquadro in cui sta (prontaCarte la misura,
 * tra le due di CARTA.larga.home); dati: attributi in più sull'elemento.
 */
export function cartaGiocatore(sc, { club, larga = C.stretta.sotto, energia = null, capitano = false, incarichi = [], fuori = 0, migliorato = false, stile = '', ferma = false, piccola = false, entra = false, dati = '' } = {}) {
  const segni = (capitano ? '<em class="fasciaC" data-inc="capitano">C</em>' : '') + incarichi.map((k) => `<em class="gSegno" data-inc="${k}">${icona(SEGNI[k])}</em>`).join('');
  const barra = energia === null ? '' : `<i class="gEn e-${livelloEnergia(energia)}"><b style="width:${Math.round(energia)}%"></b></i>`;
  const corto = nomeCorto(sc.nome), scritto = pulito(cognome(sc.nome));
  // nella carta piccola il nome sta sotto, intero, e si adatta come gli altri testi. Dentro la carta c'è il cognome,
  // che prontaCarte fa stare nella fascia
  const nome = piccola ? `<b class="gNome" data-adatta${corto ? ` data-corto="${pulito(corto)}"` : ''}>${pulito(sc.nome)}</b>` : `<b class="gNome" data-nome="${scritto}"><span>${scritto}</span></b>`;
  const statistiche = piccola ? '' : `<span class="gStat">${treStatistiche(sc).map(([k, v]) => `<i><b>${v}</b>${k}</i>`).join('')}</span>`;
  const grande = larga >= RITRATTI.grandeDa;
  return `<span class="gC f-${sc.fascia}${piccola ? ' piccola' : classiLarghezza(larga)}${ferma ? ' ferma' : ''}${barra ? ' conEnergia' : ''}" style="--gw:${larga}px${stile ? ';' + stile : ''}"${entra ? ' data-entra' : ''}${dati ? ' ' + dati : ''}><span class="gS">`
    + `<span class="gRit"><img class="gFoto" alt="" data-ritr="${chiRitratto(club, sc, grande)}">${icona('sagoma', 'gFoto')}</span>`
    + `<em class="gVal">${sc.val}</em>${piccola ? (fuori === 2 ? `<em class="gAvviso">${icona('fuori-ruolo')}</em>` : '') : `<u class="gRuolo${fuori === 2 ? ' fuori' : ''}">${sc.ruolo}</u>`}${migliorato ? '<em class="gFreccia"><i></i></em>' : ''}`
    + (piccola ? '' : nome + statistiche + barra) + (segni ? `<span class="gSegni">${segni}</span>` : '') + '</span>'
    + (piccola ? barra + nome : '') + '</span>';
}

/**
 * Chi è il giocatore di un ritratto, scritto nell'attributo data-ritr dell'immagine: squadra in cui gioca adesso, nome,
 * numero, se è portiere, squadra vera da cui viene ('inv' per gli inventati) e se serve il file grande.
 */
export const chiRitratto = (club, sc, grande = false) => `${pulito(club)}|${pulito(sc.nome)}|${sc.numero}|${sc.reparto === 'P' ? 1 : 0}|${pulito(sc.origine || 'inv')}|${grande ? 1 : 0}`;

// La carta che prende la misura dal suo riquadro della Home: la più larga che ci sta in altezza, testa compresa. Se di
// fianco resta posto per titolo e testo (CARTA.larga.accanto) è alta quanto tutto il riquadro, se no sta sotto il titolo.
function entra(el) {
  const [min, max] = C.larga.home, quanto = (alto) => Math.max(min, Math.min(max, Math.floor(alto / (C.alta + SPORGE))));
  const riquadro = el.closest('.carta'), dentro = el.parentElement; if (!dentro.clientHeight) return;
  let larga = 0;
  if (riquadro) {
    riquadro.classList.add('cartaAlta'); larga = quanto(dentro.clientHeight);
    if (riquadro.clientWidth - larga < C.larga.accanto) { riquadro.classList.remove('cartaAlta'); larga = 0; }
  }
  if (!larga) larga = quanto(dentro.clientHeight);
  el.style.setProperty('--gw', `${larga}px`); if (riquadro) riquadro.style.setProperty('--cw', `${larga}px`);
  el.classList.toggle('stretta', larga < C.stretta.sotto); el.classList.toggle('senzaRuolo', larga < C.stretta.ruoloDa);
}
// Il cognome nella fascia: se è più largo del posto il carattere si rimpicciolisce fino al minimo, poi le lettere si
// stringono, e solo se non basta ancora il cognome viene accorciato coi puntini. Niente esce dalla carta.
function sistemaNome(el) {
  const s = el.firstElementChild, W = parseFloat(getComputedStyle(el).getPropertyValue('--gw')); if (!s || !W || !el.clientWidth) return;
  let testo = el.dataset.nome; s.textContent = testo; s.style.transform = ''; el.style.fontSize = '';
  const posto = el.clientWidth - 2 * C.fascia.margine * W, min = Math.max(C.nome.punti, C.nome.minimo * W);
  let px = parseFloat(getComputedStyle(el).fontSize);
  while (s.offsetWidth > posto && px > min) { px = Math.max(min, px - .5); el.style.fontSize = `${px}px`; }
  if (s.offsetWidth <= posto) return;
  while (s.offsetWidth * C.nome.stretto > posto && testo.length > 2) { testo = testo.slice(0, -1).trimEnd(); s.textContent = testo + '…'; }
  s.style.transform = `scaleX(${Math.min(1, posto / s.offsetWidth).toFixed(3)})`;
}

/**
 * Prepara le carte dentro `radice`, dopo che sono state disegnate: dà la misura a quelle che la prendono dal riquadro,
 * fa stare i cognomi nella fascia e riempie i ritratti (le immagini con data-ritr), pochi alla volta per non fermare
 * la schermata. Ogni ritratto è quello nuovo, intero, con viso e maglia già dentro (src/casa/ritratti.js); se per quel
 * giocatore non c'è, o il file non arriva, resta quello vecchio ripreso dal modello 3D, che sta tutto dentro la carta.
 */
export function prontaCarte(radice) {
  for (const el of radice.querySelectorAll('.gC[data-entra]')) entra(el);
  for (const el of radice.querySelectorAll('.gNome[data-nome]')) sistemaNome(el);
  const coda = [...radice.querySelectorAll('img[data-ritr]:not([src])')];
  const prossimo = () => {
    const el = coda.shift(); if (!el) return;
    if (!el.isConnected) return prossimo();
    const [club, nome, num, por, origine, grande] = el.dataset.ritr.split('|');
    ritrattoNuovo(club, nome, origine, grande === '1').catch(() => '').then((url) => {
      const foto = url || ritratto(club, nome, +num, por === '1');
      if (!url) el.classList.add('vecchio');
      if (foto) el.src = foto; else el.removeAttribute('data-ritr');
      prossimo();
    });
  };
  for (let i = 0; i < RITRATTI.insieme; i++) prossimo();
}
// quando arrivano i caratteri veri le larghezze cambiano: i cognomi si sistemano di nuovo
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { for (const el of document.querySelectorAll('.gNome[data-nome]')) sistemaNome(el); });
