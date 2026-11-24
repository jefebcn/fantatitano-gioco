/* Nessuna ripresa parte da sola. Per ogni palla ferma (calcio d'inizio, punizione lontana, punizione con la barriera,
   fuorigioco, calcio d'angolo, rimessa laterale, rimessa dal fondo, rigore) e per chi la batte (chi gioca, il computer):
   - il pallone non si muove finché non viene battuto;
   - se batte chi gioca, dopo 12 secondi senza toccare niente è ancora lì e gli altri sono fermi; col tasto parte subito;
   - se batte il computer, parte dopo l'attesa (FERMI.cpu) e non prima;
   - nessuno scatta mentre va al suo posto (andatura di FERMI.passo, con un metro al secondo di margine);
   - prima del calcio d'inizio di un tempo il cronometro resta fermo.
   Uso: npm run build && node scripts/prove/riprese.cjs (serve Playwright, come partita.cjs). */
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
    const g = window.__g, G = g.G, hyp = Math.hypot, out = [], dt = 1 / 60, { HL, HW } = g.CFG;
    g.renderer.render = () => {};
    const tutti = () => G.teams[0].players.concat(G.teams[1].players);
    // ogni ripresa: come la si fa partire per la squadra t
    const riprese = {
      'calcio d\'inizio': (t) => g.kickoff(t),
      'punizione lontana': (t) => g.freeKick(t, -t.side * 8, 9, 'punizione'),
      'punizione con la barriera': (t) => g.freeKick(t, t.side * (HL - 24), 4, 'punizione'),
      // un avversario col posto appena oltre la distanza (9,3 m) che parte da dentro: non deve fermarsi un palmo prima,
      // se no la ripresa aspetta a vuoto il tempo massimo (vedi `entro`)
      'punizione, avversario sul limite della distanza': (t) => { g.freeKick(t, -t.side * 8, -9, 'punizione'); const o = t.opp.players[8], b = G.ball; o.posto = { n: G.fermoN, h: [b.x - t.side * 9.3, b.z] }; o.x = b.x - t.side * 8; o.z = b.z; o.vx = o.vz = 0; },
      fuorigioco: (t) => g.freeKick(t, -t.side * 20, -12, 'fuorigioco'),
      'calcio d\'angolo': (t) => g.corner(t, t.side * (HL - .6), HW - .6),
      'rimessa laterale': (t) => g.restart(t, 6, HW - .5, 'laterale'),
      'rimessa dal fondo': (t) => g.restart(t, -t.side * (HL - 6), 0, 'fondo', t.players[0]),
      rigore: (t) => g.penalty(t),
    };
    // entro quanti secondi si deve poter battere (solo dove nessuno ha strada da fare)
    const entro = { 'punizione, avversario sul limite della distanza': 5 };
    let k = 0;
    for (const nome of Object.keys(riprese)) for (const chi of ['utente', 'computer']) {
      let sd = 31 + k++; Math.random = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
      G.paused = true; G.shown = true; G.t = 0; G.diff = g.DIFF.normale; G.noRegia = true;
      g.newMatch(window.CLUBS[k % 10], window.CLUBS[(k + 5) % 10]); G.auto = true;
      // sei secondi di gioco tra computer: giocatori sparsi. Poi chi gioca torna a comandare la squadra 0
      for (let i = 0; i < 360; i++) { g.step(dt); g.draw(dt); }
      G.auto = false; G.rivede = null;
      const t = G.teams[chi === 'utente' ? 0 : 1], e = { nome, chi, male: [] };
      riprese[nome](t);
      const orologio = G.clock, b = G.ball, mani = nome === 'rimessa laterale' || nome === 'rimessa dal fondo';
      let pronto = null, battuto = null, punto = null, scatto = 0, mosso = 0, n = 0;
      const passo = () => {
        g.step(dt); g.draw(dt); n++;
        if (pronto === null && G.attesa) { pronto = n * dt; punto = [b.x, b.z]; }
        // battuto: il pallone ha lasciato chi batte
        if (pronto !== null && battuto === null && !G.attesa) battuto = n * dt;
        if (battuto === null) {
          if (nome === 'calcio d\'inizio' && G.clock !== orologio && !e.orologio) { e.orologio = true; e.male.push('il cronometro va avanti prima del calcio d\'inizio'); }
          if (pronto === null && b.owner) e.male.push('qualcuno ha il pallone prima che si possa battere');
          // il pallone fermo: fino a quando parte il gesto di chi batte (che lo porta davanti al piede)
          if (punto && !mani && G.attesa && b.owner === G.attesa.chi && !G.attesa.chi.carica) mosso = Math.max(mosso, hyp(b.x - punto[0], b.z - punto[1]));
          // l'andatura: dopo il primo secondo e mezzo (chi stava correndo deve frenare), per chi non è lontanissimo dal suo posto
          if (n > 90) for (const p of tutti()) { const P = g.FERMI.passo, v = hyp(p.vx, p.vz) - Math.max(P[p.atteso ? 2 : 0], hyp(p.tx - p.x, p.tz - p.z) * P[1]); if (v > scatto) { scatto = v; e.chiCorre = p.name; } }
        }
      };
      // fino a quando si può battere (al massimo 20 secondi), poi 12 secondi senza toccare niente
      while (pronto === null && n < 20 * 60) passo();
      if (pronto === null) e.male.push('dopo 20 secondi non si può ancora battere');
      else if (entro[nome] && pronto > entro[nome]) e.male.push(`si può battere solo dopo ${pronto.toFixed(1)} s (limite ${entro[nome]})`);
      else if (chi === 'utente') {
        for (let i = 0; i < 12 * 60 && battuto === null; i++) passo();
        if (battuto !== null) e.male.push(`è partita da sola dopo ${(battuto - pronto).toFixed(1)} s`);
        else {
          const mossi = tutti().filter((p) => hyp(p.vx, p.vz) > .4); if (mossi.length) e.male.push('dopo 12 secondi si muove ancora ' + mossi.map((p) => `${p.name} (${p.i}, ${hyp(p.vx, p.vz).toFixed(1)} m/s, a ${hyp(p.tx - p.x, p.tz - p.z).toFixed(1)} m dal posto)`).join(', '));
          // il tasto: calcio basso (sul rigore vale solo il tiro)
          const tasto = nome === 'rigore' ? g.pressB : g.pressA; tasto(true); for (let i = 0; i < 6; i++) passo(); tasto(false);
          for (let i = 0; i < 3 * 60 && battuto === null; i++) passo();
          if (battuto === null) e.male.push('col tasto non parte'); else e.tasto = +(battuto - pronto - 12).toFixed(2);
        }
      } else {
        for (let i = 0; i < 8 * 60 && battuto === null; i++) passo();
        if (battuto === null) e.male.push('il computer non batte entro 8 secondi');
        else { e.attesa = +(battuto - pronto).toFixed(2); if (e.attesa < g.FERMI.cpu - .02) e.male.push(`il computer batte dopo ${e.attesa} s, prima dell'attesa`); }
      }
      if (mosso > .35) e.male.push(`il pallone si è spostato di ${mosso.toFixed(2)} m prima di essere battuto`);
      if (scatto > 1) e.male.push(`${e.chiCorre} va ${scatto.toFixed(1)} m/s più svelto dell'andatura da palla ferma`);
      e.pronto = pronto === null ? null : +pronto.toFixed(1); e.mosso = +mosso.toFixed(2); e.scatto = +scatto.toFixed(1);
      out.push(e);
    }
    return out;
  });
  let male = 0;
  for (const e of esiti) {
    if (e.male.length) male++;
    const quando = e.chi === 'utente' ? `col tasto parte in ${e.tasto ?? '—'} s` : `batte dopo ${e.attesa ?? '—'} s di attesa`;
    console.log(`${e.male.length ? '✗' : '✓'} ${e.nome}, batte ${e.chi === 'utente' ? 'chi gioca' : 'il computer'}: pronta dopo ${e.pronto ?? '—'} s, ${quando}; pallone spostato ${e.mosso} m, andatura oltre il limite ${e.scatto} m/s${e.male.length ? ' → ' + e.male.join('; ') : ''}`);
  }
  if (errori.length) console.log('Errori nella pagina:', [...new Set(errori)].slice(0, 5));
  await br.close(); srv.close();
  process.exitCode = male || errori.length ? 1 : 0;
});
