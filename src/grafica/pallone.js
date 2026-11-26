/* Il disegno del pallone: 12 pentagoni e 20 esagoni come un pallone vero (icosaedro troncato), con le cuciture, fatto al
   momento su una tela larga il doppio dell'altezza (come la vuole la sfera di three.js: giro intorno all'asse verticale in
   larghezza, dal polo nord al polo sud in altezza). I centri dei pentagoni sono i vertici di un icosaedro, quelli degli
   esagoni i centri delle sue facce: ogni punto della sfera prende il colore della faccia più vicina, e dove due facce sono
   quasi alla stessa distanza c'è la cucitura. Nessun file e nessun disegno di altri. */
const F = (1 + Math.sqrt(5)) / 2;
const norma = (v) => { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };
const PENTAGONI = [[0, 1, F], [0, 1, -F], [0, -1, F], [0, -1, -F], [1, F, 0], [1, -F, 0], [-1, F, 0], [-1, -F, 0], [F, 0, 1], [F, 0, -1], [-F, 0, 1], [-F, 0, -1]].map(norma);
const ESAGONI = [];
for (const a of [1, -1]) for (const b of [1, -1]) for (const c of [1, -1]) ESAGONI.push(norma([a, b, c]));
for (const a of [1, -1]) for (const b of [1, -1]) { ESAGONI.push(norma([0, a * F, b / F]), norma([a / F, 0, b * F]), norma([a * F, b / F, 0])); }

/**
 * Disegna il pallone sul contesto `x` di una tela w×h. fondo: colore degli esagoni; cols: colori dei pentagoni (a giro);
 * cucitura: colore delle cuciture. P.penta: quanto i pentagoni prevalgono sugli esagoni (la loro grandezza); P.cucitura:
 * spessore della cucitura (differenza di vicinanza fra le due facce); P.ombra: quanto scuriscono i bordi delle facce.
 */
export function disegnaPallone(x, w, h, fondo, cols, P) {
  const img = x.createImageData(w, h), d = img.data, rgb = (c) => { x.fillStyle = c; const s = x.fillStyle; return s[0] === '#' ? [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)] : [255, 255, 255]; };
  const F0 = rgb(fondo), CP = cols.map(rgb), CU = rgb(P.colore);
  for (let j = 0; j < h; j++) {
    const th = (j + .5) / h * Math.PI, st = Math.sin(th), y = Math.cos(th);
    for (let i = 0; i < w; i++) {
      // come la SphereGeometry di three.js: x = -cos(phi) sin(theta), z = sin(phi) sin(theta)
      const ph = (i + .5) / w * Math.PI * 2, px = -Math.cos(ph) * st, pz = Math.sin(ph) * st;
      let b1 = -9, b2 = -9, chi = -1;
      for (let k = 0; k < 12; k++) { const q = PENTAGONI[k], v = px * q[0] + y * q[1] + pz * q[2] + P.penta; if (v > b1) { b2 = b1; b1 = v; chi = k; } else if (v > b2) b2 = v; }
      for (let k = 0; k < 20; k++) { const q = ESAGONI[k], v = px * q[0] + y * q[1] + pz * q[2]; if (v > b1) { b2 = b1; b1 = v; chi = 12 + k; } else if (v > b2) b2 = v; }
      const gap = b1 - b2, o = (j * w + i) * 4;
      let c = chi < 12 ? CP[chi % CP.length] : F0;
      // verso il bordo della faccia il colore scurisce appena (la faccia è un po' bombata), sulla cucitura il colore della cucitura
      const k2 = gap < P.cucitura ? 0 : 1 - P.ombra * Math.max(0, 1 - (gap - P.cucitura) / (P.cucitura * 6));
      if (gap < P.cucitura) c = CU;
      d[o] = c[0] * k2; d[o + 1] = c[1] * k2; d[o + 2] = c[2] * k2; d[o + 3] = 255;
    }
  }
  x.putImageData(img, 0, 0);
}
