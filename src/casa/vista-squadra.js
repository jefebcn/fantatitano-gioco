// La Squadra (docs/navigazione.md §3.3): la gestione della formazione, con la struttura chiesta da Alex il 23/11.
// A sinistra quattro pulsanti bassi: il modulo, le riserve, il fisioterapista e gli allenatori. Al centro il campo in
// prospettiva, alto fino al bordo dello schermo, con le undici carte dei titolari secondo il modulo. A destra del campo la
// tessera «Squadra migliore» e il riquadro dei sostituti, in due colonne.
// Due giocatori si scambiano, tra campo, sostituti e riserve, in due modi: toccandoli uno dopo l'altro, oppure
// trascinando una carta sull'altra. Il primo tocco sceglie la carta, che si illumina e mostra un piccolo pulsante «Scheda»;
// toccarla di nuovo, o toccare il vuoto, annulla. La scheda del giocatore si apre da quel pulsante o tenendo il dito
// fermo sulla carta. Il capitano ha la «C» sulla carta, sotto il ruolo: si trascina su un altro titolare per passargli
// la fascia. Rigori, punizioni e angoli non stanno sulle carte del campo: si vedono tutti insieme, col capitano, nel
// pannello del pulsante «Incarichi», e lì si danno a un altro titolare (oppure dalla scheda del giocatore). Ogni
// cambio è salvato subito.
import * as CAR from '../carriera.js';
import { FORMS, SQUADRA, CARTA } from '../config.js';
import { adatto, postiModulo } from '../dati/scala.js';
import { K, DATI, esc, sel, save, salvaK, applicaMio, avviso, mon, club, moduloMio } from './casa.js';
import { icona } from './icone.js';
import { adatta } from './carte.js';
import { cartaGiocatore, prontaCarte } from './giocatore.js';
import { disponi, erba, linee, SPORGE } from './campo.js';
import { squadraMigliore, incarichi } from './rosa.js';
import { apriScheda } from './scheda-giocatore.js';
import { finestra } from './finestra.js';
import { t } from './testi.js';
import { apri } from './nav.js';
import { pronta } from './immagini.js';
import { schermo, quandoCambiaMisura } from './schermo.js';

document.getElementById('vs').insertAdjacentHTML('beforebegin', '<div id="squadra" class="scr nas"></div>');
const radice = document.getElementById('squadra');
// tra i sostituti ci stanno PANCHINA giocatori, in COLONNE colonne; gli altri sono le riserve
const PANCHINA = 8, COLONNE = 2;
// scelto: la carta toccata, in attesa della seconda, come 'xi:3' o 'pan:1'. riserve: la colonna di destra mostra le
// riserve invece dei sostituti
let scelto = null, riserve = false;
const modulo = () => moduloMio();
const posto = (g) => { const [dove, i] = g.split(':'); return { dove, i: +i }; };
const dopoCambio = () => { applicaMio(); salvaK(); };
// le Tre Torri del Titano, stilizzate e molto trasparenti, in basso a sinistra dietro il campo: il monte e le tre torri coi
// merli. Servono solo se manca lo sfondo dipinto dello stadio, che le torri le ha già sulla collina
const TORRI = '<svg class="qTorri" viewBox="0 0 64 64" preserveAspectRatio="xMidYMax meet" aria-hidden="true"><path d="M2 60 14 40l8 6 10-20 10 20 8-6 12 20z" opacity=".55"/><path d="M10 40V26h2v-3h2v3h2v-3h2v3h2v14zM27 30V10h2V7h2v3h2V7h2v3h2v20zM44 40V26h2v-3h2v3h2v-3h2v3h2v14z"/></svg>';
// quanto è larga una carta: una parte fissa della larghezza dello schermo, uguale in campo e tra i sostituti
const larga = () => Math.round(schermo()[0] * SQUADRA.carta);

// tutta la rosa con scheda ed energia: prima i titolari nell'ordine dei posti, poi gli altri
function rosa(c) { return c.xi.concat(c.pan || []).map((x) => ({ x, sc: DATI.scheda(x, c.id), energia: CAR.energiaDi(K, x[0]) })); }

/** Disegna la Squadra del proprio club. */
export function disegnaSquadra() {
  const c = club(K.club), m = modulo(), fisio = CAR.statoFisio(K, CLUBS), pan = c.pan || [], extra = Math.max(0, pan.length - PANCHINA);
  const allenabili = CAR.quantiAllenatori(K);
  const ottima = !squadraMigliore(rosa(c), postiModulo(m)).cambiata;
  if (!extra) riserve = false;
  radice.style.setProperty('--gw', `${larga()}px`);
  const dipinto = pronta('sfondo-squadra');
  radice.classList.toggle('illustrata', dipinto);
  radice.innerHTML = (dipinto ? '' : TORRI) + '<div class="qSx">'
    + `<button class="qB" data-az="modulo">${icona('modulo')}<b>${m}</b></button>`
    + `<button class="qB${riserve ? ' scelta' : ''}" data-az="riserve">${icona('riserve')}<b data-adatta>${t('squadra.riserve', extra)}</b></button>`
    + `<button class="qB" data-az="incarichi">${icona('capitano')}<b data-adatta>${t('squadra.incarichi')}</b></button>`
    + `<button class="qB" data-az="fisio">${icona('fisioterapista')}<b data-adatta>${t('squadra.fisio')}</b>${fisio.manca ? '<em class="bollino">!</em>' : ''}</button>`
    + `<button class="qB accesa" data-az="allenatore">${icona('allenatore')}<span><b data-adatta>${t('squadra.allenatori')}</b><i data-adatta data-corto="${t('squadra.allenatoriCorto')}">${t('squadra.allenatoriSotto')}</i></span>${allenabili ? `<em class="bollino">${allenabili}</em>` : ''}</button></div>`
    + '<div class="qCampo"></div>'
    + `<button class="qMigliore${ottima ? ' ottima' : ''}" data-az="migliore">${icona('modulo')}<b>${t('squadra.migliora')}</b>${ottima ? `<em class="fatto">${icona('spunta')}</em>` : ''}</button>`
    + `<div class="qPan"><h3>${riserve ? t('squadra.riserve', extra) : t('squadra.sostituti', Math.min(pan.length, PANCHINA), PANCHINA)}</h3><div class="qGriglia"></div></div>`;
  campo(c, m); panchina(c);
  adatta(radice); prontaCarte(radice); pulsanteScheda();
}

// il pulsante «Scheda» della carta scelta: sopra di lei, o sotto se sopra c'è la barra
function pulsanteScheda() {
  const el = scelto && radice.querySelector(`.gC[data-g="${scelto}"]`); if (!el) { scelto = null; return; }
  const r = el.getBoundingClientRect(), q = radice.getBoundingClientRect(), barra = parseFloat(getComputedStyle(document.body).getPropertyValue('--barra')) || 0;
  radice.insertAdjacentHTML('beforeend', `<button class="qScheda" data-az="scheda">${icona('info')}<b>${t('squadra.scheda')}</b></button>`);
  const b = radice.lastElementChild, alto = b.offsetHeight, sopra = r.top - alto >= q.top + barra;
  // il pulsante ha un margine invisibile sopra e sotto (per il tocco): quello che si vede tocca appena la carta
  const margine = parseFloat(getComputedStyle(b).borderTopWidth) || 0;
  b.style.left = `${r.left + r.width / 2 - q.left}px`; b.style.top = `${(sopra ? r.top - alto + margine - 1 : r.bottom - margine + 1) - q.top}px`;
}

// il campo con gli undici titolari: ognuno al suo posto del modulo, con la «C» del capitano e il ruolo
// bordato di rosso se gioca fuori ruolo
function campo(c, m) {
  const el = radice.querySelector('.qCampo'), r = el.getBoundingClientRect(); if (!r.width) return;
  // nei moduli con più linee le carte si stringono quel tanto che basta perché la testa, che esce in alto, non copra la
  // carta della linea sopra
  const posti = postiModulo(m), stretta = Math.min(larga(), Math.floor((r.height / linee(posti).length - SQUADRA.aria) / (CARTA.alta + SPORGE)));
  const d = disponi(posti, r.width, r.height, { stretto: SQUADRA.stretto, grande: true, fissa: stretta }), schede = c.xi.map((x) => DATI.scheda(x, c.id)), inc = incarichi(K, CLUBS, schede);
  el.innerHTML = erba(SQUADRA.stretto, true) + c.xi.map((x, i) => {
    const sc = schede[i], q = d.dove[i];
    // chi sta più in basso sta davanti: la sua testa, che esce dalla carta, non finisce sotto la carta della riga sopra
    return cartaGiocatore(sc, { club: c.id, larga: stretta, energia: CAR.energiaDi(K, x[0]), capitano: inc.capitano === x[0], incarichi: ['rigori', 'punizioni', 'angoli'].filter((k) => inc[k] === x[0]), fuori: adatto(sc.ruolo, posti[i].ruolo),
      migliorato: !!(K.crescita || {})[x[0]], dati: `data-g="xi:${i}"${scelto === `xi:${i}` ? ' data-scelto' : ''}`, stile: `left:${q.x.toFixed(1)}px;top:${q.y.toFixed(1)}px;z-index:${1 + Math.floor(q.y / r.height * 5)}` });
  }).join('');
}

// i sostituti (o le riserve): carte in due colonne, uguali a quelle in campo, coi posti liberi segnati
function panchina(c) {
  const el = radice.querySelector('.qGriglia'), pan = c.pan || [], da = riserve ? PANCHINA : 0, lista = pan.slice(da, da + PANCHINA);
  el.style.gridTemplateColumns = `repeat(${COLONNE},auto)`;
  el.innerHTML = Array.from({ length: PANCHINA }, (_, k) => {
    const x = lista[k]; if (!x) return `<span class="qVuoto"><i>${t('squadra.libero')}</i></span>`;
    return cartaGiocatore(DATI.scheda(x, c.id), { club: c.id, larga: larga(), energia: CAR.energiaDi(K, x[0]), migliorato: !!(K.crescita || {})[x[0]], ferma: true, dati: `data-g="pan:${da + k}"${scelto === `pan:${da + k}` ? ' data-scelto' : ''}` });
  }).join('');
}
quandoCambiaMisura(() => { if (K && !radice.classList.contains('nas')) disegnaSquadra(); });

// due giocatori si scambiano di posto; in porta va solo un portiere
function scambia(a, b) {
  const c = club(K.club), nome = (g) => { const p = posto(g); return (p.dove === 'pan' ? c.pan : c.xi)[p.i][0]; }, na = nome(a), nb = nome(b), r = CAR.spostaGiocatori(K, CLUBS, posto(a), posto(b));
  scelto = null;
  if (!r.ok) avviso(t(r.motivo === 'portiere' ? 'squadra.portiere' : 'squadra.nonSiPuo')); else { dopoCambio(); avviso(t('squadra.scambiati', na, nb)); }
  disegnaSquadra();
}
// un incarico passa al titolare su cui è stata lasciata la sua linguetta
function passaIncarico(tipo, g) {
  const p = posto(g), c = club(K.club);
  if (p.dove !== 'xi') return avviso(t('inc.soloTitolari'));
  const nome = c.xi[p.i][0]; CAR.assegnaIncarico(K, CLUBS, tipo, nome); salvaK(); avviso(t('inc.dato', t('inc.' + tipo), nome)); scelto = null; disegnaSquadra();
}
// il tocco su una carta: la sceglie, oppure la lascia se era già scelta, oppure la scambia con quella scelta prima
function toccaCarta(g) {
  if (!scelto) { scelto = g; return disegnaSquadra(); }
  if (scelto === g) { scelto = null; return disegnaSquadra(); }
  scambia(scelto, g);
}
// la scheda del giocatore di una carta: si apre sopra la schermata, e alla chiusura la Squadra si ridisegna
function scheda(g) { const p = posto(g); scelto = null; apriScheda(p.dove, p.i, disegnaSquadra); disegnaSquadra(); }
function scegliModulo() {
  const m = modulo();
  // i moduli oltre i primi si aprono col Centro allenamento: quelli chiusi si vedono, col lucchetto
  const aperti = CAR.moduliAperti(K, Object.keys(FORMS));
  finestra({ titolo: t('modulo.scegli'), scelte: Object.keys(FORMS).map((n) => ({ testo: n, nota: aperti.includes(n) ? '' : `${icona('lucchetto')} ${t('modulo.chiuso')}`, valore: n, attiva: n === m })),
    fatto: (n) => { if (!aperti.includes(n)) return avviso(t('modulo.serveCentro')); if (FORMS[n]) { sel.form = n; save(); scelto = null; disegnaSquadra(); } } });
}
// «Incarichi»: le quattro voci tutte insieme, ognuna con la carta piccola di chi la ha adesso. Toccandone una si
// sceglie un altro titolare dall'elenco, e si torna qui a vedere com'è cambiato. Se il capitano scelto è in panchina
// la fascia resta sua: si vede la sua carta, con la nota.
function pannelloIncarichi() {
  const c = club(K.club), tutti = rosa(c), inc = incarichi(K, CLUBS, c.xi.map((x) => DATI.scheda(x, c.id))), fuori = (K.mio || {}).capitano;
  finestra({ titolo: t('inc.titolo'), testo: t('inc.testo'),
    scelte: CAR.INCARICHI.map((tipo) => {
      const nome = inc[tipo] || (tipo === 'capitano' ? fuori : null), g = nome && tutti.find((y) => y.x[0] === nome);
      return { testo: t('inc.' + tipo), nota: !g ? t('inc.nessuno') : inc[tipo] ? esc(nome) : t('inc.inPanchina', esc(nome)), valore: tipo,
        figura: g ? `<em class="scCarta">${cartaGiocatore(g.sc, { club: c.id, larga: CARTA.larga.incarico, capitano: tipo === 'capitano', ferma: true })}</em>` : '' };
    }),
    fatto: scegliIncaricato });
  prontaCarte(document.getElementById('finestra'));
}
// l'elenco dei titolari per un incarico: quello che lo ha adesso è acceso
function scegliIncaricato(tipo) {
  const c = club(K.club), schede = c.xi.map((x) => DATI.scheda(x, c.id)), ha = incarichi(K, CLUBS, schede)[tipo];
  finestra({ titolo: t('inc.chi', t('inc.' + tipo)),
    scelte: c.xi.map((x, i) => ({ testo: `<span class="scNome" data-adatta>${esc(x[0])}</span>`, nota: `${schede[i].ruolo} · ${schede[i].val}`, valore: i, attiva: x[0] === ha })),
    fatto: (i) => {
      const x = club(K.club).xi[+i]; if (!x || !CAR.assegnaIncarico(K, CLUBS, tipo, x[0])) return avviso(t('inc.soloTitolari'));
      salvaK(); avviso(t('inc.dato', t('inc.' + tipo), x[0])); scelto = null; disegnaSquadra(); pannelloIncarichi();
    } });
  adatta(document.getElementById('finestra'));
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

// Tocco, pressione lunga e trascinamento. Si prende una carta oppure il segno di un incarico: spostando il dito di
// SQUADRA.trascina punti la cosa presa lo segue. Una carta lasciata sopra un'altra le scambia; un segno lasciato
// sopra un titolare gli passa l'incarico. Il dito fermo su una carta per SQUADRA.lungo millesimi apre la scheda. Senza
// spostamento e senza attesa è un tocco: arriva come «click». Dopo una pressione lunga o un trascinamento il «click» che
// segue subito non conta.
let presa = null, saltaFino = 0;
const saltaIlClick = () => { saltaFino = performance.now() + 400; };
const cartaDi = (e) => { const el = e && e.closest ? e.closest('.gC[data-g]') : null; return el && radice.contains(el) ? el : null; };
const segnoDi = (e) => { const el = e && e.closest ? e.closest('.gSegni [data-inc]') : null; return el && radice.contains(el) ? el : null; };
const lascia = () => { if (!presa) return; clearTimeout(presa.timer); if (presa.ombra) presa.ombra.remove(); presa.el.classList.remove('presa'); presa = null; };
radice.addEventListener('pointerdown', (e) => {
  const segno = segnoDi(e.target), el = segno || cartaDi(e.target); if (!el) return;
  lascia(); presa = { el, inc: segno ? segno.dataset.inc : '', g: segno ? '' : el.dataset.g, x: e.clientX, y: e.clientY, ombra: null, timer: 0 };
  // solo le carte hanno la pressione lunga
  if (!segno) presa.timer = setTimeout(() => { if (!presa || presa.ombra) return; const g = presa.g; lascia(); saltaIlClick(); scheda(g); }, SQUADRA.lungo);
});
addEventListener('pointermove', (e) => {
  if (!presa) return;
  if (!presa.ombra) {
    if (Math.hypot(e.clientX - presa.x, e.clientY - presa.y) < SQUADRA.trascina) return;
    clearTimeout(presa.timer);
    const r = presa.el.getBoundingClientRect(), stile = getComputedStyle(presa.el);
    presa.ombra = presa.el.cloneNode(true); presa.ombra.classList.add('ombra'); presa.dx = presa.x - r.left; presa.dy = presa.y - r.top;
    presa.ombra.style.cssText = `position:fixed;left:0;top:0;width:${r.width}px;margin:0;transform:none;z-index:30;pointer-events:none`;
    // la copia vive fuori dalla schermata: si porta dietro le misure e, se è una linguetta, anche l'aspetto
    presa.ombra.style.setProperty('--gw', stile.getPropertyValue('--gw'));
    if (presa.inc) { presa.ombra.className = 'qSegnoMobile'; presa.ombra.style.height = `${r.height}px`; presa.ombra.style.background = stile.backgroundImage; presa.ombra.style.color = stile.color; presa.ombra.style.fontSize = stile.fontSize; }
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
    if (az === 'incarichi') return pannelloIncarichi();
    if (az === 'fisio') return fisioterapista();
    if (az === 'allenatore') return apri('club', 'allenatori');
    if (az === 'migliore') return migliore();
    if (az === 'scheda') return scelto ? scheda(scelto) : undefined;
    if (az === 'riserve') { if (!(club(K.club).pan || []).slice(PANCHINA).length) return avviso(t('squadra.nessunaRiserva')); riserve = !riserve; scelto = null; return disegnaSquadra(); }
  }
  // una linguetta toccata senza trascinarla dice come si usa; una carta toccata si sceglie o si scambia; il vuoto annulla
  const segno = segnoDi(e.target); if (segno) return avviso(t('inc.trascina', t('inc.' + segno.dataset.inc)));
  const el = cartaDi(e.target); if (el) return toccaCarta(el.dataset.g);
  if (scelto) { scelto = null; disegnaSquadra(); }
});

/** Da chiamare quando si entra nella Squadra: niente carte scelte rimaste da prima, e si riparte dai sostituti. */
export function apriSquadra() { scelto = null; riserve = false; disegnaSquadra(); }
