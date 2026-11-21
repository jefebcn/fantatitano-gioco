/* Prove della logica della carriera (src/carriera.js). Uso: node scripts/prova-carriera.mjs */
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import * as K from '../src/carriera.js';

const src = readFileSync(new URL('../public/data.js', import.meta.url), 'utf8');
const clubs = JSON.parse(src.slice(src.indexOf('['), src.lastIndexOf(']') + 1));
let seed = 7; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

// calendario: 15 giornate da 8 partite, ogni coppia una volta sola, nessuno gioca due volte nella stessa giornata
const ids = clubs.map((c) => c.id), cal = K.calendario(ids, rnd), coppie = new Set();
assert.equal(cal.length, 15);
for (const g of cal) { assert.equal(g.length, 8); assert.equal(new Set(g.flat()).size, 16); for (const [a, b] of g) { const k = [a, b].sort().join('-'); assert.ok(!coppie.has(k), 'coppia ripetuta ' + k); coppie.add(k); } }
assert.equal(coppie.size, 120);
const inCasa = Object.fromEntries(ids.map((i) => [i, cal.filter((g) => g.some((m) => m[0] === i)).length]));
assert.ok(Object.values(inCasa).every((n) => n >= 6 && n <= 9), 'casa e trasferta squilibrate: ' + JSON.stringify(inCasa));

// una stagione intera: l'utente vince sempre 2-0
const mem = new Map(), store = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v), removeItem: (k) => mem.delete(k) };
let C = K.nuova(clubs, 'Alex', 'academy', rnd);
assert.equal(K.prossima(C).giornata, 1);
for (let g = 0; g < 15; g++) {
  const p = K.prossima(C); assert.ok(p.avv !== 'academy' && (p.casa === 'academy') === p.inCasa);
  const r = K.giocaCampionato(C, clubs, 2, 0, ['Rossi', 'Rossi'], rnd); assert.equal(r.finita, g === 14);
  assert.ok(K.salva(C, store)); C = K.carica(store); assert.equal(C.giornata, g + 1);
}
const tab = K.classifica(C, clubs);
assert.equal(tab[0].id, 'academy'); assert.equal(tab[0].pt, 45); assert.equal(tab[0].gf, 30); assert.equal(tab[0].gs, 0);
assert.ok(tab.every((r) => r.g === 15 && r.v + r.n + r.p === 15));
assert.equal(tab.reduce((s, r) => s + r.gf, 0), tab.reduce((s, r) => s + r.gs, 0));
assert.equal(K.prossima(C), null); assert.equal(C.campione, 'academy'); assert.deepEqual(C.trofei, [{ stagione: 1, tipo: 'Campionato' }]);
assert.deepEqual(K.capocannoniere(C), { nome: 'Rossi', gol: 30 });
assert.equal(K.giocaCampionato(C, clubs, 1, 0, [], rnd), null);

// coppa: vinta passando quattro turni, con un pareggio deciso ai rigori
let turni = 0, ai = 0;
C.coppa = K.nuova(clubs, 'x', 'academy', rnd).coppa;
for (;;) {
  const p = K.coppaProssima(C); if (!p) break; assert.equal(p.nome, K.TURNI[turni]);
  const e = K.giocaCoppa(C, clubs, turni === 1 ? 1 : 3, 1, [], rnd); turni++;
  if (e.rigori) { ai++; assert.notEqual(e.rigori[0], e.rigori[1]); assert.equal(e.passa, e.rigori[0] > e.rigori[1]); }
  if (!e.passa) break; if (e.vinta) break;
}
assert.ok(ai === 1, 'il pareggio dei quarti va ai rigori');
if (C.coppa.vinta) { assert.equal(turni, 4); assert.equal(C.coppa.campione, 'academy'); assert.ok(C.trofei.some((t) => t.tipo === 'Coppa Titano')); }
else { assert.equal(C.coppa.fuori, 1); assert.ok(C.coppa.campione && C.coppa.campione !== 'academy'); assert.equal(C.coppa.storia.length, 4); }

// coppa: i rigori giocati dall'utente contano al posto di quelli simulati
C.coppa = K.nuova(clubs, 'x', 'academy', rnd).coppa;
{ const e = K.giocaCoppa(C, clubs, 1, 1, [], rnd, [4, 3]); assert.deepEqual(e.rigori, [4, 3]); assert.equal(e.passa, true); assert.equal(C.coppa.turno, 1); const m = C.coppa.storia[0].find((x) => x.a === 'academy' || x.b === 'academy'); assert.deepEqual(m.a === 'academy' ? m.rg : [m.rg[1], m.rg[0]], [4, 3]); }
C.coppa = K.nuova(clubs, 'x', 'academy', rnd).coppa;
{ const e = K.giocaCoppa(C, clubs, 0, 0, [], rnd, [2, 4]); assert.equal(e.passa, false); assert.equal(C.coppa.fuori, 0); }
// coppa: fuori al primo turno, la coppa finisce da sola e ha un vincitore
C.coppa = K.nuova(clubs, 'x', 'academy', rnd).coppa;
const e2 = K.giocaCoppa(C, clubs, 0, 4, [], rnd);
assert.equal(e2.passa, false); assert.equal(C.coppa.fuori, 0); assert.equal(C.coppa.storia.length, 4); assert.equal(C.coppa.storia[3].length, 1); assert.ok(C.coppa.campione); assert.equal(K.coppaProssima(C), null);

// nuova stagione: calendario nuovo, classifica azzerata, statistiche e trofei restano
const prima = C.stat.g; K.nuovaStagione(C, clubs, rnd);
assert.equal(C.stagione, 2); assert.equal(C.giornata, 0); assert.ok(K.classifica(C, clubs).every((r) => r.g === 0)); assert.equal(C.stat.g, prima); assert.ok(C.trofei.length >= 1); assert.ok(K.coppaProssima(C));

// risultati simulati: la più forte vince più spesso, i gol sono plausibili
let v = 0, s = 0, gol = 0; for (let i = 0; i < 4000; i++) { const [a, b] = K.simula(clubs, 'trefiori', 'academy', rnd); v += a > b; s += a < b; gol += a + b; }
assert.ok(v > s * 2.5 && gol / 4000 > 1.8 && gol / 4000 < 4, `forte-debole: ${v} vittorie, ${s} sconfitte, ${(gol / 4000).toFixed(2)} gol`);
// monete: premio per risultato e gol, trofei, turni di coppa
{
  const P = K.PREMI; let M = K.nuova(clubs, 'm', 'academy', rnd); assert.equal(M.monete, P.inizio);
  let r = K.giocaCampionato(M, clubs, 3, 1, [], rnd); assert.equal(r.monete, P.v + 3 * P.gol); assert.equal(M.monete, P.inizio + P.v + 60);
  r = K.giocaCampionato(M, clubs, 0, 0, [], rnd); assert.equal(r.monete, P.n); r = K.giocaCampionato(M, clubs, 0, 2, [], rnd); assert.equal(r.monete, P.p);
  const prima = M.monete; r = K.giocaCoppa(M, clubs, 2, 0, [], rnd); assert.equal(r.monete, P.v + 40 + P.turno); assert.equal(M.monete, prima + r.monete);
  const p2 = M.monete; r = K.giocaCoppa(M, clubs, 0, 1, [], rnd); assert.equal(r.monete, P.p); assert.equal(M.monete, p2 + P.p);
  // carriera salvata prima del mercato: riceve monete e rose vuote
  const vecchia = JSON.parse(JSON.stringify(M)); delete vecchia.monete; delete vecchia.rose; delete vecchia.movimenti;
  const letta = K.carica({ getItem: () => JSON.stringify(vecchia) }); assert.equal(letta.monete, P.inizio); assert.deepEqual(letta.rose, {}); assert.deepEqual(letta.movimenti, []);
}
// mercato: prezzi, scambio, monete insufficienti, ruolo diverso, numeri di maglia, ritorno alle rose di partenza
{
  const cl = JSON.parse(JSON.stringify(clubs)), valore = (ruolo, q) => 50 + q; // valore di prova: cresce col prezzo del listone
  assert.ok(K.prezzo(88) > K.prezzo(70) * 3 && K.prezzo(55) <= 100 && K.prezzo(50) === 0);
  assert.equal(K.costoScambio(70, 70), K.prezzo(70) - Math.round(K.prezzo(70) * .7 / 10) * 10); assert.ok(K.costoScambio(60, 80) < 0);
  const M = K.nuova(cl, 'm', 'academy', rnd); K.applica(M, cl);
  const mio = cl.find((c) => c.id === 'academy'), forte = cl.find((c) => c.id === 'trefiori'), iIn = 9, iOut = 9, preso = forte.xi[iIn].slice(), ceduto = mio.xi[iOut].slice();
  const costo = K.costoScambio(valore(preso[1], preso[3]), valore(ceduto[1], ceduto[3])); assert.ok(costo > M.monete, 'il più forte deve costare più delle monete iniziali');
  assert.deepEqual(K.scambio(M, cl, valore, 'trefiori', iIn, iOut), { ok: false, motivo: 'monete', costo }); assert.equal(mio.xi[iOut][0], ceduto[0]);
  assert.equal(K.scambio(M, cl, valore, 'trefiori', 0, 9).motivo, 'ruolo'); assert.equal(K.scambio(M, cl, valore, 'academy', 9, 9).motivo, 'squadra');
  M.monete = costo + 5; const r = K.scambio(M, cl, valore, 'trefiori', iIn, iOut);
  assert.deepEqual(r, { ok: true, costo }); assert.equal(M.monete, 5); assert.equal(mio.xi[iOut][0], preso[0]); assert.equal(forte.xi[iIn][0], ceduto[0]);
  assert.equal(new Set(mio.xi.map((x) => x[2])).size, 11, 'numeri di maglia doppi'); assert.equal(new Set(forte.xi.map((x) => x[2])).size, 11);
  assert.equal(mio.xi.map((x) => x[1]).join(''), 'PDDDDCCCAAA'); assert.equal(M.movimenti[0].preso, preso[0]); assert.equal(mio.xi0[iOut][0], ceduto[0]);
  // salvata e riletta, la rosa resta quella nuova; senza carriera tornano le rose di partenza
  const letta = K.carica({ getItem: () => JSON.stringify(M) }), cl2 = JSON.parse(JSON.stringify(clubs)); K.applica(letta, cl2);
  assert.equal(cl2.find((c) => c.id === 'academy').xi[iOut][0], preso[0]); K.applica(null, cl2); assert.equal(cl2.find((c) => c.id === 'academy').xi[iOut][0], ceduto[0]);
  // cedere un forte per uno scarso fa incassare
  M.monete = 0; const r2 = K.scambio(M, cl, valore, 'trefiori', iIn, iOut); assert.ok(r2.ok && r2.costo < 0 && M.monete === -r2.costo);
}
// panchina: i dati hanno le riserve; titolare e riserva dello stesso ruolo si scambiano, e lo scambio resta salvato
{
  for (const c of clubs) { assert.ok(c.pan && c.pan.length >= 5, c.id + ' senza riserve'); assert.equal(c.pan[0][1], 'P'); const tutti = c.xi.concat(c.pan); assert.equal(new Set(tutti.map((x) => x[0])).size, tutti.length, c.id + ': nomi doppi'); assert.equal(new Set(tutti.map((x) => x[2])).size, tutti.length, c.id + ': numeri doppi'); }
  const cl = JSON.parse(JSON.stringify(clubs)), M = K.nuova(cl, 'm', 'trefiori', rnd); K.applica(M, cl);
  const mio = cl.find((c) => c.id === 'trefiori'), tit = mio.xi[2].slice(), ris = mio.pan[1].slice(); assert.equal(tit[1], 'D'); assert.equal(ris[1], 'D');
  assert.equal(K.cambiaTitolare(M, cl, 2, 0), false, 'difensore con portiere'); assert.equal(K.cambiaTitolare(M, cl, 2, 99), false);
  assert.equal(K.cambiaTitolare(M, cl, 2, 1), true); assert.equal(mio.xi[2][0], ris[0]); assert.equal(mio.pan[1][0], tit[0]); assert.equal(mio.xi.map((x) => x[1]).join(''), 'PDDDDCCCAAA'); assert.equal(mio.xi0[2][0], tit[0]);
  const letta = K.carica({ getItem: () => JSON.stringify(M) }), cl2 = JSON.parse(JSON.stringify(clubs)); K.applica(letta, cl2); const m2 = cl2.find((c) => c.id === 'trefiori');
  assert.equal(m2.xi[2][0], ris[0]); assert.equal(m2.pan[1][0], tit[0]); K.applica(null, cl2); assert.equal(m2.xi[2][0], tit[0]); assert.equal(m2.pan[1][0], ris[0]);
  // il mercato dopo uno scambio in rosa: la panchina resta com'è
  M.monete = 99999; const r = K.scambio(M, cl, (ruolo, q) => 50 + q, 'virtus', 9, 9); assert.ok(r.ok); assert.equal(mio.pan[1][0], tit[0]); assert.equal(mio.xi[2][0], ris[0]);
}
// ---------- Trofeo dei Castelli: gironi, quarti, fino alla fine; fuori ai gironi il trofeo va avanti da solo
{
  for (const vinco of [true, false]) {
    const M = K.nuova(clubs, 'm', 'academy', rnd), k = M.castelli;
    assert.equal(k.gironi.length, 4); assert.equal(new Set(k.gironi.flat()).size, 16);
    const vist = new Set(); let partite = 0;
    for (;;) {
      const p = K.castelliProssima(M); if (!p) break; partite++;
      if (p.fase === 'gironi') { assert.ok(!vist.has(p.avv), 'stesso avversario due volte nel girone'); vist.add(p.avv); assert.ok(k.gironi[p.girone].includes(p.avv)); }
      const e = K.giocaCastelli(M, clubs, vinco ? 3 : 0, vinco ? 0 : 3, [], rnd); assert.ok(e);
      if (p.fase === 'gironi' && p.giornata === 3) assert.equal(e.passa, vinco);
    }
    const tab = K.castelliTabella(M, K.castelliGirone(M)); assert.ok(tab.every((r) => r.g === 3)); assert.equal(tab.reduce((a, r) => a + r.gf, 0), tab.reduce((a, r) => a + r.gs, 0));
    for (let gi = 0; gi < 4; gi++) assert.ok(K.castelliTabella(M, gi).every((r) => r.g === 3), 'girone ' + gi + ' non finito');
    if (vinco) { assert.equal(partite, 6); assert.equal(k.vinta, true); assert.ok(M.trofei.some((x) => x.tipo === 'Trofeo dei Castelli')); assert.equal(K.castelliCampione(M), 'academy'); assert.equal(k.ko.storia.length, 3); }
    else { assert.equal(partite, 3); assert.equal(k.fuori, 'gironi'); assert.ok(K.castelliCampione(M) && K.castelliCampione(M) !== 'academy'); assert.equal(k.ko.storia.length, 3); assert.equal(k.ko.storia[2].length, 1); }
    // nei quarti le prime due di uno stesso girone non si incontrano
    const q = k.ko.storia[0].map((m) => [m.a, m.b]); for (const [a, b] of q) assert.ok(!k.gironi.some((g) => g.includes(a) && g.includes(b)), 'stesso girone ai quarti');
  }
}
// ---------- sfide: contatori, cambio di giorno e di settimana, premi, premio di gruppo, carriera e stagione
{
  const M = K.nuova(clubs, 'm', 'academy', rnd), lun = new Date(2026, 10, 16, 10), mar = new Date(2026, 10, 17, 10), lun2 = new Date(2026, 10, 23, 9);
  assert.equal(K.settimanaDi(lun), '2026-W47'); assert.equal(K.settimanaDi(new Date(2026, 10, 22, 23)), '2026-W47'); assert.equal(K.settimanaDi(lun2), '2026-W48'); assert.equal(K.settimanaDi(new Date(2027, 0, 1)), '2026-W53');
  assert.equal(K.giornoDi(K.fineSettimana(mar)), '2026-11-23'); assert.equal(K.giornoDi(K.fineSettimana(lun)), '2026-11-23'); assert.equal(K.giornoDi(K.fineSettimana(new Date(2026, 10, 22))), '2026-11-23');
  let st = K.statoSfide(M, lun); assert.deepEqual(st.conti.d, [0, 5]); assert.deepEqual(st.conti.c, [0, 4]); assert.deepEqual(st.conti.s, [0, 8]); assert.equal(st.daRiscuotere, 0);
  // si gioca martedì: campionato 3-0 in casa... la data delle sfide la passa conta() con l'ora vera, quindi qui si usano gli eventi diretti
  K.aggiornaSfide(M, mar); const c = M.sfide.d.c; Object.assign(c, { gioca: 1, vinte: 1, gol: 3, inviolate: 1, coppa: 1 });
  st = K.statoSfide(M, mar); assert.deepEqual(st.conti.d, [5, 5]); assert.equal(st.bonus.d.fatto, true); assert.equal(st.daRiscuotere, 6);
  const m0 = M.monete, g0 = M.gemme, r = K.riscuotiTutto(M, mar); assert.equal(r.n, 6); assert.equal(M.monete, m0 + 100 + 150 + 120 + 150 + 100); assert.equal(M.gemme, g0 + 5);
  assert.equal(K.riscuoti(M, 'd', 'd1', mar).ok, false, 'riscossa due volte'); assert.equal(K.statoSfide(M, mar).daRiscuotere, 0);
  st = K.statoSfide(M, new Date(2026, 10, 18, 8)); assert.deepEqual(st.conti.d, [0, 5], 'le giornaliere ripartono il giorno dopo');
  // settimana: allenamenti e acquisti contano, poi ripartono il lunedì
  K.evento(M, 'allenamenti', 3, mar); K.evento(M, 'acquisti', 1, mar); st = K.statoSfide(M, mar); assert.ok(st.w.find((x) => x.id === 'w5').fatto && st.w.find((x) => x.id === 'w4').fatto);
  assert.equal(K.statoSfide(M, lun2).w.find((x) => x.id === 'w5').prog, 0);
  // carriera: lo stadio al 3 e i trofei; stagione: ripartono con la stagione nuova
  M.stadio = 3; M.trofei.push({ stagione: 1, tipo: 'Coppa Titano' }); st = K.statoSfide(M, lun2); assert.ok(st.c.find((x) => x.id === 'c4').fatto && st.c.find((x) => x.id === 'c2').fatto && !st.c.find((x) => x.id === 'c1').fatto);
  K.evento(M, 'top4', 1, lun2); assert.ok(K.statoSfide(M, lun2).s.find((x) => x.id === 's3').fatto); K.nuovaStagione(M, clubs, rnd); assert.ok(!K.statoSfide(M, lun2).s.find((x) => x.id === 's3').fatto);
  assert.ok(K.statoSfide(M, lun2).c.find((x) => x.id === 'c4').fatto, 'le sfide di carriera restano');
}
// ---------- partite vere: le sfide avanzano da sole, lo stadio dà l'incasso in casa, la serie di vittorie
{
  const M = K.nuova(clubs, 'm', 'academy', rnd); M.stadio = 3; let casa = 0, fuori = 0;
  for (let i = 0; i < 4; i++) { const p = K.prossima(M), m0 = M.monete, r = K.giocaCampionato(M, clubs, 2, 0, ['X'], rnd); const atteso = K.PREMI.v + 2 * K.PREMI.gol + (p.inCasa ? K.STADIO[2].bonus : 0); assert.equal(M.monete - m0, atteso); assert.equal(r.monete, atteso); p.inCasa ? casa++ : fuori++; }
  const st = K.statoSfide(M); assert.equal(M.sfide.s.c.vinteCamp, 4); assert.equal(M.sfide.s.c.serieMax, 4); assert.equal(M.sfide.s.c.inviolate, 4); assert.ok(st.s.find((x) => x.id === 's8').fatto);
  K.giocaCampionato(M, clubs, 0, 1, [], rnd); assert.equal(M.sfide.s.c.serie, 0); assert.equal(M.sfide.s.c.serieMax, 4);
  const p = K.coppaProssima(M); K.giocaCoppa(M, clubs, 1, 0, [], rnd); assert.equal(M.sfide.s.c.quarti, 1); assert.equal(M.sfide.d.c.coppa, 1);
}
// ---------- stadio e allenamento
{
  const cl = JSON.parse(JSON.stringify(clubs)), M = K.nuova(cl, 'm', 'academy', rnd); K.applica(M, cl);
  assert.equal(K.miglioraStadio(M).motivo, 'soldi'); M.monete = 1500; assert.deepEqual(K.miglioraStadio(M), { ok: true, livello: 2 }); assert.equal(M.monete, 0);
  M.monete = 99999; M.gemme = 0; assert.equal(K.miglioraStadio(M).motivo, 'soldi', 'il livello 3 vuole anche le gemme'); M.gemme = 999;
  K.miglioraStadio(M); K.miglioraStadio(M); K.miglioraStadio(M); assert.equal(M.stadio, 5); assert.equal(K.miglioraStadio(M).motivo, 'massimo');
  const mio = cl.find((c) => c.id === 'academy'), q0 = mio.xi[9][3], nome = mio.xi[9][0]; M.monete = 99999;
  for (let i = 0; i < K.ALLENA.max; i++) { const c0 = K.costoAllenamento(M, nome), r = K.allena(M, cl, 'xi', 9); assert.ok(r.ok); assert.equal(r.costo, c0); }
  assert.equal(mio.xi[9][3], q0 + K.ALLENA.max); assert.equal(K.allena(M, cl, 'xi', 9).motivo, 'massimo');
  const qp = mio.pan[0][3]; assert.ok(K.allena(M, cl, 'pan', 0).ok); assert.equal(mio.pan[0][3], qp + 1); assert.equal(mio.xi[9][3], q0 + K.ALLENA.max, 'allenare una riserva non tocca i titolari');
  M.monete = 0; assert.equal(K.allena(M, cl, 'xi', 1).motivo, 'monete'); assert.equal(M.sfide.w.c.allenamenti, K.ALLENA.max + 1);
  const letta = K.carica({ getItem: () => JSON.stringify(M) }), cl2 = JSON.parse(JSON.stringify(clubs)); K.applica(letta, cl2); assert.equal(cl2.find((c) => c.id === 'academy').xi[9][3], q0 + K.ALLENA.max);
}
// ---------- capitano: entra al posto del titolare più debole del suo ruolo, la sua squadra resta con undici e tutti i numeri diversi
{
  for (const [da, i] of [['trefiori', 9], ['lafiorita', 0], ['virtus', 2], ['cosmos', 6]]) {
    const cl = JSON.parse(JSON.stringify(clubs)), M = K.nuova(cl, 'm', 'academy', rnd, { nome: 'Titani FC', sigla: 'TIT', c1: '#4B06FC', c2: '#D9F51F' }); K.applica(M, cl);
    const mio = cl.find((c) => c.id === 'academy'), altro = cl.find((c) => c.id === da), cap = altro.xi[i].slice(), ruolo = cap[1];
    const debole = mio.xi.filter((x) => x[1] === ruolo).sort((a, b) => a[3] - b[3])[0][0], tot0 = mio.xi.length + mio.pan.length + altro.xi.length + altro.pan.length;
    assert.ok(K.scegliCapitano(M, cl, da, i));
    assert.ok(mio.xi.some((x) => x[0] === cap[0]), 'capitano in campo'); assert.ok(mio.pan.some((x) => x[0] === debole) || altro.pan.some((x) => x[0] === debole) || altro.xi.some((x) => x[0] === debole), 'il titolare più debole va in panchina');
    assert.ok(!altro.xi.some((x) => x[0] === cap[0]) && !altro.pan.some((x) => x[0] === cap[0]));
    assert.equal(mio.xi.length, 11); assert.equal(altro.xi.length, 11); assert.ok(mio.pan.length <= 7); assert.equal(mio.xi.length + mio.pan.length + altro.xi.length + altro.pan.length, tot0, 'nessuno sparisce');
    assert.equal(mio.xi.map((x) => x[1]).join(''), 'PDDDDCCCAAA'); assert.equal(altro.xi.map((x) => x[1]).join(''), 'PDDDDCCCAAA');
    for (const c of [mio, altro]) { const t = c.xi.concat(c.pan); assert.equal(new Set(t.map((x) => x[2])).size, t.length, c.id + ': numeri doppi'); assert.equal(new Set(t.map((x) => x[0])).size, t.length, c.id + ': nomi doppi'); }
    assert.equal(M.mio.capitano, cap[0]); assert.equal(M.mio.nome, 'Titani FC');
  }
  const cl = JSON.parse(JSON.stringify(clubs)), M = K.nuova(cl, 'm', 'academy', rnd); K.applica(M, cl); assert.equal(K.scegliCapitano(M, cl, 'academy', 3), false);
}
// ---------- carriere salvate prima: si completano coi campi nuovi; salva conta i salvataggi
{
  const vecchia = { v: 1, nome: 'x', club: 'trefiori', stagione: 2, giornata: 3, cal: K.calendario(clubs.map((c) => c.id), rnd), ris: [], coppa: { turno: 0, squadre: clubs.map((c) => c.id), storia: [], fuori: null, vinta: false, campione: null }, stat: { g: 3, v: 1, n: 1, p: 1, gf: 4, gs: 3, marc: {} }, trofei: [], campione: null };
  const C2 = K.carica({ getItem: () => JSON.stringify(vecchia) }); assert.ok(C2 && C2.id && C2.sfide && C2.castelli && C2.castelli.gironi.length === 4 && C2.gemme === K.PREMI.gemme && C2.stadio === 1 && C2.mio === null);
  assert.ok(K.castelliProssima(C2)); const mem = {}; const st = { setItem: (k, v) => { mem[k] = v; } }; K.salva(C2, st); K.salva(C2, st); assert.equal(C2.rev, 2); assert.equal(JSON.parse(mem[K.KEY]).rev, 2);
}
// ---------- home nuova: storico di entrate e uscite, percorso premi, allenatore, movimento in classifica, notifiche
{
  const { ECONOMIA: E } = await import('../src/config.js');
  const cl = JSON.parse(JSON.stringify(clubs)), M = K.nuova(cl, 'm', 'academy', rnd); K.applica(M, cl);
  assert.equal(M.storico.length, 0); assert.equal(K.finanze(M), 'Discrete');
  // ogni partita lascia una riga nello storico, e il saldo scritto nella riga è quello vero
  const m0 = M.monete, r1 = K.giocaCampionato(M, cl, 3, 1, ['X', 'X', 'Y'], rnd);
  assert.equal(M.monete, m0 + r1.monete); assert.ok(M.storico.length >= 1 && M.storico[0].sm === M.monete && M.storico.some((x) => x.c === 'partita' && x.m === K.PREMI.v + 3 * K.PREMI.gol));
  assert.equal(M.storico.reduce((t, x) => t + x.m, 0), M.monete - m0, 'lo storico non torna col saldo');
  // percorso: una vittoria dà i punti di partita e vittoria; il premio si ritira una volta sola
  assert.equal(K.statoPercorso(M).punti, E.percorso.punti.partita + E.percorso.punti.vinta);
  M.percorso.punti = E.percorso.perLivello * 2 + 5; let sp = K.statoPercorso(M);
  assert.equal(sp.livello, 2); assert.equal(sp.daRitirare, 2); assert.equal(sp.nelLivello, 5);
  const g0 = M.gemme, m1 = M.monete, rp = K.ritiraPercorso(M); assert.ok(rp.ok && rp.n === 2); assert.equal(M.monete, m1 + E.percorso.premi[0].m); assert.equal(M.gemme, g0 + E.percorso.premi[1].g);
  assert.equal(K.ritiraPercorso(M).ok, false); assert.equal(K.statoPercorso(M).daRitirare, 0);
  M.percorso.punti = 99999; sp = K.statoPercorso(M); assert.equal(sp.livello, E.percorso.premi.length);
  assert.equal(E.percorso.premi.reduce((t, x) => t + (x.m || 0), 0), 2400); assert.equal(E.percorso.premi.reduce((t, x) => t + (x.g || 0), 0), 54);
  // riscuotere una sfida dà anche punti al percorso; la stagione nuova lo azzera
  const p0 = M.percorso.punti; K.riscuotiTutto(M); assert.ok(M.percorso.punti > p0, 'la sfida riscossa non ha dato punti al percorso');
  // allenatore: senza soldi no; coi soldi sale, permette una seduta in più e fa lo sconto
  const A = K.nuova(cl, 'a', 'academy', rnd); assert.equal(K.miglioraAllenatore(A).ok, false); assert.equal(K.votoAllenatore(A), 60); assert.equal(K.seduteMax(A), K.ALLENA.max);
  const pieno = K.costoAllenamento(A, 'Tizio'); A.monete = 50000; A.gemme = 100; assert.ok(K.miglioraAllenatore(A).ok); assert.equal(K.votoAllenatore(A), 70); assert.equal(K.seduteMax(A), K.ALLENA.max + 1);
  assert.ok(K.costoAllenamento(A, 'Tizio') < pieno); assert.equal(A.storico[0].c, 'allenatore'); assert.equal(A.monete, 50000 - E.allenatore.livelli[1].monete);
  for (let i = 0; i < 5; i++) K.miglioraAllenatore(A); assert.equal(A.allenatore, 5); assert.equal(K.miglioraAllenatore(A).motivo, 'massimo'); assert.equal(K.votoAllenatore(A), 99);
  // movimento in classifica: la somma è zero, e alla prima giornata nessuno si muove
  const S = K.nuova(cl, 's', 'academy', rnd); K.giocaCampionato(S, cl, 5, 0, [], rnd); assert.ok(Object.values(K.salite(S, cl)).every((n) => n === 0));
  K.giocaCampionato(S, cl, 0, 5, [], rnd); const sal = K.salite(S, cl); assert.equal(Object.values(sal).reduce((t, n) => t + n, 0), 0); assert.ok(Object.values(sal).some((n) => n !== 0));
  // classifica: posizioni tutte diverse (punti, poi differenza reti, poi gol fatti)
  const tab = K.classifica(S, cl); for (let i = 1; i < tab.length; i++) assert.ok(tab[i - 1].pt > tab[i].pt || (tab[i - 1].pt === tab[i].pt && tab[i - 1].gf - tab[i - 1].gs >= tab[i].gf - tab[i].gs));
  // notifiche: le coppe da giocare ci sono dall'inizio; coi soldi compaiono stadio e allenatore
  const N = K.nuova(cl, 'n', 'academy', rnd); let nn = K.notifiche(N); assert.ok(nn.some((x) => x.vai === 'coppa') && nn.some((x) => x.vai === 'castelli') && !nn.some((x) => x.vai === 'stadio'));
  N.monete = 99999; N.gemme = 99; nn = K.notifiche(N); assert.ok(nn.some((x) => x.vai === 'stadio') && nn.some((x) => x.vai === 'allenatore'));
  // prezzi: un giocatore forte costa più o meno un campionato di chi gioca in modo normale
  assert.equal(K.prezzo(85), 4900); assert.equal(K.prezzo(72), 1940);
}
// ---------- il listino del server (supabase/002-lapartita-economia.sql) dice gli stessi numeri del gioco
{
  const { ECONOMIA: E } = await import('../src/config.js');
  const sql = readFileSync(new URL('../supabase/002-lapartita-economia.sql', import.meta.url), 'utf8'), L = {};
  for (const m of sql.matchAll(/\('([a-z0-9_]+)', '(monete|diamanti|numero)', (-?\d+)\)/g)) L[`${m[1]}:${m[2]}`] = +m[3];
  const vale = (codice, valuta, atteso) => assert.equal(L[`${codice}:${valuta}`], atteso, `listino ${codice} (${valuta}): il server dice ${L[`${codice}:${valuta}`]}, il gioco ${atteso}`);
  const P = K.PREMI; vale('inizio', 'monete', P.inizio); vale('inizio', 'diamanti', P.gemme); vale('vittoria', 'monete', P.v); vale('pareggio', 'monete', P.n); vale('sconfitta', 'monete', P.p); vale('gol', 'monete', P.gol);
  vale('turno', 'monete', P.turno); vale('campionato', 'monete', P.campione); vale('coppa', 'monete', P.coppa); vale('castelli', 'monete', P.castelli); vale('mercato_cessione', 'numero', Math.round(P.cessione * 100)); vale('mercato_coefficiente', 'numero', Math.round(E.prezzo * 100));
  K.STADIO.forEach((x, i) => { vale(`casa_${i + 1}`, 'monete', x.bonus); if (i) { vale(`stadio_${i + 1}`, 'monete', -x.monete); if (x.gemme) vale(`stadio_${i + 1}`, 'diamanti', -x.gemme); else assert.equal(L[`stadio_${i + 1}:diamanti`], undefined); } });
  E.allenatore.livelli.forEach((x, i) => { if (i) { vale(`allenatore_${i + 1}`, 'monete', -x.monete); if (x.gemme) vale(`allenatore_${i + 1}`, 'diamanti', -x.gemme); else assert.equal(L[`allenatore_${i + 1}:diamanti`], undefined); } });
  for (const g of Object.keys(K.SFIDE)) for (const x of K.SFIDE[g]) { if (x.monete) vale(`sfida_${x.id}`, 'monete', x.monete); if (x.gemme) vale(`sfida_${x.id}`, 'diamanti', x.gemme); }
  for (const g of Object.keys(K.BONUS)) vale(`sfida_${g}_tutte`, 'diamanti', K.BONUS[g].gemme);
  E.percorso.premi.forEach((x, i) => vale(`percorso_${i + 1}`, x.m ? 'monete' : 'diamanti', x.m || x.g));
  vale('allenamento_base', 'numero', K.ALLENA.base); vale('allenamento_passo', 'numero', K.ALLENA.passo); vale('allenamento_sedute', 'numero', K.ALLENA.max); vale('allenatore_sconto', 'numero', Math.round(E.allenatore.sconto * 100));
}
assert.equal(K.carica({ getItem: () => '{rotto' }), null); assert.equal(K.carica({ getItem: () => null }), null);
console.log(`Carriera: tutte le prove passate (forte contro debole: ${v} vittorie, ${s} sconfitte su 4000, ${(gol / 4000).toFixed(2)} gol a partita)`);
