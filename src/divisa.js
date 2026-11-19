/* La divisa come texture. La maschera (scripts/maschera-divisa.py, 1024 px) dice per ogni punto della texture del corpo che
   zona è (maglia, pantaloncini, calzettoni, scarpe, pelle...) e dove sta sul corpo (sinistra-destra e altezza, in metri):
   così righe, fasce e disegni restano dritti anche dove la texture è tagliata a pezzi.

   Due texture:
   - creaDivisa: una per divisa (non per giocatore): maglia col disegno, colletto e bordi, orlo, pantaloncini con la banda
     laterale e l'orlo, calzettoni col risvolto, una grana di tessuto. La pelle resta quella originale, senza tono.
   - creaZone: una sola per tutti, dice allo shader del calciatore dove sono la pelle (per il tono), le scarpe (per il
     colore degli scarpini e la suola), pantaloncini e calzettoni (per lo sporco e per gonfiarli un po') e la fascia da
     capitano. Così tono, scarpini, fascia e sporco cambiano da giocatore a giocatore senza disegnare altre texture. */

const ZONA = { PELLE: 0, MAGLIA: 1, PANTALONCINI: 2, CALZETTONI: 3, SCARPE: 4, AVAMBRACCIO: 5, MANO: 6, COLLETTO: 7, BORDO: 8 };
// misure sul corpo (metri): dove finisce la maglia, l'orlo dei pantaloncini, il risvolto dei calzettoni, la suola, la fascia
export const MISURE = { orloMaglia: 0.945, orloCorti: 0.705, bandaCorti: 0.176, risvolto: 0.40, suola: 0.022, fascia: [0.27, 0.315], braccio: 1.3 };
const piu = (v) => Math.max(0, Math.min(1, v));
/** I disegni della maglia: quanto un punto (x da sinistra a destra, h altezza, in metri) prende il secondo colore (0..1). */
export const DISEGNI = {
  righe: (x) => Math.floor((x + 0.5) / 0.075) & 1,
  righine: (x) => (((x + 0.5) / 0.05) % 1 < 0.16 ? 1 : 0),
  fasce: (x, h) => Math.floor(h / 0.085) & 1,
  meta: (x) => (x > 0 ? 1 : 0),
  banda: (x, h) => (Math.abs(x) < 0.21 && Math.abs(h - (1.2 + 1.25 * x)) < 0.07 ? 1 : 0),
  scacchi: (x, h) => (Math.floor((x + 0.5) / 0.1) + Math.floor(h / 0.1)) & 1,
  spalle: (x, h) => (h > 1.43 ? 1 : 0),
  fianchi: (x) => (Math.abs(x) > 0.15 ? 1 : 0),
  v: (x, h) => (Math.abs(h - (1.36 - Math.abs(x) * 0.55)) < 0.035 ? 1 : 0),
  sfumata: (x, h) => piu((1.25 - h) / 0.33),
  // altri disegni classici (l'elenco viene da raccolte libere di disegni di maglie: football-kit-icons, CC0, e
  // procedural-jersey-generator, MIT; qui sono riscritti da zero sulle misure del nostro calciatore)
  chevron: (x, h) => (Math.abs(h - (1.22 + Math.abs(x) * 0.7)) < 0.06 ? 1 : 0),
  diagonale: (x, h) => (Math.floor((x * 0.8 + h + 2) / 0.09) & 1),
  quarti: (x, h) => ((x > 0) !== (h > 1.2) ? 1 : 0),
  terzi: (x) => (Math.abs(x) < 0.065 ? 1 : 0),
  maniche: (x, h) => (Math.abs(x) > 0.19 && h > 1.2 ? 1 : 0),
  petto: (x, h) => (Math.abs(h - 1.3) < 0.07 ? 1 : 0),
  onde: (x, h) => (Math.floor((h + 0.03 * Math.sin(x * 38)) / 0.085) & 1),
  mimetica: (x, h) => (Math.sin(x * 47 + Math.sin(h * 31) * 1.8) + Math.sin(h * 53 - x * 23) * 0.9 + Math.sin((x - h) * 83) * 0.4 > 0.35 ? 1 : 0),
  pennellata: (x, h) => { const c = 1.27 + 0.32 * x + 0.02 * Math.sin(x * 23), w = 0.075 + 0.022 * Math.sin(x * 61) + 0.012 * Math.sin(x * 157 + 1); return Math.abs(h - c) < w * (0.82 + 0.18 * Math.sin(h * 210 + x * 37)) ? 1 : 0; }, // una pennellata larga in diagonale sul petto, coi bordi sfrangiati
};
export const STILI = Object.keys(DISEGNI);
/** I toni di pelle: moltiplicatori sul colore della texture originale (chiara). */
export const TONI = [[1.06, 1.04, 1.02], [1, 0.95, 0.91], [0.96, 0.86, 0.76], [0.86, 0.74, 0.62], [0.72, 0.58, 0.48], [0.58, 0.45, 0.38], [0.44, 0.34, 0.3]];
const rgb = (hex) => { const n = parseInt(String(hex).replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const scuro = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
// grana del tessuto: un numero quasi casuale per pixel, sempre lo stesso
const grana = (i, j) => { const s = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453; return s - Math.floor(s); };

/**
 * @param {ImageData} maschera  R = zona x 28, G = posizione sinistra-destra (-0,5..0,5 m), B = altezza (0..1,9 m)
 * @param {ImageData} pelle     la texture del corpo, stessa misura
 * @param {object} kit          { shirt, shorts, socks, c2, stile, gloves, banda }
 * @returns {HTMLCanvasElement}
 */
export function creaDivisa(maschera, pelle, kit) {
  const N = maschera.width, c = document.createElement('canvas'); c.width = c.height = N;
  const x = c.getContext('2d'), out = x.createImageData(N, N), o = out.data, m = maschera.data, s = pelle.data, M = MISURE;
  const maglia = rgb(kit.shirt), due = rgb(kit.c2 || kit.shorts), corti = rgb(kit.shorts), calze = rgb(kit.socks), guanti = kit.gloves ? rgb(kit.gloves) : null;
  const bandaCorti = kit.banda ? rgb(kit.banda) : due, orlo = scuro(maglia, 0.8), disegno = DISEGNI[kit.stile] || null;
  for (let i = 0; i < o.length; i += 4) {
    const z = Math.round(m[i] / 28), px = m[i + 1] / 255 - 0.5, h = m[i + 2] / 255 * 1.9, ax = Math.abs(px); let col = null, tessuto = true;
    if (z === ZONA.MAGLIA) {
      if (h < M.orloMaglia && ax < 0.19) col = orlo; // l'orlo in fondo alla maglia
      else { const k = disegno ? disegno(px, h) : 0; col = k <= 0 ? maglia : k >= 1 ? due : [maglia[0] + (due[0] - maglia[0]) * k, maglia[1] + (due[1] - maglia[1]) * k, maglia[2] + (due[2] - maglia[2]) * k]; }
    } else if (z === ZONA.COLLETTO || z === ZONA.BORDO) col = due;
    else if (z === ZONA.PANTALONCINI) col = h < M.orloCorti ? scuro(corti, 0.78) : ax > M.bandaCorti && h > 0.75 ? bandaCorti : corti; // orlo e banda laterale
    else if (z === ZONA.CALZETTONI) col = h > M.risvolto ? due : h > M.risvolto - 0.02 ? scuro(calze, 0.75) : calze; // il risvolto in alto, con una cucitura
    else if (z === ZONA.SCARPE) { const l = 0.3 * s[i] + 0.59 * s[i + 1] + 0.11 * s[i + 2]; const v = 175 + l * 0.3; col = [v, v, v]; tessuto = false; } // grigio: il colore lo mette lo shader, qui restano i dettagli
    else if (z === ZONA.AVAMBRACCIO && guanti) col = maglia; // il portiere ha le maniche lunghe
    else if (z === ZONA.MANO && guanti) col = guanti;
    if (col) {
      const p = i >> 2, g = tessuto ? 0.965 + 0.05 * grana(p % N, (p / N) | 0) * (((p % N) + ((p / N) | 0)) & 1 ? 1 : 0.6) : 1;
      o[i] = Math.min(255, col[0] * g); o[i + 1] = Math.min(255, col[1] * g); o[i + 2] = Math.min(255, col[2] * g);
    } else { o[i] = s[i]; o[i + 1] = s[i + 1]; o[i + 2] = s[i + 2]; }
    o[i + 3] = 255;
  }
  x.putImageData(out, 0, 0); return c;
}

/**
 * La mappa delle zone per lo shader del calciatore (RGBA, stessa misura della maschera):
 * R pelle (255, oppure 128 per avambraccio e mano, che il portiere copre), G scarpe (255 tomaia, 128 suola),
 * B stoffa sotto (255 pantaloncini, 150 calzettoni), A fascia da capitano (sul braccio sinistro).
 * @param {ImageData} maschera
 * @returns {{ data: Uint8Array, size: number }}
 */
export function creaZone(maschera) {
  const N = maschera.width, m = maschera.data, d = new Uint8Array(N * N * 4), M = MISURE;
  for (let i = 0; i < d.length; i += 4) {
    const z = Math.round(m[i] / 28), px = m[i + 1] / 255 - 0.5, h = m[i + 2] / 255 * 1.9;
    d[i] = z === ZONA.PELLE ? 255 : z === ZONA.AVAMBRACCIO || z === ZONA.MANO ? 128 : 0;
    d[i + 1] = z === ZONA.SCARPE ? (h < M.suola ? 128 : 255) : 0;
    d[i + 2] = z === ZONA.PANTALONCINI ? 255 : z === ZONA.CALZETTONI ? 150 : 0;
    d[i + 3] = z === ZONA.MAGLIA && h > M.braccio && px > M.fascia[0] && px < M.fascia[1] ? 255 : 0;
  }
  return { data: d, size: N };
}

/**
 * Il rilievo della stoffa e quanto è lucida ogni zona, calcolati una volta sola dalla maschera.
 * Altezza (in "punti" della texture): costine di colletto, polsini e risvolto dei calzettoni, costine verticali dei
 * calzettoni, cucitura della spalla, orlo della maglia e dei pantaloncini, pieghe del tessuto in vita, sotto le ascelle
 * e sui pantaloncini, e una trama fine. Dall'altezza si ricava la normal map (spazio tangente), saltando i bordi tra
 * pezzi diversi della texture (lì due pixel vicini non sono vicini sul corpo).
 * Ruvidezza (canale G, come la legge three.js): pelle 0,6, stoffa 0,82, bordi a costine 0,74, scarpini 0,35.
 * @param {ImageData} maschera
 * @returns {{ normali: Uint8Array, ruvido: Uint8Array, size: number }}
 */
export function creaRilievo(maschera) {
  const N = maschera.width, m = maschera.data, H = new Float32Array(N * N), X = new Float32Array(N * N), Y = new Float32Array(N * N), Z = new Uint8Array(N * N), M = MISURE;
  const ruvido = new Uint8Array(N * N * 4), finestra = (v, a, b, s) => piu((v - a) / s) * piu((b - v) / s);
  for (let p = 0; p < N * N; p++) {
    const i = p * 4, z = Math.round(m[i] / 28), x = m[i + 1] / 255 - 0.5, h = m[i + 2] / 255 * 1.9, ax = Math.abs(x), u = p % N, v = (p / N) | 0;
    X[p] = x; Y[p] = h; Z[p] = z; let a = 0, r = 0.82;
    const trama = (((u >> 1) + (v >> 1)) & 1) * 0.12; // la maglia fine del tessuto tecnico
    if (z === ZONA.MAGLIA) {
      a = trama;
      if (h > M.braccio && Math.abs(ax - 0.19) < 0.006) a -= 0.9; // cucitura della spalla, dove la manica si attacca
      if (h < M.orloMaglia && ax < 0.19) a += 0.35 - (Math.abs(h - M.orloMaglia) < 0.005 ? 0.9 : 0); // orlo, con la cucitura sopra
      a += 0.55 * Math.sin(h * 46 + Math.sin(x * 18) * 1.6) * finestra(h, 0.93, 1.16, 0.05) * (ax < 0.19 ? 1 : 0); // pieghe in vita
      a += 0.45 * Math.sin((ax - 0.19) * 140 + h * 20) * finestra(ax, 0.19, 0.26, 0.02) * finestra(h, 1.3, 1.45, 0.03); // pieghe sotto le ascelle
    } else if (z === ZONA.COLLETTO || z === ZONA.BORDO) { a = 0.5 + 0.3 * Math.sin(u * 1.9); r = 0.74; } // costine a rilievo
    else if (z === ZONA.PANTALONCINI) {
      a = trama + (h < M.orloCorti ? 0.35 - (Math.abs(h - M.orloCorti) < 0.005 ? 0.9 : 0) : 0);
      a += 0.5 * Math.sin(h * 38 + x * 30) * finestra(h, 0.72, 0.88, 0.04) * finestra(ax, 0.02, 0.15, 0.03); // pieghe sulla coscia
    } else if (z === ZONA.CALZETTONI) { a = 0.3 * Math.sin(x * 520) + (h > M.risvolto ? 0.5 : 0); r = h > M.risvolto ? 0.74 : 0.85; } // costine verticali e risvolto
    else if (z === ZONA.SCARPE) { r = 0.35; a = h < M.suola ? 0.4 : 0; }
    else if ((z === ZONA.MANO || z === ZONA.AVAMBRACCIO)) r = 0.62;
    else r = 0.6;
    H[p] = a; ruvido[i] = 255; ruvido[i + 1] = Math.round(r * 255); ruvido[i + 2] = 255; ruvido[i + 3] = 255;
  }
  const normali = new Uint8Array(N * N * 4), k = 0.9;
  for (let v = 0; v < N; v++) for (let u = 0; u < N; u++) {
    const p = v * N + u, vicino = (q) => q >= 0 && q < N * N && Z[q] === Z[p] && Math.abs(X[q] - X[p]) + Math.abs(Y[q] - Y[p]) < 0.03;
    const d = (a, b) => (vicino(a) && vicino(b) ? H[a] - H[b] : 0) * 0.5;
    const dx = u > 0 && u < N - 1 ? d(p + 1, p - 1) : 0, dy = v > 0 && v < N - 1 ? d(p + N, p - N) : 0;
    let nx = -dx * k, ny = -dy * k, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    const i = p * 4; normali[i] = Math.round((nx * 0.5 + 0.5) * 255); normali[i + 1] = Math.round((ny * 0.5 + 0.5) * 255); normali[i + 2] = Math.round((nz * 0.5 + 0.5) * 255); normali[i + 3] = 255;
  }
  return { normali, ruvido, size: N };
}
