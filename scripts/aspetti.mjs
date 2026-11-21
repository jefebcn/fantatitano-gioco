// L'«aspetto» di ogni volto dei ritratti: età, pelle, capelli, colore, barba, lentiggini e il seme del viso. Un volto
// per ogni giocatore vero del Campionato Sammarinese (public/data.js) e 150 volti condivisi per i giocatori inventati e
// per quelli del mercato. Tutto esce da numeri tirati dal nome: lo stesso nome dà sempre lo stesso aspetto, e nessun
// volto è fatto per somigliare alla persona vera con quel nome (nome e nazionalità non contano nella scelta).
// Uso: node scripts/aspetti.mjs            scrive scripts/blender/aspetti.json
// Poi: scripts/blender/tutti.sh rende i ritratti (vedi docs/ritratti.md).
import { readFileSync, writeFileSync } from 'node:fs';

// quanti volti condivisi; età minima e massima; età massima dell'Academy (una squadra di giovani)
const CONDIVISI = 150, ETA = [18, 36], ETA_ACADEMY = [17, 22];
// quanto è frequente ogni pelle, dalla più chiara alla più scura (pesi)
const PELLI = [24, 36, 20, 9, 6, 5];
// capigliature per pelle (pesi): le pelli 1-3 hanno la stessa tabella, poi cambiano
const CAPELLI = [
  { rasato: 12, corto: 18, sfumato: 18, ciuffo: 10, indietro: 7, riga: 8, ricci: 8, raccolti: 3, calvo: 4, stempiato: 5, lunghi: 4 },
  { rasato: 16, corto: 18, sfumato: 18, ciuffo: 6, indietro: 6, riga: 4, ricci: 12, afro: 3, raccolti: 4, calvo: 4, stempiato: 4, lunghi: 3 },
  { rasato: 24, corto: 16, sfumato: 20, indietro: 2, ricci: 10, afro: 10, raccolti: 8, calvo: 5, stempiato: 2 },
];
const tabellaCapelli = (pelle) => CAPELLI[pelle <= 2 ? 0 : pelle === 3 ? 1 : 2];
// da che età si può essere stempiati o calvi
const ETA_MINIMA = { stempiato: 26, calvo: 27 };
// colore dei capelli per pelle (pesi)
const COLORI = [
  { biondo: 25, rosso: 8, 'castano chiaro': 25, castano: 25, 'castano scuro': 12, nero: 5 },
  { biondo: 8, rosso: 3, 'castano chiaro': 18, castano: 30, 'castano scuro': 28, nero: 13 },
  { castano: 15, 'castano scuro': 40, nero: 45 },
  { 'castano scuro': 25, nero: 75 },
  { 'castano scuro': 5, nero: 95 },
  { 'castano scuro': 5, nero: 95 },
];
// barba (pesi); sotto i 21 anni la barba è più rara
const BARBE = { nessuna: 30, ombra: 26, corta: 18, piena: 9, pizzetto: 6, baffi: 3, collare: 3 };
const BARBE_GIOVANI = { nessuna: 60, ombra: 28, corta: 8, pizzetto: 4 };
// lentiggini: solo sulle due pelli più chiare; più spesso coi capelli rossi
const LENTIGGINI = { base: .14, rossi: .55 };

// un numero da un testo, sempre lo stesso; e da lì una fila di numeri tra 0 e 1
function seme(testo) { let h = 2166136261; for (const c of testo) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function caso(s) { return () => { s = (s + 0x6D2B79F5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function scegli(r, pesi) {
  const voci = Array.isArray(pesi) ? pesi.map((p, i) => [i, p]) : Object.entries(pesi); let x = r() * voci.reduce((a, [, p]) => a + p, 0);
  for (const [v, p] of voci) { x -= p; if (x < 0) return v; }
  return voci[voci.length - 1][0];
}
const nomeFile = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function aspetto(id, eta) {
  const r = caso(seme('volto/' + id)); const [da, a] = eta; const anni = da + Math.floor(r() * (a - da + 1)); const pelle = +scegli(r, PELLI);
  let capelli = scegli(r, tabellaCapelli(pelle));
  // troppo giovane per quella testa: si ritira finché esce un'altra capigliatura
  while (ETA_MINIMA[capelli] > anni) capelli = scegli(r, tabellaCapelli(pelle));
  const colore = scegli(r, COLORI[pelle]); let barba = scegli(r, anni < 21 ? BARBE_GIOVANI : BARBE);
  // capelli lunghi o raccolti senza barba possono sembrare un volto femminile: almeno un'ombra di barba
  if ((capelli === 'lunghi' || capelli === 'raccolti') && barba === 'nessuna') barba = 'ombra';
  const lentiggini = pelle <= 1 && r() < (colore === 'rosso' ? LENTIGGINI.rossi : LENTIGGINI.base);
  const v = { id, eta: anni, pelle, viso: seme('viso/' + id) % 1000000, capelli, colore, barba, lentiggini };
  // i baffi da soli stanno meglio con un velo di barba sotto
  if (barba === 'baffi') v.velo = true;
  return v;
}

const window = {}; new Function('window', readFileSync('public/data.js', 'utf8'))(window);
// prima i volti condivisi (sono quelli che si vedono di più: la rosa di chi gioca è fatta di giocatori inventati), poi i veri
const tutti = [], visti = new Set();
for (let i = 1; i <= CONDIVISI; i++) tutti.push(aspetto('volto-' + String(i).padStart(3, '0'), ETA));
for (const c of window.CLUBS) for (const x of [...c.xi, ...c.pan]) {
  const id = `${c.id}-${nomeFile(x[0])}`;
  if (visti.has(id)) throw new Error('due giocatori con lo stesso nome nella stessa squadra: ' + id);
  visti.add(id); tutti.push({ ...aspetto(id, c.id === 'academy' ? ETA_ACADEMY : ETA), nome: x[0], squadra: c.name });
}
const veri = tutti.length - CONDIVISI;
writeFileSync('scripts/blender/aspetti.json', '[\n' + tutti.map((v) => JSON.stringify(v)).join(',\n') + '\n]\n');
const conta = (k) => Object.entries(tutti.reduce((a, v) => ({ ...a, [v[k]]: (a[v[k]] || 0) + 1 }), {})).sort((a, b) => b[1] - a[1]).map(([n, q]) => `${n} ${q}`).join(', ');
console.log(`${veri} giocatori veri + ${CONDIVISI} volti condivisi = ${tutti.length} aspetti`);
for (const k of ['pelle', 'capelli', 'colore', 'barba']) console.log(`${k}: ${conta(k)}`);
