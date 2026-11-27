// Il collaudo (src/collaudo.js, ?collaudo nell'indirizzo) funziona? Senza ?collaudo i pulsanti non si vedono. Con
// ?collaudo: una partita intera computer contro computer non deve dare problemi finti; un giocatore spostato di colpo
// deve finire nel rapporto; la segnalazione dal menu di pausa (argomento, testo, foto) deve finire nel rapporto;
// scrivendo «p» nella segnalazione la partita non riparte; «Manda il rapporto» passa testo e foto a Condividi.
// Uso: npm run build, poi node scripts/prove/collaudo.cjs
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const root = process.env.RADICE || path.join(__dirname, '../../public');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json' };
const srv = http.createServer((q, r) => { const u = q.url.split('?')[0], f = path.join(root, u === '/' ? 'index.html' : decodeURIComponent(u)); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' }); r.end(d); } }); });
let ko = 0; const esito = (ok, s) => { if (!ok) ko++; console.log(`${ok ? '✓' : '✗'} ${s}`); };
srv.listen(0, async () => {
  const br = await chromium.launch(), base = `http://localhost:${srv.address().port}/`;
  const apri = async (q) => {
    const pg = await br.newPage({ viewport: { width: 844, height: 390 } }); const errori = []; pg.on('pageerror', (e) => errori.push(String(e)));
    await pg.goto(base + q, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await pg.waitForFunction(() => window.__g && !document.querySelector('#carica'), null, { timeout: 90000 }); return [pg, errori];
  };
  // senza ?collaudo: niente pulsanti, niente controlli
  { const [pg] = await apri(''); const r = await pg.evaluate(() => ({ coll: !!window.__g.collaudo(), visibili: [...document.querySelectorAll('.coll')].filter((e) => !e.classList.contains('nas')).length })); esito(!r.coll && !r.visibili, `senza ?collaudo: spento, pulsanti visibili ${r.visibili}`); await pg.close(); }
  const [pg, errori] = await apri('?collaudo');
  // una partita intera: i controlli girano a ogni fotogramma come nel gioco, e non devono trovare niente
  const r = await pg.evaluate(() => {
    window.requestAnimationFrame = () => 0; const g = window.__g, G = g.G, C = g.collaudo(); g.renderer.render = () => {};
    const caso = (x) => () => (x = (x * 16807) % 2147483647) / 2147483647; Math.random = caso(7);
    G.paused = true; G.shown = true; G.t = 0; G.diff = g.DIFF.normale; g.newMatch(window.CLUBS[1], window.CLUBS[4]); G.auto = true; G.paused = false;
    let n = 0; while (G.state !== 'full' && n++ < 60000) { g.step(1 / 60); g.draw(1 / 60); C.passo(1 / 60); }
    const pulito = C.rapporto();
    // un giocatore spostato di colpo di 5 metri
    g.newMatch(window.CLUBS[2], window.CLUBS[5]); G.auto = true; G.paused = false;
    for (let i = 0; i < 1200 && G.state !== 'play'; i++) { g.step(1 / 60); g.draw(1 / 60); C.passo(1 / 60); }
    const p = G.teams[1].players[5]; g.step(1 / 60); C.passo(1 / 60); p.x += 5; g.step(1 / 60); C.passo(1 / 60);
    return { pulito, dopo: C.rapporto(), finita: G.state === 'full' || n < 60000 };
  });
  const prob = /PROBLEMI TROVATI DAL GIOCO([\s\S]*)/.exec(r.pulito);
  esito(!prob, `partita intera col collaudo acceso: ${prob ? 'problemi trovati ' + prob[1].split('\n').filter((l) => l.startsWith('- ')).join(' | ') : 'nessun problema finto'}`);
  esito(/giocatore teletrasportato: 1 volte/.test(r.dopo) && /vicini: /.test(r.dopo), 'giocatore spostato di colpo: nel rapporto, con la scena');
  // la segnalazione dal menu di pausa
  await pg.evaluate(() => { const g = window.__g, G = g.G; G.state = 'play'; g.pause(true); });
  await pg.click('#segnala'); await pg.click('#segArg button:nth-child(2)'); await pg.click('#segTesto'); await pg.keyboard.type('il portiere non para');
  const inPausa = await pg.evaluate(() => window.__g.G.paused);
  await pg.click('#segOk');
  const s = await pg.evaluate(() => ({ rap: window.__g.collaudo().rapporto(), stop: !document.querySelector('#stop').classList.contains('nas'), seg: !document.querySelector('#segnalaS').classList.contains('nas') }));
  esito(inPausa, 'scrivendo «p» nella segnalazione la partita resta in pausa');
  esito(/Portiere · «il portiere non para» · foto-1\.jpg/.test(s.rap) && /pallone a /.test(s.rap), 'segnalazione nel rapporto con argomento, testo, foto e scena');
  esito(s.stop && !s.seg, 'dopo «Salva» si torna alla pausa');
  // «Manda il rapporto»: Condividi riceve il testo e le foto
  const m = await pg.evaluate(async () => {
    let dati = null; navigator.share = async (d) => { dati = d; }; navigator.canShare = () => true;
    document.querySelector('#manda').click(); for (let i = 0; i < 50 && !dati; i++) await new Promise((ok) => setTimeout(ok, 50));
    const files = dati && dati.files ? dati.files.map((f) => `${f.name} ${f.size}`) : [];
    return { testo: dati && dati.text, files, dopo: window.__g.collaudo().quanti() };
  });
  esito(m.testo && /FANTATITANO · COLLAUDO/.test(m.testo) && m.files.some((f) => /^foto-1\.jpg [1-9]\d{3,}/.test(f)) && m.files.some((f) => /^rapporto\.txt/.test(f)), `Condividi riceve testo e foto (${m.files.join(', ')})`);
  esito(m.dopo === 0, 'dopo averlo mandato il rapporto ricomincia da zero');
  // un errore nella pagina finisce nel rapporto
  const e = await pg.evaluate(async () => { setTimeout(() => { throw new Error('prova di errore'); }); await new Promise((ok) => setTimeout(ok, 100)); return window.__g.collaudo().rapporto(); });
  esito(/errore nella pagina: 1 volte/.test(e) && /prova di errore/.test(e), 'un errore nella pagina finisce nel rapporto');
  const veri = errori.filter((x) => !/prova di errore/.test(x));
  if (veri.length) { ko++; console.log('errori nella pagina:', veri.slice(0, 3).join(' | ')); }
  console.log('\n' + r.pulito.split('\n').slice(0, 6).join('\n'));
  await br.close(); srv.close(); process.exit(ko ? 1 : 0);
});
