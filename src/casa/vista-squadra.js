// La Squadra (docs/navigazione.md §3.3): la gestione della formazione, con la struttura chiesta da Alex il 23/11.
// A sinistra quattro pulsanti bassi: il modulo, le riserve, il fisioterapista e gli allenatori. Al centro il campo in
// prospettiva, alto fino al bordo dello schermo, con le undici carte dei titolari secondo il modulo. A destra del campo la
// tessera «Squadra migliore» e il riquadro dei sostituti, in due colonne.
// Una carta trascinata su un'altra le scambia, tra campo, sostituti e riserve. Un tocco apre la scheda del giocatore.
// Capitano, rigori, punizioni e angoli sono le linguette accanto alla carta di chi li ha: si trascinano su un altro
// titolare per passargli l'incarico. Ogni cambio è salvato subito.
import * as CAR from '../carriera.js';
import { FORMS, SQUADRA, CARTA_GRANDE } from '../config.js';
import { img } from '../game.js';
import { adatto, postiModulo } from '../dati/scala.js';
import { K, DATI, sel, save, salvaK, applicaMio, avviso, mon, club, moduloMio } from './casa.js';
import { icona } from './icone.js';
import { adatta } from './carte.js';
import { cartaCampo, riempiRitratti } from './giocatore.js';
import { disponi, erba } from './campo.js';
import { squadraMigliore, incarichi } from './rosa.js';
import { apriScheda } from './scheda-giocatore.js';
import { finestra } from './finestra.js';
import { t } from './testi.js';
import { apri } from './nav.js';

document.getElementById('vs').insertAdjacentHTML('beforebegin', '<div id="squadra" class="scr nas"></div>');
const radice = document.getElementById('squadra');
// tra i sostituti ci stanno PANCHINA giocatori, in COLONNE colonne; gli altri sono le riserve
const PANCHINA = 8, COLONNE = 2;
// riserve: la colonna di destra mostra le riserve invece dei sostituti
let riserve = false;
const modulo = () => moduloMio();
const posto = (g) => { const [dove, i] = g.split(':'); return { dove, i: +i }; };
const dopoCambio = () => { applicaMio(); salvaK(); };
// quanto è larga una carta: una parte fissa della larghezza dello schermo, uguale in campo e tra i sostituti
const larga = () => Math.round(innerWidth * SQUADRA.carta);

// tutta la rosa con scheda ed energia: prima i titolari nell'ordine dei posti, poi gli altri
function rosa(c) { return c.xi.concat(c.pan || []).map((x) => ({ x, sc: DATI.scheda(x, c.id), energia: CAR.energiaDi(K, x[0]) })); }

/** Disegna la Squadra del proprio club. */
export function disegnaSquadra() {
  const c = club(K.club), m = modulo(), fisio = CAR.statoFisio(K, CLUBS), pan = c.pan || [], extra = Math.max(0, pan.length - PANCHINA);
  const allenabili = CAR.quantiAllenatori(K);
  const ottima = !squadraMigliore(rosa(c), postiModulo(m)).cambiata;
  if (!extra) riserve = false;
  radice.style.setProperty('--gw', `${larga()}px`); radice.style.setProperty('--ga', CARTA_GRANDE.forma);
  radice.innerHTML = '<div class="qSx">'
    + `<button class="qB" data-az="modulo">${icona('modulo')}<b>${m}</b></button>`
    + `<button class="qB${riserve ? ' scelta' : ''}" data-az="riserve">${icona('riserve')}<b data-adatta>${t('squadra.riserve', extra)}</b></button>`
    + `<button class="qB" data-az="fisio">${icona('fisioterapista')}<b data-adatta>${t('squadra.fisio')}</b>${fisio.manca ? '<em class="bollino">!</em>' : ''}</button>`
    + `<button class="qB accesa" data-az="allenatore">${icona('allenatore')}<span><b data-adatta>${t('squadra.allenatori')}</b><i data-adatta data-corto="${t('squadra.allenatoriCorto')}">${t('squadra.allenatoriSotto')}</i></span>${allenabili ? `<em class="bollino">${allenabili}</em>` : ''}</button></div>`
    + '<div class="qCampo"></div>'
    + `<button class="qMigliore${ottima ? ' ottima' : ''}" data-az="migliore">${icona('modulo')}<b>${t('squadra.migliora')}</b>${ottima ? `<em class="fatto">${icona('spunta')}</em>` : ''}</button>`
    + `<div class="qPan"><h3>${riserve ? t('squadra.riserve', extra) : t('squadra.sostituti', Math.min(pan.length, PANCHINA), PANCHINA)}</h3><div class="qGriglia"></div></div>`;
  campo(c, m); panchina(c);
  adatta(radice); riempiRitratti(radice);
}

// il campo con gli undici titolari: ognuno al suo posto del modulo, con le linguette degli incarichi e il ruolo
// bordato di rosso se gioca fuori ruolo
function campo(c, m) {
  const el = radice.querySelector('.qCampo'), r = el.getBoundingClientRect(); if (!r.width) return;
  const posti = postiModulo(m), d = disponi(posti, r.width, r.height, { stretto: SQUADRA.stretto, grande: true, fissa: larga() }), schede = c.xi.map((x) => DATI.scheda(x, c.id)), inc = incarichi(K, CLUBS, schede);
  el.innerHTML = erba(SQUADRA.stretto, true) + c.xi.map((x, i) => {
    const sc = schede[i], q = d.dove[i];
    return cartaCampo(sc, { club: c.id, energia: CAR.energiaDi(K, x[0]), capitano: inc.capitano === x[0], incarichi: ['rigori', 'punizioni', 'angoli'].filter((k) => inc[k] === x[0]), fuori: adatto(sc.ruolo, posti[i].ruolo),
      migliorato: !!(K.crescita || {})[x[0]], grande: true, stemma: img(c.id + '-mini'), dati: `data-g="xi:${i}"`, stile: `left:${q.x.toFixed(1)}px;top:${q.y.toFixed(1)}px` });
  }).join('');
}

// i sostituti (o le riserve): carte in due colonne, uguali a quelle in campo, coi posti liberi segnati
function panchina(c) {
  const el = radice.querySelector('.qGriglia'), pan = c.pan || [], da = riserve ? PANCHINA : 0, lista = pan.slice(da, da + PANCHINA);
  el.style.gridTemplateColumns = `repeat(${COLONNE},auto)`;
  el.innerHTML = Array.from({ length: PANCHINA }, (_, k) => {
    const x = lista[k]; if (!x) return `<span class="qVuoto"><i>${t('squadra.libero')}</i></span>`;
    return cartaCampo(DATI.scheda(x, c.id), { club: c.id, energia: CAR.energiaDi(K, x[0]), migliorato: !!(K.crescita || {})[x[0]], grande: true, ferma: true, stemma: img(c.id + '-mini'), dati: `data-g="pan:${da + k}"` });
  }).join('');
}
addEventListener('resize', () => { if (K && !radice.classList.contains('nas')) disegnaSquadra(); });

// due giocatori si scambiano di posto; in porta va solo un portiere
function scambia(a, b) {
  const c = club(K.club), nome = (g) => { const p = posto(g); return (p.dove === 'pan' ? c.pan : c.xi)[p.i][0]; }, na = nome(a), nb = nome(b), r = CAR.spostaGiocatori(K, CLUBS, posto(a), posto(b));
  if (!r.ok) avviso(t(r.motivo === 'portiere' ? 'squadra.portiere' : 'squadra.nonSiPuo')); else { dopoCambio(); avviso(t('squadra.scambiati', na, nb)); }
  disegnaSquadra();
}
// un incarico passa al titolare su cui è stata lasciata la sua linguetta
function passaIncarico(tipo, g) {
  const p = posto(g), c = club(K.club);
  if (p.dove !== 'xi') return avviso(t('inc.soloTitolari'));
  const nome = c.xi[p.i][0]; CAR.assegnaIncarico(K, CLUBS, tipo, nome); salvaK(); avviso(t('inc.dato', t('inc.' + tipo), nome)); disegnaSquadra();
}
function scegliModulo() {
  const m = modulo();
  // i moduli oltre i primi si aprono col Centro allenamento: quelli chiusi si vedono, col lucchetto
  const aperti = CAR.moduliAperti(K, Object.keys(FORMS));
  finestra({ titolo: t('modulo.scegli'), scelte: Object.keys(FORMS).map((n) => ({ testo: n, nota: aperti.includes(n) ? '' : `${icona('lucchetto')} ${t('modulo.chiuso')}`, valore: n, attiva: n === m })),
    fatto: (n) => { if (!aperti.includes(n)) return avviso(t('modulo.serveCentro')); if (FORMS[n]) { sel.form = n; save(); disegnaSquadra(); } } });
}
// Il fisioterapista: tre interventi a monete (piccolo, medio, completo) e quello completo anche a diamanti
function fisioterapista() {
  const st = CAR.statoFisio(K, CLUBS);
  if (!st.manca) return avviso(t('fisio.pieni'));
  const scelte = st.interventi.map((x) => ({ testo: t('fisio.' + x.id), nota: t('fisio.costo', x.energia, mon(x.monete)), valore: x.id, attiva: x.id === 'medio' }));
  scelte.push({ testo: t('fisio.completo'), nota: t('fisio.costoDiamanti', st.gemme), valore: 'diamanti' });
  finestra({ titolo: t('squadra.fisio'), testo: t('fisio.scegli'), scelte, fatto: (v) => {
    const r = v === 'diamanti' ? CAR.fisioterapia(K, CLUBS, 'completo', true) : CAR.fisioterapia(K, CLUBS, v);
    if (r.ok) { salvaK(); avviso(t('fisio.ok')); } else avviso(t('fisio.soldi'));
    disegnaSquadra();
  } });
}
function migliore() {
  const c = club(K.club), tutti = rosa(c), r = squadraMigliore(tutti, postiModulo(modulo()));
  if (!r.cambiata) return avviso(t('squadra.giaMigliore'));
  CAR.schiera(K, CLUBS, r.ordine.map((i) => tutti[i].x), r.fuori.map((i) => tutti[i].x)); dopoCambio(); avviso(t('squadra.schierata')); disegnaSquadra();
}

// Tocco e trascinamento. Si prende una carta oppure la linguetta di un incarico: spostando il dito di SQUADRA.trascina
// punti la cosa presa lo segue. Una carta lasciata sopra un'altra le scambia; una linguetta lasciata sopra un titolare gli
// passa l'incarico. Senza spostamento è un tocco: arriva come «click» e apre la scheda. Dopo un trascinamento il «click»
// che segue subito non conta.
let presa = null, saltaFino = 0;
const saltaIlClick = () => { saltaFino = performance.now() + 400; };
const cartaDi = (e) => { const el = e && e.closest ? e.closest('.gC[data-g]') : null; return el && radice.contains(el) ? el : null; };
const segnoDi = (e) => { const el = e && e.closest ? e.closest('.gSegni [data-inc]') : null; return el && radice.contains(el) ? el : null; };
const lascia = () => { if (!presa) return; if (presa.ombra) presa.ombra.remove(); presa.el.classList.remove('presa'); presa = null; };
radice.addEventListener('pointerdown', (e) => {
  const segno = segnoDi(e.target), el = segno || cartaDi(e.target); if (!el) return;
  lascia(); presa = { el, inc: segno ? segno.dataset.inc : '', g: segno ? '' : el.dataset.g, x: e.clientX, y: e.clientY, ombra: null };
});
addEventListener('pointermove', (e) => {
  if (!presa) return;
  if (!presa.ombra) {
    if (Math.hypot(e.clientX - presa.x, e.clientY - presa.y) < SQUADRA.trascina) return;
    const r = presa.el.getBoundingClientRect(), stile = getComputedStyle(presa.el);
    presa.ombra = presa.el.cloneNode(true); presa.ombra.classList.add('ombra'); presa.dx = presa.x - r.left; presa.dy = presa.y - r.top;
    presa.ombra.style.cssText = `position:fixed;left:0;top:0;width:${r.width}px;margin:0;transform:none;z-index:30;pointer-events:none`;
    // la copia vive fuori dalla schermata: si porta dietro le misure e, se è una linguetta, anche l'aspetto
    presa.ombra.style.setProperty('--gw', stile.getPropertyValue('--gw')); presa.ombra.style.setProperty('--ga', stile.getPropertyValue('--ga'));
    if (presa.inc) { presa.ombra.className = 'qSegnoMobile'; presa.ombra.style.height = `${r.height}px`; presa.ombra.style.background = stile.backgroundImage; presa.ombra.style.fontSize = stile.fontSize; }
    document.body.appendChild(presa.ombra); presa.el.classList.add('presa');
  }
  presa.ombra.style.left = `${e.clientX - presa.dx}px`; presa.ombra.style.top = `${e.clientY - presa.dy}px`;
});
addEventListener('pointerup', (e) => {
  if (!presa) return;
  const trascinata = !!presa.ombra, da = presa.g, inc = presa.inc; lascia();
  if (!trascinata) return;
  saltaIlClick();
  const sopra = cartaDi(document.elementFromPoint(e.clientX, e.clientY)); if (!sopra) return;
  if (inc) passaIncarico(inc, sopra.dataset.g); else if (sopra.dataset.g !== da) scambia(da, sopra.dataset.g);
});
addEventListener('pointercancel', lascia);
// le immagini delle carte non devono partire col trascinamento del browser, che interromperebbe il nostro
radice.addEventListener('dragstart', (e) => e.preventDefault());

radice.addEventListener('click', (e) => {
  if (performance.now() < saltaFino) return;
  const b = e.target.closest('button');
  if (b && b.dataset.az) {
    const az = b.dataset.az;
    if (az === 'modulo') return scegliModulo();
    if (az === 'fisio') return fisioterapista();
    if (az === 'allenatore') return apri('club', 'allenatori');
    if (az === 'migliore') return migliore();
    if (az === 'riserve') { if (!(club(K.club).pan || []).slice(PANCHINA).length) return avviso(t('squadra.nessunaRiserva')); riserve = !riserve; return disegnaSquadra(); }
  }
  // una linguetta toccata senza trascinarla dice come si usa; una carta toccata apre la scheda del giocatore
  const segno = segnoDi(e.target); if (segno) return avviso(t('inc.trascina', t('inc.' + segno.dataset.inc)));
  const el = cartaDi(e.target); if (el) { const p = posto(el.dataset.g); apriScheda(p.dove, p.i, disegnaSquadra); }
});

/** Da chiamare quando si entra nella Squadra: si riparte dai sostituti. */
export function apriSquadra() { riserve = false; disegnaSquadra(); }
