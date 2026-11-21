/*
 * I ritratti nuovi dei giocatori (docs/ritratti.md): resi una volta sola con Blender e composti qui.
 * Ogni ritratto è fatto di strati: la testa del giocatore (senza maglia), sopra la maglia coi colori e il disegno della
 * squadra in cui gioca adesso, in cima i capelli che cadono davanti alla maglia. Un giocatore che cambia squadra cambia
 * maglia senza cambiare faccia.
 * Chi ha quale volto: i giocatori veri hanno ognuno il suo; quelli inventati e del mercato ne prendono uno dai volti
 * condivisi, con una regola: mai due facce uguali nella stessa rosa, né tra un'altra squadra e la mia.
 */
import { RITRATTI } from '../config.js';
import { DISEGNI } from '../divisa.js';
import { pickKits } from '../game.js';
import VOLTI from '../dati/volti.json';
import { K, club, salvaK } from './casa.js';

const VERI = new Set(VOLTI.veri), SOPRA = new Set(VOLTI.sopra), CONDIVISI = VOLTI.condivisi;
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
/** Un'immagine dei ritratti, presa una volta sola; se non si riesce a prenderla la promessa dà null. */
function immagine(file) {
  if (!IMMAGINI.has(file)) IMMAGINI.set(file, new Promise((fatto) => { const im = new Image(); im.onload = () => fatto(im); im.onerror = () => fatto(null); im.src = RITRATTI.cartella + file; }));
  return IMMAGINI.get(file);
}
const tela = (l, a = l) => { const c = document.createElement('canvas'); c.width = l; c.height = a; return [c, c.getContext('2d', { willReadFrequently: true })]; };
const rgb = (esa) => { const n = parseInt(esa.replace('#', '').padEnd(6, '0').slice(0, 6), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };

/** La divisa che si vede nel ritratto: colori, disegno e scollo. Il portiere ha la sua. */
function divisa(c, portiere) {
  const altra = { id: '', name: '', c1: c.c2, c2: c.c1 }, ks = pickKits(c, altra), k = portiere ? ks[2] : ks[0];
  return { c1: k.shirt, c2: k.c2 || c.c2, stile: k.stile || '', scollo: RITRATTI.scolli[k.colletto] || 'girocollo' };
}

const MAGLIE = new Map();
/** La maglia colorata: il disegno della squadra letto dalla mappa, moltiplicato per la luce della stoffa. */
function maglia(d, lato) {
  const chiave = [d.c1, d.c2, d.stile, d.scollo, lato].join('|');
  if (!MAGLIE.has(chiave)) MAGLIE.set(chiave, Promise.all([immagine(`maglia-${d.scollo}-luce-${lato}.webp`), immagine(`maglia-${d.scollo}-mappa-${lato}.png`)]).then(([luce, mappa]) => {
    if (!luce || !mappa) return null;
    const [cl, xl] = tela(lato), [, xm] = tela(lato * 2, lato); xl.drawImage(luce, 0, 0, lato, lato); xm.drawImage(mappa, 0, 0);
    const L = xl.getImageData(0, 0, lato, lato), M = xm.getImageData(0, 0, lato * 2, lato).data, p = L.data, R = RITRATTI;
    const c1 = rgb(d.c1), c2 = rgb(d.c2), dis = DISEGNI[d.stile], [x0, x1] = R.mappa.x, [z0, z1] = R.mappa.z;
    for (let y = 0; y < lato; y++) for (let x = 0; x < lato; x++) {
      const i = (y * lato + x) * 4; if (!p[i + 3]) continue;
      // la mappa è larga il doppio: a sinistra dove cade il punto di lato (due numeri) e il bordo, a destra l'altezza
      const a = (y * lato * 2 + x) * 4, b = a + lato * 4, lato_m = x0 + (M[a] * 256 + M[a + 1]) / 65535 * (x1 - x0), alto_m = z0 + (M[b] * 256 + M[b + 1]) / 65535 * (z1 - z0);
      const due = dis ? Math.max(0, Math.min(1, dis(lato_m, alto_m + R.occhi))) : 0, bordo = M[a + 2] / 255, q = due + (1 - due) * bordo;
      for (let k = 0; k < 3; k++) {
        const colore = c1[k] * (1 - q) + c2[k] * q, luce_k = Math.min(1, p[i + k] / 255 / R.bianco) ** R.ombre;
        p[i + k] = Math.round(255 * Math.min(1, luce_k * (colore * (1 - R.filo) + R.filo)));
      }
    }
    xl.putImageData(L, 0, 0); return cl;
  }));
  return MAGLIE.get(chiave);
}

const FATTI = new Map();
/**
 * L'indirizzo dell'immagine di un ritratto composto, o '' se non si può fare (allora chi chiama usa il ritratto vecchio).
 * @param {string} clubId   la squadra in cui gioca adesso: dà i colori della maglia
 * @param {string} nome
 * @param {string} origine  la squadra vera da cui viene, o 'inv'
 * @param {boolean} portiere
 * @param {boolean} [grande]  la misura grande, per la scheda del giocatore
 */
export function ritrattoNuovo(clubId, nome, origine, portiere, grande = false) {
  const volto = voltoDi(clubId, nome, origine); if (!volto) return Promise.resolve('');
  const lato = grande ? RITRATTI.lato.grande : RITRATTI.lato.piccolo, d = divisa(club(clubId), portiere), chiave = [volto, d.c1, d.c2, d.stile, d.scollo, lato].join('|');
  if (!FATTI.has(chiave)) FATTI.set(chiave, Promise.all([immagine(`${volto}-${lato}.webp`), maglia(d, lato), SOPRA.has(volto) ? immagine(`${volto}-sopra-${lato}.webp`) : null]).then(([testa, stoffa, sopra]) => {
    if (!testa || !stoffa) return '';
    const [c, x] = tela(lato); x.drawImage(testa, 0, 0, lato, lato); x.drawImage(stoffa, 0, 0); if (sopra) x.drawImage(sopra, 0, 0, lato, lato);
    // nella carta entra solo una parte: il viso nelle piccole, il busto in quella grande
    const T = RITRATTI.taglio[grande ? 'grande' : 'piccolo'], [c2, x2] = tela(lato); x2.drawImage(c, T.x * lato, T.y * lato, T.lato * lato, T.lato * lato, 0, 0, lato, lato);
    return new Promise((fatto) => c2.toBlob((b) => fatto(b ? URL.createObjectURL(b) : ''), 'image/webp', .92));
  }));
  return FATTI.get(chiave);
}
