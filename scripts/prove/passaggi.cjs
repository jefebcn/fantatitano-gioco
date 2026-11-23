/* Il peso del passaggio rasoterra. Un passaggio a 6, 10, 15, 20, 25 e 30 metri, al compagno fermo e al compagno che corre
   (in avanti, di lato, incontro): quanto ci mette, a che velocità gli arriva, se lo prende, e se è corto (si ferma prima)
   o lungo (lo supera). Nessun avversario in mezzo. Uso: npm run build && node scripts/prove/passaggi.cjs */
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
    const fermo = (p, x, z) => { p.x = x; p.z = z; p.vx = p.vz = 0; p.tx = x; p.tz = z; p.st = 'run'; p.stun = 0; p.cool = 0; p.run = null; };
    // come corre chi riceve: fermo, in avanti (via da chi passa), di lato, incontro
    const corse = { fermo: null, 'in avanti': [1, 0], 'di lato': [0, 1], incontro: [-1, 0] };
    let k = 0;
    for (const d of [6, 10, 15, 20, 25, 30]) for (const [nome, verso] of Object.entries(corse)) {
      let sd = 71 + k++; Math.random = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
      G.paused = true; G.shown = true; G.t = 0; G.diff = g.DIFF.normale; G.noRegia = true;
      g.newMatch(window.CLUBS[2], window.CLUBS[7]); G.auto = true;
      for (let i = 0; i < 60; i++) { g.step(dt); g.draw(dt); }
      const t = G.teams[0], o = G.teams[1], s = t.side, a = t.players[7], m = t.players[8], b = G.ball;
      o.players.forEach((p, i) => fermo(p, s * (47 - (i % 3)), (i - 5) * 2.5));
      t.players.forEach((p, i) => { if (i && p !== a && p !== m) fermo(p, -s * (25 + i), (i - 5) * 6); });
      fermo(a, -s * 15, 0); fermo(m, a.x + s * d, 0); a.dir = Math.atan2(s, 0);
      // chi corre parte già lanciato a 5 m/s nel suo verso e continua (un inserimento)
      if (verso) { m.vx = s * verso[0] * 5; m.vz = verso[1] * 5; m.dir = Math.atan2(m.vx, m.vz); }
      b.owner = null; b.x = a.x + s * .5; b.z = 0; b.y = g.CFG.BR; b.vx = b.vy = b.vz = 0; G.state = 'play'; G.attesa = null; g.gain(a);
      g.pass(a, m); const v0 = hyp(b.vx, b.vz), da = [b.x, b.z];
      let preso = null, vArrivo = null, minD = 99, fermata = null;
      for (let n = 1; n <= 7 * 60 && preso === null; n++) {
        // finché il pallone viaggia chi corre tiene la sua corsa: poi ci pensa il gioco (va incontro al pallone)
        g.step(dt); g.draw(dt);
        const dm = hyp(m.x - b.x, m.z - b.z), v = hyp(b.vx, b.vz);
        if (!b.owner) { if (dm < minD) { minD = dm; vArrivo = v; } if (v < .5 && fermata === null) fermata = n * dt; }
        if (b.owner && b.owner !== a) preso = n * dt;
      }
      const chi = b.owner && b.owner !== a ? b.owner : null, strada = hyp(b.x - da[0], b.z - da[1]);
      out.push({ d, nome, v0: +v0.toFixed(1), tempo: preso, vArrivo: vArrivo === null ? null : +vArrivo.toFixed(1), chi: !chi ? 'nessuno' : chi === m ? 'lui' : chi.team === t ? 'un compagno' : 'un avversario', minD: +minD.toFixed(2), strada: +strada.toFixed(1), corto: fermata !== null && !chi });
    }
    return out;
  });
  let male = 0;
  console.log('distanza | chi riceve | parte a | arriva a | tempo | preso da | pallone ha fatto');
  for (const e of esiti) {
    const ok = e.chi === 'lui'; if (!ok) male++;
    console.log(`${ok ? '✓' : '✗'} ${String(e.d).padStart(2)} m | ${e.nome.padEnd(9)} | ${String(e.v0).padStart(4)} m/s | ${String(e.vArrivo ?? '—').padStart(4)} m/s | ${e.tempo === null ? '  —  ' : e.tempo.toFixed(2) + ' s'} | ${e.chi.padEnd(11)} | ${e.strada} m${e.corto ? ' (corto: si è fermato prima)' : ''}${!ok && !e.corto ? ` (gli è passato a ${e.minD} m)` : ''}`);
  }
  if (errori.length) console.log('Errori nella pagina:', [...new Set(errori)].slice(0, 5));
  await br.close(); srv.close();
  process.exitCode = male || errori.length ? 1 : 0;
});
