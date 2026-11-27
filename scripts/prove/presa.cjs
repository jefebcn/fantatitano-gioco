// Il portiere prende il pallone con le mani? (amici di Alex, 27/11: «problemi col portiere, soprattutto la presa»).
// Partite computer contro computer: a ogni pallone che il portiere prende in mano si guarda quanto erano lontane le
// sue mani dal pallone (la posa che il gioco vede quando decide, col pallone dove è arrivato), che pallone era (tiro,
// cross o lancio, altro), quanto andava forte e se c'era già il gesto di presa o di parata. Dopo la presa il pallone
// va tra le mani da solo: tanto più lontane erano, tanto più si vede la «calamita». Conta anche le respinte con la mano lontana.
// Uso: npm run build, poi RADICE=public node scripts/prove/presa.cjs [partite, 3]   (MANI=0.35: la soglia, in metri)
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const root = process.env.RADICE || path.join(__dirname, '../../public'), N = +process.argv[2] || 3, SEME = +process.env.SEME || 7, MANI = +(process.env.MANI || .35);
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json' };
const srv = http.createServer((q, r) => { const u = q.url.split('?')[0], f = path.join(root, u === '/' ? 'index.html' : decodeURIComponent(u)); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' }); r.end(d); } }); });
srv.listen(0, async () => {
  const br = await chromium.launch(), pg = await br.newPage({ viewport: { width: 844, height: 390 } });
  await pg.goto(`http://localhost:${srv.address().port}/`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await pg.waitForFunction(() => window.__g && !document.querySelector('#carica'), null, { timeout: 90000 });
  const tutte = [], respinte = [];
  for (let k = 0; k < N; k++) {
    const r = await pg.evaluate(([seme]) => {
      window.requestAnimationFrame = () => 0; const g = window.__g, G = g.G; g.renderer.render = () => {};
      const caso = (x) => () => (x = (x * 16807) % 2147483647) / 2147483647, gioco = caso(seme), grafica = caso(seme + 7919);
      Math.random = caso(seme + 104729); G.paused = true; G.shown = true; G.t = 0; G.diff = g.DIFF.normale;
      g.newMatch(window.CLUBS[seme % 8], window.CLUBS[(seme + 3) % 8]); G.auto = true; Math.random = gioco;
      const draw = (dt) => { Math.random = grafica; g.draw(dt); Math.random = gioco; };
      let tmp = null; const mani = (p) => { const o = []; for (const n of ['hand_l', 'hand_r']) { const b = p.fig.bones && p.fig.bones[n]; if (b) { tmp = tmp || b.position.clone(); b.getWorldPosition(tmp); o.push([tmp.x, tmp.y, tmp.z]); } } return o; };
      const prese = [], resp = []; let n = 0, ownerPrima = null, inManoPrima = false, raccolta = null;
      while (G.state !== 'full' && n++ < 60000) {
        const b0 = G.ball, gk = G.teams.map((t) => t.players[0]), prima = new Map(gk.map((p) => [p, mani(p)]));
        const v0 = Math.hypot(b0.vx, b0.vz), y0 = b0.y, tiro = (G.tiroT || -1) >= (G.calcioT || 0) - 1e-6, fx0 = new Map(gk.map((p) => [p, p.fx || p.st])), sv = gk.map((p) => p.s.sv);
        g.step(1 / 60); draw(1 / 60);
        const b = G.ball, o = b.owner;
        const dist = (p) => Math.min(9, ...prima.get(p).map(([x, y, z]) => Math.hypot(x - b.x, y - b.y, z - b.z)));
        // il momento in cui il pallone va in mano: la presa, o la fine della raccolta (il portiere si è abbassato, vedi raccogli)
        const inMano = !!o && o.i === 0 && !o.piedi && o.raccoglie == null && G.state === 'play';
        if (o && o !== ownerPrima && o.i === 0 && o.raccoglie != null) raccolta = { tipo: G.attesa && G.attesa.chi === o ? 'rimessa dal fondo' : ownerPrima && ownerPrima.team !== o.team ? 'tolto a chi conduce' : tiro ? 'tiro' : y0 > .9 ? 'cross o lancio' : 'altro', t0: G.t };
        if (inMano && !inManoPrima && raccolta) { prese.push({ d: +dist(o).toFixed(2), tipo: raccolta.tipo + ' (raccolto)', v: +v0.toFixed(1), y: +y0.toFixed(2), gesto: fx0.get(o) || '-', t: +G.t.toFixed(1), dopo: +(G.t - raccolta.t0).toFixed(2) }); raccolta = null; }
        else if (inMano && !inManoPrima && o !== ownerPrima) {
          prese.push({ d: +dist(o).toFixed(2), tipo: G.attesa && G.attesa.chi === o ? 'rimessa dal fondo' : ownerPrima && ownerPrima.team !== o.team ? 'tolto a chi conduce' : tiro ? 'tiro' : y0 > .9 ? 'cross o lancio' : 'altro', v: +v0.toFixed(1), y: +y0.toFixed(2), gesto: fx0.get(o) || '-', t: +G.t.toFixed(1) });
        }
        // respinta: la parata conta (s.sv) ma il pallone resta libero
        gk.forEach((p, i) => { if (p.s.sv > sv[i] && b.owner !== p) resp.push({ d: +dist(p).toFixed(2), v: +v0.toFixed(1), gesto: fx0.get(p) || '-', t: +G.t.toFixed(1) }); });
        ownerPrima = o; inManoPrima = inMano; if (!o) raccolta = null;
      }
      return { prese, resp };
    }, [SEME + k]);
    tutte.push(...r.prese); respinte.push(...r.resp);
  }
  const quanti = (a) => a.filter((x) => x.d > MANI).length, med = (a) => { const s = a.map((x) => x.d).sort((x, y) => x - y); return s.length ? s[s.length >> 1] : 0; };
  console.log(`prese in mano ${tutte.length} su ${N} partite: mani dal pallone mediana ${med(tutte)} m, oltre ${MANI} m ${quanti(tutte)} (${Math.round(quanti(tutte) / Math.max(1, tutte.length) * 100)}%)`);
  for (const tipo of [...new Set(tutte.map((x) => x.tipo))].sort()) { const a = tutte.filter((x) => x.tipo === tipo); if (a.length) console.log(`  ${tipo.padEnd(19)} ${String(a.length).padStart(3)} · mediana ${med(a)} m · oltre ${MANI} m ${quanti(a)} · col gesto già partito ${a.filter((x) => /^(presa_|para_)/.test(x.gesto)).length}`); }
  console.log(`respinte ${respinte.length}: mani dal pallone mediana ${med(respinte)} m, oltre ${MANI} m ${quanti(respinte)}`);
  for (const x of tutte.filter((q) => q.d > MANI).slice(0, 8)) console.log(`   presa ${x.t} s: ${x.tipo}, ${x.v} m/s alto ${x.y} m, mani a ${x.d} m, gesto ${x.gesto}${x.dopo !== undefined ? `, raccolto dopo ${x.dopo} s` : ''}`);
  await br.close(); srv.close();
});
