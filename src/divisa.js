// La divisa come texture: colora la pelle del calciatore zona per zona (maglia, pantaloncini, calzettoni, scarpe)
// seguendo la maschera fatta da scripts/maschera-divisa.py. Una texture per divisa e per tono di pelle, non per giocatore.
const ZONA = { PELLE: 0, MAGLIA: 1, PANTALONCINI: 2, CALZETTONI: 3, SCARPE: 4, AVAMBRACCIO: 5, MANO: 6, COLLETTO: 7, BORDO: 8 };
/** I disegni della maglia: dicono se un punto (x da sinistra a destra, h altezza, in metri) prende il secondo colore. */
const DISEGNI = {
  righe: (x) => Math.floor((x + .5) / .075) & 1,
  fasce: (x, h) => Math.floor(h / .085) & 1,
  meta: (x) => x > 0,
  banda: (x, h) => Math.abs(x) < .21 && Math.abs(h - (1.2 + 1.25 * x)) < .07,
};
export const STILI = Object.keys(DISEGNI);
/** I toni di pelle: moltiplicatori sul colore della texture originale. */
export const TONI = [[1.06, 1.04, 1.02], [.97, .93, .9], [.82, .72, .66], [.64, .52, .46], [.47, .37, .33]];
const rgb = (hex) => { const n = parseInt(String(hex).replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

/**
 * @param {ImageData} maschera  R = zona x 28, G = posizione sinistra-destra (-0,5..0,5 m), B = altezza (0..1,9 m)
 * @param {ImageData} pelle     la texture del corpo, stessa misura
 * @param {object} kit          { shirt, shorts, socks, boots, c2, stile, gloves }
 * @param {number} tono         indice in TONI
 * @returns {HTMLCanvasElement}
 */
export function creaDivisa(maschera, pelle, kit, tono) {
  const N = maschera.width, c = document.createElement('canvas'); c.width = c.height = N;
  const x = c.getContext('2d'), out = x.createImageData(N, N), o = out.data, m = maschera.data, s = pelle.data, t = TONI[tono % TONI.length];
  const maglia = rgb(kit.shirt), due = rgb(kit.c2 || kit.shorts), corti = rgb(kit.shorts), calze = rgb(kit.socks), scarpe = rgb(kit.boots), guanti = kit.gloves ? rgb(kit.gloves) : null;
  const disegno = DISEGNI[kit.stile] || null;
  for (let i = 0; i < o.length; i += 4) {
    const z = Math.round(m[i] / 28), h = m[i + 2] / 255 * 1.9; let col = null;
    if (z === ZONA.MAGLIA) col = disegno && disegno(m[i + 1] / 255 - .5, h) ? due : maglia;
    else if (z === ZONA.COLLETTO || z === ZONA.BORDO) col = due;
    else if (z === ZONA.PANTALONCINI) col = corti;
    else if (z === ZONA.CALZETTONI) col = h > .40 ? due : calze; // il risvolto in alto
    else if (z === ZONA.SCARPE) col = scarpe;
    else if (z === ZONA.AVAMBRACCIO && guanti) col = maglia; // il portiere ha le maniche lunghe
    else if (z === ZONA.MANO && guanti) col = guanti;
    if (col) { o[i] = col[0]; o[i + 1] = col[1]; o[i + 2] = col[2]; }
    else { o[i] = Math.min(255, s[i] * t[0]); o[i + 1] = Math.min(255, s[i + 1] * t[1]); o[i + 2] = Math.min(255, s[i + 2] * t[2]); }
    o[i + 3] = 255;
  }
  x.putImageData(out, 0, 0); return c;
}
