/* Prova della musica della home (src/audio.js) in un browser vero: non parte prima del primo tocco, usa l'OGG, entra in
   dissolvenza, continua tra le schermate, muto e volumi delle Impostazioni si sentono e restano salvati, a fine brano il
   cambio è in dissolvenza, sfuma quando parte la partita e riprende da dov'era tornando alla home, si ferma col gioco
   in secondo piano, e dove l'OGG non si legge usa l'MP3.
   Uso: npm run build && node scripts/prove/musica.cjs */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', '..', 'public');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.css': 'text/css', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg' };
const chieste = [];
// come un sito vero: risponde anche a pezzi, che è come i lettori chiedono la musica
const srv = http.createServer((q, r) => {
  const u = q.url.split('?')[0], f = path.join(root, u === '/' ? 'index.html' : decodeURIComponent(u));
  if (u.includes('/audio/')) chieste.push(u);
  fs.stat(f, (e, st) => {
    if (e) { r.writeHead(404); return r.end(); }
    const tipo = mime[path.extname(f)] || 'application/octet-stream', m = /bytes=(\d*)-(\d*)/.exec(q.headers.range || '');
    if (!m) { r.writeHead(200, { 'Content-Type': tipo, 'Content-Length': st.size, 'Accept-Ranges': 'bytes' }); return fs.createReadStream(f).pipe(r); }
    const da = m[1] ? +m[1] : 0, a = m[2] ? Math.min(+m[2], st.size - 1) : st.size - 1;
    r.writeHead(206, { 'Content-Type': tipo, 'Content-Length': a - da + 1, 'Content-Range': `bytes ${da}-${a}/${st.size}`, 'Accept-Ranges': 'bytes' }); fs.createReadStream(f, { start: da, end: a }).pipe(r);
  });
});
const guai = [];
const vero = (cosa, ok, dati) => { console.log((ok ? '  ok  ' : '  NO  ') + cosa + (dati !== undefined ? '  ' + JSON.stringify(dati) : '')); if (!ok) guai.push(cosa); };
// lo stato della musica, letto nella pagina
const stato = (pg) => pg.evaluate(() => {
  const A = window.__g.AU, L = A.lettori;
  return { ctx: A.ctx ? A.ctx.state : 'nessuno', vuole: !!A.voglioMusica, on: A.on, suona: A.suona, attivo: A.attivo, sfuma: A.fadeM ? +A.fadeM.gain.value.toFixed(2) : null, bus: A.busM ? +A.busM.gain.value.toFixed(2) : null,
    lettori: L ? L.map((l) => ({ file: l.el.currentSrc.split('/').pop().slice(0, 28), fermo: l.el.paused, t: +l.el.currentTime.toFixed(1), vol: +l.g.value.toFixed(2), dura: +(l.el.duration || 0).toFixed(1) })) : null };
});
async function apri(br, prima) {
  const cx = await br.newContext({ viewport: { width: 844, height: 390 } }), pg = await cx.newPage();
  pg.on('pageerror', (e) => guai.push('errore nella pagina: ' + e.message));
  // il 3D fermo: in questa prova non serve, e nel browser senza scheda grafica rallenta tutto il resto
  await pg.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  if (prima) await pg.addInitScript(prima);
  await pg.goto(`http://localhost:${srv.address().port}/`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await pg.waitForFunction(() => window.__g && !document.querySelector('#carica'), null, { timeout: 90000 });
  return pg;
}
srv.listen(0, async () => {
  const br = await chromium.launch();
  let pg = await apri(br);
  const tocca = async (sel, i = 0) => { const el = (await pg.$$(sel))[i]; if (!el) { guai.push('manca ' + sel); return; } await el.evaluate((e) => e.click()); };
  const tra = (ms) => pg.waitForTimeout(ms);

  console.log('1. Prima di ogni tocco');
  await tra(1500); let s = await stato(pg);
  vero('nessun contesto audio, nessun lettore, nessun file chiesto', s.ctx === 'nessuno' && !s.lettori && !chieste.length, { ctx: s.ctx, chieste });
  vero('la home vuole la musica (partirà al primo tocco)', s.vuole);

  console.log('2. Primo tocco vero sullo schermo');
  await pg.mouse.click(420, 60); await tra(2500); s = await stato(pg);
  vero('contesto audio acceso e musica che suona', s.ctx === 'running' && s.suona && s.lettori && !s.lettori[0].fermo && s.lettori[0].t > 1, s);
  vero('usa il file OGG', s.lettori[0].file === 'musica-home-rise-up.ogg' && chieste.every((u) => u.endsWith('.ogg')), [...new Set(chieste)]);
  vero('è entrata in dissolvenza fino al volume pieno', s.sfuma > .9 && s.lettori[0].vol === 1 && s.lettori[1].vol === 0, { sfuma: s.sfuma });
  vero('dura 3 minuti e 31', Math.abs(s.lettori[0].dura - 211.2) < .5, s.lettori[0].dura);

  console.log('3. Dentro la home (carriera nuova, Squadra, Impostazioni)');
  await tocca('#carr'); await tocca('#nvDado'); await tocca('#nvAvanti'); await tra(600); await tocca('.cap', 5); await tocca('#nvAvanti'); await tra(1200);
  await tocca('#casa .c-squadra'); await tra(500); await tocca('#bCasa'); const t1 = (await stato(pg)).lettori[0].t; await tra(1000); s = await stato(pg);
  vero('la musica continua tra le schermate senza ricominciare', s.suona && s.lettori[0].t > t1 && s.lettori[0].t > 4, { prima: t1, dopo: s.lettori[0].t });

  console.log('4. Muto e volumi nelle Impostazioni');
  await tocca('#barraF [data-vai="impostazioni"]'); await tra(200);
  const testo = () => pg.evaluate(() => document.querySelector('#panC [data-az="audio"]').textContent + ' | ' + [...document.querySelectorAll('#panC input[data-vol]')].map((i) => i.dataset.vol + '=' + i.value).join(' '));
  vero('ci sono il tasto muto e i due cursori', (await testo()) === 'Muto: no | musica=60 effetti=90', await testo());
  await tocca('#panC [data-az="audio"]'); await tra(1700); s = await stato(pg); const tMuto = s.lettori[0].t;
  vero('muto: audio spento e lettore fermo', !s.on && !s.suona && s.lettori[0].fermo && (await testo()).startsWith('Muto: sì'), { on: s.on, fermo: s.lettori[0].fermo, testo: await testo() });
  await tocca('#panC [data-az="audio"]'); await tra(1200); s = await stato(pg);
  vero('tolto il muto: riprende da dov\'era', s.on && s.suona && !s.lettori[0].fermo && s.lettori[0].t >= tMuto && s.lettori[0].t < tMuto + 3, { fermata: tMuto, ora: s.lettori[0].t });
  await pg.evaluate(() => { const r = document.querySelector('#panC input[data-vol="musica"]'); r.value = 0; r.dispatchEvent(new Event('input', { bubbles: true })); }); await tra(1700); s = await stato(pg);
  vero('volume della musica a zero: lettore fermo', !s.suona && s.lettori[0].fermo && s.bus === 0, { bus: s.bus });
  await pg.evaluate(() => { const r = document.querySelector('#panC input[data-vol="musica"]'); r.value = 40; r.dispatchEvent(new Event('input', { bubbles: true })); }); await tra(1200); s = await stato(pg);
  vero('volume della musica a 40: suona, al livello giusto', s.suona && !s.lettori[0].fermo && Math.abs(s.bus - .4) < .02, { bus: s.bus });
  const salvato = await pg.evaluate(() => localStorage.getItem('fantatitano-audio'));
  vero('scelte salvate sul dispositivo', salvato === '{"on":true,"musica":0.4,"effetti":0.9}', salvato);
  await tocca('#bCasa');

  console.log('5. Fine del brano: cambio in dissolvenza');
  await pg.evaluate(() => { const A = window.__g.AU, el = A.lettori[A.attivo].el; el.currentTime = el.duration - 4.5; }); await tra(1500); s = await stato(pg);
  vero('a 3 secondi dalla fine suona ancora solo il primo lettore', s.attivo === 0 && !s.lettori[0].fermo && s.lettori[0].vol === 1, s.lettori);
  await tra(2000); s = await stato(pg);
  vero('negli ultimi 2 secondi suonano tutti e due: uno cala, l\'altro sale', s.attivo === 1 && !s.lettori[0].fermo && !s.lettori[1].fermo && s.lettori[0].vol < .9 && s.lettori[1].vol > .1 && s.lettori[1].file === 'musica-home-rise-up.ogg', s.lettori);
  await tra(3000); s = await stato(pg);
  vero('finito il cambio suona solo il secondo, dall\'inizio, a volume pieno', s.lettori[0].fermo && !s.lettori[1].fermo && s.lettori[1].t > 2 && s.lettori[1].t < 8 && s.lettori[1].vol > .97 && s.lettori[0].vol < .03, s.lettori);

  console.log('6. Parte la partita, poi si torna alla home');
  await tocca('#casa .c-carriera'); await tocca('#carriera .k-prossima'); await tocca('#sfida [data-az="gioca"]'); await tra(600); s = await stato(pg);
  vero('all\'avvio della partita la musica sta sfumando (non si taglia di colpo)', !s.vuole && s.sfuma < 1 && s.sfuma > .05 && !s.lettori[1].fermo, { sfuma: s.sfuma });
  await tra(2200); s = await stato(pg); const tPartita = s.lettori[1].t;
  vero('in partita la musica è zitta e ferma', s.sfuma < .05 && !s.suona && s.lettori[1].fermo, { sfuma: s.sfuma, t: tPartita });
  await tra(1500); await pg.evaluate(() => window.__g.toMenu()); await tra(2600); s = await stato(pg);
  vero('tornati alla home riprende in dissolvenza da dov\'era', s.vuole && s.suona && !s.lettori[1].fermo && s.sfuma > .9 && s.lettori[1].t >= tPartita && s.lettori[1].t < tPartita + 4, { fermata: tPartita, ora: s.lettori[1].t, sfuma: s.sfuma });

  console.log('7. Gioco in secondo piano');
  await pg.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); }); await tra(500); s = await stato(pg);
  vero('in secondo piano la musica si ferma', !s.suona && s.lettori[1].fermo, { ctx: s.ctx });
  await pg.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); }); await tra(1500); s = await stato(pg);
  vero('tornato in primo piano riprende', s.suona && !s.lettori[1].fermo && s.ctx === 'running', { ctx: s.ctx });
  await pg.context().close();

  console.log('8. Un browser che non legge l\'OGG');
  chieste.length = 0;
  pg = await apri(br, () => { const vera = HTMLMediaElement.prototype.canPlayType; HTMLMediaElement.prototype.canPlayType = function (t) { return /ogg/.test(t) ? '' : vera.call(this, t); }; });
  await pg.mouse.click(420, 60); await tra(2500); s = await stato(pg);
  vero('usa l\'MP3 di riserva', s.lettori && s.lettori[0].file === 'musica-home-rise-up.mp3' && chieste.length > 0 && chieste.every((u) => u.endsWith('.mp3')), { file: s.lettori && s.lettori[0].file, chieste: [...new Set(chieste)] });
  vero('e, se il browser sa leggerlo, suona', s.suona && !s.lettori[0].fermo && s.lettori[0].t > 1, s.lettori && s.lettori[0]);

  console.log(guai.length ? `\n${guai.length} COSE NON VANNO:\n - ${guai.join('\n - ')}` : '\nTutto a posto');
  await br.close(); srv.close(); process.exit(guai.length ? 1 : 0);
});
