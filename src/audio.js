/* L'audio del gioco, tutto sintetizzato al momento con la Web Audio API: niente file da scaricare, latenza zero.

   - Effetti della partita: calci (più cupi e forti sui tiri carichi, morbidi su passaggi e stop), rimbalzi sull'erba,
     pali e traverse che risuonano, la rete che fruscia, scivolate, spallate, il fischietto dell'arbitro (diverso per
     inizio e fine tempo, fallo, fuorigioco, rigore e gol).
   - Il pubblico: un brusio che dipende da quanta gente c'è sugli spalti, cresce quando la palla è negli ultimi 25 metri,
     esplode al gol e fa "ooooh" sui tiri fuori di poco e sulle parate.
   - La musica della home: brani veri (public/audio, elenco in AUDIO.musica di src/config.js; fonti in docs/crediti.md)
     che girano in tutte le schermate fuori dalla partita, si ripetono con una dissolvenza, sfumano quando comincia la
     partita e riprendono da dov'erano quando si torna alla home.

   Il contesto audio nasce solo al primo tocco (o tasto): i browser, iOS e Android in testa, bloccano l'audio partito
   da solo. Volumi di musica ed effetti e il tasto muto restano salvati sul dispositivo. */
import { AUDIO } from './config.js';

const SALVA = 'fantatitano-audio';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// un suono muto brevissimo: fatto partire dentro un tocco, sblocca un lettore che dovrà suonare da solo più tardi
const MUTO = 'data:audio/wav;base64,UklGRrQBAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YZABAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA';
// i fischi: durate (secondi) di ogni colpo e pausa tra un colpo e l'altro
const FISCHI = {
  inizio: [[.8], .2], ripresa: [[.45], .2], fallo: [[.24], .2], fuorigioco: [[.32], .2], rigore: [[.22, .75], .14],
  gol: [[.95], .2], intervallo: [[.55, .95], .22], fine: [[.32, .32, 1.15], .2],
};

/** opz.contesto: un contesto già pronto (per le prove: OfflineAudioContext), senza ascolto del primo tocco. */
export function creaAudio(opz = {}) {
  const A = {
    ctx: null, on: true, vol: { musica: .6, effetti: .9 }, sbloccato: false,
    folla: { affluenza: .55, tensione: 0, attiva: false, pausa: false },
    lettori: null, attivo: 0, brano: 0, suona: false, cambio: false, timer: null, ultimaSpallata: -9,
  };
  try { const v = JSON.parse(localStorage.getItem(SALVA) || '{}'); if (typeof v.on === 'boolean') A.on = v.on; for (const k of ['musica', 'effetti']) if (typeof v[k] === 'number') A.vol[k] = clamp(v[k], 0, 1); } catch (e) { /* senza memoria valgono i valori di partenza */ }
  const salva = () => { try { localStorage.setItem(SALVA, JSON.stringify({ on: A.on, musica: A.vol.musica, effetti: A.vol.effetti })); } catch (e) { /* niente memoria: pazienza */ } };

  /* ------------------------------------------------------------ contesto, bus e sblocco al primo tocco */
  A.init = function () {
    if (this.muto) return; // modalità di prova (seme fisso): niente audio, così non consuma i numeri casuali della partita
    if (this.ctx) { if (this.ctx.state !== 'running' && this.ctx.resume) this.ctx.resume().catch(() => {}); return; }
    try {
      const C = window.AudioContext || window.webkitAudioContext; if (!C && !opz.contesto) return;
      const x = this.ctx = opz.contesto ? opz.contesto() : new C();
      // rumore bianco e rumore "rosa" (più morbido): la materia prima di erba, rete, pubblico e piatti
      const lungo = x.sampleRate * 2, b1 = x.createBuffer(1, lungo, x.sampleRate), b2 = x.createBuffer(1, lungo, x.sampleRate), w = b1.getChannelData(0), p = b2.getChannelData(0); let l = 0;
      for (let i = 0; i < lungo; i++) { w[i] = Math.random() * 2 - 1; l = l * .985 + w[i] * .12; p[i] = l * 2.2; }
      this.bianco = b1; this.rosa = b2;
      // un limitatore all'uscita: trasparente finché non serve, ferma la distorsione sul boato del gol
      this.comp = x.createDynamicsCompressor(); this.comp.threshold.value = -3; this.comp.knee.value = 0; this.comp.ratio.value = 20; this.comp.attack.value = .003; this.comp.release.value = .15; this.comp.connect(x.destination);
      this.master = x.createGain(); this.master.gain.value = this.on ? 1 : 0; this.master.connect(this.comp);
      this.busM = x.createGain(); this.busM.gain.value = this.vol.musica * AUDIO.musica.livello; this.busM.connect(this.master);
      this.fadeM = x.createGain(); this.fadeM.gain.value = 0; this.fadeM.connect(this.busM);
      this.busE = x.createGain(); this.busE.gain.value = this.vol.effetti; this.busE.connect(this.master);
      creaFolla(this);
      if (opz.contesto) return;
      // iOS sblocca l'audio solo se dentro il tocco parte davvero un suono: un campione muto basta
      const s = x.createBufferSource(); s.buffer = x.createBuffer(1, 1, x.sampleRate); s.connect(x.destination); s.start(0);
      if (x.resume) x.resume().catch(() => {});
      // gioco in secondo piano: tutto fermo, musica compresa; quando torna, riprende
      document.addEventListener('visibilitychange', () => { if (!this.ctx) return; if (document.hidden) { fermaMusica(); this.ctx.suspend().catch(() => {}); } else if (this.sbloccato) { this.ctx.resume().catch(() => {}); aggiornaMusica(); } });
    } catch (e) { this.ctx = null; }
  };
  // al primo tocco o tasto, ovunque: crea o riprende il contesto, poi se il contesto gira smette di ascoltare
  const sblocca = () => {
    A.init(); if (!A.ctx) return;
    // la musica parte qui, dentro il tocco: fuori da un tocco su iPhone un lettore non può cominciare a suonare
    aggiornaMusica();
    const pronto = () => { if (A.ctx.state !== 'running') return; A.sbloccato = true; for (const e of EVENTI) document.removeEventListener(e, sblocca, true); aggiornaMusica(); };
    if (A.ctx.state === 'running') pronto(); else A.ctx.resume().then(pronto).catch(() => {});
  };
  const EVENTI = ['pointerdown', 'touchend', 'keydown', 'click'];
  if (!opz.contesto) for (const e of EVENTI) document.addEventListener(e, sblocca, true);

  /** Il tasto muto: spegne o riaccende tutto l'audio (`on` dice se è acceso). */
  A.toggle = function () { this.on = !this.on; salva(); if (this.ctx) this.master.gain.setTargetAtTime(this.on ? 1 : 0, this.ctx.currentTime, .05); const b = document.querySelector('#audio'); if (b) b.style.opacity = this.on ? 1 : .4; aggiornaMusica(); };
  /** Il volume di 'musica' o di 'effetti', da 0 a 1. */
  A.volume = function (k, v) { this.vol[k] = clamp(v, 0, 1); salva(); if (!this.ctx) return; const t = this.ctx.currentTime; if (k === 'musica') { this.busM.gain.setTargetAtTime(this.vol.musica * AUDIO.musica.livello, t, .05); aggiornaMusica(); } else this.busE.gain.setTargetAtTime(this.vol.effetti, t, .05); };

  /* ------------------------------------------------------------ mattoni: inviluppi, rumori filtrati, oscillatori */
  const ora = () => A.ctx.currentTime;
  // un rumore filtrato con un inviluppo veloce; f può essere [da, a] per una spazzata
  function rumore(dove, { buf = 'bianco', tipo = 'bandpass', f = 1000, q = 1, vol = .3, att = .003, dur = .1, t = 0 }) {
    const x = A.ctx, s = x.createBufferSource(), fl = x.createBiquadFilter(), g = x.createGain(), t0 = ora() + t;
    s.buffer = A[buf]; s.loop = true; fl.type = tipo; fl.Q.value = q;
    if (Array.isArray(f)) { fl.frequency.setValueAtTime(f[0], t0); fl.frequency.exponentialRampToValueAtTime(f[1], t0 + dur); } else fl.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + att); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(fl); fl.connect(g); g.connect(dove); s.start(t0, Math.random() * 1.5); s.stop(t0 + dur + .05);
  }
  function tono(dove, { f = 200, f2 = 0, tipo = 'sine', vol = .3, att = .003, dur = .2, t = 0 }) {
    const x = A.ctx, o = x.createOscillator(), g = x.createGain(), t0 = ora() + t;
    o.type = tipo; o.frequency.setValueAtTime(f, t0); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + att); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dove); o.start(t0); o.stop(t0 + dur + .05);
  }
  const pronto = () => A.ctx && A.on && (A.ctx.state === 'running' || !!opz.contesto);

  /* ------------------------------------------------------------ il pallone */
  /** Calcio di potenza v (m/s): tiro, passaggio, testa, rinvio, tocco (contrasti), presa (in mano al portiere), stop. */
  A.calcio = function (v, tipo = 'passaggio') {
    if (!pronto()) return; const E = this.busE, p = clamp(v / 32, 0, 1);
    if (tipo === 'presa') { rumore(E, { buf: 'rosa', tipo: 'lowpass', f: 700, vol: .55, dur: .09 }); tono(E, { f: 140, f2: 70, vol: .4, dur: .1 }); return; }
    if (tipo === 'stop') { tono(E, { f: 240, f2: 110, vol: .25 + .15 * p, dur: .07 }); rumore(E, { tipo: 'lowpass', f: 900, vol: .12, dur: .04 }); return; }
    const forte = tipo === 'tiro' || tipo === 'rinvio', testa = tipo === 'testa';
    // il "tum": più basso e più lungo quando il colpo è forte
    tono(E, { f: (testa ? 300 : 230) - 110 * p, f2: 55 - 15 * p, vol: .4 + .55 * p, dur: .06 + .1 * p });
    // lo schiocco della scarpa sul cuoio
    rumore(E, { f: testa ? 1100 : 1900 - 500 * p, q: 1.2, vol: .25 + .4 * p, dur: .025 + .02 * p });
    if (forte && p > .45) rumore(E, { buf: 'rosa', tipo: 'lowpass', f: 320, vol: .6 * p, att: .004, dur: .16 }); // il botto del tiro carico
  };
  /** Rimbalzo sull'erba: vy è la velocità verticale all'impatto. */
  A.rimbalzo = function (vy) {
    const g = clamp(vy / 9, 0, 1); if (!pronto() || g < .1) return;
    tono(this.busE, { f: 120 + 30 * g, f2: 60, vol: .4 * g, dur: .08 }); rumore(this.busE, { buf: 'rosa', tipo: 'lowpass', f: 450, vol: .3 * g, dur: .06 });
  };
  /** Palo o traversa: il ferro risuona (modi di un tubo, inarmonici), più forte e lungo se il colpo è forte. */
  A.palo = function (v = 20) {
    if (!pronto()) return; const g = clamp(v / 25, .35, 1), E = this.busE;
    for (const [k, d, a] of [[1, 1.5, .26], [2.76, 1, .16], [5.4, .7, .1], [8.93, .45, .06]]) tono(E, { f: 470 * k, vol: a * g, att: .002, dur: d * (.7 + .5 * g) });
    rumore(E, { tipo: 'highpass', f: 3000, vol: .2 * g, dur: .03 }); tono(E, { f: 160, f2: 70, vol: .3 * g, dur: .12 });
  };
  /** La rete che si gonfia: fruscio con una coda. */
  A.rete = function (v = 20) {
    if (!pronto()) return; const g = clamp(v / 25, .4, 1), E = this.busE;
    rumore(E, { f: [3200, 1400], q: .7, vol: .22 * g, att: .02, dur: .55 }); rumore(E, { buf: 'rosa', tipo: 'lowpass', f: 650, vol: .2 * g, att: .03, dur: .4 });
    rumore(E, { f: [2400, 1200], q: .9, vol: .08 * g, att: .05, dur: .5, t: .18 });
  };

  /* ------------------------------------------------------------ giocatori e arbitro */
  A.scivolata = function () {
    if (!pronto()) return; const E = this.busE;
    rumore(E, { f: [1500, 500], q: .9, vol: .2, att: .03, dur: .65 }); rumore(E, { buf: 'rosa', tipo: 'lowpass', f: [500, 200], vol: .25, att: .04, dur: .6 });
  };
  /** Spallata: q quanto è stato forte il contatto (0..1). Al massimo una ogni 2,5 s: i duelli sono tanti. */
  A.spallata = function (q = .5) {
    if (!pronto() || ora() - this.ultimaSpallata < 2.5) return; this.ultimaSpallata = ora(); const g = clamp(q, .2, 1), E = this.busE;
    tono(E, { f: 95, f2: 50, vol: .35 * g, dur: .12 }); rumore(E, { buf: 'rosa', tipo: 'lowpass', f: 380, vol: .25 * g, dur: .09 }); rumore(E, { f: 900, q: 2, vol: .05 * g, dur: .06, t: .02 });
  };
  /** Il fischietto (a pallina: trillo veloce della frequenza), con un colpo diverso per ogni occasione. */
  A.fischio = function (tipo = 'fallo') {
    if (!pronto()) return; const [colpi, pausa] = FISCHI[tipo] || FISCHI.fallo, x = this.ctx; let t = ora() + .02;
    for (const d of colpi) {
      const o = x.createOscillator(), lfo = x.createOscillator(), prof = x.createGain(), g = x.createGain(), f0 = 2850 + Math.random() * 120;
      o.type = 'sine'; o.frequency.value = f0; lfo.type = 'square'; lfo.frequency.value = 26 + Math.random() * 6; prof.gain.value = 170;
      lfo.connect(prof); prof.connect(o.frequency);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(tipo === 'fallo' || tipo === 'rigore' ? .2 : .15, t + .015); g.gain.setValueAtTime(tipo === 'fallo' || tipo === 'rigore' ? .2 : .15, t + d - .05); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(this.busE); o.start(t); lfo.start(t); o.stop(t + d + .02); lfo.stop(t + d + .02);
      rumore(this.busE, { f: f0, q: 3, vol: .035, att: .015, dur: d, t: t - ora() }); // il fiato
      t += d + pausa;
    }
  };

  /* ------------------------------------------------------------ il pubblico */
  function creaFolla(a) {
    const x = a.ctx, strato = (f, q, buf) => { const s = x.createBufferSource(), fl = x.createBiquadFilter(), g = x.createGain(); s.buffer = a[buf]; s.loop = true; fl.type = 'bandpass'; fl.frequency.value = f; fl.Q.value = q; g.gain.value = 0; s.connect(fl); fl.connect(g); g.connect(a.busE); s.start(0, Math.random()); return { g, fl }; };
    a.brusio = strato(480, .5, 'rosa'); a.voci = strato(1150, .9, 'bianco');
    // le voci ondeggiano piano: un oscillatore lentissimo sul filtro, così il brusio non sembra un rumore fermo
    const lfo = x.createOscillator(), pr = x.createGain(); lfo.frequency.value = .17; pr.gain.value = 260; lfo.connect(pr); pr.connect(a.voci.fl.frequency); lfo.start();
    a.boatoG = strato(760, .35, 'rosa');
  }
  // il livello del brusio: affluenza e tensione (palla negli ultimi 25 metri), zero in pausa o fuori dalla partita
  function aggiornaFolla(t = .5) {
    if (!A.ctx) return; const F = A.folla, k = F.attiva && !F.pausa ? F.affluenza : 0, c = ora();
    A.brusio.g.gain.setTargetAtTime(k * (.2 + .2 * F.tensione), c, t); A.voci.g.gain.setTargetAtTime(k * (.06 + .14 * F.tensione), c, t);
  }
  /** Ogni fotogramma in partita: affluenza (0..1, quanta gente sugli spalti) e tensione (0..1). */
  A.pubblico = function (affluenza, tensione) {
    const F = this.folla, prima = F.tensione; F.affluenza = clamp(affluenza, 0, 1); F.tensione = clamp(tensione, 0, 1);
    if (!F.attiva || Math.abs(prima - F.tensione) > .02 || !this.ultimoFolla || ora() - this.ultimoFolla > .25) { this.ultimoFolla = this.ctx ? ora() : 0; aggiornaFolla(.6); }
  };
  A.amb = function (v) { this.folla.attiva = v > 0; aggiornaFolla(.4); }; // compatibile con il vecchio audio: acceso/spento
  A.pausa = function (v) { this.folla.pausa = v; aggiornaFolla(.25); };
  /** Il boato del gol: tutti gli strati in alto subito, poi giù piano verso il brusio. */
  A.boato = function () {
    if (!this.ctx) return; const c = ora(), k = .5 + .7 * this.folla.affluenza;
    for (const [s, v] of [[this.boatoG, .6], [this.brusio, .45], [this.voci, .3]]) { s.g.gain.cancelScheduledValues(c); s.g.gain.setTargetAtTime(v * k, c, .1); }
    this.boatoG.g.gain.setTargetAtTime(0, c + 2.8, 1.1); setTimeout(() => aggiornaFolla(1.2), 2600);
  };
  /** "Ooooh": un coro di voci (dente di sega su due formanti della vocale o) che sale, cala di tono e si spegne. */
  A.ooh = function (forza = 1) {
    if (!pronto() || !this.folla.attiva) return; const x = this.ctx, c = ora(), k = clamp(forza, .3, 1) * (.4 + .6 * this.folla.affluenza);
    const f1 = x.createBiquadFilter(), f2 = x.createBiquadFilter(), g = x.createGain(); f1.type = f2.type = 'bandpass'; f1.frequency.value = 400; f1.Q.value = 3; f2.frequency.value = 780; f2.Q.value = 4;
    g.gain.setValueAtTime(0.0001, c); g.gain.exponentialRampToValueAtTime(.06 * k, c + .35); g.gain.setTargetAtTime(0.0001, c + .9, .35);
    f1.connect(g); f2.connect(g); g.connect(this.busE);
    for (let i = 0; i < 10; i++) { const o = x.createOscillator(), f = 150 + Math.random() * 110; o.type = 'sawtooth'; o.frequency.setValueAtTime(f * .97, c); o.frequency.linearRampToValueAtTime(f, c + .3); o.frequency.linearRampToValueAtTime(f * .86, c + 1.7); o.connect(f1); o.connect(f2); o.start(c + Math.random() * .08); o.stop(c + 2.1); }
    rumore(this.busE, { buf: 'rosa', f: 500, q: .6, vol: .12 * k, att: .3, dur: 1.6 });
  };

  /* ------------------------------------------------------------ la musica della home */
  // I brani sono file veri: OGG dove il browser lo sa leggere, MP3 altrimenti. Li suonano due lettori che si danno il
  // cambio: quando al brano mancano pochi secondi parte il prossimo sull'altro lettore e i due si incrociano in
  // dissolvenza (con un brano solo, è lui che ricomincia). I lettori passano dal contesto audio, così volume della
  // musica, muto e dissolvenze valgono anche per loro: su iPhone il volume di un lettore non si cambia in altro modo.
  // Il file si scarica solo quando la musica deve suonare davvero.
  const MU = AUDIO.musica;
  const estensione = () => { try { return new Audio().canPlayType('audio/ogg; codecs="vorbis"') ? '.ogg' : '.mp3'; } catch (e) { return '.mp3'; } };
  // porta un volume a `v` in circa `sec` secondi, da dovunque sia
  const verso = (g, v, sec) => { const c = ora(); g.cancelScheduledValues(c); g.setTargetAtTime(v, c, sec / 3); };
  function lettore() {
    const el = new Audio(), g = A.ctx.createGain(), l = { el, g: g.gain, nome: '' };
    el.preload = 'auto'; g.gain.value = 0; A.ctx.createMediaElementSource(el).connect(g); g.connect(A.fadeM);
    // se il cambio non è riuscito e il brano arriva in fondo sul lettore che sta suonando, riparte da capo
    el.addEventListener('ended', () => { if (A.suona && A.lettori[A.attivo] === l) { el.currentTime = 0; el.play().catch(() => {}); } });
    return l;
  }
  const carica = (l, i) => { const nome = MU.cartella + MU.brani[i] + A.estensione; if (l.nome !== nome) { l.nome = nome; l.el.src = nome; } };
  // Prepara i due lettori. Succede dentro un tocco: su iPhone un lettore può partire da solo, più tardi, solo se la
  // prima volta è partito da un tocco. Il secondo lo sblocca un suono muto brevissimo
  function prepara() {
    if (A.lettori) return;
    A.estensione = estensione(); A.lettori = [lettore(), lettore()];
    const b = A.lettori[1].el; b.src = MUTO; b.play().catch(() => {});
  }
  function avviaMusica() {
    prepara(); if (A.suona) return; A.suona = true;
    const c = ora(), l = A.lettori[A.attivo];
    // riprende da dov'era: il lettore di turno a volume pieno, l'altro zitto (anche se ci si era fermati a metà di un cambio)
    A.lettori.forEach((x, i) => { x.g.cancelScheduledValues(c); x.g.setValueAtTime(i === A.attivo ? 1 : 0, c); if (i !== A.attivo) x.el.pause(); });
    A.cambio = false; carica(l, A.brano); A.timer = setInterval(controlla, 250);
    // se il browser non la lascia partire (nessun tocco ancora valido), ci riprova al prossimo tocco
    l.el.play().catch(() => { fermaMusica(); document.addEventListener('pointerdown', aggiornaMusica, { once: true, capture: true }); });
  }
  function fermaMusica() {
    clearTimeout(A.spegni); if (!A.suona) return;
    A.suona = false; clearInterval(A.timer); A.timer = null; for (const l of A.lettori) l.el.pause();
  }
  // quando al brano manca poco prepara il prossimo sull'altro lettore; agli ultimi secondi lo fa partire e li incrocia
  function controlla() {
    const l = A.lettori[A.attivo], altro = A.lettori[1 - A.attivo], manca = l.el.duration - l.el.currentTime, prossimo = (A.brano + 1) % MU.brani.length;
    if (A.cambio || !(manca <= MU.anticipo)) return;
    carica(altro, prossimo);
    if (manca > MU.incrocio) return;
    A.cambio = true; altro.el.currentTime = 0;
    altro.el.play().then(() => {
      if (!A.suona) return altro.el.pause();
      verso(altro.g, 1, MU.incrocio); verso(l.g, 0, MU.incrocio); A.attivo = 1 - A.attivo; A.brano = prossimo;
      setTimeout(() => { A.cambio = false; if (A.lettori[A.attivo] !== l) l.el.pause(); }, MU.incrocio * 1000 + 300);
    }).catch(() => { A.cambio = false; });
  }
  // La musica deve suonare? Solo se la schermata la vuole, l'audio non è muto, il volume della musica non è a zero e
  // il gioco è in primo piano. Tutto quello che cambia una di queste cose passa di qui: sfuma in entrata o in uscita,
  // e a musica spenta ferma i lettori, che così non scaricano e non consumano
  function aggiornaMusica() {
    if (!A.ctx) return;
    const deve = !!A.voglioMusica && A.on && A.vol.musica > 0 && !document.hidden;
    verso(A.fadeM.gain, deve ? 1 : 0, deve ? MU.entra : MU.esce); clearTimeout(A.spegni);
    if (deve) avviaMusica(); else if (A.suona) A.spegni = setTimeout(fermaMusica, MU.esce * 1000 + 150);
  }
  /** Musica sì o no: sì in tutte le schermate della home, no in partita. Sfuma in entrata e in uscita. */
  A.musica = function (on) { this.voglioMusica = on; aggiornaMusica(); };

  /* ------------------------------------------------------------ compatibilità con le chiamate di prima */
  A.kick = (v) => A.calcio(v, 'tocco');
  A.post = () => A.palo();
  A.roar = () => A.boato();
  A.whistle = (n = 1) => A.fischio(n >= 3 ? 'fine' : n === 2 ? 'intervallo' : 'fallo');
  return A;
}
