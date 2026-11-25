/* Dopo un passaggio di chi gioca il comando resta al compagno che riceve (video di Alex del 25/11: il segnalino restava su
   chi aveva passato). Il passaggio dà il comando al destinatario, ma subito dopo il cambio automatico a palla libera lo
   riportava a chi aveva passato, perché il pallone appena calciato gli era ancora vicino. Quattro passaggi col tasto B in
   quattro direzioni: appena il pallone parte e mezzo secondo dopo, il comandato dev'essere il destinatario.
   Uso: npm run build && node scripts/prove/comando.cjs (serve Playwright, come partita.cjs). */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const root = process.env.RADICE || path.join(__dirname, '..', '..', 'public');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json' };
const srv = http.createServer((q, r) => {
  const u = q.url.split('?')[0], f = path.join(root, u === '/' ? 'index.html' : decodeURIComponent(u));
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' }); r.end(d); } });
});

srv.listen(0, async () => {
  const br = await chromium.launch(), pg = await br.newPage({ viewport: { width: 844, height: 390 } }), errori = [];
  pg.on('pageerror', (e) => errori.push(String(e)));
  await pg.goto(`http://localhost:${srv.address().port}/`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await pg.waitForFunction(() => window.__g && !document.querySelector('#carica'), null, { timeout: 90000 });
  await pg.evaluate(() => { window.requestAnimationFrame = () => 0; window.__g.prova(9); });
  await pg.waitForTimeout(300);
  await pg.evaluate(() => { window.__g.G.t = 0; window.__g.startMatch(window.CLUBS[2].id, window.CLUBS[5].id, 'normale'); });
  await pg.waitForFunction(() => ['kickoff', 'play'].includes(window.__g.G.state) && window.__g.G.teams.length === 2, null, { timeout: 60000 });
  const esiti = await pg.evaluate(() => {
    window.requestAnimationFrame = () => 0; const g = window.__g, G = g.G, out = []; g.renderer.render = () => {};
    const passo = (n) => { for (let i = 0; i < n; i++) { g.step(1 / 60); g.draw(1 / 60); } };
    for (const [jx, jy] of [[.7, .7], [.7, -.7], [1, 0], [0, 1]]) {
      g.prova(9); G.t = 0; g.newMatch(window.CLUBS[2], window.CLUBS[5]); G.auto = false; G.paused = false;
      for (let i = 0; i < 200 && G.state !== 'play'; i++) passo(1);
      const t = G.teams[0], avanti = -G.teams[1].side, p = t.players[6], b = G.ball;
      G.state = 'play'; G.attesa = null; p.x = avanti * -5; p.z = -10; b.x = p.x + avanti * .5; b.z = p.z; b.vx = b.vz = 0; g.gain(p); G.ctrl = p; passo(10);
      G.in.jx = avanti * jx; G.in.jy = jy; g.pressA(true); passo(8); g.pressA(false);
      let n = 0; while (n++ < 120 && G.ball.owner === p) passo(1);
      const dest = G.intended, subito = G.ctrl; passo(30); const dopo = G.ctrl;
      G.in.jx = G.in.jy = 0;
      out.push({ dir: `${jx},${jy}`, chi: p.name, dest: dest ? dest.name : null, subito: subito ? subito.name : null, dopo: dopo ? dopo.name : null, intercettato: !!(G.ball.owner && G.ball.owner.team !== t) });
    }
    return out;
  });
  let male = 0;
  for (const e of esiti) {
    const ok = e.dest && e.dest !== e.chi && e.subito === e.dest && (e.dopo === e.dest || e.intercettato); if (!ok) male++;
    console.log(`${ok ? '✓' : '✗'} levetta ${e.dir}: passa ${e.chi} a ${e.dest || '-'}; comandato subito ${e.subito}, dopo mezzo secondo ${e.dopo}`);
  }
  if (errori.length) console.log('Errori nella pagina:', [...new Set(errori)].slice(0, 5));
  await br.close(); srv.close();
  process.exitCode = male || errori.length ? 1 : 0;
});
