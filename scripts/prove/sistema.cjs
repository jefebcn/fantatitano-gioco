// Calcio d'inizio di chi gioca, levetta ferma e tenuta in quattro direzioni: chi batte si sistema dietro il pallone
// (sistemaBattitore)? Dice dopo quanto è a posto e dove sta il pallone rispetto al corpo. Uso: RADICE=public node scripts/prove/sistema.cjs
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const root = process.env.RADICE;
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json' };
const srv = http.createServer((q, r) => { const u = q.url.split('?')[0], f = path.join(root, u === '/' ? 'index.html' : decodeURIComponent(u)); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' }); r.end(d); } }); });
srv.listen(0, async () => {
  const br = await chromium.launch(), pg = await br.newPage({ viewport: { width: 844, height: 390 } });
  await pg.goto(`http://localhost:${srv.address().port}/`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await pg.waitForFunction(() => window.__g && !document.querySelector('#carica'), null, { timeout: 90000 });
  const out = await pg.evaluate(() => {
    window.requestAnimationFrame = () => 0; const g = window.__g, G = g.G; g.renderer.render = () => {}; const res = [];
    for (const [jx, jy] of [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1]]) {
      g.prova(7); G.t = 0; g.newMatch(window.CLUBS[2], window.CLUBS[5]); G.auto = false; G.paused = false; G.presenta = null;
      let i = 0; for (; i < 600 && !(G.attesa && G.attesa.chi === G.taker); i++) { g.step(1 / 60); g.draw(1 / 60); }
      const k = G.attesa && G.attesa.chi; if (!k) { res.push({ jx, jy, nota: 'niente attesa', st: G.state }); continue; }
      G.in.jx = jx; G.in.jy = jy; const t0 = G.t;
      for (let n = 0; n < 120 && !G.attesa.pronto; n++) { g.step(1 / 60); g.draw(1 / 60); }
      const b = G.ball, d = k.dir, ux = Math.sin(d), uz = Math.cos(d), rx = b.x - k.x, rz = b.z - k.z;
      res.push({ jx, jy, umano: k.team.human, pronto: !!G.attesa.pronto, dopo: +(G.t - t0).toFixed(2), mira: G.attesa.mira !== undefined ? +(G.attesa.mira * 180 / Math.PI).toFixed(0) : null, dir: +(d * 180 / Math.PI).toFixed(0), avanti: +(rx * ux + rz * uz).toFixed(2), lato: +(rx * uz - rz * ux).toFixed(2), palla: +Math.hypot(b.vx, b.vz).toFixed(2) });
      G.in.jx = G.in.jy = 0;
    }
    return res;
  });
  for (const r of out) console.log(JSON.stringify(r));
  await br.close(); srv.close();
});
