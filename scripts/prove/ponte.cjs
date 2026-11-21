/* Prova del ponte tra home e partita (docs/ponte-partita.md): una partita avviata da una richiesta e giocata dal computer
   fino alla fine, poi l'esito consegnato alla funzione della home. Controlla la forma dell'esito, che i conti tornino,
   l'energia iniziale, la squadra dell'utente in trasferta e l'abbandono dalla pausa.
   Uso: npm run build && node scripts/prove/ponte.cjs */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', '..', 'public');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => {
  const u = q.url.split('?')[0], f = path.join(root, u === '/' ? 'index.html' : decodeURIComponent(u));
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' }); r.end(d); } });
});
let falliti = 0;
const vero = (cond, cosa) => { console.log(`${cond ? '✓' : '✗'} ${cosa}`); if (!cond) falliti++; };

/** Nella pagina: prepara la richiesta da due squadre del gioco. La squadra dell'utente è la seconda: gioca in trasferta. */
function richiesta() {
  const sq = (c, utente) => ({
    id: c.id, nome: c.name, sigla: c.short, stemma: c.id, utente, modulo: '4-4-2', mentalita: 0,
    maglia: { tipo: 'prima', c1: c.c1, c2: c.c2, stile: c.st || '', colletto: c.col || 'giro', raglan: !!c.rag }, scarpini: utente ? 'oro' : null, pallone: 'classico',
    capitano: c.xi[5][0],
    titolari: c.xi.map(([nome, reparto, numero, forza], i) => ({ id: `${c.id}/${nome}`, nome, numero, reparto, ruolo: { P: 'POR', D: 'DC', C: 'CC', A: 'ATT' }[reparto], forza, energia: 60 + i })),
    panchina: (c.pan || []).slice(0, 8).map(([nome, reparto, numero, forza]) => ({ id: `${c.id}/${nome}`, nome, numero, reparto, ruolo: { P: 'POR', D: 'DC', C: 'CC', A: 'ATT' }[reparto], forza, energia: 100 })),
  });
  window.__esiti = [];
  return { versione: 1, tipo: 'campionato', titolo: 'Prova del ponte', difficolta: 'normale', ora: 'notte', supplementariERigori: false, campoNuovo: 'ignorato',
    squadre: [sq(window.CLUBS[2], false), sq(window.CLUBS[5], true)], allaFine: (e) => window.__esiti.push(e) };
}

srv.listen(0, async () => {
  const { controllaEsito, controllaRichiesta, SA_FARE } = await import('../../src/ponte.js');
  const br = await chromium.launch(), pg = await br.newPage({ viewport: { width: 844, height: 390 } }), errori = [];
  pg.on('pageerror', (e) => errori.push(String(e)));
  await pg.goto(`http://localhost:${srv.address().port}/`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await pg.waitForFunction(() => window.__g && !document.querySelector('#carica'), null, { timeout: 90000 });
  await pg.addScriptTag({ content: `window.__richiesta = ${richiesta.toString()};` });

  // una richiesta sbagliata viene rifiutata senza far partire niente
  const no = await pg.evaluate(() => { const r = window.__richiesta(); r.squadre[1].titolari.pop(); r.tipo = 'scenario'; return window.__g.avviaPartita(r); });
  vero(no.ok === false && no.errori.length >= 2, `richiesta sbagliata rifiutata (${(no.errori || []).length} errori)`);
  vero(controllaRichiesta({ versione: 1 }).length > 0 && SA_FARE.energiaIniziale === true, 'i controlli di forma girano anche fuori dal browser');

  // partita intera
  await pg.evaluate(() => window.__g.prova(7)); // seme fisso: la stessa partita a ogni giro
  const si = await pg.evaluate(() => window.__g.avviaPartita(window.__richiesta()));
  vero(si.ok === true, 'richiesta giusta accettata');
  await pg.waitForFunction(() => ['kickoff', 'play'].includes(window.__g.G.state) && window.__g.G.teams.length === 2, null, { timeout: 30000 });
  const inizio = await pg.evaluate(() => { const G = window.__g.G, t = G.teams[0]; return { en: t.players.map((p) => Math.round(p.en * 100)), club: t.club.id, fuori: G.comp.fuori, forma: t.formName, cap: t.capitano, pid: t.players[3].pid, panchina: t.bench.length, scarpe: t.kit.boots }; });
  vero(inizio.club === (await pg.evaluate(() => window.CLUBS[5].id)) && inizio.fuori === true, "la squadra dell'utente è la prima del motore e gioca in trasferta");
  vero(inizio.en.every((v, i) => v === 60 + i), `energia iniziale dalla richiesta (${inizio.en.join(' ')})`);
  vero(inizio.forma === '4-4-2' && !!inizio.cap && /\//.test(inizio.pid || '') && !!inizio.scarpe, 'modulo, capitano, identità e scarpini dalla richiesta');
  const fine = await pg.evaluate(() => {
    const g = window.__g, G = g.G; G.auto = true; const disegna = g.renderer.render; g.renderer.render = () => {}; let n = 0;
    while (!G.shown && n++ < 60000) { g.step(1 / 60); g.draw(1 / 60); }
    g.renderer.render = disegna;
    return { stato: G.state, punteggio: [G.teams[0].score, G.teams[1].score], visibile: !document.querySelector('#fine').classList.contains('nas'), continua: !document.querySelector('#continua').classList.contains('nas'), rivincita: !document.querySelector('#rivincita').classList.contains('nas') };
  });
  vero(fine.stato === 'full' && fine.visibile && fine.continua && !fine.rivincita, 'a fine partita si esce solo con «Continua»');
  await pg.evaluate(() => document.querySelector('#continua').click());
  const esiti = await pg.evaluate(() => window.__esiti);
  vero(esiti.length === 1, 'allaFine chiamata una volta sola');
  const e = esiti[0] || {}, err = controllaEsito(e);
  vero(err.length === 0, `esito con la forma giusta${err.length ? ': ' + err.slice(0, 4).join(' · ') : ''}`);
  if (!err.length) {
    vero(e.finita === true && e.minuti === 90, 'partita finita, 90 minuti');
    vero(e.punteggio[1] === fine.punteggio[0] && e.punteggio[0] === fine.punteggio[1], `punteggio [casa, ospite] ${e.punteggio.join('-')} (l'utente è la seconda squadra)`);
    const miei = e.giocatori.filter((g) => g.squadra === 1), titolari = miei.filter((g) => g.minuti === 90);
    vero(e.giocatori.length >= 22 && miei.length >= 11, `una riga per ogni giocatore sceso in campo (${e.giocatori.length})`);
    // l'energia cambia giocando (scende correndo, risale un po' nell'intervallo): alla fine non è più quella della richiesta
    const partenza = Object.fromEntries((await pg.evaluate(() => window.__richiesta().squadre[1].titolari.map((g) => [g.id, g.energia]))));
    vero(titolari.length > 0 && titolari.filter((g) => g.energia !== partenza[g.id]).length >= 8, `energia finale diversa da quella di partenza (${titolari.map((g) => g.energia).join(' ')})`);
    vero(e.cambi.every((c) => e.giocatori.some((g) => g.id === c.entra) && e.giocatori.some((g) => g.id === c.esce)), `i cambi (${e.cambi.length}) parlano di giocatori dell'esito`);
    vero(e.squadre.tiri[0] + e.squadre.tiri[1] === e.giocatori.reduce((a, g) => a + g.tiri, 0), 'i tiri delle squadre sono la somma di quelli dei giocatori');
    vero(e.squadre.possesso[0] + e.squadre.possesso[1] === 100, 'il possesso fa cento');
    vero(e.marcatori.every((m) => m.tipo === 'autogol' || e.giocatori.some((g) => g.id === m.id)), `i marcatori (${e.marcatori.map((m) => `${m.nome} ${m.minuto}' ${m.tipo}${m.assist ? ' da ' + m.assist.nome : ''}`).join(', ') || 'nessuno'}) sono nell'esito`);
    vero(e.giocatori.some((g) => g.id === e.migliore), 'il migliore in campo è un giocatore dell\'esito');
  }
  vero(await pg.evaluate(() => window.__g.G.state === 'menu' && !window.__g.G.ponte), 'dopo la consegna si è fuori dalla partita');

  // abbandono dalla pausa
  await pg.evaluate(() => { window.__g.avviaPartita(window.__richiesta()); });
  await pg.waitForFunction(() => ['kickoff', 'play'].includes(window.__g.G.state) && window.__g.G.teams.length === 2, null, { timeout: 30000 });
  await pg.evaluate(() => { const g = window.__g; g.G.auto = true; for (let i = 0; i < 1500; i++) g.step(1 / 60); document.querySelector('#esci').click(); });
  const ab = (await pg.evaluate(() => window.__esiti))[0] || {}, errAb = controllaEsito(ab);
  vero(errAb.length === 0 && ab.finita === false && ab.minuti < 90, `abbandono: esito con finita falso al minuto ${ab.minuti}${errAb.length ? ' · ' + errAb.slice(0, 3).join(' · ') : ''}`);
  vero(errori.length === 0, `nessun errore nella pagina${errori.length ? ': ' + errori.slice(0, 3).join(' · ') : ''}`);
  await br.close(); srv.close();
  console.log(falliti ? `\nPonte: ${falliti} controlli falliti` : '\nPonte: tutte le prove passate');
  process.exit(falliti ? 1 : 0);
});
