/* Fotografa tutte le schermate di menu e home (più pausa, sostituzioni e fine partita) alle tre misure di iPhone in
   orizzontale: 667 × 375, 844 × 390 e 932 × 430. Il giro è ripetibile (numeri casuali e data fissi, animazioni ferme,
   campo 3D nascosto): due giri sullo stesso codice danno le stesse foto, quindi si può confrontare prima e dopo una
   modifica. Accanto alle foto salva il contenuto di ogni schermata (misura-testi.json).
   Nelle schermate rifatte (barra in alto, Home, Carriera e finestre, per ora) controlla anche le regole di qualità: testo
   mai sotto 12 px, niente testo tagliato, niente fuori dallo schermo, pulsanti alti e larghi almeno 44 px. Esce con errore
   se una regola non è rispettata o se la pagina dà errori.
   Uso: npm run build && node scripts/prove/schermate.cjs cartella-di-uscita   (serve Playwright, come partita.cjs)
     SCALA=2   foto a doppia definizione, da guardare (per il confronto pixel per pixel si lascia 1) */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', '..', 'public'), OUT = process.argv[2] || 'foto-schermate', SCALA = +process.env.SCALA || 1;
fs.mkdirSync(OUT, { recursive: true });
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.css': 'text/css' };
const srv = http.createServer((q, r) => { const u = q.url.split('?')[0], f = path.join(root, u === '/' ? 'index.html' : decodeURIComponent(u)); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' }); r.end(d); } }); });
const MISURE = [[667, 375], [844, 390], [932, 430]];
// le parti della pagina già rifatte secondo le regole di qualità: qui si controlla ogni elemento
const RIFATTE = ['#barraF', '#casa', '#carriera', '#finestra'];

// Gira nella pagina: elenca le regole di qualità non rispettate dentro le parti rifatte che si vedono
function qualita(radici) {
  const guai = [], W = innerWidth, H = innerHeight, vista = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
  const dice = (e) => (e.id ? '#' + e.id : e.className && typeof e.className === 'string' ? '.' + e.className.split(' ').join('.') : e.tagName.toLowerCase()) + ' «' + (e.textContent || '').trim().slice(0, 24) + '»';
  for (const sel of radici) {
    const radice = document.querySelector(sel); if (!radice || radice.classList.contains('nas')) continue;
    for (const e of [radice, ...radice.querySelectorAll('*')]) {
      if (!vista(e) || e.closest('svg')) continue;
      const r = e.getBoundingClientRect(), st = getComputedStyle(e);
      if (r.right > W + .5 || r.bottom > H + .5 || r.left < -.5 || r.top < -.5) guai.push(`fuori dallo schermo: ${dice(e)}`);
      const testo = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (testo && parseFloat(st.fontSize) < 12) guai.push(`testo da ${st.fontSize}: ${dice(e)}`);
      // un testo su una riga è tagliato se è più largo del suo posto; uno su più righe se è più alto. E non deve uscire dal genitore
      const unaRiga = st.whiteSpace === 'nowrap', gen = e.parentElement.getBoundingClientRect();
      if (testo && st.overflow !== 'visible' && (unaRiga ? e.scrollWidth > e.clientWidth + 1 : e.scrollHeight > e.clientHeight + 2)) guai.push(`testo tagliato: ${dice(e)}`);
      if (testo && st.position !== 'absolute' && (r.right > gen.right + 1.5 || r.left < gen.left - 1.5)) guai.push(`testo che esce dal suo posto: ${dice(e)}`);
      // dentro una carta ogni testo sta nella sua parte (fascia, corpo o fascia in basso): non la supera e non tocca le altre
      const parte = e.closest('.carta .fascia, .carta .corpo, .carta .piede');
      if (testo && parte && parte !== e && st.position !== 'absolute') { const q = parte.getBoundingClientRect(); if (r.right > q.right + 1 || r.left < q.left - 1 || r.bottom > q.bottom + 1.5 || r.top < q.top - 1.5) guai.push(`testo fuori dalla sua parte della carta: ${dice(e)}`); }
      if (testo && /…|\.\.\.$/.test(e.textContent.trim())) guai.push(`puntini: ${dice(e)}`);
      if (e.tagName === 'BUTTON' && (r.width < 43.5 || r.height < 43.5)) guai.push(`pulsante da ${Math.round(r.width)} × ${Math.round(r.height)}: ${dice(e)}`);
    }
    // nessuna carta sopra un'altra
    const carte = [...radice.querySelectorAll('.carta')].filter(vista).map((c) => c.getBoundingClientRect());
    carte.forEach((a, i) => carte.slice(i + 1).forEach((b) => { if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) guai.push('due carte sovrapposte'); }));
  }
  return guai;
}

srv.listen(0, async () => {
  const br = await chromium.launch(); const errori = [], regole = [];
  for (const [w, h] of MISURE) {
    const cx = await br.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: SCALA }), pg = await cx.newPage();
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
    const dove = () => pg.evaluate(() => { const s = [...document.querySelectorAll('.scr')].find((e) => !e.classList.contains('nas')); return s ? s.id : 'nessuna'; });
    const foto = async (nome) => {
      await pg.waitForTimeout(350); const f = `${String(++n).padStart(2, '0')}-${nome}`; await pg.screenshot({ path: path.join(OUT, `${w}-${f}.png`) });
      testi[f] = await pg.evaluate(() => { const pulisci = (t) => t.replace(/src="data:[^"]+"/g, 'src="data"').replace(/url\(&quot;data:[^)]*\)/g, 'url(data)'), s = [...document.querySelectorAll('.scr')].find((e) => !e.classList.contains('nas')), b = document.querySelector('#barraF'); return (s ? s.id + '|' + pulisci(s.innerHTML) : 'nessuna') + (b && !b.classList.contains('nas') ? '|barra|' + pulisci(b.innerHTML) : ''); });
      for (const g of await pg.evaluate(qualita, RIFATTE)) regole.push(`${w} ${f}: ${g}`);
    };
    let tocchi = 0;
    const tocca = async (sel, i = 0) => { const el = (await pg.$$(sel))[i]; if (!el || !(await el.isVisible())) { errori.push(`${w}: manca ${sel}[${i}] (dopo ${n})`); return false; } await el.evaluate((e, k) => { window.__seme(k); e.click(); }, ++tocchi); return true; };
    // apre una schermata, la fotografa e torna indietro con la freccia della barra: deve riportare dove si era
    const vai = async (apri, nome, extra) => { const prima = await dove(); if (!(await tocca(apri))) return; await foto(nome); if (extra) await extra(); await tocca('#bCasa'); const dopo = await dove(); if (dopo !== prima) errori.push(`${w}: da ${nome} Indietro porta a «${dopo}» invece che a «${prima}»`); };

    // senza carriera: benvenuto, amichevole libera, creazione del club, capitano
    await foto('benvenuto');
    await tocca('#vai'); await foto('scelta'); await tocca('.sq', 0); await tocca('.sq', 5); await foto('scelta-pronta'); await tocca('#inizio'); await foto('sfida-libera'); await tocca('#preInd'); await tocca('#indietro');
    await tocca('#carr'); await foto('club'); await tocca('#nvDado'); await tocca('#nvCol button', 2); await tocca('#nvStile button', 3); await foto('club-scelto');
    await tocca('#nvAvanti'); await foto('capitano'); await tocca('.cap', 6); await foto('capitano-scelto'); await tocca('#nvAvanti'); await pg.waitForTimeout(1200);
    // la Home e le sezioni che apre
    await foto('home');
    await tocca('#casa .c-scenario');
    await vai('#casa .c-percorso', 'percorso'); await vai('#casa .c-amichevole', 'amichevole');
    await vai('#casa .c-sfide', 'sfide-d', async () => { for (const t of ['w', 'c', 's']) { await tocca(`[data-stab="${t}"]`); await foto(`sfide-${t}`); } });
    await vai('#casa .c-squadra', 'squadra', async () => { await tocca('#campoA [data-x]', 1); await foto('squadra-tocco'); });
    await vai('#casa .c-mercato', 'mercato', async () => { if (await tocca('#panC [data-p]', 0)) await foto('mercato-scelto'); });
    await vai('#casa .c-club', 'club', async () => { const tab = await pg.$$eval('#panC [data-ctab]', (l) => l.map((b) => b.dataset.ctab)); for (const t of tab) { await tocca(`#panC [data-ctab="${t}"]`); await foto(`club-${t}`); } });
    // dalla barra
    await vai('#barraF [data-vai="impostazioni"]', 'impostazioni'); await vai('#barraF [data-vai="info"]', 'info'); await vai('#barraF [data-vai="profilo"]', 'profilo');
    await vai('#barraF [data-vai="sfide"]', 'settimana'); await vai('#barraF [data-vai="percorso"]', 'percorso-dalla-barra');
    await vai('#barraF [data-vai="guadagna"]', 'guadagna', async () => {
      // dal «come guadagnare» al negozio: un livello in più, e Indietro torna al «come guadagnare»
      if (!(await tocca('#panC [data-ntab]'))) return; await foto('negozio');
      const tab = await pg.$$eval('#panC [data-ntab]', (l) => l.map((b) => b.dataset.ntab)); for (const t of tab) { await tocca(`#panC [data-ntab="${t}"]`); await foto(`negozio-${t}`); }
      await tocca('#panC .ogg.chiuso', 0); await foto('negozio-armato'); await tocca('#bCasa');
    });
    // la Carriera e le sue schermate
    await tocca('#casa .c-carriera'); await foto('carriera');
    await vai('#carriera .k-classifica', 'classifica'); await vai('#carriera .k-castelli', 'castelli'); await vai('#carriera .k-titano', 'coppa'); await vai('#carriera .k-prossima', 'sfida-campionato');
    for (const r of ['sfide', 'squadra', 'mercato', 'club']) await vai(`#carriera .scorc[data-vai="${r}"]`, `scorciatoia-${r}`);
    // dal profilo a «Personalizza»: due livelli sotto la Carriera
    await tocca('#barraF [data-vai="profilo"]'); await vai('#panC [data-club="personalizza"]', 'personalizza'); await tocca('#bCasa');
    // partita: si entra dal campionato, si gioca a passi fissi, poi pausa, sostituzioni e fine; «Continua» torna alla Carriera
    await tocca('#carriera .k-prossima'); await tocca('#gioca'); await pg.waitForTimeout(400); await foto('vs'); await pg.evaluate(() => window.__seme(500)); await pg.waitForTimeout(1900);
    const stato = await pg.evaluate(() => { const g = window.__g; window.__seme(501); for (let i = 0; i < 900; i++) g.step(1 / 60); g.pause(true); return [g.G.state, g.G.teams[0].score, g.G.teams[1].score]; });
    await foto('pausa'); if (await tocca('#apriCambi')) { await foto('cambi'); await tocca('#cambiL [data-o]', 3); await foto('cambi-tocco'); await tocca('#cambiOk'); }
    const fine = await pg.evaluate(() => { const g = window.__g; window.__seme(502); g.pause(false); let i = 0; for (; i < 40000 && g.G.state !== 'full'; i++) g.step(1 / 30); for (let k = 0; k < 400; k++) g.step(1 / 30); return [g.G.state, i, g.G.teams[0].score, g.G.teams[1].score, !document.querySelector('#fine').classList.contains('nas')]; });
    await foto('fine'); if (await tocca('#continua')) await foto('carriera-dopo-la-partita');
    if (await dove() !== 'carriera') errori.push(`${w}: dopo la partita si è in «${await dove()}» invece che nella Carriera`);
    // fine del campionato: le altre giornate giocate a tavolino, poi la carta diventa «Nuova stagione» con la finestra di conferma
    await pg.evaluate(() => { const g = window.__g, K = g.carriera(); window.__seme(600); while (g.CAR.prossima(K)) g.CAR.giocaCampionato(K, window.CLUBS, 1, 1, []); g.salvaK(); });
    await tocca('#carriera .scorc[data-vai="sfide"]'); await tocca('#bCasa'); await foto('carriera-fine-campionato');
    await tocca('#carriera .k-prossima'); await foto('finestra-nuova-stagione');
    if (!(await pg.evaluate(() => !document.querySelector('#finestra').classList.contains('nas')))) errori.push(`${w}: la finestra della stagione nuova non si apre`);
    await tocca('#finNo'); await tocca('#carriera .k-prossima'); await tocca('#finSi'); await foto('carriera-stagione-2');
    if ((await pg.evaluate(() => window.__g.carriera().stagione)) !== 2) errori.push(`${w}: la stagione nuova non è cominciata`);
    await tocca('#bCasa'); await foto('home-stagione-2');
    // prova coi casi scomodi: nomi lunghi e saldi grandi non devono tagliare né spingere niente fuori
    await pg.evaluate(() => { const g = window.__g, K = g.carriera(); K.nome = 'Massimiliano Bianchi'.slice(0, 18); K.mio.nome = 'Sporting Serravalle U'; K.mio.sigla = 'SSE'; K.monete = 1234567; K.gemme = 98765; g.applicaMio(); g.salvaK(); });
    await tocca('#casa .c-sfide'); await tocca('#bCasa'); await foto('home-nomi-lunghi');
    await tocca('#casa .c-carriera'); await foto('carriera-nomi-lunghi'); await tocca('#bCasa');
    fs.writeFileSync(path.join(OUT, `${w}-testi.json`), JSON.stringify(testi, null, 1));
    console.log(`${w}×${h}: ${n} foto; partita ${JSON.stringify(stato)} → ${JSON.stringify(fine)}`);
    await cx.close();
  }
  console.log(errori.length ? `ERRORI (${errori.length}):\n` + [...new Set(errori)].join('\n') : 'nessun errore');
  console.log(regole.length ? `REGOLE DI QUALITÀ NON RISPETTATE (${regole.length}):\n` + [...new Set(regole)].join('\n') : 'regole di qualità rispettate nelle parti rifatte');
  await br.close(); srv.close(); process.exitCode = errori.length || regole.length ? 1 : 0;
});
