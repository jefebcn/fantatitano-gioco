/* Le divise delle due squadre si distinguono? Per ogni coppia di club (casa, ospiti) si chiedono le divise al gioco e si
   controlla che: 1) maglia contro maglia siano lontane; 2) nessuna parte della divisa degli ospiti (disegno della maglia,
   maniche, pantaloncini, calzettoni) abbia il colore della maglia di casa; 3) una maglia sia chiara e l'altra scura
   (DIVISE.chiaro). In più una squadra gialla e nera come quella del video di Alex contro tutte. Uso: npm run build && node scripts/prove/divise.cjs */
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
  const esito = await pg.evaluate(() => {
    const g = window.__g, D = g.DIVISE;
    const club = [...window.CLUBS, { id: 'prova-gn', name: 'Gialloneri', c1: '#F2C230', c2: '#16161a' }, { id: 'prova-bn', name: 'Bianconeri', c1: '#F3F3F3', c2: '#16161a' }, { id: 'prova-rb', name: 'Rossoblù', c1: '#C8102E', c2: '#1D2A5C' }];
    const vicine = [], colore = [], uguali = []; let coppie = 0;
    for (const h of club) for (const a of club) {
      if (h === a) continue; coppie++;
      const [kh, ka] = g.pickKits(h, a), d = g.kitDist(kh, ka);
      if (d < D.soglia) vicine.push(`${h.name} - ${a.name}: ${d.toFixed(2)}`);
      const dl = Math.abs(g.chiarezza(kh) - g.chiarezza(ka)); if (dl < D.chiaro - .001) uguali.push(`${h.name} (${kh.shirt}) - ${a.name} (${ka.shirt}): ${dl.toFixed(2)}`);
      const parti = { disegno: ka.stile ? ka.c2 : null, maniche: ka.sleeve, pantaloncini: ka.shorts, calzettoni: ka.socks };
      const stesso = Object.entries(parti).filter(([, c]) => c && g.cdist(c, ka.shirt) > .12 && g.cdist(c, kh.shirt) < D.simile).map(([n]) => n);
      if (stesso.length) colore.push(`${h.name} (${kh.shirt}) - ${a.name} (${ka.shirt}, ${ka.stile || 'tinta unita'}): ${stesso.join(', ')}`);
    }
    return { coppie, vicine, colore, uguali };
  });
  console.log(`${esito.coppie} coppie di squadre`);
  console.log(`${esito.vicine.length ? '✗' : '✓'} maglie troppo vicine: ${esito.vicine.length}`); for (const v of esito.vicine.slice(0, 12)) console.log('   ' + v);
  console.log(`${esito.colore.length ? '✗' : '✓'} ospiti con addosso il colore della maglia di casa: ${esito.colore.length}`); for (const v of esito.colore.slice(0, 12)) console.log('   ' + v);
  console.log(`${esito.uguali.length ? '✗' : '✓'} maglie chiare uguale (una deve essere chiara e l'altra scura): ${esito.uguali.length}`); for (const v of esito.uguali.slice(0, 12)) console.log('   ' + v);
  if (errori.length) console.log('errori nella pagina:', [...new Set(errori)].slice(0, 5));
  await br.close(); srv.close();
  process.exit(esito.vicine.length || esito.colore.length || esito.uguali.length || errori.length ? 1 : 0);
});
