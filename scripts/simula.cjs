/* Partite simulate, senza disegnare, per tarare l'IA: stampa gol, tiri, possesso, inserimenti, scivolate, falli, fuorigioco, rigori, cartellini, angoli, cross e colpi di testa per difficoltà.
   La squadra di casa gioca da sola come compagni dell'utente (MATE), quella in trasferta col livello scelto (DIFF).
   Uso: npm run build && node scripts/simula.cjs [partite per difficoltà, 24]
   Serve Playwright (non è tra le dipendenze): npm i -D playwright && npx playwright install chromium
   Per provare altri numeri senza toccare il codice: OVR='{"INSERIMENTO":{"ogni":1},"DIFF":{"facile":{"wait":2}}}' node scripts/simula.cjs
   Solo alcune difficoltà: D=normale,difficile node scripts/simula.cjs */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', 'public'), N = +process.argv[2] || 24;
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2' };
const srv = http.createServer((q, r) => {
  const f = path.join(root, q.url === '/' ? 'index.html' : decodeURIComponent(q.url.split('?')[0]));
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' }); r.end(d); } });
});
srv.listen(0, async () => {
  const br = await chromium.launch(), pg = await br.newPage(), errs = [];
  pg.on('pageerror', (e) => errs.push(String(e)));
  await pg.goto(`http://localhost:${srv.address().port}/`);
  await pg.waitForFunction(() => window.__g && !document.querySelector('#carica'), null, { timeout: 60000 });
  // PANCHINA=1 dà a ogni squadra sette riserve di prova, per provare le sostituzioni anche se i dati non le hanno
  if (process.env.PANCHINA) await pg.evaluate(() => { for (const c of window.CLUBS) if (!c.pan) c.pan = [['Riserva P', 'P', 81, 12], ['Riserva D1', 'D', 82, 16], ['Riserva D2', 'D', 83, 15], ['Riserva C1', 'C', 84, 22], ['Riserva C2', 'C', 85, 20], ['Riserva A1', 'A', 86, 24], ['Riserva A2', 'A', 87, 22]]; });
  await pg.evaluate((o) => { for (const k in o) { if (k === 'DIFF') for (const d in o.DIFF) Object.assign(window.__g.DIFF[d], o.DIFF[d]); else Object.assign(window.__g[k], o[k]); } }, JSON.parse(process.env.OVR || '{}'));
  for (const d of (process.env.D || 'facile,normale,difficile').split(',')) {
    const res = await pg.evaluate(({ d, N }) => {
      const g = window.__g, G = g.G, out = []; G.paused = true;
      for (let k = 0; k < N; k++) {
        G.diff = g.DIFF[d]; G.shown = true; g.newMatch(window.CLUBS[(k * 3) % 16], window.CLUBS[(k * 5 + 7) % 16]); G.auto = true;
        let n = 0; while (G.state !== 'full' && n++ < 40000) g.step(1 / 60);
        const s = G.stats, tot = s.poss[0] + s.poss[1] || 1;
        out.push({ gol: [G.teams[0].score, G.teams[1].score], tiri: s.shots, inserimenti: s.runs, scivolate: s.slides, falli: s.fouls, fuorigioco: s.offs, rigori: s.pens, gialli: s.yel, rossi: s.red, vantaggi: s.adv, infortuni: s.inj, cambi: s.subs, angoli: s.corners, cross: s.crosses, testa: s.heads, 'gol di testa': s.headGoals, poss: s.poss[0] / tot });
      }
      return out;
    }, { d, N });
    const avg = (f) => (res.reduce((s, r) => s + f(r), 0) / res.length).toFixed(2), two = (k) => `${k} ${avg((r) => r[k][0])}-${avg((r) => r[k][1])}`;
    const v = res.filter((r) => r.gol[0] > r.gol[1]).length, p = res.filter((r) => r.gol[0] < r.gol[1]).length;
    console.log(`${d.padEnd(9)} ${two('gol')}  ${two('tiri')}  possesso casa ${avg((r) => r.poss * 100)}%  V/N/P ${v}/${res.length - v - p}/${p}  ${two('inserimenti')}  ${two('scivolate')}\n          ${two('falli')}  ${two('fuorigioco')}  ${two('rigori')}  ${two('gialli')}  ${two('rossi')}  ${two('vantaggi')}  ${two('infortuni')}  ${two('cambi')}\n          ${two('angoli')}  ${two('cross')}  ${two('testa')}  ${two('gol di testa')}`);
  }
  if (errs.length) console.log('Errori nella pagina:', [...new Set(errs)].slice(0, 5));
  await br.close(); srv.close();
});
