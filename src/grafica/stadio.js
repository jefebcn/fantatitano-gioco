/* Porte con rete che si deforma, bandierine che si flettono, panchine, torri faro e particelle (erba e polvere).
   Tutto qui è grafica o fisica "di contorno": non cambia le regole né i risultati delle partite, tranne la rete, che frena
   il pallone dentro la porta invece di fermarlo di colpo. */
import { unisci } from './unisci.js';

/* ---------------------------------------------------------------- rete */

// La rete è fatta di pannelli (fondo, tetto, due lati), ognuno una griglia di punti che si possono spostare solo lungo la
// normale del pannello. I bordi sono fissati al telaio. Si muove come una membrana smorzata: il pallone la spinge,
// l'onda si allarga e si smorza. Si calcola solo quando serve (pallone vicino o rete ancora in movimento).
// fuori e oltre valgono per il pallone che la colpisce da fuori: quanto rimbalza, e fin dove conta come toccata se in un
// passo l'ha già attraversata (metri)
export const RETE = { maglia: 0.24, onda: 5, molla: 26, smorza: 7, sacca: 0.6, raggio: 0.95, passo: 1 / 120, fuori: 0.2, oltre: 0.3 };

class Pannello {
  // o: origine, a e b: vettori dei due lati (lunghezze comprese), n: normale verso l'esterno della porta
  constructor(T, o, a, b, n) {
    this.o = o; this.a = a; this.b = b; this.n = n;
    this.la = Math.hypot(a.x, a.y, a.z); this.lb = Math.hypot(b.x, b.y, b.z);
    this.nu = Math.max(2, Math.round(this.la / RETE.maglia)); this.nv = Math.max(2, Math.round(this.lb / RETE.maglia));
    const N = (this.nu + 1) * (this.nv + 1); this.w = new Float32Array(N); this.v = new Float32Array(N);
    const idx = [];
    for (let j = 0; j <= this.nv; j++) for (let i = 0; i <= this.nu; i++) { const k = j * (this.nu + 1) + i; if (i < this.nu) idx.push(k, k + 1); if (j < this.nv) idx.push(k, k + this.nu + 1); }
    this.geo = new T.BufferGeometry(); this.pos = new Float32Array(N * 3); this.geo.setAttribute('position', new T.BufferAttribute(this.pos, 3)); this.geo.setIndex(idx);
    this.aggiorna();
  }
  punto(i, j) { const u = i / this.nu, v = j / this.nv; return { x: this.o.x + this.a.x * u + this.b.x * v, y: this.o.y + this.a.y * u + this.b.y * v, z: this.o.z + this.a.z * u + this.b.z * v }; }
  aggiorna() {
    for (let j = 0; j <= this.nv; j++) for (let i = 0; i <= this.nu; i++) {
      const k = j * (this.nu + 1) + i, p = this.punto(i, j), w = this.w[k];
      this.pos[k * 3] = p.x + this.n.x * w; this.pos[k * 3 + 1] = p.y + this.n.y * w; this.pos[k * 3 + 2] = p.z + this.n.z * w;
    }
    this.geo.attributes.position.needsUpdate = true;
  }
  /** Un passo della membrana: risponde quanta energia resta (per sapere se si può smettere di calcolarla). */
  passo(h) {
    const R = RETE, nu = this.nu, nv = this.nv, du = this.la / nu, dv = this.lb / nv, w = this.w, v = this.v; let e = 0;
    for (let j = 1; j < nv; j++) for (let i = 1; i < nu; i++) {
      const k = j * (nu + 1) + i, lap = (w[k - 1] + w[k + 1] - 2 * w[k]) / (du * du) + (w[k - nu - 1] + w[k + nu + 1] - 2 * w[k]) / (dv * dv);
      v[k] += (R.onda * lap - R.molla * w[k] - R.smorza * v[k]) * h;
    }
    for (let k = 0; k < w.length; k++) { w[k] += v[k] * h; e += Math.abs(w[k]) + Math.abs(v[k]) * 0.1; }
    return e;
  }
  /** Coordinate del pallone nel pannello: u, v da 0 a 1 e distanza oltre il piano (positiva: verso l'esterno). */
  locale(b) {
    const dx = b.x - this.o.x, dy = b.y - this.o.y, dz = b.z - this.o.z;
    return { u: (dx * this.a.x + dy * this.a.y + dz * this.a.z) / (this.la * this.la), v: (dx * this.b.x + dy * this.b.y + dz * this.b.z) / (this.lb * this.lb), s: dx * this.n.x + dy * this.n.y + dz * this.n.z };
  }
  /** Spinge la rete con una sacca a forma di cupola centrata in (u, v), profonda p metri (negativa: verso l'interno). */
  sacca(u, v, p, vel) {
    const R = RETE, ci = u * this.nu, cj = v * this.nv, du = this.la / this.nu, dv = this.lb / this.nv;
    for (let j = 1; j < this.nv; j++) for (let i = 1; i < this.nu; i++) {
      const d2 = ((i - ci) * du) ** 2 + ((j - cj) * dv) ** 2; if (d2 > R.raggio * R.raggio) continue;
      const k = j * (this.nu + 1) + i, t = p * (1 - d2 / (R.raggio * R.raggio));
      if (p > 0 ? this.w[k] < t : this.w[k] > t) { this.w[k] = t; this.v[k] = vel * (1 - d2 / (R.raggio * R.raggio)); }
    }
  }
}

/** Una porta: pali e traversa metallici smussati e la rete. d = 1 o -1 (da che parte del campo), gx = linea di porta. */
export class Porta {
  constructor(T, scene, { d, gx, GH, GT, dep = 2.2, r = 0.06 }) {
    this.d = d; this.gx = gx; this.GH = GH; this.GT = GT; this.dep = dep; this.resto = 0; this.attiva = 0;
    const metallo = new T.MeshStandardMaterial({ color: 0xffffff, metalness: 0.35, roughness: 0.22 });
    const palo = new T.CylinderGeometry(r, r, GT, 20), giunto = new T.SphereGeometry(r, 16, 12);
    for (const e of [-1, 1]) { const p = new T.Mesh(palo, metallo); p.position.set(gx, GT / 2, e * GH); p.castShadow = true; scene.add(p); const g = new T.Mesh(giunto, metallo); g.position.set(gx, GT, e * GH); g.castShadow = true; scene.add(g); }
    const bar = new T.Mesh(new T.CylinderGeometry(r, r, GH * 2, 20), metallo); bar.rotation.x = Math.PI / 2; bar.position.set(gx, GT, 0); bar.castShadow = true; scene.add(bar);
    // telaio di dietro, sottile, che tiene la rete
    const ferro = new T.MeshStandardMaterial({ color: 0xd8d8d8, metalness: 0.5, roughness: 0.4 }), tubo = (l) => new T.CylinderGeometry(0.025, 0.025, l, 8);
    for (const e of [-1, 1]) { const t = new T.Mesh(tubo(Math.hypot(dep, GT)), ferro); t.position.set(gx + d * dep / 2, GT / 2, e * GH); t.rotation.z = d * Math.atan2(dep, GT); scene.add(t); }
    const V = (x, y, z) => ({ x, y, z }), x0 = gx, x1 = gx + d * dep;
    this.pannelli = [
      new Pannello(T, V(x1, 0, -GH), V(0, 0, 2 * GH), V(0, GT, 0), V(d, 0, 0)), // fondo
      new Pannello(T, V(x0, GT, -GH), V(x1 - x0, 0, 0), V(0, 0, 2 * GH), V(0, 1, 0)), // tetto
      new Pannello(T, V(x0, 0, -GH), V(x1 - x0, 0, 0), V(0, GT, 0), V(0, 0, -1)), // lato a z = -GH
      new Pannello(T, V(x0, 0, GH), V(x1 - x0, 0, 0), V(0, GT, 0), V(0, 0, 1)), // lato a z = +GH
    ];
    const filo = new T.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.72 });
    for (const p of this.pannelli) scene.add(new T.LineSegments(p.geo, filo));
    unisci(T, scene, [metallo, ferro]); // pali, giunti e traversa in una mesh, i tubi di dietro in un'altra (la rete resta a parte)
  }
  dentro(b, m = 0) { const ax = (b.x - this.gx) * this.d; return ax > -0.3 - m && ax < this.dep + 0.5 + m && Math.abs(b.z) < this.GH + 0.5 + m && b.y < this.GT + 0.6 + m; }
  /**
   * Il pallone b (x, y, z, vx, vy, vz) contro la rete, dall'interno: la rete cede fino a RETE.sacca metri e frena il pallone
   * (la velocità verso la rete si spegne quasi tutta, un piccolo rimbalzo). Risponde true se l'ha toccata.
   */
  urta(b, br) {
    const m = RETE.sacca; if (!this.dentro(b, m)) return false;
    let tocco = false;
    for (const p of this.pannelli) {
      // ai bordi un pannello vale ancora per la profondità della sacca: un pallone già nella sacca del fondo, quindi oltre
      // il bordo dei lati, passava di fianco alla rete e usciva dalla porta
      const l = p.locale(b), eu = m / p.la, ev = m / p.lb; if (l.u < -eu || l.u > 1 + eu || l.v < -ev || l.v > 1 + ev) continue;
      const pen = l.s + br; if (pen <= 0 || pen > m + br) continue;
      const vn = b.vx * p.n.x + b.vy * p.n.y + b.vz * p.n.z;
      p.sacca(Math.min(1, Math.max(0, l.u)), Math.min(1, Math.max(0, l.v)), Math.min(pen, RETE.sacca), Math.max(0, vn) * 0.5); tocco = true; this.attiva = 1.5;
      if (vn > 0) { const k = vn * (1 + 0.12) * Math.min(1, pen / RETE.sacca + 0.15); b.vx -= p.n.x * k; b.vy -= p.n.y * k; b.vz -= p.n.z * k; b.vx *= 0.97; b.vz *= 0.97; } // la rete assorbe
      if (pen > RETE.sacca) { const f = pen - RETE.sacca; b.x -= p.n.x * f; b.y -= p.n.y * f; b.z -= p.n.z * f; }
    }
    return tocco;
  }
  /**
   * Dopo un gol il pallone resta nella porta, sacca compresa, da qualunque parte spinga: oltre la linea non supera il
   * fondo, i lati e il tetto. Davanti alla linea è libero (può rimbalzare di nuovo in campo).
   */
  trattieni(b, br) {
    const m = RETE.sacca - br, ax = (b.x - this.gx) * this.d; if (ax <= 0) return;
    if (ax > this.dep + m) { b.x = this.gx + this.d * (this.dep + m); if (b.vx * this.d > 0) b.vx = 0; }
    if (Math.abs(b.z) > this.GH + m) { const e = Math.sign(b.z); b.z = e * (this.GH + m); if (b.vz * e > 0) b.vz = 0; }
    if (b.y > this.GT + m) { b.y = this.GT + m; if (b.vy > 0) b.vy = 0; }
  }
  /**
   * Il pallone uscito dal campo contro la rete, da fuori: a lato del palo, sopra la traversa, dietro. Solo se la tocca la
   * fa rientrare un po', rimbalza piano e le scivola addosso. Prima la rete si muoveva anche col pallone a un metro, e un
   * tiro fuori di poco sembrava un gol.
   */
  urtaFuori(b, br) {
    let tocco = false;
    for (const p of this.pannelli) {
      const l = p.locale(b); if (l.u < 0 || l.u > 1 || l.v < 0 || l.v > 1 || l.s > br || l.s < -RETE.oltre) continue;
      const vn = b.vx * p.n.x + b.vy * p.n.y + b.vz * p.n.z, f = br - l.s;
      b.x += p.n.x * f; b.y += p.n.y * f; b.z += p.n.z * f; tocco = true;
      if (vn >= 0) continue;
      p.sacca(l.u, l.v, -Math.min(0.35, -vn * 0.03), vn * 0.4); this.attiva = 1.5;
      const k = -vn * (1 + RETE.fuori); b.vx += p.n.x * k; b.vy += p.n.y * k; b.vz += p.n.z * k; b.vx *= 0.9; b.vz *= 0.9;
    }
    return tocco;
  }
  /** Avanza la rete di dt secondi (a passi fissi) e aggiorna il disegno, solo se serve. */
  muovi(dt, b) {
    if (b && this.dentro(b, 1.5)) this.attiva = Math.max(this.attiva, 0.5);
    if (this.attiva <= 0) return;
    this.resto += dt; let e = 0;
    while (this.resto >= RETE.passo) { this.resto -= RETE.passo; e = 0; for (const p of this.pannelli) e += p.passo(RETE.passo); }
    for (const p of this.pannelli) p.aggiorna();
    this.attiva -= dt; if (e > 0.02) this.attiva = Math.max(this.attiva, 0.2);
  }
}

/* ---------------------------------------------------------------- bandierine */

/** Le quattro bandierine d'angolo: si piegano se le tocca il pallone o un giocatore, poi tornano su oscillando. */
export class Bandierine {
  constructor(T, scene, { HL, HW, colore = 0xD9F51F }) {
    this.f = [];
    const asta = new T.CylinderGeometry(0.025, 0.03, 1.6, 8), am = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }), tela = new T.PlaneGeometry(0.5, 0.32, 6, 1);
    for (const d of [-1, 1]) for (const e of [-1, 1]) {
      const g = new T.Group(); g.position.set(d * HL, 0, e * HW); scene.add(g);
      const a = new T.Mesh(asta, am); a.position.y = 0.8; a.castShadow = true; g.add(a);
      const t = new T.Mesh(tela.clone(), new T.MeshStandardMaterial({ color: colore, side: T.DoubleSide, roughness: 0.8 })); t.position.set(-d * 0.26, 1.42, 0); g.add(t);
      this.f.push({ g, t, ax: 0, az: 0, vx: 0, vz: 0, x: d * HL, z: e * HW, fase: Math.random() * 6 });
    }
  }
  /** cose: oggetti { x, z, vx, vz, alto } vicini che possono urtarle (pallone e giocatori). */
  muovi(dt, cose) {
    for (const f of this.f) {
      for (const c of cose) {
        const dx = f.x - c.x, dz = f.z - c.z, d = Math.hypot(dx, dz); if (d > 0.6 || c.alto > 1.6) continue;
        const v = Math.hypot(c.vx, c.vz); if (v < 0.5) continue;
        f.vx += (c.vx / v) * v * 0.9 * dt * 30 * (0.6 - d); f.vz += (c.vz / v) * v * 0.9 * dt * 30 * (0.6 - d); // spinta nella direzione di chi passa
      }
      f.vx += (-60 * f.ax - 3 * f.vx) * dt; f.vz += (-60 * f.az - 3 * f.vz) * dt;
      f.ax = Math.max(-0.9, Math.min(0.9, f.ax + f.vx * dt)); f.az = Math.max(-0.9, Math.min(0.9, f.az + f.vz * dt));
      f.g.rotation.set(f.az, 0, -f.ax); f.fase += dt * 4;
      const p = f.t.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, Math.sin(f.fase + x * 9) * 0.03 * (x + 0.25)); } p.needsUpdate = true; // la tela sventola un po'
    }
  }
}

/* ---------------------------------------------------------------- bordo campo */

/** Panchine tecniche (due, sul lato lontano dalla telecamera), con tettoia trasparente e sedute. */
export function panchine(T, scene, { HW, colore = 0x4B06FC }) {
  const vetro = new T.MeshStandardMaterial({ color: 0xcfe3ff, transparent: true, opacity: 0.32, roughness: 0.1, metalness: 0.1, side: T.DoubleSide });
  const telaio = new T.MeshStandardMaterial({ color: 0x1b1f2e, roughness: 0.5, metalness: 0.4 }), sedile = new T.MeshStandardMaterial({ color: colore, roughness: 0.6 });
  for (const x of [-9, 9]) {
    const g = new T.Group(); g.position.set(x, 0, -(HW + 2.4)); scene.add(g);
    const tetto = new T.Mesh(new T.CylinderGeometry(1.25, 1.25, 7, 18, 1, true, -Math.PI / 2, Math.PI), vetro); tetto.rotation.z = Math.PI / 2; tetto.position.y = 1.1; tetto.scale.set(1, 1, 1); g.add(tetto);
    const base = new T.Mesh(new T.BoxGeometry(7, 0.12, 2.4), telaio); base.position.y = 0.06; g.add(base);
    for (let i = 0; i < 7; i++) { const s = new T.Mesh(new T.BoxGeometry(0.75, 0.5, 0.55), sedile); s.position.set(-3 + i, 0.37, -0.45); s.castShadow = true; g.add(s); }
    for (const e of [-1, 1]) { const f = new T.Mesh(new T.BoxGeometry(0.08, 2.3, 2.4), telaio); f.position.set(e * 3.5, 1.15, 0); g.add(f); }
    unisci(T, g, [telaio, sedile]);
  }
}

/**
 * I fari dello stadio, secondo `fari` (STADI in src/config.js). Sempre quattro punti luce, vicino agli angoli:
 * - tetto: quattro file di proiettori sul bordo del tetto, girate verso il campo (la conca è chiusa: le torri agli
 *   angoli finirebbero dentro le tribune). y è la quota del tetto, bordo la distanza del bordo dalla linea laterale;
 * - torri: quattro torri negli angoli aperti, `fuori` metri oltre la bandierina in diagonale, alte y;
 * - pali: come le torri, ma pali sottili e bassi con pochi proiettori (campo di paese).
 * Risponde i punti luce (per accenderli di notte), il loro materiale e `togli`, che li leva dalla scena.
 */
export function torriFaro(T, scene, { HL, HW, fari }) {
  const pal = new T.MeshStandardMaterial({ color: 0x8c93a3, metalness: 0.6, roughness: 0.4 }), luci = [], radice = new T.Group(); scene.add(radice);
  const pann = new T.MeshStandardMaterial({ color: 0x2a2f3a, emissive: 0xfff4d6, emissiveIntensity: 0.15, roughness: 0.3 });
  const scuro = new T.MeshStandardMaterial({ color: 0x14171d, roughness: 0.6, metalness: 0.4 });
  const sulTetto = fari.tipo === 'tetto', largo = sulTetto ? 12 : fari.largo, alto = sulTetto ? 2.6 : largo * 0.55, f = (fari.fuori || 0) / Math.SQRT2;
  for (const d of [-1, 1]) for (const e of [-1, 1]) {
    const x = sulTetto ? d * (HL - 10) : d * (HL + f), z = sulTetto ? e * (HW + fari.bordo) : e * (HW + f), y = fari.y - (sulTetto ? 0.6 : alto / 2), g = new T.Group(); g.position.set(x, y, z); g.lookAt(d * HL * 0.25, 0, e * HW * 0.15); radice.add(g);
    const telaio = new T.Mesh(new T.BoxGeometry(largo, 0.3, 0.3), pal); telaio.position.set(0, alto / 2 + 0.3, 0); g.add(telaio);
    const testa = new T.Mesh(new T.BoxGeometry(largo, alto, 0.5), pann); testa.position.set(0, 0, 0.3); g.add(testa);
    // la griglia dei proiettori: sbarre scure davanti al pannello luminoso
    if (fari.griglia) {
      const [nx, ny] = fari.griglia;
      for (let i = 1; i < nx; i++) { const b = new T.Mesh(new T.BoxGeometry(0.14, alto, 0.1), scuro); b.position.set(-largo / 2 + i * largo / nx, 0, 0.58); g.add(b); }
      for (let j = 1; j < ny; j++) { const b = new T.Mesh(new T.BoxGeometry(largo, 0.14, 0.1), scuro); b.position.set(0, -alto / 2 + j * alto / ny, 0.58); g.add(b); }
      unisci(T, g, [scuro]);
    }
    // il sostegno, da terra fin sotto i proiettori: un palo sottile, oppure una torre a traliccio che si stringe salendo,
    // con quattro gambe, un giro di traversi a ogni piano e una diagonale per faccia. Ogni torre è una mesh sola, per
    // conto suo: quando è fuori dall'inquadratura non si disegna
    if (fari.tipo === 'pali') { const palo = new T.Mesh(new T.BoxGeometry(0.35, y, 0.35), pal); palo.position.set(x, y / 2, z); radice.add(palo); }
    if (fari.tipo === 'torri') {
      const [base, cima, piano] = fari.traliccio, piani = Math.max(1, Math.round(y / piano)), ang = [[1, 1], [1, -1], [-1, -1], [-1, 1]];
      const nodo = (k, j) => new T.Vector3(x + ang[k % 4][0] * (base + (cima - base) * j / piani) / 2, y * j / piani, z + ang[k % 4][1] * (base + (cima - base) * j / piani) / 2);
      const torre = new T.Group(); radice.add(torre);
      const asta = (a, b, lato) => { const m = new T.Mesh(new T.BoxGeometry(lato, lato, a.distanceTo(b)), pal); m.position.copy(a).add(b).multiplyScalar(0.5); m.lookAt(b); torre.add(m); };
      for (let k = 0; k < 4; k++) {
        asta(nodo(k, 0), nodo(k, piani), 0.32);
        for (let j = 1; j <= piani; j++) { asta(nodo(k, j), nodo(k + 1, j), 0.16); asta(nodo(k, j - 1), nodo(k + 1, j), 0.12); }
      }
      unisci(T, torre, [pal]);
    }
    luci.push({ testa, pos: { x, y, z }, alone: sulTetto ? 16 : largo * 1.6 });
  }
  const togli = () => { scene.remove(radice); radice.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); pal.dispose(); pann.dispose(); scuro.dispose(); };
  return { luci, materiale: pann, togli };
}

/* ---------------------------------------------------------------- particelle */

/** Ciuffi d'erba e polvere: due nuvole di punti con un numero fisso di particelle riusate in giro. */
export class Particelle {
  constructor(T, scene, n = 260) {
    this.n = n; this.i = 0;
    const tex = (fn) => { const c = document.createElement('canvas'); c.width = c.height = 32; fn(c.getContext('2d')); return new T.CanvasTexture(c); };
    const polvere = tex((x) => { const g = x.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 32, 32); });
    const filo = tex((x) => { x.fillStyle = '#fff'; x.beginPath(); x.ellipse(16, 16, 3, 13, 0.5, 0, 7); x.fill(); });
    this.tipi = {};
    for (const [nome, map, colore, size] of [['erba', filo, 0x5f9a2e, 0.16], ['polvere', polvere, 0xb79c74, 0.7]]) {
      const geo = new T.BufferGeometry(), pos = new Float32Array(n * 3).fill(-999);
      geo.setAttribute('position', new T.BufferAttribute(pos, 3));
      const m = new T.PointsMaterial({ map, color: colore, size, transparent: true, depthWrite: false, opacity: nome === 'erba' ? 1 : 0.45, sizeAttenuation: true });
      const pts = new T.Points(geo, m); pts.frustumCulled = false; scene.add(pts);
      this.tipi[nome] = { pos, v: new Float32Array(n * 3), vita: new Float32Array(n), i: 0, geo, m };
    }
  }
  /** n particelle del tipo `tipo` in (x, y, z), lanciate con forza f verso (dx, dz) più un po' a caso. */
  emetti(tipo, x, y, z, n, f = 3, dx = 0, dz = 0) {
    const t = this.tipi[tipo]; if (!t) return;
    for (let k = 0; k < n; k++) {
      const i = t.i; t.i = (t.i + 1) % this.n;
      t.pos[i * 3] = x + (Math.random() - 0.5) * 0.3; t.pos[i * 3 + 1] = y; t.pos[i * 3 + 2] = z + (Math.random() - 0.5) * 0.3;
      t.v[i * 3] = dx * f + (Math.random() - 0.5) * f; t.v[i * 3 + 1] = (tipo === 'erba' ? 2 + Math.random() * 2.5 : 0.4 + Math.random() * 0.8) * (f / 3); t.v[i * 3 + 2] = dz * f + (Math.random() - 0.5) * f;
      t.vita[i] = tipo === 'erba' ? 0.7 + Math.random() * 0.5 : 0.9 + Math.random() * 0.6;
    }
  }
  muovi(dt) {
    for (const nome in this.tipi) {
      const t = this.tipi[nome], g = nome === 'erba' ? 9 : 0.4, attrito = Math.exp(-(nome === 'erba' ? 1.5 : 3) * dt);
      for (let i = 0; i < this.n; i++) {
        if (t.vita[i] <= 0) continue;
        t.vita[i] -= dt; if (t.vita[i] <= 0) { t.pos[i * 3 + 1] = -999; continue; }
        t.v[i * 3] *= attrito; t.v[i * 3 + 2] *= attrito; t.v[i * 3 + 1] -= g * dt;
        t.pos[i * 3] += t.v[i * 3] * dt; t.pos[i * 3 + 1] = Math.max(0.02, t.pos[i * 3 + 1] + t.v[i * 3 + 1] * dt); t.pos[i * 3 + 2] += t.v[i * 3 + 2] * dt;
      }
      t.geo.attributes.position.needsUpdate = true;
    }
  }
}
