/* Rete di sicurezza: partite intere computer contro computer, con tutti i controlli che servono a capire se una modifica
   ha rotto qualcosa (anomalie) e se il gioco somiglia al calcio (misure confrontate con gli obiettivi).

   Uso: npm run build && node scripts/prove/partita.cjs [partite, 3] [difficoltà, normale]
     SEME=7          primo seme (le partite usano SEME, SEME+1, …: stesso seme, stessa partita)
     RAPPORTO=f.json salva tutte le misure, per confrontare prima e dopo una modifica
     SEVERO=1        esce con errore anche se una misura è fuori dagli obiettivi (di norma solo per le anomalie)
     MODULO=5-3-2    tutte e due le squadre giocano con quel modulo (i moduli che il computer da solo non sceglie)
     RIPETI=1        rigioca l'ultima partita due volte dopo un tocco sullo schermo e controlla che finisca identica
   Serve Playwright (non è tra le dipendenze): npm i --no-save playwright && npx playwright install chromium

   Anomalie (fanno fallire la prova): errori nella pagina, partita che non finisce, palla con numeri impossibili o sotto
   terra, giocatori che saltano più di 60 cm in un fotogramma, gesti bloccati, corpi sollevati o affondati, palla ferma
   a lungo senza nessuno che la va a prendere, giocatori a terra per più di 3 secondi. */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const root = path.join(__dirname, '..', '..', 'public');
const N = +process.argv[2] || 3, DIFFI = process.argv[3] || 'normale', SEME = +process.env.SEME || 7;

// Obiettivi per partita (somma delle due squadre): [minimo, massimo]. La partita dura 4 minuti di gioco (due tempi da
// 120 s, HALF_SECS in game.js): i numeri del calcio vero su 90 minuti si dividono per circa 20, con margine perché qui
// l'azione è più fitta (10 calci d'angolo a partita diventano 0,5; 4 fuorigioco 0,2). Il ritmo di tiri, contrasti e
// passaggi è quello di un gioco, non quello della realtà.
// Sono la direzione verso cui tarare l'IA; quelli ancora lontani escono segnati con ✗ ma non bloccano, salvo SEVERO=1.
// Gol e tiri sono l'obiettivo dato da Alex il 21/11 guardando Dream League: 2-3 gol e 10-12 tiri per squadra.
const OBIETTIVI = {
  gol: [4, 6],
  tiri: [20, 24],
  'passaggi riusciti %': [70, 90],
  angoli: [.3, 3],
  'rimesse laterali': [1.5, 12],
  'rimesse dal fondo': [.7, 8],
  falli: [.5, 6],
  fuorigioco: [.05, 1.5],
  'tenuta palla mediana s': [0.9, 2.2],
  'contrasti vinti': [4, 30],
  'portatore libero %': [20, 45],
};

const mime = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => {
  const u = q.url.split('?')[0], f = path.join(root, u === '/' ? 'index.html' : decodeURIComponent(u));
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' }); r.end(d); } });
});

/** Una partita intera nella pagina: ritorna misure e anomalie. Gira tutta dentro il browser (niente andata e ritorno). */
function partita([seme, diffi, casa, ospiti, modulo]) {
  const g = window.__g, G = g.G, hyp = Math.hypot, HL = 52.5, HW = 34;
  // Stesso seme, stessa partita: la simulazione ha i suoi numeri casuali, la grafica altri (crea oggetti e particelle in
  // quantità che dipendono da cosa c'era prima, e consumerebbe numeri della partita); il tempo riparte da zero
  g.prova(seme); G.paused = true; G.shown = true; G.t = 0; G.diff = g.DIFF[diffi];
  g.newMatch(window.CLUBS[casa], window.CLUBS[ospiti]); G.auto = true;
  // MODULO: tutte e due le squadre giocano con quel modulo (serve a provare i moduli che il computer da solo non sceglie)
  if (modulo) for (const t of G.teams) { t.formName = modulo.nome; t.form = modulo.pos; for (const p of t.players) p.role = modulo.roles[p.i]; }
  const disegna = g.renderer.render; g.renderer.render = () => {}; // si prepara tutto (scheletri, pose) ma non si disegna
  const draw = g.draw;
  const tutti = () => G.teams[0].players.concat(G.teams[1].players);
  const anomalie = {}, esempi = [], nota = (k, d) => { anomalie[k] = (anomalie[k] || 0) + 1; if (anomalie[k] <= 2) esempi.push(`${G.t.toFixed(1)}s ${k} ${d}`); };
  const ripartenze = {}, tenute = [], prima = new Map(), aTerra = new Map(), gestoDa = new Map();
  let stato = '', ferma = 0, tiene = null, liberi = 0, conPalla = 0, n = 0;
  while (G.state !== 'full' && n++ < 60000) {
    g.step(1 / 60); draw(1 / 60);
    const b = G.ball, o = b.owner, st = G.state;
    if (st !== stato) {
      if (st === 'restart') { const k = G.fk ? (G.fk.pen ? 'rigore' : 'punizione') : (G.tipoFermo || (document.querySelector('#banner') || {}).textContent || 'ripresa').trim().toLowerCase(); ripartenze[k] = (ripartenze[k] || 0) + 1; }
      stato = st;
    }
    if (!Number.isFinite(b.x + b.y + b.z + b.vx + b.vy + b.vz)) nota('palla con numeri impossibili', '');
    if (b.y < -0.05) nota('palla sotto terra', b.y.toFixed(2));
    if (Math.abs(b.x) > HL + 12 || Math.abs(b.z) > HW + 12) nota('palla lontanissima', `${b.x.toFixed(0)},${b.z.toFixed(0)}`);
    if (st === 'play') {
      // palla ferma e nessuno la va a prendere
      if (!o && hyp(b.vx, b.vz) < .4 && b.y < .3) { ferma += 1 / 60; if (Math.abs(ferma - 2) < .009) nota('palla ferma 2 s senza nessuno', `${b.x.toFixed(0)},${b.z.toFixed(0)}`); } else ferma = 0;
      // quanto tiene palla ogni giocatore di movimento (non il portiere) prima che la tocchi un altro: in conduzione la palla è
      // libera tra un tocco e l'altro, quel tempo non conta ma il possesso continua finché non la prende qualcun altro
      if (o && o !== (tiene && tiene.p)) { if (tiene) tenute.push(tiene.t); tiene = o.i ? { p: o, t: 0 } : null; }
      if (o && o.i) {
        tiene.t += 1 / 60; conPalla++;
        let d = 99; for (const q of o.team.opp.players) d = Math.min(d, hyp(q.x - o.x, q.z - o.z));
        if (d > 6) liberi++;
      }
      for (const p of tutti()) {
        const pp = prima.get(p);
        if (pp && hyp(p.x - pp[0], p.z - pp[1]) > .6) nota('giocatore teletrasportato', `${p.name} ${hyp(p.x - pp[0], p.z - pp[1]).toFixed(1)} m`);
        if (p.st === 'down' || p.stun > 0) { aTerra.set(p, (aTerra.get(p) || 0) + 1 / 60); if (Math.abs(aTerra.get(p) - 3) < .009) nota('giocatore a terra 3 s', p.name); } else aTerra.set(p, 0);
        if (p.fx) { const k = gestoDa.get(p); if (k && k[0] === p.fx) { k[1] += 1 / 60; if (Math.abs(k[1] - 2.5) < .009) nota('gesto bloccato 2,5 s', `${p.name} ${p.fx}`); } else gestoDa.set(p, [p.fx, 0]); } else gestoDa.delete(p);
        if (p.fig && p.fig.root && Math.abs(p.fig.body.position.y) > .5) nota('corpo sollevato o affondato', `${p.name} ${p.fig.body.position.y.toFixed(2)} ${p.fx || p.st}`);
      }
    } else if (tiene) { tenute.push(tiene.t); tiene = null; }
    for (const p of tutti()) prima.set(p, [p.x, p.z]);
  }
  g.renderer.render = disegna;
  if (G.state !== 'full') nota('partita non finita', G.state);
  const s = G.stats, somma = (k) => G.teams.reduce((a, t) => a + t.players.concat(t.out || []).reduce((x, p) => x + (p.s[k] || 0), 0), 0);
  const pa = somma('pa'), pc = somma('pc'), conta = (re) => Object.keys(ripartenze).filter((k) => re.test(k)).reduce((a, k) => a + ripartenze[k], 0);
  tenute.sort((a, b) => a - b);
  return {
    risultato: `${G.teams[0].club.name} ${G.teams[0].score}-${G.teams[1].score} ${G.teams[1].club.name}`,
    misure: {
      gol: G.teams[0].score + G.teams[1].score,
      tiri: s.shots[0] + s.shots[1],
      'passaggi riusciti %': pa ? Math.round(pc / pa * 100) : 0,
      angoli: s.corners[0] + s.corners[1],
      'rimesse laterali': conta(/laterale/),
      'rimesse dal fondo': conta(/fondo/),
      falli: s.fouls[0] + s.fouls[1],
      fuorigioco: s.offs[0] + s.offs[1],
      'tenuta palla mediana s': tenute.length ? +tenute[Math.floor(tenute.length / 2)].toFixed(2) : 0,
      'contrasti vinti': somma('tk'),
      'portatore libero %': conPalla ? Math.round(liberi / conPalla * 100) : 0,
    },
    ripartenze, anomalie, esempi,
  };
}

srv.listen(0, async () => {
  let MODULO = null;
  if (process.env.MODULO) { const { FORMS } = await import('../../src/config.js'), f = FORMS[process.env.MODULO]; if (!f) { console.log(`Modulo sconosciuto: ${process.env.MODULO} (ci sono ${Object.keys(FORMS).join(', ')})`); process.exit(2); } MODULO = { nome: process.env.MODULO, pos: f.pos, roles: f.roles }; }
  const br = await chromium.launch(), pg = await br.newPage(), errori = [];
  pg.on('pageerror', (e) => errori.push(String(e)));
  await pg.goto(`http://localhost:${srv.address().port}/`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await pg.waitForFunction(() => window.__g && !document.querySelector('#carica'), null, { timeout: 90000 });
  // il ciclo dei fotogrammi del gioco si ferma: tra una partita e l'altra disegnerebbe a tempo vero e le animazioni
  // (che decidono anche alcuni tempi del gioco) partirebbero ogni volta da un punto diverso
  await pg.evaluate(() => new Promise((ok) => { window.requestAnimationFrame = () => 0; setTimeout(ok, 100); }));
  const partite = [], t0 = Date.now();
  for (let k = 0; k < N; k++) {
    const r = await pg.evaluate(partita, [SEME + k, DIFFI, (k * 3) % 16, (k * 5 + 7) % 16, MODULO]);
    partite.push(r);
    const an = Object.entries(r.anomalie).map(([a, v]) => `${a} ×${v}`).join(', ');
    console.log(`${k + 1}. ${r.risultato}  ·  ${Object.entries(r.misure).map(([a, v]) => `${a} ${v}`).join(' · ')}${an ? `\n   ANOMALIE: ${an}\n   ${r.esempi.join('\n   ')}` : ''}`);
  }
  // RIPETI=1: l'ultima partita si rigioca due volte dopo un tocco sullo schermo (che fuori dalla modalità di prova accende
  // l'audio): deve finire uguale in ogni numero. È la prova che la simulazione è ripetibile. La prima partita dopo il
  // caricamento della pagina resta fuori dal confronto: è sempre uguale a sé stessa a pagina appena caricata, ma differisce
  // dalle successive per arrotondamenti nelle pose dei giocatori (vedi docs/RICETTE.md)
  let diversa = false;
  if (process.env.RIPETI) {
    await pg.mouse.click(200, 200); await pg.keyboard.press('Shift');
    const k = N - 1, dati = [SEME + k, DIFFI, (k * 3) % 16, (k * 5 + 7) % 16, MODULO], chiave = (r) => JSON.stringify([r.risultato, r.misure, r.ripartenze]);
    const r1 = await pg.evaluate(partita, dati), r2 = await pg.evaluate(partita, dati), uguale = chiave(r1) === chiave(r2) && (N < 2 || chiave(r1) === chiave(partite[k]));
    diversa = !uguale; console.log(`${uguale ? '✓' : '✗'} ultima partita rigiocata due volte dopo un tocco: ${uguale ? 'identica' : `DIVERSA (${r1.risultato} · ${JSON.stringify(r1.misure)} · ${r2.risultato} · ${JSON.stringify(r2.misure)})`}`);
  }
  // media delle misure e confronto con gli obiettivi
  console.log(`\nMedia su ${N} partite (${DIFFI}, semi ${SEME}–${SEME + N - 1}, ${((Date.now() - t0) / 1000).toFixed(0)} s):`);
  let fuori = 0;
  for (const [k, [lo, hi]] of Object.entries(OBIETTIVI)) {
    const m = partite.reduce((a, r) => a + r.misure[k], 0) / N, ok = m >= lo && m <= hi;
    if (!ok) fuori++;
    console.log(`  ${ok ? '✓' : '✗'} ${k.padEnd(24)} ${m.toFixed(2).padStart(6)}   obiettivo ${lo}–${hi}`);
  }
  const anomalie = partite.reduce((a, r) => a + Object.values(r.anomalie).reduce((x, y) => x + y, 0), 0);
  const unici = [...new Set(errori)];
  console.log(`\nAnomalie: ${anomalie}  ·  errori nella pagina: ${unici.length}${unici.length ? `\n  ${unici.slice(0, 5).join('\n  ')}` : ''}  ·  misure fuori obiettivo: ${fuori}`);
  if (process.env.RAPPORTO) fs.writeFileSync(process.env.RAPPORTO, JSON.stringify({ diffi: DIFFI, seme: SEME, partite, errori: unici }, null, 1));
  await br.close(); srv.close();
  process.exitCode = anomalie || unici.length || diversa || (process.env.SEVERO && fuori) ? 1 : 0;
});
