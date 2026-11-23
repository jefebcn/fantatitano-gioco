/* Fotografa tutte le schermate di menu e home (più pausa, sostituzioni e fine partita) alle tre misure di iPhone in
   orizzontale: 667 × 375, 844 × 390 e 932 × 430. Il giro è ripetibile (numeri casuali e data fissi, animazioni ferme,
   campo 3D nascosto): due giri sullo stesso codice danno le stesse foto, quindi si può confrontare prima e dopo una
   modifica. Accanto alle foto salva il contenuto di ogni schermata (misura-testi.json).
   Nelle schermate rifatte (barra in alto, Home, Carriera, Sfida e finestre, per ora) controlla anche le regole di qualità: testo
   mai sotto 12 px (tranne dentro la carta grande del giocatore), niente testo tagliato, niente fuori dallo schermo, pulsanti alti e larghi almeno 44 px. Esce con errore
   se una regola non è rispettata o se la pagina dà errori.
   Uso: npm run build && node scripts/prove/schermate.cjs cartella-di-uscita   (serve Playwright, come partita.cjs)
     SCALA=2   foto a doppia definizione, da guardare (per il confronto pixel per pixel si lascia 1) */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', '..', 'public'), OUT = process.argv[2] || 'foto-schermate', SCALA = +process.env.SCALA || 1;
fs.mkdirSync(OUT, { recursive: true });
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.css': 'text/css' };
const srv = http.createServer((q, r) => { const u = q.url.split('?')[0], f = path.join(root, u === '/' ? 'index.html' : decodeURIComponent(u)); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' }); r.end(d); } }); });
const MISURE = [[667, 375], [844, 390], [932, 430]];
// le parti della pagina già rifatte secondo le regole di qualità: qui si controlla ogni elemento
const RIFATTE = ['#barraF', '#casa', '#carriera', '#sfida', '#squadra', '#schedaG', '#finestra', '#premio'];

// Gira nella pagina: elenca le regole di qualità non rispettate dentro le parti rifatte che si vedono
function qualita(radici) {
  const guai = [], W = innerWidth, H = innerHeight, vista = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
  const dice = (e) => (e.id ? '#' + e.id : e.className && typeof e.className === 'string' ? '.' + e.className.split(' ').join('.') : e.tagName.toLowerCase()) + ' «' + (e.textContent || '').trim().slice(0, 24) + '»';
  for (const sel of radici) {
    const radice = document.querySelector(sel); if (!radice || radice.classList.contains('nas')) continue;
    for (const e of [radice, ...radice.querySelectorAll('*')]) {
      if (!vista(e) || e.closest('svg')) continue;
      const r = e.getBoundingClientRect(), st = getComputedStyle(e);
      // un decoro (luci e raggi dietro la scena: vuoto, non si tocca, nascosto a chi legge lo schermo) può uscire dai bordi
      const decoro = e.getAttribute('aria-hidden') === 'true' && st.pointerEvents === 'none' && !e.textContent.trim();
      if (!decoro && (r.right > W + .5 || r.bottom > H + .5 || r.left < -.5 || r.top < -.5)) guai.push(`fuori dallo schermo: ${dice(e)}`);
      const testo = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      // dentro la carta grande del giocatore le scritte seguono le proporzioni della carta (docs/carte-giocatori.md): è la
      // sola eccezione ai 12 px, e anche lì non si scende sotto i 5
      const minimo = e.closest('.gC.grande') ? 5 : 12;
      if (testo && parseFloat(st.fontSize) < minimo) guai.push(`testo da ${st.fontSize}: ${dice(e)}`);
      // un testo su una riga è tagliato se è più largo del suo posto; uno su più righe se è più alto. E non deve uscire dal genitore
      const unaRiga = st.whiteSpace === 'nowrap', gen = e.parentElement.getBoundingClientRect();
      if (testo && st.overflow !== 'visible' && (unaRiga ? e.scrollWidth > e.clientWidth + 1 : e.scrollHeight > e.clientHeight + 2)) guai.push(`testo tagliato: ${dice(e)}`);
      if (testo && st.position !== 'absolute' && (r.right > gen.right + 1.5 || r.left < gen.left - 1.5)) guai.push(`testo che esce dal suo posto: ${dice(e)}`);
      // anche senza taglio: un testo su una riga più largo della sua scatola finisce sopra quello che ha accanto
      if (testo && unaRiga && st.overflow === 'visible' && st.display !== 'inline' && e.scrollWidth > e.clientWidth + 1) guai.push(`testo più largo del suo posto: ${dice(e)}`);
      // dentro una carta ogni testo sta nella sua parte (fascia, corpo o fascia in basso): non la supera e non tocca le altre
      const parte = e.closest('.carta .fascia, .carta .corpo, .carta .piede');
      if (testo && parte && parte !== e && st.position !== 'absolute') { const q = parte.getBoundingClientRect(); if (r.right > q.right + 1 || r.left < q.left - 1 || r.bottom > q.bottom + 1.5 || r.top < q.top - 1.5) guai.push(`testo fuori dalla sua parte della carta: ${dice(e)}`); }
      if (testo && /…|\.\.\.$/.test(e.textContent.trim())) guai.push(`puntini: ${dice(e)}`);
      if (e.tagName === 'BUTTON' && (r.width < 43.5 || r.height < 43.5)) guai.push(`pulsante da ${Math.round(r.width)} × ${Math.round(r.height)}: ${dice(e)}`);
    }
    // nessuna carta sopra un'altra
    const carte = [...radice.querySelectorAll('.carta')].filter(vista).map((c) => c.getBoundingClientRect());
    const sopra = (a, b) => a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;
    carte.forEach((a, i) => carte.slice(i + 1).forEach((b) => { if (sopra(a, b)) guai.push('due carte sovrapposte'); }));
    // sui campi della Sfida nessun giocatore copre lo scudo, la valutazione o il nome di un altro, e tutti stanno dentro il
    // campo (del nome contano la larghezza del testo scritto e l'altezza della sua riga)
    for (const campo of radice.querySelectorAll('.sCampo, .qCampo')) {
      const q = campo.getBoundingClientRect(), scritto = (e) => { const g = document.createRange(); g.selectNodeContents(e); const t = g.getBoundingClientRect(), r = e.getBoundingClientRect(); return { left: t.left, right: t.right, top: r.top, bottom: r.bottom }; };
      const pezzi = [...campo.querySelectorAll('.gC')].map((c) => ({ nome: c.querySelector('.gNome').textContent, parti: [c.querySelector('.gS').getBoundingClientRect(), scritto(c.querySelector('.gNome')), c.querySelector('.gVal').getBoundingClientRect()] }));
      pezzi.forEach((a, i) => { for (const r of a.parti) if (r.left < q.left - 1 || r.right > q.right + 1 || r.top < q.top - 1 || r.bottom > q.bottom + 1) guai.push(`giocatore fuori dal campo: ${a.nome}`); pezzi.slice(i + 1).forEach((b) => { if (a.parti.some((x) => b.parti.some((y) => sopra(x, y)))) guai.push(`giocatori sovrapposti sul campo: ${a.nome} e ${b.nome}`); }); });
    }
  }
  return guai;
}

srv.listen(0, async () => {
  const br = await chromium.launch(); const errori = [], regole = [];
  for (const [w, h] of MISURE) {
    const cx = await br.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: SCALA }), pg = await cx.newPage();
    pg.on('pageerror', (e) => errori.push(`${w}: ${e.message}`)); pg.on('console', (m) => { if (m.type() === 'error') errori.push(`${w}: console ${m.text().slice(0, 200)}`); });
    await pg.addInitScript(() => {
      let sd = 12345; Math.random = () => (sd = (sd * 16807) % 2147483647) / 2147483647; window.__seme = (k) => { sd = 1000 + k * 7919; };
      // l'apertura dei premi senza movimento: nelle foto si vede subito il premio
      window.__fermo = true;
      // sabato 21 novembre 2026
      const D = Date, t0 = 1795262400000;
      window.Date = class extends D { constructor(...a) { if (a.length) super(...a); else super(t0); } static now() { return t0; } };
      window.requestAnimationFrame = () => 0;
    });
    await pg.goto(`http://localhost:${srv.address().port}/`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await pg.waitForFunction(() => window.__g && !document.querySelector('#carica'), null, { timeout: 90000 });
    await pg.addStyleTag({ content: 'canvas#c{visibility:hidden}*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}#avviso{display:none!important}' });
    // le illustrazioni si caricano tutte prima di cominciare: così nelle foto gli sfondi ci sono sempre, a ogni giro
    const illustrazioni = fs.readdirSync(path.join(root, 'img', 'illustrazioni')).filter((f) => f.endsWith('.webp'));
    await pg.evaluate((elenco) => Promise.all(elenco.map((f) => new Promise((fatto) => { const i = new Image(); i.onload = i.onerror = fatto; i.src = 'img/illustrazioni/' + f; }))), illustrazioni);
    let n = 0; const testi = {};
    const dove = () => pg.evaluate(() => { const s = [...document.querySelectorAll('.scr')].find((e) => !e.classList.contains('nas')); return s ? s.id : 'nessuna'; });
    const foto = async (nome) => {
      await pg.waitForFunction(() => !document.querySelector('.scr:not(.nas) img[data-ritr]:not([src])'), null, { timeout: 60000, polling: 100 });
      // le illustrazioni del premio aperto devono essere arrivate: una che manca è un errore
      if (await pg.$('#premio:not(.nas)')) { await pg.waitForFunction(() => [...document.querySelectorAll('#premio img')].every((i) => i.complete), null, { timeout: 20000, polling: 100 }); const rotte = await pg.evaluate(() => [...document.querySelectorAll('#premio img')].filter((i) => !i.naturalWidth).map((i) => i.getAttribute('src'))); if (rotte.length) errori.push(`${w}: nel premio mancano le immagini ${rotte.join(', ')}`); }
      // lo stesso per le illustrazioni della schermata: devono essere arrivate, e una che manca è un errore
      await pg.waitForFunction(() => [...document.querySelectorAll('.scr:not(.nas) img[src*="img/illustrazioni/"]')].every((i) => i.complete), null, { timeout: 20000, polling: 100 });
      const mancano = await pg.evaluate(() => [...document.querySelectorAll('.scr:not(.nas) img[src*="img/illustrazioni/"]')].filter((i) => !i.naturalWidth).map((i) => i.getAttribute('src'))); if (mancano.length) errori.push(`${w}: in ${nome} mancano le immagini ${mancano.join(', ')}`);
      await pg.waitForTimeout(350); const f = `${String(++n).padStart(2, '0')}-${nome}`; await pg.screenshot({ path: path.join(OUT, `${w}-${f}.png`) });
      testi[f] = await pg.evaluate(() => { const pulisci = (t) => t.replace(/src="(data|blob):[^"]+"/g, 'src="$1"').replace(/url\(&quot;data:[^)]*\)/g, 'url(data)'), s = [...document.querySelectorAll('.scr')].find((e) => !e.classList.contains('nas')), b = document.querySelector('#barraF'); return (s ? s.id + '|' + pulisci(s.innerHTML) : 'nessuna') + (b && !b.classList.contains('nas') ? '|barra|' + pulisci(b.innerHTML) : ''); });
      for (const g of await pg.evaluate(qualita, RIFATTE)) regole.push(`${w} ${f}: ${g}`);
    };
    let tocchi = 0;
    const tocca = async (sel, i = 0) => { const el = (await pg.$$(sel))[i]; if (!el || !(await el.isVisible())) { errori.push(`${w}: manca ${sel}[${i}] (dopo ${n})`); return false; } await el.evaluate((e, k) => { window.__seme(k); e.click(); }, ++tocchi); return true; };
    // apre una schermata, la fotografa e torna indietro con la freccia della barra: deve riportare dove si era
    const vai = async (apri, nome, extra) => { const prima = await dove(); if (!(await tocca(apri))) return; await foto(nome); if (extra) await extra(); await tocca('#bCasa'); const dopo = await dove(); if (dopo !== prima) errori.push(`${w}: da ${nome} Indietro porta a «${dopo}» invece che a «${prima}»`); };

    // senza carriera: benvenuto, amichevole libera, creazione del club, capitano
    await foto('benvenuto');
    await tocca('#vai'); await foto('scelta'); await tocca('.sq', 0); await tocca('.sq', 5); await foto('scelta-pronta'); await tocca('#inizio'); await foto('sfida-libera'); await tocca('#sfida [data-az="cambia"]'); await tocca('#indietro');
    await tocca('#carr'); await foto('club'); await tocca('#nvDado'); await tocca('#nvCol button', 2); await tocca('#nvStile button', 3); await foto('club-scelto');
    await tocca('#nvAvanti'); await foto('capitano'); await tocca('.cap', 6); await foto('capitano-scelto'); await tocca('#nvAvanti'); await pg.waitForTimeout(1200);
    // la Home e le sezioni che apre
    await foto('home');
    await tocca('#casa .c-scenario');
    await vai('#casa .c-percorso', 'percorso');
    await vai('#casa .c-amichevole', 'amichevole', async () => { await tocca('.sq', 1); await tocca('.sq', 7); await tocca('#inizio'); await foto('sfida-amichevole'); await tocca('#sfida [data-az="cambia"]'); });
    await vai('#casa .c-sfide', 'sfide-d', async () => { for (const t of ['w', 'c', 's']) { await tocca(`[data-stab="${t}"]`); await foto(`sfide-${t}`); } });
    // la Squadra: scambio a due tocchi e trascinando, il portiere solo in porta, incarichi trascinando le linguette,
    // modulo, squadra migliore, scheda dal pulsante «Scheda» e con la pressione lunga
    await vai('#casa .c-squadra', 'squadra', async () => {
      const rosa = () => pg.evaluate(() => { const g = window.__g, K = g.carriera(), c = g.club(K.club); return { xi: c.xi.map((x) => x[0]), pan: c.pan.map((x) => x[0]), salvata: JSON.parse(localStorage.getItem('fantatitano-carriera')).rose[c.id].map((x) => x[0]), inc: K.incarichi || {}, cap: (K.mio || {}).capitano, form: g.sel.form, monete: K.monete, crescita: K.crescita || {}, allenatori: g.CAR.quantiAllenatori(K) }; });
      const carta = (g) => `#squadra .gC[data-g="${g}"]`, centroDi = async (sel) => { const r = await (await pg.$(sel)).boundingBox(); return [r.x + r.width / 2, r.y + r.height / 2]; }, centro = (g) => centroDi(carta(g));
      // prende una cosa col dito, la porta sopra un'altra e la lascia; con un nome fa la foto a metà strada
      const trascina = async (da, a, nome) => { const [ax, ay] = await centroDi(da), [bx, by] = await centroDi(a); await pg.mouse.move(ax, ay); await pg.mouse.down(); await pg.mouse.move(ax + 14, ay + 6, { steps: 3 }); await pg.mouse.move(bx, by, { steps: 6 }); if (nome) await foto(nome); await pg.mouse.up(); await pg.waitForTimeout(450); };
      const r0 = await rosa();
      // due tocchi: il primo sceglie (bordo luminoso e pulsante «Scheda»), il secondo scambia; ritoccare la stessa carta annulla
      await tocca(carta('xi:5')); await foto('squadra-scelto');
      if (!(await pg.$('#squadra .qScheda'))) errori.push(`${w}: sulla carta scelta manca il pulsante «Scheda»`);
      await tocca(carta('xi:5')); if (await pg.$('#squadra .gC[data-scelto]')) errori.push(`${w}: ritoccare la carta scelta non annulla`);
      await tocca(carta('xi:5')); await tocca(carta('pan:3')); await foto('squadra-scambio');
      const r1 = await rosa(); if (r1.xi[5] !== r0.pan[3] || r1.pan[3] !== r0.xi[5] || r1.salvata[5] !== r0.pan[3]) errori.push(`${w}: lo scambio tra titolare e sostituto non è riuscito o non è salvato`);
      await tocca(carta('xi:0')); await tocca(carta('xi:3')); const r2 = await rosa(); if (r2.xi[0] !== r1.xi[0]) errori.push(`${w}: un giocatore di movimento è finito in porta`);
      await trascina('#squadra .gSegni [data-inc="rigori"]', carta('xi:9'), 'squadra-incarico'); const r3 = await rosa(); if (r3.inc.rigori !== r2.xi[9]) errori.push(`${w}: il rigorista non è stato assegnato`);
      await trascina('#squadra .gSegni [data-inc="capitano"]', carta('xi:4')); const r4 = await rosa(); if (r4.cap !== r2.xi[4]) errori.push(`${w}: il capitano non è stato assegnato`);
      await tocca('#squadra [data-az="modulo"]'); await foto('finestra-modulo'); await tocca('#finS [data-scelta="4-2-3-1"]'); await foto('squadra-4231');
      if ((await rosa()).form !== '4-2-3-1') errori.push(`${w}: il modulo non è cambiato`);
      await tocca('#squadra [data-az="modulo"]'); await tocca('#finS [data-scelta="4-3-3"]');
      await tocca('#squadra [data-az="migliore"]'); await foto('squadra-migliore');
      if (!(await pg.evaluate(() => document.querySelector('#squadra .qMigliore').classList.contains('ottima')))) errori.push(`${w}: dopo «Squadra migliore» la formazione non risulta la migliore`);
      // trascinamento: una carta della panchina portata sopra un titolare
      const r5 = await rosa(); await trascina(carta('pan:1'), carta('xi:7'), 'squadra-trascina');
      const r6 = await rosa(); if (r6.xi[7] !== r5.pan[1] || r6.pan[1] !== r5.xi[7]) errori.push(`${w}: il trascinamento non ha scambiato i due giocatori`);
      // pressione lunga: si apre la scheda, e si chiude; poi dal pulsante «Scheda», e da lì si usa un allenatore dell'inventario (qui regalati per la prova) e resta scritto
      await pg.evaluate(() => { const K = window.__g.carriera(); K.allenatori.raro.tecnico = 2; K.allenatori.comune.fisico = 1; });
      const [cx2, cy2] = await centro('xi:8'); await pg.waitForTimeout(450); await pg.mouse.move(cx2, cy2); await pg.mouse.down(); await pg.waitForTimeout(700); await pg.mouse.up();
      if (await pg.evaluate(() => document.querySelector('#schedaG').classList.contains('nas'))) errori.push(`${w}: la pressione lunga non apre la scheda del giocatore`); else await tocca('#schedaG [data-az="chiudi"]');
      await pg.waitForTimeout(450); await tocca(carta('xi:8')); await tocca('#squadra .qScheda'); await foto('scheda-giocatore');
      if (await pg.evaluate(() => document.querySelector('#schedaG').classList.contains('nas'))) errori.push(`${w}: il pulsante «Scheda» non apre la scheda del giocatore`);
      else { await tocca('#schedaG [data-az="allena"]'); await foto('finestra-allenatore'); await tocca('#finS [data-scelta="0"]'); await foto('scheda-allenato'); const r7 = await rosa(); if (r7.allenatori !== 2 || !r7.crescita[r6.xi[8]]) errori.push(`${w}: l'allenamento dalla scheda non è riuscito`);
        await tocca('#schedaG [data-az="vendi"]'); await foto('finestra-vendi'); await tocca('#finestra [data-az="no"]'); await tocca('#schedaG [data-az="chiudi"]'); }
      await foto('squadra-alla-fine');
    });
    await vai('#casa .c-mercato', 'mercato', async () => {
      // un acquisto dalla lista trasferimenti e una ricerca dell'osservatore: la rosa cresce di uno e il giocatore trovato resta in attesa
      const prima = await pg.evaluate(() => { const g = window.__g, K = g.carriera(); return g.CAR.quantiInRosa(K, window.CLUBS); });
      if (await tocca('#panC [data-lista]:not([disabled])', 0)) await foto('mercato-comprato');
      if (await tocca('#panC [data-osserva]:not(.no)', 0)) await foto('mercato-osservatore');
      const dopo = await pg.evaluate(() => { const g = window.__g, K = g.carriera(); return [g.CAR.quantiInRosa(K, window.CLUBS), !!K.mercato.osservato]; });
      if (dopo[0] !== prima + 1 || !dopo[1]) errori.push(`${w}: mercato: rosa da ${prima} a ${dopo[0]}, osservatore ${dopo[1]}`);
    });
    await vai('#casa .c-club', 'club', async () => { const tab = await pg.$$eval('#panC [data-ctab]', (l) => l.map((b) => b.dataset.ctab)); for (const t of tab) { await tocca(`#panC [data-ctab="${t}"]`); await foto(`club-${t}`); } });
    // dalla barra
    await vai('#barraF [data-vai="impostazioni"]', 'impostazioni'); await vai('#barraF [data-vai="info"]', 'info'); await vai('#barraF [data-vai="profilo"]', 'profilo');
    await vai('#barraF [data-vai="percorso"]', 'percorso-dalla-barra'); await tocca('#barraF [data-az="serie"]'); await foto('premio-del-giorno'); await tocca('#finestra [data-az="si"]');
    await vai('#barraF [data-vai="guadagna"]', 'guadagna', async () => {
      // dal «come guadagnare» al negozio: un livello in più, e Indietro torna al «come guadagnare»
      if (!(await tocca('#panC [data-ntab]'))) return; await foto('negozio');
      const tab = await pg.$$eval('#panC [data-ntab]', (l) => l.map((b) => b.dataset.ntab)); for (const t of tab) { await tocca(`#panC [data-ntab="${t}"]`); await foto(`negozio-${t}`); }
      await tocca('#panC .ogg.chiuso', 0); await foto('negozio-armato'); await tocca('#bCasa');
    });
    // la Carriera e le sue schermate
    await tocca('#casa .c-carriera'); await foto('carriera');
    await vai('#carriera .k-classifica', 'classifica'); await vai('#carriera .k-castelli', 'castelli'); await vai('#carriera .k-titano', 'coppa'); await vai('#carriera .k-prossima', 'sfida-campionato');
    for (const r of ['sfide', 'squadra', 'mercato', 'club']) await vai(`#carriera .scorc[data-vai="${r}"]`, `scorciatoia-${r}`);
    // dal profilo a «Personalizza»: due livelli sotto la Carriera
    await tocca('#barraF [data-vai="profilo"]'); await vai('#panC [data-club="personalizza"]', 'personalizza'); await tocca('#bCasa');
    // partita: si entra dal campionato, si gioca a passi fissi, poi pausa, sostituzioni e fine; «Continua» torna alla Carriera
    await tocca('#carriera .k-prossima'); await tocca('#sfida [data-az="riscaldamento"]'); await tocca('#sfida [data-az="squadra"]'); await foto('squadra-dalla-sfida'); await tocca('#bCasa');
    if (await dove() !== 'sfida') errori.push(`${w}: dalla Squadra aperta nella Sfida Indietro porta a «${await dove()}»`);
    await tocca('#sfida [data-az="gioca"]'); await pg.waitForTimeout(400); await foto('vs'); await pg.evaluate(() => window.__seme(500)); await pg.waitForTimeout(1900);
    const stato = await pg.evaluate(() => { const g = window.__g; window.__seme(501); for (let i = 0; i < 900; i++) g.step(1 / 60); g.pause(true); return [g.G.state, g.G.teams[0].score, g.G.teams[1].score]; });
    await foto('pausa'); if (await tocca('#apriCambi')) { await foto('cambi'); await tocca('#cambiL [data-o]', 3); await foto('cambi-tocco'); await tocca('#cambiOk'); }
    const fine = await pg.evaluate(() => { const g = window.__g; window.__seme(502); g.pause(false); let i = 0; for (; i < 40000 && g.G.state !== 'full'; i++) g.step(1 / 30); for (let k = 0; k < 400; k++) g.step(1 / 30); return [g.G.state, i, g.G.teams[0].score, g.G.teams[1].score, !document.querySelector('#fine').classList.contains('nas')]; });
    await foto('fine'); if (await tocca('#continua')) await foto('dopo-la-partita');
    if (await dove() !== 'carriera') errori.push(`${w}: dopo la partita si è in «${await dove()}» invece che nella Carriera`);
    // il risultato è registrato, l'energia con cui si è usciti dal campo è salvata, e la finestra dice cosa si è guadagnato
    const dopo = await pg.evaluate(() => { const g = window.__g, K = g.carriera(), en = Object.values(K.energia || {}); return { giocate: K.giornata, stanchi: en.filter((x) => x < 100).length, finestra: !document.querySelector('#finestra').classList.contains('nas'), monete: K.monete }; });
    if (dopo.giocate !== 1 || !dopo.stanchi || !dopo.finestra) errori.push(`${w}: dopo la partita ${JSON.stringify(dopo)}`);
    // chiusa la finestra del risultato si apre il premio del giorno: è la prima partita della giornata
    await tocca('#finSi'); await foto('premio-del-giorno-preso');
    if (await pg.evaluate(() => document.querySelector('#premio').classList.contains('nas'))) errori.push(`${w}: dopo la prima partita del giorno non si apre il premio del giorno`); else await tocca('#prOk');
    await foto('carriera-dopo-la-partita');
    // la partita dopo: i titolari sono stanchi, il riscaldamento costa monete e dà energia, una volta sola
    await tocca('#carriera .k-prossima'); await foto('sfida-stanchi'); await tocca('#sfida [data-az="riscaldamento"]'); await foto('finestra-riscaldamento'); await tocca('#finSi'); await foto('sfida-riscaldati');
    const risc = await pg.evaluate(() => { const g = window.__g, K = g.carriera(); return { monete: K.monete, spento: document.querySelector('#sfida .azione.risc').classList.contains('spento') }; });
    if (risc.monete >= dopo.monete || !risc.spento) errori.push(`${w}: riscaldamento ${JSON.stringify(risc)} (prima ${dopo.monete} monete)`);
    // il fisioterapista: con l'intervento completo tutta la rosa torna al massimo, per monete
    const mf = await pg.evaluate(() => { const K = window.__g.carriera(); K.monete += 3000; return K.monete; });
    await tocca('#sfida [data-az="squadra"]'); await foto('squadra-stanchi');
    await tocca('#squadra [data-az="fisio"]'); await foto('finestra-fisioterapista'); await tocca('#finS [data-scelta="completo"]'); await foto('squadra-curati');
    const fis = await pg.evaluate(() => { const K = window.__g.carriera(); return { monete: K.monete, stanchi: Object.keys(K.energia || {}).length }; });
    if (fis.monete >= mf || fis.stanchi) errori.push(`${w}: fisioterapista ${JSON.stringify(fis)} (prima ${mf} monete)`);
    await tocca('#bCasa'); await tocca('#bCasa');
    // fine del campionato: le altre giornate giocate a tavolino, poi la carta diventa «Nuova stagione» con la finestra di conferma
    await pg.evaluate(() => { const g = window.__g, K = g.carriera(); window.__seme(600); while (g.CAR.prossima(K)) g.CAR.giocaCampionato(K, window.CLUBS, 1, 1, []); g.salvaK(); });
    await tocca('#carriera .scorc[data-vai="sfide"]'); await tocca('#bCasa'); await foto('carriera-fine-campionato');
    await tocca('#carriera .k-prossima'); await foto('finestra-nuova-stagione');
    if (!(await pg.evaluate(() => !document.querySelector('#finestra').classList.contains('nas')))) errori.push(`${w}: la finestra della stagione nuova non si apre`);
    await tocca('#finNo'); await tocca('#carriera .k-prossima'); await tocca('#finSi'); await foto('premi-stagione');
    if (await pg.evaluate(() => document.querySelector('#premio').classList.contains('nas'))) errori.push(`${w}: a stagione nuova non si aprono i premi di fine stagione`); else await tocca('#prOk');
    await foto('carriera-stagione-2');
    if ((await pg.evaluate(() => window.__g.carriera().stagione)) !== 2) errori.push(`${w}: la stagione nuova non è cominciata`);
    await tocca('#bCasa'); await foto('home-stagione-2');
    // prova coi casi scomodi: nomi lunghi e saldi grandi non devono tagliare né spingere niente fuori
    await pg.evaluate(() => { const g = window.__g, K = g.carriera(); K.nome = 'Massimiliano Bianchi'.slice(0, 18); K.mio.nome = 'Sporting Serravalle U'; K.mio.sigla = 'SSE'; K.monete = 1234567; K.gemme = 98765; K.div = 2; g.applicaMio(); g.salvaK(); });
    await tocca('#casa .c-sfide'); await tocca('#bCasa'); await foto('home-nomi-lunghi');
    await tocca('#casa .c-carriera'); await foto('carriera-nomi-lunghi'); await tocca('#bCasa');
    // l'apertura di un premio col movimento vero: un livello del percorso da ritirare. Appena partita la busta è ancora
    // chiusa; un tocco la salta e si vede il premio; «Continua» chiude
    await pg.evaluate(() => { window.__fermo = false; const g = window.__g, K = g.carriera(); g.CAR.puntiPercorso(K, 'vinta', 4); g.salvaK(); });
    await tocca('#barraF [data-vai="percorso"]'); await tocca('#panC [data-ritira]');
    await pg.waitForFunction(() => document.querySelector('#premio .pBusta').getAnimations().length, null, { timeout: 5000, polling: 20 }).catch(() => {});
    const busta = await pg.evaluate(() => { const p = document.querySelector('#premio'); return { aperta: !p.classList.contains('nas'), premio: p.classList.contains('aperto'), animazioni: p.querySelector('.pBusta').getAnimations().length, argento: !!p.querySelector('.pBusta img[src*="busta-percorso"]') }; });
    if (!busta.aperta || busta.premio || !busta.animazioni || !busta.argento) errori.push(`${w}: l'apertura del premio non parte col movimento ${JSON.stringify(busta)}`);
    await tocca('#premio'); if (!(await pg.evaluate(() => document.querySelector('#premio').classList.contains('aperto')))) errori.push(`${w}: un tocco non salta l'apertura del premio`);
    await tocca('#prOk'); if (!(await pg.evaluate(() => document.querySelector('#premio').classList.contains('nas')))) errori.push(`${w}: «Continua» non chiude il premio`);
    await pg.evaluate(() => { window.__fermo = true; }); await tocca('#bCasa');
    // una sfida riscossa: busta blu, e tra i premi ci sono i punti del percorso premi
    await tocca('#casa .c-sfide'); let daRiscuotere = false;
    for (const g of ['d', 'w', 's', 'c']) { await tocca(`[data-stab="${g}"]`); if (await pg.$('[data-riscuoti]')) { daRiscuotere = true; break; } }
    if (!daRiscuotere) errori.push(`${w}: nessuna sfida da riscuotere per provare il premio`);
    else if (await tocca('[data-riscuoti]')) { await foto('premio-sfida'); const sfida = await pg.evaluate(() => { const p = document.querySelector('#premio'); return { aperta: p.classList.contains('aperto'), blu: !!p.querySelector('.pBusta img[src*="busta-giorno"]'), punti: !!p.querySelector('#prL img[src*="icona-punti-percorso"]') }; }); if (!sfida.aperta || !sfida.blu || !sfida.punti) errori.push(`${w}: il premio di una sfida ${JSON.stringify(sfida)}`); await tocca('#prOk'); }
    await tocca('#bCasa');
    // Allenamento, da Il mio club: cinque carte con la loro illustrazione, per ora tutte «In arrivo»
    await tocca('#casa .c-club');
    if (await tocca('#panC [data-club="allenamento"]')) { await foto('allenamento'); const modi = await pg.$$eval('#panC .modoA img', (l) => l.filter((i) => i.naturalWidth > 0).length); if (modi !== 5) errori.push(`${w}: in Allenamento ${modi} illustrazioni su 5`); await tocca('#bCasa'); }
    await tocca('#bCasa');
    fs.writeFileSync(path.join(OUT, `${w}-testi.json`), JSON.stringify(testi, null, 1));
    console.log(`${w}×${h}: ${n} foto; partita ${JSON.stringify(stato)} → ${JSON.stringify(fine)}`);
    await cx.close();
  }
  console.log(errori.length ? `ERRORI (${errori.length}):\n` + [...new Set(errori)].join('\n') : 'nessun errore');
  console.log(regole.length ? `REGOLE DI QUALITÀ NON RISPETTATE (${regole.length}):\n` + [...new Set(regole)].join('\n') : 'regole di qualità rispettate nelle parti rifatte');
  await br.close(); srv.close(); process.exitCode = errori.length || regole.length ? 1 : 0;
});
