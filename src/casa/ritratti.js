/*
 * I ritratti dei giocatori nelle carte (docs/ritratti.md, sezione del 23/11): un'immagine intera per volto, col viso
 * realistico e la maglia già dentro, su fondo trasparente. Qui si sceglie il volto e se ne ritaglia la parte che serve
 * alla carta. La maglia è quella stampata nel ritratto: non segue i cambi di divisa (deciso da Alex).
 * Chi ha quale volto: i giocatori veri hanno ognuno il suo; quelli inventati e del mercato ne prendono uno dai volti
 * condivisi, con una regola: mai due facce uguali nella stessa rosa, né tra un'altra squadra e la mia.
 */
import { RITRATTI } from '../config.js';
import VOLTI from '../dati/volti.json';
import { K, club, salvaK } from './casa.js';

const VERI = new Set(VOLTI.veri), CONDIVISI = VOLTI.condivisi;
// lo stesso nome di file e lo stesso numero dal testo che usa scripts/aspetti.mjs
const nomeFile = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
function seme(testo) { let h = 2166136261; for (const c of testo) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

/** Il primo volto condiviso libero a partire da quello che il nome indica: `presi` sono i volti da non usare. */
function libero(nome, presi) {
  const n = CONDIVISI.length, da = seme('volto/' + nome) % n;
  for (let k = 0; k < n; k++) { const v = CONDIVISI[(da + k) % n]; if (!presi.has(v)) return v; }
  return CONDIVISI[da];
}
/** I volti condivisi della mia rosa: restano scritti nella carriera, così un mio giocatore non cambia mai faccia. */
function miei() {
  const io = club(K.club), nomi = new Set([...io.xi, ...io.pan].map((x) => x[0])); let cambiato = false;
  for (const nome of Object.keys(K.volti)) if (!nomi.has(nome)) { delete K.volti[nome]; cambiato = true; }
  return { nomi, presi: new Set(Object.values(K.volti)), cambiato };
}
// i volti delle altre squadre, tenuti in memoria finché la mia rosa non cambia
const ALTRE = new Map(); let firmaMia = '';
function diUnAltra(c, nome, presiMiei) {
  const firma = [...presiMiei].sort().join(','); if (firma !== firmaMia) { ALTRE.clear(); firmaMia = firma; }
  let volti = ALTRE.get(c.id);
  if (!volti) {
    // nell'ordine dato dal nome (non dal posto in campo): cambiare formazione non cambia le facce
    volti = new Map(); const presi = new Set(presiMiei);
    for (const x of [...c.xi, ...c.pan].map((g) => g[0]).sort((a, b) => seme(a) - seme(b))) { const v = libero(x, presi); presi.add(v); volti.set(x, v); }
    ALTRE.set(c.id, volti);
  }
  // un giocatore che non è nella rosa (per esempio uno della lista trasferimenti): il primo volto che io non ho
  return volti.get(nome) || libero(nome, presiMiei);
}
/**
 * Il volto di un giocatore: il nome del suo file, o '' se non c'è ancora nessun ritratto adatto.
 * @param {string} clubId   la squadra in cui gioca adesso
 * @param {string} nome
 * @param {string} origine  la squadra vera da cui viene ('inv' per gli inventati), come in DATI.scheda
 */
export function voltoDi(clubId, nome, origine) {
  const vero = `${origine}-${nomeFile(nome)}`; if (origine && origine !== 'inv' && VERI.has(vero)) return vero;
  if (!CONDIVISI.length || !K) return '';
  const io = miei();
  if (clubId === K.club && io.nomi.has(nome)) {
    if (!K.volti[nome]) { K.volti[nome] = libero(nome, io.presi); io.cambiato = true; }
    if (io.cambiato) salvaK();
    return K.volti[nome];
  }
  if (io.cambiato) salvaK();
  return diUnAltra(club(clubId), nome, io.presi);
}

/* ---------- le immagini ---------- */
const IMMAGINI = new Map();
/** Un ritratto intero, preso una volta sola; se non si riesce a prenderlo la promessa dà null. */
function immagine(file) {
  if (!IMMAGINI.has(file)) IMMAGINI.set(file, new Promise((fatto) => { const im = new Image(); im.onload = () => fatto(im); im.onerror = () => fatto(null); im.src = RITRATTI.cartella + file; }));
  return IMMAGINI.get(file);
}

const FATTI = new Map();
/**
 * L'indirizzo dell'immagine di un ritratto ritagliato, o '' se non si può fare (allora chi chiama usa il ritratto
 * vecchio, ripreso dal modello 3D). Dipende solo dal volto e dal ritaglio, non dai colori della divisa.
 * @param {string} clubId   la squadra in cui gioca adesso: serve a scegliere il volto
 * @param {string} nome
 * @param {string} origine  la squadra vera da cui viene, o 'inv'
 * @param {string} [taglio]  quale ritaglio di RITRATTI.taglio: 'piccolo', 'mini', 'carta' o 'scheda'
 */
export function ritrattoNuovo(clubId, nome, origine, taglio = 'piccolo') {
  const volto = voltoDi(clubId, nome, origine); if (!volto) return Promise.resolve('');
  const T = RITRATTI.taglio[taglio] || RITRATTI.taglio.piccolo, lato = RITRATTI.lato[T.lato], chiave = `${volto}|${taglio}`;
  if (!FATTI.has(chiave)) FATTI.set(chiave, immagine(`${volto}-${lato}.webp`).then((intero) => {
    if (!intero) return '';
    // nella carta entra solo una parte: il ritaglio scelto, alla sua forma
    const largo = Math.round(T.largo * lato), alto = Math.round(T.alto * lato), c = document.createElement('canvas'); c.width = largo; c.height = alto;
    c.getContext('2d').drawImage(intero, T.x * lato, T.y * lato, largo, alto, 0, 0, largo, alto);
    return new Promise((fatto) => c.toBlob((b) => fatto(b ? URL.createObjectURL(b) : ''), 'image/webp', .92));
  }));
  return FATTI.get(chiave);
}
