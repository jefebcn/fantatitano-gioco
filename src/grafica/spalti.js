/* Gli spalti: gradoni in cemento (texture CC0 di ambientCG in public/textures/stadium, o cemento disegnato al momento),
   scale di accesso, muretti, ringhiere, tunnel d'ingresso, striscioni e bandiere coi colori delle due squadre, e la folla.

   La folla sono migliaia di tifosi disegnati con una InstancedMesh per tribuna: quattro chiamate grafiche in tutto, e la
   tribuna alle spalle della telecamera viene scartata intera.
   Ogni tifoso ha un colore (della sua squadra, o un po' di neutri) e una fase sua; ondeggia e salta alzando le braccia
   nello shader, senza calcoli per tifoso sul processore: da qui si cambiano solo due numeri (quanto esulta ogni settore). */

const RIS = 'textures/stadium/';
const hyp = Math.hypot;
// gradoni: quante file, quanto profonda e quanto alta ogni fila, altezza del muretto davanti
export const GRADONI = { file: 20, prof: 0.85, alt: 0.5, muro: 1.6, posto: 0.78, scale: 16 };

function cementoDiRiserva(T) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  x.fillStyle = '#b9b6b0'; x.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 2500; i++) { const v = 150 + Math.random() * 60; x.fillStyle = `rgba(${v},${v},${v - 4},.35)`; x.fillRect(Math.random() * 128, Math.random() * 128, 1 + Math.random() * 2, 1 + Math.random() * 2); }
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
}

/** I gradoni di una tribuna lunga `len` (coordinate locali: x lungo la tribuna, z verso il dietro negativo, y in alto). */
function geometriaGradoni(T, len) {
  const G = GRADONI, pos = [], uv = [], nor = [], idx = [];
  const quad = (a, b, c, d, n) => {
    // giro dei vertici coerente con la normale (altrimenti la faccia viene scartata vista dal lato giusto)
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]], cr = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    if (cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2] < 0) [b, d] = [d, b];
    const k = pos.length / 3; for (const p of [a, b, c, d]) { pos.push(...p); nor.push(...n); uv.push((p[0] + p[2] * 0.3) / 4, (p[1] - p[2]) / 4); } idx.push(k, k + 1, k + 2, k, k + 2, k + 3); };
  const L = len / 2;
  quad([-L, 0, 0.01], [L, 0, 0.01], [L, G.muro, 0.01], [-L, G.muro, 0.01], [0, 0, 1]); // muretto davanti
  for (let r = 0; r < G.file; r++) {
    const y = G.muro + r * G.alt, z0 = -r * G.prof, z1 = -(r + 1) * G.prof;
    quad([-L, y, z0], [-L, y, z1], [L, y, z1], [L, y, z0], [0, 1, 0]); // pedata
    if (r < G.file - 1) quad([-L, y, z1], [-L, y + G.alt, z1], [L, y + G.alt, z1], [L, y, z1], [0, 0, 1]); // alzata
  }
  const yt = G.muro + (G.file - 1) * G.alt, zt = -G.file * G.prof;
  quad([L, 0, zt], [-L, 0, zt], [-L, yt + 2.5, zt], [L, yt + 2.5, zt], [0, 0, -1]); // muro di fondo
  for (const s of [-1, 1]) quad([s * L, 0, 0], [s * L, 0, zt], [s * L, yt + 2.5, zt], [s * L, G.muro, 0], [s, 0, 0]); // fianchi
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  return g;
}

// colori a caso ma sempre uguali (dal seme)
function casuale(seme) { let s = seme >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

export function creaSpalti(T, scene, { HL, HW, max = 7200 }) {
  const loader = new T.TextureLoader(), materiali = [];
  const cemento = new T.MeshStandardMaterial({ color: 0xc9c5bd, roughness: 0.95, metalness: 0, map: cementoDiRiserva(T) });
  const scaleM = new T.MeshStandardMaterial({ color: 0xe9e1cf, roughness: 0.9, metalness: 0 });
  loader.load(RIS + 'concrete_albedo.webp', (t) => { t.wrapS = t.wrapT = T.RepeatWrapping; t.colorSpace = T.SRGBColorSpace; cemento.map = t; scaleM.map = t; cemento.needsUpdate = scaleM.needsUpdate = true; });
  loader.load(RIS + 'concrete_roughness.webp', (t) => { t.wrapS = t.wrapT = T.RepeatWrapping; cemento.roughnessMap = t; cemento.needsUpdate = true; });
  materiali.push(cemento, scaleM);
  const ferro = new T.MeshStandardMaterial({ color: 0x9aa3b2, metalness: 0.7, roughness: 0.35 });
  const tetto = new T.MeshStandardMaterial({ color: 0x2b3245, roughness: 0.6, metalness: 0.3 });
  // le quattro tribune: posizione, lunghezza e rotazione. Il settore 1 è quello degli ospiti, la curva dalla parte delle x positive
  const tribune = [
    { len: HL * 2 + 30, x: 0, z: -(HW + 6.5), ry: 0, settore: 0, tetto: true, tunnel: true },
    { len: HL * 2 + 30, x: 0, z: HW + 6.5, ry: Math.PI, settore: 0 }, // senza copertura: è alle spalle della telecamera di gioco
    { len: HW * 2 + 13, x: HL + 8.5, z: 0, ry: -Math.PI / 2, settore: 1 },
    { len: HW * 2 + 13, x: -(HL + 8.5), z: 0, ry: Math.PI / 2, settore: 0 },
  ];
  const G = GRADONI, posti = [], striscioni = [], bandiere = [];
  for (const tr of tribune) {
    const g = new T.Group(); g.position.set(tr.x, 0, tr.z); g.rotation.y = tr.ry; scene.add(g); tr.g = g;
    g.add(new T.Mesh(geometriaGradoni(T, tr.len), cemento));
    // scale di accesso: ogni GRADONI.scale metri una fascia di gradini più chiari, senza posti
    const nS = Math.floor(tr.len / G.scale), scaleX = [];
    for (let k = 1; k < nS; k++) scaleX.push(-tr.len / 2 + k * tr.len / nS);
    const scalino = new T.BoxGeometry(1.4, G.alt / 2, G.prof / 2), sc = new T.InstancedMesh(scalino, scaleM, scaleX.length * G.file * 2), m4 = new T.Matrix4(); let n = 0;
    for (const sx of scaleX) for (let r = 0; r < G.file; r++) for (const h of [0, 1]) { m4.makeTranslation(sx, G.muro + r * G.alt + G.alt * (h ? 0.5 : 0) + G.alt / 4 - (h ? 0 : 0), -r * G.prof - G.prof * (h ? 0.75 : 0.25)); sc.setMatrixAt(n++, m4); }
    g.add(sc);
    // ringhiera sul muretto: montanti e due corrimano
    const nP = Math.floor(tr.len / 2.5), mont = new T.InstancedMesh(new T.CylinderGeometry(0.035, 0.035, 1, 6), ferro, nP + 1);
    for (let k = 0; k <= nP; k++) { m4.makeTranslation(-tr.len / 2 + k * tr.len / nP, G.muro + 0.5, 0.05); mont.setMatrixAt(k, m4); }
    g.add(mont);
    for (const hy of [0.55, 1]) { const c = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, tr.len, 6), ferro); c.rotation.z = Math.PI / 2; c.position.set(0, G.muro + hy, 0.05); g.add(c); }
    // copertura sulle tribune lunghe
    if (tr.tetto) {
      const t = new T.Mesh(new T.BoxGeometry(tr.len, 0.6, 15), tetto); t.position.set(0, G.muro + G.file * G.alt + 4, -G.file * G.prof + 5); t.rotation.x = -0.06; g.add(t);
      for (let k = -2; k <= 2; k++) { const p = new T.Mesh(new T.CylinderGeometry(0.35, 0.35, G.muro + G.file * G.alt + 4, 8), tetto); p.position.set(k * tr.len / 5, (G.muro + G.file * G.alt + 4) / 2, -G.file * G.prof - 0.5); g.add(p); }
    }
    // tunnel d'ingresso al campo, sotto la tribuna principale
    if (tr.tunnel) {
      const bocca = new T.Mesh(new T.BoxGeometry(4.6, 2.9, 0.4), new T.MeshBasicMaterial({ color: 0x07080c })); bocca.position.set(0, 1.45, 0.05); g.add(bocca);
      for (const s of [-1, 1]) { const m = new T.Mesh(new T.BoxGeometry(0.4, 3.1, 3.2), cemento); m.position.set(s * 2.5, 1.55, 1.6); g.add(m); }
      const cop = new T.Mesh(new T.CylinderGeometry(2.7, 2.7, 3.2, 20, 1, true, -Math.PI / 2, Math.PI), new T.MeshStandardMaterial({ color: 0x4B06FC, roughness: 0.5, side: T.DoubleSide })); cop.rotation.x = Math.PI / 2; cop.position.set(0, 3.1, 1.6); cop.scale.set(1, 1, 0.45); g.add(cop); tr.copertura = cop;
    }
    // posti a sedere (tranne scale e tunnel)
    for (let r = 0; r < G.file; r++) for (let x = -tr.len / 2 + 0.8; x < tr.len / 2 - 0.8; x += G.posto) {
      if (scaleX.some((sx) => Math.abs(x - sx) < 1.1) || (tr.tunnel && r < 6 && Math.abs(x) < 3.4)) continue;
      const p = new T.Vector3(x, G.muro + r * G.alt, -r * G.prof - G.prof * 0.45).applyMatrix4(g.matrixWorld.compose(g.position, g.quaternion, g.scale));
      posti.push({ p, ry: tr.ry, settore: tr.settore, tr });
    }
    // striscioni sul muretto e bandiere sui gradoni
    for (let k = 0; k < 3; k++) {
      const c = document.createElement('canvas'); c.width = 512; c.height = 96; const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace;
      const s = new T.Mesh(new T.PlaneGeometry(7, 1.3), new T.MeshStandardMaterial({ map: tex, roughness: 0.85 })); s.position.set((k - 1) * tr.len * 0.28 + (tr.tunnel ? 9 : 0), G.muro - 0.75, 0.04); g.add(s);
      striscioni.push({ c, tex, settore: tr.settore, k });
    }
    for (let k = 0; k < 2; k++) {
      const pg = new T.PlaneGeometry(2.2, 1.4, 10, 1), f = new T.Mesh(pg, new T.MeshStandardMaterial({ color: 0xffffff, side: T.DoubleSide, roughness: 0.9, vertexColors: true }));
      pg.setAttribute('color', new T.Float32BufferAttribute(new Float32Array(pg.attributes.position.count * 3).fill(1), 3));
      const asta = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 3.2, 6), ferro), r = 6 + k * 7, x = (k ? 0.22 : -0.3) * tr.len;
      asta.position.set(x, G.muro + r * G.alt + 1.6, -r * G.prof); f.position.set(x + 1.1, G.muro + r * G.alt + 2.5, -r * G.prof); g.add(asta, f);
      bandiere.push({ f, pg, settore: tr.settore, fase: Math.random() * 6 });
    }
  }
  // ---------------------------------------------------------------- la folla
  // Una folla per tribuna (una InstancedMesh), ognuna con la sua sfera d'ingombro: quella alle
  // spalle della telecamera non si disegna affatto. I posti sono in ordine sparso, così i primi n sono sparsi su tutto lo spalto.
  const rand = casuale(20261118), totale = Math.min(max, posti.length);
  // un tifoso è una sola geometria: busto, testa e due braccia (scatole senza le facce che non si vedono mai), con un
  // attributo che dice a quale parte appartiene ogni vertice; così è un solo disegno per tribuna e pochi vertici
  const tifoso = (() => {
    const pos = [], nor = [], parte = [], idx = [];
    const scatola = (w, h, d, cx, cy, cz, pt, senza) => {
      const b = new T.BoxGeometry(w, h, d); b.translate(cx, cy, cz);
      for (let f = 0; f < 6; f++) {
        if (senza.includes(f)) continue; // facce: 0 +x, 1 -x, 2 sopra, 3 sotto, 4 davanti, 5 dietro
        const o = pos.length / 3;
        for (let v = f * 4; v < f * 4 + 4; v++) { pos.push(b.attributes.position.getX(v), b.attributes.position.getY(v), b.attributes.position.getZ(v)); nor.push(b.attributes.normal.getX(v), b.attributes.normal.getY(v), b.attributes.normal.getZ(v)); parte.push(pt); }
        idx.push(o, o + 2, o + 1, o + 2, o + 3, o + 1);
      }
    };
    scatola(0.42, 0.56, 0.26, 0, 0.55, 0, 0, [3]); // busto
    scatola(0.2, 0.24, 0.22, 0, 0.98, 0, 1, [3]); // testa
    for (const sx of [-0.27, 0.27]) scatola(0.09, 0.44, 0.09, sx, 0.56, 0, 2, [2, 3]); // braccia
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); g.setAttribute('aParte', new T.Float32BufferAttribute(parte, 1)); g.setIndex(idx); return g;
  })();
  const U = { uT: { value: 0 }, uEsulta: { value: new T.Vector2() }, uMossa: { value: 0.5 } };
  const MAT = (() => {
    const m = new T.MeshLambertMaterial({ color: 0xffffff });
    m.customProgramCacheKey = () => 'folla';
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aParte; attribute vec3 aInfo; attribute vec3 aPelle; uniform float uT; uniform vec2 uEsulta; uniform float uMossa;')
        .replace('#include <color_vertex>', `#include <color_vertex>
// maglia per il busto, pelle per la testa, braccia con le maniche o scoperte (aInfo.z)
vColor.xyz = aParte < 0.5 ? instanceColor.xyz : aParte < 1.5 ? aPelle : mix(instanceColor.xyz, aPelle, aInfo.z);`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>
{
  float f = aInfo.x * 6.2831, e = aInfo.y < 0.5 ? uEsulta.x : uEsulta.y, varia = 0.7 + 0.6 * fract(aInfo.x * 7.31);
  if (aParte > 1.5) { float a = -e * (2.5 + 0.35 * sin(f * 3.0)) * varia; vec3 q = transformed; q.y -= 0.78; transformed.y = q.y * cos(a) - q.z * sin(a) + 0.78; transformed.z = q.y * sin(a) + q.z * cos(a); }
  transformed.y += e * max(0.0, sin(uT * 9.0 + f)) * 0.34 * varia + sin(uT * 1.7 + f) * 0.015 * uMossa; // salta quando esulta, respira sempre un po'
  transformed.x += sin(uT * 1.3 + f * 1.7) * 0.035 * uMossa; // ondeggia
}`);
    };
    materiali.push(m); return m;
  })();
  const m4 = new T.Matrix4(), q = new T.Quaternion(), sc = new T.Vector3(), asse = new T.Vector3(0, 1, 0), pelle = [0xf1c9a5, 0xe0ac7e, 0xc68642, 0x8d5524, 0x5c3a1e, 0xf6d7bd].map((c) => new T.Color(c));
  const folle = []; let N = 0;
  for (const tr of tribune) {
    const suoi = posti.filter((s) => s.tr === tr);
    for (let i = suoi.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [suoi[i], suoi[j]] = [suoi[j], suoi[i]]; }
    const n = Math.min(suoi.length, Math.round(totale * suoi.length / posti.length)); if (!n) continue;
    const info = new Float32Array(n * 3), cute = new Float32Array(n * 3), m = new T.InstancedMesh(tifoso.clone(), MAT, n);
    for (let i = 0; i < n; i++) {
      const s = suoi[i], k = 0.88 + rand() * 0.24; q.setFromAxisAngle(asse, s.ry + (rand() - 0.5) * 0.5); sc.set(k, k, k); m4.compose(s.p, q, sc);
      m.setMatrixAt(i, m4); m.setColorAt(i, pelle[0]); pelle[Math.floor(rand() * pelle.length)].toArray(cute, i * 3);
      info[i * 3] = rand(); info[i * 3 + 1] = s.settore;
    }
    // l'ingombro deve tenere conto dei salti e delle braccia alzate (lo shader sposta i vertici)
    m.computeBoundingSphere(); m.boundingSphere.radius += 1.5;
    const aInfo = new T.InstancedBufferAttribute(info, 3); m.geometry.setAttribute('aInfo', aInfo); m.geometry.setAttribute('aPelle', new T.InstancedBufferAttribute(cute, 3));
    scene.add(m); folle.push({ m, info, aInfo, n }); N += n;
  }

  // colori: maglie della squadra di casa negli spalti di casa, degli ospiti nella curva ospiti (più un po' di neutri)
  let squadre = null;
  function colora(casa, ospiti) {
    squadre = [casa, ospiti]; const r = casuale(hashStr((casa.name || '') + (ospiti.name || ''))), neutri = [0x2a2f45, 0xd8d8e0, 0x3b3f4f].map((c) => new T.Color(c)), col = new T.Color();
    for (const { m, info, aInfo, n } of folle) {
      for (let i = 0; i < n; i++) {
        const sq = squadre[info[i * 3 + 1] > 0.5 ? 1 : 0], u = r();
        col.set(u < 0.55 ? sq.c1 : u < 0.85 ? sq.c2 : 0); if (u >= 0.85) col.copy(neutri[Math.floor(r() * neutri.length)]);
        m.setColorAt(i, col); info[i * 3 + 2] = r() < 0.3 ? 1 : 0; // maniche lunghe o braccia scoperte
      }
      m.instanceColor.needsUpdate = aInfo.needsUpdate = true;
    }
    for (const s of striscioni) disegnaStriscione(s, squadre[s.settore]);
    for (const b of bandiere) { const sq = squadre[b.settore], a = new T.Color(sq.c1), c2 = new T.Color(sq.c2), col3 = b.pg.attributes.color; for (let i = 0; i < col3.count; i++) { const x = b.pg.attributes.position.getX(i), c = Math.floor((x + 1.1) / 0.44) % 2 ? a : c2; col3.setXYZ(i, c.r, c.g, c.b); } col3.needsUpdate = true; }
    if (tribune[0].copertura) tribune[0].copertura.material.color.set(casa.c1);
  }
  function disegnaStriscione(s, sq) {
    const x = s.c.getContext('2d'), testo = [`FORZA ${sq.short || sq.name}`, (sq.name || '').toUpperCase(), 'SEMPRE CON VOI'][s.k];
    x.fillStyle = sq.c1; x.fillRect(0, 0, 512, 96); x.fillStyle = sq.c2; x.fillRect(0, 0, 512, 14); x.fillRect(0, 82, 512, 14);
    x.fillStyle = sq.c2; x.textAlign = 'center'; x.textBaseline = 'middle'; let fs = 54; do { x.font = `${fs}px Anton, Impact, sans-serif`; fs -= 2; } while (x.measureText(testo).width > 470 && fs > 20);
    x.fillText(testo, 256, 50); s.tex.needsUpdate = true;
  }
  // ---------------------------------------------------------------- esultanza e animazione
  const es = [0, 0], fino = [0, 0];
  function esulta(settore, forza = 1, durata = 5) { es[settore] = Math.max(es[settore], forza); fino[settore] = Math.max(fino[settore], durata); }
  function densita(d) { const k = Math.max(0.1, Math.min(1, d)); for (const f of folle) f.m.count = Math.round(f.n * k); }
  function muovi(dt, t) {
    U.uT.value = t;
    for (let k = 0; k < 2; k++) { fino[k] -= dt; if (fino[k] <= 0) es[k] = Math.max(0, es[k] - dt * 1.5); }
    U.uEsulta.value.set(es[0], es[1]); U.uMossa.value = 0.5 + Math.max(es[0], es[1]);
    for (const b of bandiere) { b.fase += dt * (2 + es[b.settore] * 4); const p = b.pg.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, Math.sin(b.fase + x * 2.2) * 0.16 * (x + 1.1) / 2.2); } p.needsUpdate = true; }
  }
  return { colora, esulta, densita, muovi, materiali, get squadre() { return squadre; }, N };
}
function hashStr(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
