/* Controllo dell'inquadratura al calcio d'inizio su un telefono in orizzontale (844 × 390): misura sullo schermo cerchio di
   centrocampo, dischetto, linea laterale lontana, altezza di un giocatore e del pallone, e le confronta con le misure di
   riferimento date da Alex (margine ±2 punti percentuali). Le misure si prendono due volte: proiettando i punti del campo
   con la telecamera del gioco e cercando le linee bianche nei pixel della foto.
   Uso: npm run build && node scripts/prove/inquadratura.cjs [foto.png]   (serve Playwright, come partita.cjs) */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', '..', 'public'), FOTO = process.argv[2] || '';
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2' };
const srv = http.createServer((q, r) => { const u = q.url.split('?')[0], f = path.join(root, u === '/' ? 'index.html' : decodeURIComponent(u)); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' }); r.end(d); } }); });
// riferimento: [valore in percento, descrizione]
const RIF = { cerchioL: [43, 'larghezza del cerchio di centrocampo (% larghezza)'], lontano: [29, 'bordo lontano del cerchio (% altezza dall\'alto)'], dischetto: [40, 'dischetto di centrocampo'], vicino: [60, 'bordo vicino del cerchio'], laterale: [10, 'linea laterale lontana'], giocatore: [9, 'altezza del giocatore sul dischetto'], pallone: [1, 'altezza del pallone'] };
srv.listen(0, async () => {
  const br = await chromium.launch(), pg = await br.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
  await pg.goto(`http://localhost:${srv.address().port}/`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await pg.waitForFunction(() => window.__g && !document.querySelector('#carica'), null, { timeout: 90000 });
  const m = await pg.evaluate(() => {
    window.requestAnimationFrame = () => 0; const g = window.__g, G = g.G; let sd = 5; Math.random = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    G.paused = true; G.shown = true; g.newMatch(window.CLUBS[0], window.CLUBS[7]); G.auto = true;
    // il calcio d'inizio: la telecamera va subito al suo posto, i giocatori in posa
    g.draw(9); g.draw(1 / 60); g.draw(1 / 60);
    const cam = g.cam, V = cam.position.constructor, pr = (x, y, z) => { const v = new V(x, y, z).project(cam); return [(v.x + 1) / 2 * 100, (1 - v.y) / 2 * 100]; };
    const C = g.CFG, R = C.LINEE.cerchio, b = G.ball;
    // il giocatore più vicino al dischetto: dai piedi alla cima della testa (l'osso della testa più mezza testa)
    const tutti = G.teams[0].players.concat(G.teams[1].players); let p = tutti[0]; for (const q of tutti) if (Math.hypot(q.x, q.z) < Math.hypot(p.x, p.z)) p = q;
    const testa = p.fig.bones.Head.getWorldPosition(new V()), alto = g.altezza(p);
    document.querySelectorAll('body > *:not(canvas)').forEach((e) => { e.style.display = 'none'; });
    g.renderer.render(g.scene, cam);
    // la larghezza del cerchio come si vede sullo schermo: il punto più a sinistra e quello più a destra di tutta la linea
    let x0 = 999, x1 = -999; for (let a = 0; a < 360; a++) { const [x] = pr(R * Math.cos(a * Math.PI / 180), 0, R * Math.sin(a * Math.PI / 180)); x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
    return { cerchioL: x1 - x0, lontano: pr(0, 0, -R)[1], dischetto: pr(0, 0, 0)[1], vicino: pr(0, 0, R)[1], laterale: pr(0, 0, -C.HW)[1],
      giocatore: pr(p.x, 0, p.z)[1] - pr(p.x, alto, p.z)[1], pallone: pr(b.x, 0, b.z)[1] - pr(b.x, C.BR * 2, b.z)[1],
      info: { giocatore: p.name, alto: +alto.toFixed(2), testaOsso: +testa.y.toFixed(2), pallaDiametro: C.BR * 2, cam: [cam.position.x, cam.position.y, cam.position.z].map((x) => +x.toFixed(2)), fov: +cam.fov.toFixed(2), aspetto: +cam.aspect.toFixed(3), stato: G.state } };
  });
  if (FOTO) await pg.screenshot({ path: FOTO });
  let male = 0;
  for (const [k, [rif, nome]] of Object.entries(RIF)) { const ok = Math.abs(m[k] - rif) <= 2; if (!ok) male++; console.log(`${ok ? '✓' : '✗'} ${nome.padEnd(52)} ${m[k].toFixed(1).padStart(5)} %   riferimento ${rif} %`); }
  console.log(JSON.stringify(m.info));
  await br.close(); srv.close(); process.exitCode = male ? 1 : 0;
});
