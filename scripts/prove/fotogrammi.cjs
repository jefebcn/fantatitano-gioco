/* Foglio di fotogrammi: per ogni clip di public/anim-gf.js data, sei pose (dall'inizio alla fine) di un giocatore visto da
   vicino, salvate come PNG nella cartella data. Serve a controllare a occhio una clip nuova prima di usarla.
   Uso: npm run build && node scripts/prove/fotogrammi.cjs <cartella> clip1 clip2 …  (serve Playwright, come partita.cjs) */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', '..', 'public'), OUT = process.argv[2];
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2' };
const srv = http.createServer((q, r) => { const u = q.url.split('?')[0], f = path.join(root, u === '/' ? 'index.html' : decodeURIComponent(u)); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' }); r.end(d); } }); });
const CLIP = process.argv.slice(3);
srv.listen(0, async () => {
  const br = await chromium.launch(), pg = await br.newPage({ viewport: { width: 360, height: 360 } });
  await pg.goto(`http://localhost:${srv.address().port}/`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await pg.waitForFunction(() => window.__g && !document.querySelector('#carica'), null, { timeout: 90000 });
  await pg.evaluate(() => { window.requestAnimationFrame = () => 0; const g = window.__g, G = g.G; G.paused = true; G.shown = true; g.newMatch(window.CLUBS[0], window.CLUBS[1]); G.auto = true; for (let i = 0; i < 30; i++) { g.step(1 / 60); g.draw(1 / 60); } document.querySelectorAll('body > *:not(canvas)').forEach((e) => { e.style.display = 'none'; }); });
  for (const nome of CLIP) for (const k of [0, .2, .4, .6, .8, 1]) {
    await pg.evaluate(([nome, k]) => {
      const g = window.__g, G = g.G, p = G.teams[0].players[6], d = window.ANIMS_GF.info[nome].durata;
      G.dbgFx = { name: nome, t: d * k }; p.dir = 0; p.fig.vdir = 0;
      g.draw(0);
      const c = g.cam; c.position.set(p.x + 3.2, 1.6, p.z + 2.2); c.lookAt(p.x, .9, p.z); c.fov = 40; c.updateProjectionMatrix();
      g.renderer.render(g.scene, c);
    }, [nome, k]);
    await pg.screenshot({ path: `${OUT}/${nome}_${Math.round(k * 10)}.png` });
  }
  await br.close(); srv.close();
});
