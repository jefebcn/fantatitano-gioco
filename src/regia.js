// Regia della partita: sequenza del gol (primo piano del marcatore, scheda, replay, transizione), arbitro in campo,
// segnaposto col nome sopra il giocatore che si comanda, tabelloni che festeggiano, telecamera che guarda in diagonale
// vicino alle porte, guardalinee con la bandierina, pubblico coi colori delle squadre che salta dopo un gol. Sta in un file a parte e si aggancia a game.js in pochi punti: draw() chiama figure() e dopo(),
// step() legge G.goalEnd, think() legge G.cine per la corsa del marcatore. Tutto il resto lo capisce da sola guardando G.
// La grafica (scheda, scritte, transizione) la crea qui, senza toccare index.html.

import { Vector3, Quaternion, CanvasTexture, Sprite, SpriteMaterial, SRGBColorSpace, Group, Mesh, CylinderGeometry, PlaneGeometry, MeshBasicMaterial, MeshLambertMaterial, DoubleSide } from 'three';

export function creaRegia(X) {
  const { scene, cam, G, $, all, pose, hyp, clamp, sgn, HL, HW, ballMesh, ballShadow, ring, arrow, camPos, camLook, boards } = X;
  const extra = () => [S.arb, ...S.ass].filter(Boolean); // arbitro e guardalinee

  // Numeri da ritoccare
  const SEQ = { vivo: 1, festa: 3.4, tenda: .32 };                    // secondi: azione che finisce, primo piano, metà della transizione
  const REP = { hz: 30, secs: 6.5, prima: 3.6, dopo: 1, vel: .8, min: 1.2 }; // replay: quanto si registra, quanto si rivede, a che velocità
  const ARB = { dist: 8, v: 6.2 };                                    // arbitro: quanto sta lontano dal pallone, quanto corre
  const ASS = { fuori: 1.4, v: 7, band: 2 };                          // guardalinee: quanto fuori dalla linea, quanto corrono, secondi di bandierina alzata
  const TIFO = { casa: [.5, .3], salto: .014 };                       // pubblico: quota del primo e del secondo colore; quanto salta dopo un gol
  const DIAG = .3;                                                    // quanto la telecamera resta indietro verso il centro (0 = sempre di fronte)

  /* ---------------------------------------------------------------- grafica */
  const stile = document.createElement('style');
  stile.textContent = `
#hud.cine #stickZona,#hud.cine #tasti,#hud.cine #radar,#hud.cine #chi,#hud.cine #en,#hud.cine #pow,#hud.cine #ment{display:none!important}
#golc{position:absolute;left:50%;bottom:11%;transform:translate(-50%,26px);display:flex;opacity:0;transition:opacity .28s,transform .28s;pointer-events:none;filter:drop-shadow(0 8px 20px rgba(0,0,0,.55));white-space:nowrap}
#golc.su{opacity:1;transform:translate(-50%,0)}
#golc .sx{position:relative;width:84px;background:var(--lime);border-radius:12px 0 0 12px;display:flex;align-items:center;justify-content:center;padding:6px}
#golc .sx img{height:62px;width:auto;max-width:66px;object-fit:contain}
#golc .sx b{position:absolute;right:5px;bottom:2px;font-family:Anton;font-weight:400;font-size:20px;color:var(--ink);line-height:1;text-shadow:0 0 3px var(--lime),0 0 3px var(--lime)}
#golc .dx{background:var(--ink);border-radius:0 12px 12px 0;min-width:210px;overflow:hidden;box-shadow:inset 0 0 0 2px var(--viola)}
#golc .r1{display:flex;justify-content:space-between;align-items:center;background:var(--viola);font-family:Anton;font-size:17px;letter-spacing:.08em;padding:3px 12px 2px;text-transform:uppercase}
#golc .r1 i{font-style:normal;color:var(--lime)}
#golc .nm{font-family:Anton;font-size:23px;text-transform:uppercase;letter-spacing:.02em;padding:6px 12px 0;line-height:1.05}
#golc .as,#golc .cl{font-size:11px;padding:1px 12px;color:rgba(255,255,255,.72);letter-spacing:.04em}
#golc .as:empty{display:none}#golc .as b{color:#fff}
#golc .cl{padding-bottom:7px;color:var(--lime);text-transform:uppercase;font-weight:900;font-size:10px;letter-spacing:.1em}
#salta{position:absolute;left:50%;bottom:3.5%;transform:translateX(-50%);font:900 10px Lato,system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.8);text-shadow:0 1px 4px #000;opacity:0;transition:opacity .3s;pointer-events:none}
#salta.su{opacity:1}
#rep{position:absolute;right:14px;bottom:14px;font-family:Anton;font-size:15px;letter-spacing:.1em;background:var(--lime);color:var(--ink);padding:5px 13px 4px;border-radius:8px;opacity:0;pointer-events:none;box-shadow:0 4px 12px rgba(0,0,0,.4)}
#rep.su{opacity:1}#rep::before{content:'⟲ '}
#tenda{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:20}
#tenda i{position:absolute;top:-10%;bottom:-10%;left:-30%;width:160%;transform:translateX(-135%) skewX(-16deg);display:flex;align-items:center;justify-content:center;
  background:linear-gradient(90deg,var(--lime) 0 3%,var(--viola) 3% 50%,var(--ink) 50% 97%,var(--lime) 97%)}
#tenda img{height:34%;transform:skewX(16deg)}
#tenda.va i{animation:tenda ${SEQ.tenda * 2}s linear both}
@keyframes tenda{0%{transform:translateX(-135%) skewX(-16deg)}42%,58%{transform:translateX(0) skewX(-16deg)}100%{transform:translateX(135%) skewX(-16deg)}}`;
  document.head.appendChild(stile);
  const hud = $('#hud');
  const el = (id, html) => { const d = document.createElement('div'); d.id = id; d.innerHTML = html || ''; hud.appendChild(d); return d; };
  const golc = el('golc', '<div class="sx"><img alt=""><b></b></div><div class="dx"><div class="r1"><span>Gol</span><i></i></div><div class="nm"></div><div class="as"></div><div class="cl"></div></div>');
  const salta = el('salta', 'Tocca per saltare'), rep = el('rep', 'Replay');
  const tenda = el('tenda', '<i><img src="img/corona-lime.png" alt=""></i>');
  const passa = () => { tenda.classList.remove('va'); void tenda.offsetWidth; tenda.classList.add('va'); };
  const esc = (s) => String(s).replace(/[<>&]/g, '');

  /* ---------------------------------------------------------------- registrazione per il replay */
  // Di ogni figura si salvano posizione, verso e le rotazioni delle ossa animate: il replay le rimette com'erano,
  // senza far girare di nuovo le animazioni. Un anello di REP.secs secondi a REP.hz fotogrammi al secondo.
  const REC = { n: 0, i: 0, len: 0, acc: 0, data: null, figs: [], B: 0, fs: 0, stride: 0, vivo: null };
  function recInit() {
    const A = window.ANIMS; REC.data = null; REC.len = REC.i = 0; REC.acc = 0;
    REC.figs = all().map((p) => p.fig).concat(extra().map((a) => a.fig)).filter((f) => f.skinned);
    if (!REC.figs.length || !A) return;
    REC.B = A.ossa.length; REC.fs = 7 + REC.B * 4; REC.stride = 5 + REC.figs.length * REC.fs; REC.n = Math.round(REP.hz * REP.secs);
    for (const f of REC.figs) { f.rb = A.ossa.map((n) => f.bones[n]); f.pel = f.bones[A.bacino]; }
    REC.data = new Float32Array(REC.n * REC.stride); REC.vivo = new Float32Array(REC.stride);
  }
  function recScrivi(d, o) {
    d[o] = ballMesh.position.x; d[o + 1] = ballMesh.position.y; d[o + 2] = ballMesh.position.z; d[o + 3] = ballMesh.rotation.x; d[o + 4] = ballMesh.rotation.z; o += 5;
    for (const f of REC.figs) {
      d[o] = f.root.position.x; d[o + 1] = f.root.position.z; d[o + 2] = f.root.rotation.y; d[o + 3] = f.body.position.y;
      const pp = f.pel.position; d[o + 4] = pp.x; d[o + 5] = pp.y; d[o + 6] = pp.z;
      for (let b = 0, k = o + 7; b < REC.B; b++, k += 4) { const q = f.rb[b].quaternion; d[k] = q.x; d[k + 1] = q.y; d[k + 2] = q.z; d[k + 3] = q.w; }
      o += REC.fs;
    }
  }
  const PB = [0, 0, 0, 0, 0]; // il pallone dell'ultimo fotogramma letto: draw() lo sposta dov'è dal vivo, dopo() lo rimette qui
  function palla() {
    ballMesh.position.set(PB[0], PB[1], PB[2]); ballMesh.rotation.x = PB[3]; ballMesh.rotation.z = PB[4];
    ballShadow.position.set(PB[0], .04, PB[2]); ballShadow.scale.setScalar(1 + PB[1] * .18);
  }
  // Rimette in scena il fotogramma fra a e b (t da 0 a 1) dei due blocchi d[a…] ed e[b…]
  function recLeggi(d, a, e, b, t) {
    const L = (i) => d[a + i] + (e[b + i] - d[a + i]) * t;
    for (let i = 0; i < 5; i++) PB[i] = L(i); palla();
    let o = 5;
    for (const f of REC.figs) {
      f.root.position.set(L(o), 0, L(o + 1));
      let da = e[b + o + 2] - d[a + o + 2]; da = Math.atan2(Math.sin(da), Math.cos(da)); f.root.rotation.y = d[a + o + 2] + da * t;
      f.body.position.y = L(o + 3); f.pel.position.set(L(o + 4), L(o + 5), L(o + 6));
      for (let n = 0, k = o + 7; n < REC.B; n++, k += 4) {
        const ax = d[a + k], ay = d[a + k + 1], az = d[a + k + 2], aw = d[a + k + 3]; let bx = e[b + k], by = e[b + k + 1], bz = e[b + k + 2], bw = e[b + k + 3];
        if (ax * bx + ay * by + az * bz + aw * bw < 0) { bx = -bx; by = -by; bz = -bz; bw = -bw; }
        const x = ax + (bx - ax) * t, y = ay + (by - ay) * t, z = az + (bz - az) * t, w = aw + (bw - aw) * t, l = Math.hypot(x, y, z, w) || 1;
        f.rb[n].quaternion.set(x / l, y / l, z / l, w / l);
      }
      o += REC.fs;
    }
  }
  const casella = (k) => ((REC.i - REC.len + k) % REC.n + REC.n) % REC.n * REC.stride; // dove sta il k-esimo fotogramma registrato
  function recMostra(fr) { const k = clamp(Math.floor(fr), 0, REC.len - 1), k2 = Math.min(k + 1, REC.len - 1); recLeggi(REC.data, casella(k), REC.data, casella(k2), clamp(fr - k, 0, 1)); }

  /* ---------------------------------------------------------------- segnaposto col nome */
  const [pc, px] = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 128; return [c, c.getContext('2d')]; })();
  const ptex = new CanvasTexture(pc); ptex.colorSpace = SRGBColorSpace;
  const pin = new Sprite(new SpriteMaterial({ map: ptex, transparent: true, depthTest: false, depthWrite: false, sizeAttenuation: false }));
  pin.center.set(.5, 0); pin.renderOrder = 50; pin.visible = false; scene.add(pin);
  function pinNome(p) {
    px.clearRect(0, 0, 256, 128);
    px.font = '900 34px Lato, system-ui, sans-serif'; px.textAlign = 'center'; px.textBaseline = 'middle'; px.lineJoin = 'round';
    let n = p.name.length <= 13 ? p.name : p.name.split(' ').slice(-1)[0]; if (n.length > 13) n = n.slice(0, 12) + '.';
    px.shadowColor = 'rgba(0,0,0,.65)'; px.shadowBlur = 6; px.shadowOffsetY = 1; px.fillStyle = '#fff'; px.fillText(n, 128, 30); px.shadowColor = 'transparent';
    // la goccia: tonda in alto, a punta in basso, verde con il bordo chiaro e un foro bianco
    px.beginPath(); px.arc(128, 78, 18, Math.PI * .78, Math.PI * 2.22); px.quadraticCurveTo(136, 104, 128, 124); px.quadraticCurveTo(120, 104, 113.6, 89.6); px.closePath();
    px.fillStyle = '#2fd66b'; px.strokeStyle = 'rgba(235,255,240,.95)'; px.lineWidth = 4; px.stroke(); px.fill();
    px.beginPath(); px.arc(128, 78, 7, 0, 7); px.fillStyle = '#ffffff'; px.fill();
    ptex.needsUpdate = true;
  }

  /* ---------------------------------------------------------------- arbitro */
  const SQ_ARB = { club: {}, idx: -1 };
  function kitArbitro() {
    if (G.arbKit) return G.arbKit; // scelta insieme alle divise delle squadre (pickKits), lontana da tutte
    const [kh, ka, g1, g2] = X.pickKits(G.teams[0].club, G.teams[1].club), altri = [kh.shirt, kh.c2, ka.shirt, ka.c2, g1.shirt, g2.shirt];
    const lontano = (c) => Math.min(...altri.map((o) => X.cdist(c, o)));
    const shirt = ['#FF5A1F', '#F2E21B', '#E91E8C', '#19D3B1', '#3FA9F5', '#9B5DE5', '#16161a'].sort((a, b) => lontano(b) - lontano(a))[0];
    return { shirt, shorts: '#16161a', socks: '#16161a', sleeve: shirt, boots: '#16161a', ink: '#111', c2: '#16161a', stile: null };
  }
  const ufficiale = (kit, seed, x, z) => { const fig = X.makeSkinned(kit, seed, '', null, ''); scene.add(fig.root); return { fig, x, z, vx: 0, vz: 0, dir: 0, team: SQ_ARB, i: 5, fx: null, fxNew: false, fxT: 0, st: 'run' }; };
  // il cartellino nella mano destra dell'arbitro: compare quando il braccio comincia ad alzarsi (dopo CART.in secondi)
  const CART = { dur: 1.5, in: .35 }, cartaGeo = new PlaneGeometry(.11, .155); // un po' più grande del vero, per vederlo dalla telecamera
  function creaArbitro(kit) {
    if (!X.model()) return null;
    const a = ufficiale(kit, 90210, 0, -ARB.dist); a.carta = new Mesh(cartaGeo, new MeshBasicMaterial({ color: 0xF2E21B, side: DoubleSide })); a.carta.visible = false; scene.add(a.carta); return a;
  }
  function carta() { // segue la mano destra, in piedi sopra le dita
    const a = S.arb; if (!a || !a.carta || !a.carta.visible) return; const bo = a.fig.bones; if (!bo.hand_r || !bo.lowerarm_r) return;
    a.fig.root.updateMatrixWorld(true); bo.hand_r.getWorldPosition(_p); bo.lowerarm_r.getWorldPosition(_g);
    _g.subVectors(_p, _g).normalize(); a.carta.position.copy(_p).addScaledVector(_g, .07); a.carta.quaternion.setFromUnitVectors(SU, _g); a.carta.rotateY(a.dir);
  }
  /* ---------------------------------------------------------------- guardalinee */
  // Uno per metà campo, su lati opposti come nelle partite vere: seguono il penultimo difensore (o il pallone, se è più avanti)
  // e alzano la bandierina quando il gioco fischia un fuorigioco nella loro metà.
  const tela = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d');
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.fillStyle = (i + j) % 2 ? '#F2E21B' : '#E5262B'; x.fillRect(i * 8, j * 8, 8, 8); }
    const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t; })();
  const bastone = new CylinderGeometry(.014, .014, .55, 5), drappo = new PlaneGeometry(.4, .3);
  function bandierina() {
    const g = new Group(), b = new Mesh(bastone, new MeshLambertMaterial({ color: 0x222222 })); b.position.y = .275; g.add(b);
    const d = new Mesh(drappo, new MeshBasicMaterial({ map: tela, side: DoubleSide })); d.position.set(.2, .4, 0); g.add(d);
    scene.add(g); return g;
  }
  function creaGuardalinee(kit) {
    if (!X.model()) return [];
    // metà +x sul lato lontano dalla telecamera, metà -x su quello vicino
    return [[1, -1], [-1, 1]].map(([meta, lato], k) => { const a = ufficiale(kit, 4711 + k * 977, meta * HL / 2, lato * (HW + ASS.fuori)); a.meta = meta; a.lato = lato; a.dir = lato > 0 ? Math.PI : 0; a.flag = bandierina(); a.su = 0; return a; });
  }
  function muoviGuardalinee(dt) {
    const b = G.ball;
    for (const a of S.ass) {
      // chi attacca verso questa metà: la squadra di casa attacca verso +x
      const att = a.meta > 0 ? G.teams[0] : G.teams[1], l = X.offsideLine(att) * att.side;
      const tx = G.state === 'play' || G.state === 'restart' ? clamp(a.meta > 0 ? Math.max(l, 0) : Math.min(l, 0), a.meta > 0 ? 0 : -HL + 1, a.meta > 0 ? HL - 1 : 0) : a.x;
      const e = tx - a.x, v = Math.abs(e) < .4 ? 0 : Math.sign(e) * Math.min(ASS.v, Math.abs(e) * 2.2), k = Math.min(1, dt * 4);
      a.vx += (v - a.vx) * k; a.vz = 0; a.x += a.vx * dt; a.z = a.lato * (HW + ASS.fuori);
      // corre guardando dove va; fermo, o con la bandierina alzata, guarda il campo
      const verso = Math.abs(a.vx) > 3.2 && a.su <= 0 ? Math.atan2(a.vx, 0) : a.lato > 0 ? Math.PI : 0;
      let da = verso - a.dir; da = Math.atan2(Math.sin(da), Math.cos(da)); a.dir += da * Math.min(1, dt * 7);
      a.su -= dt;
    }
    const off = G.stats ? G.stats.offs[0] + G.stats.offs[1] : 0;
    if (off > S.offs) { const a = S.ass.find((q) => q.meta === (sgn(b.x) || 1)); if (a) { a.fx = 'bandiera'; a.fxNew = true; a.fxT = 0; a.su = ASS.band; a.vx = 0; } }
    S.offs = off;
  }
  const _p = new Vector3(), _g = new Vector3(), _q = new Quaternion(), SU = new Vector3(0, 1, 0);
  function bandiere() { // la bandierina sta nella mano destra e prosegue la linea dell'avambraccio
    for (const a of S.ass) {
      const bo = a.fig.bones; if (!bo.hand_r || !bo.lowerarm_r) continue;
      a.fig.root.updateMatrixWorld(true); bo.hand_r.getWorldPosition(_p); bo.lowerarm_r.getWorldPosition(_g);
      a.flag.position.copy(_p); a.flag.quaternion.setFromUnitVectors(SU, _g.subVectors(_p, _g).normalize());
    }
  }
  /* ---------------------------------------------------------------- pubblico */
  // Ogni tribuna ridipinta coi colori della squadra che ci tifa: la curva dietro la porta a -x è degli ospiti, il resto è di casa.
  function pubblico() {
    const st = boards.stands; if (!st) return;
    const [h, o] = G.teams.map((t) => t.club), pelle = ['#e8b98f', '#c98f5a', '#8a5a3a', '#f0cba8'];
    const tela = (cl) => {
      const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d'); x.fillStyle = '#1a2038'; x.fillRect(0, 0, 512, 256);
      const neutri = ['#f2f2f2', '#d8d8e0', '#2a2f45', '#5a5f72'];
      for (let r = 0; r < 20; r++) for (let k = 0; k < 64; k++) {
        if (Math.random() < .1) continue;
        const px = k * 8 + (r % 2) * 4 + (Math.random() * 2 - 1), py = r * 12.8 + 4, u = Math.random();
        x.fillStyle = u < TIFO.casa[0] ? cl.c1 : u < TIFO.casa[0] + TIFO.casa[1] ? cl.c2 : neutri[(Math.random() * neutri.length) | 0]; x.fillRect(px, py + 3, 5.5, 7);
        x.fillStyle = pelle[(Math.random() * 4) | 0]; x.beginPath(); x.arc(px + 2.7, py + 1.5, 2.3, 0, 7); x.fill();
      }
      return c;
    };
    const tc = { h: tela(h), o: tela(o) };
    for (const s of st) {
      s.tifo = s.x < -HL ? 1 : 0; const old = s.m.material.map, t = new CanvasTexture(s.tifo ? tc.o : tc.h);
      t.colorSpace = old.colorSpace; t.anisotropy = old.anisotropy; t.wrapS = old.wrapS; t.wrapT = old.wrapT; t.repeat.copy(old.repeat);
      s.m.material.map = t; s.m.material.needsUpdate = true; old.dispose();
    }
  }
  function saltano(dt) { // dopo un gol salta il pubblico della squadra che ha segnato
    const st = boards.stands; if (!st) return;
    const chi = S.on && G.state === 'goal' && G.scorer ? G.scorer.team.idx : -1;
    for (const s of st) { const o = s.m.material.map.offset; o.y = s.tifo === chi ? TIFO.salto * Math.abs(Math.sin(G.t * 8.5)) : o.y * Math.max(0, 1 - dt * 8); }
  }
  function muoviArbitro(dt) {
    const a = S.arb, b = G.ball; if (!a || !b) return;
    // sta dietro l'azione, verso il centro del campo, mai più vicino di ARB.dist al pallone
    let tx = b.x - clamp(b.x / 10, -1, 1) * 7, tz = b.z - clamp(b.z / 8, -1, 1) * 8;
    let dx = tx - b.x, dz = tz - b.z, d = hyp(dx, dz);
    if (d < ARB.dist) { if (d < .5) { dx = a.x - b.x; dz = a.z - b.z; d = hyp(dx, dz) || 1; } tx = b.x + dx / d * ARB.dist; tz = b.z + dz / d * ARB.dist; }
    tx = clamp(tx, -HL + 3, HL - 3); tz = clamp(tz, -HW + 3, HW - 3);
    const ex = tx - a.x, ez = tz - a.z, e = hyp(ex, ez), fermo = G.state !== 'play' || a.cartT > 0, v = fermo || e < 1.5 ? 0 : Math.min(ARB.v, e * 1.3), k = Math.min(1, dt * 3);
    a.vx += ((e ? ex / e * v : 0) - a.vx) * k; a.vz += ((e ? ez / e * v : 0) - a.vz) * k; a.x += a.vx * dt; a.z += a.vz * dt;
    // cartellino: si ferma, guarda chi l'ha preso e alza il braccio col cartellino in mano (GameplayFootball)
    const nc = G.cards ? G.cards.length : 0;
    if (nc > S.cart) { const c = G.cards[nc - 1], t = G.teams[c.t], chi = t && t.players.concat(t.out || []).find((q) => q.name === c.name);
      a.chi = chi || null; a.cartT = CART.dur; a.vx = a.vz = 0; a.carta.material.color.set(c.c === 'r' ? 0xE5262B : 0xF2E21B); if (X.hasFx('cartellino')) { a.fx = 'cartellino'; a.fxNew = true; a.fxT = 0; a.fxSp = 1; a.fxDa = 0; } }
    S.cart = nc; a.cartT = (a.cartT || 0) - dt; a.carta.visible = a.fx === 'cartellino' && a.fxT > CART.in && a.fxT < CART.dur - .15;
    const corre = hyp(a.vx, a.vz) > 1.2, verso = a.cartT > 0 && a.chi ? Math.atan2(a.chi.x - a.x, a.chi.z - a.z) : corre ? Math.atan2(a.vx, a.vz) : Math.atan2(b.x - a.x, b.z - a.z);
    let da = verso - a.dir; da = Math.atan2(Math.sin(da), Math.cos(da)); a.dir += da * Math.min(1, dt * 6);
  }

  /* ---------------------------------------------------------------- tabelloni */
  function tabelloniGol(nome, c1, ink) {
    const x = boards.ctx, c = boards.cv; if (!x) return;
    for (let i = 0; i < 4; i++) {
      const o = i * 512, pari = i % 2 === 0;
      x.fillStyle = pari ? '#D9F51F' : c1; x.fillRect(o, 0, 512, 64);
      x.fillStyle = pari ? '#0A0A0C' : ink; x.font = '50px Anton'; x.textBaseline = 'middle'; x.textAlign = 'center';
      x.fillText(pari ? 'GOL!   GOL!   GOL!' : nome.toUpperCase().slice(0, 22), o + 256, 35);
    }
    for (const b of boards) b.material.map.needsUpdate = true;
  }
  function tabelloniNormali() {
    if (!G.teams.length) return;
    X.paintBoards(G.teams[0].club, G.teams[1].club, X.crest());
    for (const b of boards) b.material.map.offset.x = 0;
  }

  /* ---------------------------------------------------------------- sequenza del gol */
  // S.on: la sequenza è in corso. I tempi sono in secondi di G.stateT: c0 fine dell'azione dal vivo, c1 fine del primo piano,
  // c2 fine del replay (uguale a c1 se il replay non c'è). step() dà il calcio d'inizio quando G.stateT supera G.goalEnd.
  const S = { squadra: null, arb: null, ass: [], offs: 0, visti: 0, on: false, c0: 0, c1: 0, c2: 0, rp: false, f0: 0, f1: 0, t1: false, t2: false, salvato: false, a0: 0, prima: '', scatto: false, pinDi: null, guarda: new Vector3(), var: 0, porta: 1 };
  const inReplay = () => S.on && S.rp && G.state === 'goal' && G.stateT >= S.c1;
  const inFesta = () => S.on && G.state === 'goal' && G.stateT >= S.c0 && G.stateT < S.c1;

  function inizio() {
    const g = G.goals[G.goals.length - 1], sc = G.scorer; S.visti = G.goals.length;
    if (!g || !sc || !sc.fig.skinned || G.noRegia) return;
    const t = sc.team, auto = /^Autogol/.test(g.name);
    S.on = true; S.t1 = S.t2 = S.salvato = false; S.c0 = SEQ.vivo; S.c1 = S.c0 + SEQ.festa; S.var = G.goals.length % 2; S.porta = sgn(G.ball.x) || 1;
    S.rp = !!REC.data && REC.len + REP.hz * SEQ.vivo >= REP.hz * REP.min;
    S.c2 = S.rp ? S.c1 + (REP.prima + REP.dopo) / REP.vel : S.c1; G.goalEnd = S.c2;
    // il marcatore corre una decina di metri verso la bandierina più vicina e lì esulta
    const cx = sgn(sc.x || 1) * (HL - 7), cz = sgn(sc.z || 1) * (HW - 7), d = hyp(cx - sc.x, cz - sc.z) || 1, m = Math.min(d, 10);
    G.cine = { fx: sc.x + (cx - sc.x) / d * m, fz: sc.z + (cz - sc.z) / d * m };
    S.a0 = Math.atan2(cx - sc.x, cz - sc.z) + .4;
    golc.querySelector('img').src = X.img(t.club.id); golc.querySelector('.sx b').textContent = auto ? '' : sc.num;
    golc.querySelector('.r1 span').textContent = auto ? 'Autogol' : 'Gol'; golc.querySelector('.r1 i').textContent = `${g.min}'`;
    golc.querySelector('.nm').textContent = auto ? g.name.replace(/^Autogol\s*\(?|\)$/g, '') || 'Autogol' : sc.name;
    const as = !auto && sc.by && sc.by.team === t && sc.by !== sc ? sc.by.name : '';
    golc.querySelector('.as').innerHTML = as ? `Assist · <b>${esc(as)}</b>` : ''; golc.querySelector('.cl').textContent = t.club.name;
    tabelloniGol(auto ? t.club.name : sc.name, t.club.c1, X.lum(t.club.c1) > .55 ? '#0A0A0C' : '#fff');
  }
  function fine() {
    if (S.salvato) recLeggi(REC.vivo, 0, REC.vivo, 0, 0); // le ossa tornano com'erano prima del replay, se no le animazioni ripartono storte
    S.on = S.salvato = false; G.cine = null; G.goalEnd = 0; S.scatto = true; REC.len = 0;
    hud.classList.remove('cine'); golc.classList.remove('su'); salta.classList.remove('su'); rep.classList.remove('su');
    tabelloniNormali();
  }
  window.addEventListener('pointerdown', (e) => {
    if (!S.on || G.paused || G.state !== 'goal' || (e.target.closest && e.target.closest('#pausa,#audio'))) return;
    const t = G.stateT;
    if (t > S.c0 + .5 && t < S.c1 - SEQ.tenda) G.stateT = S.c1 - SEQ.tenda;
    else if (S.rp && t > S.c1 + .4 && t < S.c2 - SEQ.tenda) G.stateT = S.c2 - SEQ.tenda;
  });

  return {
    S, REC, SEQ, REP,
    /** Chiamata da draw() prima delle pose: se è in corso il replay mette lei in posa le figure e risponde true. */
    figure() {
      if (S.on && G.state !== 'goal') fine();
      if (!inReplay()) return false;
      if (!S.salvato) { // primo fotogramma del replay: si mette da parte la scena dal vivo e si sceglie cosa rivedere
        recScrivi(REC.vivo, 0); S.salvato = true;
        S.f1 = REC.len - 1; S.f0 = Math.max(0, S.f1 - (REP.prima + REP.dopo) * REP.hz);
        S.c2 = S.c1 + Math.max(.5, (S.f1 - S.f0) / REP.hz / REP.vel); G.goalEnd = S.c2; S.guarda.set(NaN, 0, 0);
      }
      recMostra(S.f0 + (G.stateT - S.c1) / (S.c2 - S.c1) * (S.f1 - S.f0));
      return true;
    },
    /** Chiamata da draw() dopo la telecamera normale: tutto il resto. */
    dopo(dt) {
      if (!G.teams.length || !G.ball) { if (S.on) fine(); for (const a of extra()) { scene.remove(a.fig.root); if (a.flag) scene.remove(a.flag); if (a.carta) scene.remove(a.carta); } S.arb = null; S.ass = []; S.squadra = null; pin.visible = false; return; }
      if (G.teams[0] !== S.squadra) { // partita nuova
        for (const a of extra()) { scene.remove(a.fig.root); if (a.flag) scene.remove(a.flag); if (a.carta) scene.remove(a.carta); }
        S.squadra = G.teams[0]; const kit = kitArbitro(); S.arb = creaArbitro(kit); S.ass = creaGuardalinee(kit); S.offs = 0; S.cart = G.cards ? G.cards.length : 0; pubblico(); S.visti = 0; S.on = false; S.pinDi = null; G.cine = null; G.goalEnd = 0; recInit();
      }
      const st = G.state, t = G.stateT, replay = inReplay(); if (replay) palla();
      if (st === 'goal' && !S.on && G.goals.length !== S.visti) inizio();
      if (st === 'play' && S.prima !== 'play') REC.len = 0; // dopo un calcio da fermo le figure sono state spostate di colpo: il replay riparte da qui
      S.prima = st;

      if (!replay) {
        if (S.arb) { muoviArbitro(dt); pose(S.arb, dt); }
        if (S.ass.length) { muoviGuardalinee(dt); for (const a of S.ass) pose(a, dt); }
        if (REC.data && (st === 'play' || (st === 'goal' && t < SEQ.vivo))) {
          REC.acc += dt;
          if (REC.acc >= 1 / REP.hz) { REC.acc %= 1 / REP.hz; recScrivi(REC.data, REC.i * REC.stride); REC.i = (REC.i + 1) % REC.n; REC.len = Math.min(REC.n, REC.len + 1); }
        }
      }

      bandiere(); carta(); saltano(dt);
      // segnaposto col nome al posto della freccia
      const c = G.ctrl, cine = S.on && t >= S.c0; arrow.visible = false; pin.visible = ring.visible && !!c && !cine;
      if (cine) ring.visible = false;
      if (pin.visible) {
        if (S.pinDi !== c) { S.pinDi = c; pinNome(c); }
        const h = 2 * Math.tan(cam.fov * Math.PI / 360) * (cam.aspect < 1 ? .055 : .1); pin.scale.set(h * 2, h, 1); pin.position.set(c.x, 2.72 * ((c.fig && c.fig.alt) || 1) + .3 + Math.sin(G.t * 6) * .05, c.z); // la punta sopra la testa (il giocatore è alto 2,72)
      }

      if (S.scatto) { S.scatto = false; X.updateCamera(9); } // dopo la sequenza la telecamera torna al suo posto di colpo, sotto la transizione
      if (!S.on) {
        // vicino alle porte la telecamera guarda in diagonale, così la porta si vede
        // (non sui piazzati, che hanno la loro inquadratura)
        if (!G.dbgCam && st !== 'menu' && !G.portrait && !G.inquadra) { cam.position.x -= camLook.x * DIAG; cam.lookAt(camLook.x, 1, camLook.z); }
        return;
      }

      // --- sequenza del gol
      for (const b of boards) b.material.map.offset.x += dt * .22;
      if (t >= S.c0) { hud.classList.add('cine'); $('#banner').classList.remove('su'); }
      golc.classList.toggle('su', inFesta() && t > S.c0 + .25 && t < S.c1 - .2);
      salta.classList.toggle('su', t > S.c0 + .6 && t < S.c2 - SEQ.tenda);
      rep.classList.toggle('su', replay && t < S.c2 - .15);
      if (!S.t1 && S.rp && t >= S.c1 - SEQ.tenda) { S.t1 = true; passa(); }
      if (!S.t2 && t >= S.c2 - SEQ.tenda) { S.t2 = true; passa(); }
      if (G.dbgCam) return;
      const stretto = cam.aspect < 1;
      if (replay) {
        const bp = ballMesh.position, d = S.porta, gx = d * HL;
        if (Number.isNaN(S.guarda.x)) S.guarda.copy(bp); else S.guarda.lerp(bp, 1 - Math.exp(-9 * dt));
        if (S.var) cam.position.set(gx + d * 8, 6.2, 6.5);   // da dietro la porta, sopra la traversa
        else cam.position.set(gx - d * 17, 2.4, -(HW + 2));   // bassa, dal lato opposto alla telecamera di gioco
        // lo zoom segue la distanza: attorno al pallone si vede sempre più o meno la stessa fetta di campo
        const lontano = cam.position.distanceTo(S.guarda); cam.fov = clamp(2 * Math.atan((S.var ? 8 : 6.5) / lontano) * 180 / Math.PI, 15, 40) * (stretto ? 1.5 : 1);
        cam.lookAt(S.guarda.x, Math.max(.9, S.guarda.y * .8), S.guarda.z); cam.updateProjectionMatrix();
      } else if (t >= S.c0) {
        // parte stretta sul marcatore e si allarga mentre arrivano i compagni
        const sc = G.scorer, u = t - S.c0, w = Math.min(u, 2.2), a = S.a0 + u * .18, R = 6.2 + w * .7;
        cam.position.set(sc.x + Math.sin(a) * R, 2 + w * .35, sc.z + Math.cos(a) * R); cam.fov = stretto ? 52 : 34;
        cam.lookAt(sc.x, 1.75, sc.z); cam.updateProjectionMatrix(); // si guarda un po' sopra la testa: così il marcatore resta sotto il tabellino e sopra la scheda
      }
    },
  };
}
