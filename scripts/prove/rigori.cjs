/* Rigori fischiati a comando, sei volte e con i giocatori sparsi per il campo: chi lo batte e gli altri devono arrivare al
   loro posto correndo (nessuno può spostarsi più di 60 cm in un fotogramma), il tiro deve partire entro 16 secondi e il
   gioco riprendere. Poi la levetta sui piazzati: su rigore e punizione con la barriera deve seguire lo schermo. Uso: npm run build && node scripts/prove/rigori.cjs (serve Playwright, come partita.cjs). */
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
  // La levetta sui piazzati segue lo schermo (come Dream League): rigore e punizione con la barriera, nei due tempi (si
  // attacca da una parte e poi dall'altra). Levetta a destra: il tiro va verso la destra dello schermo; a sinistra, a sinistra.
  const levetta = await pg.evaluate(() => {
    const g = window.__g, G = g.G, out = [];
    for (const [nome, tempo, jx] of [['rigore', 1, 1], ['rigore', 1, -1], ['rigore', 2, 1], ['rigore', 2, -1], ['punizione', 1, 1], ['punizione', 1, -1], ['punizione', 2, 1], ['punizione', 2, -1]]) {
      let sd = 31; Math.random = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
      G.paused = true; G.shown = true; G.t = 0; G.diff = g.DIFF.normale;
      g.newMatch(window.CLUBS[0], window.CLUBS[6]); G.auto = true;
      for (let i = 0; i < 300; i++) { g.step(1 / 60); g.draw(1 / 60); }
      const t = G.teams[0]; if (tempo === 2) for (const q of G.teams) q.side = -q.side;
      G.auto = false; G.in.jx = G.in.jy = 0;
      if (nome === 'rigore') g.penalty(t); else g.freeKick(t, t.side * (g.CFG.HL - 22), 4, 'punizione');
      let n = 0; while (n++ < 20 * 60 && !(G.attesa && G.state === 'play' && G.attesa.chi.team === t)) { g.step(1 / 60); g.draw(1 / 60); }
      const k = G.attesa && G.attesa.chi, b = G.ball; if (!k) { out.push({ nome, tempo, jx, lato: null }); continue; }
      // la destra dello schermo nel mondo, dalla telecamera del piazzato
      const destra = g.cam.position.clone().set(1, 0, 0).applyQuaternion(g.cam.quaternion), gira = !!(G.inquadra && G.inquadra.gira);
      G.in.jx = jx; g.pressB(true); for (let i = 0; i < 20; i++) { g.step(1 / 60); g.draw(1 / 60); } g.pressB(false);
      n = 0; while (n++ < 3 * 60 && b.owner === k) { g.step(1 / 60); g.draw(1 / 60); }
      G.in.jx = 0;
      out.push({ nome, tempo, jx, gira, lato: b.owner === k ? null : +(b.vx * destra.x + b.vz * destra.z).toFixed(1) });
    }
    return out;
  });
  let male = 0;
  for (const e of levetta) {
    const ok = e.lato !== null && e.gira && Math.sign(e.lato) === e.jx; if (!ok) male++;
    console.log(`${ok ? '✓' : '✗'} levetta a ${e.jx > 0 ? 'destra' : 'sinistra'}, ${e.nome}, ${e.tempo}° tempo: ${e.lato === null ? 'non ha calciato' : `il pallone va a ${e.lato > 0 ? 'destra' : 'sinistra'} dello schermo (${e.lato} m/s)`}`);
  }
  for (const e of esiti) {
    const ok = e.tiro !== null && e.salto <= .6; if (!ok) male++;
    console.log(`${ok ? '✓' : '✗'} rigore ${e.k + 1}: tiro dopo ${e.tiro === null ? '—' : e.tiro.toFixed(1) + ' s'}, spostamento massimo in un fotogramma ${e.salto} m (${e.chi})`);
  }
  if (errori.length) console.log('Errori nella pagina:', [...new Set(errori)].slice(0, 5));
  await br.close(); srv.close();
  process.exitCode = male || errori.length ? 1 : 0;
});
