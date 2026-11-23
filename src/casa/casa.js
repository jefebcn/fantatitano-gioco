/* Fantatitano — La Partita. La home, i menu e le schermate fuori dalla partita: ingresso e creazione del club, carriera,
   pannelli (classifica, coppe, sfide, mercato, club, negozio, impostazioni), prima della partita, salvataggio.
   Le schermate (casa.html) e i loro stili (casa.css) si aggiungono alla pagina all'avvio.
   Dalla partita (src/game.js) arrivano il modello 3D per i ritratti, le maglie, l'audio e l'avvio della gara: l'elenco
   è nell'import qui sotto. Il formato dei dati tra home e partita verso cui andare è in docs/ponte-partita.md. */
import * as T from 'three';
import { DISEGNI } from '../divisa.js';
import * as CLOUD from '../cloud.js';
import * as CAR from '../carriera.js';
import { ECONOMIA, DIFF, FORMS, PASSAGGIO, DIVISIONI, STAGIONE } from '../config.js';
import { aiForm, $, rnd, clamp, hash, IMGX, img, G, renderer, cv, SCARPE_NEGOZIO, stemmi3d, makeSkinned, FIGURE, pickKits, PALLONI, kitsFor, AU, tactics, club as clubVero, chiudiPonte, startMatch, toMenu, CREST, loadImg, MODEL } from '../game.js';
import HTML_CASA from './casa.html';
import CSS_CASA from './casa.css';
import CSS_NUOVO from './stile.css';
import { creaDati, coloreStat } from '../dati/scala.js';
import { creaDivisioni } from '../dati/divisioni.js';
import { GIOCATORI } from '../dati/giocatori.js';
import { rotta, apri, indietro, ridisegna, tornaSotto, azzera } from './nav.js';
import { mostraBarra, aggiornaBarra } from './barra.js';
import { apriPremio, premiDa } from './premio.js';
import { disegnaHome } from './home.js';
import { disegnaCarriera } from './vista-carriera.js';
import { disegnaSfida } from './vista-sfida.js';
import { apriSquadra } from './vista-squadra.js';
import { cartaCampo, riempiRitratti } from './giocatore.js';
import { adatta, attrNome } from './carte.js';
import { nomiDi } from '../dati/squadre.js';
import { t } from './testi.js';
import { panClubMio, panMercato, panAllenamento, panGuadagna, consigliato, toccaEconomia } from './vista-economia.js';
import { pronta, figura } from './immagini.js';
import { icona, MO, DI } from './icone.js';

// le schermate della home e i loro stili entrano nella pagina prima di tutto il resto, nel punto dov'erano
document.head.insertAdjacentHTML('beforeend', `<style id="casaStili">${CSS_CASA}</style><style id="casaStiliNuovi">${CSS_NUOVO}</style>`);
document.getElementById('vs').insertAdjacentHTML('beforebegin', HTML_CASA);

// le schermate in cui si vede la barra in alto, quando c'è una carriera (in partita e nel benvenuto non c'è)
const CON_BARRA = ['#casa', '#carriera', '#sfida', '#squadra', '#pan', '#scelta', '#pre', '#nuovo'];
const show = (id) => { for (const s of ['#home', '#nuovo', '#casa', '#carriera', '#sfida', '#squadra', '#pan', '#scelta', '#pre', '#vs', '#stop', '#cambi', '#fine']) $(s).classList.toggle('nas', s !== id); mostraBarra(!!K && CON_BARRA.includes(id)); };
const sel = { mia: null, loro: null, diff: 'normale', form: '4-3-3', ment: 0, ora: 'giorno', qual: 'auto', assistito: PASSAGGIO.assistito };
const SAVE = 'fantatitano-partita';
try { const v = JSON.parse(localStorage.getItem(SAVE) || '{}'); if (FORMS[v.form]) sel.form = v.form; if ([-1, 0, 1].includes(v.ment)) sel.ment = v.ment; if (DIFF[v.diff]) sel.diff = v.diff; if (v.ora === 'notte' || v.ora === 'giorno') sel.ora = v.ora; if (['auto', 'alta', 'media', 'bassa'].includes(v.qual)) sel.qual = v.qual; if (typeof v.assistito === 'boolean') sel.assistito = v.assistito; } catch (e) { /* si parte dai valori di base */ }
// il passaggio assistito scelto nelle impostazioni vale da subito (PASSAGGIO.assistito in config.js è il valore di partenza)
PASSAGGIO.assistito = sel.assistito;
// Il modulo con cui gioca il club: quello scelto, se il Centro allenamento lo ha aperto, altrimenti il 4-3-3
const moduloMio = () => (FORMS[sel.form] && (!K || CAR.moduliAperti(K, Object.keys(FORMS)).includes(sel.form)) ? sel.form : '4-3-3');
const save = () => { try { localStorage.setItem(SAVE, JSON.stringify({ form: sel.form, ment: sel.ment, diff: sel.diff, ora: sel.ora, qual: sel.qual, assistito: sel.assistito })); } catch (e) { /* senza memoria si gioca lo stesso */ } };
const esc = (n) => String(n).replace(/[<>&"]/g, '');
// La forza di un giocatore sulla scala di prima (55-88): serve solo a forzaClub, cioè alle stelle del club dell'utente, che
// contano anche in partita. Non si mostra più: il numero che si vede è `ovr`, sulla scala nuova.
const RANGE = {}; for (const c of CLUBS) for (const [, r, , q] of c.xi) { const v = RANGE[r] || (RANGE[r] = [q, q]); v[0] = Math.min(v[0], q); v[1] = Math.max(v[1], q); }
const forzaVecchia = (r, q) => Math.round(55 + clamp((q - RANGE[r][0]) / (RANGE[r][1] - RANGE[r][0] || 1), 0, 1) * 33);
// Valutazioni, statistiche, ruoli precisi, piede e altezza che si mostrano (src/dati/scala.js): da 55 a 82, una sola
// conversione per valutazione e statistiche. La forza usata in partita resta la quotazione dei dati.
// le carte dei giocatori del club tengono conto di quanto sono cresciuti con gli allenatori
const DATI = creaDati(CLUBS, GIOCATORI, (x, clubId) => { const c = K && clubId === K.club && K.crescita ? K.crescita[x[0]] : null; return c ? c.stat : null; });
const ovr = DATI.valore;
const RUOLO = { P: 'POR', D: 'DIF', C: 'CEN', A: 'ATT' };
function drawSide(el, c, formName, kit, gk) {
  const f = FORMS[formName];
  el.innerHTML = `<div class="testa"><img src="${img(c.id + '-mini')}" alt=""><div><b>${esc(c.name)}</b><span class="st">${'★'.repeat(c.str)}<s>${'★'.repeat(5 - c.str)}</s></span></div><em>${formName}</em></div><div class="erba">`
    + c.xi.map(([name, role, num, q], i) => { const [x, z] = f.pos[i], k = i ? kit : gk; return `<div class="pl" style="left:${(50 + z / 23 * 37).toFixed(1)}%;top:${(i ? 67 - (x + 35) / 46 * 54 : 88).toFixed(1)}%"><b style="background:${k.shirt};color:${k.ink}">${num}</b><span>${esc(name)}</span><i>${RUOLO[f.roles[i]]} ${ovr(role, q)}</i></div>`; }).join('') + '</div>';
}
// La mia rosa: titolari e riserve; toccando un titolare e una riserva dello stesso ruolo si scambiano
let rXi = -1, rPan = -1;
function drawRosa(msg) {
  const H = club(sel.mia), pan = H.pan || [], riga = (x, attr, scelto) => `<button class="gioc${scelto ? ' sel' : ''}" ${attr}><b>${x[2]} ${esc(x[0])}</b><span>${RUOLO[x[1]]}</span><em>${ovr(x[1], x[3])}</em></button>`;
  $('#campoA').innerHTML = `<div class="rosa"><div><h4>Titolari</h4>${H.xi.map((x, i) => riga(x, `data-x="${i}"`, i === rXi)).join('')}</div><div><h4>Riserve</h4>${pan.map((x, i) => riga(x, `data-n="${i}"`, i === rPan)).join('') || '<p class="vuoto">Nessuna riserva</p>'}`
    + `<p class="nota">${msg || (pan.length ? 'Tocca un titolare e una riserva dello stesso ruolo per scambiarli' : '')}</p></div></div>`;
}
function tapRosa(e) {
  const b = e.target.closest('button'); if (!b || !K || !G.comp || G.comp.tipo !== 'rosa') return;
  if (b.dataset.x) rXi = +b.dataset.x; else if (b.dataset.n) rPan = +b.dataset.n; else return;
  if (rXi < 0 || rPan < 0) return drawRosa();
  const H = club(K.club), entra = H.pan[rPan][0], ok = CAR.cambiaTitolare(K, CLUBS, rXi, rPan); rXi = rPan = -1; if (ok) { applicaMio(); salvaK(); }
  showPre(ok ? `${esc(entra)} è titolare` : 'Devono avere lo stesso ruolo');
}
function showPre(msg) {
  const c = G.comp, rosa = !!c && c.tipo === 'rosa', H = club(sel.mia), A = club(sel.loro), [kh, ka, g1, g2] = kitsFor(H, A, !!(c && c.fuori));
  drawSide($('#campoH'), H, sel.form, kh, g1);
  if (rosa) drawRosa(typeof msg === 'string' ? msg : '');
  else drawSide($('#campoA'), A, aiForm(A), ka, g2);
  $('#gioca').classList.toggle('nas', rosa); $('#preInd').textContent = c ? '‹ Indietro' : '‹ Squadre';
  $('#preT').textContent = rosa ? 'La mia rosa' : c ? c.titolo : `Amichevole · ${sel.diff}`; show('#pre');
}
/* ------------------------------------------------------------------ carriera: dashboard e pannelli (la logica è in carriera.js) */
let K = null; // la carriera: sul dispositivo e, con l'accesso, anche sull'account (cloud.js)
const stelle = (n) => `<span class="st">${'★'.repeat(n)}<s>${'★'.repeat(5 - n)}</s></span>`;
const mini = (id) => `<img src="${img(id + '-mini')}" alt="">`;
const mon = (n) => Number(n).toLocaleString('it-IT');
const fmtTempo = (ms) => { const h = Math.max(0, Math.floor(ms / 36e5)); return h >= 24 ? `${Math.floor(h / 24)}g ${h % 24}h` : `${h}h ${Math.floor((ms % 36e5) / 6e4)}m`; };
function avviso(t) { const el = $('#avviso'); el.textContent = t; el.classList.add('su'); clearTimeout(avviso.t); avviso.t = setTimeout(() => el.classList.remove('su'), 2800); }

/* --- il club dell'utente: nome, colori e stemma scelti all'inizio. Prende il posto della SM Academy U22 e parte dai suoi ragazzi,
   più il capitano ingaggiato: così le altre quindici squadre restano quelle vere. */
const POSTO = 'academy';
/* Le sessanta squadre inventate delle divisioni sotto il Campionato Sammarinese (src/dati/divisioni.js): la carriera le
   conosce da qui, insieme a chi fabbrica i giocatori del mercato. `club` trova una squadra, vera o inventata. */
const DIV = creaDivisioni(DATI, CLUBS, POSTO);
CAR.registra(DIV.inventate, { perDiv: DIV.perDiv, inizio: DIV.inizio, nuovoGiocatore: DIV.nuovoGiocatore, reali: DIV.reali, scheda: DATI.scheda });
const club = (id) => clubVero(id) || DIV.inventate.find((c) => c.id === id);
const COLORI = [['#4B06FC', '#D9F51F'], ['#C0392B', '#FFFFFF'], ['#111111', '#D9F51F'], ['#1D4F8A', '#FFFFFF'], ['#2E8B57', '#F2B822'], ['#E0B400', '#111111'], ['#7A1F3D', '#E8C77A'], ['#FF7A1A', '#1B2A5C']];
const STILI = [['', 'Tinta unita'], ['righe', 'Righe'], ['righine', 'Righine'], ['fasce', 'Fasce'], ['onde', 'Onde'], ['banda', 'Banda'], ['diagonale', 'Diagonale'], ['meta', 'Metà'], ['quarti', 'Quarti'], ['terzi', 'Terzi'], ['scacchi', 'Scacchi'], ['v', 'V'], ['chevron', 'Chevron'], ['petto', 'Fascia sul petto'], ['spalle', 'Spalle'], ['maniche', 'Maniche'], ['fianchi', 'Fianchi'], ['sfumata', 'Sfumata'], ['mimetica', 'Mimetica'], ['pennellata', 'Pennellata']];
const NOMI = ['Titani FC', 'Real Montale', 'Atletico Borgo', 'Sporting Serravalle', 'Libera Acquaviva', 'Rocca United', 'Guaita Calcio', 'Cesta FC', 'Dogana Stars', 'Chiesanuova FC', 'Torri Unite', 'Olimpia Titano'];
const sigla = (n) => (String(n).replace(/[^A-Za-zÀ-ÿ ]/g, '').split(/\s+/).filter((w) => w.length > 2 && !/^(fc|real|united|calcio)$/i.test(w))[0] || String(n) || 'MIO').slice(0, 3).toUpperCase();
/* Lo stemma del club è fatto a pezzi (NEGOZIO in src/carriera.js): una forma, un simbolo in cima e un bordo, più i colori e
   il disegno scelti e la sigla. Le forme sono tracciati nello spazio 240 × 283; i simboli stanno in cima, attorno a (120, 20). */
const FORME_STEMMA = {
  scudo: (x, k) => { x.moveTo(20 * k, 34 * k); x.lineTo(220 * k, 34 * k); x.lineTo(220 * k, 150 * k); x.quadraticCurveTo(220 * k, 238 * k, 120 * k, 278 * k); x.quadraticCurveTo(20 * k, 238 * k, 20 * k, 150 * k); },
  tondo: (x, k) => { x.arc(120 * k, 158 * k, 110 * k, 0, Math.PI * 2); },
  stendardo: (x, k) => { x.moveTo(28 * k, 34 * k); x.lineTo(212 * k, 34 * k); x.lineTo(212 * k, 236 * k); x.lineTo(120 * k, 278 * k); x.lineTo(28 * k, 236 * k); },
  rombo: (x, k) => { x.moveTo(120 * k, 34 * k); x.lineTo(226 * k, 156 * k); x.lineTo(120 * k, 278 * k); x.lineTo(14 * k, 156 * k); },
  esagono: (x, k) => { x.moveTo(120 * k, 34 * k); x.lineTo(220 * k, 92 * k); x.lineTo(220 * k, 218 * k); x.lineTo(120 * k, 278 * k); x.lineTo(20 * k, 218 * k); x.lineTo(20 * k, 92 * k); },
};
const torre = (x, k, cx, alta, larga) => { x.rect((cx - larga / 2) * k, (38 - alta) * k, larga * k, alta * k); for (const d of [-1, 0, 1]) x.rect((cx + d * larga * .36 - larga * .13) * k, (38 - alta - 7) * k, larga * .26 * k, 8 * k); };
const SIMBOLI_STEMMA = {
  nessuno: () => {},
  corona: (x, k) => { for (const [px, py] of [[78, 30], [86, 4], [104, 20], [120, 0], [136, 20], [154, 4], [162, 30]]) x.lineTo(px * k, py * k); },
  stella: (x, k) => { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 11 : 26; x.lineTo((120 + Math.cos(a) * r) * k, (26 + Math.sin(a) * r) * k); } },
  pallone: (x, k) => { x.arc(120 * k, 24 * k, 22 * k, 0, Math.PI * 2); },
  torre: (x, k) => torre(x, k, 120, 30, 30),
  fulmine: (x, k) => { for (const [px, py] of [[130, 0], [100, 26], [118, 26], [108, 50], [142, 20], [124, 20]]) x.lineTo(px * k, py * k); },
  tretorri: (x, k) => { torre(x, k, 84, 20, 22); torre(x, k, 120, 31, 24); torre(x, k, 156, 20, 22); },
  alloro: (x, k) => { for (const s of [-1, 1]) for (let i = 0; i < 5; i++) { const a = .5 + i * .42, px = 120 + s * Math.sin(a) * 46, py = 44 - Math.cos(a) * 40; x.save(); x.translate(px * k, py * k); x.rotate(s * (a + .7)); x.moveTo(0, -11 * k); x.quadraticCurveTo(7 * k, 0, 0, 11 * k); x.quadraticCurveTo(-7 * k, 0, 0, -11 * k); x.restore(); } },
};
function disegnaStemma(m, w) {
  const h = Math.round(w * 1.18), [c, x] = cv(w, h), k = w / 240, forma = FORME_STEMMA[m.forma] || FORME_STEMMA.scudo, bordo = m.bordo || 'semplice';
  const sh = () => { x.beginPath(); forma(x, k); x.closePath(); };
  x.save(); sh(); x.clip(); x.fillStyle = m.c1; x.fillRect(0, 0, w, h); x.fillStyle = m.c2;
  if (m.stile === 'righe') for (let i = 0; i < 4; i++) x.fillRect((44 + i * 48) * k, 0, 24 * k, h);
  else if (m.stile === 'banda') { x.beginPath(); x.moveTo(0, 80 * k); x.lineTo(w, 180 * k); x.lineTo(w, 240 * k); x.lineTo(0, 140 * k); x.fill(); }
  else if (m.stile === 'meta') x.fillRect(120 * k, 0, w, h);
  else if (m.stile === 'fasce') for (let i = 0; i < 5; i++) x.fillRect(0, (40 + i * 56) * k, w, 28 * k);
  else if (m.stile === 'scacchi') for (let i = 0; i < 6; i++) for (let j = 0; j < 7; j++) if ((i + j) & 1) x.fillRect(i * 40 * k, j * 40 * k, 40 * k, 40 * k);
  else if (m.stile === 'v') { x.beginPath(); x.moveTo(0, 60 * k); x.lineTo(120 * k, 150 * k); x.lineTo(w, 60 * k); x.lineTo(w, 100 * k); x.lineTo(120 * k, 190 * k); x.lineTo(0, 100 * k); x.fill(); }
  // bordo doppio: un filo chiaro dentro, a un passo dal bordo
  if (bordo === 'doppio') { x.translate(120 * k, 158 * k); x.scale(.86, .86); x.translate(-120 * k, -158 * k); sh(); x.lineWidth = 5 * k; x.strokeStyle = 'rgba(255,255,255,.85)'; x.stroke(); }
  x.restore(); sh(); const chiaro = m.stile ? '#FFFFFF' : m.c2;
  if (bordo === 'oro') { const g = x.createLinearGradient(0, 30 * k, 0, 280 * k); g.addColorStop(0, '#F6D684'); g.addColorStop(.5, '#C4922F'); g.addColorStop(1, '#F6D684'); x.lineWidth = 14 * k; x.strokeStyle = g; }
  else { x.lineWidth = (bordo === 'sottile' ? 6 : 12) * k; x.strokeStyle = chiaro; if (bordo === 'punti') { x.setLineDash([3 * k, 16 * k]); x.lineCap = 'round'; } }
  x.stroke(); x.setLineDash([]); x.lineCap = 'butt';
  // il simbolo in cima: lime come la corona di Fantatitano, col contorno scuro (il pallone è bianco coi pentagoni)
  const simbolo = m.simbolo || 'corona';
  x.fillStyle = simbolo === 'pallone' ? '#FFFFFF' : '#D9F51F'; x.strokeStyle = '#0A0A0C'; x.lineWidth = 4 * k; x.beginPath(); (SIMBOLI_STEMMA[simbolo] || SIMBOLI_STEMMA.corona)(x, k); x.closePath(); x.stroke(); x.fill();
  if (simbolo === 'pallone') { x.fillStyle = '#0A0A0C'; x.beginPath(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * Math.PI * .4; x.lineTo((120 + Math.cos(a) * 9) * k, (24 + Math.sin(a) * 9) * k); } x.fill(); }
  x.font = `${Math.round((m.forma === 'rombo' ? 62 : 78) * k)}px Anton, Impact, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
  x.lineWidth = 14 * k; x.strokeStyle = 'rgba(10,10,12,.55)'; x.strokeText(m.sigla || 'MIO', 120 * k, 156 * k); x.fillStyle = '#FFFFFF'; x.fillText(m.sigla || 'MIO', 120 * k, 156 * k);
  return c.toDataURL('image/png');
}
const forzaClub = (c) => clamp(Math.round((c.xi.reduce((s, x) => s + forzaVecchia(x[1], x[3]), 0) / c.xi.length - 58) / 5), 1, 5);
/** Mette sul posto della SM Academy U22 il club dell'utente (nome, sigla, colori, stemma), o la rimette com'era se non c'è. */
function applicaMio() {
  const c = club(POSTO); if (!c) return;
  if (!c.orig) c.orig = { name: c.name, short: c.short, c1: c.c1, c2: c.c2, st: c.st, col: c.col, rag: c.rag, str: c.str };
  const m = K && K.club === POSTO && K.mio && K.mio.nome ? K.mio : null;
  if (m) { const d = m.indossa === 'terza' && m.terza && CAR.possiede(K, 'terza', 'terza') ? m.terza : m; // la divisa che si indossa: la prima o la terza maglia (negozio)
    Object.assign(c, { name: m.nome, short: m.sigla, c1: d.c1, c2: d.c2, st: d.stile || undefined, col: m.colletto || undefined, rag: m.colletto ? !!m.raglan : undefined }); c.str = forzaClub(c); IMGX[POSTO] = disegnaStemma(m, 240); IMGX[POSTO + '-mini'] = disegnaStemma(m, 96); }
  else { Object.assign(c, c.orig); delete IMGX[POSTO]; delete IMGX[POSTO + '-mini']; }
  stemmi3d.delete(POSTO); loadImg(img(POSTO + '-mini')).then((i) => { CREST[POSTO] = i; stemmi3d.delete(POSTO); });
  stemmiDivisione();
}
// Gli stemmi delle squadre inventate si disegnano coi pezzi dello stemma, la prima volta che servono: quelli della
// divisione in cui si gioca. Le stelle del club dell'utente dicono quanto è forte rispetto alla sua divisione.
function stemmiDivisione() {
  if (!K) return;
  for (const id of K.squadre) { const c = club(id); if (c && c.inventata && !IMGX[id]) { IMGX[id] = disegnaStemma(c.stemma, 240); IMGX[id + '-mini'] = disegnaStemma(c.stemma, 96); loadImg(img(id + '-mini')).then((i) => { CREST[id] = i; }); } }
  const me = club(K.club), [lo, hi] = CAR.divisione(K).val; if (me) me.str = clamp(Math.round(1 + (CAR.mediaTitolari(K, CLUBS) - lo) / (hi - lo) * 4), 1, 5);
}
// Le otto statistiche mostrate di un giocatore, come coppie sigla e valore. `clubId` è la squadra in cui sta adesso
const attributi = (x, clubId) => DATI.scheda(x, clubId).stat;
// Maglia e icone disegnate, per le carte della dashboard
/** Il disegno della maglia come immagine, dalle stesse funzioni che colorano la divisa 3D (src/divisa.js): l'anteprima è
 *  com'è in campo. Il corpo della maglia (26..74 sull'asse x) è largo come il busto, le maniche stanno fuori. */
const _maglie = new Map();
function tramaMaglia(c1, c2, st) {
  const chiave = c1 + c2 + st; if (_maglie.has(chiave)) return _maglie.get(chiave);
  const f = DISEGNI[st]; if (!f) { _maglie.set(chiave, ''); return ''; }
  const W = 100, H = 90, [c, x] = cv(W, H), im = x.createImageData(W, H), a = new T.Color(c1), b = new T.Color(c2);
  for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
    const k = clamp(f((px - 50) / 24 * .19, 1.5 - (py - 2) / 86 * .555), 0, 1), i = (py * W + px) * 4;
    im.data[i] = (a.r + (b.r - a.r) * k) * 255; im.data[i + 1] = (a.g + (b.g - a.g) * k) * 255; im.data[i + 2] = (a.b + (b.b - a.b) * k) * 255; im.data[i + 3] = 255;
  }
  x.putImageData(im, 0, 0); const u = c.toDataURL(); _maglie.set(chiave, u); return u;
}
// dove: una sigla per chi la disegna. Due maglie uguali in due schermate avrebbero lo stesso ritaglio, e quello della
// schermata nascosta non vale: la maglia uscirebbe senza forma
function maglia(c1, c2, st, colletto = 'giro', raglan = false, dove = '') {
  const id = 'mg' + hash(c1 + c2 + st + colletto + raglan) + dove, f = 'M30 5 L42 2 Q50 9 58 2 L70 5 L95 22 L84 40 L74 34 L74 88 L26 88 L26 34 L16 40 L5 22 Z', u = tramaMaglia(c1, c2, st);
  const dis = u ? `<image href="${u}" width="100" height="90"/>` : '';
  const rag = raglan ? `<path d="M42 2 L30 5 L5 22 L16 40 L26 34 Z M58 2 L70 5 L95 22 L84 40 L74 34 Z" fill="${c2}"/><path d="M42 3 L26 34 M58 3 L74 34" stroke="rgba(0,0,0,.25)" stroke-width="1"/>` : '';
  const collo = colletto === 'v' ? `<path d="M41 2 L50 19 L59 2 Z" fill="rgba(0,0,0,.45)"/><path d="M40 1 L50 19 L60 1" fill="none" stroke="${c2}" stroke-width="4"/>`
    : colletto === 'polo' ? `<path d="M40 1 L50 4 L60 1 L64 4 L54 14 L50 6 L46 14 L36 4 Z" fill="${c2}" stroke="rgba(0,0,0,.3)" stroke-width=".8"/><rect x="48.2" y="6" width="3.6" height="18" fill="${c2}" stroke="rgba(0,0,0,.25)" stroke-width=".6"/><circle cx="50" cy="13" r="1" fill="rgba(0,0,0,.45)"/><circle cx="50" cy="19" r="1" fill="rgba(0,0,0,.45)"/>`
    : `<path d="M42 2 Q50 13 58 2" fill="none" stroke="${c2}" stroke-width="5"/>`;
  // ombreggiatura: fianchi in ombra, luce al centro, qualche piega: sembra stoffa e non un disegno piatto
  const luce = `<linearGradient id="${id}l" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".32"/><stop offset=".3" stop-color="#000" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".1"/><stop offset=".7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".32"/></linearGradient>`;
  const pieghe = '<path d="M33 48 Q40 56 36 70 M66 46 Q60 58 65 72 M44 80 Q50 76 57 81" fill="none" stroke="rgba(0,0,0,.12)" stroke-width="2.2" stroke-linecap="round"/>';
  return `<svg viewBox="0 0 100 90" class="maglia"><defs><clipPath id="${id}"><path d="${f}"/></clipPath>${luce}</defs><g clip-path="url(#${id})"><rect width="100" height="90" fill="${c1}"/>${dis}${rag}<rect x="0" y="0" width="16" height="40" fill="${c2}" opacity=".9" transform="rotate(-34 5 22)"/><rect x="84" y="0" width="16" height="40" fill="${c2}" opacity=".9" transform="rotate(34 95 22)"/>${pieghe}<rect width="100" height="90" fill="url(#${id}l)"/>${collo}</g><path d="${f}" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="1.5"/></svg>`;
}
const COPPA = '<svg viewBox="0 0 64 64" class="icona"><path d="M18 8h28v10a14 14 0 0 1-28 0z" fill="currentColor"/><path d="M18 12H9a9 9 0 0 0 11 13M46 12h9a9 9 0 0 1-11 13" fill="none" stroke="currentColor" stroke-width="4"/><rect x="29" y="31" width="6" height="12" fill="currentColor"/><path d="M20 56h24l-3-12H23z" fill="currentColor"/></svg>';
const TORRI = '<svg viewBox="0 0 64 64" class="icona"><path d="M2 60 L14 40 L22 46 L32 26 L42 46 L50 40 L62 60Z" fill="currentColor" opacity=".45"/><path d="M10 40v-14h2v-3h2v3h2v-3h2v3h2v14zM27 30V10h2V7h2v3h2V7h2v3h2v20zM44 40V26h2v-3h2v3h2v-3h2v3h2v14z" fill="currentColor"/></svg>';

/* --- ingresso: il club (nome, colori, stemma) e poi il capitano. Lo stesso modulo serve a «Personalizza» dal mio club */
const NV = { passo: 1, modifica: false, col: 0, stile: '', colletto: 'giro', raglan: false, cap: null };
// I disegni della divisa che si possono scegliere: quelli di serie, più gli speciali comprati al negozio
const stiliMiei = () => STILI.filter(([k]) => !CAR.NEGOZIO.disegno.tutti.includes(k) || (K && K.mio && CAR.possiede(K, 'disegno', k)));
const COLLETTI = [['giro', 'Girocollo'], ['v', 'Scollo a V'], ['polo', 'Polo']];
// I nove candidati di «Ingaggia il tuo capitano»: tra 70 e 78, nove ruoli diversi, un punto forte ciascuno (src/dati/scala.js)
function candidatiCapitano() { return DATI.candidatiCapitano(POSTO).map((c) => ({ c: club(c.club), x: c.x, i: c.i, v: c.s.val, s: c.s })); }
const classeStat = (v) => ({ verde: 'a', giallo: 'b', rosso: 'c' })[coloreStat(v)];
const cartaGiocatore = (c, scelto) => `<button class="cap${scelto ? ' sel' : ''}" data-cap="${c.c.id}:${c.i}"><div class="cn"><b>${esc(c.x[0])}</b><small ${attrNome(nomiDi(c.c))}>${esc(c.c.name)}</small></div><div class="at">${c.s.stat.map(([k, v]) => `<span${k === c.s.forte ? ' class="forte"' : ''}><i>${k}</i><b class="${classeStat(v)}">${v}</b></span>`).join('')}</div><div class="cartaCap">${cartaCampo(c.s, { club: c.c.id, grande: true, ferma: true, stemma: img(c.c.id + '-mini') })}</div></button>`;
function mioDaModulo() { const nome = ($('#nvClub').value.trim() || NOMI[0]).slice(0, 22), sg = ($('#nvSigla').value.trim() || sigla(nome)).slice(0, 3).toUpperCase(); return { nome, sigla: sg, c1: COLORI[NV.col][0], c2: COLORI[NV.col][1], stile: NV.stile, colletto: NV.colletto, raglan: NV.raglan }; }
function anteprimaClub() { const m = mioDaModulo(); $('#nvStemma').src = disegnaStemma(m, 160); $('#nvMaglia').innerHTML = maglia(m.c1, m.c2, m.stile, m.colletto, m.raglan); for (const b of $('#nvCol').children) b.classList.toggle('on', +b.dataset.col === NV.col); for (const b of $('#nvStile').children) b.classList.toggle('on', b.dataset.stile === NV.stile); for (const b of $('#nvColletto').children) b.classList.toggle('on', b.dataset.colletto ? b.dataset.colletto === NV.colletto : NV.raglan); }
function drawNuovo() {
  const el = $('#nuovo');
  if (NV.passo === 1) {
    const m = NV.modifica && K && K.mio ? K.mio : null;
    el.innerHTML = `<button class="indietro" id="nvInd" aria-label="Indietro">${icona('indietro')}</button><h2 class="h">${NV.modifica ? 'Personalizza il club' : 'Il tuo club'}</h2>
      <div class="nv"><div class="campi">${NV.modifica ? '' : '<label>Il tuo nome<input id="nvNome" maxlength="18" placeholder="Mister" autocomplete="off"></label>'}
        <label>Nome del club<span class="riga"><input id="nvClub" maxlength="22" autocomplete="off" placeholder="${NOMI[0]}"><button id="nvDado" aria-label="Nome a caso">🎲</button></span></label>
        <label>Sigla<input id="nvSigla" maxlength="3" autocomplete="off" placeholder="TIT"></label>
        <div class="lbl">Colori</div><div class="col" id="nvCol">${COLORI.map(([a, b], i) => `<button data-col="${i}" style="background:linear-gradient(135deg,${a} 50%,${b} 50%)"></button>`).join('')}</div>
        <div class="lbl">Disegno</div><div class="seg" id="nvStile">${stiliMiei().map(([k, n]) => `<button data-stile="${k}">${n}</button>`).join('')}</div>
        <div class="lbl">Colletto e maniche</div><div class="seg" id="nvColletto">${COLLETTI.map(([k, n]) => `<button data-colletto="${k}">${n}</button>`).join('')}<button data-raglan="1">Maniche raglan</button></div></div>
      <div class="ante"><img id="nvStemma" alt=""><div id="nvMaglia"></div></div></div>
      <button class="btn" id="nvAvanti">${NV.modifica ? 'Salva' : 'Avanti: il capitano'}</button>`;
    if (m) { $('#nvClub').value = m.nome; $('#nvSigla').value = m.sigla; NV.col = Math.max(0, COLORI.findIndex(([a, b]) => a === m.c1 && b === m.c2)); NV.stile = m.stile || ''; NV.colletto = m.colletto || 'giro'; NV.raglan = !!m.raglan; }
    anteprimaClub();
  } else {
    const cand = candidatiCapitano();
    el.innerHTML = `<div class="testaCap"><button class="indietro" id="nvInd" aria-label="${t('barra.indietro')}">${icona('indietro')}</button><div class="titoloCap"><h2 class="h">${t('capitano.titolo')}</h2><p>${t('capitano.tocca')}</p></div>${NV.cap ? `<button class="btn ingaggia" id="nvAvanti">${t('capitano.ingaggia', esc(club(NV.cap.split(':')[0]).xi[+NV.cap.split(':')[1]][0]))}</button>` : '<span class="postoIngaggia"></span>'}</div>
      <div class="caps">${cand.map((c) => cartaGiocatore(c, NV.cap === `${c.c.id}:${c.i}`)).join('')}</div>`;
    adatta(el); riempiRitratti(el);
    // i caratteri dei titoli possono arrivare un attimo dopo e allargare i nomi: allora si rifà la misura
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (NV.passo === 2) adatta(el); });
  }
}
function apriNuovo(modifica = false) { Object.assign(NV, { passo: 1, modifica, cap: null }); if (!modifica) { NV.col = 0; NV.stile = ''; NV.colletto = 'giro'; NV.raglan = false; } drawNuovo(); show('#nuovo'); }
function tapNuovo(e) {
  const b = e.target.closest('button'); if (!b) return;
  if (b.id === 'nvInd') { if (NV.passo === 2) { NV.passo = 1; drawNuovo(); return $('#nvClub') && ($('#nvClub').value = NV.club || '', $('#nvSigla').value = NV.sigla || '', $('#nvNome') && ($('#nvNome').value = NV.nome || ''), anteprimaClub()); } return NV.modifica ? indietro() : show('#home'); }
  if (b.id === 'nvDado') { const n = NOMI[(NOMI.indexOf($('#nvClub').value) + 1 + Math.floor(rnd(NOMI.length - 1))) % NOMI.length]; $('#nvClub').value = n; $('#nvSigla').value = sigla(n); return anteprimaClub(); }
  if (b.dataset.col) { NV.col = +b.dataset.col; return anteprimaClub(); }
  if (b.dataset.stile !== undefined) { NV.stile = b.dataset.stile; return anteprimaClub(); }
  if (b.dataset.colletto) { NV.colletto = b.dataset.colletto; return anteprimaClub(); }
  if (b.dataset.raglan) { NV.raglan = !NV.raglan; return anteprimaClub(); }
  if (b.dataset.cap) { NV.cap = b.dataset.cap; return drawNuovo(); }
  if (b.id !== 'nvAvanti') return;
  if (NV.passo === 1) {
    const m = mioDaModulo();
    if (NV.modifica) { K.mio = { ...K.mio, ...m }; applicaMio(); salvaK(); avviso('Club aggiornato'); return indietro(); }
    Object.assign(NV, { nome: ($('#nvNome').value.trim() || 'Mister').slice(0, 18), club: $('#nvClub').value, sigla: $('#nvSigla').value, mio: m, passo: 2 }); return drawNuovo();
  }
  const [da, i] = NV.cap.split(':');
  CAR.applica(null, CLUBS); K = CAR.nuova(CLUBS, NV.nome, POSTO, Math.random, NV.mio); CAR.applica(K, CLUBS); CAR.scegliCapitano(K, CLUBS, da, +i); applicaMio(); salvaK();
  avviso(`Benvenuto, ${K.nome}: ${K.mio.capitano} è il tuo capitano`); casa();
}

/* --- la dashboard */
// La Carriera si disegna in src/casa/vista-carriera.js: questo nome resta per chi la ridisegna da fuori
function drawHub() { disegnaCarriera(); }
/*
 * Ritratto di un giocatore (o del mister) dal modello 3D del gioco: la stessa faccia, capelli e divisa che ha in campo,
 * disegnati una volta in un'immagine piccola e tenuti in memoria. mister: senza numero né nome sulla schiena.
 */
const RITRATTI = new Map();
function ritratto(clubId, nome, num, portiere, mister = false) {
  const chiave = `${clubId}|${nome}|${portiere ? 1 : 0}`; if (RITRATTI.has(chiave)) return RITRATTI.get(chiave);
  if (!MODEL || !MODEL.scene) return '';
  let url = '';
  try {
    const c = club(clubId), ks = pickKits(c, CLUBS.find((x) => x.id !== clubId) || c), kit = portiere ? ks[2] : ks[0];
    const fig = makeSkinned(kit, hash(clubId + nome), mister ? '' : num, portiere ? null : clubId, mister ? '' : nome, {}); FIGURE.delete(fig);
    const kr = fig.metri / 2.72; // le distanze della ripresa erano pensate per una figura di 2,72 m
    const sc = new T.Scene(), luce = new T.DirectionalLight(0xffffff, 2.6), viso = new T.DirectionalLight(0xffffff, 1.6), taglio = new T.DirectionalLight(0xB9A4FF, 2.2);
    luce.position.set(1.4, 2.4, 3); viso.position.set(-.6, .4, 3); taglio.position.set(-2, 1.5, -2); sc.add(new T.HemisphereLight(0xdfe6ff, 0x2a2550, 1.8), luce, viso, taglio, fig.root);
    fig.mixer.update(0); fig.root.updateMatrixWorld(true);
    const testa = fig.bones.Head.getWorldPosition(new T.Vector3()), cam = new T.PerspectiveCamera(26, 1, .05, 20), L = 256;
    cam.position.set(testa.x + .28 * kr, testa.y + .1 * kr, testa.z + 1.15 * kr); cam.lookAt(testa.x, testa.y - .02 * kr, testa.z);
    const rt = new T.WebGLRenderTarget(L, L), prima = renderer.getRenderTarget(), col = renderer.getClearColor(new T.Color()), alfa = renderer.getClearAlpha();
    rt.texture.colorSpace = T.SRGBColorSpace;
    renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(sc, cam);
    const px = new Uint8Array(L * L * 4); renderer.readRenderTargetPixels(rt, 0, 0, L, L, px);
    renderer.setRenderTarget(prima); renderer.setClearColor(col, alfa); rt.dispose();
    const [cv2, x] = cv(L, L), dati = x.createImageData(L, L);
    // le righe arrivano dal basso: si capovolgono
    for (let r = 0; r < L; r++) dati.data.set(px.subarray((L - 1 - r) * L * 4, (L - r) * L * 4), r * L * 4);
    x.putImageData(dati, 0, 0); url = cv2.toDataURL('image/png');
  } catch (e) { url = ''; }
  RITRATTI.set(chiave, url); return url;
}
// Apre un pannello col suo titolo e il suo contenuto. trofeo: il nome di un'illustrazione da mettere accanto al titolo
// (i trofei, nelle schermate delle competizioni). Lo sfondo è quello della home, scurito.
function pan(titolo, html, trofeo = '') {
  $('#panT').innerHTML = (trofeo ? figura(trofeo, 'panTrofeo', 36) : '') + esc(titolo); $('#panC').innerHTML = html;
  $('#pan').classList.toggle('illustrata', pronta('sfondo-home')); show('#pan'); aggiornaBarra();
}
const riga = (a, b, r, rg) => `<div class="${a === K.club || b === K.club ? 'io' : ''}"><span>${esc(club(a).name)} – ${esc(club(b).name)}</span><b>${r[0]}-${r[1]}${rg ? ` (${rg[0]}-${rg[1]} rig.)` : ''}</b></div>`;
const tabella = (tab, corta) => `<table class="tab"><tr><th></th><th>Squadra</th><th>G</th>${corta ? '' : '<th>V</th><th>N</th><th>P</th>'}<th>GF</th><th>GS</th><th>DR</th><th>PT</th></tr>${tab.map((r, i) => `<tr class="${r.id === K.club ? 'io' : ''}"><td>${i + 1}</td><td>${mini(r.id)}${esc(club(r.id).name)}</td><td>${r.g}</td>${corta ? '' : `<td>${r.v}</td><td>${r.n}</td><td>${r.p}</td>`}<td>${r.gf}</td><td>${r.gs}</td><td>${r.gf - r.gs}</td><td>${r.pt}</td></tr>`).join('')}</table>`;
function panClassifica() {
  const g = K.giornata - 1;
  // il calendario del proprio club: tutte le giornate, con il risultato di quelle già giocate
  const mie = K.cal.map((gg, n) => { const i = gg.findIndex(([x, y]) => x === K.club || y === K.club), [x, y] = gg[i], r = K.ris[n] && K.ris[n][i], casa = x === K.club, avv = casa ? y : x, esito = r ? (r[casa ? 0 : 1] > r[casa ? 1 : 0] ? 'v' : r[casa ? 0 : 1] < r[casa ? 1 : 0] ? 'p' : 'n') : '';
    return `<div class="${n === K.giornata ? 'io' : ''}"><span>${n + 1}. ${casa ? 'in casa' : 'in trasferta'} · ${esc(club(avv).name)}</span><b class="${esito}">${r ? `${r[casa ? 0 : 1]}-${r[casa ? 1 : 0]}` : n === K.giornata ? 'prossima' : '–'}</b></div>`; }).join('');
  // gli obiettivi della stagione, con quelli già fatti segnati
  const D = CAR.divisione(K), sopra = DIVISIONI[K.div - 2], turno = (n) => (n === 1 ? 'ai quarti' : n === 2 ? 'in semifinale' : 'in finale');
  const frase = { posizione: (o) => `Arriva tra le prime ${o.n} in campionato (ora sei al posto ${o.ora})`, coppa: (o) => `Coppa Titano: arriva ${turno(o.n)}`, castelli: (o) => `Trofeo dei Castelli: ${o.n === 1 ? 'passa i gironi' : `arriva ${turno(o.n)}`}`, rosa: (o) => `Valutazione media dei titolari almeno ${o.n} (ora ${String(o.ora).replace('.', ',')})` };
  const obiettivi = `<div class="sez">Obiettivi della stagione</div><div class="ris2">${CAR.obiettivi(K, CLUBS).map((o) => `<div class="${o.fatto ? 'io' : ''}"><span>${frase[o.id](o)}</span><b>${o.fatto ? '✓ fatto' : 'da fare'}</b></div>`).join('')}</div>`
    + `<p class="nota2">${sopra ? `Con ${STAGIONE.servono} obiettivi su 4 sali in ${sopra.nome}.` : 'Sei nella divisione più alta.'}${K.div < DIVISIONI.length ? ` Chi arriva tra le ultime ${STAGIONE.retrocedono} scende.` : ''} Una vittoria qui vale ${D.vittoria} monete.</p>`;
  pan(`${D.nome} · stagione ${K.stagione}`, obiettivi + tabella(CAR.classifica(K, CLUBS)) + (g >= 0 ? `<div class="sez">Giornata ${g + 1}: tutti i risultati</div><div class="ris2">${K.cal[g].map(([a, b], i) => riga(a, b, K.ris[g][i])).join('')}</div>` : '')
    + `<div class="sez">Il tuo calendario</div><div class="ris2 cale">${mie}</div>`, 'trofeo-campionato');
}
// Come nelle schermate dei tornei: prima il quadro, e in cima il tasto per giocare la prossima partita
function giocaCoppa() { const p = CAR.coppaProssima(K); if (p) apri('sfida', 'coppa', p.avv, `Coppa Titano · ${p.nome.toLowerCase()}`, false, true); }
function giocaCastelli() { const p = CAR.castelliProssima(K); if (p) apri('sfida', 'castelli', p.avv, `Trofeo dei Castelli · ${p.nome.toLowerCase()}`, p.fase === 'gironi' && !p.inCasa, p.fase === 'ko'); }
const tastoGioca = (p, az) => (p ? `<button class="btn gioca2" data-az="${az}">Gioca · ${esc(p.nome)} contro ${esc(club(p.avv).name)}</button>` : '');
function panCoppa() {
  const k = K.coppa;
  pan('Coppa Titano', tastoGioca(CAR.coppaProssima(K), 'giocaCoppa') + k.storia.map((t, i) => `<div class="sez">${CAR.TURNI[i]}</div><div class="ris2">${t.map((m) => riga(m.a, m.b, m.r, m.rg)).join('')}</div>`).join('') || '<p class="vuoto">La coppa comincia dagli ottavi di finale: sedici squadre, partita secca, rigori in caso di parità.</p>', 'coppa-titano');
}
function panCastelli() {
  const k = K.castelli, mio = CAR.castelliGirone(K);
  pan('Trofeo dei Castelli', tastoGioca(CAR.castelliProssima(K), 'giocaCastelli') + `<p class="nota2">Quattro gironi da quattro, tre giornate: le prime due vanno ai quarti, poi semifinale e finale con i rigori in caso di parità.</p><div class="gironi">${k.gironi.map((g, gi) => `<div class="${gi === mio ? 'mio' : ''}"><div class="sez">Girone ${'ABCD'[gi]}</div>${tabella(CAR.castelliTabella(K, gi), true)}</div>`).join('')}</div>`
    + (k.ko ? k.ko.storia.map((t, i) => `<div class="sez">${CAR.TURNI_KO[i]}</div><div class="ris2">${t.map((m) => riga(m.a, m.b, m.r, m.rg)).join('')}</div>`).join('') : ''), 'trofeo-castelli');
}
let sTab = 'd';
function panSfide(tab) {
  if (tab) sTab = tab;
  const st = CAR.statoSfide(K), premio = (x) => premioTesto(x.monete, x.gemme, x.allenatore);
  const fine = (x, id) => (x.preso ? '<span class="fatto">✓</span>' : x.fatto ? `<button data-riscuoti="${sTab}:${id}">Riscuoti</button>` : '<span></span>');
  const righe = st[sTab].map((x) => `<div class="sfida${x.fatto ? ' ok' : ''}"><div><b>${x.t}</b><span class="barra"><i style="width:${(x.prog / x.n) * 100}%"></i></span></div><em>${x.prog}/${x.n}</em><u>${premio(x)}</u>${fine(x, x.id)}</div>`).join('');
  const b = st.bonus[sTab], bonus = b ? `<div class="sfida bonus${b.fatto ? ' ok' : ''}"><div><b>Tutte fatte</b></div><em></em><u>${premio(b)}</u>${fine(b, 'tutte')}</div>` : '';
  const quando = sTab === 'd' ? 'Ripartono a mezzanotte' : sTab === 'w' ? `Ripartono tra ${fmtTempo(CAR.fineSettimana(new Date()) - new Date())}` : sTab === 's' ? `Valgono per la stagione ${K.stagione}` : 'Si fanno una volta sola';
  pan('Sfide', `<div class="seg">${Object.entries(CAR.GRUPPI).map(([g, n]) => `<button data-stab="${g}" class="${g === sTab ? 'on' : ''}">${n} ${st.conti[g][0]}/${st.conti[g][1]}</button>`).join('')}${st.daRiscuotere ? '<button data-az="tutto" class="oro">Riscuoti tutto</button>' : ''}</div><p class="nota2">${quando}</p>${righe}${bonus}`);
}
function riscuotiTutto() { const r = CAR.riscuotiTutto(K); if (!r.n) return avviso('Niente da riscuotere: completa le sfide'); salvaK(); apriPremio({ titolo: t('premio.riscosso'), premi: premiDa({ monete: r.monete, gemme: r.gemme, punti: r.punti }) }); }
function panInfo() {
  pan('Come si gioca', `<div class="info"><div><div class="sez">In campo</div><p>Levetta a sinistra per muovere il giocatore. <b>Passa</b>, <b>Cross</b> e <b>Tira</b>: tieni premuto e la barra sotto il giocatore mostra la potenza (la tacca bianca è quella giusta per il compagno che punti, il rosso nel tiro manda la palla alta); un tocco veloce su Passa o Cross fa il passaggio dosato da solo. <b>Scatto</b> per correre. Senza palla: <b>Cambia</b> giocatore e <b>Scivolata</b> (da dietro è fallo). La scritta sopra la mappa cambia la mentalità; dalla pausa si fanno le sostituzioni.</p>
    <div class="sez">La carriera</div><p>Campionato a 16 squadre, Coppa Titano a eliminazione diretta e Trofeo dei Castelli a gironi. Le partite danno monete; le sfide e il percorso premi danno monete e diamanti. Con le monete si fanno scambi al mercato e sedute di allenamento; con monete e diamanti si migliorano l'allenatore e lo stadio, che rende di più a ogni partita in casa.</p></div>
    <div><div class="sez">Il salvataggio</div><p>La carriera resta su questo dispositivo. Con l'accesso all'account Fantatitano si salva anche sull'account e si ritrova su un altro telefono: dentro l'app è automatico, qui si accede dal profilo in alto a destra.</p>
    <div class="sez">Tastiera</div><p>Frecce per muoversi, X passa, C cross, Spazio tira, Shift scatto, P pausa.</p></div></div>`);
}
function accountHtml() {
  const a = CLOUD.info(), u = a.utente;
  if (u) return `<div class="acc"><p>Connesso come <b>${esc(u.nome || u.email)}</b>${u.email && u.nome !== u.email ? ` (${esc(u.email)})` : ''}. La carriera si salva anche sul tuo account.</p><p class="nota2" id="accStato">${testoCloud(a.stato)}</p><div class="seg"><button data-az="salvaora">Salva adesso</button><button data-az="esci">Esci</button></div></div>`;
  if (a.stato === 'spento') return '<div class="acc"><p>Il salvataggio sull\'account non è raggiungibile adesso: la carriera resta su questo dispositivo. Riprova più tardi.</p></div>';
  return `<div class="acc"><p>Accedi con l'account Fantatitano per salvare la carriera e ritrovarla su un altro telefono.</p><div class="form"><input id="accEmail" type="email" autocomplete="username" placeholder="Email" enterkeyhint="next"><input id="accPw" type="password" autocomplete="current-password" placeholder="Password" enterkeyhint="go"><button data-az="accedi" class="oro">Accedi</button></div><p class="nota2" id="accErr"></p><p class="nota2">Non hai un account? Crealo nell'app Fantatitano su <b>fantatitano.site</b>, poi torna qui.</p></div>`;
}
function panProfilo() {
  const st = K ? K.stat : null, top = K && CAR.capocannoniere(K), d = (v, e) => `<div><b>${v}</b><span>${e}</span></div>`;
  pan(K ? K.nome : 'Account', (K ? `<div class="sez">Avatar del manager</div><div class="avat">${CAR.NEGOZIO.avatar.tutti.filter((n) => CAR.possiede(K, 'avatar', n)).map((n) => `<button data-avatar="${n}" class="${n === (K.avatar || 0) ? 'on' : ''}"><img src="${ritratto(K.club, avatarNome(n), '', false, true)}" alt=""></button>`).join('')}</div><div class="seg"><button data-club="personalizza">Personalizza il club: nome, colori, disegno</button><button data-ntab="manager">Altri avatar e cornici</button><button data-ntab="stemma">Pezzi dello stemma</button></div>` : '') + `<div class="sez">Account</div>${accountHtml()}` + (K ? `<div class="sez">${esc(club(K.club).name)}</div><div class="dati">${d(CAR.divisione(K).nome, 'Divisione')}${d(K.stagione, 'Stagione')}${d(st.g, 'Partite')}${d(`${st.v}-${st.n}-${st.p}`, 'Vinte-pari-perse')}${d(`${st.gf}-${st.gs}`, 'Gol fatti-subiti')}</div>`
    + `<div class="sez">Capocannoniere</div><p class="vuoto">${top ? `${esc(top.nome)} · ${top.gol} gol` : 'Ancora nessun gol'}</p>`
    + `<div class="sez">Trofei</div><p class="vuoto">${K.trofei.length ? K.trofei.map((t) => `${t.tipo === 'Campionato' && t.div ? DIVISIONI[t.div - 1].nome : t.tipo} (stagione ${t.stagione})`).join(' · ') : 'Ancora nessuno'}</p>`
    + `<div class="sez">Mercato</div><p class="vuoto">${K.movimenti.length ? K.movimenti.slice(0, 6).map((m) => (m.preso ? `Preso ${esc(m.preso)}${m.da && club(m.da) ? ` (${esc(club(m.da).name)})` : ''} per ${mon(m.costo)} monete` : `Venduto ${esc(m.ceduto)} per ${mon(-m.costo)} monete`)).join(' · ') : 'Ancora nessun movimento'}</p>` : ''));
}
/* --- pannelli della home nuova (docs/home-spec.md) */
// L'avatar del manager: un busto generico disegnato dal modello 3D, scelto tra quelli del negozio (cambia il seme, quindi faccia e capelli)
const avatarNome = (n) => `${K.nome}${n ? `#${n}` : ''}`;
// Quanti pezzi dello stemma si hanno, in percentuale (NEGOZIO in src/carriera.js)
const stemmaFatto = () => CAR.pezziStemma(K);
const premioTesto = (m, g, a) => [m ? `${MO} ${mon(m)}` : '', g ? `${DI} ${g}` : '', a ? `allenatore ${a}` : ''].filter(Boolean).join(' ');
/** Percorso premi della stagione: venti livelli, si sale coi punti di partite e sfide, ogni livello ha un premio da ritirare. */
function panPercorso(msg) {
  const pe = CAR.statoPercorso(K), E = ECONOMIA.percorso.punti, fine = pe.livello >= pe.livelli;
  const tessere = pe.premi.map((x) => `<button class="liv${x.preso ? ' preso' : x.raggiunto ? ' pronto' : ''}" ${x.raggiunto && !x.preso ? `data-ritira="${x.livello}"` : 'disabled'}><i>${x.livello}</i><b>${premioTesto(x.monete, x.gemme, x.allenatore)}</b><u>${x.preso ? 'Ritirato' : x.raggiunto ? 'Ritira' : ''}</u></button>`).join('');
  pan(`Percorso premi · stagione ${K.stagione}`, `${msg ? `<p class="avviso">${msg}</p>` : ''}<div class="perc"><b>Livello ${pe.inCorso} di ${pe.livelli}</b><span class="barra"><i style="width:${fine ? 100 : Math.round(pe.nelLivello / pe.perLivello * 100)}%"></i></span><em>${fine ? 'Percorso completato' : `${pe.nelLivello}/${pe.perLivello} punti`}</em>${pe.daRitirare ? '<button data-az="ritiraTutto" class="oro">Ritira tutto</button>' : ''}</div><div class="livelli">${tessere}</div>`
    + `<p class="nota2">Punti: partita giocata ${E.partita}, vittoria +${E.vinta}, sfida di oggi riscossa ${E.sfidaD}, obiettivo della settimana ${E.sfidaW}, sfida di stagione ${E.sfidaS}, turno di coppa superato ${E.turno}. Il percorso riparte da zero a ogni stagione.</p>`);
}
/* --- il negozio: quello che si compra con diamanti e monete. Solo aspetto e comodità, niente che aiuti in partita
   (docs/home-spec.md, §5.5). Una cosa non ancora presa si compra in due tocchi: il primo mostra «Conferma», il secondo paga. */
const NOMI_NEGOZIO = {
  cornice: { semplice: 'Semplice', oro: 'Oro', azzurra: 'Azzurra', lime: 'Lime', fuoco: 'Fuoco' },
  scarpini: { misti: 'Ognuno i suoi', neri: 'Neri', bianchi: 'Bianchi', oro: 'Oro', azzurri: 'Azzurri', lime: 'Lime', arancio: 'Arancio', rosa: 'Rosa' },
  pallone: { classico: 'Classico', oro: 'Oro', azzurro: 'Azzurro', notte: 'Notte', arancio: 'Arancio' },
  forma: { scudo: 'Scudo', tondo: 'Tondo', stendardo: 'Stendardo', rombo: 'Rombo', esagono: 'Esagono' },
  simbolo: { corona: 'Corona', stella: 'Stella', pallone: 'Pallone', torre: 'Torre', nessuno: 'Nessuno', fulmine: 'Fulmine', tretorri: 'Tre torri', alloro: 'Alloro' },
  bordo: { semplice: 'Semplice', doppio: 'Doppio', sottile: 'Sottile', punti: 'A punti', oro: 'Oro' },
};
let nTab = 'stemma', nArmato = '';
function panNegozio(tab, msg) {
  if (tab) { nTab = tab; nArmato = ''; }
  const m = K.mio && K.club === POSTO ? K.mio : null, sc = K.scelte || (K.scelte = {}), me = club(K.club);
  const voce = (tipo, cosa, nome, scelto, dentro = '') => {
    const ho = CAR.possiede(K, tipo, cosa), c = CAR.costoOggetto(tipo, cosa), id = `${tipo}:${cosa}`, arm = nArmato === id, caro = K.monete < c.monete || K.gemme < c.gemme;
    return `<button class="ogg${scelto ? ' on' : ''}${ho ? '' : ' chiuso'}${arm ? ' arm' : ''}" data-ogg="${id}" ${!ho && caro ? 'disabled' : ''}>${dentro}<b>${nome}</b><u>${ho ? (scelto ? 'In uso' : 'Usa') : arm ? `Conferma ${premioTesto(c.monete, c.gemme)}` : premioTesto(c.monete, c.gemme)}</u></button>`;
  };
  const fila = (titolo, tipo, scelto, dentro) => `<div class="sez">${titolo}</div><div class="oggetti">${CAR.NEGOZIO[tipo].tutti.map((x) => voce(tipo, x, NOMI_NEGOZIO[tipo] ? NOMI_NEGOZIO[tipo][x] : x, x === scelto, dentro ? dentro(x) : '')).join('')}</div>`;
  const tabs = `<div class="seg">${[['stemma', 'Stemma'], ['divisa', 'Divisa'], ['manager', 'Manager'], ['squadra', 'Squadra']].map(([k, n]) => `<button data-ntab="${k}" class="${k === nTab ? 'on' : ''}">${n}</button>`).join('')}</div>`;
  const soloMio = '<p class="vuoto">Stemma e divisa si personalizzano col club creato da te all\'inizio della carriera.</p>';
  let corpo;
  if (nTab === 'stemma') {
    corpo = m ? `<div class="negozio"><img class="ante" src="${disegnaStemma(m, 200)}" alt=""><div><p class="nota2">Hai il ${CAR.pezziStemma(K)}% dei pezzi. I pezzi semplici costano monete, quelli rari diamanti: una volta presi restano tuoi.</p>`
      + fila('Forma', 'forma', m.forma || 'scudo') + fila('Simbolo in cima', 'simbolo', m.simbolo || 'corona') + fila('Bordo', 'bordo', m.bordo || 'semplice') + '</div></div>' : soloMio;
  } else if (nTab === 'divisa') {
    const terza = CAR.possiede(K, 'terza', 'terza'), t3 = m && m.terza;
    corpo = m ? `<div class="negozio"><div class="ante">${maglia(me.c1, me.c2, me.st, m.colletto || 'giro', !!m.raglan, 'n')}</div><div>`
      + fila('Disegni speciali della prima maglia', 'disegno', m.stile, (x) => `<i class="mg">${maglia(m.c1, m.c2, x, m.colletto || 'giro', !!m.raglan, 'n')}</i>`).replace(/>(onde|chevron|sfumata|mimetica|pennellata)</g, (_, k) => `>${STILI.find(([s]) => s === k)[1]}<`)
      + `<div class="sez">Terza maglia</div>` + (terza && t3
        ? `<div class="seg"><button data-indossa="prima" class="${m.indossa === 'terza' ? '' : 'on'}">In partita: prima maglia</button><button data-indossa="terza" class="${m.indossa === 'terza' ? 'on' : ''}">In partita: terza maglia</button></div>`
          + `<div class="col">${COLORI.map(([a, b], i) => `<button data-tcol="${i}" class="${a === t3.c1 && b === t3.c2 ? 'on' : ''}" style="background:linear-gradient(135deg,${a} 50%,${b} 50%)"></button>`).join('')}${COLORI.map(([a, b], i) => `<button data-tcol="${i + COLORI.length}" class="${b === t3.c1 && a === t3.c2 ? 'on' : ''}" style="background:linear-gradient(135deg,${b} 50%,${a} 50%)"></button>`).join('')}</div>`
          + `<div class="seg">${stiliMiei().map(([k, n]) => `<button data-tstile="${k}" class="${(t3.stile || '') === k ? 'on' : ''}">${n}</button>`).join('')}</div>`
        : `<div class="oggetti">${voce('terza', 'terza', 'Una divisa in più, coi colori che vuoi', false)}</div>`) + '</div></div>' : soloMio;
  } else if (nTab === 'manager') {
    corpo = fila('Avatar del manager', 'avatar', K.avatar || 0, (n) => `<img src="${ritratto(K.club, avatarNome(n), '', false, true)}" alt="">`).replace(/<b>\d<\/b>/g, '<b></b>')
      + fila('Cornice del ritratto', 'cornice', CAR.possiede(K, 'cornice', sc.cornice) ? sc.cornice : 'semplice', (x) => `<i class="tondo cor-${x}"></i>`);
  } else {
    corpo = fila('Scarpini della squadra', 'scarpini', CAR.possiede(K, 'scarpini', sc.scarpini) ? sc.scarpini : 'misti', (x) => `<i class="tondo" style="background:${SCARPE_NEGOZIO[x] ? SCARPE_NEGOZIO[x][0] : 'conic-gradient(#16161a,#F3F3F3,#D9F51F,#FF5A1F,#1E6FB5,#16161a)'}"></i>`)
      + fila('Pallone delle partite in casa', 'pallone', CAR.possiede(K, 'pallone', sc.pallone) ? sc.pallone : 'classico', (x) => `<i class="tondo" style="background:radial-gradient(circle at 50% 50%,${PALLONI[x][1][1]} 0 28%,${PALLONI[x][0]} 30%)"></i>`);
  }
  pan('Negozio', `${msg ? `<p class="avviso">${msg}</p>` : ''}${tabs}${corpo}<p class="nota2">Qui si comprano solo aspetto e comodità: niente di quello che c'è nel negozio rende più forte la squadra.</p>`);
}
/** Mette in uso un oggetto del negozio che si ha già. */
function usaOggetto(tipo, cosa) {
  const m = K.mio && K.club === POSTO ? K.mio : null; K.scelte = K.scelte || {};
  if (tipo === 'avatar') K.avatar = cosa;
  else if (tipo === 'cornice' || tipo === 'scarpini' || tipo === 'pallone') K.scelte[tipo] = cosa;
  else if (!m) return;
  else if (tipo === 'disegno') m.stile = cosa;
  else if (tipo === 'terza') { if (!m.terza) m.terza = { c1: m.c2, c2: m.c1, stile: '' }; m.indossa = 'terza'; }
  else m[tipo] = cosa;
  applicaMio();
}
let armato = false;
function panImp() {
  pan('Impostazioni', `<div class="sez">Difficoltà</div><div class="seg">${Object.keys(DIFF).map((d) => `<button data-d="${d}" class="${d === sel.diff ? 'on' : ''}">${d}</button>`).join('')}</div>`
    + `<div class="sez">Audio</div><div class="seg"><button data-az="audio" class="${AU.on ? '' : 'on'}">Muto: ${AU.on ? 'no' : 'sì'}</button></div>`
    + `<label class="vol">Volume musica<input type="range" min="0" max="100" step="5" data-vol="musica" value="${Math.round(AU.vol.musica * 100)}"><b>${Math.round(AU.vol.musica * 100)}</b></label>`
    + `<label class="vol">Volume effetti<input type="range" min="0" max="100" step="5" data-vol="effetti" value="${Math.round(AU.vol.effetti * 100)}"><b>${Math.round(AU.vol.effetti * 100)}</b></label>`
    + `<div class="sez">Comandi</div><div class="seg"><button data-az="assistito" class="${sel.assistito ? 'on' : ''}">Passaggio assistito: ${sel.assistito ? 'sì' : 'no'}</button></div>`
    + `<div class="sez">Qualità grafica</div><div class="seg">${[['auto', 'Automatica'], ['alta', 'Alta'], ['media', 'Media'], ['bassa', 'Bassa']].map(([k, n]) => `<button data-q="${k}" class="${k === sel.qual ? 'on' : ''}">${n}</button>`).join('')}</div><p class="nota2">Automatica: parte al massimo e si alleggerisce da sola se il telefono fatica. Per tornare a una qualità più alta dopo averla abbassata, chiudi e riapri il gioco.</p>`
    + `<div class="sez">Lingua</div><div class="seg"><button class="on">Italiano</button></div>`
    + `<div class="sez">Account</div>${accountHtml()}`
    + (K ? `<div class="sez">Carriera</div><div class="seg"><button data-az="reset">${armato ? 'Sicuro? Tocca ancora per cancellare tutto, anche dall\'account' : 'Ricomincia la carriera da capo'}</button></div>` : ''));
}
// Torna ai menu. Senza carriera: il benvenuto. Con la carriera: la schermata da cui si era partiti, che all'avvio è la
// Home. Dopo una partita la Sfida non serve più e si torna a quella sotto: Carriera, Amichevole e così via.
const casa = () => { if (K) tornaSotto('sfida', 'sfidaLibera'); else { drawHome(); show('#home'); } };
function drawHome() { $('#home').classList.toggle('illustrata', pronta('tre-torri')); $('#carr').textContent = K ? 'Continua la carriera' : 'Inizia la carriera'; const u = CLOUD.info().utente; $('#hAcc').textContent = u ? `Connesso come ${u.nome || u.email}` : 'Accedi con l\'account Fantatitano'; }

/* --- salvataggio: sempre sul dispositivo, e sull'account se c'è l'accesso */
let syncT = 0;
function salvaK() { if (!K) return; aggiornaBarra(); CAR.salva(K); clearTimeout(syncT); syncT = setTimeout(sincronizza, 1200); }
const testoCloud = (s) => ({ salvato: 'Salvata sull\'account', salvo: 'Salvataggio sull\'account…', errore: 'Salvataggio sull\'account non riuscito: si riprova alla prossima partita', pronto: 'Collegato all\'account' }[s] || '');
function aggiornaCloud() {
  const a = CLOUD.info(), el = $('#hCloud'); if (el) { el.className = a.utente ? a.stato : 'fuori'; el.title = a.utente ? testoCloud(a.stato) : 'Solo su questo dispositivo: accedi per salvare sull\'account'; }
  const s = $('#accStato'); if (s) s.textContent = testoCloud(a.stato);
  if (!$('#home').classList.contains('nas')) drawHome();
}
// La copia sull'account conta solo se è una carriera che si può continuare: quelle di prima delle divisioni no, e la
// copia del telefono prende il loro posto
const daContinuare = (o) => (o && o.dati && o.dati.v === 2 ? o.dati : null);
async function sincronizza(forza = false) {
  if (!K || !CLOUD.info().utente) return;
  const r = await CLOUD.salva(K, forza);
  if (r.conflitto) { // un altro dispositivo ha salvato dopo: si sceglie quale tenere
    const o = await CLOUD.carica().catch(() => null), q = CLOUD.scegli(K, daContinuare(o));
    if (q === 'online') adotta(o.dati, 'Ripresa la copia più avanti dal tuo account'); else if (q === 'chiedi') chiediQuale(o.dati); else await CLOUD.salva(K, true);
  }
}
function adotta(dati, msg) {
  const nuova = CAR.completa(JSON.parse(JSON.stringify(dati)), CLUBS); if (!nuova) return;
  CAR.applica(null, CLUBS); K = nuova; CAR.applica(K, CLUBS); applicaMio(); CAR.salva(K); if (msg) avviso(msg);
  if (['#casa', '#carriera', '#home', '#pan'].some((id) => !$(id).classList.contains('nas'))) casa();
}
// Dopo l'accesso (o all'avvio con la sessione già aperta): si confronta la copia del telefono con quella dell'account
async function allAccesso() {
  let o = null; try { o = await CLOUD.carica(); } catch (e) { return; }
  const q = CLOUD.scegli(K, daContinuare(o));
  if (q === 'online') adotta(o.dati, 'Carriera ritrovata dal tuo account'); else if (q === 'locale') sincronizza(true); else if (q === 'chiedi') chiediQuale(o.dati);
}
function chiediQuale(online) {
  const desc = (C) => { const c = club(C.club), nome = C.mio && C.mio.nome && C.club === POSTO ? C.mio.nome : c ? c.name : C.club; return `<b>${esc(nome)}</b><span>${esc(C.nome)} · stagione ${C.stagione}, giornata ${C.giornata} · ${C.trofei.length} trofei</span>`; };
  chiediQuale.online = online;
  pan('Due carriere', `<p class="nota2">Sul tuo account c'è una carriera diversa da quella di questo telefono. Quale tieni? L'altra viene sostituita.</p><div class="due"><button data-az="tieniOnline">${desc(online)}<em>Quella dell'account</em></button><button data-az="tieniLocale">${desc(K)}<em>Quella di questo telefono</em></button></div>`);
}
async function tapAccount(az) {
  if (az === 'accedi') { const e = $('#accErr'); e.textContent = 'Accesso…'; const r = await CLOUD.accedi($('#accEmail').value, $('#accPw').value); if (!r.ok) { e.textContent = r.errore; return true; } avviso('Accesso fatto'); await allAccesso(); if (!$('#pan').classList.contains('nas') && $('#panT').textContent !== 'Due carriere') casa(); return true; }
  if (az === 'esci') { await CLOUD.esci(); avviso('Sei uscito: la carriera resta su questo dispositivo'); if (!$('#pan').classList.contains('nas')) panProfilo(); return true; }
  if (az === 'salvaora') { await sincronizza(); avviso(CLOUD.info().stato === 'salvato' ? 'Salvata sull\'account' : 'Salvataggio non riuscito'); return true; }
  if (az === 'tieniOnline') { adotta(chiediQuale.online, 'Tenuta la carriera dell\'account'); casa(); return true; }
  if (az === 'tieniLocale') { await CLOUD.salva(K, true); avviso('Tenuta la carriera di questo telefono'); casa(); return true; }
  return false;
}
function buildMenu() {
  const g = $('#griglia');
  g.innerHTML = CLUBS.map((c) => `<button class="sq" data-id="${c.id}"><img src="${img(c.id)}" alt=""><span>${c.name}</span></button>`).join('');
  const refresh = () => {
    for (const el of g.children) { el.classList.toggle('mia', el.dataset.id === sel.mia); el.classList.toggle('loro', el.dataset.id === sel.loro); }
    $('#sceltaT').textContent = !sel.mia ? 'Scegli la tua squadra' : !sel.loro ? "Scegli l'avversaria" : 'Tutto pronto';
    $('#sceltaP').textContent = !sel.mia ? 'Passo 1 di 2' : !sel.loro ? 'Passo 2 di 2' : `${club(sel.mia).name} — ${club(sel.loro).name}`;
    $('#inizio').disabled = !(sel.mia && sel.loro);
  };
  g.addEventListener('click', (e) => {
    const b = e.target.closest('.sq'); if (!b) return; const id = b.dataset.id;
    if (id === sel.mia) { sel.mia = null; sel.loro = null; } else if (!sel.mia) sel.mia = id; else sel.loro = id === sel.loro ? null : id;
    refresh();
  });
  $('#diff').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; sel.diff = b.dataset.d; for (const x of $('#diff').children) x.classList.toggle('on', x === b); save(); });
  const vai = () => { AU.init(); try { screen.orientation.lock('landscape').catch(() => {}); } catch (e) { /* dove non si può bloccare ci pensa resize() */ } G.comp = null; sel.mia = sel.loro = null; show('#scelta'); refresh(); };
  $('#vai').onclick = vai;
  // le schermate, ognuna col suo nome: la navigazione le apre e ci torna con Indietro (docs/navigazione.md)
  rotta('home', () => { show('#casa'); disegnaHome(); });
  rotta('carriera', () => { show('#carriera'); disegnaCarriera(); });
  rotta('classifica', panClassifica); rotta('coppa', panCoppa); rotta('castelli', panCastelli);
  rotta('sfide', (tab) => panSfide(tab)); rotta('percorso', () => panPercorso()); rotta('guadagna', panGuadagna);
  rotta('profilo', panProfilo); rotta('info', panInfo); rotta('impostazioni', () => { armato = false; panImp(); });
  rotta('mercato', () => panMercato()); rotta('allenamento', panAllenamento);
  rotta('club', (tab) => panClubMio(tab)); rotta('negozio', (tab) => panNegozio(tab)); rotta('personalizza', () => apriNuovo(true));
  rotta('amichevole', vai); rotta('sfidaLibera', () => { show('#sfida'); disegnaSfida({ tipo: 'amichevole', mia: sel.mia, loro: sel.loro, fuori: false, rigori: false }); });
  rotta('squadra', () => { show('#squadra'); apriSquadra(); });
  rotta('sfida', (tipo, avv, titolo, fuori, rigori) => { show('#sfida'); disegnaSfida({ tipo, mia: K.club, loro: avv, fuori: !!fuori, rigori: !!rigori }); });
  $('#indietro').onclick = casa;
  $('#inizio').onclick = () => { if (K) return apri('sfidaLibera'); show('#sfida'); disegnaSfida({ tipo: 'amichevole', mia: sel.mia, loro: sel.loro, fuori: false, rigori: false, indietro: () => { show('#scelta'); refresh(); } }); }; $('#preInd').onclick = () => { if (G.comp) casa(); else { show('#scelta'); refresh(); } };
  // ingresso e dashboard
  $('#nuovo').addEventListener('click', tapNuovo);
  $('#nuovo').addEventListener('input', (e) => { if (e.target.id === 'nvSigla') e.target.dataset.mano = 1; if (e.target.id === 'nvClub' && !$('#nvSigla').dataset.mano) $('#nvSigla').value = sigla(e.target.value); if (NV.passo === 1) anteprimaClub(); });
  $('#carr').onclick = () => { AU.init(); if (K) casa(); else apriNuovo(); };
  $('#hAcc').onclick = () => panProfilo();
  const clubAz = (k) => (k === 'personalizza' ? (K.mio && K.club === POSTO ? apri('personalizza') : avviso('Si personalizza il club creato all\'inizio della carriera')) : k === 'amichevole' ? apri('amichevole') : k === 'allenamento' ? apri('allenamento') : apri('club', k));
  $('#campoA').addEventListener('click', tapRosa);
  $('#panInd').onclick = () => (K ? indietro() : casa()); $('#continua').onclick = () => { const fine = chiudiPonte(true); toMenu(); if (fine) fine(); };
  // i cursori del volume (impostazioni): musica ed effetti separati, salvati sul dispositivo
  $('#panC').addEventListener('input', (e) => { const r = e.target.closest('input[data-vol]'); if (!r) return; AU.init(); AU.volume(r.dataset.vol, r.value / 100); r.nextElementSibling.textContent = r.value; if (r.dataset.vol === 'effetti') AU.calcio(12, 'passaggio'); });
  $('#panC').addEventListener('click', async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.az && await tapAccount(b.dataset.az)) return;
    if (b.dataset.stab) return apri('sfide', b.dataset.stab);
    if (b.dataset.riscuoti) { const [g, id] = b.dataset.riscuoti.split(':'), r = CAR.riscuoti(K, g, id); if (r.ok) { salvaK(); apriPremio({ titolo: t('premio.riscosso'), premi: premiDa({ monete: r.monete, gemme: r.gemme, allenatori: r.allenatore ? 1 : 0, rarita: r.allenatore || 'raro', punti: r.punti }) }); } return panSfide(); }
    if (b.dataset.az === 'inArrivo') return avviso(t('inArrivo'));
    if (b.dataset.az === 'giocaCoppa') return giocaCoppa();
    if (b.dataset.az === 'giocaCastelli') return giocaCastelli();
    if (b.dataset.az === 'tutto') { riscuotiTutto(); return panSfide(); }
    if (b.dataset.ctab) return apri('club', b.dataset.ctab);
    if (b.dataset.ritira || b.dataset.az === 'ritiraTutto') { const livello = +(b.dataset.ritira || 0), q = CAR.ritiraPercorso(K, livello); if (q.ok) { salvaK(); apriPremio({ titolo: t('premio.percorso'), sotto: livello ? t('premio.livello', livello) : '', busta: 'percorso', premi: premiDa({ monete: q.monete, gemme: q.gemme, allenatori: q.allenatori, rarita: 'raro' }) }); } return panPercorso(); }
    if (b.dataset.az === 'guadagna') return apri('guadagna');
    if (b.dataset.ntab) return apri('negozio', b.dataset.ntab);
    if (b.dataset.ogg) {
      const [tipo, cosa0] = b.dataset.ogg.split(':'), cosa = tipo === 'avatar' ? +cosa0 : cosa0; let detto = '';
      if (!CAR.possiede(K, tipo, cosa)) {
        if (nArmato !== b.dataset.ogg) { nArmato = b.dataset.ogg; return panNegozio(); }
        const q = CAR.compraOggetto(K, tipo, cosa); nArmato = ''; if (!q.ok) return panNegozio(null, 'Servono più monete o diamanti'); detto = `Comprato: ${premioTesto(q.monete, q.gemme)}`;
      }
      nArmato = ''; usaOggetto(tipo, cosa); salvaK(); return panNegozio(null, detto);
    }
    if (b.dataset.indossa && K.mio) { K.mio.indossa = b.dataset.indossa; applicaMio(); salvaK(); return panNegozio(); }
    if (b.dataset.tcol && K.mio && K.mio.terza) { const i = +b.dataset.tcol, [a, c2] = COLORI[i % COLORI.length]; Object.assign(K.mio.terza, i < COLORI.length ? { c1: a, c2 } : { c1: c2, c2: a }); applicaMio(); salvaK(); return panNegozio(); }
    if (b.dataset.tstile !== undefined && K.mio && K.mio.terza) { K.mio.terza.stile = b.dataset.tstile; applicaMio(); salvaK(); return panNegozio(); }
    if (b.dataset.avatar) { K.avatar = +b.dataset.avatar; salvaK(); return panProfilo(); }
    if (b.dataset.q) { sel.qual = b.dataset.q; save(); return panImp(); }
    if (b.dataset.az === 'assistito') { sel.assistito = !sel.assistito; PASSAGGIO.assistito = sel.assistito; save(); return panImp(); }
    if (b.dataset.club) return clubAz(b.dataset.club);
    if (toccaEconomia(b)) return;
    if (b.dataset.d) { sel.diff = b.dataset.d; save(); for (const x of $('#diff').children) x.classList.toggle('on', x.dataset.d === sel.diff); }
    else if (b.dataset.az === 'audio') { AU.init(); AU.toggle(); }
    else if (b.dataset.az !== 'reset') return;
    else { if (!armato) armato = true; else { armato = false; CAR.cancella(); CLOUD.cancella(); K = null; azzera(); CAR.applica(null, CLUBS); applicaMio(); drawHome(); return show('#home'); } }
    panImp();
  });
  $('#gioca').onclick = () => startMatch(sel.mia, sel.loro, sel.diff);
  for (const id of ['#segForm', '#segFormP', '#segMent', '#segMentP', '#segOra']) $(id).addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.f) sel.form = b.dataset.f; else if (b.dataset.o) sel.ora = b.dataset.o; else sel.ment = +b.dataset.m; tactics(); });
  for (const x of $('#diff').children) x.classList.toggle('on', x.dataset.d === sel.diff);
  tactics();
  AU.musica(true); // la musica dei menu parte al primo tocco (prima i browser non lasciano suonare)
  $('#rivincita').onclick = () => startMatch(sel.mia, sel.loro, sel.diff);
  $('#cambia').onclick = () => { toMenu(); G.comp = null; show('#scelta'); refresh(); };
}

/** All'avvio: legge la carriera salvata sul dispositivo e mette nelle squadre le sue rose e il club dell'utente. */
function caricaCarriera() { K = CAR.carica(); if (K && !club(K.club)) K = null; CAR.applica(K, CLUBS); applicaMio(); }

// quello che la partita (src/game.js) prende da qui
export { club, moduloMio, pan, mini, premioTesto, DATI, fmtTempo, ritratto, consigliato, avviso, ridisegna, maglia, show, sel, save, esc, ovr, RUOLO, showPre, K, mon, forzaClub, applicaMio, attributi, candidatiCapitano, apriNuovo, drawHub, panCastelli, panSfide, panClubMio, panProfilo, panImp, casa, salvaK, aggiornaCloud, adotta, allAccesso, buildMenu, caricaCarriera };
