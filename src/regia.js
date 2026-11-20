// Regia della partita: sequenza del gol (primo piano del marcatore, scheda, replay, transizione), arbitro in campo,
// segnaposto col nome sopra il giocatore che si comanda, tabelloni che festeggiano, telecamera che guarda in diagonale
// vicino alle porte, guardalinee con la bandierina, pubblico coi colori delle squadre che salta dopo un gol. Sta in un file a parte e si aggancia a game.js in pochi punti: draw() chiama figure() e dopo(),
// step() legge G.goalEnd, think() legge G.cine per la corsa del marcatore. Tutto il resto lo capisce da sola guardando G.
// La grafica (scheda, scritte, transizione) la crea qui, senza toccare index.html.

import { SEGNI, RIVEDI, GOLSEQ } from './config.js';
import { Vector3, Quaternion, CanvasTexture, Sprite, SpriteMaterial, SRGBColorSpace, Group, Mesh, CylinderGeometry, PlaneGeometry, MeshBasicMaterial, MeshLambertMaterial, DoubleSide } from 'three';

export function creaRegia(X) {
  const { scene, cam, G, $, all, pose, hyp, clamp, sgn, HL, HW, ballMesh, ballShadow, ring, arrow, camPos, camLook, boards } = X;
  const extra = () => [S.arb, ...S.ass].filter(Boolean); // arbitro e guardalinee

  // Numeri da ritoccare
  const SEQ = { festa: 3.4, stacco: RIVEDI.stacco / 2 };              // secondi: primo piano, metà dello stacco col logo (l'azione dal vivo dura fino a GOLSEQ.stacco)
  const REP = { hz: 30, secs: 6.5, min: 1.2 };                        // registrazione: fotogrammi al secondo, secondi tenuti; quanto si rivede sta in RIVEDI
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
#rep.su{opacity:1;pointer-events:auto}#rep::before{content:'⟲ '}
#stacco{position:absolute;inset:0;background:var(--ink);display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;z-index:21}
#stacco img{height:32%}#stacco.va{animation:stacco var(--d) linear both}
@keyframes stacco{0%{opacity:0}35%,65%{opacity:1}100%{opacity:0}}
#hud.cine #replay{display:none!important}`;
  document.head.appendChild(stile);
  const hud = $('#hud');
  const el = (id, html) => { const d = document.createElement('div'); d.id = id; d.innerHTML = html || ''; hud.appendChild(d); return d; };
  const golc = el('golc', '<div class="sx"><img alt=""><b></b></div><div class="dx"><div class="r1"><span>Gol</span><i></i></div><div class="nm"></div><div class="as"></div><div class="cl"></div></div>');
  const salta = el('salta', 'Tocca per saltare'), rep = el('rep', 'Replay');
  // stacco col logo Fantatitano (replay, angoli dopo una grande occasione): il logo copre lo schermo a metà dello stacco
  const stacco = el('stacco', '<img src="img/corona-lime.png" alt="">');
  const staccoLogo = (d) => { stacco.style.setProperty('--d', `${d}s`); stacco.classList.remove('va'); void stacco.offsetWidth; stacco.classList.add('va'); };
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

  /* ---------------------------------------------------------------- segni sopra le teste */
  // Come Dream League: sul giocatore che si comanda nome e segnalino verde, e tra i due la barra della potenza mentre si
  // tiene premuto un tasto di calcio (bianca, rossa verso il massimo). sull'avversario col pallone solo il nome, bianco,
  // in difesa un segnalino grigio semitrasparente sul compagno che si prenderebbe con «Cambia giocatore».
  const tela2 = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return [c, c.getContext('2d'), t]; };
  const sprite = (t, cy) => { const s = new Sprite(new SpriteMaterial({ map: t, transparent: true, depthTest: false, depthWrite: false, sizeAttenuation: false })); s.center.set(.5, cy); s.renderOrder = 50; s.visible = false; scene.add(s); return s; };
  const [pc, px, ptex] = tela2(256, 160), pin = sprite(ptex, 4 / 160);
  const [ac, ax, atex] = tela2(256, 48), pinAvv = sprite(atex, 0);
  const [gc, gx, gtex] = tela2(64, 80), pinGrigio = sprite(gtex, 2 / 80);
  const nomeCorto = (p) => { let n = p.name.length <= 13 ? p.name : p.name.split(' ').slice(-1)[0]; if (n.length > 13) n = n.slice(0, 12) + '.'; return n; };
  function scritta(x, n, cx, cy) {
    x.font = '900 34px Lato, system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
    x.shadowColor = 'rgba(0,0,0,.65)'; x.shadowBlur = 6; x.shadowOffsetY = 1; x.fillStyle = '#fff'; x.fillText(n, cx, cy); x.shadowColor = 'transparent';
  }
  // la goccia: tonda in alto, a punta in basso, col bordo chiaro e un foro bianco: (cx, cy) è il centro della parte tonda
  function goccia(x, cx, cy, colore, bordo) {
    x.beginPath(); x.arc(cx, cy, 18, Math.PI * .78, Math.PI * 2.22); x.quadraticCurveTo(cx + 8, cy + 26, cx, cy + 46); x.quadraticCurveTo(cx - 8, cy + 26, cx - 14.4, cy + 11.6); x.closePath();
    x.fillStyle = colore; x.strokeStyle = bordo; x.lineWidth = 4; x.stroke(); x.fill();
    x.beginPath(); x.arc(cx, cy, 7, 0, 7); x.fillStyle = 'rgba(255,255,255,.95)'; x.fill();
  }
  let pinChiave = '';
  function pinNome(p, pow) {
    const k = p.name + '|' + (pow < 0 ? -1 : Math.round(pow * 50)); if (k === pinChiave) return; pinChiave = k;
    px.clearRect(0, 0, 256, 160); scritta(px, nomeCorto(p), 128, 30);
    if (pow >= 0) { // la barra: fondo scuro, si riempie di bianco e verso il massimo diventa rossa
      const w = 128, x0 = 64, y0 = 52, r = SEGNI.rosso, u = pow < r ? 0 : (pow - r) / (1 - r);
      px.fillStyle = 'rgba(10,10,12,.72)'; px.fillRect(x0 - 3, y0 - 3, w + 6, 16);
      px.fillStyle = `rgb(255,${Math.round(255 - 178 * u)},${Math.round(255 - 178 * u)})`; px.fillRect(x0, y0, w * pow, 10);
    }
    goccia(px, 128, 92, '#2fd66b', 'rgba(235,255,240,.95)');
    ptex.needsUpdate = true;
  }
  let avvDi = null;
  function nomeAvv(p) { if (avvDi === p) return; avvDi = p; ax.clearRect(0, 0, 256, 48); scritta(ax, nomeCorto(p), 128, 24); atex.needsUpdate = true; }
  gx.clearRect(0, 0, 64, 80); gx.globalAlpha = .55; goccia(gx, 32, 30, '#9a9aa6', 'rgba(255,255,255,.8)'); gx.globalAlpha = 1; gtex.needsUpdate = true;
  const sopraTesta = (s, p, alzo) => s.position.set(p.x, 2.72 * ((p.fig && p.fig.alt) || 1) + alzo, p.z); // il giocatore è alto 2,72
  function segni(cine) {
    const c = G.ctrl, b = G.ball, h = 2 * Math.tan(cam.fov * Math.PI / 360) * (cam.aspect < 1 ? SEGNI.scala * .55 : SEGNI.scala), on = !!G.segno && !cine;
    pin.visible = on && !!c;
    if (pin.visible) { pinNome(c, X.potenza()); pin.scale.set(h * 2, h * 1.25, 1); sopraTesta(pin, c, .3 + Math.sin(G.t * 6) * .05); }
    const o = b && b.owner; pinAvv.visible = on && !!o && o.team !== G.teams[0] && G.state === 'play';
    if (pinAvv.visible) { nomeAvv(o); pinAvv.scale.set(h * 2, h * .375, 1); sopraTesta(pinAvv, o, .35); }
    const g = G.prossimo; pinGrigio.visible = on && !!g && g !== c && G.state === 'play';
    if (pinGrigio.visible) { pinGrigio.scale.set(h * .5, h * .625, 1); sopraTesta(pinGrigio, g, .3); }
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
    // dopo un gol si ferma, guarda il centro del campo e alza il braccio verso il centro (clip del guardalinee)
    if (G.state === 'goal' && S.arbGol !== G.goals.length) { S.arbGol = G.goals.length; a.indicaT = GOLSEQ.fermi; a.vx = a.vz = 0; if (X.hasFx('bandiera')) { a.fx = 'bandiera'; a.fxNew = true; a.fxT = 0; a.fxSp = 1; a.fxDa = 0; } }
    a.indicaT = (a.indicaT || 0) - dt;
    if (a.indicaT > 0) { let da = Math.atan2(-a.x, -a.z) - a.dir; da = Math.atan2(Math.sin(da), Math.cos(da)); a.dir += da * Math.min(1, dt * 6); return; }
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
  // Replay a gioco fermo (pulsante in alto a destra, angolo dopo una grande occasione): il gioco si ferma (G.rivede), stacco
  // col logo, gli ultimi secondi registrati rivisti da una telecamera bassa, stacco, e si riparte da dov'era. RV.t è in
  // secondi veri: sotto zero c'è la prima metà dello stacco, da 0 a dur il replay. Si salta col pulsante REPLAY.
  const RV = { on: false, t: 0, f0: 0, f1: 0, dur: 0, poi: null, salvato: false, esce: false, guarda: new Vector3() };
  const inRivedi = () => RV.on && RV.t >= 0;
  function rivedi(opz = {}) {
    if (RV.on || S.on || !REC.data || REC.len < RIVEDI.min * REP.hz || G.auto || G.noRegia || !G.ball) return false;
    const secs = Math.min(opz.secs || RIVEDI.secs, REC.len / REP.hz);
    Object.assign(RV, { on: true, t: -RIVEDI.stacco / 2, f1: REC.len - 1, poi: opz.poi || null, salvato: false, esce: false });
    RV.f0 = Math.max(0, RV.f1 - secs * REP.hz); RV.dur = Math.max(.5, (RV.f1 - RV.f0) / REP.hz / RIVEDI.vel); RV.guarda.set(NaN, 0, 0);
    G.rivede = true; staccoLogo(RIVEDI.stacco); hud.classList.add('cine'); return true;
  }
  function fineRivedi() {
    if (RV.salvato) recLeggi(REC.vivo, 0, REC.vivo, 0, 0); // le ossa tornano come dal vivo
    RV.on = false; G.rivede = false; S.scatto = true; rep.classList.remove('su'); if (!S.on) hud.classList.remove('cine');
    const f = RV.poi; RV.poi = null; if (f) f();
  }
  // il pulsante in basso a destra salta il replay breve (quello del gol lo salta il tocco sullo schermo, qui sotto)
  rep.addEventListener('pointerdown', (e) => { if (!RV.on) return; e.preventDefault(); e.stopPropagation(); if (RV.t < RV.dur - RIVEDI.stacco / 2) RV.t = RV.dur - RIVEDI.stacco / 2; });
  const inFesta = () => S.on && G.state === 'goal' && G.stateT >= S.c0 && G.stateT < S.c1;

  function inizio() {
    const g = G.goals[G.goals.length - 1], sc = G.scorer; S.visti = G.goals.length;
    if (!g || !sc || !sc.fig.skinned || G.noRegia) return;
    const t = sc.team, auto = /^Autogol/.test(g.name);
    // lo stacco sul primo piano arriva a GOLSEQ.stacco secondi veri: col rallentatore (G.stateT va più piano) un po' prima in G.stateT
    const v = G.auto ? 1 : GOLSEQ.vel, L = GOLSEQ;
    S.on = true; S.t1 = S.t2 = S.salvato = S.cut = false; S.c0 = L.lento + L.durataLento * v + Math.max(0, L.stacco - L.lento - L.durataLento); S.c1 = S.c0 + SEQ.festa; S.var = G.goals.length % 2; S.porta = sgn(G.ball.x) || 1;
    S.rp = !!REC.data && REC.len + REP.hz * S.c0 >= REP.hz * REP.min;
    hud.classList.add('cine'); $('#banner').classList.remove('su'); // levetta, tasti e minimappa spariscono subito
    S.c2 = S.rp ? S.c1 + RIVEDI.secs / RIVEDI.vel : S.c1; G.goalEnd = S.c2;
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
  // Il difensore deluso in primo piano: il più vicino al marcatore tra chi ha subito il gol, messo tra la telecamera e il punto
  // dell'esultanza, un po' di lato, rivolto verso la telecamera. Si fa allo stacco (cambio di inquadratura): non si vede spostarsi
  function delusoDavanti(C, a) {
    const sc = G.scorer; if (!sc || G.auto) return; let d = null, dd = 1e9;
    for (const o of sc.team.opp.players) { if (!o.i || o.st !== 'run') continue; const k = hyp(o.x - sc.x, o.z - sc.z); if (k < dd) { dd = k; d = o; } }
    if (!d) return; const ux = Math.sin(a), uz = Math.cos(a), k = GOLSEQ.camDist * GOLSEQ.deluso[0], l = GOLSEQ.deluso[1];
    d.x = C.fx + ux * k + uz * l; d.z = C.fz + uz * k - ux * l; d.vx = d.vz = 0; d.dir = Math.atan2(ux, uz); d.deluso = -1; d.fx = null;
    G.delusoGol = d; G.delusoPunto = [d.x, d.z];
  }
  function fine() {
    if (S.salvato) recLeggi(REC.vivo, 0, REC.vivo, 0, 0); // le ossa tornano com'erano prima del replay, se no le animazioni ripartono storte
    S.on = S.salvato = false; G.cine = null; G.goalEnd = 0; G.delusoGol = null; S.scatto = true; REC.len = 0;
    hud.classList.remove('cine'); golc.classList.remove('su'); salta.classList.remove('su'); rep.classList.remove('su');
    tabelloniNormali();
  }
  window.addEventListener('pointerdown', (e) => {
    if (RV.on && !(e.target.closest && e.target.closest('#pausa,#audio'))) { if (RV.t < RV.dur - RIVEDI.stacco / 2) RV.t = RV.dur - RIVEDI.stacco / 2; return; } // il replay breve si salta toccando lo schermo
    if (!S.on || G.paused || G.state !== 'goal' || (e.target.closest && e.target.closest('#pausa,#audio,#replay'))) return;
    const t = G.stateT;
    if (t > S.c0 + .5 && t < S.c1 - SEQ.stacco) G.stateT = S.c1 - SEQ.stacco;
    else if (S.rp && t > S.c1 + .4 && t < S.c2 - SEQ.stacco) G.stateT = S.c2 - SEQ.stacco;
  });

  return {
    S, REC, SEQ, REP, rivedi, RV,
    /** Chiamata da draw() prima delle pose: se è in corso il replay mette lei in posa le figure e risponde true. */
    figure() {
      if (inRivedi()) {
        if (!RV.salvato) { recScrivi(REC.vivo, 0); RV.salvato = true; } // la scena dal vivo messa da parte
        recMostra(RV.f0 + clamp(RV.t / RV.dur, 0, 1) * (RV.f1 - RV.f0)); return true;
      }
      if (S.on && G.state !== 'goal') fine();
      if (!inReplay()) return false;
      if (!S.salvato) { // primo fotogramma del replay: si mette da parte la scena dal vivo e si sceglie cosa rivedere
        recScrivi(REC.vivo, 0); S.salvato = true;
        S.f1 = REC.len - 1; S.f0 = Math.max(0, S.f1 - RIVEDI.secs * REP.hz);
        S.c2 = S.c1 + Math.max(.5, (S.f1 - S.f0) / REP.hz / RIVEDI.vel); G.goalEnd = S.c2; S.guarda.set(NaN, 0, 0);
      }
      recMostra(S.f0 + (G.stateT - S.c1) / (S.c2 - S.c1) * (S.f1 - S.f0));
      return true;
    },
    /** Chiamata da draw() dopo la telecamera normale: tutto il resto. */
    dopo(dt) {
      if (!G.teams.length || !G.ball) { if (S.on) fine(); for (const a of extra()) { scene.remove(a.fig.root); if (a.flag) scene.remove(a.flag); if (a.carta) scene.remove(a.carta); } S.arb = null; S.ass = []; S.squadra = null; pin.visible = pinAvv.visible = pinGrigio.visible = false; return; }
      if (G.teams[0] !== S.squadra) { // partita nuova
        for (const a of extra()) { scene.remove(a.fig.root); if (a.flag) scene.remove(a.flag); if (a.carta) scene.remove(a.carta); }
        S.squadra = G.teams[0]; const kit = kitArbitro(); S.arb = creaArbitro(kit); S.ass = creaGuardalinee(kit); S.offs = 0; S.cart = G.cards ? G.cards.length : 0; pubblico(); S.visti = 0; S.on = false; S.pinDi = null; G.cine = null; G.goalEnd = 0; recInit();
      }
      const st = G.state, t = G.stateT, replay = inReplay() || inRivedi(); if (replay) palla();
      if (st === 'goal' && !S.on && G.goals.length !== S.visti) inizio();
      if (st === 'play' && S.prima !== 'play') REC.len = 0; // dopo un calcio da fermo le figure sono state spostate di colpo: il replay riparte da qui
      S.prima = st;

      if (!replay) {
        if (S.arb) { muoviArbitro(dt); pose(S.arb, dt); }
        if (S.ass.length) { muoviGuardalinee(dt); for (const a of S.ass) pose(a, dt); }
        if (REC.data && (st === 'play' || (st === 'goal' && t < S.c0))) {
          REC.acc += dt;
          if (REC.acc >= 1 / REP.hz) { REC.acc %= 1 / REP.hz; recScrivi(REC.data, REC.i * REC.stride); REC.i = (REC.i + 1) % REC.n; REC.len = Math.min(REC.n, REC.len + 1); }
        }
      }

      bandiere(); carta(); saltano(dt);
      // segni sopra le teste (al posto dell'anello e della freccia)
      segni((S.on && t >= S.c0) || RV.on); // durante i replay niente segni

      if (S.scatto) { S.scatto = false; X.updateCamera(9); } // dopo la sequenza la telecamera torna al suo posto di colpo, sotto la transizione
      if (RV.on) {
        RV.t += dt; rep.classList.toggle('su', RV.t >= 0 && RV.t < RV.dur - .15);
        if (!RV.esce && RV.t >= RV.dur - RIVEDI.stacco / 2) { RV.esce = true; staccoLogo(RIVEDI.stacco); }
        if (RV.t >= RV.dur) fineRivedi();
        else if (RV.t >= 0 && !G.dbgCam) { // telecamera bassa dal lato lontano, che segue il pallone
          const bp = ballMesh.position; if (Number.isNaN(RV.guarda.x)) RV.guarda.copy(bp); else RV.guarda.lerp(bp, 1 - Math.exp(-6 * dt));
          cam.position.set(RV.guarda.x - 9, 3, -(HW + 4)); const lontano = cam.position.distanceTo(RV.guarda);
          cam.fov = clamp(2 * Math.atan(7 / lontano) * 180 / Math.PI, 15, 40) * (cam.aspect < 1 ? 1.5 : 1); cam.lookAt(RV.guarda.x, Math.max(.9, RV.guarda.y * .8), RV.guarda.z); cam.updateProjectionMatrix();
        }
        return;
      }
      if (!S.on) {
        // vicino alle porte la telecamera guarda in diagonale, così la porta si vede
        // (non sui piazzati, che hanno la loro inquadratura)
        if (!G.dbgCam && st !== 'menu' && !G.portrait && !G.inquadra) { cam.position.x -= camLook.x * DIAG; cam.lookAt(camLook.x, camLook.y, camLook.z); }
        return;
      }

      // --- sequenza del gol
      for (const b of boards) b.material.map.offset.x += dt * .22;
      if (t >= S.c0) { hud.classList.add('cine'); $('#banner').classList.remove('su'); }
      golc.classList.toggle('su', inFesta() && t > S.c0 + .25 && t < S.c1 - .2);
      salta.classList.toggle('su', t > S.c0 + .6 && t < S.c2 - SEQ.stacco);
      rep.classList.toggle('su', replay && t < S.c2 - .15);
      if (!S.t1 && S.rp && t >= S.c1 - SEQ.stacco) { S.t1 = true; staccoLogo(RIVEDI.stacco); } // stacco col logo prima e dopo il replay
      if (!S.t2 && t >= S.c2 - SEQ.stacco) { S.t2 = true; staccoLogo(RIVEDI.stacco); }
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
        // primo piano come Dream League: telecamera bassa (GOLSEQ.camAlt) a pochi metri dal punto dell'esultanza, che avanza appena;
        // tra lei e il marcatore, un po' di lato, il difensore deluso (messo lì allo stacco, quando nessuno lo vede)
        const sc = G.scorer, u = t - S.c0, C = G.cine || { fx: sc.x, fz: sc.z }, a = S.a0 + u * .05, R = GOLSEQ.camDist + .6 - Math.min(u, 2) * .3;
        if (!S.cut) { S.cut = true; delusoDavanti(C, S.a0); }
        cam.position.set(C.fx + Math.sin(a) * R, GOLSEQ.camAlt, C.fz + Math.cos(a) * R); cam.fov = stretto ? 52 : 34;
        cam.lookAt(sc.x, 1.45, sc.z); cam.updateProjectionMatrix();
      }
    },
  };
}
