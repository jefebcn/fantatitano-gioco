/* Collaudo: una versione del gioco da far provare a un amico (Alex, 27/11).

   Si accende aprendo il gioco con ?collaudo nell'indirizzo e resta acceso finché non si apre una volta con ?collaudo=0.
   Finché il gioco è privato è acceso per tutti anche senza (COLLAUDO.perTutti): su iPhone l'icona sulla schermata del
   telefono ha una memoria sua, e non sapeva che in Safari il collaudo era stato acceso. Chi gioca non vede niente di diverso, tranne due pulsanti nella pausa
   («Segnala un problema», «Manda il rapporto») e uno a fine partita.

   Mentre si gioca il gioco cerca da solo le stesse cose che cercano le prove (scripts/prove/diagnosi.cjs): pallone con
   numeri impossibili, sotto terra, lontanissimo, fermo senza che nessuno vada a prenderlo, entrato o uscito dalla porta
   attraverso la rete; giocatori teletrasportati, a terra troppo a lungo, con un gesto bloccato, col corpo sollevato o
   affondato; riprese che il computer non batte; scatti e gioco lento; errori nella pagina. Per ognuno scrive il minuto e
   la scena (dov'è il pallone, chi ce l'ha, i giocatori vicini e cosa fanno, il pallone negli ultimi secondi).
   Con «Segnala» chi gioca sceglie l'argomento e scrive due righe: il gioco aggiunge la scena e una foto del campo.

   Il rapporto è un testo (più le foto) che si manda con «Condividi» (WhatsApp): niente server, niente dati personali
   (solo che telefono e browser sono, la misura dello schermo e i fotogrammi). Resta salvato sul telefono finché non lo
   si manda, anche chiudendo il gioco (le foto no: quelle restano solo finché la pagina è aperta). I valori stanno in
   COLLAUDO (src/config.js). */

const CHIAVE = 'ft-collaudo';

/** Il collaudo è acceso? Legge ?collaudo / ?collaudo=0 e se lo ricorda; se non c'è niente decide perTutti. */
export function collaudoAcceso(perTutti = false) {
  const m = /[?&]collaudo(=([^&]*))?/.exec(location.search);
  try {
    if (m) localStorage.setItem(CHIAVE + '-on', m[2] === '0' ? '0' : '1');
    const v = localStorage.getItem(CHIAVE + '-on');
    return v === null ? perTutti : v === '1';
  } catch (e) { return m ? m[2] !== '0' : perTutti; }
}

/** Che telefono e che browser, in breve (niente di personale). */
function dispositivo() {
  const u = navigator.userAgent || '';
  const so = /iPhone|iPad/.test(u) ? `${/iPad/.test(u) ? 'iPad' : 'iPhone'} iOS ${((/OS (\d+[_\d]*)/.exec(u) || [])[1] || '?').replace(/_/g, '.')}`
    : /Android/.test(u) ? `Android ${(/Android ([\d.]+)/.exec(u) || [])[1] || '?'}` : /Mac/.test(u) ? 'Mac' : /Windows/.test(u) ? 'Windows' : 'altro';
  const br = /CriOS|Chrome/.test(u) && !/Edg/.test(u) ? 'Chrome' : /FxiOS|Firefox/.test(u) ? 'Firefox' : /Edg/.test(u) ? 'Edge' : /Safari/.test(u) ? 'Safari' : 'altro';
  const app = window.matchMedia && matchMedia('(display-mode: standalone)').matches || navigator.standalone ? ' · dall\'icona' : '';
  return `${so} · ${br}${app} · schermo ${screen.width}×${screen.height} (densità ${window.devicePixelRatio || 1})`;
}

const f1 = (v) => (Number.isFinite(v) ? v.toFixed(1) : String(v));
const ora = () => new Date().toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/**
 * C: valori di COLLAUDO. g: quello che serve del gioco: G, tutti() (i giocatori in campo), HL, HW, GH, GT, minuto(),
 * foto() (dataURL JPEG del campo, o null), qualita() (testo), versione, testo(chiave, ...valori).
 */
export function creaCollaudo(C, g) {
  const { G, HL, HW, GH, GT } = g;
  let R = carica();
  // squadra: la squadra di casa della partita in corso (una rivincita è una partita nuova anche senza passare dal menu)
  let partita = null, fotoN = 0, squadra = null;
  const foto = []; // [{ nome, url }] solo in memoria
  // stato dei controlli
  let tPrima = 0, pallaPrima = null, ferma = 0, ripresa = 0, sec = { t: 0, n: 0, lenti: 0 };
  const prima = new Map(), aTerra = new Map(), gestoDa = new Map(), scia = []; let sciaT = 0;

  function carica() {
    try { const r = JSON.parse(localStorage.getItem(CHIAVE) || 'null'); if (r && r.partite) return r; } catch (e) { /* si riparte da zero */ }
    return { da: ora(), partite: [] };
  }
  function salva() { try { localStorage.setItem(CHIAVE, JSON.stringify(R)); } catch (e) { /* telefono pieno o in privato: resta in memoria */ } }

  /** Una scena in una riga o due: pallone, chi ce l'ha, stato, i giocatori più vicini e il pallone negli ultimi secondi. */
  function scena() {
    const b = G.ball; if (!b) return 'nessun pallone in campo';
    const o = b.owner, vicini = g.tutti().map((p) => [Math.hypot(p.x - b.x, p.z - b.z), p]).sort((a, c) => a[0] - c[0]).slice(0, C.vicini);
    const chi = (p) => `${p.name} (${p.i === 0 ? 'portiere' : p.role || '?'}, ${p.team.human ? 'noi' : 'computer'})`;
    const fa = (p) => p.fx || (p.st && p.st !== 'run' ? p.st : 'corre');
    const righe = [
      `pallone a ${f1(b.x)}, ${f1(b.z)} alto ${f1(b.y)} m, ${f1(Math.hypot(b.vx, b.vz))} m/s · ${o ? 'ce l\'ha ' + chi(o) : 'libero'} · ${G.state}${G.paused ? ' in pausa' : ''}`,
      'vicini: ' + vicini.map(([d, p]) => `${chi(p)} a ${f1(d)} m, ${fa(p)}`).join('; '),
    ];
    if (scia.length > 1) righe.push(`pallone negli ultimi ${C.scia} s: ` + scia.map((q) => `${q[0].toFixed(0)},${q[1].toFixed(0)}`).join(' → '));
    return righe.join('\n   ');
  }

  function nuovaPartita() {
    const [a, c] = G.teams;
    partita = { squadre: a && c ? `${a.club.name} - ${c.club.name}` : '?', inizio: ora(), ris: '', anomalie: {}, esempi: [], segnalazioni: [], fps: { somma: 0, n: 0, min: 99 }, scatti: 0, peggio: 0 };
    squadra = G.teams[0]; R.partite.push(partita); if (R.partite.length > C.partite) R.partite.shift();
    prima.clear(); aTerra.clear(); gestoDa.clear(); scia.length = 0; ferma = ripresa = 0; pallaPrima = null; salva();
  }

  function nota(k, d) {
    if (!partita) return;
    partita.anomalie[k] = (partita.anomalie[k] || 0) + 1;
    if (partita.anomalie[k] <= C.esempi) partita.esempi.push({ k, min: g.minuto(), d, scena: scena() });
    salva();
  }

  /** Ogni fotogramma, dopo il passo del gioco, col tempo vero dal fotogramma prima. */
  function passo(vero) {
    if (!G.teams.length || G.state === 'menu') { partita = null; return; }
    if (!partita || squadra !== G.teams[0]) nuovaPartita();
    const [a, c] = G.teams; partita.ris = `${a.score}-${c.score} al ${g.minuto()}'${G.state === 'full' ? ' (finita)' : ''}`;
    const gioca = G.state === 'play' && !G.paused && !document.hidden;
    // fotogrammi: ogni secondo vero quanti; sotto `lento` per `lentoPer` secondi di fila è «gioco lento»
    if (gioca && vero > 0 && vero < C.pausa) {
      if (vero > C.scatto) { partita.scatti++; partita.peggio = Math.max(partita.peggio || 0, Math.round(vero * 1000)); }
      sec.t += vero; sec.n++;
      if (sec.t >= 1) {
        const fps = sec.n / sec.t; partita.fps.somma += fps; partita.fps.n++; partita.fps.min = Math.min(partita.fps.min, fps);
        sec.lenti = fps < C.lento ? sec.lenti + 1 : 0; if (sec.lenti === C.lentoPer) nota('gioco lento', `${Math.round(fps)} fotogrammi al secondo, qualità ${g.qualita()}`);
        sec = { t: 0, n: 0, lenti: sec.lenti };
      }
    }
    const dtg = G.t - tPrima; tPrima = G.t; if (!(dtg > 0)) return; // il gioco è fermo (pausa, replay): niente controlli
    const b = G.ball; if (!b) return;
    sciaT += dtg; if (sciaT >= C.sciaOgni) { sciaT = 0; scia.push([b.x, b.z]); if (scia.length > C.scia / C.sciaOgni) scia.shift(); }
    if (!Number.isFinite(b.x + b.y + b.z + b.vx + b.vy + b.vz)) nota('pallone con numeri impossibili', '');
    if (b.y < C.sotto) nota('pallone sotto terra', `alto ${b.y.toFixed(2)} m`);
    if (Math.abs(b.x) > HL + C.lontano || Math.abs(b.z) > HW + C.lontano) nota('pallone lontanissimo', `${b.x.toFixed(0)}, ${b.z.toFixed(0)}`);
    // la porta: il pallone ci entra solo dalla bocca (la linea di porta tra i pali, sotto la traversa)
    const inPorta = (q) => Math.abs(q.x) > HL && Math.abs(q.x) < HL + C.rete && Math.abs(q.z) < GH && q.y < GT;
    // (solo col gioco in corso: dopo un gol il pallone resta nella rete e la ripresa lo rimette a centrocampo)
    if (pallaPrima && G.state === 'play') {
      const ora1 = inPorta(b), prima1 = inPorta(pallaPrima);
      if (ora1 && !prima1 && Math.abs(pallaPrima.x) > HL) nota('pallone entrato in porta attraverso la rete', `da ${f1(pallaPrima.x)}, ${f1(pallaPrima.z)} alto ${f1(pallaPrima.y)}`);
      if (!ora1 && prima1 && Math.abs(b.x) > HL) nota('pallone uscito dalla porta attraverso la rete', `a ${f1(b.x)}, ${f1(b.z)} alto ${f1(b.y)}`);
    }
    pallaPrima = { x: b.x, y: b.y, z: b.z };
    if (G.state === 'play') {
      ripresa = 0;
      if (!b.owner && Math.hypot(b.vx, b.vz) < .4 && b.y < .3) { ferma += dtg; if (ferma >= C.ferma && ferma - dtg < C.ferma) nota('pallone fermo senza che nessuno lo vada a prendere', `${C.ferma} s`); } else ferma = 0;
      for (const p of g.tutti()) {
        const pp = prima.get(p);
        if (pp && Math.hypot(p.x - pp[0], p.z - pp[1]) > C.teletrasporto * dtg) nota('giocatore teletrasportato', `${p.name} ${f1(Math.hypot(p.x - pp[0], p.z - pp[1]))} m`);
        if (p.st === 'down' || p.stun > 0) { const t = (aTerra.get(p) || 0) + dtg; aTerra.set(p, t); if (t >= C.aTerra && t - dtg < C.aTerra) nota('giocatore a terra troppo a lungo', `${p.name} ${C.aTerra} s`); } else aTerra.set(p, 0);
        // lo stesso gesto ripartito da capo non è un gesto bloccato: si ricomincia a contare
        if (p.fx) { const k = gestoDa.get(p), t = p.fxT || 0; if (k && k[0] === p.fx && t >= k[2]) { k[1] += dtg; k[2] = t; if (k[1] >= C.gesto && k[1] - dtg < C.gesto) nota('gesto bloccato', `${p.name} ${p.fx} da ${C.gesto} s`); } else gestoDa.set(p, [p.fx, 0, t]); } else gestoDa.delete(p);
        if (p.fig && p.fig.body && Math.abs(p.fig.body.position.y) > C.sollevato) nota('corpo sollevato o affondato', `${p.name} ${p.fig.body.position.y.toFixed(2)} m, ${p.fx || p.st}`);
      }
    } else if (G.state === 'restart') {
      // una ripresa che batte il computer e non parte (quelle di chi gioca le batte lui quando vuole)
      const chi = G.taker; ripresa = chi && !chi.team.human ? ripresa + dtg : 0;
      if (ripresa >= C.ripresa && ripresa - dtg < C.ripresa) nota('ripresa del computer che non parte', `${G.tipoFermo || (G.fk ? 'punizione' : 'ripresa')}, batte ${chi.name}`);
    }
    for (const p of g.tutti()) prima.set(p, [p.x, p.z]);
  }

  /** Un errore nella pagina (anche fuori dalla partita). */
  function errore(msg) {
    if (!partita) { R.errori = (R.errori || []).slice(-C.esempi + 1); R.errori.push(`${ora()} ${msg}`); salva(); return; }
    nota('errore nella pagina', msg);
  }

  /** Quello che ha scritto chi gioca, con la scena e la foto del campo. */
  function segnala(argomento, testo) {
    if (!partita) nuovaPartita();
    const url = g.foto(), nome = url ? `foto-${++fotoN}.jpg` : null;
    if (url) { foto.push({ nome, url }); if (foto.length > C.foto) foto.shift(); }
    partita.segnalazioni.push({ argomento, testo: (testo || '').trim().slice(0, C.lunghezza), min: g.minuto(), scena: scena(), foto: nome });
    salva();
  }

  function rapporto() {
    const r = [`FANTATITANO · COLLAUDO · versione ${g.versione}`, `dal ${R.da} al ${ora()}`, dispositivo()];
    for (const e of R.errori || []) r.push(`errore fuori partita: ${e}`);
    R.partite.forEach((p, i) => {
      const fps = p.fps.n ? `${Math.round(p.fps.somma / p.fps.n)} fotogrammi al secondo in media, il secondo peggiore ${Math.round(p.fps.min)}` : 'fotogrammi non misurati';
      r.push('', `PARTITA ${i + 1}: ${p.squadre} ${p.ris} (iniziata ${p.inizio})`, `${fps} · scatti (fotogrammi oltre ${Math.round(C.scatto * 1000)} ms) ${p.scatti}${p.scatti ? `, il più lungo ${p.peggio} ms` : ''}`);
      if (p.segnalazioni.length) { r.push(`SEGNALAZIONI (${p.segnalazioni.length})`); p.segnalazioni.forEach((s, j) => r.push(`${j + 1}) ${s.min}' · ${s.argomento}${s.testo ? ` · «${s.testo}»` : ''}${s.foto ? ` · ${s.foto}` : ''}`, `   ${s.scena}`)); }
      const k = Object.keys(p.anomalie);
      if (k.length) {
        r.push('PROBLEMI TROVATI DAL GIOCO');
        for (const n of k) { r.push(`- ${n}: ${p.anomalie[n]} volte`); for (const e of p.esempi.filter((x) => x.k === n)) r.push(`   ${e.min}' ${e.d}`, `   ${e.scena}`); }
      } else r.push('nessun problema trovato dal gioco');
    });
    return r.join('\n');
  }

  /** Manda il rapporto (Condividi del telefono, col testo e le foto); se non si può, lo copia. Risponde cosa è successo. */
  async function manda() {
    const testo = rapporto();
    const files = [];
    if (typeof File === 'function') for (const f of foto) { try { const bl = await (await fetch(f.url)).blob(); files.push(new File([bl], f.nome, { type: 'image/jpeg' })); } catch (e) { /* senza quella foto */ } }
    const dati = { title: 'Fantatitano · collaudo', text: testo };
    try {
      if (navigator.share) {
        if (files.length && navigator.canShare && navigator.canShare({ files })) {
          // WhatsApp con le foto a volte lascia cadere il testo: lo si manda anche come file
          await navigator.share({ ...dati, files: [new File([testo], 'rapporto.txt', { type: 'text/plain' }), ...files] });
        } else await navigator.share(dati);
        svuota(); return 'mandato';
      }
    } catch (e) { if (e && e.name === 'AbortError') return 'annullato'; }
    try { await navigator.clipboard.writeText(testo); return 'copiato'; } catch (e) { return 'testo'; }
  }

  /** Dopo averlo mandato si ricomincia (la partita in corso resta, vuota). */
  function svuota() {
    const p = partita; R = { da: ora(), partite: [] }; foto.length = 0;
    if (p) { p.anomalie = {}; p.esempi = []; p.segnalazioni = []; p.scatti = p.peggio = 0; p.fps = { somma: 0, n: 0, min: 99 }; R.partite.push(p); }
    salva();
  }

  return { passo, errore, segnala, rapporto, manda, quanti: () => R.partite.reduce((a, p) => a + p.segnalazioni.length + Object.values(p.anomalie).reduce((x, y) => x + y, 0), 0) + (R.errori || []).length };
}
