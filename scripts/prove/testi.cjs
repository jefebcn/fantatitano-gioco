/* Confronto dei testi: apre il gioco costruito, passa da tutte le schermate e salva in un file JSON quello che c'è scritto
   (testo visibile, testo completo, etichette per chi non vede, campi da compilare, avvisi). Serve quando si toccano i testi
   (src/testi.js) o le schermate: si salva prima, si salva dopo, si confronta. Devono risultare identici.

   Uso:
     npm run build && node scripts/prove/testi.cjs salva prima.json
     ... si modifica il codice ...
     npm run build && node scripts/prove/testi.cjs salva dopo.json
     node scripts/prove/testi.cjs confronta prima.json dopo.json     (esce con errore se c'è una differenza)
     node scripts/prove/testi.cjs chiavi     (senza browser: ogni chiave usata nel codice e nella pagina esiste in src/testi.js?)
   RADICE=cartella  usa un'altra cartella al posto di public/ (per esempio una copia del gioco costruito prima).
   Serve Playwright (non è tra le dipendenze): npm i --no-save playwright && npx playwright install chromium

   Perché il confronto sia esatto: la data della pagina è fissa (mercoledì 18 novembre 2026, ore 10), i numeri casuali
   hanno un seme dove decidono qualcosa che si legge (calendario, nome a caso), le partite sono simulate a passi fissi come
   in scripts/prove/partita.cjs, l'audio è spento e le chiamate all'account sono finte. Dura una decina di minuti.
   Non è nella CI: si lancia a mano. */
const http = require('http'), fs = require('fs'), path = require('path');

const [, , cosa, f1, f2] = process.argv;
if (cosa === 'confronta') { confronta(f1, f2); return; }
if (cosa === 'chiavi') { chiavi(); return; }
if (cosa !== 'salva' || !f1) { console.log('Uso: node scripts/prove/testi.cjs salva <file.json>  |  confronta <prima.json> <dopo.json>  |  chiavi'); process.exit(2); }

/** Le chiavi scritte nel codice (t('…'), tr('…'), elenco('…') in carriera.js, anche nelle scelte «a ? 'x' : 'y'») e nella pagina (data-t…) devono
 *  esistere tutte nell'italiano; quelle che nessuno usa vengono elencate, e ogni altra lingua deve avere chiavi note. */
async function chiavi() {
  const src = path.join(__dirname, '..', '..', 'src'), { TESTI, LINGUE } = await import('file://' + path.join(src, 'testi.js'));
  const usate = new Set(), note = new Set(Object.keys(TESTI.it));
  for (const f of ['game.js', 'carriera.js', 'cloud.js', 'regia.js']) {
    // dentro una chiamata t(...) o tr(...) tutte le stringhe fatte come una chiave (parola.parola) prima della virgola o della parentesi
    for (const m of fs.readFileSync(path.join(src, f), 'utf8').matchAll(/\b(?:t|tr|elenco)\(((?:[^()',]|'[^']*'|\((?:[^()']|'[^']*')*\))*)/g)) for (const k of m[1].matchAll(/'([a-zA-Z]+\.[a-zA-Z0-9]+)'/g)) usate.add(k[1]);
  }
  for (const m of fs.readFileSync(path.join(src, 'pagina.html'), 'utf8').matchAll(/\sdata-t(?:h|-aria|-placeholder|-title|-alt)?="([^"]+)"/g)) usate.add(m[1]);
  const mancano = [...usate].filter((k) => !note.has(k)), inutili = [...note].filter((k) => !usate.has(k));
  let estranee = 0; for (const l of LINGUE) for (const k of Object.keys(TESTI[l] || {})) if (!note.has(k)) { estranee++; console.log(`✗ ${l}: «${k}» non esiste in italiano`); }
  for (const k of mancano) console.log(`✗ manca in src/testi.js: ${k}`);
  for (const k of inutili) console.log(`· non usata: ${k}`);
  console.log(`${note.size} chiavi in italiano, ${usate.size} usate, ${mancano.length} mancanti, ${inutili.length} non usate`);
  process.exitCode = mancano.length || estranee ? 1 : 0;
}

function confronta(a, b) {
  const A = JSON.parse(fs.readFileSync(a, 'utf8')), B = JSON.parse(fs.readFileSync(b, 'utf8'));
  const nomi = [...new Set([...Object.keys(A.schermate), ...Object.keys(B.schermate)])]; let diversi = 0;
  for (const n of nomi) {
    const x = A.schermate[n], y = B.schermate[n];
    if (!x || !y) { diversi++; console.log(`✗ ${n}: c'è solo ${x ? 'nel primo' : 'nel secondo'}`); continue; }
    const sx = JSON.stringify(x), sy = JSON.stringify(y); if (sx === sy) continue;
    diversi++; let i = 0; while (i < sx.length && sx[i] === sy[i]) i++;
    console.log(`✗ ${n}\n   prima: …${sx.slice(Math.max(0, i - 60), i + 100)}\n   dopo:  …${sy.slice(Math.max(0, i - 60), i + 100)}`);
  }
  // un salvataggio interrotto a metà non vale: il confronto fallisce anche se le schermate salvate sono uguali
  const rotti = [[a, A], [b, B]].filter(([, x]) => (x.errori || []).length); for (const [f, x] of rotti) console.log(`✗ ${f} ha errori: ${x.errori.join(' | ')}`);
  console.log(`${nomi.length} schermate confrontate, differenze: ${diversi}`);
  process.exitCode = diversi || rotti.length ? 1 : 0;
}

const { chromium } = require('playwright');
const root = process.env.RADICE ? path.resolve(process.env.RADICE) : path.join(__dirname, '..', '..', 'public');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => {
  const u = q.url.split('?')[0], f = path.join(root, u === '/' ? 'index.html' : decodeURIComponent(u));
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' }); r.end(d); } });
});

/** Gira nella pagina prima di tutto il resto: data fissa, numeri casuali col seme, lettura di quello che c'è scritto. */
function preparaPagina() {
  const Vera = Date, FISSO = new Vera(2026, 10, 18, 10, 0, 0).getTime();
  class Finta extends Vera { constructor(...a) { if (a.length) super(...a); else super(FISSO); } static now() { return FISSO; } }
  window.Date = Finta;
  window.__caso = (x) => () => (x = (x * 16807) % 2147483647) / 2147483647;
  window.__random = Math.random;
  // il gioco aspetta l'account al massimo 8 secondi: su una macchina lenta il caricamento li supera e l'account resta
  // «spento» una volta sì e una no. Qui quell'attesa non scade mai, così l'account risulta sempre raggiungibile
  const aspetta = window.setTimeout; window.setTimeout = (f, ms, ...a) => aspetta(f, ms === 8000 ? 6e5 : ms, ...a);
  // niente audio: i suoni pescano dagli stessi numeri casuali della partita, e quanti ne pescano dipende dal tempo vero.
  // Con l'audio acceso (basta un tocco su un pulsante) la stessa partita simulata finirebbe ogni volta in modo diverso
  window.AudioContext = window.webkitAudioContext = undefined;
  window.__leggi = () => {
    const vis = [...document.querySelectorAll('.scr:not(.nas), #hud:not(.nas)')], pulito = (s) => s.replace(/\s+/g, ' ').trim();
    const attributi = [], campi = [];
    for (const r of vis) {
      for (const e of r.querySelectorAll('[aria-label],[placeholder],[title],[alt]')) for (const a of ['aria-label', 'placeholder', 'title', 'alt']) { const v = e.getAttribute(a); if (v) attributi.push(`${e.id ? '#' + e.id + ' ' : ''}${a}=${v}`); }
      for (const e of r.querySelectorAll('input')) campi.push(`${e.id || e.dataset.vol || ''}=${e.value}`);
    }
    return { visibile: vis.map((e) => `#${e.id}\n${e.innerText}`), tutto: vis.map((e) => `#${e.id} ${pulito(e.textContent)}`), attributi, campi, avviso: document.querySelector('#avviso').textContent, titolo: document.title };
  };
}

/** Una partita simulata a passi fissi, tutta dentro la pagina: la squadra dell'utente la guida il computer. Tiene il
 *  registro delle scritte in campo (striscione, tipo di palla ferma, rigori, riquadro del gol) nell'ordine in cui escono.
 *  opz.fine: dopo quanti passi si salta alla fine del secondo tempo (0 = partita intera); opz.punti: il risultato da mettere.
 *  opz.forzate: a passi fissi succedono le cose rare, per leggerne le scritte: un autogol, un'espulsione, due falli coi
 *  numeri casuali scelti perché escano cartellino o infortunio, un rigore. */
function partitaFinta(opz) {
  const g = window.__g, G = g.G, caso = window.__caso, gioco = caso(opz.seme), grafica = caso(opz.seme + 7919), q = (s) => { const e = document.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : ''; };
  Math.random = caso(opz.seme + 104729); G.paused = false; G.shown = false; G.t = 0; G.diff = g.DIFF.normale;
  g.newMatch(g.club(g.sel.mia), g.club(g.sel.loro)); G.auto = true; Math.random = gioco;
  document.querySelector('#hud').classList.remove('nas'); for (const s of document.querySelectorAll('.scr')) s.classList.add('nas');
  const disegna = g.renderer.render; g.renderer.render = () => {};
  const registro = []; let ultimo = '', n = 0;
  const nota = () => {
    const riga = JSON.stringify({ stato: G.state, striscione: [q('#banner .t'), q('#banner .s'), document.querySelector('#banner').dataset.c || ''], fermo: G.state === 'restart' ? G.tipoFermo || '' : '', rigori: q('#rig'), gol: q('#golc'), salta: q('#salta'), rep: q('#rep') });
    if (riga !== ultimo) { ultimo = riga; registro.push(JSON.parse(riga)); }
  };
  // i numeri casuali di una cosa forzata: quelli dati, poi sempre mezzo
  const coda = (v) => () => (v.length ? v.shift() : .5), con = (v, f) => { Math.random = coda(v); f(); Math.random = gioco; };
  const A = G.teams[0], B = G.teams[1], forzate = {
    150: () => { const b = G.ball; b.owner = null; b.x = B.side * 52.7; b.z = .5; b.y = .4; b.vx = B.side * 3; b.vy = b.vz = 0; G.lastKicker = null; G.lastTouch = A.players[4]; },
    1500: () => con([0, 0, 0], () => g.foul(B.players[5], A.players[9], true, true, true)),
    2100: () => con([.99, .99, 0, 0], () => g.foul(B.players[6], A.players[8], false, false, false)),
    2500: () => con([.99, 0, 0, 0], () => g.foul(A.players[3], B.players[B.players.length - 1], true, false, false)),
    2900: () => g.penalty(A),
  };
  while (!G.shown && n++ < 90000) {
    if (opz.forzate && forzate[n] && G.state === 'play') forzate[n]();
    g.step(1 / 60); Math.random = grafica; g.draw(1 / 60); Math.random = gioco; nota();
    if (opz.fine && n === opz.fine) { G.half = 2; G.clock = 1e4; if (opz.punti) { G.teams[0].score = opz.punti[0]; G.teams[1].score = opz.punti[1]; } }
  }
  g.renderer.render = disegna; Math.random = window.__random;
  return { finita: G.shown, passi: n, registro, gol: G.goals.map((x) => x.name) };
}

srv.listen(0, async () => {
  const br = await chromium.launch(), cx = await br.newContext({ viewport: { width: 844, height: 390 } }), pg = await cx.newPage(), errori = [], schermate = {};
  pg.on('pageerror', (e) => errori.push(String(e)));
  await pg.addInitScript(preparaPagina);
  // l'account: nessuna chiamata vera. La risposta all'accesso la decide `accesso` (una risposta d'errore o la rete che manca)
  let accesso = null;
  await pg.route(/supabase\.co/, (r) => (accesso && /token/.test(r.request().url()) ? r.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify(accesso) }) : r.abort()));
  const carica = async () => { await pg.goto(`http://localhost:${srv.address().port}/`, { waitUntil: 'domcontentloaded', timeout: 90000 }); await pg.waitForFunction(() => window.__g && !document.querySelector('#carica') && window.__g.CLOUD.info().stato === 'fuori', null, { timeout: 90000 }); await pg.waitForTimeout(400); };
  const scatta = async (nome, extra) => { if (schermate[nome]) throw new Error(`nome doppio: ${nome}`); await pg.waitForTimeout(60); schermate[nome] = { ...(await pg.evaluate(() => window.__leggi())), ...(extra || {}) }; };
  // tocca un elemento (seme: i numeri casuali di quel tocco partono da lì); n sceglie tra più elementi uguali
  const tocca = async (sel, seme = 0, n = 0) => {
    await pg.evaluate(([s, seme, n]) => { const b = document.querySelectorAll(s)[n]; if (!b) throw new Error('manca ' + s); if (seme) Math.random = window.__caso(seme); b.click(); if (seme) Math.random = window.__random; }, [sel, seme, n]);
    await pg.waitForTimeout(60);
  };
  const premi = async (sel, n = 0) => { await pg.evaluate(([s, n]) => { const b = document.querySelectorAll(s)[n]; if (!b) throw new Error('manca ' + s); b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true })); }, [sel, n]); await pg.waitForTimeout(60); };
  const scrivi = async (sel, v) => { await pg.evaluate(([s, v]) => { const e = document.querySelector(s); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); }, [sel, v]); };
  const c = (s) => `#panC ${s}`;
  try {
    /* ---------- senza carriera: menu, nuovo club, amichevole */
    await carica(); await pg.evaluate(() => localStorage.clear()); await carica();
    await scatta('menu');
    await tocca('#hAcc'); await scatta('menu-account');
    await pg.evaluate(() => { document.querySelector('#accEmail').value = 'prova@example.com'; document.querySelector('#accPw').value = 'sbagliata'; });
    for (const [nome, risposta] of [['account-rete', null], ['account-sbagliata', { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' }], ['account-conferma', { code: 400, error_code: 'email_not_confirmed', msg: 'Email not confirmed' }], ['account-altro', { code: 400, error_code: 'boh', msg: 'Qualcosa' }]]) {
      accesso = risposta; await tocca(c('[data-az="accedi"]')); await pg.waitForFunction(() => { const e = document.querySelector('#accErr'); return e && e.textContent && !/…$/.test(e.textContent); }, null, { timeout: 30000 }); await scatta(nome);
    }
    accesso = null; await tocca('#panInd');
    await tocca('#carr'); await scatta('nuovo-1');
    await tocca('#nvDado', 5); await scatta('nuovo-1-dado');
    await scrivi('#nvNome', 'Alex'); await scrivi('#nvClub', 'Titani FC'); await tocca('#nuovo [data-col="3"]'); await tocca('#nuovo [data-stile="righe"]'); await tocca('#nuovo [data-raglan]'); await scatta('nuovo-1-scelto');
    await tocca('#nvAvanti'); await scatta('nuovo-2');
    await tocca('#nuovo [data-cap]', 0, 4); await scatta('nuovo-2-scelto');
    await tocca('#nvInd'); await scatta('nuovo-1-ritorno'); await tocca('#nvAvanti'); await tocca('#nuovo [data-cap]', 0, 4);
    await tocca('#nvAvanti', 21); await scatta('home-nuova');
    await tocca('#hHome'); await scatta('menu-con-carriera');
    await tocca('#vai'); await scatta('scelta-1');
    await tocca('#griglia .sq', 0, 2); await scatta('scelta-2');
    await tocca('#griglia .sq', 0, 5); await scatta('scelta-3');
    await tocca('#inizio'); await scatta('pre-amichevole');
    await tocca('#segForm button', 0, 1); await tocca('#segMent button', 0, 2); await tocca('#segOra button', 0, 1); await scatta('pre-amichevole-tattica');
    await tocca('#segForm button', 0, 0); await tocca('#segMent button', 0, 1); await tocca('#segOra button', 0, 0);
    await tocca('#preInd'); await tocca('#diff button', 0, 2); await tocca('#inizio'); await scatta('pre-amichevole-difficile');
    await tocca('#preInd'); await tocca('#diff button', 0, 1);

    /* ---------- in partita: calcio d'inizio, pausa, sostituzioni (l'amichevole scelta sopra, fermata subito) */
    await tocca('#inizio'); await tocca('#gioca'); await scatta('contro');
    await pg.waitForFunction(() => { const g = window.__g; if (g.G.state !== 'kickoff' && g.G.state !== 'play') return false; g.pause(true); return true; }, null, { timeout: 30000 });
    await pg.waitForTimeout(300); await scatta('partita-inizio-pausa');
    await premi('#ment button', 1); await scatta('partita-mentalita-su'); await premi('#ment button', 0); await premi('#ment button', 0); await scatta('partita-mentalita-giu'); await premi('#ment button', 1);
    // senza palla le scritte dei tasti cambiano: si dà il pallone a un avversario e si aspetta un fotogramma
    await pg.evaluate(() => { const G = window.__g.G; G.ball.owner = G.teams[1].players[9]; G.taker = G.teams[1].players[9]; }); await pg.waitForTimeout(300); await scatta('partita-senza-palla');
    await tocca('#apriCambi'); await scatta('cambi');
    await tocca('#cambiL [data-o]', 0, 0); await tocca('#cambiL [data-b]', 0, 1); await scatta('cambi-portiere');
    await tocca('#cambiL [data-o]', 0, 9); await tocca('#cambiL [data-b]', 0, 1); await scatta('cambi-fatto');
    await tocca('#cambiL [data-o]', 0, 8); await tocca('#cambiL [data-b]', 0, 2); await tocca('#cambiL [data-o]', 0, 7); await tocca('#cambiL [data-b]', 0, 3); await scatta('cambi-finiti');
    await tocca('#cambiOk'); await scatta('pausa-dopo-cambi');
    await tocca('#esci'); await scatta('home-dopo-uscita');

    /* ---------- la carriera va avanti (senza giocare): tre giornate, coppa, trofeo, soldi per provare tutto */
    await pg.evaluate(() => {
      const g = window.__g, K = g.carriera(), CAR = g.CAR, CLUBS = window.CLUBS, r = window.__caso(11), me = g.club(K.club), a = me.xi[9][0], b = me.xi[10][0];
      CAR.giocaCampionato(K, CLUBS, 3, 1, [a, a, b], r); CAR.giocaCampionato(K, CLUBS, 1, 1, [b], r); CAR.giocaCampionato(K, CLUBS, 0, 2, [], r);
      CAR.giocaCoppa(K, CLUBS, 2, 0, [a, a], r); CAR.giocaCastelli(K, CLUBS, 1, 1, [a], r);
      K.monete = 30000; K.gemme = 150; g.salvaK(); g.drawHub();
    });
    await scatta('home');
    await tocca('#cClass'); await scatta('classifica'); await tocca('#panInd');
    await tocca('#cCoppa'); await scatta('coppa'); await tocca(c('[data-az="giocaCoppa"]')); await scatta('pre-coppa'); await tocca('#preInd');
    await tocca('#cCast'); await scatta('castelli'); await tocca(c('[data-az="giocaCastelli"]')); await scatta('pre-castelli'); await tocca('#preInd');
    await tocca('#cCamp'); await scatta('pre-campionato'); await tocca('#preInd');
    await tocca('#tRosa'); await scatta('rosa');
    await tocca('#campoA [data-x]', 0, 0); await tocca('#campoA [data-n]', 0, 0); await scatta('rosa-scambio-1');
    await tocca('#campoA [data-x]', 0, 0); await tocca('#campoA [data-n]', 0, 1); await scatta('rosa-scambio-2');
    await tocca('#campoA [data-x]', 0, 0); await tocca('#campoA [data-n]', 0, 0); await scatta('rosa-scambio-3');
    await tocca('#preInd');
    for (const g of ['d', 'w', 'c', 's']) { await tocca('#tSfide'); await tocca(c(`[data-stab="${g}"]`)); await scatta(`sfide-${g}`); await tocca('#panInd'); }
    await tocca('#hSett'); await tocca(c('[data-stab="d"]')); await tocca(c('[data-riscuoti]')); await scatta('sfide-riscossa');
    await tocca(c('[data-az="tutto"]')); await scatta('sfide-riscosse-tutte'); await tocca('#panInd'); await scatta('home-dopo-sfide');
    await tocca('#hPremi'); await scatta('percorso'); await tocca(c('[data-ritira]')); await scatta('percorso-ritirato');
    if (await pg.$(c('[data-az="ritiraTutto"]'))) { await tocca(c('[data-az="ritiraTutto"]')); await scatta('percorso-ritirato-tutto'); }
    await tocca('#panInd');
    for (const k of ['stadio', 'allenatore', 'personalizza', 'finanze']) { await tocca(`#tClub [data-club="${k}"]`); await scatta(`club-${k}`); if (k === 'personalizza') { await tocca('#nvAvanti'); await scatta('club-personalizzato'); } await tocca('#panInd'); }
    await tocca('#tClub [data-club="stadio"]');
    await tocca(c('[data-az="stadio"]')); await scatta('club-stadio-ampliato');
    await tocca(c('[data-ctab="allenatore"]')); await tocca(c('[data-az="allenatore"]')); await scatta('club-allenatore-migliorato');
    await tocca(c('[data-ctab="allenamento"]')); await scatta('club-allenamento'); await tocca(c('[data-allena]'), 0, 3); await scatta('club-allenato');
    await tocca(c('[data-ctab="finanze"]')); await scatta('club-finanze-dopo'); await tocca(c('[data-az="guadagna"]')); await scatta('guadagna-dal-club');
    await tocca('#panInd');
    await tocca('#hInfo'); await scatta('info'); await tocca('#panInd');
    await tocca('#hProf'); await scatta('profilo'); await tocca(c('[data-avatar]'), 0, 2); await scatta('profilo-avatar'); await tocca('#panInd');
    await tocca('#hCamp'); await scatta('notifiche'); await tocca(c('[data-vai]')); await scatta('notifiche-vai'); await tocca('#panInd');
    await tocca('#hImp'); await scatta('impostazioni');
    await tocca(c('[data-az="assistito"]')); await tocca(c('[data-q="media"]')); await tocca(c('[data-d="facile"]')); await tocca(c('[data-az="reset"]')); await scatta('impostazioni-cambiate');
    await tocca(c('[data-az="assistito"]')); await tocca(c('[data-q="auto"]')); await tocca(c('[data-d="normale"]')); await tocca('#panInd');
    // negozio: le quattro schede, un oggetto «armato» (Conferma), un acquisto, la terza maglia
    await tocca('#hGem'); await scatta('guadagna'); await tocca(c('[data-ntab="stemma"]')); await scatta('negozio-stemma');
    await tocca(c('[data-ogg="forma:rombo"]')); await scatta('negozio-stemma-conferma'); await tocca(c('[data-ogg="forma:rombo"]')); await scatta('negozio-stemma-comprato');
    await tocca(c('[data-ogg="bordo:oro"]')); await tocca(c('[data-ogg="bordo:oro"]')); await tocca(c('[data-ogg="simbolo:tretorri"]')); await tocca(c('[data-ogg="simbolo:tretorri"]'));
    await tocca(c('[data-ntab="divisa"]')); await scatta('negozio-divisa');
    await tocca(c('[data-ogg="disegno:mimetica"]')); await tocca(c('[data-ogg="disegno:mimetica"]')); await tocca(c('[data-ogg="terza:terza"]')); await tocca(c('[data-ogg="terza:terza"]')); await scatta('negozio-divisa-terza');
    await tocca(c('[data-tcol="3"]')); await tocca(c('[data-tstile="righe"]')); await tocca(c('[data-indossa="prima"]')); await scatta('negozio-divisa-prima');
    await tocca(c('[data-ntab="manager"]')); await scatta('negozio-manager'); await tocca(c('[data-ogg="avatar:6"]')); await tocca(c('[data-ogg="avatar:6"]')); await tocca(c('[data-ogg="cornice:fuoco"]')); await tocca(c('[data-ogg="cornice:fuoco"]')); await scatta('negozio-manager-comprato');
    await tocca(c('[data-ntab="squadra"]')); await scatta('negozio-squadra'); await tocca(c('[data-ogg="scarpini:oro"]')); await tocca(c('[data-ogg="scarpini:oro"]')); await tocca(c('[data-ogg="pallone:notte"]')); await tocca(c('[data-ogg="pallone:notte"]')); await tocca(c('[data-az="rinnovo"]')); await scatta('negozio-squadra-comprato');
    await tocca('#panInd'); await tocca('#hMon'); await scatta('guadagna-dopo-negozio'); await tocca('#panInd');
    // senza soldi: i messaggi «servono più…»
    await pg.evaluate(() => { const g = window.__g, K = g.carriera(); K.__m = K.monete; K.__g = K.gemme; K.monete = 0; K.gemme = 0; g.drawHub(); });
    await scatta('home-senza-soldi');
    await tocca('#tClub [data-club="stadio"]'); await tocca(c('[data-az="stadio"]')); await scatta('club-stadio-povero');
    await tocca(c('[data-ctab="allenatore"]')); await tocca(c('[data-az="allenatore"]')); await scatta('club-allenatore-povero');
    await tocca(c('[data-ctab="allenamento"]')); await scatta('club-allenamento-povero');
    await tocca(c('[data-ntab="stemma"]')); await scatta('negozio-stemma-povero'); await tocca(c('[data-ntab="squadra"]')); await tocca(c('[data-az="rinnovo"]')); await scatta('negozio-povero'); await tocca('#panInd');
    await tocca('#tMerc'); await tocca(c('[data-p]'), 0, 0); await scatta('mercato-povero'); await tocca(c('[data-az="annulla"]')); await tocca('#panInd');
    await pg.evaluate(() => { const g = window.__g, K = g.carriera(); K.monete = K.__m; K.gemme = K.__g; delete K.__m; delete K.__g; g.drawHub(); });
    // mercato: elenco, i ruoli, la scelta di chi cedere, lo scambio
    await tocca('#tMerc'); await scatta('mercato');
    for (const r of ['P', 'D', 'C', 'A']) { await tocca(c(`[data-r="${r}"]`)); await scatta(`mercato-${r}`); }
    await tocca(c('[data-p]'), 0, 6); await scatta('mercato-cedi'); await tocca(c('[data-out]'), 0, 0); await scatta('mercato-fatto'); await tocca('#panInd');
    await tocca('#hProf'); await scatta('profilo-dopo-mercato'); await tocca('#panInd');
    await scatta('home-dopo-tutto');

    /* ---------- partite simulate: campionato intero, coppa ai rigori, trofeo, amichevole. Si ricarica la pagina (la carriera
       resta salvata) e si ferma il ciclo dei fotogrammi, come in scripts/prove/partita.cjs: se il gioco disegnasse a tempo
       vero tra una partita e l'altra, le animazioni partirebbero ogni volta da un punto diverso e la partita cambierebbe */
    await pg.waitForTimeout(1500); await carica(); await pg.evaluate(() => new Promise((ok) => { window.requestAnimationFrame = () => 0; setTimeout(ok, 100); }));
    const gioca = async (nome, opz) => { const r = await pg.evaluate(partitaFinta, opz); if (!r.finita) throw new Error(`partita non finita: ${nome}`); await scatta(`fine-${nome}`, { registro: r.registro, marcatori: r.gol }); };
    await tocca('#cCamp'); await gioca('campionato', { seme: 7 }); await pg.evaluate(() => { document.querySelector('#pag').open = true; }); await scatta('fine-campionato-pagelle'); await tocca('#continua'); await scatta('home-dopo-campionato');
    await tocca('#cCamp'); await gioca('campionato-2', { seme: 9 }); await tocca('#continua');
    await tocca('#cCoppa'); await tocca(c('[data-az="giocaCoppa"]')); await gioca('coppa-rigori', { seme: 3, fine: 200, punti: [1, 1] }); await tocca('#continua'); await scatta('home-dopo-coppa');
    await tocca('#cCast'); await tocca(c('[data-az="giocaCastelli"]')); await gioca('castelli', { seme: 4, fine: 200, punti: [2, 0] }); await tocca('#continua');
    await tocca('#hHome'); await tocca('#vai'); await tocca('#griglia .sq', 0, 4); await tocca('#griglia .sq', 0, 11); await tocca('#inizio'); await gioca('amichevole', { seme: 8 });
    await tocca('#cambia'); await scatta('scelta-dopo-partita');
    await tocca('#griglia .sq', 0, 6); await tocca('#griglia .sq', 0, 9); await tocca('#inizio'); await gioca('forzate', { seme: 12, fine: 3800, forzate: true }); await pg.evaluate(() => { document.querySelector('#pag').open = true; }); await scatta('fine-forzate-pagelle');
    await tocca('#cambia'); await tocca('#indietro');

    /* ---------- fine stagione: prima vincendo tutto, poi (stagione nuova) uscendo da tutto */
    await pg.evaluate(() => {
      const g = window.__g, K = g.carriera(), CAR = g.CAR, CLUBS = window.CLUBS, r = window.__caso(31), a = g.club(K.club).xi[10][0];
      while (CAR.coppaProssima(K)) CAR.giocaCoppa(K, CLUBS, 3, 0, [a, a, a], r);
      while (CAR.castelliProssima(K)) CAR.giocaCastelli(K, CLUBS, 4, 0, [a, a, a, a], r);
      while (CAR.prossima(K)) CAR.giocaCampionato(K, CLUBS, 5, 0, [a, a, a, a, a], r);
      g.salvaK(); g.drawHub();
    });
    await scatta('home-fine-stagione');
    await tocca('#cClass'); await scatta('classifica-fine'); await tocca('#panInd'); await tocca('#cCoppa'); await scatta('coppa-vinta'); await tocca('#panInd'); await tocca('#cCast'); await scatta('castelli-vinto'); await tocca('#panInd');
    await tocca('#hProf'); await scatta('profilo-trofei'); await tocca('#panInd'); await tocca('#hCamp'); await scatta('notifiche-fine'); await tocca('#panInd');
    for (const g of ['c', 's']) { await tocca('#tSfide'); await tocca(c(`[data-stab="${g}"]`)); await scatta(`sfide-fine-${g}`); await tocca('#panInd'); }
    await tocca('#hGem'); await scatta('guadagna-fine'); await tocca('#panInd');
    await tocca('#cCamp', 41); await scatta('home-stagione-2');
    await pg.evaluate(() => {
      const g = window.__g, K = g.carriera(), CAR = g.CAR, CLUBS = window.CLUBS, r = window.__caso(51);
      CAR.giocaCoppa(K, CLUBS, 0, 3, [], r); while (CAR.castelliProssima(K)) CAR.giocaCastelli(K, CLUBS, 0, 2, [], r);
      while (CAR.prossima(K)) CAR.giocaCampionato(K, CLUBS, 0, 1, [], r);
      g.salvaK(); g.drawHub();
    });
    await scatta('home-stagione-2-fine');
    await tocca('#cCoppa'); await scatta('coppa-persa'); await tocca('#panInd'); await tocca('#cCast'); await scatta('castelli-perso'); await tocca('#panInd');
    await tocca('#hCamp'); await scatta('notifiche-vuote'); await tocca('#panInd');
    // carriera cancellata dalle impostazioni: si torna al menu senza carriera
    await tocca('#hImp'); await tocca(c('[data-az="reset"]')); await tocca(c('[data-az="reset"]')); await scatta('menu-dopo-cancellazione');
  } catch (e) { errori.push(`copione interrotto dopo «${Object.keys(schermate).pop()}»: ${e.message}`); }
  fs.writeFileSync(f1, JSON.stringify({ schermate, errori }, null, 1));
  console.log(`${Object.keys(schermate).length} schermate salvate in ${f1}${errori.length ? `\nERRORI:\n  ${errori.join('\n  ')}` : ''}`);
  await br.close(); srv.close(); process.exitCode = errori.length ? 1 : 0;
});
