/* Diagnosi (la sorella larga di partita.cjs): le stesse partite e le stesse anomalie, più dove finiscono i possessi, i
   passaggi per distanza e per libertà di chi riceve, i tempi a palla ferma, i tiri per squadra, falli ed energia. In fondo
   una riga «RIGA» da mettere in tabella. Uso: node scripts/prove/diagnosi.cjs [partite] [difficoltà]. RADICE=cartella per
   misurare un'altra copia già costruita (quattro copie in parallelo: 32 partite ciascuna in 13 minuti).

   Rete di sicurezza: partite intere computer contro computer, con tutti i controlli che servono a capire se una modifica
   ha rotto qualcosa (anomalie) e se il gioco somiglia al calcio (misure confrontate con gli obiettivi).

   Uso: npm run build && node scripts/prove/partita.cjs [partite, 3] [difficoltà, normale]
     SEME=7          primo seme (le partite usano SEME, SEME+1, …: stesso seme, stessa partita)
     RAPPORTO=f.json salva tutte le misure, per confrontare prima e dopo una modifica
     SEVERO=1        esce con errore anche se una misura è fuori dagli obiettivi (di norma solo per le anomalie)
   Serve Playwright (non è tra le dipendenze): npm i --no-save playwright && npx playwright install chromium

   Anomalie (fanno fallire la prova): errori nella pagina, partita che non finisce, palla con numeri impossibili o sotto
   terra, giocatori che saltano più di 60 cm in un fotogramma, gesti bloccati, corpi sollevati o affondati, palla ferma
   a lungo senza nessuno che la va a prendere, giocatori a terra per più di 3 secondi. */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const root = process.env.RADICE || path.join(__dirname, '../../public');
const N = +process.argv[2] || 3, DIFFI = process.argv[3] || 'normale', SEME = +process.env.SEME || 7;

// Obiettivi per partita (somma delle due squadre): [minimo, massimo]. La partita dura 4 minuti di gioco (due tempi da
// 120 s, HALF_SECS in game.js): i numeri del calcio vero su 90 minuti si dividono per circa 20, con margine perché qui
// l'azione è più fitta (10 calci d'angolo a partita diventano 0,5; 4 fuorigioco 0,2). Il ritmo di tiri, contrasti e
// passaggi è quello di un gioco, non quello della realtà.
// Sono la direzione verso cui tarare l'IA; quelli ancora lontani escono segnati con ✗ ma non bloccano, salvo SEVERO=1.
const OBIETTIVI = {
  gol: [1, 6],
  tiri: [7, 30],
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
function partita([seme, diffi, casa, ospiti]) {
  const g = window.__g, G = g.G, hyp = Math.hypot, HL = 52.5, HW = 34;
  // Stesso seme, stessa partita: la simulazione ha i suoi numeri casuali, la grafica altri (crea oggetti e particelle in
  // quantità che dipendono da cosa c'era prima, e consumerebbe numeri della partita); il tempo riparte da zero
  const caso = (x) => () => (x = (x * 16807) % 2147483647) / 2147483647, gioco = caso(seme), grafica = caso(seme + 7919);
  Math.random = caso(seme + 104729); G.paused = true; G.shown = true; G.t = 0; G.diff = g.DIFF[diffi];
  g.newMatch(window.CLUBS[casa], window.CLUBS[ospiti]); G.auto = true; Math.random = gioco;
  const disegna = g.renderer.render; g.renderer.render = () => {}; // si prepara tutto (scheletri, pose) ma non si disegna
  const draw = (dt) => { Math.random = grafica; g.draw(dt); Math.random = gioco; };
  const tutti = () => G.teams[0].players.concat(G.teams[1].players);
  const anomalie = {}, esempi = [], nota = (k, d) => { anomalie[k] = (anomalie[k] || 0) + 1; if (anomalie[k] <= 2) esempi.push(`${G.t.toFixed(1)}s ${k} ${d}`); };
  const ripartenze = {}, tenute = [], prima = new Map(), aTerra = new Map(), gestoDa = new Map();
  let stato = '', ferma = 0, tiene = null, liberi = 0, conPalla = 0, n = 0;
  const poss = [], tiriD = []; let cur = null, sid = G.shotId;
  const passi = []; let ps = null, lpPrima = null; const tempi = {}; let stPrima = '';
  const chiudi = (come) => { if (cur) { cur.fine = come; cur.ult = null; if (come === 'persa') cur.fine = 'persa:' + (cur.vol || 'contrasto') + (cur.gk && cur.n === 1 ? ' del portiere' : ''); cur.tiri = G.stats.shots[cur.k] - cur.t0; cur.dur = G.t - cur.da; poss.push(cur); cur = null; } };
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
    if (G.shotId !== sid) { sid = G.shotId; const sh = G.shooter; if (sh && !G.so) tiriD.push([+Math.hypot(sh.team.side * HL - sh.x, sh.z).toFixed(1), G.t, sh.team.idx, G.teams[0].score + G.teams[1].score]); }
    { const lp = G.lastPass;
      if (lp && lp !== lpPrima && !o && st === 'play') { const m = G.intended; ps = { k: lp.team.idx, x0: b.x, z0: b.z, tx: m ? m.x : b.x, tz: m ? m.z : b.z, alto: 0, zona: b.x * lp.team.side > 0 ? 'att' : 'dif', pr: 9 }; ps.d = hyp(ps.tx - ps.x0, ps.tz - ps.z0); ps.lib = 99; if (m) for (const q of lp.team.opp.players) ps.lib = Math.min(ps.lib, hyp(q.x - m.x, q.z - m.z)); ps.mv = m ? hyp(m.vx, m.vz) > 2.5 : false; ps.av = (ps.tx - ps.x0) * lp.team.side; for (const q of lp.team.opp.players) ps.pr = Math.min(ps.pr, hyp(q.x - lp.x, q.z - lp.z)); }
      lpPrima = lp;
      if (ps) {
        if (b.y > 1.2) ps.alto = 1;
        const f = () => hyp(b.x - ps.x0, b.z - ps.z0) / (ps.d || 1);
        let es = null;
        if (st !== 'play') es = 'fuori'; else if (o) es = o.team.idx === ps.k ? 'ok' : (f() < .3 ? 'int vicino a chi passa' : f() < .8 ? 'int a metà' : 'int su chi riceve');
        else if (!lp && G.lastTouch && G.lastTouch.team.idx !== ps.k) es = f() < .3 ? 'dev vicino a chi passa' : f() < .8 ? 'dev a metà' : 'dev su chi riceve';
        if (es) { ps.es = es; passi.push(ps); ps = null; }
      }
    }
    { const dtp = 1 / 60, add = (k, v = dtp) => { tempi[k] = (tempi[k] || 0) + v; };
      const tipoF = () => st === 'restart' ? (G.fk ? (G.fk.pen ? 'rigore' : 'punizione') : ((G.tipoFermo || 'ripresa').trim().toLowerCase())) : st;
      if (st !== 'play') { add('fermo:' + tipoF()); if (st !== stPrima) add('n:' + tipoF(), 1); }
      else if (o && ((G.rimessa && G.rimessa.chi === o) || o.cornerKick || o.fkShot)) add('battitore fermo (in gioco)');
      stPrima = st;
      if (st !== 'play') {} else
      if (st === 'play' && o && !((G.rimessa && G.rimessa.chi === o) || o.cornerKick || o.fkShot)) { const xs = b.x * o.team.side, z = xs < 0 ? 'A' : xs < 17.5 ? 'B' : xs < 36 ? 'C' : 'D'; if (o.i === 0) add('portiere con palla'); else { add('porta palla ' + z); add('avanza m', o.vx * o.team.side * dtp); add('fermo a decidere', Math.hypot(o.vx, o.vz) < 1.5 ? dtp : 0); } }
      else if (st === 'play' && !o) { const lp = G.lastPass; add(lp ? 'passaggio in viaggio' : G.shooter && G.shotId === sid && Math.hypot(b.vx, b.vz) > 8 ? 'tiro in viaggio' : 'palla vagante'); }
    }
    if (st === 'play') {
      if (o) { const k = o.team.idx; if (!cur || cur.k !== k) { chiudi('persa'); cur = { k, t0: G.stats.shots[k], da: G.t, xm: -99, n: 0, gk: o.i === 0, ult: null, vol: '' }; } cur.xm = Math.max(cur.xm, b.x * o.team.side); if (cur.ult !== o) { cur.ult = o; cur.n++; } cur.vol = ''; cur.xu = b.x * o.team.side; }
      else if (cur) { const lp = G.lastPass; cur.vol = lp && lp.team.idx === cur.k ? (b.y > 1.2 || cur.alto ? 'passaggio alto' : 'passaggio') : (cur.vol || 'palla sfuggita'); if (b.y > 1.2) cur.alto = 1; }
      if (o && cur) cur.alto = 0;
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
    } else { if (tiene) { tenute.push(tiene.t); tiene = null; } chiudi(st + ':' + (G.tipoFermo || (G.fk ? 'punizione' : ''))); }
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
    energia: (() => { const e = tutti().map((p) => p.en * 100); return [e.reduce((x, y) => x + y, 0) / e.length, Math.min(...e)]; })(),
    tiriSq: [s.shots[0], s.shots[1]],
    ripartenze, anomalie, esempi, passi, poss, tempi, tiriD, gioco: G.t, golFinali: G.teams[0].score + G.teams[1].score,
  };
}

srv.listen(0, async () => {
  const br = await chromium.launch(), pg = await br.newPage(), errori = [];
  pg.on('pageerror', (e) => errori.push(String(e)));
  await pg.goto(`http://localhost:${srv.address().port}/`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await pg.waitForFunction(() => window.__g && !document.querySelector('#carica'), null, { timeout: 90000 });
  // il ciclo dei fotogrammi del gioco si ferma: tra una partita e l'altra disegnerebbe a tempo vero e le animazioni
  // (che decidono anche alcuni tempi del gioco) partirebbero ogni volta da un punto diverso
  await pg.evaluate(() => new Promise((ok) => { window.requestAnimationFrame = () => 0; setTimeout(ok, 100); }));
  const partite = [], t0 = Date.now();
  for (let k = 0; k < N; k++) {
    const r = await pg.evaluate(partita, [SEME + k, DIFFI, (k * 3) % 16, (k * 5 + 7) % 16]);
    partite.push(r);
    const an = Object.entries(r.anomalie).map(([a, v]) => `${a} ×${v}`).join(', ');
    console.log(`${k + 1}. ${r.risultato}  ·  ${Object.entries(r.misure).map(([a, v]) => `${a} ${v}`).join(' · ')}${an ? `\n   ANOMALIE: ${an}\n   ${r.esempi.join('\n   ')}` : ''}`);
  }
  {
    const P = partite.flatMap((r) => r.poss), nP = partite.length, fascia = (x) => x < 0 ? 'A propria metà' : x < 17.5 ? 'B centro' : x < 36 ? 'C trequarti' : 'D area';
    const tab = {}; for (const p of P) { const f = fascia(p.xm), k = p.tiri ? 'tiro' : p.fine; (tab[f] = tab[f] || {})[k] = ((tab[f] || {})[k] || 0) + 1; }
    console.log('\nPossessi per partita: ' + (P.length / nP).toFixed(1) + '  durata media s ' + (P.reduce((a, p) => a + p.dur, 0) / P.length).toFixed(1));
    for (const f of Object.keys(tab).sort()) console.log('  ' + f.padEnd(16) + Object.entries(tab[f]).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ' + (v / nP).toFixed(1)).join(' · '));
    { const Q = partite.flatMap((r) => r.passi), gr = {}; for (const p of Q) { const k = (p.alto ? 'alto ' : 'raso ') + p.zona + (p.d < 12 ? ' corto' : p.d < 25 ? ' medio' : ' lungo'); (gr[k] = gr[k] || {})[p.es] = ((gr[k] || {})[p.es] || 0) + 1; }
      console.log('  passaggi per partita: ' + (Q.length / nP).toFixed(1) + ', riusciti ' + Math.round(Q.filter((p) => p.es === 'ok').length / Q.length * 100) + '%; con avversario entro 2 m da chi passa: ' + Math.round(Q.filter((p) => p.pr < 2).length / Q.length * 100) + '% (riusciti ' + Math.round(Q.filter((p) => p.pr < 2 && p.es === 'ok').length / Math.max(1, Q.filter((p) => p.pr < 2).length) * 100) + '%)');
      for (const k of Object.keys(gr).sort()) { const tot = Object.values(gr[k]).reduce((a, b) => a + b, 0); console.log('    ' + k.padEnd(18) + (tot / nP).toFixed(1).padStart(5) + '  ' + Object.entries(gr[k]).sort((a, b) => b[1] - a[1]).map(([e, v]) => e + ' ' + Math.round(v / tot * 100) + '%').join(' · ')); } }
    { const tt = {}; for (const r of partite) for (const [k, v] of Object.entries(r.tempi)) tt[k] = (tt[k] || 0) + v / nP;
      console.log('  tempi per partita (s): ' + Object.entries(tt).sort((x, y) => y[1] - x[1]).map(([k, v]) => k + ' ' + v.toFixed(1)).join(' · '));
      console.log('  uomini per possesso: ' + (P.reduce((x, p) => x + p.n, 0) / P.length).toFixed(2) + ' · possessi che arrivano oltre la trequarti: ' + (P.filter((p) => p.xm >= 17.5).length / nP).toFixed(1) + ' · durata di quelli col tiro: ' + (P.filter((p) => p.tiri).reduce((x, p) => x + p.dur, 0) / (P.filter((p) => p.tiri).length || 1)).toFixed(1)); }
    { const Q = partite.flatMap((r) => r.passi).filter((p) => !p.alto), riga = (nome, f) => { const q = Q.filter(f); return nome + ' ' + (q.length / nP).toFixed(1) + ' ok ' + Math.round(q.filter((p) => p.es === 'ok').length / (q.length || 1) * 100) + '%'; };
      console.log('  rasoterra per libertà di chi riceve (avversario più vicino): ' + [['<2 m', (p) => p.lib < 2], ['2-4 m', (p) => p.lib >= 2 && p.lib < 4], ['4-7 m', (p) => p.lib >= 4 && p.lib < 7], ['>7 m', (p) => p.lib >= 7]].map(([n, f]) => riga(n, f)).join(' · '));
      console.log('  rasoterra a chi è fermo: ' + riga('', (p) => !p.mv) + ' · a chi corre: ' + riga('', (p) => p.mv) + ' · in avanti di almeno 8 m: ' + riga('', (p) => p.av > 8) + ' · indietro o di lato: ' + riga('', (p) => p.av <= 2)); }
    const T = partite.flatMap((r) => r.tiriD), ist = [0, 0, 0, 0]; for (const [d] of T) ist[d < 12 ? 0 : d < 18 ? 1 : d < 25 ? 2 : 3]++;
    console.log('  tiri per distanza (<12, 12-18, 18-25, >25): ' + ist.map((v) => (v / nP).toFixed(1)).join(' · '));
  }
  // media delle misure e confronto con gli obiettivi
  console.log(`\nMedia su ${N} partite (${DIFFI}, semi ${SEME}–${SEME + N - 1}, ${((Date.now() - t0) / 1000).toFixed(0)} s):`);
  let fuori = 0;
  for (const [k, [lo, hi]] of Object.entries(OBIETTIVI)) {
    const m = partite.reduce((a, r) => a + r.misure[k], 0) / N, ok = m >= lo && m <= hi;
    if (!ok) fuori++;
    console.log(`  ${ok ? '✓' : '✗'} ${k.padEnd(24)} ${m.toFixed(2).padStart(6)}   obiettivo ${lo}–${hi}`);
  }
  { const P = partite.flatMap((r) => r.poss), m = (k) => partite.reduce((a, r) => a + r.misure[k], 0) / N, tt = {}; for (const r of partite) for (const [k, v] of Object.entries(r.tempi)) tt[k] = (tt[k] || 0) + v / N;
    const fermo = Object.entries(tt).filter(([k]) => k.startsWith('fermo:') && !/half|full/.test(k)).reduce((a, [, v]) => a + v, 0), gioco = Object.entries(tt).filter(([k]) => !/^(fermo:|n:|avanza|fermo a)/.test(k)).reduce((a, [, v]) => a + v, 0);
    console.log('\nPalla ferma, secondi per partita (e quante volte): ' + Object.entries(tt).filter(([k]) => k.startsWith('fermo:')).sort((x, y) => y[1] - x[1]).map(([k, v]) => k.slice(6) + ' ' + v.toFixed(1) + ' (' + (tt['n:' + k.slice(6)] || 0).toFixed(1) + ')').join(' · '));
    console.log('RIGA gol ' + m('gol').toFixed(2) + ' | tiri ' + m('tiri').toFixed(2) + ' (casa ' + (partite.reduce((x, r) => x + r.tiriSq[0], 0) / N).toFixed(2) + ', ospiti ' + (partite.reduce((x, r) => x + r.tiriSq[1], 0) / N).toFixed(2) + ')' + ' | possessi ' + (P.length / N).toFixed(1) + ' | oltre trequarti ' + (P.filter((p) => p.xm >= 17.5).length / N).toFixed(1) + ' | falli ' + m('falli').toFixed(2) + ' | energia ' + (partite.reduce((a, r) => a + r.energia[0], 0) / N).toFixed(0) + ' (minima ' + (partite.reduce((a, r) => a + r.energia[1], 0) / N).toFixed(0) + ') | passaggi ' + m('passaggi riusciti %').toFixed(0) + '% | in gioco s ' + gioco.toFixed(0) + ' | fermo s ' + fermo.toFixed(0) + ' | portiere con palla s ' + (tt['portiere con palla'] || 0).toFixed(1) + ' | battitore fermo s ' + (tt['battitore fermo (in gioco)'] || 0).toFixed(1)); }
  const anomalie = partite.reduce((a, r) => a + Object.values(r.anomalie).reduce((x, y) => x + y, 0), 0);
  const unici = [...new Set(errori)];
  console.log(`\nAnomalie: ${anomalie}  ·  errori nella pagina: ${unici.length}${unici.length ? `\n  ${unici.slice(0, 5).join('\n  ')}` : ''}  ·  misure fuori obiettivo: ${fuori}`);
  if (process.env.RAPPORTO) fs.writeFileSync(process.env.RAPPORTO, JSON.stringify({ diffi: DIFFI, seme: SEME, partite, errori: unici }, null, 1));
  await br.close(); srv.close();
  process.exitCode = anomalie || unici.length || (process.env.SEVERO && fuori) ? 1 : 0;
});
