// La Squadra (docs/navigazione.md §3.3): la gestione della formazione. Al centro il campo in prospettiva con le undici
// carte dei titolari secondo il modulo; a sinistra i pulsanti Modulo, Riserve, Fisioterapista e Allenatore e i quattro
// incarichi, cioè capitano, rigori, punizioni e angoli. A destra la panchina in due colonne, sul campo «Squadra migliore».
// Due giocatori si scambiano toccandoli uno dopo l'altro o trascinando una carta sull'altra; un tocco lungo apre la
// scheda del giocatore. Ogni cambio è salvato subito.
import * as CAR from '../carriera.js';
import { FORMS } from '../config.js';
import { img } from '../game.js';
import { adatto, postiModulo } from '../dati/scala.js';
import { K, DATI, sel, save, salvaK, applicaMio, avviso, mon, club, moduloMio } from './casa.js';
import { icona } from './icone.js';
import { adatta } from './carte.js';
import { cartaCampo, riempiRitratti } from './giocatore.js';
import { disponi, misuraGriglia, erba } from './campo.js';
import { squadraMigliore, incarichi } from './rosa.js';
import { apriScheda } from './scheda-giocatore.js';
import { finestra } from './finestra.js';
import { t } from './testi.js';
import { apri } from './nav.js';

document.getElementById('vs').insertAdjacentHTML('beforebegin', '<div id="squadra" class="scr nas"></div>');
const radice = document.getElementById('squadra');
// in panchina ci stanno PANCHINA giocatori, in due colonne; gli altri sono le riserve. Il campo si stringe in alto fino
// a STRETTO per cento di mezza larghezza. Un tocco tenuto LUNGO millesimi apre la scheda; oltre TRASCINA punti di
// spostamento la carta si trascina.
const PANCHINA = 8, COLONNE = 2, STRETTO = 30, LUNGO = 520, TRASCINA = 10;
const SEGNO = { capitano: 'capitano', rigori: 'rigore', punizioni: 'punizione', angoli: 'corner' };
// scelto: la carta toccata, in attesa della seconda, come 'xi:3' o 'pan:1'. armato: l'incarico da dare al prossimo titolare
// toccato; riserve: la colonna di destra mostra le riserve invece della panchina
let scelto = null, armato = null, riserve = false;
const modulo = () => moduloMio();
const posto = (g) => { const [dove, i] = g.split(':'); return { dove, i: +i }; };
const dopoCambio = () => { applicaMio(); salvaK(); };

// tutta la rosa con scheda ed energia: prima i titolari nell'ordine dei posti, poi gli altri
function rosa(c) { return c.xi.concat(c.pan || []).map((x) => ({ x, sc: DATI.scheda(x, c.id), energia: CAR.energiaDi(K, x[0]) })); }

/** Disegna la Squadra del proprio club. */
export function disegnaSquadra() {
  const c = club(K.club), m = modulo(), fisio = CAR.statoFisio(K, CLUBS), pan = c.pan || [], extra = Math.max(0, pan.length - PANCHINA);
  const allenabili = CAR.quantiAllenatori(K);
  const ottima = !squadraMigliore(rosa(c), postiModulo(m)).cambiata;
  if (!extra) riserve = false;
  radice.innerHTML = '<div class="qSx">'
    + `<button class="qB" data-az="modulo">${icona('modulo')}<span><b data-adatta data-min="13">${t('squadra.modulo')}</b><i>${m}</i></span></button>`
    + `<button class="qB${riserve ? ' accesa' : ''}" data-az="riserve">${icona('riserve')}<span><b data-adatta data-min="13">${t('squadra.riserve', extra)}</b></span></button>`
    + `<button class="qB" data-az="fisio">${icona('fisioterapista')}<span><b data-adatta data-min="13">${t('squadra.fisio')}</b>${fisio.manca ? `<i data-adatta>${t('fisio.stanca')}</i>` : `<i data-adatta data-corto="${t('fisio.alMassimoCorto')}">${t('fisio.alMassimo')}</i>`}</span></button>`
    + `<button class="qB accesa" data-az="allenatore">${icona('allenatore')}<span><b data-adatta data-min="13">${t('squadra.allenatore')}</b></span>${allenabili ? `<em class="num">${allenabili}</em>` : ''}</button>`
    + `<div class="qInc">${CAR.INCARICHI.map((k) => `<button class="${armato === k ? 'armato' : ''}" data-inc="${k}">${icona(SEGNO[k])}<b>${t('inc.' + k)}</b></button>`).join('')}</div></div>`
    + `<div class="qCampo"></div>`
    + `<div class="qPan"><h3>${riserve ? t('squadra.riserve', extra) : t('squadra.panchina', Math.min(pan.length, PANCHINA), PANCHINA)}</h3><div class="qGriglia"></div></div>`
    + `<button class="qMigliore${ottima ? ' ottima' : ''}" data-az="migliore">${icona(ottima ? 'spunta' : 'scambia')}<b>${t('squadra.migliora')}</b></button>`;
  campo(c, m); panchina(c);
  adatta(radice); riempiRitratti(radice);
}

// il campo con gli undici titolari: ognuno al suo posto del modulo, con la fascia, i segni degli incarichi, l'avviso di
// fuori ruolo; le carte sono grandi se ci stanno, se no piccole
function campo(c, m) {
  const el = radice.querySelector('.qCampo'), r = el.getBoundingClientRect(); if (!r.width) return;
  const posti = postiModulo(m), d = disponi(posti, r.width, r.height, { stretto: STRETTO, grande: true }), schede = c.xi.map((x) => DATI.scheda(x, c.id)), inc = incarichi(K, CLUBS, schede);
  el.style.setProperty('--gw', `${d.gw}px`); el.style.setProperty('--gf', `${d.scritta}px`); el.style.setProperty('--ga', d.forma);
  el.innerHTML = erba(STRETTO) + c.xi.map((x, i) => {
    const sc = schede[i], q = d.dove[i], g = `xi:${i}`;
    return cartaCampo(sc, { club: c.id, energia: CAR.energiaDi(K, x[0]), capitano: inc.capitano === x[0], incarichi: ['rigori', 'punizioni', 'angoli'].filter((k) => inc[k] === x[0]), fuori: adatto(sc.ruolo, posti[i].ruolo),
      migliorato: !!(K.crescita || {})[x[0]], grande: d.grande, stemma: img(c.id + '-mini'), dati: `data-g="${g}"${scelto === g ? ' data-scelto' : ''}`,
      stile: `left:${q.x.toFixed(1)}px;top:${q.y.toFixed(1)}px${d.grande ? '' : `;width:${Math.floor(q.posto - 2)}px`}` });
  }).join('');
}

// la panchina (o le riserve): carte in due colonne, coi posti liberi segnati
function panchina(c) {
  const el = radice.querySelector('.qGriglia'), r = el.getBoundingClientRect(); if (!r.width) return;
  const pan = c.pan || [], da = riserve ? PANCHINA : 0, lista = pan.slice(da, da + PANCHINA), righe = PANCHINA / COLONNE, d = misuraGriglia(r.width, r.height, COLONNE, righe, 3);
  el.style.setProperty('--gw', `${d.gw}px`); el.style.setProperty('--gf', `${d.scritta}px`); el.style.setProperty('--ga', d.forma); el.classList.toggle('piccole', !d.grande);
  el.innerHTML = Array.from({ length: PANCHINA }, (_, k) => {
    const x = lista[k]; if (!x) return `<span class="qVuoto"><i>${t('squadra.libero')}</i></span>`;
    const g = `pan:${da + k}`;
    return cartaCampo(DATI.scheda(x, c.id), { club: c.id, energia: CAR.energiaDi(K, x[0]), migliorato: !!(K.crescita || {})[x[0]], grande: d.grande, ferma: true, stemma: img(c.id + '-mini'), dati: `data-g="${g}"${scelto === g ? ' data-scelto' : ''}` });
  }).join('');
}
addEventListener('resize', () => { if (K && !radice.classList.contains('nas')) disegnaSquadra(); });

// due giocatori si scambiano di posto; in porta va solo un portiere
function scambia(a, b) {
  const c = club(K.club), nome = (g) => { const p = posto(g); return (p.dove === 'pan' ? c.pan : c.xi)[p.i][0]; }, na = nome(a), nb = nome(b), r = CAR.spostaGiocatori(K, CLUBS, posto(a), posto(b));
  scelto = null;
  if (!r.ok) avviso(t(r.motivo === 'portiere' ? 'squadra.portiere' : 'squadra.nonSiPuo')); else { dopoCambio(); avviso(t('squadra.scambiati', na, nb)); }
  disegnaSquadra();
}
// il tocco su una carta: dà l'incarico armato, oppure sceglie la carta, oppure la scambia con quella già scelta
function toccaCarta(g) {
  if (armato) {
    const p = posto(g), c = club(K.club);
    if (p.dove !== 'xi') return avviso(t('inc.soloTitolari'));
    const nome = c.xi[p.i][0]; CAR.assegnaIncarico(K, CLUBS, armato, nome); salvaK(); avviso(t('inc.dato', t('inc.' + armato), nome)); armato = null;
    return disegnaSquadra();
  }
  if (!scelto) { scelto = g; return disegnaSquadra(); }
  if (scelto === g) { scelto = null; return disegnaSquadra(); }
  scambia(scelto, g);
}
function scegliModulo() {
  const m = modulo();
  // i moduli oltre i primi si aprono col Centro allenamento: quelli chiusi si vedono, col lucchetto
  const aperti = CAR.moduliAperti(K, Object.keys(FORMS));
  finestra({ titolo: t('modulo.scegli'), scelte: Object.keys(FORMS).map((n) => ({ testo: n, nota: aperti.includes(n) ? '' : `${icona('lucchetto')} ${t('modulo.chiuso')}`, valore: n, attiva: n === m })),
    fatto: (n) => { if (!aperti.includes(n)) return avviso(t('modulo.serveCentro')); if (FORMS[n]) { sel.form = n; save(); scelto = null; disegnaSquadra(); } } });
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
  CAR.schiera(K, CLUBS, r.ordine.map((i) => tutti[i].x), r.fuori.map((i) => tutti[i].x)); dopoCambio(); scelto = null; avviso(t('squadra.schierata')); disegnaSquadra();
}

// Tocco, tocco lungo e trascinamento sulle carte. Il tocco semplice arriva come «click»; il tocco lungo apre la scheda;
// spostando il dito la carta lo segue e, lasciata sopra un'altra, si scambiano. Dopo un tocco lungo o un trascinamento
// il «click» che segue subito non conta.
let presa = null, saltaFino = 0;
const saltaIlClick = () => { saltaFino = performance.now() + 400; };
const cartaDi = (e) => { const el = e && e.closest ? e.closest('.gC[data-g]') : null; return el && radice.contains(el) ? el : null; };
const lascia = () => { if (!presa) return; clearTimeout(presa.timer); if (presa.ombra) presa.ombra.remove(); presa.el.classList.remove('presa'); presa = null; };
radice.addEventListener('pointerdown', (e) => {
  const el = cartaDi(e.target); if (!el || armato) return;
  lascia(); presa = { el, g: el.dataset.g, x: e.clientX, y: e.clientY, ombra: null, timer: setTimeout(() => { if (!presa || presa.ombra) return; const p = posto(presa.g); lascia(); saltaIlClick(); scelto = null; apriScheda(p.dove, p.i, disegnaSquadra); disegnaSquadra(); }, LUNGO) };
});
addEventListener('pointermove', (e) => {
  if (!presa) return;
  if (!presa.ombra) {
    if (Math.hypot(e.clientX - presa.x, e.clientY - presa.y) < TRASCINA) return;
    clearTimeout(presa.timer); const r = presa.el.getBoundingClientRect();
    presa.ombra = presa.el.cloneNode(true); presa.ombra.classList.add('ombra'); presa.dx = presa.x - r.left; presa.dy = presa.y - r.top;
    presa.ombra.style.cssText = `position:fixed;left:0;top:0;width:${r.width}px;margin:0;transform:none;z-index:30;pointer-events:none`;
    presa.ombra.style.setProperty('--gw', getComputedStyle(presa.el).getPropertyValue('--gw')); presa.ombra.style.setProperty('--ga', getComputedStyle(presa.el).getPropertyValue('--ga'));
    document.body.appendChild(presa.ombra); presa.el.classList.add('presa');
  }
  presa.ombra.style.left = `${e.clientX - presa.dx}px`; presa.ombra.style.top = `${e.clientY - presa.dy}px`;
});
addEventListener('pointerup', (e) => {
  if (!presa) return;
  const trascinata = !!presa.ombra, da = presa.g; lascia();
  if (!trascinata) return;
  saltaIlClick();
  const sopra = cartaDi(document.elementFromPoint(e.clientX, e.clientY));
  if (sopra && sopra.dataset.g !== da) scambia(da, sopra.dataset.g);
});
addEventListener('pointercancel', lascia);
// le immagini delle carte non devono partire col trascinamento del browser, che interromperebbe il nostro
radice.addEventListener('dragstart', (e) => e.preventDefault());
radice.addEventListener('dblclick', (e) => { const el = cartaDi(e.target); if (!el) return; const p = posto(el.dataset.g); scelto = null; apriScheda(p.dove, p.i, disegnaSquadra); disegnaSquadra(); });

radice.addEventListener('click', (e) => {
  if (performance.now() < saltaFino) return;
  const b = e.target.closest('button');
  if (b && b.dataset.inc) { armato = armato === b.dataset.inc ? null : b.dataset.inc; scelto = null; if (armato) avviso(t('inc.tocca', t('inc.' + armato))); return disegnaSquadra(); }
  if (b && b.dataset.az) {
    const az = b.dataset.az;
    if (az === 'modulo') return scegliModulo();
    if (az === 'fisio') return fisioterapista();
    if (az === 'allenatore') return apri('club', 'allenatori');
    if (az === 'migliore') return migliore();
    if (az === 'riserve') { if (!(club(K.club).pan || []).slice(PANCHINA).length) return avviso(t('squadra.nessunaRiserva')); riserve = !riserve; scelto = null; return disegnaSquadra(); }
  }
  const el = cartaDi(e.target); if (el) toccaCarta(el.dataset.g);
});

/** Da chiamare quando si entra nella Squadra: niente carte scelte né incarichi armati rimasti da prima. */
export function apriSquadra() { scelto = null; armato = null; riserve = false; disegnaSquadra(); }
