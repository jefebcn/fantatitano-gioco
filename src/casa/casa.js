/* Fantatitano — La Partita. La home, i menu e le schermate fuori dalla partita: ingresso e creazione del club, carriera,
   pannelli (classifica, coppe, sfide, mercato, club, negozio, impostazioni), prima della partita, salvataggio.
   Le schermate (casa.html) e i loro stili (casa.css) si aggiungono alla pagina all'avvio.
   Dalla partita (src/game.js) arrivano il modello 3D per i ritratti, le maglie, l'audio e l'avvio della gara: l'elenco
   è nell'import qui sotto. Il formato dei dati tra home e partita verso cui andare è in docs/ponte-partita.md. */
import * as T from 'three';
import { DISEGNI } from '../divisa.js';
import * as CLOUD from '../cloud.js';
import * as CAR from '../carriera.js';
import { ECONOMIA, DIFF, FORMS, PASSAGGIO } from '../config.js';
import { aiForm, $, rnd, clamp, hash, IMGX, img, G, renderer, cv, SCARPE_NEGOZIO, stemmi3d, makeSkinned, FIGURE, formaMaglia, pickKits, PALLONI, kitsFor, AU, tactics, club, startMatch, toMenu, CREST, loadImg, MODEL } from '../game.js';
import HTML_CASA from './casa.html';
import CSS_CASA from './casa.css';

// le schermate della home e i loro stili entrano nella pagina prima di tutto il resto, nel punto dov'erano
document.head.insertAdjacentHTML('beforeend', `<style id="casaStili">${CSS_CASA}</style>`);
document.getElementById('vs').insertAdjacentHTML('beforebegin', HTML_CASA);

const show = (id) => { for (const s of ['#home', '#nuovo', '#hub', '#pan', '#scelta', '#pre', '#vs', '#stop', '#cambi', '#fine']) $(s).classList.toggle('nas', s !== id); };
const sel = { mia: null, loro: null, diff: 'normale', form: '4-3-3', ment: 0, ora: 'giorno', qual: 'auto', assistito: PASSAGGIO.assistito };
const SAVE = 'fantatitano-partita';
try { const v = JSON.parse(localStorage.getItem(SAVE) || '{}'); if (FORMS[v.form]) sel.form = v.form; if ([-1, 0, 1].includes(v.ment)) sel.ment = v.ment; if (DIFF[v.diff]) sel.diff = v.diff; if (v.ora === 'notte' || v.ora === 'giorno') sel.ora = v.ora; if (['auto', 'alta', 'media', 'bassa'].includes(v.qual)) sel.qual = v.qual; if (typeof v.assistito === 'boolean') sel.assistito = v.assistito; } catch (e) { /* si parte dai valori di base */ }
// il passaggio assistito scelto nelle impostazioni vale da subito (PASSAGGIO.assistito in config.js è il valore di partenza)
PASSAGGIO.assistito = sel.assistito;
const save = () => { try { localStorage.setItem(SAVE, JSON.stringify({ form: sel.form, ment: sel.ment, diff: sel.diff, ora: sel.ora, qual: sel.qual, assistito: sel.assistito })); } catch (e) { /* senza memoria si gioca lo stesso */ } };
const esc = (n) => String(n).replace(/[<>&"]/g, '');
// Valore del giocatore da 55 a 88, confrontato con quelli del suo ruolo
const RANGE = {}; for (const c of CLUBS) for (const [, r, , q] of c.xi) { const v = RANGE[r] || (RANGE[r] = [q, q]); v[0] = Math.min(v[0], q); v[1] = Math.max(v[1], q); }
const ovr = (r, q) => Math.round(55 + clamp((q - RANGE[r][0]) / (RANGE[r][1] - RANGE[r][0] || 1), 0, 1) * 33);
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
const forzaClub = (c) => clamp(Math.round((c.xi.reduce((s, x) => s + ovr(x[1], x[3]), 0) / c.xi.length - 58) / 5), 1, 5);
/** Mette sul posto della SM Academy U22 il club dell'utente (nome, sigla, colori, stemma), o la rimette com'era se non c'è. */
function applicaMio() {
  const c = club(POSTO); if (!c) return;
  if (!c.orig) c.orig = { name: c.name, short: c.short, c1: c.c1, c2: c.c2, st: c.st, col: c.col, rag: c.rag, str: c.str };
  const m = K && K.club === POSTO && K.mio && K.mio.nome ? K.mio : null;
  if (m) { const d = m.indossa === 'terza' && m.terza && CAR.possiede(K, 'terza', 'terza') ? m.terza : m; // la divisa che si indossa: la prima o la terza maglia (negozio)
    Object.assign(c, { name: m.nome, short: m.sigla, c1: d.c1, c2: d.c2, st: d.stile || undefined, col: m.colletto || undefined, rag: m.colletto ? !!m.raglan : undefined }); c.str = forzaClub(c); IMGX[POSTO] = disegnaStemma(m, 240); IMGX[POSTO + '-mini'] = disegnaStemma(m, 96); }
  else { Object.assign(c, c.orig); delete IMGX[POSTO]; delete IMGX[POSTO + '-mini']; }
  stemmi3d.delete(POSTO); loadImg(img(POSTO + '-mini')).then((i) => { CREST[POSTO] = i; stemmi3d.delete(POSTO); });
}
// Le doti di un giocatore, ricavate dal suo valore e dal ruolo (con un po' di differenza tra uno e l'altro): servono alle carte
const DOTI = { P: [['PAR', 5], ['RIF', 4], ['PRE', 3], ['POS', 2], ['RIN', -3], ['PAS', -10], ['VEL', -15], ['POT', -4]], D: [['VEL', 0], ['ACC', -3], ['RES', 4], ['POT', 5], ['CON', -2], ['PAS', -1], ['TIR', -14], ['DIF', 9]], C: [['VEL', -2], ['ACC', 1], ['RES', 4], ['POT', -2], ['CON', 4], ['PAS', 6], ['TIR', -4], ['DIF', -1]], A: [['VEL', 4], ['ACC', 4], ['RES', 0], ['POT', 1], ['CON', 3], ['PAS', -2], ['TIR', 7], ['DIF', -22]] };
const attributi = (x) => DOTI[x[1]].map(([k, d]) => [k, clamp(ovr(x[1], x[3]) + d + (hash(x[0] + k) % 11) - 5, 30, 95)]);
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
function candidatiCapitano() { // nove tra i migliori, uno per squadra: un portiere, due difensori, tre centrocampisti, tre attaccanti
  const tutti = []; for (const c of CLUBS) if (c.id !== POSTO) c.xi.forEach((x, i) => tutti.push({ c, x, i, v: ovr(x[1], x[3]) }));
  tutti.sort((a, b) => b.v - a.v || b.x[3] - a.x[3]);
  const out = [], vuoi = { P: 1, D: 2, C: 3, A: 3 }, prese = new Set();
  for (const t of tutti) { if (out.filter((o) => o.x[1] === t.x[1]).length >= vuoi[t.x[1]] || prese.has(t.c.id)) continue; out.push(t); prese.add(t.c.id); if (out.length === 9) break; }
  return out.sort((a, b) => 'PDCA'.indexOf(a.x[1]) - 'PDCA'.indexOf(b.x[1]) || b.v - a.v);
}
const cartaGiocatore = (t, scelto) => `<button class="cap${scelto ? ' sel' : ''}" data-cap="${t.c.id}:${t.i}"><div class="cn">${esc(t.x[0])}<small>${esc(t.c.name)}</small></div><div class="at">${attributi(t.x).map(([k, v]) => `<span><i>${k}</i><b class="${v >= 80 ? 'a' : v >= 60 ? 'b' : 'c'}">${v}</b></span>`).join('')}</div><div class="sc"><em>${t.v}</em>${mini(t.c.id)}<b>${t.x[2]}</b><u>${RUOLO[t.x[1]]}</u></div></button>`;
function mioDaModulo() { const nome = ($('#nvClub').value.trim() || NOMI[0]).slice(0, 22), sg = ($('#nvSigla').value.trim() || sigla(nome)).slice(0, 3).toUpperCase(); return { nome, sigla: sg, c1: COLORI[NV.col][0], c2: COLORI[NV.col][1], stile: NV.stile, colletto: NV.colletto, raglan: NV.raglan }; }
function anteprimaClub() { const m = mioDaModulo(); $('#nvStemma').src = disegnaStemma(m, 160); $('#nvMaglia').innerHTML = maglia(m.c1, m.c2, m.stile, m.colletto, m.raglan); for (const b of $('#nvCol').children) b.classList.toggle('on', +b.dataset.col === NV.col); for (const b of $('#nvStile').children) b.classList.toggle('on', b.dataset.stile === NV.stile); for (const b of $('#nvColletto').children) b.classList.toggle('on', b.dataset.colletto ? b.dataset.colletto === NV.colletto : NV.raglan); }
function drawNuovo() {
  const el = $('#nuovo');
  if (NV.passo === 1) {
    const m = NV.modifica && K && K.mio ? K.mio : null;
    el.innerHTML = `<button class="indietro" id="nvInd">‹ Indietro</button><h2 class="h">${NV.modifica ? 'Personalizza il club' : 'Il tuo club'}</h2>
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
    el.innerHTML = `<button class="indietro" id="nvInd">‹ Il club</button><h2 class="h">Ingaggia il tuo capitano</h2><div class="caps">${cand.map((t) => cartaGiocatore(t, NV.cap === `${t.c.id}:${t.i}`)).join('')}</div>
      <button class="btn ingaggia" id="nvAvanti" ${NV.cap ? '' : 'disabled'}>${NV.cap ? `Ingaggia ${esc(club(NV.cap.split(':')[0]).xi[+NV.cap.split(':')[1]][0])}` : 'Tocca un giocatore'}</button>`;
  }
}
function apriNuovo(modifica = false) { Object.assign(NV, { passo: 1, modifica, cap: null }); if (!modifica) { NV.col = 0; NV.stile = ''; NV.colletto = 'giro'; NV.raglan = false; } drawNuovo(); show('#nuovo'); }
function tapNuovo(e) {
  const b = e.target.closest('button'); if (!b) return;
  if (b.id === 'nvInd') { if (NV.passo === 2) { NV.passo = 1; drawNuovo(); return $('#nvClub') && ($('#nvClub').value = NV.club || '', $('#nvSigla').value = NV.sigla || '', $('#nvNome') && ($('#nvNome').value = NV.nome || ''), anteprimaClub()); } return NV.modifica ? panClubMio() : show('#home'); }
  if (b.id === 'nvDado') { const n = NOMI[(NOMI.indexOf($('#nvClub').value) + 1 + Math.floor(rnd(NOMI.length - 1))) % NOMI.length]; $('#nvClub').value = n; $('#nvSigla').value = sigla(n); return anteprimaClub(); }
  if (b.dataset.col) { NV.col = +b.dataset.col; return anteprimaClub(); }
  if (b.dataset.stile !== undefined) { NV.stile = b.dataset.stile; return anteprimaClub(); }
  if (b.dataset.colletto) { NV.colletto = b.dataset.colletto; return anteprimaClub(); }
  if (b.dataset.raglan) { NV.raglan = !NV.raglan; return anteprimaClub(); }
  if (b.dataset.cap) { NV.cap = b.dataset.cap; return drawNuovo(); }
  if (b.id !== 'nvAvanti') return;
  if (NV.passo === 1) {
    const m = mioDaModulo();
    if (NV.modifica) { K.mio = { ...K.mio, ...m }; applicaMio(); salvaK(); avviso('Club aggiornato'); return panClubMio(); }
    Object.assign(NV, { nome: ($('#nvNome').value.trim() || 'Mister').slice(0, 18), club: $('#nvClub').value, sigla: $('#nvSigla').value, mio: m, passo: 2 }); return drawNuovo();
  }
  const [da, i] = NV.cap.split(':');
  CAR.applica(null, CLUBS); K = CAR.nuova(CLUBS, NV.nome, POSTO, Math.random, NV.mio); CAR.applica(K, CLUBS); CAR.scegliCapitano(K, CLUBS, da, +i); applicaMio(); salvaK();
  avviso(`Benvenuto, ${K.nome}: ${K.mio.capitano} è il tuo capitano`); casa();
}

/* --- la dashboard */
function drawHub() {
  const me = club(K.club), p = CAR.prossima(K), tab = CAR.classifica(K, CLUBS), pos = tab.findIndex((r) => r.id === K.club), oggi = new Date(), st = CAR.statoSfide(K, oggi);
  const fm = formaMaglia(me), kit = maglia(me.c1, me.c2, me.st, fm.colletto, fm.raglan);
  const pe = CAR.statoPercorso(K), note = CAR.notifiche(K, oggi), sal = CAR.salite(K, CLUBS), daPrendere = st.daRiscuotere + pe.daRitirare;
  $('#hGem').innerHTML = `<i>◆</i>${mon(K.gemme)}<u>+</u><em>${daPrendere ? '!' : ''}</em>`; $('#hMon').innerHTML = `<i>●</i>${mon(K.monete)}<u>+</u><em>${daPrendere ? '!' : ''}</em>`; $('#hNome').textContent = K.nome; $('#hClub').innerHTML = `${esc(me.name)} ${stelle(me.str)}`; $('#hStemma').src = img(me.id + '-mini');
  $('#hSettT').textContent = fmtTempo(CAR.fineSettimana(oggi) - oggi); $('#hSettP').textContent = `${st.conti.w[0]}/${st.conti.w[1]}`;
  $('#hPremiN').textContent = pe.daRitirare || ''; $('#hPremi').classList.toggle('pieno', pe.daRitirare > 0);
  $('#hCampN').textContent = note.length || '';
  const avv = (id, righe) => `<div class="avv"><img src="${img(id)}" alt=""><div><b>${esc(club(id).name)}</b>${righe}</div></div>`;
  // il campionato: prossima partita col tasto, la maglia grande, la giornata e gli ultimi cinque risultati
  const forma = ultimi(5).map((r) => `<i class="${r}">${r.toUpperCase()}</i>`).join('');
  $('#cCamp').innerHTML = `<div class="tt"><h3><b>Fantatitano</b> Campionato</h3></div><div class="testa">`
    + (p ? avv(p.avv, `${stelle(club(p.avv).str)}<i>Partita ${p.giornata} di ${p.totale} · ${p.inCasa ? 'in casa' : 'in trasferta'}</i>`) : avv(K.campione, `<i>Campione · tu ${pos + 1}º</i><i class="vai">Tocca per la nuova stagione</i>`))
    + `<span class="gioca${p ? '' : ' no'}">${p ? 'Gioca<br>adesso' : 'Nuova<br>stagione'}</span></div><div class="kit">${kit}</div>`
    + `<div class="md">Matchday${p ? ` · ${p.giornata}` : ''}</div><div class="forma">${forma || '<span>Prima giornata</span>'}</div>`;
  // sugli schermi bassi quattro righe di classifica, se no cinque
  const nr = innerHeight <= 480 ? 4 : 5, da = clamp(pos - 2, 0, tab.length - nr);
  $('#cClass').innerHTML = `<div class="tt"><h3>Classifica generale · stagione ${K.stagione}</h3><em>»</em></div><div class="corpo"><table class="mini"><tr><th>G</th><th></th><th>Squadra</th><th>DR</th><th>PUNTI</th></tr>${tab.slice(da, da + nr).map((r, i) => `<tr class="${r.id === K.club ? 'io' : ''}"><td class="${sal[r.id] > 0 ? 'su' : sal[r.id] < 0 ? 'giu' : ''}">${sal[r.id] > 0 ? '▲' : sal[r.id] < 0 ? '▼' : '–'}</td><td>${da + i + 1}</td><td>${mini(r.id)}${esc(club(r.id).name)}</td><td>${r.gf - r.gs}</td><td>${r.pt}</td></tr>`).join('')}</table><img class="logo" src="img/corona-lime.png" alt=""></div>`;
  // la fine si calcola solo quando la competizione è finita
  const cupCard = (titolo, icona, pr, fineF) => { const fine = pr ? null : fineF(); return `<div class="tt"><h3>${titolo}</h3><em>»</em></div><div class="corpo"><div><span class="pp">${pr ? 'Prossima partita' : fine.titolo}</span>${pr ? avv(pr.avv, `${stelle(club(pr.avv).str)}<i>${pr.nome}</i>`) : avv(fine.id, `<i>${fine.testo}</i>`)}</div>${icona}</div>`; };
  const kc = K.castelli, cc = CAR.castelliProssima(K), camC = CAR.castelliCampione(K);
  $('#cCast').innerHTML = cupCard('Trofeo dei Castelli', TORRI, cc, () => ({ titolo: kc.vinta ? 'Vinto!' : 'Trofeo finito', id: camC || K.club, testo: kc.vinta ? 'Il trofeo è tuo' : `Lo vince ${esc(club(camC).name)} · tu fuori ${kc.fuori === 'gironi' ? 'ai gironi' : CAR.TURNI_KO[kc.fuori].toLowerCase()}` }));
  const k = K.coppa, cp = CAR.coppaProssima(K);
  $('#cCoppa').innerHTML = cupCard('Coppa Titano', COPPA, cp, () => ({ titolo: k.vinta ? 'Vinta!' : 'Coppa finita', id: k.campione || K.club, testo: k.vinta ? 'La coppa è tua' : `La vince ${esc(club(k.campione).name)} · tu fuori: ${CAR.TURNI[k.fuori].toLowerCase()}` }));
  // le sfide in quattro anelli che si riempiono
  $('#tSfide').innerHTML = `<h4>Sfide</h4><div class="anelli">${Object.entries({ d: 'Oggi', w: 'Sett.', c: 'Carriera', s: 'Stagione' }).map(([g, n]) => `<span class="anello"><i>${n}</i><b style="--p:${Math.round(st.conti[g][0] / Math.max(1, st.conti[g][1]) * 100)}">${st.conti[g][0]}/${st.conti[g][1]}</b></span>`).join('')}</div>${st.daRiscuotere ? `<em class="bollo">${st.daRiscuotere}</em>` : ''}`;
  const cap = me.xi.find((x) => K.mio && x[0] === K.mio.capitano) || me.xi.slice().sort((a, b) => ovr(b[1], b[3]) - ovr(a[1], a[3]))[0];
  $('#tRosa').innerHTML = `<div class="txt"><h4>Squadra</h4><span class="sx">${K.mio && cap[0] === K.mio.capitano ? 'Capitano' : 'Il migliore'}</span><b class="big">${esc(cap[0])}</b><span class="rr">${RUOLO[cap[1]]} · ${ovr(cap[1], cap[3])}</span></div><img class="ritratto" src="${ritratto(K.club, cap[0], cap[2], RUOLO[cap[1]] === 'POR')}" alt="">`;
  const t = consigliato(); $('#tMerc').innerHTML = `<div class="tit"><h4>Trasferimenti</h4>${t ? `<span class="frecce"><i>←</i><i>→</i></span><span class="valore">${t.v}</span>` : ''}</div><h5>Mercato</h5><p>Rinforza la squadra: scambia i tuoi giocatori con quelli delle altre.</p>${t ? `<div class="mcard"><em>${t.v}</em>${mini(t.c.id)}<b>${esc(t.x[0])}</b><u>${RUOLO[t.x[1]]}</u></div>` : ''}`;
  // il mio club: stadio, allenatore, stemma e finanze, col punto esclamativo dove c'è un miglioramento che ci si può permettere
  const puo = (v) => (note.some((n) => n.vai === v) ? ' class="nuovo"' : '');
  $('#tClub').innerHTML = `<h4>Il mio club</h4><button data-club="stadio"><i${puo('stadio')}>Stadio</i><span>${K.stadio}</span></button><button data-club="allenatore"><i${puo('allenatore')}>Allenatore</i><span>${CAR.votoAllenatore(K)}</span></button><button data-club="personalizza"><i>Stemma</i><span>${stemmaFatto()}%</span></button><button data-club="finanze"><i>Finanze</i><span>${CAR.finanze(K)}</span></button>`;
  $('#hFoto').src = ritratto(K.club, avatarNome(K.avatar), '', false, true); $('#hFoto').className = `foto cor-${K.scelte && CAR.possiede(K, 'cornice', K.scelte.cornice) ? K.scelte.cornice : 'semplice'}`;
  aggiornaCloud();
}
/** Gli ultimi n risultati del campionato del club dell'utente, dal più vecchio: 'v', 'n' o 'p'. */
function ultimi(n) {
  const out = [];
  for (let g = 0; g < (K.ris || []).length; g++) {
    const i = (K.cal[g] || []).findIndex(([a, b]) => a === K.club || b === K.club), r = K.ris[g] && K.ris[g][i]; if (i < 0 || !r) continue;
    const [f, s] = K.cal[g][i][0] === K.club ? r : [r[1], r[0]]; out.push(f > s ? 'v' : f < s ? 'p' : 'n');
  }
  return out.slice(-n);
}
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
// Il giocatore più forte che si può prendere adesso al posto del più debole del suo ruolo (o, se non basta niente, il più vicino)
function consigliato() {
  const me = club(K.club), debole = {}; for (const x of me.xi) { const v = ovr(x[1], x[3]); if (!debole[x[1]] || v < debole[x[1]]) debole[x[1]] = v; }
  const tutti = []; for (const c of CLUBS) if (c.id !== K.club) c.xi.forEach((x, i) => { const v = ovr(x[1], x[3]); if (v > debole[x[1]]) tutti.push({ c, x, i, v, costo: CAR.costoScambio(v, debole[x[1]]) }); });
  // chi si può permettere, dal più forte. Ogni rinnovo comprato al negozio passa al successivo
  const posso = tutti.filter((t) => t.costo <= K.monete).sort((a, b) => b.v - a.v); if (posso.length) return posso[(K.consigli || 0) % posso.length];
  return tutti.sort((a, b) => a.costo - b.costo)[(K.consigli || 0) % Math.max(1, Math.min(tutti.length, 5))] || null;
}
function pan(titolo, html) { $('#panT').textContent = titolo; $('#panC').innerHTML = html; show('#pan'); }
const riga = (a, b, r, rg) => `<div class="${a === K.club || b === K.club ? 'io' : ''}"><span>${esc(club(a).name)} – ${esc(club(b).name)}</span><b>${r[0]}-${r[1]}${rg ? ` (${rg[0]}-${rg[1]} rig.)` : ''}</b></div>`;
const tabella = (tab, corta) => `<table class="tab"><tr><th></th><th>Squadra</th><th>G</th>${corta ? '' : '<th>V</th><th>N</th><th>P</th>'}<th>GF</th><th>GS</th><th>DR</th><th>PT</th></tr>${tab.map((r, i) => `<tr class="${r.id === K.club ? 'io' : ''}"><td>${i + 1}</td><td>${mini(r.id)}${esc(club(r.id).name)}</td><td>${r.g}</td>${corta ? '' : `<td>${r.v}</td><td>${r.n}</td><td>${r.p}</td>`}<td>${r.gf}</td><td>${r.gs}</td><td>${r.gf - r.gs}</td><td>${r.pt}</td></tr>`).join('')}</table>`;
function panClassifica() {
  const g = K.giornata - 1;
  // il calendario del proprio club: tutte le giornate, con il risultato di quelle già giocate
  const mie = K.cal.map((gg, n) => { const i = gg.findIndex(([x, y]) => x === K.club || y === K.club), [x, y] = gg[i], r = K.ris[n] && K.ris[n][i], casa = x === K.club, avv = casa ? y : x, esito = r ? (r[casa ? 0 : 1] > r[casa ? 1 : 0] ? 'v' : r[casa ? 0 : 1] < r[casa ? 1 : 0] ? 'p' : 'n') : '';
    return `<div class="${n === K.giornata ? 'io' : ''}"><span>${n + 1}. ${casa ? 'in casa' : 'in trasferta'} · ${esc(club(avv).name)}</span><b class="${esito}">${r ? `${r[casa ? 0 : 1]}-${r[casa ? 1 : 0]}` : n === K.giornata ? 'prossima' : '–'}</b></div>`; }).join('');
  pan(`Campionato · stagione ${K.stagione}`, tabella(CAR.classifica(K, CLUBS)) + (g >= 0 ? `<div class="sez">Giornata ${g + 1}: tutti i risultati</div><div class="ris2">${K.cal[g].map(([a, b], i) => riga(a, b, K.ris[g][i])).join('')}</div>` : '')
    + `<div class="sez">Il tuo calendario</div><div class="ris2 cale">${mie}</div>`);
}
function gioca(tipo, avv, titolo, fuori, rigori) { sel.mia = K.club; sel.loro = avv; G.comp = { tipo, titolo, fuori: !!fuori, rigori: !!rigori }; showPre(); }
// Come nelle schermate dei tornei: prima il quadro, e in cima il tasto per giocare la prossima partita
function giocaCoppa() { const p = CAR.coppaProssima(K); if (p) gioca('coppa', p.avv, `Coppa Titano · ${p.nome.toLowerCase()}`, false, true); }
function giocaCastelli() { const p = CAR.castelliProssima(K); if (p) gioca('castelli', p.avv, `Trofeo dei Castelli · ${p.nome.toLowerCase()}`, p.fase === 'gironi' && !p.inCasa, p.fase === 'ko'); }
const tastoGioca = (p, az) => (p ? `<button class="btn gioca2" data-az="${az}">Gioca · ${esc(p.nome)} contro ${esc(club(p.avv).name)}</button>` : '');
function panCoppa() {
  const k = K.coppa;
  pan('Coppa Titano', tastoGioca(CAR.coppaProssima(K), 'giocaCoppa') + k.storia.map((t, i) => `<div class="sez">${CAR.TURNI[i]}</div><div class="ris2">${t.map((m) => riga(m.a, m.b, m.r, m.rg)).join('')}</div>`).join('') || '<p class="vuoto">La coppa comincia dagli ottavi di finale: sedici squadre, partita secca, rigori in caso di parità.</p>');
}
function panCastelli() {
  const k = K.castelli, mio = CAR.castelliGirone(K);
  pan('Trofeo dei Castelli', tastoGioca(CAR.castelliProssima(K), 'giocaCastelli') + `<p class="nota2">Quattro gironi da quattro, tre giornate: le prime due vanno ai quarti, poi semifinale e finale con i rigori in caso di parità.</p><div class="gironi">${k.gironi.map((g, gi) => `<div class="${gi === mio ? 'mio' : ''}"><div class="sez">Girone ${'ABCD'[gi]}</div>${tabella(CAR.castelliTabella(K, gi), true)}</div>`).join('')}</div>`
    + (k.ko ? k.ko.storia.map((t, i) => `<div class="sez">${CAR.TURNI_KO[i]}</div><div class="ris2">${t.map((m) => riga(m.a, m.b, m.r, m.rg)).join('')}</div>`).join('') : ''));
}
let sTab = 'd';
function panSfide(tab) {
  if (tab) sTab = tab;
  const st = CAR.statoSfide(K), premio = (x) => [x.monete ? `● ${mon(x.monete)}` : '', x.gemme ? `◆ ${x.gemme}` : ''].filter(Boolean).join(' ');
  const fine = (x, id) => (x.preso ? '<span class="fatto">✓</span>' : x.fatto ? `<button data-riscuoti="${sTab}:${id}">Riscuoti</button>` : '<span></span>');
  const righe = st[sTab].map((x) => `<div class="sfida${x.fatto ? ' ok' : ''}"><div><b>${x.t}</b><span class="barra"><i style="width:${(x.prog / x.n) * 100}%"></i></span></div><em>${x.prog}/${x.n}</em><u>${premio(x)}</u>${fine(x, x.id)}</div>`).join('');
  const b = st.bonus[sTab], bonus = b ? `<div class="sfida bonus${b.fatto ? ' ok' : ''}"><div><b>Tutte fatte</b></div><em></em><u>${premio(b)}</u>${fine(b, 'tutte')}</div>` : '';
  const quando = sTab === 'd' ? 'Ripartono a mezzanotte' : sTab === 'w' ? `Ripartono tra ${fmtTempo(CAR.fineSettimana(new Date()) - new Date())}` : sTab === 's' ? `Valgono per la stagione ${K.stagione}` : 'Si fanno una volta sola';
  pan('Sfide', `<div class="seg">${Object.entries(CAR.GRUPPI).map(([g, n]) => `<button data-stab="${g}" class="${g === sTab ? 'on' : ''}">${n} ${st.conti[g][0]}/${st.conti[g][1]}</button>`).join('')}${st.daRiscuotere ? '<button data-az="tutto" class="oro">Riscuoti tutto</button>' : ''}</div><p class="nota2">${quando}</p>${righe}${bonus}`);
}
function riscuotiTutto() { const r = CAR.riscuotiTutto(K); if (!r.n) return avviso('Niente da riscuotere: completa le sfide'); salvaK(); avviso(`Premi riscossi: ${[r.monete ? `+${mon(r.monete)} monete` : '', r.gemme ? `+${r.gemme} diamanti` : ''].filter(Boolean).join(', ')}`); }
let cTab = 'stadio';
function panClubMio(tab, msg) {
  if (tab) cTab = tab;
  const me = club(K.club), s = CAR.STADIO[K.stadio - 1], prox = CAR.STADIO[K.stadio], borsa = borsaHtml();
  const tabs = `<div class="seg">${[['stadio', 'Stadio'], ['allenatore', 'Allenatore'], ['allenamento', 'Allenamento'], ['finanze', 'Finanze']].map(([k, n]) => `<button data-ctab="${k}" class="${k === cTab ? 'on' : ''}">${n}</button>`).join('')}<button data-ntab="stemma">Negozio</button><button data-club="personalizza">Personalizza</button><button data-club="amichevole">Amichevole</button></div>`;
  let corpo;
  if (cTab === 'stadio') {
    corpo = `<div class="stadio"><div class="liv">${[1, 2, 3, 4, 5].map((n) => `<i class="${n <= K.stadio ? 'on' : ''}"></i>`).join('')}</div><b>Livello ${K.stadio} di 5 · ${mon(s.posti)} posti</b><span>+${mon(s.bonus)} monete a ogni partita in casa</span>`
      + (prox ? `<button data-az="stadio" class="${K.monete < prox.monete || K.gemme < prox.gemme ? 'no' : ''}">Amplia a ${mon(prox.posti)} posti (+${mon(prox.bonus)} a partita) · ● ${mon(prox.monete)}${prox.gemme ? ` ◆ ${prox.gemme}` : ''}</button>` : '<em>Lo stadio è al massimo</em>') + '</div>';
  } else if (cTab === 'allenatore') {
    const A = ECONOMIA.allenatore, liv = K.allenatore || 1, pa = A.livelli[liv];
    corpo = `<div class="stadio"><div class="liv">${A.livelli.map((_, n) => `<i class="${n < liv ? 'on' : ''}"></i>`).join('')}</div><b>Allenatore · livello ${liv} di ${A.livelli.length} · valutazione ${CAR.votoAllenatore(K)}</b><span>Fino a ${CAR.seduteMax(K)} sedute di allenamento per giocatore${liv > 1 ? ` · sedute scontate del ${Math.round((liv - 1) * A.sconto * 100)}%` : ''}</span>`
      + (pa ? `<button data-az="allenatore" class="${K.monete < pa.monete || K.gemme < pa.gemme ? 'no' : ''}">Porta l'allenatore a ${pa.voto} (una seduta in più a testa, sconto ${Math.round(liv * A.sconto * 100)}%) · ● ${mon(pa.monete)}${pa.gemme ? ` ◆ ${pa.gemme}` : ''}</button>` : '<em>L\'allenatore è al massimo</em>') + '</div>';
  } else if (cTab === 'finanze') {
    const st = K.storico || [], entrate = st.reduce((t, x) => t + Math.max(0, x.m), 0), uscite = st.reduce((t, x) => t - Math.min(0, x.m), 0), d = (v, e) => `<div><b>${v}</b><span>${e}</span></div>`;
    corpo = `<div class="dati">${d(CAR.finanze(K), 'Finanze')}${d(mon(K.monete), 'Monete')}${d(K.gemme, 'Diamanti')}${d(`+${mon(entrate)}`, 'Entrate recenti')}${d(`−${mon(uscite)}`, 'Uscite recenti')}</div><p class="nota2">Il giudizio dipende dal saldo in monete. Entrate e uscite contano gli ultimi ${ECONOMIA.storico} movimenti.</p><div class="seg"><button data-az="guadagna">Vedi i movimenti e come guadagnare</button></div>`;
  } else {
    const smax = CAR.seduteMax(K), riga2 = (x, dove, i) => { const n = (K.allen || {})[x[0]] || 0, c = CAR.costoAllenamento(K, x[0]), max = n >= smax; return `<button class="gioc" data-allena="${dove}:${i}" ${max || c > K.monete ? 'disabled' : ''}><b>${x[2]} ${esc(x[0])}</b><span>${RUOLO[x[1]]} · sedute ${n}/${smax}</span><em>${ovr(x[1], x[3])}</em><u>${max ? 'al massimo' : `● ${mon(c)}`}</u></button>`; };
    corpo = `<p class="nota2">Ogni seduta alza di un punto la quotazione del giocatore (fino a ${smax} sedute a testa: un allenatore migliore ne permette di più).</p><div class="lista">${me.xi.map((x, i) => riga2(x, 'xi', i)).join('')}${(me.pan || []).map((x, i) => riga2(x, 'pan', i)).join('')}</div>`;
  }
  pan(me.name, `${borsa}${msg ? `<p class="avviso">${msg}</p>` : ''}${tabs}${corpo}`);
}
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
  pan(K ? K.nome : 'Account', (K ? `<div class="sez">Avatar del manager</div><div class="avat">${CAR.NEGOZIO.avatar.tutti.filter((n) => CAR.possiede(K, 'avatar', n)).map((n) => `<button data-avatar="${n}" class="${n === (K.avatar || 0) ? 'on' : ''}"><img src="${ritratto(K.club, avatarNome(n), '', false, true)}" alt=""></button>`).join('')}</div><div class="seg"><button data-club="personalizza">Personalizza il club: nome, colori, disegno</button><button data-ntab="manager">Altri avatar e cornici</button><button data-ntab="stemma">Pezzi dello stemma</button></div>` : '') + `<div class="sez">Account</div>${accountHtml()}` + (K ? `<div class="sez">${esc(club(K.club).name)}</div><div class="dati">${d(K.stagione, 'Stagione')}${d(st.g, 'Partite')}${d(`${st.v}-${st.n}-${st.p}`, 'Vinte-pari-perse')}${d(`${st.gf}-${st.gs}`, 'Gol fatti-subiti')}</div>`
    + `<div class="sez">Capocannoniere</div><p class="vuoto">${top ? `${esc(top.nome)} · ${top.gol} gol` : 'Ancora nessun gol'}</p>`
    + `<div class="sez">Trofei</div><p class="vuoto">${K.trofei.length ? K.trofei.map((t) => `${t.tipo} (stagione ${t.stagione})`).join(' · ') : 'Ancora nessuno'}</p>`
    + `<div class="sez">Mercato</div><p class="vuoto">${K.movimenti.length ? K.movimenti.slice(0, 6).map((m) => `${esc(m.preso)} per ${esc(m.ceduto)} (${esc(club(m.da).name)})`).join(' · ') : 'Ancora nessuno scambio'}</p>` : ''));
}
/* --- pannelli della home nuova (docs/home-spec.md) */
const borsaHtml = () => `<div class="borsa"><i class="mo">●</i> <b>${mon(K.monete)}</b><i class="di">◆</i> <b>${K.gemme}</b></div>`;
// L'avatar del manager: un busto generico disegnato dal modello 3D, scelto tra quelli del negozio (cambia il seme, quindi faccia e capelli)
const avatarNome = (n) => `${K.nome}${n ? `#${n}` : ''}`;
// Quanti pezzi dello stemma si hanno, in percentuale (NEGOZIO in src/carriera.js)
const stemmaFatto = () => CAR.pezziStemma(K);
const premioTesto = (m, g) => [m ? `● ${mon(m)}` : '', g ? `◆ ${g}` : ''].filter(Boolean).join(' ');
/** Percorso premi della stagione: venti livelli, si sale coi punti di partite e sfide, ogni livello ha un premio da ritirare. */
function panPercorso(msg) {
  const pe = CAR.statoPercorso(K), E = ECONOMIA.percorso.punti, fine = pe.livello >= pe.livelli;
  const tessere = pe.premi.map((x) => `<button class="liv${x.preso ? ' preso' : x.raggiunto ? ' pronto' : ''}" ${x.raggiunto && !x.preso ? `data-ritira="${x.livello}"` : 'disabled'}><i>${x.livello}</i><b>${premioTesto(x.monete, x.gemme)}</b><u>${x.preso ? 'Ritirato' : x.raggiunto ? 'Ritira' : ''}</u></button>`).join('');
  pan(`Percorso premi · stagione ${K.stagione}`, `${borsaHtml()}${msg ? `<p class="avviso">${msg}</p>` : ''}<div class="perc"><b>Livello ${pe.livello} di ${pe.livelli}</b><span class="barra"><i style="width:${fine ? 100 : Math.round(pe.nelLivello / pe.perLivello * 100)}%"></i></span><em>${fine ? 'Percorso completato' : `${pe.nelLivello}/${pe.perLivello} punti`}</em>${pe.daRitirare ? '<button data-az="ritiraTutto" class="oro">Ritira tutto</button>' : ''}</div><div class="livelli">${tessere}</div>`
    + `<p class="nota2">Punti: partita giocata ${E.partita}, vittoria +${E.vinta}, sfida di oggi riscossa ${E.sfidaD}, obiettivo della settimana ${E.sfidaW}, sfida di stagione ${E.sfidaS}, turno di coppa superato ${E.turno}. Il percorso riparte da zero a ogni stagione.</p>`);
}
/** «Come guadagnare»: da dove arrivano monete e diamanti (importi veri) e lo storico degli ultimi movimenti. */
function panGuadagna() {
  const P = CAR.PREMI, riga = (t, v) => `<div><span>${t}</span><b>${v}</b></div>`, somma = (g, k) => CAR.SFIDE[g].reduce((t, x) => t + (x[k] || 0), 0);
  const fonti = [['Vittoria', `● ${P.v}`], ['Pareggio', `● ${P.n}`], ['Sconfitta', `● ${P.p}`], ['Ogni gol segnato', `● ${P.gol}`], ['Partita in casa (dallo stadio)', `● ${CAR.STADIO[K.stadio - 1].bonus}`],
    ['Turno di coppa superato', `● ${P.turno}`], ['Campionato vinto', `● ${mon(P.campione)}`], ['Coppa Titano vinta', `● ${mon(P.coppa)}`], ['Trofeo dei Castelli vinto', `● ${mon(P.castelli)}`],
    ['Sfide di oggi (tutte)', premioTesto(somma('d', 'monete'), CAR.BONUS.d.gemme)], ['Obiettivi della settimana (tutti)', premioTesto(somma('w', 'monete'), CAR.BONUS.w.gemme)],
    ['Sfide di stagione (tutte)', premioTesto(somma('s', 'monete'), somma('s', 'gemme'))], ['Sfide di carriera (tutte)', premioTesto(0, somma('c', 'gemme'))],
    ['Percorso premi (tutti i livelli)', premioTesto(ECONOMIA.percorso.premi.reduce((t, x) => t + (x.m || 0), 0), ECONOMIA.percorso.premi.reduce((t, x) => t + (x.g || 0), 0))]];
  const giorno = (t) => new Date(t).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }), segno = (n) => (n > 0 ? `+${mon(n)}` : `−${mon(-n)}`);
  const mov = (K.storico || []).slice(0, 40).map((x) => `<div class="${x.m + x.g * 100 < 0 ? 'meno' : 'piu'}"><span>${giorno(x.t)} · ${esc(x.d || x.c)}</span><b>${[x.m ? `${segno(x.m)} ●` : '', x.g ? `${segno(x.g)} ◆` : ''].filter(Boolean).join(' ')}</b></div>`).join('');
  pan('Monete e diamanti', `${borsaHtml()}<div class="info"><div><div class="sez">Come si guadagnano</div><div class="ris2">${fonti.map(([t, v]) => riga(t, v)).join('')}</div><p class="nota2">Monete e diamanti non si comprano: si guadagnano solo giocando partite e completando sfide e obiettivi.</p><div class="seg"><button data-ntab="stemma">Negozio: dove spenderli</button></div></div>`
    + `<div><div class="sez">Ultimi movimenti</div>${mov ? `<div class="ris2 mov">${mov}</div>` : '<p class="vuoto">Ancora nessun movimento: gioca una partita.</p>'}</div></div>`);
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
    const co = consigliato();
    corpo = fila('Scarpini della squadra', 'scarpini', CAR.possiede(K, 'scarpini', sc.scarpini) ? sc.scarpini : 'misti', (x) => `<i class="tondo" style="background:${SCARPE_NEGOZIO[x] ? SCARPE_NEGOZIO[x][0] : 'conic-gradient(#16161a,#F3F3F3,#D9F51F,#FF5A1F,#1E6FB5,#16161a)'}"></i>`)
      + fila('Pallone delle partite in casa', 'pallone', CAR.possiede(K, 'pallone', sc.pallone) ? sc.pallone : 'classico', (x) => `<i class="tondo" style="background:radial-gradient(circle at 50% 50%,${PALLONI[x][1][1]} 0 28%,${PALLONI[x][0]} 30%)"></i>`)
      + `<div class="sez">Mercato</div><div class="seg"><button data-az="rinnovo" class="${K.gemme < ECONOMIA.negozio.rinnovo.g ? 'no' : ''}">Cambia il giocatore consigliato${co ? ` (ora: ${esc(co.x[0])})` : ''} · ◆ ${ECONOMIA.negozio.rinnovo.g}</button></div>`;
  }
  pan('Negozio', `${borsaHtml()}${msg ? `<p class="avviso">${msg}</p>` : ''}${tabs}${corpo}<p class="nota2">Qui si comprano solo aspetto e comodità: niente di quello che c'è nel negozio rende più forte la squadra.</p>`);
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
/** Notifiche: quello che c'è da ritirare o da fare, calcolato dai dati. Ogni riga porta alla sua schermata. */
function panNotifiche() {
  const note = CAR.notifiche(K);
  pan('Notifiche', note.length ? `<div class="lista note">${note.map((n) => `<button class="gioc" data-vai="${n.vai}"><b>${esc(n.t)}</b><u>›</u></button>`).join('')}</div>` : '<p class="vuoto">Niente di nuovo: tutto ritirato e nessuna partita di coppa in attesa.</p>');
}
const vaiA = { negozio: () => panNegozio(), sfide: () => panSfide(), percorso: () => panPercorso(), coppa: () => panCoppa(), castelli: () => panCastelli(), stadio: () => panClubMio('stadio'), allenatore: () => panClubMio('allenatore') };
// Mercato: si sceglie un titolare di un'altra squadra, poi chi cedere in cambio tra i propri dello stesso ruolo
let mRuolo = 'T', mPreso = null;
function panMercato(msg) {
  const me = club(K.club), val = (x) => ovr(x[1], x[3]), borsa = `<div class="borsa">Monete <b>${mon(K.monete)}</b></div>`;
  const scheda = (c, x, v, extra, attr) => { const tag = attr ? 'button' : 'div'; return `<${tag} class="gioc${attr ? '' : ' sel'}" ${attr || ''}>${c ? mini(c.id) : ''}<b>${esc(x[0])}</b><span>${RUOLO[x[1]]} · valore ${v}${c ? ` · ${esc(c.name)}` : ''}</span><em>${extra}</em></${tag}>`; };
  if (mPreso) {
    const c = club(mPreso[0]), x = c.xi[mPreso[1]], v = val(x);
    return pan('Mercato', `${borsa}<div class="sez">Prendi</div>${scheda(c, x, v, mon(CAR.prezzo(v)))}<div class="sez">Chi cedi in cambio?</div>`
      + me.xi.map((y, j) => { if (y[1] !== x[1]) return ''; const k = CAR.costoScambio(v, val(y)); return scheda(null, y, val(y), k > 0 ? `paghi ${mon(k)}` : k < 0 ? `incassi ${mon(-k)}` : 'alla pari', `data-out="${j}" ${k > K.monete ? 'disabled' : ''}`); }).join('')
      + (me.xi.every((y) => y[1] !== x[1] || CAR.costoScambio(v, val(y)) > K.monete) ? '<p class="avviso">Non hai abbastanza monete: si guadagnano giocando le partite e completando le sfide.</p>' : '')
      + '<div class="seg" style="margin-top:10px"><button data-az="annulla">Annulla</button></div>');
  }
  const tutti = []; for (const c of CLUBS) if (c.id !== K.club) c.xi.forEach((x, i) => { if (mRuolo === 'T' || x[1] === mRuolo) tutti.push({ c, x, i, v: val(x) }); });
  tutti.sort((a, b) => b.v - a.v || a.x[0].localeCompare(b.x[0]));
  pan('Mercato', `${borsa}${msg ? `<p class="avviso">${msg}</p>` : ''}<div class="seg">${[['T', 'Tutti'], ['P', 'Portieri'], ['D', 'Difensori'], ['C', 'Centrocampisti'], ['A', 'Attaccanti']].map(([r, n]) => `<button data-r="${r}" class="${r === mRuolo ? 'on' : ''}">${n}</button>`).join('')}</div><div class="lista">`
    + tutti.map(({ c, x, i, v }) => scheda(c, x, v, mon(CAR.prezzo(v)), `data-p="${c.id}:${i}"`)).join('') + '</div>');
}
let armato = false;
function panImp() {
  pan('Impostazioni', `<div class="sez">Difficoltà</div><div class="seg">${Object.keys(DIFF).map((d) => `<button data-d="${d}" class="${d === sel.diff ? 'on' : ''}">${d}</button>`).join('')}</div>`
    + `<div class="sez">Audio</div><div class="seg"><button data-az="audio" class="${AU.on ? 'on' : ''}">${AU.on ? 'Acceso' : 'Spento'}</button></div>`
    + `<label class="vol">Volume musica<input type="range" min="0" max="100" step="5" data-vol="musica" value="${Math.round(AU.vol.musica * 100)}"><b>${Math.round(AU.vol.musica * 100)}</b></label>`
    + `<label class="vol">Volume effetti<input type="range" min="0" max="100" step="5" data-vol="effetti" value="${Math.round(AU.vol.effetti * 100)}"><b>${Math.round(AU.vol.effetti * 100)}</b></label>`
    + `<div class="sez">Comandi</div><div class="seg"><button data-az="assistito" class="${sel.assistito ? 'on' : ''}">Passaggio assistito: ${sel.assistito ? 'sì' : 'no'}</button></div>`
    + `<div class="sez">Qualità grafica</div><div class="seg">${[['auto', 'Automatica'], ['alta', 'Alta'], ['media', 'Media'], ['bassa', 'Bassa']].map(([k, n]) => `<button data-q="${k}" class="${k === sel.qual ? 'on' : ''}">${n}</button>`).join('')}</div><p class="nota2">Automatica: parte al massimo e si alleggerisce da sola se il telefono fatica. Per tornare a una qualità più alta dopo averla abbassata, chiudi e riapri il gioco.</p>`
    + `<div class="sez">Lingua</div><div class="seg"><button class="on">Italiano</button></div>`
    + `<div class="sez">Account</div>${accountHtml()}`
    + (K ? `<div class="sez">Carriera</div><div class="seg"><button data-az="reset">${armato ? 'Sicuro? Tocca ancora per cancellare tutto, anche dall\'account' : 'Ricomincia la carriera da capo'}</button></div>` : ''));
}
const casa = () => { if (K) { drawHub(); show('#hub'); } else { drawHome(); show('#home'); } };
function drawHome() { $('#carr').textContent = K ? 'Continua la carriera' : 'Inizia la carriera'; const u = CLOUD.info().utente; $('#hAcc').textContent = u ? `Connesso come ${u.nome || u.email}` : 'Accedi con l\'account Fantatitano'; }

/* --- salvataggio: sempre sul dispositivo, e sull'account se c'è l'accesso */
let syncT = 0;
function salvaK() { if (!K) return; CAR.salva(K); clearTimeout(syncT); syncT = setTimeout(sincronizza, 1200); }
const testoCloud = (s) => ({ salvato: 'Salvata sull\'account', salvo: 'Salvataggio sull\'account…', errore: 'Salvataggio sull\'account non riuscito: si riprova alla prossima partita', pronto: 'Collegato all\'account' }[s] || '');
function aggiornaCloud() {
  const a = CLOUD.info(), el = $('#hCloud'); if (el) { el.className = a.utente ? a.stato : 'fuori'; el.title = a.utente ? testoCloud(a.stato) : 'Solo su questo dispositivo: accedi per salvare sull\'account'; }
  const s = $('#accStato'); if (s) s.textContent = testoCloud(a.stato);
  if (!$('#home').classList.contains('nas')) drawHome();
}
async function sincronizza(forza = false) {
  if (!K || !CLOUD.info().utente) return;
  const r = await CLOUD.salva(K, forza);
  if (r.conflitto) { // un altro dispositivo ha salvato dopo: si sceglie quale tenere
    const o = await CLOUD.carica().catch(() => null), q = CLOUD.scegli(K, o && o.dati);
    if (q === 'online') adotta(o.dati, 'Ripresa la copia più avanti dal tuo account'); else if (q === 'chiedi') chiediQuale(o.dati); else await CLOUD.salva(K, true);
  }
}
function adotta(dati, msg) {
  const nuova = CAR.completa(JSON.parse(JSON.stringify(dati)), CLUBS); if (!nuova) return;
  CAR.applica(null, CLUBS); K = nuova; CAR.applica(K, CLUBS); applicaMio(); CAR.salva(K); if (msg) avviso(msg);
  if (!$('#hub').classList.contains('nas') || !$('#home').classList.contains('nas') || !$('#pan').classList.contains('nas')) casa();
}
// Dopo l'accesso (o all'avvio con la sessione già aperta): si confronta la copia del telefono con quella dell'account
async function allAccesso() {
  let o = null; try { o = await CLOUD.carica(); } catch (e) { return; }
  const q = CLOUD.scegli(K, o && o.dati);
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
  $('#indietro').onclick = casa;
  $('#inizio').onclick = () => showPre(); $('#preInd').onclick = () => { if (G.comp) casa(); else { show('#scelta'); refresh(); } };
  // ingresso e dashboard
  $('#nuovo').addEventListener('click', tapNuovo);
  $('#nuovo').addEventListener('input', (e) => { if (e.target.id === 'nvSigla') e.target.dataset.mano = 1; if (e.target.id === 'nvClub' && !$('#nvSigla').dataset.mano) $('#nvSigla').value = sigla(e.target.value); if (NV.passo === 1) anteprimaClub(); });
  $('#carr').onclick = () => { AU.init(); if (K) casa(); else apriNuovo(); };
  $('#hAcc').onclick = () => panProfilo();
  $('#cCamp').onclick = () => { const p = CAR.prossima(K); if (p) gioca('camp', p.avv, `Campionato · giornata ${p.giornata} di ${p.totale} · ${p.inCasa ? 'in casa' : 'in trasferta'}`, !p.inCasa); else { CAR.nuovaStagione(K, CLUBS); salvaK(); drawHub(); } };
  $('#cCoppa').onclick = panCoppa; $('#cCast').onclick = panCastelli;
  $('#cClass').onclick = panClassifica; $('#tMerc').onclick = () => { mPreso = null; panMercato(); }; $('#tSfide').onclick = () => panSfide();
  $('#hImp').onclick = () => { armato = false; panImp(); }; $('#hInfo').onclick = panInfo; $('#hHome').onclick = () => { drawHome(); show('#home'); }; $('#hProf').onclick = panProfilo;
  $('#hSett').onclick = () => panSfide('w'); $('#hPremi').onclick = () => panPercorso(); $('#hCamp').onclick = panNotifiche; $('#hGem').onclick = $('#hMon').onclick = panGuadagna;
  const clubAz = (k) => (k === 'personalizza' ? (K.mio && K.club === POSTO ? apriNuovo(true) : avviso('Si personalizza il club creato all\'inizio della carriera')) : k === 'amichevole' ? vai() : panClubMio(k));
  $('#tClub').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) clubAz(b.dataset.club); });
  $('#campoA').addEventListener('click', tapRosa);
  $('#tRosa').onclick = () => { rXi = rPan = -1; sel.mia = K.club; sel.loro = CLUBS.find((c) => c.id !== K.club).id; G.comp = { tipo: 'rosa' }; showPre(); };
  $('#panInd').onclick = casa; $('#continua').onclick = () => { toMenu(); };
  // i cursori del volume (impostazioni): musica ed effetti separati, salvati sul dispositivo
  $('#panC').addEventListener('input', (e) => { const r = e.target.closest('input[data-vol]'); if (!r) return; AU.init(); AU.volume(r.dataset.vol, r.value / 100); r.nextElementSibling.textContent = r.value; if (r.dataset.vol === 'effetti') AU.calcio(12, 'passaggio'); });
  $('#panC').addEventListener('click', async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.az && await tapAccount(b.dataset.az)) return;
    if (b.dataset.stab) return panSfide(b.dataset.stab);
    if (b.dataset.riscuoti) { const [g, id] = b.dataset.riscuoti.split(':'), r = CAR.riscuoti(K, g, id); if (r.ok) { salvaK(); avviso(`Premio riscosso: ${[r.monete ? `+${mon(r.monete)} monete` : '', r.gemme ? `+${r.gemme} diamanti` : ''].filter(Boolean).join(', ')}`); } return panSfide(); }
    if (b.dataset.az === 'giocaCoppa') return giocaCoppa();
    if (b.dataset.az === 'giocaCastelli') return giocaCastelli();
    if (b.dataset.az === 'tutto') { riscuotiTutto(); return panSfide(); }
    if (b.dataset.ctab) return panClubMio(b.dataset.ctab);
    if (b.dataset.vai) return (vaiA[b.dataset.vai] || casa)();
    if (b.dataset.ritira || b.dataset.az === 'ritiraTutto') { const q = CAR.ritiraPercorso(K, +(b.dataset.ritira || 0)); if (q.ok) salvaK(); return panPercorso(q.ok ? `Ritirato: ${premioTesto(q.monete, q.gemme)}` : ''); }
    if (b.dataset.az === 'guadagna') return panGuadagna();
    if (b.dataset.ntab) return panNegozio(b.dataset.ntab);
    if (b.dataset.ogg) {
      const [tipo, cosa0] = b.dataset.ogg.split(':'), cosa = tipo === 'avatar' ? +cosa0 : cosa0; let detto = '';
      if (!CAR.possiede(K, tipo, cosa)) {
        if (nArmato !== b.dataset.ogg) { nArmato = b.dataset.ogg; return panNegozio(); }
        const q = CAR.compraOggetto(K, tipo, cosa); nArmato = ''; if (!q.ok) return panNegozio(null, 'Servono più monete o diamanti'); detto = `Comprato: ${premioTesto(q.monete, q.gemme)}`;
      }
      nArmato = ''; usaOggetto(tipo, cosa); salvaK(); return panNegozio(null, detto);
    }
    if (b.dataset.az === 'rinnovo') { const q = CAR.rinnovaConsigli(K); if (q.ok) salvaK(); return panNegozio(null, q.ok ? 'Giocatore consigliato cambiato: lo trovi nella home, alla voce Trasferimenti' : 'Servono più diamanti'); }
    if (b.dataset.indossa && K.mio) { K.mio.indossa = b.dataset.indossa; applicaMio(); salvaK(); return panNegozio(); }
    if (b.dataset.tcol && K.mio && K.mio.terza) { const i = +b.dataset.tcol, [a, c2] = COLORI[i % COLORI.length]; Object.assign(K.mio.terza, i < COLORI.length ? { c1: a, c2 } : { c1: c2, c2: a }); applicaMio(); salvaK(); return panNegozio(); }
    if (b.dataset.tstile !== undefined && K.mio && K.mio.terza) { K.mio.terza.stile = b.dataset.tstile; applicaMio(); salvaK(); return panNegozio(); }
    if (b.dataset.avatar) { K.avatar = +b.dataset.avatar; salvaK(); return panProfilo(); }
    if (b.dataset.az === 'allenatore') { const q = CAR.miglioraAllenatore(K); if (q.ok) salvaK(); return panClubMio('allenatore', q.ok ? `Allenatore migliorato: valutazione ${CAR.votoAllenatore(K)}` : q.motivo === 'massimo' ? 'L\'allenatore è già al massimo' : 'Servono più monete o diamanti'); }
    if (b.dataset.q) { sel.qual = b.dataset.q; save(); return panImp(); }
    if (b.dataset.az === 'assistito') { sel.assistito = !sel.assistito; PASSAGGIO.assistito = sel.assistito; save(); return panImp(); }
    if (b.dataset.club) return clubAz(b.dataset.club);
    if (b.dataset.az === 'stadio') { const r = CAR.miglioraStadio(K); if (r.ok) salvaK(); return panClubMio('stadio', r.ok ? `Stadio ampliato: livello ${r.livello}` : r.motivo === 'massimo' ? 'Lo stadio è già al massimo' : 'Servono più monete o diamanti'); }
    if (b.dataset.allena) { const [dove, i] = b.dataset.allena.split(':'), me = club(K.club), x = (dove === 'pan' ? me.pan : me.xi)[+i], r = CAR.allena(K, CLUBS, dove, +i); if (r.ok) { applicaMio(); salvaK(); } return panClubMio('allenamento', r.ok ? `${esc(x[0])} sale a ${ovr(x[1], x[3] + 1)}` : r.motivo === 'massimo' ? 'Già allenato al massimo' : 'Servono più monete'); }
    if (b.dataset.r) { mRuolo = b.dataset.r; return panMercato(); }
    if (b.dataset.p) { const [id, i] = b.dataset.p.split(':'); mPreso = [id, +i]; return panMercato(); }
    if (b.dataset.az === 'annulla') { mPreso = null; return panMercato(); }
    if (b.dataset.out) { const x = club(mPreso[0]).xi[mPreso[1]], r = CAR.scambio(K, CLUBS, ovr, mPreso[0], mPreso[1], +b.dataset.out); mPreso = null; if (r.ok) { applicaMio(); salvaK(); } return panMercato(r.ok ? `${esc(x[0])} è tuo${r.costo > 0 ? `: pagato ${mon(r.costo)}` : r.costo < 0 ? `: incassato ${mon(-r.costo)}` : ''}.` : 'Scambio non riuscito.'); }
    if (b.dataset.d) { sel.diff = b.dataset.d; save(); for (const x of $('#diff').children) x.classList.toggle('on', x.dataset.d === sel.diff); }
    else if (b.dataset.az === 'audio') { AU.init(); AU.toggle(); }
    else if (b.dataset.az !== 'reset') return;
    else { if (!armato) armato = true; else { armato = false; CAR.cancella(); CLOUD.cancella(); K = null; CAR.applica(null, CLUBS); applicaMio(); drawHome(); return show('#home'); } }
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
export { show, sel, save, esc, ovr, RUOLO, showPre, K, mon, applicaMio, attributi, candidatiCapitano, apriNuovo, drawHub, panCastelli, panSfide, panClubMio, panProfilo, panImp, casa, salvaK, aggiornaCloud, adotta, allAccesso, buildMenu, caricaCarriera };
