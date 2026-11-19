/* Rigori fischiati a comando, sei volte e con i giocatori sparsi per il campo: chi lo batte e gli altri devono arrivare al
   loro posto correndo (nessuno può spostarsi più di 60 cm in un fotogramma), il tiro deve partire entro 16 secondi e il
   gioco riprendere. Uso: npm run build && node scripts/prove/rigori.cjs (serve Playwright, come partita.cjs). */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const root = path.join(__dirname, '..', '..', 'public');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2' };
const srv = http.createServer((q, r) => {
  const u = q.url.split('?')[0], f = path.join(root, u === '/' ? 'index.html' : decodeURIComponent(u));
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' }); r.end(d); } });
});

srv.listen(0, async () => {
  const br = await chromium.launch(), pg = await br.newPage(), errori = [];
  pg.on('pageerror', (e) => errori.push(String(e)));
  await pg.goto(`http://localhost:${srv.address().port}/`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await pg.waitForFunction(() => window.__g && !document.querySelector('#carica'), null, { timeout: 90000 });
  await pg.evaluate(() => new Promise((ok) => { window.requestAnimationFrame = () => 0; setTimeout(ok, 100); }));
  const esiti = await pg.evaluate(() => {
    const g = window.__g, G = g.G, hyp = Math.hypot, out = [];
    g.renderer.render = () => {};
    for (let k = 0; k < 6; k++) {
      let sd = 11 + k; Math.random = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
      G.paused = true; G.shown = true; G.t = 0; G.diff = g.DIFF.normale;
      g.newMatch(window.CLUBS[k], window.CLUBS[k + 6]); G.auto = true;
      for (let i = 0; i < 600; i++) { g.step(1 / 60); g.draw(1 / 60); } // dieci secondi di gioco: giocatori sparsi
      g.penalty(G.teams[k % 2]);
      const prima = new Map(); let salto = 0, chi = '', tiro = null;
      for (let n = 1; n <= 16 * 60 && !tiro; n++) {
        const st = G.state; g.step(1 / 60); g.draw(1 / 60);
        for (const p of G.teams[0].players.concat(G.teams[1].players)) {
          const pp = prima.get(p), d = pp ? hyp(p.x - pp[0], p.z - pp[1]) : 0;
          if (d > salto) { salto = d; chi = p.name; }
          prima.set(p, [p.x, p.z]);
        }
        if (st === 'restart' && G.state === 'play') tiro = n / 60;
      }
      out.push({ k, tiro, salto: +salto.toFixed(2), chi });
    }
    return out;
  });
  let male = 0;
  for (const e of esiti) {
    const ok = e.tiro !== null && e.salto <= .6; if (!ok) male++;
    console.log(`${ok ? '✓' : '✗'} rigore ${e.k + 1}: tiro dopo ${e.tiro === null ? '—' : e.tiro.toFixed(1) + ' s'}, spostamento massimo in un fotogramma ${e.salto} m (${e.chi})`);
  }
  if (errori.length) console.log('Errori nella pagina:', [...new Set(errori)].slice(0, 5));
  await br.close(); srv.close();
  process.exitCode = male || errori.length ? 1 : 0;
});
