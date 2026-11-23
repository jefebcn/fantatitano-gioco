// Una partita intera registrata passo per passo (60 al secondo): pallone, giocatori, animazioni, piedi e mani.
// uso: node scripts/prove/registra.cjs <auto|bot> <seme> <nome> [passi massimi]   (auto: computer contro computer. bot: la
// squadra di casa usa i comandi). USCITA=cartella dove scrivere, OGNI=passi tra un'immagine e l'altra, di solito 30. Poi:
// USCITA=cartella python3 scripts/prove/analisi-partita.py <nome>
// Scrive <nome>.ndjson (una riga per passo), <nome>-info.json (dizionari) e un'immagine ogni mezzo secondo in <nome>/.
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const [modo = 'auto', seme = '7', nome = 'rec', maxPassi = '40000'] = process.argv.slice(2);
const root = process.env.RADICE || path.join(__dirname, '../../public'), USCITA = process.env.USCITA || process.cwd(), dove = path.join(USCITA, nome), OGNI = +(process.env.OGNI || 30);
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json' };
const srv = http.createServer((q, r) => { const u = q.url.split('?')[0], f = path.join(root, u === '/' ? 'index.html' : decodeURIComponent(u)); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' }); r.end(d); } }); });
srv.listen(0, async () => {
  fs.rmSync(dove, { recursive: true, force: true }); fs.mkdirSync(dove);
  const br = await chromium.launch(), pg = await br.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1 }), err = [];
  pg.on('pageerror', (e) => err.push(String(e))); pg.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') err.push(m.type() + ': ' + m.text().slice(0, 200)); });
  await pg.goto(`http://localhost:${srv.address().port}/`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await pg.waitForFunction(() => window.__g && !document.querySelector('#carica'), null, { timeout: 90000 });
  await pg.evaluate((s) => { window.requestAnimationFrame = () => 0; window.__g.prova(s); }, +seme);
  await pg.waitForTimeout(300);
  await pg.evaluate(() => { window.__g.G.t = 0; window.__g.startMatch(window.CLUBS[2].id, window.CLUBS[5].id, 'normale'); });
  await pg.waitForFunction(() => ['kickoff', 'play'].includes(window.__g.G.state) && window.__g.G.teams.length === 2, null, { timeout: 60000 });
  await pg.evaluate((modo) => {
    window.requestAnimationFrame = () => 0;
    const g = window.__g, G = g.G, T = window.THREE; G.auto = modo === 'auto';
    const vero = g.renderer.render.bind(g.renderer); window.__disegna = false; g.renderer.render = (...a) => { if (window.__disegna) vero(...a); };
    const diz = { st: [], fx: [], stato: [], clip: [] }, cod = (k, v) => { v = v || ''; let i = diz[k].indexOf(v); if (i < 0) { i = diz[k].length; diz[k].push(v); } return i; };
    const ids = new Map(), nomi = [], id = (p) => { if (!ids.has(p)) { ids.set(p, nomi.length); nomi.push({ sq: p.team.idx, i: p.i, nome: p.name, ruolo: p.role, alt: +(p.fig.metri || 0).toFixed(2) }); } return ids.get(p); };
    const r2 = (v) => Math.round(v * 100) / 100, r3 = (v) => Math.round(v * 1000) / 1000, V = { x: 0, y: 0, z: 0 };
    const pos = (o) => { const e = o.matrixWorld.elements; return [e[12], e[13], e[14]]; };
    const tasti = new Set(), premi = (k, giu) => { if (giu === tasti.has(k)) return; giu ? tasti.add(k) : tasti.delete(k); window.dispatchEvent(new KeyboardEvent(giu ? 'keydown' : 'keyup', { key: k, bubbles: true })); };
    // il "giocatore" di prova: avanza verso la porta, passa se pressato, tira da vicino; senza palla va sul pallone e pressa
    let botT = 0, tocco = null;
    const bot = () => {
      const c = G.ctrl, b = G.ball; if (!c || G.state !== 'play') { for (const k of [...tasti]) premi(k, false); tocco = null; return; }
      if (tocco && G.t >= tocco[1]) { premi(tocco[0], false); tocco = null; }
      const s = c.team.side, mio = b.owner === c; let dx, dz;
      if (mio) { dx = s * 52.5 - c.x; dz = -c.z * .6; let vic = 99; for (const o of c.team.opp.players) vic = Math.min(vic, Math.hypot(o.x - c.x, o.z - c.z));
        const dPorta = Math.hypot(s * 52.5 - c.x, c.z);
        if (!tocco && G.t > botT) { if (dPorta < 22) { tocco = [' ', G.t + .3]; premi(' ', true); botT = G.t + 1; } else if (vic < 3.2 || G.t - (c.botDa || 0) > 2.5) { tocco = ['x', G.t + .08]; premi('x', true); botT = G.t + .6; } }
      } else { c.botDa = G.t; dx = b.x + b.vx * .3 - c.x; dz = b.z + b.vz * .3 - c.z; premi('x', !!b.owner && b.owner.team !== c.team && Math.hypot(dx, dz) < 12); }
      // la telecamera guarda dal lato z positivo: destra dello schermo = x crescente, su = z decrescente
      const a = Math.atan2(dz, dx), d8 = Math.round(a / (Math.PI / 4)), vx = [1, 1, 0, -1, -1, -1, 0, 1][(d8 + 8) % 8], vz = [0, 1, 1, 1, 0, -1, -1, -1][(d8 + 8) % 8];
      premi('ArrowRight', vx > 0); premi('ArrowLeft', vx < 0); premi('ArrowDown', vz > 0); premi('ArrowUp', vz < 0);
    };
    window.__blocco = (n, scatta) => {
      const righe = [];
      for (let k = 0; k < n; k++) {
        if (modo === 'bot') bot();
        window.__disegna = scatta && k === n - 1;
        g.step(1 / 60); g.draw(1 / 60); if (g.PERF && g.PERF.aggiorna) g.PERF.aggiorna(1 / 60, true); g.hud();
        const b = G.ball; if (!b) { righe.push(null); continue; }
        const riga = [r2(G.t), cod('stato', G.state), r2(b.x), r2(b.y), r2(b.z), r2(b.vx), r2(b.vy), r2(b.vz), b.owner ? id(b.owner) : -1, G.lastPass ? id(G.lastPass) : -1, G.intended ? id(G.intended) : -1, G.shotId || 0,
          G.ctrl ? id(G.ctrl) : -1, G.teams[0].score, G.teams[1].score, G.lastTouch ? id(G.lastTouch) : -1, G.cine ? 1 : 0, G.rivede ? 1 : 0, [...tasti].join('+')];
        const P = [];
        for (const t of G.teams) for (const p of t.players) {
          const f = p.fig, bo = f.bones || {}; f.root.updateMatrixWorld(true); const L = bo.foot_l ? pos(bo.foot_l) : [0, 0, 0], R = bo.foot_r ? pos(bo.foot_r) : [0, 0, 0], HL = bo.hand_l ? pos(bo.hand_l) : [0, 0, 0], HR = bo.hand_r ? pos(bo.hand_r) : [0, 0, 0], H = bo.Head ? pos(bo.Head) : [0, 0, 0];
          const w = f.w || {}, clip = f.act ? f.act.getClip().name : '';
          P.push([id(p), r2(p.x), r2(p.z), r2(p.vx), r2(p.vz), r2(p.dir || 0), r2(f.vdir ?? 0), cod('st', p.st), cod('fx', p.fx), r2(f.fxW || 0), r3(f.body.position.y),
            r3(L[0]), r3(L[1]), r3(L[2]), r3(R[0]), r3(R[1]), r3(R[2]), r2(w.idle || 0), r2(w.walk || 0), r2(w.jog || 0), r2(w.run || 0), r2((w.passoS || 0) + (w.passoD || 0)),
            (p.jock ? 1 : 0) | (f.indietro ? 2 : 0) | (p.sprint ? 4 : 0) | (p.stun > 0 ? 8 : 0) | (f.piediAttivi ? 16 : 0) | (p.fallen ? 32 : 0),
            r2(Math.hypot(HL[0] - HR[0], HL[1] - HR[1], HL[2] - HR[2])), r2(H[1]), r2(Math.min(HL[1], HR[1])), cod('clip', clip), r3(HL[0]), r3(HL[1]), r3(HL[2]), r3(HR[0]), r3(HR[1]), r3(HR[2]), r2(p.en || 0)]);
        }
        riga.push(P); righe.push(riga);
      }
      return { righe, stato: G.state, t: G.t, min: (document.querySelector('#tempo') || {}).textContent || '' };
    };
    window.__info = () => ({ diz, nomi, ossa: Object.keys((G.teams[0].players[1].fig.bones) || {}), gol: (G.goals || []).map((x) => ({ min: x.min, sq: x.t, nome: x.name || (x.p && x.p.name) || '' })), lati: G.teams.map((t) => t.side), squadre: G.teams.map((t) => t.club.name), stats: JSON.parse(JSON.stringify(G.stats, (k, v) => (v && typeof v === 'object' && !Array.isArray(v) && k ? undefined : v))) });
  }, modo);
  const out = fs.createWriteStream(path.join(USCITA, nome + '.ndjson')); let passi = 0, n = 0, stato = '';
  const t0 = Date.now();
  while (passi < +maxPassi && stato !== 'full') {
    const r = await pg.evaluate(([k, sc]) => window.__blocco(k, sc), [OGNI, true]);
    for (const riga of r.righe) if (riga) out.write(JSON.stringify(riga) + '\n');
    passi += OGNI; stato = r.stato;
    await pg.screenshot({ path: path.join(dove, `f${String(n++).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 55, timeout: 90000, animations: 'disabled' });
    if (n % 60 === 0) console.log('passi', passi, 'tempo di gioco', r.t.toFixed(1), stato, ((Date.now() - t0) / 1000).toFixed(0) + ' s');
  }
  // qualche secondo dopo il fischio finale
  out.end();
  fs.writeFileSync(path.join(USCITA, nome + '-info.json'), JSON.stringify({ ...(await pg.evaluate(() => window.__info())), errori: [...new Set(err)], passi, modo, seme: +seme, ogni: OGNI }));
  console.log('finito', nome, 'passi', passi, 'immagini', n, 'errori', [...new Set(err)].slice(0, 8));
  await br.close(); srv.close();
});
