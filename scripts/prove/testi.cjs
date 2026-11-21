/* I testi della partita (src/testi.js).
   Uso:
     node scripts/prove/testi.cjs chiavi
        senza browser: ogni chiave usata nel codice e nella pagina esiste in src/testi.js, e nessuna resta inutilizzata
     npm run build && node scripts/prove/testi.cjs salva prima.txt
        gioca una partita intera sempre uguale (modalità di prova, passi fissi) e salva ogni riga di testo che compare:
        tabellone, tasti, striscioni, pausa, sostituzioni, fine partita. I numeri diventano #
     node scripts/prove/testi.cjs confronta prima.txt dopo.txt
   Quando si toccano i testi: salva prima, modifica, build, salva dopo, confronta. Serve Playwright per «salva». */
const fs = require('fs'), path = require('path');
const [cosa, f1, f2] = process.argv.slice(2), src = path.join(__dirname, '..', '..', 'src');

async function chiavi() {
  const { TESTI, LINGUE } = await import('file://' + path.join(src, 'testi.js')), usate = new Set(), note = new Set(Object.keys(TESTI.it));
  // dentro una chiamata t(...) o tr(...) tutte le stringhe fatte come una chiave (parola.parola), anche nelle scelte «a ? 'x' : 'y'»
  for (const f of ['game.js', 'regia.js']) for (const m of fs.readFileSync(path.join(src, f), 'utf8').matchAll(/\b(?:t|tr)\(((?:[^()',]|'[^']*'|\((?:[^()']|'[^']*')*\))*)/g)) for (const k of m[1].matchAll(/'([a-zA-Z]+\.[a-zA-Z0-9]+)'/g)) usate.add(k[1]);
  for (const m of fs.readFileSync(path.join(src, 'pagina.html'), 'utf8').matchAll(/\sdata-t(?:h|-aria|-placeholder|-title|-alt)?="([^"]+)"/g)) usate.add(m[1]);
  const mancano = [...usate].filter((k) => !note.has(k)), inutili = [...note].filter((k) => !usate.has(k));
  let estranee = 0; for (const l of LINGUE) for (const k of Object.keys(TESTI[l] || {})) if (!note.has(k)) { estranee++; console.log(`✗ ${l}: «${k}» non esiste in italiano`); }
  for (const k of mancano) console.log(`✗ manca in src/testi.js: ${k}`);
  for (const k of inutili) console.log(`✗ non usata: ${k}`);
  console.log(`${note.size} chiavi in italiano, ${usate.size} usate, ${mancano.length} mancanti, ${inutili.length} non usate`);
  process.exitCode = mancano.length || inutili.length || estranee ? 1 : 0;
}

/** Nella pagina: una partita intera a passi fissi, raccogliendo ogni riga di testo che compare. */
function raccogli() {
  const g = window.__g, G = g.G, visti = new Set(); let ts = 1e6;
  const prendi = () => {
    for (const l of document.body.innerText.split('\n')) { const s = l.trim().replace(/\d+/g, '#'); if (s) visti.add(s); }
    for (const e of document.querySelectorAll('[aria-label],[title],[placeholder]')) for (const a of ['aria-label', 'title', 'placeholder']) if (e.getAttribute(a)) visti.add(`${a}=${e.getAttribute(a)}`);
  };
  const avanti = (n) => { for (let i = 0; i < n; i++) { ts += 1000 / 60; window.__raf(ts); } };
  avanti(2); prendi(); g.pause(); avanti(2); prendi(); document.querySelector('#apriCambi').click(); prendi(); document.querySelector('#cambiOk').click(); g.pause();
  G.auto = true; const disegna = g.renderer.render; g.renderer.render = () => {}; let n = 0;
  while (!G.shown && n++ < 4000) { avanti(20); prendi(); }
  g.renderer.render = disegna; avanti(2); prendi();
  return [...visti].sort();
}

async function salva() {
  const { chromium } = require('playwright'), http = require('http'), root = path.join(__dirname, '..', '..', 'public');
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
  const srv = http.createServer((q, r) => { const u = q.url.split('?')[0], f = path.join(root, u === '/' ? 'index.html' : decodeURIComponent(u)); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' }); r.end(d); } }); });
  await new Promise((ok) => srv.listen(0, ok));
  const br = await chromium.launch(), pg = await br.newPage({ viewport: { width: 844, height: 390 } }), errori = [];
  pg.on('pageerror', (e) => errori.push(String(e)));
  await pg.goto(`http://localhost:${srv.address().port}/`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await pg.waitForFunction(() => window.__g && !document.querySelector('#carica'), null, { timeout: 90000 });
  // il ciclo del gioco passa in mano alla prova: avanza solo quando lo si chiama, a sessantesimi di secondo esatti
  await pg.evaluate(async () => { window.requestAnimationFrame = (f) => { window.__raf = f; return 0; }; await new Promise((ok) => setTimeout(ok, 200)); window.__g.prova(7); window.__g.startMatch(window.CLUBS[2].id, window.CLUBS[5].id, 'normale'); });
  await pg.waitForFunction(() => window.__g.G.teams.length === 2 && window.__raf, null, { timeout: 30000 });
  const righe = await pg.evaluate(raccogli);
  fs.writeFileSync(f1, righe.join('\n') + '\n'); console.log(`${righe.length} righe di testo salvate in ${f1}${errori.length ? ` · ERRORI NELLA PAGINA: ${errori.slice(0, 3).join(' · ')}` : ''}`);
  await br.close(); srv.close(); process.exitCode = errori.length ? 1 : 0;
}

if (cosa === 'chiavi') chiavi();
else if (cosa === 'salva' && f1) salva();
else if (cosa === 'confronta' && f1 && f2) {
  const a = new Set(fs.readFileSync(f1, 'utf8').split('\n')), b = new Set(fs.readFileSync(f2, 'utf8').split('\n')), via = [...a].filter((x) => !b.has(x)), nuove = [...b].filter((x) => !a.has(x));
  for (const x of via) console.log(`- ${x}`); for (const x of nuove) console.log(`+ ${x}`);
  console.log(via.length + nuove.length ? `${via.length} righe sparite, ${nuove.length} nuove` : 'Testi identici'); process.exitCode = via.length + nuove.length ? 1 : 0;
} else { console.log('Uso: node scripts/prove/testi.cjs chiavi  |  salva <file.txt>  |  confronta <prima.txt> <dopo.txt>'); process.exitCode = 2; }
