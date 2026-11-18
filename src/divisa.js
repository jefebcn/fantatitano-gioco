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
const DISEGNI = {
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
