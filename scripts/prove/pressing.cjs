/* Gli avversari vanno sul portatore di chi gioca (Alex, 25/11: «gli avversari non attaccano mai il pallone»).
   Il giocatore comandato porta palla vicino alla metà campo, nella sua metà, muovendosi di lato con la levetta, come nel
   video di Alex: entro 8 secondi un avversario deve tentare l'intervento. Prima il primo uomo lo accompagnava a 6,5 m e,
   quando andava sul pallone, puntava un punto tre metri più in là: non arrivava mai.
   Uso: npm run build && node scripts/prove/pressing.cjs (serve Playwright, come partita.cjs). */
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
  await pg.evaluate(() => { window.requestAnimationFrame = () => 0; window.__g.prova(7); });
  await pg.waitForTimeout(300);
  await pg.evaluate(() => { window.__g.G.t = 0; window.__g.startMatch(window.CLUBS[2].id, window.CLUBS[5].id, 'normale'); });
  await pg.waitForFunction(() => ['kickoff', 'play'].includes(window.__g.G.state) && window.__g.G.teams.length === 2, null, { timeout: 60000 });
  const esiti = await pg.evaluate(() => {
    window.requestAnimationFrame = () => 0; const g = window.__g, G = g.G, HW = g.CFG.HW; g.renderer.render = () => {};
    const out = [];
    for (let k = 0; k < 6; k++) {
      // ogni prova da una partita nuova, con tutti al loro posto
      g.prova(7 + k); G.t = 0; g.newMatch(window.CLUBS[2], window.CLUBS[5]); G.auto = false; G.paused = false;
      for (let i = 0; i < 200 && G.state !== 'play'; i++) { g.step(1 / 60); g.draw(1 / 60); }
      G.state = 'play'; G.attesa = null; G.fk = null; G.rimessa = null;
      for (let i = 0; i < 60; i++) { g.step(1 / 60); g.draw(1 / 60); }
      const t = G.teams[0], o = G.teams[1], avanti = -o.side, x0 = avanti * (k % 2 ? -8 : -15), z0 = [28, -28, 10][k % 3];
      const p = t.players[8], b = G.ball;
      p.x = x0; p.z = z0; p.vx = avanti * 4; p.vz = 0; p.dir = Math.atan2(avanti, 0); p.carica = null; p.tocca = null; p.cool = 0; p.stun = 0;
      b.x = p.x + avanti * .5; b.z = p.z; b.y = .11; b.vx = avanti * 4; b.vz = 0; b.vy = 0; g.gain(p); G.ctrl = p;
      // di lato e un po' indietro, verso il centro; alla linea si torna
      G.in.jx = -avanti * .25; G.in.jy = (z0 > 0 ? -1 : 1) * .6;
      // anche il fallo è un intervento: chi va sul pallone e trattiene o sgambetta l'ha attaccato
      let intervento = null, min = 99, come = '';
      const falli0 = G.stats.fouls[o.idx];
      for (let i = 0; i < 60 * 8 && intervento === null; i++) {
        g.step(1 / 60); g.draw(1 / 60);
        if (Math.abs(p.z) > HW - 2) G.in.jy = -G.in.jy;
        for (const q of o.players) { if (q.i === 0) continue; min = Math.min(min, Math.hypot(q.x - p.x, q.z - p.z)); if ((q.fx && /^contrasto/.test(q.fx)) || q.st === 'slide') { intervento = i / 60; come = 'contrasto'; } }
        if (intervento === null && G.ball.owner !== p && G.ball.owner && G.ball.owner.team === o) { intervento = i / 60; come = 'pallone preso'; }
        if (intervento === null && G.stats.fouls[o.idx] > falli0) { intervento = i / 60; come = 'fallo'; }
      }
      G.in.jx = G.in.jy = 0;
      out.push({ k, da: `${x0},${z0}`, intervento, come, min: +min.toFixed(1) });
    }
    return out;
  });
  let male = 0;
  for (const e of esiti) {
    const ok = e.intervento !== null; if (!ok) male++;
    console.log(`${ok ? '✓' : '✗'} prova ${e.k + 1}, partenza ${e.da}: ${ok ? `intervento (${e.come}) dopo ${e.intervento.toFixed(1)} s` : `nessun intervento in 8 s (avversario più vicino a ${e.min} m)`}`);
  }
  if (errori.length) console.log('Errori nella pagina:', [...new Set(errori)].slice(0, 5));
  await br.close(); srv.close();
  process.exitCode = male || errori.length ? 1 : 0;
});
