/* Fluidità dei movimenti, su una partita simulata: (1) quanto scivola sull'erba il piede in appoggio (m/s, mediana e 90°
   percentile), per andatura e durante i gesti; (2) scatti della posa: quanti fotogrammi su mille hanno un osso grande che ruota
   più di 20° da un fotogramma all'altro (a 60 al secondo è un salto visibile) e da quale animazione vengono.
   Uso: npm run build && node scripts/prove/fluidita.cjs [secondi di gioco, 60]   (con PIEDI=0 senza i piedi piantati) */
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path'); const root = require('path').join(__dirname, '..', '..', 'public'), SEC = +process.argv[2] || 60, SENZA = process.env.PIEDI === '0';
const srv = http.createServer((q, r) => { const u = q.url.split('?')[0]; const f = path.join(root, u === '/' ? 'index.html' : decodeURIComponent(u)); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); r.end(d); } }); });
srv.listen(0, async () => { const br = await chromium.launch(), pg = await br.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(String(e)));
  await pg.goto(`http://localhost:${srv.address().port}/`, { waitUntil: 'domcontentloaded', timeout: 90000 }); await pg.waitForFunction(() => window.__g && !document.querySelector('#carica'), null, { timeout: 90000 });
  const r = await pg.evaluate(([SEC, SENZA]) => { window.requestAnimationFrame = () => 0; const g = window.__g, G = g.G; let sd = 7; Math.random = () => (sd = (sd * 16807) % 2147483647) / 2147483647; G.shown = true; G.t = 0; G.diff = g.DIFF.normale; g.newMatch(window.CLUBS[0], window.CLUBS[7]); G.auto = true; G.paused = true; G.senzaPiedi = SENZA; g.renderer.render = () => {};
    const wp = (b) => { b.updateWorldMatrix(true, false); const e = b.matrixWorld.elements; return [e[12], e[13], e[14]]; };
    const OSSA = ['pelvis', 'spine_02', 'thigh_l', 'thigh_r', 'calf_l', 'calf_r', 'upperarm_l', 'upperarm_r', 'Head'];
    const fasce = { fermo: [], passo: [], corsetta: [], corsa: [], scatto: [], gesto: [] }, prec = new Map(), minY = new Map(), qPrec = new Map(), scatti = {}; let fotogrammi = 0, nScatti = 0;
    const Q = (b) => { b.updateWorldMatrix(true, false); const e = b.matrixWorld.elements; const m = new (b.quaternion.constructor)(); b.getWorldQuaternion(m); return m; };
    for (let i = 0; i < 60 * SEC; i++) { g.step(1 / 60); g.draw(1 / 60);
      if (G.state !== 'play') { prec.clear(); qPrec.clear(); continue; }
      for (const t of G.teams) for (const p of t.players) { if (!p.fig.skinned || (p.st !== 'run' && p.st !== 'kick')) { prec.delete(p); qPrec.delete(p); continue; }
        const v = Math.hypot(p.vx, p.vz), L = wp(p.fig.bones.ball_l || p.fig.bones.foot_l), R = wp(p.fig.bones.ball_r || p.fig.bones.foot_r), q = prec.get(p);
        let m = minY.get(p) ?? 9; m = Math.min(m + .0005, L[1], R[1]); minY.set(p, m);
        if (q) for (const [a, b] of [[L, q[0]], [R, q[1]]]) if (a[1] < m + .022 && b[1] < m + .022) { const s = Math.hypot(a[0] - b[0], a[2] - b[2]) * 60, k = p.fx ? 'gesto' : v < .3 ? 'fermo' : v < 2.2 ? 'passo' : v < 4.5 ? 'corsetta' : v < 6.8 ? 'corsa' : 'scatto'; fasce[k].push(s); }
        prec.set(p, [L, R]);
        // scatti della posa (rispetto al corpo: si toglie la rotazione della radice)
        const rq = new (p.fig.root.quaternion.constructor)(); p.fig.root.getWorldQuaternion(rq); rq.invert();
        const now = OSSA.map((n) => p.fig.bones[n] ? Q(p.fig.bones[n]).premultiply(rq) : null), qq = qPrec.get(p); fotogrammi++;
        if (qq) { let max = 0, chi = ''; now.forEach((x, k) => { if (x && qq[k]) { const a = 2 * Math.acos(Math.min(1, Math.abs(x.dot(qq[k])))); if (a > max) { max = a; chi = OSSA[k]; } } });
          if (max > .35) { nScatti++; const k = (p.fx || (p.st === 'kick' ? 'kick' : 'andatura')).replace(/_(sx|dx)$/, '') + (p.fxT !== undefined && p.fx ? (p.fxT < .1 ? ' (inizio)' : '') : ''); scatti[k] = (scatti[k] || 0) + 1; } }
        qPrec.set(p, now); } }
    const out = {}; for (const k in fasce) { const a = fasce[k].sort((x, y) => x - y); out[k] = a.length ? { n: a.length, mediana: +a[a.length >> 1].toFixed(2), p90: +a[Math.floor(a.length * .9)].toFixed(2) } : null; }
    return { pattinamento_m_s: out, scatti: { fotogrammi, oltre20gradi: nScatti, perMille: +(nScatti / fotogrammi * 1000).toFixed(2), daCosa: Object.entries(scatti).sort((a, b) => b[1] - a[1]).slice(0, 12) } }; }, [SEC, SENZA]);
  console.log(JSON.stringify(r, null, 1)); console.log(errs.slice(0, 3)); await br.close(); srv.close(); });
