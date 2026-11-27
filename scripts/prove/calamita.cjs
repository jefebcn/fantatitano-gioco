// Il pallone in conduzione si muove solo quando lo tocca il piede? (Alex, 27/11: «anche se fai un 360 col personaggino la
// palla non deve seguirti in ogni modo: si deve vedere che il calciatore appoggia il piede sulla palla per portarla»).
// Chi gioca conduce con la levetta in sei modi (dritto, giro completo veloce e lento, inversione, zig-zag, giro quasi da
// fermo). A ogni fotogramma si confronta la velocità del pallone con quella del fotogramma prima: se cambia più di quanto
// fa l'attrito del prato è una «spinta». Una spinta con le dita e il collo del piede a più di `TOCCO` metri dal centro del
// pallone è una calamita: il pallone si è mosso da solo. Si misura anche lo spostamento del pallone «a scatto» (diverso
// da quello della sua velocità), quanto spesso il pallone è a più di 0,95 m (lì un avversario lo può rubare tra un tocco e
// l'altro) e di quanti gradi in media la corsa resta lontana dalla levetta. Fallisce se in un modo più di MAX della
// spinta arriva senza piede, o se il pallone si perde. Uso: npm run build, poi node scripts/prove/calamita.cjs
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const root = process.env.RADICE || path.join(__dirname, '../../public');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json' };
const srv = http.createServer((q, r) => { const u = q.url.split('?')[0], f = path.join(root, u === '/' ? 'index.html' : decodeURIComponent(u)); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' }); r.end(d); } }); });
const TOCCO = +(process.env.TOCCO || .3), MAX = +(process.env.MAX || .35);
srv.listen(0, async () => {
  const br = await chromium.launch(), pg = await br.newPage({ viewport: { width: 844, height: 390 } });
  await pg.goto(`http://localhost:${srv.address().port}/`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await pg.waitForFunction(() => window.__g && !document.querySelector('#carica'), null, { timeout: 90000 });
  const out = await pg.evaluate((TOCCO) => {
    window.requestAnimationFrame = () => 0; const g = window.__g, G = g.G; g.renderer.render = () => {};
    // la levetta nel tempo: angolo in gradi (null = ferma) e quanto inclinata
    const modi = {
      dritto: (t) => [0, 1],
      'giro veloce (360° in 1,5 s)': (t) => [t < .6 ? 0 : (t - .6) / 1.5 * 360, 1],
      'giro lento (360° in 4 s)': (t) => [t < .6 ? 0 : (t - .6) / 4 * 360, 1],
      inversione: (t) => [t < 1.2 ? 0 : 180, 1],
      'zig-zag': (t) => [Math.floor(t / .6) % 2 ? 50 : -50, 1],
      'giro quasi da fermo': (t) => [t < .6 ? 0 : (t - .6) / 2.5 * 360, .35],
    };
    const res = {};
    for (const [nome, leva] of Object.entries(modi)) {
      g.prova(11); G.t = 0; g.newMatch(window.CLUBS[2], window.CLUBS[5]); G.auto = false; G.paused = false; G.presenta = null;
      for (let i = 0; i < 200 && G.state !== 'play'; i++) { g.step(1 / 60); g.draw(1 / 60); }
      G.state = 'play'; G.attesa = null; G.fk = null; G.rimessa = null;
      const t = G.teams[0], s = t.side, p = t.players[7], b = G.ball;
      const via = () => { for (const tt of G.teams) for (const q of tt.players) if (q !== p) { q.x = -s * 40 + (q.i % 3) * 2; q.z = (tt.idx ? 25 : -25) + q.i; q.vx = q.vz = 0; q.tx = q.x; q.tz = q.z; } };
      via(); p.x = 0; p.z = 0; p.vx = p.vz = 0; p.dir = Math.atan2(s, 0);
      for (let i = 0; i < 5; i++) { g.step(1 / 60); g.draw(1 / 60); }
      b.x = p.x + s * .5; b.z = p.z; b.y = .11; b.vx = b.vz = b.vy = 0; b.owner = p; G.ctrl = p; G.poss = t; G.lastTouch = p;
      G.tocchi = 0; let lont = 0, nLont = 0, scarto = 0, nScarto = 0;
      const V = p.fig.root.position.constructor, q = new V(); let prima = null, frames = 0, spinte = 0, calamite = 0, impulso = 0, impulsoCal = 0, scatti = 0, scattoMax = 0, persa = false, dist = [], esempi = [];
      for (let i = 0; i < 60 * 5; i++) {
        const tt = i / 60, [ang, forza] = leva(tt), a = (ang * Math.PI / 180) + Math.atan2(s, 0) * 0; // gradi dal «verso la porta avversaria»
        // levetta nel mondo: 0° = verso la porta avversaria (+x per chi attacca a destra)
        const ux = Math.cos(a) * s, uz = Math.sin(a);
        G.in.jx = ux * forza; G.in.jy = uz * forza;
        via(); g.step(1 / 60); g.draw(1 / 60);
        if (b.owner !== p) { persa = true; break; }
        frames++;
        if (tt > .6) { nLont++; if (Math.hypot(b.x - p.x, b.z - p.z) > .95) lont++; if (Math.hypot(p.vx, p.vz) > .5) { const c = (p.vx * ux + p.vz * uz) / Math.hypot(p.vx, p.vz); scarto += Math.acos(Math.max(-1, Math.min(1, c))) * 180 / Math.PI; nScarto++; } }
        // dita e collo dei due piedi, nella posa appena disegnata
        let dp = 9; for (const n of ['foot_l', 'foot_r', 'ball_l', 'ball_r']) { const o = p.fig.bones[n]; if (!o) continue; o.getWorldPosition(q); dp = Math.min(dp, Math.hypot(q.x - b.x, q.y - b.y, q.z - b.z)); }
        dist.push(Math.hypot(b.x - p.x, b.z - p.z));
        const ora = { x: b.x, z: b.z, vx: b.vx, vz: b.vz };
        if (prima) {
          const dvx = ora.vx - prima.vx, dvz = ora.vz - prima.vz, v0 = Math.hypot(prima.vx, prima.vz), dv = Math.hypot(dvx, dvz);
          // l'attrito frena lungo la corsa del pallone: al massimo circa 0,15 m/s in un fotogramma, e mai di lato
          const lungo = v0 > .05 ? (dvx * prima.vx + dvz * prima.vz) / v0 : 0, lato = v0 > .05 ? Math.abs(dvx * prima.vz - dvz * prima.vx) / v0 : dv;
          const spinta = lungo > .05 || lungo < -.2 || lato > .1;
          if (spinta) { spinte++; impulso += dv; if (dp > TOCCO) { calamite++; impulsoCal += dv; if (esempi.length < 4) esempi.push(`${tt.toFixed(2)} s: ${dv.toFixed(2)} m/s col piede a ${dp.toFixed(2)} m, giocatore a ${Math.hypot(p.vx, p.vz).toFixed(1)} m/s`); } }
          // scatto: il pallone si sposta diversamente da come dice la sua velocità
          const sx = ora.x - prima.x - prima.vx / 60, sz = ora.z - prima.z - prima.vz / 60, sc = Math.hypot(sx, sz);
          if (sc > .03) { scatti++; scattoMax = Math.max(scattoMax, sc); }
        }
        prima = ora;
      }
      dist.sort((x, y) => x - y);
      res[nome] = { tocchi: G.tocchi, lontano: Math.round(lont / Math.max(1, nLont) * 100), scarto: Math.round(scarto / Math.max(1, nScarto)), frames, persa, spinte, calamite, impulso: +impulso.toFixed(1), impulsoCal: +impulsoCal.toFixed(1), scatti, scattoMax: +scattoMax.toFixed(2), distMed: +(dist[dist.length >> 1] || 0).toFixed(2), distMax: +(dist[dist.length - 1] || 0).toFixed(2), esempi };
    }
    return res;
  }, TOCCO);
  let male = 0;
  for (const [nome, r] of Object.entries(out)) {
    const quota = r.impulso ? r.impulsoCal / r.impulso : 0; if (quota > MAX || r.persa) male++;
    console.log(`${(quota > MAX || r.persa ? '✗ ' : '✓ ') + nome.padEnd(28)} tocchi ${String(r.tocchi).padStart(2)} · spinte ${String(r.spinte).padStart(3)}, senza piede ${String(r.calamite).padStart(3)} (${Math.round(quota * 100)}% della spinta) · pallone dal corpo ${r.distMed} m, max ${r.distMax}, oltre 0,95 m ${r.lontano}% · corsa dalla levetta ${r.scarto}°${r.persa ? ' · PERSO' : ''}`);
    for (const e of r.esempi) console.log('     ' + e);
  }
  await br.close(); srv.close();
  if (male) { console.log(`\n${male} modi col pallone che si muove senza piede (oltre ${MAX * 100}% della spinta) o perso`); process.exit(1); }
});
