// Simulazione dell'economia della carriera: quante stagioni servono a un giocatore medio per salire dalla Lega
// Esordienti al Campionato Sammarinese. Gioca tante carriere intere con le regole vere (src/carriera.js): cambiano solo i
// risultati delle sue partite, tirati a sorte con le percentuali date.
// Uso: node scripts/simula-carriera.mjs [carriere] [vittorie%] [pareggi%] [partite al giorno]
import { creaMondo } from './lib/mondo.mjs';
import { squadraMigliore } from '../src/casa/rosa.js';
import { postiModulo } from '../src/dati/scala.js';
import { DIVISIONI } from '../src/config.js';

const N = +process.argv[2] || 300, P_V = (+process.argv[3] || 50) / 100, P_N = (+process.argv[4] || 30) / 100, AL_GIORNO = +process.argv[5] || 4;
// oltre quante stagioni si smette di aspettare la cima; quante riserve tiene il giocatore; di quanto deve migliorare un
// acquisto per valere la spesa; quanti diamanti tiene da parte prima di comprare un contatto dell'agente
const MASSIMO = 40, RISERVE = 7, MEGLIO = 1, CONTATTO_DA = 25;
const mondo = creaMondo(), { clubs, DATI, CAR } = mondo, POSTI = postiModulo('4-3-3'), mio = clubs.find((c) => c.id === mondo.posto);
const mulberry = (a) => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

function carriera(seme) {
  const rnd = mulberry(seme); Math.random = rnd;
  CAR.applica(null, clubs);
  const C = CAR.nuova(clubs, 'Medio', mondo.posto, rnd, { nome: 'Medio FC', sigla: 'MED' }); mondo.K = C; CAR.applica(C, clubs);
  const cand = DATI.candidatiCapitano(mondo.posto), cap = cand[Math.floor(rnd() * cand.length)]; CAR.scegliCapitano(C, clubs, cap.club, cap.i);
  let partite = 0; const oggi = () => new Date(2027, 0, 4 + Math.floor(partite / AL_GIORNO), 12);
  const val = (x) => DATI.scheda(x, mio.id).val, entrate = {}, stagioni = [];
  let visto = C.storico[0];
  const conti = () => { for (const m of C.storico) { if (m === visto) break; if (m.m > 0) entrate[m.c] = (entrate[m.c] || 0) + m.m / CAR.vittoria(C); } visto = C.storico[0]; };

  const schiera = () => {
    const tutti = mio.xi.concat(mio.pan).map((x) => ({ x, sc: DATI.scheda(x, mio.id), energia: 100 })), r = squadraMigliore(tutti, POSTI);
    if (r.cambiata) CAR.schiera(C, clubs, r.ordine.map((i) => tutti[i].x), r.fuori.map((i) => tutti[i].x));
  };
  // quanto migliora la squadra un giocatore nuovo: la differenza col titolare più debole del suo reparto
  const guadagno = (g) => g.val - Math.min(...mio.xi.filter((x) => x[1] === g.x[1]).map(val));
  const debole = () => { const r = {}; for (const x of mio.xi) r[x[1]] = Math.min(r[x[1]] ?? 99, val(x)); return Object.keys(r).filter((k) => k !== 'P').sort((a, b) => r[a] - r[b])[0]; };
  const sfoltisci = () => {
    // le riserve più deboli si vendono quando sono troppe; un portiere di riserva resta sempre
    while (mio.pan.length > RISERVE) {
      const portieri = mio.pan.filter((x) => x[1] === 'P').length; let j = -1;
      mio.pan.forEach((x, k) => { if ((x[1] !== 'P' || portieri > 1) && (j < 0 || val(x) < val(mio.pan[j]))) j = k; });
      if (j < 0 || !CAR.vendi(C, clubs, 'pan', j).ok) break;
    }
  };
  const allena = () => {
    for (const rar of ['leggendario', 'raro', 'comune']) for (const cat of CAR.CATEGORIE) {
      for (let giri = 0; C.allenatori[rar][cat] > 0 && giri < 30; giri++) {
        // sul titolare più debole che può ancora crescere
        const adatti = mio.xi.map((x, i) => ({ x, i })).filter(({ x }) => (cat === 'portieri') === (x[1] === 'P')).sort((a, b) => val(a.x) - val(b.x));
        if (!adatti.some(({ i }) => CAR.usaAllenatore(C, clubs, 'xi', i, rar, cat, rnd, oggi()).ok)) break;
      }
    }
  };
  const mercato = () => {
    const D = CAR.divisione(C);
    const prova = (g, compra, lascia) => { if (g && guadagno(g) >= MEGLIO && C.monete >= g.prezzo && compra().ok) { schiera(); sfoltisci(); return true; } if (lascia) lascia(); return false; };
    CAR.listaMercato(C, clubs).map((g, k) => ({ g, k })).sort((a, b) => guadagno(b.g) - guadagno(a.g)).forEach(({ g, k }) => { if (!g.preso) prova(g, () => CAR.compraLista(C, clubs, k, oggi())); });
    // l'agente, quando c'è un contatto e ci sono le monete per un giocatore della divisione sopra
    if (C.gemme >= CONTATTO_DA + 5 && !C.contatti) CAR.compraContatto(C);
    const sopra = DIVISIONI[Math.max(0, C.div - 2)].val;
    if (C.contatti > 0 && !C.mercato.agente && C.monete >= CAR.costoAgente(C) + CAR.prezzo(Math.round((sopra[0] + sopra[1]) / 2 + 3))) CAR.agente(C, clubs, debole());
    if (C.mercato.agente) prova(C.mercato.agente, () => CAR.compraTrovato(C, clubs, 'agente', oggi()), () => { if (C.monete < C.mercato.agente.prezzo * .6 || guadagno(C.mercato.agente) < MEGLIO) CAR.lasciaTrovato(C, 'agente'); });
    // l'osservatore, se la media dei titolari non basta ancora per salire
    if (D.obiettivi.media && CAR.mediaTitolari(C, clubs) < D.obiettivi.media + 1 && !C.mercato.osservato && C.monete >= CAR.costoOsservatore(C, 'alta') + CAR.prezzo(D.val[1] - 1)) CAR.osserva(C, clubs, 'alta', debole());
    if (C.mercato.osservato) prova(C.mercato.osservato, () => CAR.compraTrovato(C, clubs, 'osservato', oggi()), () => { if (guadagno(C.mercato.osservato) < MEGLIO) CAR.lasciaTrovato(C, 'osservato'); });
    // quando la rosa è a posto, le monete che avanzano vanno nelle strutture: una stella alla volta, la meno cara
    if (!D.obiettivi.media || CAR.mediaTitolari(C, clubs) >= D.obiettivi.media) {
      const scelte = CAR.STRUTTURE.map((q) => ({ q, c: CAR.costoStruttura(C, q) })).filter((s) => s.c && C.monete >= s.c.monete * 1.5 && C.gemme >= s.c.gemme).sort((a, b) => a.c.monete - b.c.monete);
      if (scelte.length) CAR.miglioraStruttura(C, scelte[0].q);
    }
  };
  const risultato = () => {
    const u = rnd();
    if (u < P_V) { const gs = rnd() < .6 ? 0 : 1; return [gs + 1 + (rnd() < .4 ? 1 : 0) + (rnd() < .15 ? 1 : 0), gs]; }
    if (u < P_V + P_N) { const g = rnd() < .45 ? 0 : rnd() < .8 ? 1 : 2; return [g, g]; }
    const gf = rnd() < .65 ? 0 : 1; return [gf, gf + 1 + (rnd() < .3 ? 1 : 0)];
  };
  const gioca = (tipo) => {
    const [gf, gs] = risultato(), rig = rnd() < .5 ? [5, 4] : [4, 5], marc = Array.from({ length: gf }, () => mio.xi[10][0]);
    if (tipo === 'camp') CAR.giocaCampionato(C, clubs, gf, gs, marc, rnd, oggi()); else if (tipo === 'coppa') CAR.giocaCoppa(C, clubs, gf, gs, marc, rnd, rig, oggi()); else CAR.giocaCastelli(C, clubs, gf, gs, marc, rnd, rig, oggi());
    partite++; CAR.riscuotiTutto(C, oggi()); CAR.ritiraPercorso(C, 0, rnd); allena(); mercato(); conti();
  };

  schiera();
  while (C.div > 1 && stagioni.length < MASSIMO) {
    for (let g = 1; CAR.prossima(C); g++) {
      gioca('camp');
      if (g % 2 === 0 && CAR.castelliProssima(C)) gioca('castelli');
      if (g % 3 === 0 && CAR.coppaProssima(C)) gioca('coppa');
    }
    while (CAR.castelliProssima(C)) gioca('castelli');
    while (CAR.coppaProssima(C)) gioca('coppa');
    const div = C.div, media = CAR.mediaTitolari(C, clubs), monete = C.monete, gemme = C.gemme, e = CAR.nuovaStagione(C, clubs, rnd); conti();
    stagioni.push({ div, pos: e.pos, fatti: e.fatti, ob: Object.fromEntries(e.obiettivi.map((o) => [o.id, o.fatto])), sale: e.sale, scende: e.scende, media, monete, gemme });
    schiera();
  }
  return { stagioni, arrivato: C.div === 1, partite, entrate, stelle: CAR.STRUTTURE.reduce((s, q) => s + CAR.stelle(C, q), 0) };
}

const tutte = Array.from({ length: N }, (_, i) => carriera(1000 + i)), arrivate = tutte.filter((c) => c.arrivato), quante = arrivate.map((c) => c.stagioni.length).sort((a, b) => a - b);
const media = (l) => (l.length ? l.reduce((a, b) => a + b, 0) / l.length : 0), pc = (p) => quante[Math.min(quante.length - 1, Math.floor(quante.length * p))];
console.log(`Giocatore: ${Math.round(P_V * 100)}% vittorie, ${Math.round(P_N * 100)}% pareggi, ${Math.round((1 - P_V - P_N) * 100)}% sconfitte; ${AL_GIORNO} partite al giorno; ${N} carriere.`);
console.log(`Arrivano al Campionato Sammarinese entro ${MASSIMO} stagioni: ${arrivate.length} su ${N}.`);
console.log(`Stagioni per arrivarci: media ${media(quante).toFixed(1)}; la metà ci arriva entro ${pc(.5)}; una su dieci entro ${pc(.1)}; nove su dieci entro ${pc(.9)}.`);
const conta = {}; for (const q of quante) conta[q] = (conta[q] || 0) + 1;
console.log('Quante carriere per numero di stagioni: ' + Object.keys(conta).map((k) => `${k}: ${conta[k]}`).join(', '));
console.log(`Partite giocate per arrivarci: ${Math.round(media(arrivate.map((c) => c.partite)))} (circa ${Math.round(media(arrivate.map((c) => c.partite)) / AL_GIORNO)} giorni).`);
console.log('\nDivisione per divisione (tutte le stagioni giocate lì):');
for (let div = DIVISIONI.length; div > 1; div--) {
  const st = tutte.flatMap((c) => c.stagioni.filter((s) => s.div === div)), D = DIVISIONI[div - 1], q = (f) => `${Math.round(media(st.map((s) => (f(s) ? 1 : 0))) * 100)}%`;
  console.log(`  ${D.nome}: stagioni a carriera ${(st.length / N).toFixed(2)}; sale ${q((s) => s.sale)}, scende ${q((s) => s.scende)}; obiettivi fatti: posizione (prime ${D.obiettivi.posizione}) ${q((s) => s.ob.posizione)}, coppa ${q((s) => s.ob.coppa)}, castelli ${q((s) => s.ob.castelli)}, rosa (media ${D.obiettivi.media}) ${q((s) => s.ob.rosa)}`
    + `; posizione media ${media(st.map((s) => s.pos)).toFixed(1)}; media titolari a fine stagione ${media(st.map((s) => s.media)).toFixed(1)}; monete rimaste ${Math.round(media(st.map((s) => s.monete)))}, diamanti ${Math.round(media(st.map((s) => s.gemme)))}`);
}
const fonti = {}; for (const c of tutte) for (const [k, v] of Object.entries(c.entrate)) fonti[k] = (fonti[k] || 0) + v / c.stagioni.length / N;
console.log('\nEntrate in monete per stagione, contate in vittorie: ' + Object.entries(fonti).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v.toFixed(1)}`).join(', ') + ` (in tutto ${Object.values(fonti).reduce((a, b) => a + b, 0).toFixed(1)})`);
console.log(`Stelle delle strutture all'arrivo, in tutto: ${media(arrivate.map((c) => c.stelle)).toFixed(1)} su ${CAR.STRUTTURE.length * 5}.`);
