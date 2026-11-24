/* I dintorni dello stadio: quello che si vede fuori dalle tribune, dall'alto e nelle riprese larghe. Niente grigio vuoto:
   il terreno (prato di campagna o piazzale e isolati di città) con la strada attorno allo stadio, le strade che se ne
   vanno, i parcheggi con le macchine; i lampioni lungo le strade, accesi di notte; colline in lontananza; e per lo
   stadio grande i palazzi della città con le finestre illuminate. Il Monte Titano e l'orizzonte restano quelli di
   sempre (src/game.js). Tutto è lontano dalla telecamera di gioco: niente di alto tra lei e il campo.

   Il terreno è una sola tela disegnata al momento e stesa sul piano che c'è già attorno al campo (`terreno`): costa
   una texture. Lampioni, palazzi e luci sono tre o quattro chiamate di disegno in tutto. */

const LATO = 700;

/**
 * `fuori` è STADI.tipi.*.fuori (src/config.js), `ingombro` le due mezze misure dello stadio in pianta, `casuale` un
 * generatore di numeri sempre uguali. Risponde `illumina(notte)` e `togli()`.
 */
export function creaDintorni(T, scene, { terreno, fuori: D, ingombro, casuale }) {
  const radice = new T.Group(); radice.name = 'dintorni'; scene.add(radice);
  const [ix, iz] = ingombro, citta = D.terreno === 'città', tela = document.createElement('canvas'); tela.width = tela.height = D.tela || 1024;
  const x = tela.getContext('2d'), k = tela.width / LATO, P = (m) => (m + LATO / 2) * k;
  // un rettangolo con gli angoli tondi attorno al centro del campo, di mezze misure a e b
  const tondo = (a, b, r) => { x.beginPath(); x.roundRect(P(-a), P(-b), 2 * a * k, 2 * b * k, r * k); };
  // ---- il fondo: prato con chiazze, oppure asfalto
  x.fillStyle = citta ? '#3d4046' : '#4f7d38'; x.fillRect(0, 0, tela.width, tela.height);
  for (let i = 0; i < 900; i++) {
    const v = casuale(); x.fillStyle = citta ? `rgba(${v < 0.5 ? '20,22,26' : '90,94,100'},.12)` : `rgba(${v < 0.5 ? '40,84,34' : '120,150,70'},.16)`;
    x.beginPath(); x.ellipse(casuale() * tela.width, casuale() * tela.height, (6 + casuale() * 30) * k, (4 + casuale() * 18) * k, casuale() * 3, 0, 7); x.fill();
  }
  // ---- città: isolati tra una strada e l'altra, e i palazzi che ci stanno sopra
  const palazzi = [];
  if (citta) {
    const passo = 62, largo = passo - 12;
    for (let gx = -LATO / 2 + 6; gx < LATO / 2; gx += passo) for (let gz = -LATO / 2 + 6; gz < LATO / 2; gz += passo) {
      const cx = gx + largo / 2, cz = gz + largo / 2; if (Math.abs(cx) < ix + D.margine + 75 && Math.abs(cz) < iz + D.margine + 75) continue;
      x.fillStyle = ['#555a63', '#4b5058', '#5f6259', '#585049'][Math.floor(casuale() * 4)]; x.fillRect(P(gx), P(gz), largo * k, largo * k);
      // niente palazzi dalla parte della telecamera di gioco, vicino al campo: resterebbero tra lei e il prato
      if (palazzi.length < D.palazzi && casuale() < 0.75) palazzi.push({ x: cx + (casuale() - 0.5) * 10, z: cz + (casuale() - 0.5) * 10, w: 14 + casuale() * 22, p: 14 + casuale() * 22, h: 9 + casuale() * casuale() * 46 });
    }
  }
  // ---- le strade: una ad anello attorno allo stadio e quelle che vanno via, con la mezzeria tratteggiata
  const ax = ix + D.margine + 9, az = iz + D.margine + 9, lampioni = [];
  const uscite = [[1, 0], [-1, 0], [0, -1], [0, 1]].slice(0, D.strade);
  const strada = (larga, colore, tratti) => {
    x.lineWidth = larga * k; x.strokeStyle = colore; x.setLineDash(tratti ? [4 * k, 5 * k] : []);
    tondo(ax, az, 26); x.stroke();
    for (const [ux, uz] of uscite) { x.beginPath(); x.moveTo(P(ux * ax), P(uz * az)); x.lineTo(P(ux * LATO / 2), P(uz * LATO / 2)); x.stroke(); }
  };
  strada(11, citta ? '#24262a' : '#3a3b3d', false); strada(0.5, '#d8d4c0', true); x.setLineDash([]);
  // ---- il piazzale ai piedi dello stadio, tra le tribune e la strada
  x.fillStyle = citta ? '#74777b' : '#8b8676'; tondo(ix + D.margine, iz + D.margine, 22); x.fill();
  x.fillStyle = '#5b5f63'; tondo(ix + 1, iz + 1, 10); x.fill();
  // ---- parcheggi con le macchine in fila, oltre la strada ad anello: prima di fronte e ai lati, mai alle spalle vicino
  const posti = [[-1, -1], [1, -1], [1.5, 0], [-1.5, 0], [-1, 1.25], [1, 1.25]].slice(0, D.parcheggi), colori = ['#c9ccd1', '#2a2d33', '#8f1d22', '#1f3f7a', '#dcd8cc', '#4a4d52', '#b98a2c'];
  for (const [sx, sz] of posti) {
    const w = D.parcheggio[0], p = D.parcheggio[1], cx = sx * (ax * 0.55 + (sz ? 0 : w * 0.6 + 14)), cz = sz ? sz * (az + 12 + p / 2) : 0;
    const a = sz ? [w, p] : [p, w];
    x.fillStyle = citta ? '#2f3237' : '#6f6a5e'; x.fillRect(P(cx - a[0] / 2), P(cz - a[1] / 2), a[0] * k, a[1] * k);
    for (let fx = cx - a[0] / 2 + 3; fx < cx + a[0] / 2 - 3; fx += 3) for (let fz = cz - a[1] / 2 + 4; fz < cz + a[1] / 2 - 4; fz += 11) {
      if (casuale() > D.pieno) continue; x.fillStyle = colori[Math.floor(casuale() * colori.length)]; x.fillRect(P(fx), P(fz), 2 * k, 4.4 * k);
    }
    for (const e of [-1, 1]) lampioni.push({ x: cx + e * a[0] * 0.3, z: cz });
  }
  // ---- lampioni lungo la strada ad anello e lungo le uscite
  const giro = 2 * (2 * ax + 2 * az), quanti = Math.round(giro / D.lampioni);
  for (let i = 0; i < quanti; i++) {
    // lungo il rettangolo della strada, sul lato di fuori
    let s = (i + 0.5) / quanti * giro, px, pz;
    if (s < 2 * ax) { px = -ax + s; pz = -az - 7; } else if ((s -= 2 * ax) < 2 * az) { px = ax + 7; pz = -az + s; } else if ((s -= 2 * az) < 2 * ax) { px = ax - s; pz = az + 7; } else { px = -ax - 7; pz = az - (s - 2 * ax); }
    lampioni.push({ x: px, z: pz });
  }
  for (const [ux, uz] of uscite) for (let d = D.lampioni; d < LATO / 2 - Math.max(ax, az); d += D.lampioni) lampioni.push({ x: ux * (ax + d) + uz * 7, z: uz * (az + d) + ux * 7 });
  const tex = new T.CanvasTexture(tela); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 4;
  const prima = { map: terreno.material.map, colore: terreno.material.color.getHex() };
  terreno.material.map = tex; terreno.material.color.set(0xffffff); terreno.material.needsUpdate = true;

  // ---- pali dei lampioni e, di notte, le loro luci
  const m4 = new T.Matrix4(), q = new T.Quaternion(), v = new T.Vector3(), sc = new T.Vector3();
  const pali = new T.InstancedMesh(new T.BoxGeometry(0.25, 1, 0.25), new T.MeshLambertMaterial({ color: 0x4a4f58 }), lampioni.length);
  lampioni.forEach((l, i) => { v.set(l.x, D.palo / 2, l.z); sc.set(1, D.palo, 1); m4.compose(v, q, sc); pali.setMatrixAt(i, m4); });
  radice.add(pali);
  const alone = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const g2 = c.getContext('2d'), g = g2.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); g2.fillStyle = g; g2.fillRect(0, 0, 32, 32); return new T.CanvasTexture(c); })();
  const punti = (dove, misura, nebbia) => {
    const pos = new Float32Array(dove.length * 3), col = new Float32Array(dove.length * 3), c = new T.Color();
    dove.forEach((d, i) => { pos.set([d.x, d.y, d.z], i * 3); c.set(d.c); c.toArray(col, i * 3); });
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('color', new T.BufferAttribute(col, 3));
    const p = new T.Points(g, new T.PointsMaterial({ map: alone, size: misura, vertexColors: true, transparent: true, depthWrite: false, blending: T.AdditiveBlending, sizeAttenuation: true, fog: nebbia }));
    p.visible = false; radice.add(p); return p;
  };
  const luci = [punti(lampioni.map((l) => ({ x: l.x, y: D.palo + 0.3, z: l.z, c: 0xffd9a0 })), 9, true)];

  // ---- i palazzi della città e le loro finestre accese
  if (palazzi.length) {
    const blocchi = new T.InstancedMesh(new T.BoxGeometry(1, 1, 1), new T.MeshLambertMaterial({ color: 0xffffff }), palazzi.length), c = new T.Color(), finestre = [];
    palazzi.forEach((b, i) => {
      v.set(b.x, b.h / 2, b.z); sc.set(b.w, b.h, b.p); m4.compose(v, q, sc); blocchi.setMatrixAt(i, m4);
      c.setHSL(0.58 + casuale() * 0.08, 0.08 + casuale() * 0.1, 0.42 + casuale() * 0.22); blocchi.setColorAt(i, c);
      // finestre sulle quattro facce, più sui palazzi alti
      for (let n = Math.round(D.finestre * b.h / 20); n > 0; n--) {
        const lato = Math.floor(casuale() * 4), u = casuale() - 0.5, y = 2 + casuale() * (b.h - 3);
        finestre.push({ x: b.x + (lato < 2 ? u * b.w : (lato === 2 ? 0.52 : -0.52) * b.w), y, z: b.z + (lato < 2 ? (lato ? 0.52 : -0.52) * b.p : u * b.p), c: casuale() < 0.7 ? 0xffd58a : 0xcfe2ff });
      }
    });
    radice.add(blocchi); luci.push(punti(finestre, 5, false));
  }
  // ---- colline in lontananza, dalla parte di fronte alla telecamera
  if (D.colline) {
    const colle = new T.MeshLambertMaterial({ color: 0x4f7a45 });
    for (let i = 0; i < D.colline; i++) { const c = new T.Mesh(new T.SphereGeometry(1, 20, 10), colle), r = 90 + casuale() * 60, a = Math.PI * (0.15 + 0.7 * (i + casuale() * 0.6) / D.colline); c.scale.set(r, r * 0.25, r * 0.8); c.position.set(Math.cos(a) * 250, -4, -Math.sin(a) * 250); radice.add(c); }
  }

  /** Di notte si accendono lampioni e finestre. */
  function illumina(notte) { for (const p of luci) p.visible = notte; }
  /** Toglie i dintorni dalla scena e rimette il terreno com'era. */
  function togli() {
    scene.remove(radice); terreno.material.map = prima.map; terreno.material.color.setHex(prima.colore); terreno.material.needsUpdate = true;
    radice.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); if (o.isInstancedMesh) o.dispose(); });
    tex.dispose(); alone.dispose();
  }
  return { illumina, togli, lampioni: lampioni.length, palazzi: palazzi.length };
}
