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
  assert.ok(K.prezzo(88) > K.prezzo(70) * 3 && K.prezzo(55) < 100 && K.prezzo(50) === 0);
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
assert.equal(K.carica({ getItem: () => '{rotto' }), null); assert.equal(K.carica({ getItem: () => null }), null);
console.log(`Carriera: tutte le prove passate (forte contro debole: ${v} vittorie, ${s} sconfitte su 4000, ${(gol / 4000).toFixed(2)} gol a partita)`);
