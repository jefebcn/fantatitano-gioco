/* Fotografa tutte le schermate di menu e home (più pausa, sostituzioni e fine partita) alle tre misure di iPhone in
   orizzontale: 667 × 375, 844 × 390 e 932 × 430. Il giro è ripetibile (numeri casuali e data fissi, animazioni ferme,
   campo 3D nascosto): due giri sullo stesso codice danno le stesse foto, quindi si può confrontare prima e dopo una
   modifica. Accanto alle foto salva il contenuto di ogni schermata (misura-testi.json).
   Uso: npm run build && node scripts/prove/schermate.cjs cartella-di-uscita   (serve Playwright, come partita.cjs) */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', '..', 'public'), OUT = process.argv[2] || 'foto-schermate';
fs.mkdirSync(OUT, { recursive: true });
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.css': 'text/css' };
const srv = http.createServer((q, r) => { const u = q.url.split('?')[0], f = path.join(root, u === '/' ? 'index.html' : decodeURIComponent(u)); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' }); r.end(d); } }); });
const MISURE = [[667, 375], [844, 390], [932, 430]];
srv.listen(0, async () => {
  const br = await chromium.launch(); const errori = [];
  for (const [w, h] of MISURE) {
    const cx = await br.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 }), pg = await cx.newPage();
    pg.on('pageerror', (e) => errori.push(`${w}: ${e.message}`)); pg.on('console', (m) => { if (m.type() === 'error') errori.push(`${w}: console ${m.text().slice(0, 200)}`); });
    await pg.addInitScript(() => {
      let sd = 12345; Math.random = () => (sd = (sd * 16807) % 2147483647) / 2147483647; window.__seme = (k) => { sd = 1000 + k * 7919; };
      // sabato 21 novembre 2026
      const D = Date, t0 = 1795262400000;
      window.Date = class extends D { constructor(...a) { if (a.length) super(...a); else super(t0); } static now() { return t0; } };
      window.requestAnimationFrame = () => 0;
    });
    await pg.goto(`http://localhost:${srv.address().port}/`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await pg.waitForFunction(() => window.__g && !document.querySelector('#carica'), null, { timeout: 90000 });
    await pg.addStyleTag({ content: 'canvas#c{visibility:hidden}*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}#avviso{display:none!important}' });
    let n = 0; const testi = {};
    const foto = async (nome) => { await pg.waitForTimeout(350); const f = `${String(++n).padStart(2, '0')}-${nome}`; await pg.screenshot({ path: path.join(OUT, `${w}-${f}.png`) }); testi[f] = await pg.evaluate(() => { const s = [...document.querySelectorAll('.scr')].find((e) => !e.classList.contains('nas')); return s ? s.id + '|' + s.innerHTML.replace(/src="data:[^"]+"/g, 'src="data"').replace(/url\(&quot;data:[^)]*\)/g, 'url(data)') : 'nessuna'; }); };
    let tocchi = 0;
    const tocca = async (sel, i = 0) => { const el = (await pg.$$(sel))[i]; if (!el || !(await el.isVisible())) { errori.push(`${w}: manca ${sel}[${i}] (dopo ${n})`); return false; } await el.evaluate((e, k) => { window.__seme(k); e.click(); }, ++tocchi); return true; };
    const pan = async (apri, nome) => { if (await tocca(apri)) { await foto(nome); await tocca('#panInd'); } };
    await foto('menu');
    await tocca('#vai'); await foto('scelta'); await tocca('.sq', 0); await tocca('.sq', 5); await foto('scelta-pronta'); await tocca('#inizio'); await foto('pre-amichevole'); await tocca('#preInd'); await tocca('#indietro');
    await tocca('#carr'); await foto('club'); await tocca('#nvDado'); await tocca('#nvCol button', 2); await tocca('#nvStile button', 3); await foto('club-scelto');
    await tocca('#nvAvanti'); await foto('capitano'); await tocca('.cap', 6); await foto('capitano-scelto'); await tocca('#nvAvanti'); await pg.waitForTimeout(1200); await foto('hub');
    await tocca('#cCamp'); await foto('pre-campionato'); await tocca('#preInd');
    await pan('#cClass', 'classifica'); await pan('#cCast', 'castelli'); await pan('#cCoppa', 'coppa');
    if (await tocca('#tSfide')) { await foto('sfide-d'); for (const t of ['w', 'c', 's']) { await tocca(`[data-stab="${t}"]`); await foto(`sfide-${t}`); } await tocca('#panInd'); }
    await tocca('#tRosa'); await foto('rosa'); await tocca('#campoA [data-x]', 1); await foto('rosa-tocco'); await tocca('#preInd');
    if (await tocca('#tMerc')) { await foto('mercato'); if (await tocca('#panC [data-p]', 0)) { await foto('mercato-scelto'); } await tocca('#panInd'); }
    for (const k of ['stadio', 'allenatore', 'finanze']) await pan(`#tClub [data-club="${k}"]`, `club-${k}`);
    if (await tocca('#tClub [data-club="stadio"]')) { const tab = await pg.$$eval('#panC [data-ctab]', (l) => l.map((b) => b.dataset.ctab)); for (const t of tab) { await tocca(`#panC [data-ctab="${t}"]`); await foto(`clubtab-${t}`); } await tocca('#panInd'); }
    if (await tocca('#tClub [data-club="personalizza"]')) { await foto('personalizza'); await tocca('#nvInd'); await foto('personalizza-indietro'); await tocca('#panInd'); }
    await pan('#hImp', 'impostazioni'); await pan('#hInfo', 'info'); await pan('#hProf', 'profilo'); await pan('#hSett', 'settimana'); await pan('#hPremi', 'percorso'); await pan('#hCamp', 'notifiche'); await pan('#hGem', 'guadagna');
    // negozio: ci si arriva da «come guadagnare» o dal profilo
    await tocca('#hGem'); if (await tocca('#panC [data-ntab]')) { await foto('negozio'); const tab = await pg.$$eval('#panC [data-ntab]', (l) => l.map((b) => b.dataset.ntab)); for (const t of tab) { await tocca(`#panC [data-ntab="${t}"]`); await foto(`negozio-${t}`); } await tocca('#panC .ogg.chiuso', 0); await foto('negozio-armato'); } await tocca('#panInd');
    await tocca('#hHome'); await foto('menu-con-carriera'); await tocca('#carr'); await foto('hub-di-nuovo');
    // partita: si entra dal campionato, si gioca a passi fissi, poi pausa, sostituzioni e fine
    await tocca('#cCamp'); await tocca('#gioca'); await pg.waitForTimeout(400); await foto('vs'); await pg.evaluate(() => window.__seme(500)); await pg.waitForTimeout(1900);
    const stato = await pg.evaluate(() => { const g = window.__g; window.__seme(501); for (let i = 0; i < 900; i++) g.step(1 / 60); g.pause(true); return [g.G.state, g.G.teams[0].score, g.G.teams[1].score]; });
    await foto('pausa'); if (await tocca('#apriCambi')) { await foto('cambi'); await tocca('#cambiL [data-o]', 3); await foto('cambi-tocco'); await tocca('#cambiOk'); }
    const fine = await pg.evaluate(() => { const g = window.__g; window.__seme(502); g.pause(false); let i = 0; for (; i < 40000 && g.G.state !== 'full'; i++) g.step(1 / 30); for (let k = 0; k < 400; k++) g.step(1 / 30); return [g.G.state, i, g.G.teams[0].score, g.G.teams[1].score, !document.querySelector('#fine').classList.contains('nas')]; });
    await foto('fine'); if (await tocca('#continua')) await foto('dopo-la-partita');
    fs.writeFileSync(path.join(OUT, `${w}-testi.json`), JSON.stringify(testi, null, 1));
    console.log(`${w}×${h}: ${n} foto; partita ${JSON.stringify(stato)} → ${JSON.stringify(fine)}`);
    await cx.close();
  }
  console.log(errori.length ? `NOTE (${errori.length}):\n` + [...new Set(errori)].join('\n') : 'nessun errore');
  await br.close(); srv.close();
});
