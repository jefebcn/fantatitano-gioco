// Le misure di Dream League (docs/dls-misure.md, dalla partita registrata da Alex il 28/11) prese sul nostro gioco, con lo
// stesso metodo: velocità dei giocatori su finestre di 0,25 s, tempi da fermo a 6 m/s e da 6 m/s a fermo, conduzione,
// velocità dei calci appena partiti, tempi dei passaggi rasoterra, frenata del pallone che rotola, reazione del portiere
// al tiro, telecamera, durata della partita, statura. Partite computer contro computer, ripetibili (semi).
// Uso: npm run build, poi RADICE=public node scripts/prove/misure.cjs [partite, 2]   (SEME=7)
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const root = process.env.RADICE || path.join(__dirname, '../../public'), N = +process.argv[2] || 2, SEME = +process.env.SEME || 7;
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json' };
const srv = http.createServer((q, r) => { const u = q.url.split('?')[0], f = path.join(root, u === '/' ? 'index.html' : decodeURIComponent(u)); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' }); r.end(d); } }); });
const pc = (a, p) => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const f2 = (x) => (Number.isFinite(x) ? x.toFixed(2) : '—'), f1 = (x) => (Number.isFinite(x) ? x.toFixed(1) : '—');
srv.listen(0, async () => {
  const br = await chromium.launch(), pg = await br.newPage({ viewport: { width: 844, height: 390 } });
  await pg.goto(`http://localhost:${srv.address().port}/?collaudo=0`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await pg.waitForFunction(() => window.__g && !document.querySelector('#carica'), null, { timeout: 90000 });
  const T = { vel: [], su: [], giu: [], cond: [], condMax: [], calci: [], tiri: [], passi: [], frena: [], reaz: [], tuffo: [], cam: [], durata: [], gioco: [], ncalci: 0, alt: [] };
  for (let k = 0; k < N; k++) {
    const r = await pg.evaluate(([seme]) => {
      window.requestAnimationFrame = () => 0; const g = window.__g, G = g.G; g.renderer.render = () => {};
      const caso = (x) => () => (x = (x * 16807) % 2147483647) / 2147483647, gioco = caso(seme), grafica = caso(seme + 7919);
      Math.random = caso(seme + 104729); G.paused = true; G.shown = true; G.t = 0; G.diff = g.DIFF.normale;
      g.newMatch(window.CLUBS[seme % 8], window.CLUBS[(seme + 3) % 8]); G.auto = true; Math.random = gioco;
      const draw = (dt) => { Math.random = grafica; g.draw(dt); Math.random = gioco; };
      const DT = 1 / 60, W = 15, hyp = Math.hypot, cam = g.cam, BR = g.CFG.BR;
      const o = { vel: [], su: [], giu: [], cond: [], condMax: [], calci: [], tiri: [], passi: [], frena: [], reaz: [], tuffo: [], cam: [], ncalci: 0, alt: [] };
      const tutti = () => G.teams.flatMap((t) => t.players);
      const storia = new Map(), stato = new Map();
      let n = 0, giocato = 0, calcioPrima = G.calcioT, tiroPrima = G.tiroT, ownerPrima = null, possDa = 0, condV = [], passo = null, tiro = null, vPrima = null, camT = 0;
      for (const p of tutti()) if (p.fig && p.fig.metri) o.alt.push(p.fig.metri);
      while (G.state !== 'full' && n++ < 80000) {
        g.step(DT); draw(DT);
        const b = G.ball, play = G.state === 'play';
        // velocità di ogni giocatore su 0,25 s (come nel video: finestre per togliere il tremolio)
        for (const p of tutti()) {
          let h = storia.get(p); if (!h) { h = []; storia.set(p, h); }
          h.push(p.x, p.z); if (h.length > 2 * (W + 1)) h.splice(0, 2);
          if (!play || h.length < 2 * (W + 1)) { stato.set(p, { basso: null, alto: null }); continue; }
          const v = hyp(h[h.length - 2] - h[0], h[h.length - 1] - h[1]) / (W * DT);
          if (n % 6 === 0) o.vel.push(v);
          // da fermo (<1) a 6 m/s, e da oltre 6 a fermo: il tempo fra l'ultimo istante sotto e il primo sopra
          const s = stato.get(p) || { basso: null, alto: null };
          if (v < 1) { if (s.alto !== null && G.t - s.alto < 3) o.giu.push(G.t - s.alto); s.alto = null; s.basso = G.t; }
          if (v >= 6) { if (s.basso !== null && G.t - s.basso < 3) o.su.push(G.t - s.basso); s.basso = null; s.alto = G.t; }
          stato.set(p, s);
          if (p === b.owner) condV.push(v);
        }
        // conduzione: tratti col pallone tra i piedi di almeno 1,2 s
        if (b.owner !== ownerPrima) { if (ownerPrima && G.t - possDa >= 1.2 && condV.length) { const s = [...condV].sort((x, y) => x - y); o.cond.push(s[s.length >> 1]); o.condMax.push(s[Math.floor(s.length * .9)]); } condV = []; possDa = G.t; }
        // un calcio nuovo: la velocità del pallone 2 fotogrammi dopo (a terra o in aria), e se è un tiro
        if (G.calcioT !== calcioPrima && play) {
          o.ncalci++; const tiroOra = G.tiroT !== tiroPrima, chi = G.lastKicker;
          passo = { t: G.t, x: b.x, z: b.z, chi, aria: null, f: 0, tiro: tiroOra };
          if (tiroOra) { const gk = chi && chi.team.opp.players.find((q) => q.i === 0); tiro = { t: G.t, gk, reaz: null, tuffo: null }; }
        }
        if (passo && passo.f >= 0 && ++passo.f === 2) { const v = hyp(b.vx, b.vz); passo.aria = b.y > .5 || b.vy > 2; passo.v = v; (passo.tiro ? o.tiri : o.calci).push([v, passo.aria ? 1 : 0]); }
        // passaggio rasoterra arrivato a un compagno: distanza e tempo
        if (passo && b.owner && b.owner !== passo.chi && passo.v) { if (!passo.tiro && !passo.aria && passo.chi && b.owner.team === passo.chi.team) o.passi.push([hyp(b.x - passo.x, b.z - passo.z), G.t - passo.t, passo.v]); passo = null; }
        // il portiere sul tiro: primo gesto di parata o presa, e il tuffo
        if (tiro && tiro.gk) {
          const q = tiro.gk, dt = G.t - tiro.t;
          if (tiro.reaz === null && (/^(para_|presa_)/.test(q.fx || '') || q.st === 'dive')) tiro.reaz = dt;
          if (tiro.tuffo === null && (q.st === 'dive' || /^para_/.test(q.fx || ''))) tiro.tuffo = dt;
          if (dt > 1.5 || G.state !== 'play') { if (tiro.reaz !== null) o.reaz.push(tiro.reaz); if (tiro.tuffo !== null) o.tuffo.push(tiro.tuffo); tiro = null; }
        }
        // frenata del pallone che rotola libero (a terra, lontano dai calci)
        const vb = hyp(b.vx, b.vz);
        if (play && !b.owner && b.y < BR + .03 && Math.abs(b.vy) < .3 && G.t - G.calcioT > .3 && vPrima !== null && vb > 2 && vb < 22 && n % 6 === 0) o.frena.push([vPrima, (vPrima - vb) / (6 * DT)]);
        if (n % 6 === 0) vPrima = play && !b.owner && b.y < BR + .03 ? vb : null;
        // telecamera ogni mezzo secondo di gioco: altezza, distanza dal pallone a terra, inclinazione, fov, campo visibile
        if (play && G.t - camT > .5) {
          camT = G.t; const c = cam.position, dx = b.x - c.x, dz = b.z - c.z, d = hyp(dx, dz), d3 = hyp(dx, b.y - c.y, dz);
          const dir = cam.getWorldDirection(c.clone()), incl = Math.asin(-dir.y) * 180 / Math.PI, vf = cam.fov, hf = 2 * Math.atan(Math.tan(vf * Math.PI / 360) * cam.aspect);
          o.cam.push([c.y, d, incl, vf, 2 * d3 * Math.tan(hf / 2)]);
        }
        if (play) giocato += DT;
        calcioPrima = G.calcioT; tiroPrima = G.tiroT; ownerPrima = b.owner;
      }
      return { ...o, durata: n * DT, gioco: giocato };
    }, [SEME + k]);
    for (const c of Object.keys(T)) { if (Array.isArray(T[c]) && Array.isArray(r[c])) T[c].push(...r[c]); else if (Array.isArray(T[c])) T[c].push(r[c]); else T[c] += r[c]; }
  }
  const v = T.vel, fasce = [[0, 1], [1, 2], [2, 4], [4, 6], [6, 7], [7, 8], [8, 9], [9, 99]];
  console.log(`MISURE COME DREAM LEAGUE · ${N} partite (semi ${SEME}–${SEME + N - 1}) · tra parentesi il valore di DLS (docs/dls-misure.md)\n`);
  console.log('Velocità dei giocatori (m/s, finestre di 0,25 s, solo in gioco):');
  console.log(`  p10 ${f2(pc(v, .1))} (0,56) · p25 ${f2(pc(v, .25))} (1,59) · p50 ${f2(pc(v, .5))} (3,31) · p75 ${f2(pc(v, .75))} (5,19) · p90 ${f2(pc(v, .9))} (6,76) · p95 ${f2(pc(v, .95))} (7,55) · p99 ${f2(pc(v, .99))} (8,98)`);
  const dls = [16.6, 14.1, 28.8, 24.1, 8.1, 5.0, 2.2, 1.0];
  console.log('  % del tempo per fascia: ' + fasce.map(([a, b], i) => `${a}-${b < 99 ? b : '…'} ${f1(v.filter((x) => x >= a && x < b).length / v.length * 100)}% (${dls[i]})`).join(' · '));
  console.log(`Da fermo a 6 m/s: mediana ${f2(pc(T.su, .5))} s, p25-p75 ${f2(pc(T.su, .25))}-${f2(pc(T.su, .75))} (DLS 0,65 · 0,30-1,08), ${T.su.length} casi`);
  console.log(`Da 6 m/s a fermo: mediana ${f2(pc(T.giu, .5))} s, p25-p75 ${f2(pc(T.giu, .25))}-${f2(pc(T.giu, .75))} (DLS 0,62 · 0,25-1,07), ${T.giu.length} casi`);
  console.log(`Conduzione (tratti di almeno 1,2 s): mediana ${f2(pc(T.cond, .5))} m/s (DLS 6,0), punte p90 ${f2(pc(T.condMax, .5))} (DLS 8,3), ${T.cond.length} tratti`);
  const terra = T.calci.filter((c) => !c[1]).map((c) => c[0]), bin = (a, x, y) => a.filter((q) => q >= x && q < y).length;
  console.log(`Calci non di tiro, partenza a terra (${terra.length}): 8-10 m/s ${bin(terra, 8, 10)} · 10-18 ${bin(terra, 10, 18)} · 18-26 ${bin(terra, 18, 26)} · oltre ${bin(terra, 26, 99)} · mediana ${f1(pc(terra, .5))} (DLS: picco 12-16, forti 22-24); in aria ${T.calci.length - terra.length}`);
  const tv = T.tiri.map((c) => c[0]); console.log(`Tiri (${tv.length}): partenza mediana ${f1(pc(tv, .5))} m/s, p25-p75 ${f1(pc(tv, .25))}-${f1(pc(tv, .75))} (DLS 24-30)`);
  for (const [a, b2, d] of [[5, 10, '0,6-0,9'], [12, 15, '1,1-1,6'], [22, 29, '~1,6']]) { const s = T.passi.filter((q) => q[0] >= a && q[0] < b2); console.log(`Passaggi rasoterra ${a}-${b2} m (${s.length}): arrivo mediana ${f2(pc(s.map((q) => q[1]), .5))} s, partenza ${f1(pc(s.map((q) => q[2]), .5))} m/s (DLS ${d} s)`); }
  for (const [a, b2] of [[3, 8], [8, 14], [14, 22]]) { const s = T.frena.filter((q) => q[0] >= a && q[0] < b2).map((q) => q[1]); console.log(`Frenata del pallone che rotola a ${a}-${b2} m/s: mediana ${f2(pc(s, .5))} m/s² (DLS ~4-6), ${s.length} campioni`); }
  console.log(`Portiere sul tiro: primo gesto mediana ${f2(pc(T.reaz, .5))} s (DLS 0,1-0,3), tuffo ${f2(pc(T.tuffo, .5))} s (DLS ~0,4), su ${T.reaz.length} tiri`);
  const c = (i) => T.cam.map((q) => q[i]);
  console.log(`Telecamera: alta ${f1(pc(c(0), .5))} m (DLS ~14) · dal pallone ${f1(pc(c(1), .5))} m, p10-p90 ${f1(pc(c(1), .1))}-${f1(pc(c(1), .9))} (DLS ~45, 37-52) · inclinata ${f1(pc(c(2), .5))}° (DLS ~20) · fov verticale ${f1(pc(c(3), .5))}° (DLS ~27) · campo visibile ${f1(pc(c(4), .5))} m, p10-p90 ${f1(pc(c(4), .1))}-${f1(pc(c(4), .9))} (DLS ~46, 37-54)`);
  console.log(`Durata: ${f1(pc(T.durata, .5) / 60)} minuti veri per partita (DLS ~6, intervallo compreso) · calci ogni ${f2(T.gioco.reduce((x, y) => x + y, 0) / Math.max(1, T.ncalci))} s di gioco (DLS 0,85)`);
  console.log(`Statura: mediana ${f2(pc(T.alt, .5))} m, p10-p90 ${f2(pc(T.alt, .1))}-${f2(pc(T.alt, .9))} (DLS ~1,80-1,85, tutti simili)`);
  await br.close(); srv.close();
});
