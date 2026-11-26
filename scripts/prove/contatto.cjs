// Calci in partite tra computer: in che fotogramma le dita del piede sono più vicine al punto da cui parte il pallone, dove
// sta il pallone rispetto al corpo e a che punto è la clip rispetto al suo «tocco». Uso: RADICE=public node scripts/prove/contatto.cjs 2
// (R dopo il nome: entro 400 fotogrammi da una palla ferma)
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const root = process.env.RADICE, N = +(process.argv[2] || 2);
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json' };
const srv = http.createServer((q, r) => { const u = q.url.split('?')[0], f = path.join(root, u === '/' ? 'index.html' : decodeURIComponent(u)); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' }); r.end(d); } }); });
srv.listen(0, async () => {
  const br = await chromium.launch(), pg = await br.newPage({ viewport: { width: 844, height: 390 } });
  await pg.goto(`http://localhost:${srv.address().port}/`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await pg.waitForFunction(() => window.__g && !document.querySelector('#carica'), null, { timeout: 90000 });
  const out = await pg.evaluate((N) => {
    window.requestAnimationFrame = () => 0; const g = window.__g, G = g.G; g.renderer.render = () => {}; const res = [];
    for (let k = 0; k < N; k++) {
      g.prova(7 + k); G.t = 0; g.newMatch(window.CLUBS[2], window.CLUBS[5]); G.auto = true; G.paused = false;
      const storia = new Map(); let ultimo = G.calcioT, aperti = [], ripI = -99;
      for (let i = 0; i < 60 * 60 * 8; i++) {
        if (G.state !== 'play') ripI = i;
        g.step(1 / 60); g.draw(1 / 60);
        const all = G.teams.flatMap((t) => t.players);
        for (const p of all) {
          const f = p.fig, L = f.bones && f.bones.ball_l, R = f.bones && f.bones.ball_r; if (!L || !R) continue;
          const v = new (f.root.position.constructor)(), w = new (f.root.position.constructor)(); L.getWorldPosition(v); R.getWorldPosition(w);
          let h = storia.get(p); if (!h) storia.set(p, h = []); h.push({ i, l: [v.x, v.y, v.z], r: [w.x, w.y, w.z], fx: p.fx }); if (h.length > 40) h.shift();
        }
        if (G.calcioT !== ultimo && G.lastKicker && G.state === 'play') {
          ultimo = G.calcioT; const p = G.lastKicker, b = G.ball, sp = Math.hypot(b.vx, b.vz);
          // il pallone è appena partito: punto di partenza = posizione attuale meno un passo
          const x0 = b.x - b.vx / 60, z0 = b.z - b.vz / 60, fx = Math.sin(p.fig.root.rotation.y), fz = Math.cos(p.fig.root.rotation.y), rx = x0 - p.x, rz = z0 - p.z;
          const act = p.fig.act, gi = g.GESTI[p.fx]; aperti.push({ ct: act && gi && gi.tocco !== undefined ? +((act.time - gi.tocco) * 60).toFixed(2) : null, p, i, x: x0, y: b.y - b.vy / 60, z: z0, sp, fx: p.fx, gk: p.i === 0, rip: i - ripI < 400, av: rx * fx + rz * fz, lat: rx * fz - rz * fx, v: Math.hypot(p.vx, p.vz) });
        }
        aperti = aperti.filter((a) => {
          if (i < a.i + 15) return true;
          const h = storia.get(a.p); if (!h) return false;
          let best = null;
          for (const e of h) { if (e.i < a.i - 15) continue; for (const [lato, q] of [['l', e.l], ['r', e.r]]) { const d = Math.hypot(q[0] - a.x, q[1] - a.y, q[2] - a.z); if (!best || d < best.d) best = { d, di: e.i - a.i, lato }; } }
          // distanza del piede più vicino nel fotogramma del calcio
          const e0 = h.find((e) => e.i === a.i), d0 = e0 ? Math.min(...[e0.l, e0.r].map((q) => Math.hypot(q[0] - a.x, q[1] - a.y, q[2] - a.z))) : null;
          if (best && !a.gk) res.push({ ct: a.ct, rip: a.rip, av: +a.av.toFixed(2), lat: +a.lat.toFixed(2), v: +a.v.toFixed(1), fx: a.fx || '-', sp: +a.sp.toFixed(1), di: best.di, dmin: +best.d.toFixed(2), d0: d0 && +d0.toFixed(2) });
          return false;
        });
      }
    }
    return res;
  }, N);
  const per = {};
  for (const r of out) { const k = r.fx.replace(/_sx$/, '') + (r.rip ? ' R' : ''); (per[k] = per[k] || []).push(r); }
  const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
  for (const [k, a] of Object.entries(per)) console.log(k.padEnd(16), 'n', String(a.length).padStart(3), 'fotogrammi piede più vicino dopo il calcio (mediana)', med(a.map((r) => r.di)), 'quota >0:', a.filter((r) => r.di > 0).length, 'dist min', med(a.map((r) => r.dmin)), 'al calcio', med(a.map((r) => r.d0)), 'pallone avanti', med(a.map((r) => r.av)), 'lato', med(a.map((r) => r.lat)), 'vel', med(a.map((r) => r.v)), 'clip-tocco (fotogrammi)', med(a.map((r) => r.ct)));
  fs.writeFileSync(process.env.OUT || '/dev/null', JSON.stringify(out));
  await br.close(); srv.close();
});
