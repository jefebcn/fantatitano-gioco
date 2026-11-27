// I passaggi arrivano lisci e si fermano col piede? (Alex, 27/11). Partite computer contro computer: a ogni passaggio
// ricevuto da un compagno si guarda il pallone da mezzo secondo prima a un secondo dopo. Si contano gli «scatti» (il
// pallone si sposta di più di 3 cm diversamente da come dice la sua velocità), le spinte (la velocità cambia più di
// quanto fa l'erba) col piede lontano più di TOCCO metri, e se lo stop è un gesto con il piede sul pallone.
// Uso: npm run build, poi RADICE=public node scripts/prove/ricezione.cjs [partite, 2]
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const root = process.env.RADICE || path.join(__dirname, '../../public'), N = +process.argv[2] || 2, SEME = +process.env.SEME || 7;
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json' };
const srv = http.createServer((q, r) => { const u = q.url.split('?')[0], f = path.join(root, u === '/' ? 'index.html' : decodeURIComponent(u)); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' }); r.end(d); } }); });
const TOCCO = +(process.env.TOCCO || .3);
srv.listen(0, async () => {
  const br = await chromium.launch(), pg = await br.newPage({ viewport: { width: 844, height: 390 } });
  await pg.goto(`http://localhost:${srv.address().port}/`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await pg.waitForFunction(() => window.__g && !document.querySelector('#carica'), null, { timeout: 90000 });
  const tot = { ricevuti: 0, conGesto: 0, scatti: 0, scattoMax: 0, spinteSenza: 0, impulsoSenza: 0, allaPresa: [], esempi: [], smorza: [0, 0] };
  for (let k = 0; k < N; k++) {
    const r = await pg.evaluate(([seme, TOCCO]) => {
      window.requestAnimationFrame = () => 0; const g = window.__g, G = g.G; g.renderer.render = () => {};
      const caso = (x) => () => (x = (x * 16807) % 2147483647) / 2147483647, gioco = caso(seme), grafica = caso(seme + 7919);
      Math.random = caso(seme + 104729); G.paused = true; G.shown = true; G.t = 0; G.diff = g.DIFF.normale;
      g.newMatch(window.CLUBS[seme % 8], window.CLUBS[(seme + 3) % 8]); G.auto = true; Math.random = gioco;
      const draw = (dt) => { Math.random = grafica; g.draw(dt); Math.random = gioco; };
      const V = G.ball.constructor, q = { x: 0, y: 0, z: 0 }; let tmp = null;
      const piede = (p, b) => { let d = 9; for (const n of ['foot_l', 'foot_r', 'ball_l', 'ball_r']) { const o = p.fig.bones && p.fig.bones[n]; if (!o) continue; tmp = tmp || o.position.clone(); o.getWorldPosition(tmp); d = Math.min(d, Math.hypot(tmp.x - b.x, tmp.y - b.y, tmp.z - b.z)); } return d; };
      const out = { ricevuti: 0, conGesto: 0, scatti: 0, scattoMax: 0, spinteSenza: 0, impulsoSenza: 0, allaPresa: [], esempi: [] };
      let prima = null, ownerPrima = null, lpPrima = null, finestra = null, n = 0;
      while (G.state !== 'full' && n++ < 60000) {
        // il piede di chi è vicino al pallone nella posa che il gioco vede quando decide la presa (quella di prima del passo),
        // col pallone dove è arrivato
        const prima0 = new Map(); if (!G.ball.owner) for (const t of G.teams) for (const p of t.players) if (Math.hypot(p.x - G.ball.x, p.z - G.ball.z) < 2) {
          const ossa = []; for (const n of ['foot_l', 'foot_r', 'ball_l', 'ball_r']) { const o = p.fig.bones && p.fig.bones[n]; if (o) { tmp = tmp || o.position.clone(); o.getWorldPosition(tmp); ossa.push([tmp.x, tmp.y, tmp.z]); } }
          prima0.set(p, ossa);
        }
        g.step(1 / 60); draw(1 / 60);
        const b = G.ball, o = b.owner, ora = { x: b.x, z: b.z, vx: b.vx, vz: b.vz };
        if (G.state === 'play' && o && !ownerPrima && lpPrima && lpPrima.team === o.team && lpPrima !== o && o.i) {
          out.ricevuti++; if (/^stop/.test(o.fx || '')) out.conGesto++;
          out.allaPresa.push(+(prima0.has(o) ? Math.min(9, ...prima0.get(o).map(([x, y, z]) => Math.hypot(x - b.x, y - b.y, z - b.z))) : piede(o, b)).toFixed(2)); finestra = { p: o, fino: G.t + 1, t0: G.t };
        }
        if (finestra && (G.t > finestra.fino || G.state !== 'play' || (o && o !== finestra.p))) finestra = null;
        if (finestra && prima && b.y < .5) {
          const sx = ora.x - prima.x - prima.vx / 60, sz = ora.z - prima.z - prima.vz / 60, sc = Math.hypot(sx, sz);
          if (sc > .03) { out.scatti++; out.scattoMax = Math.max(out.scattoMax, +sc.toFixed(2)); if (out.esempi.length < 6) out.esempi.push(`${seme} ${G.t.toFixed(2)} s (+${(G.t - finestra.t0).toFixed(2)}): scatto ${sc.toFixed(2)} m, fx ${finestra.p.fx}`); }
          const dvx = ora.vx - prima.vx, dvz = ora.vz - prima.vz, v0 = Math.hypot(prima.vx, prima.vz), dv = Math.hypot(dvx, dvz);
          const lungo = v0 > .05 ? (dvx * prima.vx + dvz * prima.vz) / v0 : 0, lato = v0 > .05 ? Math.abs(dvx * prima.vz - dvz * prima.vx) / v0 : dv;
          if ((lungo > .05 || lungo < -.2 || lato > .1) && piede(finestra.p, b) > TOCCO) { out.spinteSenza++; out.impulsoSenza += dv; }
        }
        prima = ora; ownerPrima = o; lpPrima = G.lastPass || (o ? null : lpPrima);
      }
      out.impulsoSenza = +out.impulsoSenza.toFixed(1); out.smorza = (G.stats.smorza || [0, 0]).slice(); return out;
    }, [SEME + k, TOCCO]);
    for (const kk of ['ricevuti', 'conGesto', 'scatti', 'spinteSenza', 'impulsoSenza']) tot[kk] += r[kk];
    tot.smorza[0] += r.smorza[0]; tot.smorza[1] += r.smorza[1];
    tot.scattoMax = Math.max(tot.scattoMax, r.scattoMax); tot.allaPresa.push(...r.allaPresa); tot.esempi.push(...r.esempi);
  }
  const a = tot.allaPresa.sort((x, y) => x - y), med = a[a.length >> 1] || 0, lontani = a.filter((x) => x > TOCCO).length;
  console.log(`passaggi ricevuti ${tot.ricevuti}: stop col gesto ${tot.conGesto} (${Math.round(tot.conGesto / Math.max(1, tot.ricevuti) * 100)}%) · piede dal pallone alla presa: mediana ${med} m (3/4 sotto ${a[Math.floor(a.length * .75)] || 0}, 9/10 sotto ${a[Math.floor(a.length * .9)] || 0}), oltre ${TOCCO} m ${lontani} (${Math.round(lontani / Math.max(1, a.length) * 100)}%)`);
  console.log(`nel secondo dopo: scatti ${tot.scatti} (max ${tot.scattoMax} m) · spinte senza piede ${tot.spinteSenza} (${(tot.spinteSenza / Math.max(1, tot.ricevuti)).toFixed(1)} a passaggio, ${tot.impulsoSenza} m/s in tutto)`);
  // presi lontano dal piede (vedi smorza in game.js): quanti il piede li ha poi raggiunti, quanti no (li riprende il tocco di conduzione)
  console.log(`presi lontano dal piede: smorzati col piede ${tot.smorza[0]}, non raggiunti e ripresi col tocco di conduzione ${tot.smorza[1]}`);
  for (const e of tot.esempi) console.log('   ' + e);
  await br.close(); srv.close();
});
