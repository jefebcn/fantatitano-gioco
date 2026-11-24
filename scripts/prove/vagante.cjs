/* Palla che arriva a chi gioca. Due controlli:
   1. Passaggio rasoterra al giocatore comandato, con la levetta tenuta in otto direzioni (e ferma): entro 4 secondi il
      pallone dev'essere suo o di un compagno. Prima, con la levetta tenuta, gli correva accanto senza toccarlo.
   2. Palla libera vicino a un compagno mentre chi è comandato è lontano: entro un secondo il comando passa a chi la può
      prendere, e il pallone viene preso.
   Uso: npm run build && node scripts/prove/vagante.cjs (serve Playwright, come partita.cjs). */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const root = process.env.RADICE || path.join(__dirname, '..', '..', 'public');
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
    const g = window.__g, G = g.G, hyp = Math.hypot, out = [], dt = 1 / 60;
    g.renderer.render = () => {};
    // una scena pulita: le due squadre ai loro posti, gli avversari lontani, il pallone a `da` e chi è comandato a `a`
    const scena = (k) => {
      let sd = 51 + k; Math.random = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
      G.paused = true; G.shown = true; G.t = 0; G.diff = g.DIFF.normale; G.noRegia = true;
      g.newMatch(window.CLUBS[k % 10], window.CLUBS[(k + 5) % 10]); G.auto = false;
      for (let i = 0; i < 90; i++) { g.step(dt); g.draw(dt); }
      const t = G.teams[0], o = G.teams[1], s = t.side;
      // gli avversari tutti nella loro area: non contano
      o.players.forEach((p, i) => { p.x = -s * -1 * 0 + s * (45 - (i % 3)); p.z = (i - 5) * 2.5; p.vx = p.vz = 0; });
      return { t, s };
    };
    const fermo = (p, x, z) => { p.x = x; p.z = z; p.vx = p.vz = 0; p.tx = x; p.tz = z; p.st = 'run'; p.stun = 0; p.cool = 0; p.run = null; };
    const dirs = [[0, 0], [1, 0], [.7, .7], [0, 1], [-.7, .7], [-1, 0], [-.7, -.7], [0, -1], [.7, -.7]];
    // 1. passaggio al giocatore comandato, levetta tenuta
    dirs.forEach((d, k) => {
      const { t, s } = scena(k), a = t.players[7], m = t.players[8], b = G.ball;
      t.players.forEach((p, i) => { if (i && p !== a && p !== m) fermo(p, -s * (20 + i), (i - 5) * 6); });
      fermo(a, -s * 5, -8); fermo(m, s * 5, 6); a.dir = Math.atan2(m.x - a.x, m.z - a.z);
      b.x = a.x + Math.sin(a.dir) * .5; b.z = a.z + Math.cos(a.dir) * .5; b.y = g.CFG.BR; b.vx = b.vy = b.vz = 0; g.gain(a); G.state = 'play'; G.attesa = null;
      g.pass(a, m); G.in.jx = d[0]; G.in.jy = d[1];
      let preso = null, min = 99;
      for (let n = 1; n <= 4 * 60 && preso === null; n++) {
        g.step(dt); g.draw(dt); if (!b.owner) min = Math.min(min, hyp(G.ctrl.x - b.x, G.ctrl.z - b.z));
        if (b.owner && b.owner !== a) preso = n * dt;
      }
      const chi = b.owner && b.owner !== a ? b.owner : null, ok = !!chi && chi.team === t;
      out.push({ prova: `passaggio, levetta ${d[0] || d[1] ? `(${d[0]}, ${d[1]})` : 'ferma'}`, ok, come: ok ? `preso da ${chi === m ? 'chi lo aspettava' : 'un compagno'} dopo ${preso.toFixed(1)} s` : `nessuno lo prende in 4 secondi (il comandato gli è arrivato a ${min.toFixed(2)} m)` });
      G.in.jx = G.in.jy = 0;
    });
    // 2. palla libera vicino a un compagno, il comandato lontano
    [[3, 0], [0, 2.5], [-2, -2]].forEach((v, k) => {
      const { t, s } = scena(20 + k), lontano = t.players[9], vicino = t.players[6], b = G.ball;
      t.players.forEach((p, i) => { if (i && p !== lontano && p !== vicino) fermo(p, -s * (22 + i), (i - 5) * 6); });
      fermo(lontano, s * 12, 16); fermo(vicino, -s * 4, -3);
      b.owner = null; b.x = vicino.x + 4; b.z = vicino.z + 3; b.y = g.CFG.BR; b.vx = v[0]; b.vz = v[1]; b.vy = 0; G.state = 'play'; G.attesa = null; G.intended = null; G.ctrl = lontano; G.cambioT = 0;
      let cambio = null, preso = null;
      for (let n = 1; n <= 4 * 60 && preso === null; n++) {
        g.step(dt); g.draw(dt);
        if (cambio === null && G.ctrl !== lontano) cambio = n * dt;
        if (b.owner) preso = n * dt;
      }
      const ok = cambio !== null && cambio <= 1 && preso !== null && b.owner.team === t;
      out.push({ prova: `palla libera a ${v[0]}, ${v[1]} m/s`, ok, come: `comando passato ${cambio === null ? 'mai' : 'dopo ' + cambio.toFixed(2) + ' s'}, pallone ${preso === null ? 'non preso' : 'preso dopo ' + preso.toFixed(1) + ' s'}` });
    });
    return out;
  });
  let male = 0;
  for (const e of esiti) { if (!e.ok) male++; console.log(`${e.ok ? '✓' : '✗'} ${e.prova}: ${e.come}`); }
  if (errori.length) console.log('Errori nella pagina:', [...new Set(errori)].slice(0, 5));
  await br.close(); srv.close();
  process.exitCode = male || errori.length ? 1 : 0;
});
