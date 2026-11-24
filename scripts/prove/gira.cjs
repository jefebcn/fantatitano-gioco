/* Prova del telefono che si gira (src/casa/schermo.js). Su iPhone, girando il telefono, l'evento «resize» arriva quando
   le misure sono ancora quelle di prima e poi non ne arriva un altro. Qui si fa lo stesso: gli eventi «resize» non
   arrivano a nessuno, e la pagina cambia grandezza lo stesso. La Home, la barra e la Squadra devono riprendere le misure
   da sole e venire uguali a quando il gioco si apre già in orizzontale: le carte dentro il loro riquadro, la barra larga.
   I margini della tacca dell'iPhone (59 punti ai lati, 21 in basso) sono messi a mano, perché il browser di prova non li ha.
   Uso: npm run build && node scripts/prove/gira.cjs */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', '..', 'public'), W = 844, H = 390, TACCA = { lato: 59, basso: 21 };
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.css': 'text/css', '.json': 'application/json' };
const tacca = (testo) => testo.replace(/env\(safe-area-inset-(left|right)\)/g, `${TACCA.lato}px`).replace(/env\(safe-area-inset-bottom\)/g, `${TACCA.basso}px`).replace(/env\(safe-area-inset-top\)/g, '0px');
const srv = http.createServer((q, r) => {
  const u = q.url.split('?')[0], f = path.join(root, u === '/' ? 'index.html' : decodeURIComponent(u));
  fs.readFile(f, (e, d) => {
    if (e) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': mime[path.extname(f)] || 'application/octet-stream' }); r.end(/\.(html|css|js)$/.test(f) ? tacca(d.toString()) : d);
  });
});
const guai = [];
const vero = (cosa, ok, dati) => { console.log((ok ? '  ok  ' : '  NO  ') + cosa + (dati !== undefined ? '  ' + JSON.stringify(dati) : '')); if (!ok) guai.push(cosa); };

// apre il gioco e comincia una carriera, sempre la stessa (il caso è fissato); `muto` toglie gli eventi «resize»
async function apri(br, largo, alto, muto) {
  const cx = await br.newContext({ viewport: { width: largo, height: alto }, hasTouch: true, isMobile: true }), pg = await cx.newPage();
  pg.on('pageerror', (e) => guai.push('errore nella pagina: ' + e.message));
  await pg.addInitScript(() => { let sd = 12345; Math.random = () => (sd = (sd * 16807) % 2147483647) / 2147483647; });
  if (muto) await pg.addInitScript(() => { for (const nome of ['resize', 'orientationchange']) window.addEventListener(nome, (e) => e.stopImmediatePropagation(), true); });
  await pg.goto(`http://localhost:${srv.address().port}/`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await pg.waitForFunction(() => window.__g && !document.querySelector('#carica'), null, { timeout: 90000 });
  await pg.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });
  const tocca = async (sel, i = 0) => { const el = (await pg.$$(sel))[i]; if (el) await el.evaluate((e) => e.click()); else guai.push('manca ' + sel); };
  await tocca('#carr'); await tocca('#nvDado'); await tocca('#nvCol button', 2); await tocca('#nvStile button', 3); await tocca('#nvAvanti'); await tocca('.cap', 6); await tocca('#nvAvanti');
  await pg.waitForFunction(() => document.querySelectorAll('#casa .gC').length === 2, null, { timeout: 30000 });
  return { pg, tocca };
}
// gira il telefono e aspetta che la pagina abbia la grandezza nuova (la rimette la partita, al fotogramma dopo)
async function gira(pg, largo, alto) {
  await pg.setViewportSize({ width: largo, height: alto });
  await pg.waitForFunction(([w, h]) => document.body.clientWidth === w && document.body.clientHeight === h, [largo, alto], { timeout: 30000 });
  await pg.waitForTimeout(500);
}
// le misure della Home: i gradini della barra, e per ogni carta di giocatore quanto è larga e dove sta nel suo riquadro
const home = (pg) => pg.evaluate(() => ({
  barra: document.querySelector('#barraF').className.split(' ').filter((c) => /^s\d$/.test(c)).join(' '),
  carte: [...document.querySelectorAll('#casa .gC')].map((e) => {
    const r = e.querySelector('.gS').getBoundingClientRect(), q = e.closest('.carta').getBoundingClientRect();
    return { larga: e.style.getPropertyValue('--gw'), su: Math.round(r.top - q.top), giu: Math.round(q.bottom - r.bottom), sinistra: Math.round(r.left - q.left) };
  }),
}));
const cartaSquadra = (pg) => pg.evaluate(() => document.querySelector('#squadra').style.getPropertyValue('--gw'));

srv.listen(0, async () => {
  const br = await chromium.launch();
  // 1) il riferimento: il gioco aperto già in orizzontale
  const a = await apri(br, W, H, false), giusta = await home(a.pg);
  await a.tocca('#casa .c-squadra'); await a.pg.waitForTimeout(500); const giustaSq = await cartaSquadra(a.pg);
  console.log('In orizzontale dall\'inizio', JSON.stringify(giusta), 'carta della Squadra', giustaSq);
  vero('le carte della Home stanno dentro il loro riquadro', giusta.carte.every((c) => c.su >= 0 && c.giu >= 0), giusta.carte);
  await a.pg.context().close();

  // 2) aperto in verticale e poi girato, senza eventi «resize»
  const b = await apri(br, H, W, true);
  await gira(b.pg, W, H); const girata = await home(b.pg);
  vero('girando il telefono la Home viene come in orizzontale dall\'inizio', JSON.stringify(girata) === JSON.stringify(giusta), girata);
  // 3) la Squadra aperta in verticale e poi girata
  await gira(b.pg, H, W); await b.tocca('#casa .c-squadra'); await b.pg.waitForTimeout(500); const stretta = await cartaSquadra(b.pg);
  await gira(b.pg, W, H); const girataSq = await cartaSquadra(b.pg);
  vero('girando il telefono le carte della Squadra riprendono la loro larghezza', girataSq === giustaSq && stretta !== giustaSq, { inVerticale: stretta, girata: girataSq, giusta: giustaSq });
  await br.close(); srv.close();
  if (guai.length) { console.log(`\nNON PASSA (${guai.length}):\n- ` + guai.join('\n- ')); process.exit(1); }
  console.log('\nTelefono girato: tutte le prove passate');
});
