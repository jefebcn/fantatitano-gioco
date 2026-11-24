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
export const MISURE = { orloMaglia: 0.945, orloCorti: 0.705, bandaCorti: 0.176, risvolto: 0.355, nastri: [[0.29, 0.325], [0.15, 0.175]], suola: 0.022, fascia: [0.27, 0.315], braccio: 1.3 };
// le pieghe della stoffa nella normal map: quanto sono profonde (metri), quanti metri copre un pixel della texture e quanto
// si lisciano le coordinate della maschera (pixel), che a 8 bit vanno a gradini di 4-7 mm
export const PIEGHE = { vita: 0.0022, ascelle: 0.0018, manica: 0.0016, inguine: 0.0024, orlo: 0.0016, onda: 0.0010, metriPixel: 0.00085, liscia: 4 };
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
 * @param {object} kit          { shirt, shorts, socks, c2, stile, gloves, banda, colletto ('giro' | 'v' | 'polo'), raglan }
 * @returns {HTMLCanvasElement}
 */
export function creaDivisa(maschera, pelle, kit) {
  const N = maschera.width, c = document.createElement('canvas'); c.width = c.height = N;
  const x = c.getContext('2d'), out = x.createImageData(N, N), o = out.data, m = maschera.data, s = pelle.data, M = MISURE;
  const maglia = rgb(kit.shirt), due = rgb(kit.c2 || kit.shorts), corti = rgb(kit.shorts), calze = rgb(kit.socks), guanti = kit.gloves ? rgb(kit.gloves) : null;
  const bandaCorti = kit.banda ? rgb(kit.banda) : due, orlo = scuro(maglia, 0.8), disegno = DISEGNI[kit.stile] || null;
  const colletto = kit.colletto || 'giro', raglan = !!kit.raglan, dentro = scuro(maglia, 0.5), cucitura = scuro(due, 0.7), bottone = scuro(due, 0.55);
  for (let i = 0; i < o.length; i += 4) {
    const z = Math.floor(m[i] / 28), davanti = m[i] % 28 >= 7, px = m[i + 1] / 255 - 0.5, h = m[i + 2] / 255 * 1.9, ax = Math.abs(px); let col = null, tessuto = true;
    if (z === ZONA.MAGLIA) {
      if (h < M.orloMaglia && ax < 0.19) col = orlo; // l'orlo in fondo alla maglia
      else { const k = disegno ? disegno(px, h) : 0; col = k <= 0 ? maglia : k >= 1 ? due : [maglia[0] + (due[0] - maglia[0]) * k, maglia[1] + (due[1] - maglia[1]) * k, maglia[2] + (due[2] - maglia[2]) * k]; }
      // maniche raglan: il secondo colore parte dal colletto e scende in diagonale fino all'ascella, con la cucitura
      if (raglan) { const lim = h > M.braccio ? 0.19 - (h - M.braccio) / 0.17 * 0.11 : 0.19; if (ax > lim + 0.004) col = due; else if (ax > lim - 0.004) col = cucitura; }
      // scollo a V (solo davanti): il bordino nel secondo colore e, dentro, il rovescio della maglia in ombra
      if (colletto === 'v' && davanti && ax < 0.085 && h > 1.33) { const l = 1.355 + 1.5 * ax; if (Math.abs(h - l) < 0.013) col = due; else if (h > l) col = dentro; }
      // polo (solo davanti): l'abbottonatura con due bottoni e le punte del colletto che scendono sul petto
      if (colletto === 'polo' && davanti && h > 1.34) {
        if (ax < 0.017) col = (ax * ax + (h - 1.42) ** 2 < 4e-5 || ax * ax + (h - 1.38) ** 2 < 4e-5) ? bottone : ax > 0.013 ? cucitura : due;
        else if (ax < 0.08 && h > 1.452 - ax * 0.55) col = due;
      }
    } else if (z === ZONA.COLLETTO || z === ZONA.BORDO) col = due;
    else if (z === ZONA.PANTALONCINI) col = h < M.orloCorti ? scuro(corti, 0.78) : ax > M.bandaCorti && h > 0.75 ? bandaCorti : corti; // orlo e banda laterale
    // il risvolto in alto, con una cucitura; sotto, i due giri di nastro che tengono il parastinchi (un filo più scuri)
    else if (z === ZONA.CALZETTONI) col = h > M.risvolto ? due : h > M.risvolto - 0.02 ? scuro(calze, 0.75) : M.nastri.some(([a, b]) => h > a && h < b) ? scuro(calze, 0.93) : calze;
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
 * B stoffa sotto (255 pantaloncini, 150 calzettoni), A fascia da capitano (255, sul braccio sinistro), capelli e sopracciglia
 * dipinti (120), barba (60).
 * @param {ImageData} maschera
 * @returns {{ data: Uint8Array, size: number }}
 */
export function creaZone(maschera) {
  const N = maschera.width, m = maschera.data, d = new Uint8Array(N * N * 4), M = MISURE;
  for (let i = 0; i < d.length; i += 4) {
    const z = Math.floor(m[i] / 28), px = m[i + 1] / 255 - 0.5, h = m[i + 2] / 255 * 1.9;
    // sulla pelle del corpo nuovo la maschera dice anche che cosa c'è sopra (valori sotto 7): 2 capelli, 4 sopracciglia,
    // 5 barba, 6 occhio. L'occhio non prende il tono della pelle; capelli, sopracciglia e barba vanno nel canale A (120 e 60)
    const sopra = z === ZONA.PELLE ? m[i] : 0;
    d[i] = z === ZONA.PELLE ? (sopra === 6 ? 0 : 255) : z === ZONA.AVAMBRACCIO || z === ZONA.MANO ? 128 : 0;
    d[i + 1] = z === ZONA.SCARPE ? (h < M.suola ? 128 : 255) : 0;
    d[i + 2] = z === ZONA.PANTALONCINI ? 255 : z === ZONA.CALZETTONI ? 150 : 0;
    d[i + 3] = z === ZONA.MAGLIA && h > M.braccio && px > M.fascia[0] && px < M.fascia[1] ? 255 : sopra === 2 || sopra === 4 ? 120 : sopra === 5 ? 60 : 0;
  }
  return { data: d, size: N };
}

/**
 * Le pieghe della stoffa (metri, in fuori positivo) nel punto x (sinistra-destra), h (altezza) di una zona: in vita la
 * maglia si raccoglie in onde orizzontali, dalle ascelle partono pieghe tese a ventaglio verso la pancia, la manica
 * fa pieghe vicino all'ascella; sui pantaloncini pieghe a ventaglio dall'inguine verso l'esterno della coscia e pieghe
 * verticali verso l'orlo. Sotto tutto un'onda larga e morbida, perché la stoffa non sia mai tesa come la pelle.
 * @param {number} z  zona (ZONA)
 * @param {number} x
 * @param {number} h
 * @param {boolean} davanti
 */
export function pieghe(z, x, h, davanti) {
  const P = PIEGHE, ax = Math.abs(x), finestra = (v, a, b, s) => piu((v - a) / s) * piu((b - v) / s);
  if (z === ZONA.MAGLIA) {
    // l'onda larga, più leggera dietro
    let f = P.onda * Math.sin(x * 31 + h * 7) * Math.sin(h * 19 - x * 11) * (davanti ? 1 : 0.6);
    if (ax < 0.19) {
      // in vita: onde orizzontali ogni 5-6 cm, storte di lato, che si spengono verso i fianchi e sopra la pancia
      // (le onde si curvano a U verso il centro e si spezzano in tratti, come stoffa che ricade)
      const onda = (h - 0.95 - 0.5 * x * x) / 0.055 * 6.283 + 1.8 * Math.sin(x * 14 + 1) + 0.8 * Math.sin(x * 31);
      f += P.vita * Math.sin(onda) * finestra(h, 0.955, 1.13, 0.05) * (0.45 + 0.55 * piu(0.5 + 0.8 * Math.sin(x * 17 + h * 40))) * (0.55 + 0.45 * Math.cos(x * 9));
      // dalle ascelle: pieghe a ventaglio che scendono verso il centro, più forti davanti
      const dx = 0.175 - ax, dh = 1.375 - h, r = Math.hypot(dx, dh), a = Math.atan2(dh, dx);
      f += P.ascelle * Math.sin(a * 15 + r * 9) * finestra(r, 0.025, 0.2, 0.05) * finestra(a, 0.25, 1.25, 0.22) * (davanti ? 1 : 0.7);
    } else {
      // la manica: pieghe vicino all'ascella, che girano un po' col braccio
      f += P.manica * Math.sin((ax - 0.19) * 80 + 0.3 * Math.sin(h * 18)) * finestra(ax, 0.19, 0.3, 0.03);
    }
    return f;
  }
  if (z === ZONA.PANTALONCINI) {
    let f = P.onda * Math.sin(x * 37 - h * 9) * Math.sin(h * 23 + x * 13);
    // dall'inguine verso l'esterno della coscia, a ventaglio
    const dx = ax - 0.015, dh = 0.87 - h, r = Math.hypot(dx, dh), a = Math.atan2(dh, dx);
    f += P.inguine * Math.sin(a * 11 + r * 12) * finestra(r, 0.03, 0.17, 0.04) * finestra(a, 0.35, 1.35, 0.25) * (davanti ? 1 : 0.8);
    // verso l'orlo la stoffa cade larga: pieghe verticali morbide
    f += P.orlo * Math.sin(x * 70 + 0.8 * Math.sin(h * 30)) * finestra(h, 0.66, 0.78, 0.05);
    return f;
  }
  return 0;
}

/**
 * Il rilievo della stoffa e quanto è lucida ogni zona, calcolati una volta sola dalla maschera.
 * Altezza (in "punti" della texture): costine di colletto, polsini e risvolto dei calzettoni, costine verticali dei
 * calzettoni, cucitura della spalla, orlo della maglia e dei pantaloncini, le pieghe (pieghe) e una trama fine.
 * Dall'altezza si ricava la normal map (spazio tangente), saltando i bordi tra pezzi diversi della texture (lì due
 * pixel vicini non sono vicini sul corpo). Pieghe e costine si calcolano su coordinate lisciate (la maschera ha 8 bit).
 * Ruvidezza (canale G, come la legge three.js): pelle 0,6, stoffa 0,82, bordi a costine 0,74, scarpini 0,35.
 * @param {ImageData} maschera
 * @returns {{ normali: Uint8Array, ruvido: Uint8Array, size: number }}
 */
export function creaRilievo(maschera) {
  const N = maschera.width, m = maschera.data, H = new Float32Array(N * N), X = new Float32Array(N * N), Y = new Float32Array(N * N), Z = new Uint8Array(N * N), M = MISURE;
  const ruvido = new Uint8Array(N * N * 4);
  for (let p = 0; p < N * N; p++) { X[p] = m[p * 4 + 1] / 255 - 0.5; Y[p] = m[p * 4 + 2] / 255 * 1.9; Z[p] = Math.floor(m[p * 4] / 28); }
  const vicino = (p, q) => Z[q] === Z[p] && Math.abs(X[q] - X[p]) + Math.abs(Y[q] - Y[p]) < 0.03;
  // coordinate lisciate: media dei vicini della stessa zona (prima lungo le righe, poi lungo le colonne, due volte)
  let XL = X, YL = Y;
  for (let giro = 0; giro < 4; giro++) {
    const passo = giro & 1 ? N : 1, R = PIEGHE.liscia, XN = new Float32Array(N * N), YN = new Float32Array(N * N);
    for (let p = 0; p < N * N; p++) {
      let sx = XL[p], sy = YL[p], n = 1;
      if (Z[p] === ZONA.MAGLIA || Z[p] === ZONA.PANTALONCINI || Z[p] === ZONA.CALZETTONI) {
        const u = p % N, v = (p / N) | 0;
        for (let k = -R; k <= R; k++) {
          if (!k) continue; const uu = passo === 1 ? u + k : u, vv = passo === 1 ? v : v + k;
          if (uu < 0 || uu >= N || vv < 0 || vv >= N) continue; const q = vv * N + uu;
          if (vicino(p, q)) { sx += XL[q]; sy += YL[q]; n++; }
        }
      }
      XN[p] = sx / n; YN[p] = sy / n;
    }
    XL = XN; YL = YN;
  }
  for (let p = 0; p < N * N; p++) {
    const i = p * 4, z = Z[p], x = X[p], h = Y[p], ax = Math.abs(x), u = p % N, v = (p / N) | 0, davanti = m[i] % 28 >= 7;
    let a = 0, r = 0.82;
    const trama = (((u >> 1) + (v >> 1)) & 1) * 0.12; // la maglia fine del tessuto tecnico
    if (z === ZONA.MAGLIA) {
      a = trama;
      if (h > M.braccio && Math.abs(ax - 0.19) < 0.006) a -= 0.9; // cucitura della spalla, dove la manica si attacca
      if (h < M.orloMaglia && ax < 0.19) a += 0.35 - (Math.abs(h - M.orloMaglia) < 0.005 ? 0.9 : 0); // orlo, con la cucitura sopra
    } else if (z === ZONA.COLLETTO || z === ZONA.BORDO) { a = 0.5 + 0.3 * Math.sin(u * 1.9); r = 0.74; } // costine a rilievo
    else if (z === ZONA.PANTALONCINI) a = trama + (h < M.orloCorti ? 0.35 - (Math.abs(h - M.orloCorti) < 0.005 ? 0.9 : 0) : 0);
    else if (z === ZONA.CALZETTONI) {
      // costine verticali e risvolto; sui giri di nastro niente costine ma pieghe fitte e storte, e il nastro un po' in rilievo
      const nastro = M.nastri.some(([a, b]) => YL[p] > a && YL[p] < b);
      a = nastro ? 0.6 + 0.45 * Math.sin(YL[p] * 420 + XL[p] * 160 + Math.sin(XL[p] * 90) * 2) : 0.3 * Math.sin(XL[p] * 520) + (h > M.risvolto ? 0.5 : 0);
      r = h > M.risvolto ? 0.74 : nastro ? 0.6 : 0.85;
    }
    else if (z === ZONA.SCARPE) { r = 0.35; a = h < M.suola ? 0.4 : 0; }
    else if ((z === ZONA.MANO || z === ZONA.AVAMBRACCIO)) r = 0.62;
    else r = 0.6;
    // le pieghe, da metri a punti della texture
    a += pieghe(z, XL[p], YL[p], davanti) / PIEGHE.metriPixel;
    H[p] = a; ruvido[i] = 255; ruvido[i + 1] = Math.round(r * 255); ruvido[i + 2] = 255; ruvido[i + 3] = 255;
  }
  const normali = new Uint8Array(N * N * 4), k = 0.9;
  for (let v = 0; v < N; v++) for (let u = 0; u < N; u++) {
    const p = v * N + u, dentro = (q) => q >= 0 && q < N * N && vicino(p, q);
    const d = (a, b) => (dentro(a) && dentro(b) ? H[a] - H[b] : 0) * 0.5;
    const dx = u > 0 && u < N - 1 ? d(p + 1, p - 1) : 0, dy = v > 0 && v < N - 1 ? d(p + N, p - N) : 0;
    let nx = -dx * k, ny = -dy * k, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    const i = p * 4; normali[i] = Math.round((nx * 0.5 + 0.5) * 255); normali[i + 1] = Math.round((ny * 0.5 + 0.5) * 255); normali[i + 2] = Math.round((nz * 0.5 + 0.5) * 255); normali[i + 3] = 255;
  }
  return { normali, ruvido, size: N };
}
