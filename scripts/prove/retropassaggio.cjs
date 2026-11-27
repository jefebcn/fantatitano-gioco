// Retropassaggio (Alex, 27/11: in Dream League il portiere lo stoppa coi piedi e lo comandi tu). Un difensore passa
// rasoterra al proprio portiere, piano e forte: il portiere lo deve stoppare al piede (non in mano); quello di chi gioca
// passa al comando e col tasto passa il pallone, poi il comando torna a un compagno; con la levetta si muove col pallone;
// un avversario addosso glielo può rubare; quello del computer lo rigioca da solo entro 2 s.
// Uso: npm run build, poi RADICE=public node scripts/prove/retropassaggio.cjs
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const root = process.env.RADICE || path.join(__dirname, '../../public');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json' };
const srv = http.createServer((q, r) => { const u = q.url.split('?')[0], f = path.join(root, u === '/' ? 'index.html' : decodeURIComponent(u)); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' }); r.end(d); } }); });
srv.listen(0, async () => {
  const br = await chromium.launch(), pg = await br.newPage({ viewport: { width: 844, height: 390 } });
  const errori = []; pg.on('pageerror', (e) => errori.push(String(e)));
  await pg.goto(`http://localhost:${srv.address().port}/`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await pg.waitForFunction(() => window.__g && !document.querySelector('#carica'), null, { timeout: 90000 });
  const casi = [['chi gioca, piano, passa col tasto', 0, 10, 'passa'], ['chi gioca, forte, passa col tasto', 0, 16, 'passa'], ['chi gioca, si muove con la levetta', 0, 16, 'muovi'], ['chi gioca, avversario addosso', 0, 16, 'ruba'], ['computer, piano', 1, 10, 'da solo'], ['computer, forte', 1, 16, 'da solo'], ['computer, avversario addosso', 1, 16, 'ruba']];
  const out = await pg.evaluate((casi) => {
    window.requestAnimationFrame = () => 0; const g = window.__g, G = g.G; g.renderer.render = () => {}; const res = [];
    for (const [nome, casa, forza, prova] of casi) {
      g.prova(11); G.t = 0; g.newMatch(window.CLUBS[2], window.CLUBS[5]); G.auto = false; G.paused = false; G.presenta = null;
      for (let i = 0; i < 200 && G.state !== 'play'; i++) { g.step(1 / 60); g.draw(1 / 60); }
      G.state = 'play'; G.attesa = null; G.fk = null; G.rimessa = null;
      const t = G.teams[casa], s = t.side, gk = t.players[0], dif = t.players[2], b = G.ball, opp = t.opp.players[9];
      for (const tt of G.teams) for (const p of tt.players) { p.x = s * 10; p.z = (p.i - 5) * 3; p.vx = p.vz = 0; p.tx = p.x; p.tz = p.z; }
      gk.x = -s * 50; gk.z = 0; gk.dir = Math.atan2(s, 0); dif.x = -s * 32; dif.z = 4; dif.dir = Math.atan2(-s, 0);
      for (let i = 0; i < 5; i++) { g.step(1 / 60); g.draw(1 / 60); }
      if (t.human) G.ctrl = dif;
      b.x = dif.x - s * .5; b.z = dif.z; b.y = .11; const dx = gk.x - b.x, dz = gk.z - b.z, d = Math.hypot(dx, dz);
      b.owner = null; b.vx = dx / d * forza; b.vz = dz / d * forza; b.vy = 0; G.calcioT = G.piedeT = G.t; G.lastKicker = G.lastTouch = dif; G.intended = null;
      const r = { nome, prova, umano: t.human }; let t0 = null;
      for (let i = 0; i < 600; i++) {
        // l'avversario resta lontano finché il portiere non ha il pallone
        if (t0 === null) { opp.x = s * 10; opp.z = -6; opp.vx = opp.vz = 0; }
        g.step(1 / 60); g.draw(1 / 60);
        if (G.state !== 'play') { r.fermo = G.state; break; }
        if (t0 === null && b.owner) {
          if (b.owner !== gk) { r.altro = b.owner.name; break; }
          t0 = G.t; r.piedi = !!gk.piedi; r.comando = G.ctrl === gk; r.da = [gk.x, gk.z];
          if (prova === 'ruba') { opp.x = gk.x + s * 2.5; opp.z = gk.z + .5; opp.vx = opp.vz = 0; }
        }
        if (t0 === null) continue;
        const dopo = G.t - t0;
        if (Math.abs(dopo - .3) < .009 && b.owner === gk) { r.alto = b.y; r.vicino = Math.hypot(b.x - gk.x, b.z - gk.z); if (prova === 'passa') { g.pressA(true); g.step(1 / 60); g.pressA(false); } }
        if (prova === 'muovi') { G.in.jx = 1; G.in.jy = 0; if (dopo > 1.2) { G.in.jx = 0; r.mosso = Math.hypot(gk.x - r.da[0], gk.z - r.da[1]); r.tiene = b.owner === gk; break; } }
        if (b.owner !== gk) { r.via = dopo; r.chi = b.owner ? (b.owner.team === t ? 'compagno' : 'avversario') : (G.lastTouch === gk ? 'calciato' : 'conteso'); r.comandoDopo = G.ctrl ? G.ctrl.i : null; if (prova !== 'ruba' || r.chi !== 'calciato') break; }
        if (dopo > 4) break;
      }
      res.push(r);
    }
    return res;
  }, casi);
  let ko = 0;
  for (const r of out) {
    const no = [];
    if (r.fermo || r.altro || r.piedi === undefined) no.push(`il portiere non riceve (${r.fermo || r.altro || 'nessuno'})`);
    else {
      if (!r.piedi) no.push('lo prende con le mani');
      if (r.alto > .2 || r.vicino > 1.2) no.push(`pallone non al piede (alto ${r.alto && r.alto.toFixed(2)} m, a ${r.vicino && r.vicino.toFixed(2)} m)`);
      if (r.umano && !r.comando) no.push('il comando non passa al portiere');
      if (r.prova === 'passa' && !(r.chi === 'calciato' && r.comandoDopo)) no.push(`col tasto non lo passa (${r.chi}, comando ${r.comandoDopo})`);
      if (r.prova === 'muovi' && !(r.mosso > 3 && r.tiene)) no.push(`non si muove col pallone (${r.mosso && r.mosso.toFixed(1)} m)`);
      if (r.prova === 'ruba' && r.umano && r.chi !== 'avversario') no.push(`l'avversario non lo ruba (${r.chi || 'nessuno'})`);
      if (r.prova === 'ruba' && !r.umano && !(r.via < 1)) no.push('pressato non lo rinvia subito');
      if (r.prova === 'da solo' && !(r.via < 2 && r.chi === 'calciato')) no.push(`non lo rigioca da solo (${r.via})`);
    }
    if (no.length) ko++;
    console.log(`${no.length ? '✗' : '✓'} ${r.nome}${no.length ? ': ' + no.join(', ') : `: al piede, ${r.via !== undefined ? `via dopo ${r.via.toFixed(2)} s (${r.chi})` : `mosso ${r.mosso.toFixed(1)} m`}`}`);
  }
  if (errori.length) { ko++; console.log('errori nella pagina:', errori.slice(0, 3).join(' | ')); }
  await br.close(); srv.close(); process.exitCode = ko ? 1 : 0;
});
