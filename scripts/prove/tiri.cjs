/* Che fine fanno i tiri, uno per uno: gol, parati, ribattuti da un difensore, fuori, palo. Separa i tiri di piede dai
   colpi di testa, perché il totale dei tiri inganna (una variante può tenere il totale e perdere i tiri di piede).

   uso: node scripts/prove/tiri.cjs [partite] [difficoltà]
     RADICE=percorso  cartella public da provare (di norma quella del repo, dopo npm run build)
     SEME=7           primo seme. Stesse partite di diagnosi.cjs: stesso seme, stesse squadre. */
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const root = process.env.RADICE || path.join(__dirname, '..', '..', 'public'), N = +process.argv[2] || 8, DIFFI = process.argv[3] || 'normale', SEME = +process.env.SEME || 7;
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => {
  const u = q.url.split('?')[0], f = path.join(root, u === '/' ? 'index.html' : decodeURIComponent(u));
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' }); r.end(d); } });
});

/** Una partita intera nella pagina: ritorna l'elenco dei tiri con da dove, come e che fine hanno fatto. */
function partita([seme, diffi, casa, ospiti]) {
  const g = window.__g, G = g.G, hyp = Math.hypot, HL = g.CFG.HL, GH = g.CFG.GH;
  // stessi numeri casuali di diagnosi.cjs: una serie per la partita, una per la grafica
  const caso = (x) => () => (x = (x * 16807) % 2147483647) / 2147483647, gioco = caso(seme), grafica = caso(seme + 7919);
  Math.random = caso(seme + 104729); G.paused = true; G.shown = true; G.t = 0; G.diff = g.DIFF[diffi];
  g.newMatch(window.CLUBS[casa], window.CLUBS[ospiti]); G.auto = true; Math.random = gioco; g.renderer.render = () => {};
  const tiri = []; let sid = G.shotId, cur = null, n = 0;
  const parate = () => G.teams[0].players[0].s.sv + G.teams[1].players[0].s.sv, pali = () => G.stats.pali[0] + G.stats.pali[1];
  const chiudi = (come) => { cur.esito = come; cur.dopo = +(G.t - cur.t).toFixed(2); delete cur.p; tiri.push(cur); cur = null; };
  while (G.state !== 'full' && n++ < 60000) {
    g.step(1 / 60); Math.random = grafica; g.draw(1 / 60); Math.random = gioco;
    const b = G.ball;
    if (G.shotId !== sid) {
      sid = G.shotId; if (cur) chiudi('altro tiro'); const p = G.shooter;
      if (p && !G.so) {
        const s = p.team.side, dx = (s * HL - b.x) * s; let vicino = 99, inMezzo = 0;
        for (const q of p.team.opp.players) {
          if (q.i === 0) continue; vicino = Math.min(vicino, hyp(q.x - p.x, q.z - p.z));
          const qx = (q.x - b.x) * s; if (qx > .5 && qx < dx && Math.abs(q.z - (b.z + (0 - b.z) * qx / dx)) < 1 + GH * qx / dx) inMezzo++;
        }
        cur = { t: G.t, testa: G.headId === G.shotId, d: hyp(dx, b.z), ang: Math.abs(Math.atan2(GH - b.z, dx) - Math.atan2(-GH - b.z, dx)), vicino, inMezzo, sv: parate(), pl: pali(), p };
      }
    }
    if (!cur) continue;
    const lt = G.lastTouch, altri = lt && lt !== cur.p;
    if (G.state === 'goal') chiudi('gol');
    else if (parate() > cur.sv) chiudi('parato');
    else if (pali() > cur.pl) chiudi('palo o traversa');
    else if (altri && lt.team !== cur.p.team && lt.i !== 0) chiudi('ribattuto da un difensore');
    else if (altri && lt.team !== cur.p.team) chiudi('preso dal portiere senza parata');
    else if (altri) chiudi('toccato da un compagno');
    else if (G.state === 'restart') chiudi('fuori');
    else if (G.t - cur.t > 3) chiudi('si spegne');
  }
  return tiri;
}

srv.listen(0, async () => {
  const br = await chromium.launch(), pg = await br.newPage({ viewport: { width: 844, height: 390 } });
  await pg.goto(`http://localhost:${srv.address().port}/`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await pg.waitForFunction(() => window.__g && !document.querySelector('#carica'), null, { timeout: 90000 });
  // il ciclo dei fotogrammi del gioco si ferma, come in diagnosi.cjs
  await pg.evaluate(() => new Promise((ok) => { window.requestAnimationFrame = () => 0; setTimeout(ok, 100); }));
  const tutti = [];
  for (let k = 0; k < N; k++) tutti.push(...await pg.evaluate(partita, [SEME + k, DIFFI, (k * 3) % 16, (k * 5 + 7) % 16]));
  const media = (v, f) => (v.reduce((s, x) => s + x[f], 0) / (v.length || 1)).toFixed(1);
  for (const [nome, v] of [['di piede', tutti.filter((x) => !x.testa)], ['di testa', tutti.filter((x) => x.testa)]]) {
    console.log(`\nTiri ${nome}: ${(v.length / N).toFixed(1)} a partita (${v.length} in ${N} partite, ${DIFFI}, semi ${SEME}–${SEME + N - 1})`);
    const per = {}; for (const t of v) (per[t.esito] = per[t.esito] || []).push(t);
    for (const [k, e] of Object.entries(per).sort((a, c) => c[1].length - a[1].length)) console.log(`  ${k.padEnd(32)} ${String(Math.round(e.length / v.length * 100)).padStart(3)}%  da ${media(e, 'd')} m · porta aperta ${media(e, 'ang')} rad · difensore più vicino ${media(e, 'vicino')} m · in mezzo ${media(e, 'inMezzo')}`);
  }
  await br.close(); srv.close();
});
