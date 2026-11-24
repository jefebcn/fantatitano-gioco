/* Prove della logica della carriera (src/carriera.js). Uso: node scripts/prova-carriera.mjs */
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import * as K from '../src/carriera.js';
import { ECONOMIA } from '../src/config.js';

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
assert.equal(K.prossima(C), null); assert.equal(C.campione, 'academy'); assert.deepEqual(C.trofei, [{ stagione: 1, tipo: 'Campionato', div: 5 }]);
assert.deepEqual(K.capocannoniere(C), { nome: 'Rossi', gol: 30 }); assert.deepEqual(K.marcatori(C, 1), [{ nome: 'Rossi', gol: 30 }]); assert.ok(K.marcatori(C).length <= 3 && K.marcatori(C).every((m, i, l) => !i || l[i - 1].gol >= m.gol));
// chi vince il campionato ha il premio del trofeo e non quello del piazzamento
assert.ok(C.storico.some((m) => m.c === 'trofeo')); assert.ok(!C.storico.some((m) => m.c === 'piazzamento'));
// premio di fine campionato per piazzamento: chi non vince ha le vittorie del suo posto, dal secondo fin dove arriva
// l'elenco; oltre, niente. Qui un po' di carriere con risultati diversi, per coprire più posti
{
  // numeri a caso suoi, per non spostare quelli delle prove che seguono
  let s2 = 99; const rnd2 = () => { s2 = (s2 * 1664525 + 1013904223) >>> 0; return s2 / 4294967296; };
  const visti = new Set();
  for (const [gf, gs, quante] of [[1, 1, 15], [0, 1, 15], [2, 1, 9], [1, 0, 6], [3, 2, 12], [1, 1, 8]]) {
    const P = K.nuova(clubs, 'Piazzato', 'academy', rnd2);
    for (let g = 0; g < 15; g++) K.giocaCampionato(P, clubs, g < quante ? gf : 0, g < quante ? gs : 2, [], rnd2);
    const pos = K.classifica(P, clubs).findIndex((r) => r.id === 'academy') + 1, mov = P.storico.filter((m) => m.c === 'piazzamento'), atteso = ECONOMIA.premi.piazzamento[pos - 2];
    visti.add(pos);
    if (pos === 1 || !atteso) assert.equal(mov.length, 0, `al ${pos}° posto non c'è premio di piazzamento`);
    else { assert.equal(mov.length, 1); assert.equal(mov[0].m, K.inMonete(P, atteso), `premio del ${pos}° posto`); }
  }
  assert.ok(visti.size >= 2, 'le carriere di prova devono finire in posti diversi');
}
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
// classifica a pari punti: prima la differenza reti, poi i gol fatti, poi il nome della squadra (non la sigla interna)
{
  const cl = JSON.parse(JSON.stringify(clubs)), Z = K.nuova(cl, 'z', 'academy', rnd), t0 = K.classifica(Z, cl);
  const nomi = t0.map((r) => cl.find((c) => c.id === r.id).name);
  assert.deepEqual(nomi, nomi.slice().sort((a, b) => a.localeCompare(b, 'it')), 'a zero punti la classifica va in ordine di nome');
  // il club dell'utente con un nome nuovo cambia posto: conta il nome che si vede
  cl.find((c) => c.id === 'academy').name = 'Aaa Primi'; assert.equal(K.classifica(Z, cl)[0].id, 'academy');
  // una vittoria per 3-0 batte una per 1-0, e a pari differenza reti chi ha segnato di più sta davanti
  Z.ris[0] = Z.cal[0].map((_, k) => (k === 0 ? [3, 0] : k === 1 ? [1, 0] : k === 2 ? [4, 1] : [0, 0])); const t1 = K.classifica(Z, cl);
  assert.equal(t1[0].id, Z.cal[0][2][0]); assert.equal(t1[1].id, Z.cal[0][0][0]); assert.equal(t1[2].id, Z.cal[0][1][0]);
  // la forma: gli ultimi risultati di ogni squadra, dal più vecchio al più recente; chi non ha giocato non c'è
  const f1 = K.forma(Z); assert.deepEqual(f1[Z.cal[0][0][0]], ['v']); assert.deepEqual(f1[Z.cal[0][0][1]], ['p']); assert.deepEqual(f1[Z.cal[0][3][0]], ['n']); assert.deepEqual(K.forma(K.nuova(cl, 'z', 'academy', rnd)), {});
  // con più giornate restano solo le ultime richieste, e l'ultima giocata è in fondo
  for (let g = 1; g < 7; g++) Z.ris[g] = Z.cal[g].map(([a]) => (a === 'academy' ? [0, 2] : [1, 1]));
  Z.ris[7] = Z.cal[7].map((m) => (m.includes('academy') ? (m[0] === 'academy' ? [5, 0] : [0, 5]) : [1, 1]));
  const f8 = K.forma(Z), f3 = K.forma(Z, 3); assert.ok(Object.values(f8).every((x) => x.length === 5)); assert.equal(f8.academy[4], 'v'); assert.deepEqual(f3.academy, f8.academy.slice(-3));
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
// ---------- capitano: entra al posto del titolare più debole del suo ruolo, la sua squadra resta con undici e tutti i numeri diversi
{
  for (const [da, i] of [['trefiori', 9], ['lafiorita', 0], ['virtus', 2], ['cosmos', 6]]) {
    const cl = JSON.parse(JSON.stringify(clubs)), M = K.nuova(cl, 'm', 'academy', rnd, { nome: 'Titani FC', sigla: 'TIT', c1: '#4B06FC', c2: '#D9F51F' }); K.applica(M, cl);
    const mio = cl.find((c) => c.id === 'academy'), altro = cl.find((c) => c.id === da), cap = altro.xi[i].slice(), ruolo = cap[1];
    const debole = mio.xi.filter((x) => x[1] === ruolo).sort((a, b) => a[3] - b[3])[0][0], tot0 = mio.xi.length + mio.pan.length + altro.xi.length + altro.pan.length;
    assert.ok(K.scegliCapitano(M, cl, da, i));
    assert.ok(mio.xi.some((x) => x[0] === cap[0]), 'capitano in campo'); assert.ok(mio.pan.some((x) => x[0] === debole) || altro.pan.some((x) => x[0] === debole) || altro.xi.some((x) => x[0] === debole), 'il titolare più debole va in panchina');
    assert.ok(!altro.xi.some((x) => x[0] === cap[0]) && !altro.pan.some((x) => x[0] === cap[0]));
    assert.equal(mio.xi.length, 11); assert.equal(altro.xi.length, 11); assert.equal(mio.xi.length + mio.pan.length + altro.xi.length + altro.pan.length, tot0, 'nessuno sparisce');
    assert.equal(mio.xi.map((x) => x[1]).join(''), 'PDDDDCCCAAA'); assert.equal(altro.xi.map((x) => x[1]).join(''), 'PDDDDCCCAAA');
    for (const c of [mio, altro]) { const t = c.xi.concat(c.pan); assert.equal(new Set(t.map((x) => x[2])).size, t.length, c.id + ': numeri doppi'); assert.equal(new Set(t.map((x) => x[0])).size, t.length, c.id + ': nomi doppi'); }
    assert.equal(M.mio.capitano, cap[0]); assert.equal(M.mio.nome, 'Titani FC');
  }
  const cl = JSON.parse(JSON.stringify(clubs)), M = K.nuova(cl, 'm', 'academy', rnd); K.applica(M, cl); assert.equal(K.scegliCapitano(M, cl, 'academy', 3), false);
}
// ---------- negozio: oggetti gratis e a pagamento, pezzi dello stemma
{
  const { ECONOMIA: E } = await import('../src/config.js');
  const cl = JSON.parse(JSON.stringify(clubs)), N = K.nuova(cl, 'n', 'academy', rnd), g0 = N.gemme, m0 = N.monete;
  // quello che è gratis si ha subito e non si compra; il resto no
  assert.ok(K.possiede(N, 'avatar', 0) && K.possiede(N, 'forma', 'scudo') && K.possiede(N, 'simbolo', 'corona') && !K.possiede(N, 'avatar', 6) && !K.possiede(N, 'bordo', 'oro') && !K.possiede(N, 'terza', 'terza'));
  assert.equal(K.compraOggetto(N, 'avatar', 0).motivo, 'presa'); assert.equal(K.compraOggetto(N, 'avatar', 99).motivo, 'cosa'); assert.equal(K.compraOggetto(N, 'boh', 'x').motivo, 'cosa');
  // si paga il prezzo del tipo, una volta sola, e resta scritto nello storico
  assert.deepEqual(K.costoOggetto('avatar', 6), { monete: 0, gemme: E.negozio.avatar.g }); assert.ok(K.compraOggetto(N, 'avatar', 6).ok); assert.equal(N.gemme, g0 - E.negozio.avatar.g);
  assert.ok(K.possiede(N, 'avatar', 6)); assert.equal(K.compraOggetto(N, 'avatar', 6).motivo, 'presa'); assert.equal(N.storico[0].c, 'negozio'); assert.equal(N.storico[0].g, -E.negozio.avatar.g);
  // senza diamanti non si compra e il saldo non cambia
  N.gemme = 3; assert.equal(K.compraOggetto(N, 'terza', 'terza').motivo, 'soldi'); assert.equal(N.gemme, 3);
  // pezzi dello stemma: i semplici a monete, i rari a diamanti; la percentuale parte alta (base gratis ricca) e arriva a 100
  assert.deepEqual(K.costoOggetto('forma', 'rombo'), { monete: E.negozio.stemma.m, gemme: 0 }); assert.deepEqual(K.costoOggetto('bordo', 'oro'), { monete: 0, gemme: E.negozio.stemmaRaro.g });
  const p0 = K.pezziStemma(N); assert.ok(p0 >= 50 && p0 < 100, `pezzi dello stemma all'inizio: ${p0}%`);
  N.monete = 99999; N.gemme = 999; for (const tipo of ['forma', 'simbolo', 'bordo']) for (const x of K.NEGOZIO[tipo].tutti) if (!K.possiede(N, tipo, x)) assert.ok(K.compraOggetto(N, tipo, x).ok);
  assert.equal(K.pezziStemma(N), 100); assert.ok(m0 > 0);
  // ogni tipo del catalogo ha un prezzo, e i gratis esistono davvero
  for (const [tipo, o] of Object.entries(K.NEGOZIO)) { for (const x of o.gratis) assert.ok(o.tutti.includes(x), `${tipo}: ${x} gratis ma non in elenco`); for (const x of o.tutti) { const c = K.costoOggetto(tipo, x); assert.ok(o.gratis.includes(x) ? c.monete + c.gemme === 0 : c.monete + c.gemme > 0, `${tipo}: ${x} senza prezzo`); } }
}
// ---------- la rosa: scambi di posto, portiere solo in porta, incarichi, fisioterapista
{
  const { ECONOMIA: E } = await import('../src/config.js');
  const cl = JSON.parse(JSON.stringify(clubs)), N = K.nuova(cl, 'r', 'academy', rnd, { nome: 'Rosa', sigla: 'ROS', c1: '#111111', c2: '#ffffff' });
  K.applica(N, cl); const mio = cl.find((c) => c.id === N.club), nomi = () => [mio.xi.map((x) => x[0]), mio.pan.map((x) => x[0])];
  const [xi0, pan0] = nomi(), j = mio.pan.findIndex((x) => x[1] !== 'P'), jp = mio.pan.findIndex((x) => x[1] === 'P');
  // un titolare e uno della panchina, anche di ruoli diversi: si scambiano e resta scritto nella carriera
  assert.ok(K.spostaGiocatori(N, cl, { dove: 'xi', i: 5 }, { dove: 'pan', i: j }).ok); assert.equal(mio.xi[5][0], pan0[j]); assert.equal(mio.pan[j][0], xi0[5]); assert.equal(N.rose[mio.id][5][0], pan0[j]);
  // due titolari si scambiano il posto; due della panchina pure
  assert.ok(K.spostaGiocatori(N, cl, { dove: 'xi', i: 2 }, { dove: 'xi', i: 9 }).ok); assert.equal(mio.xi[2][0], xi0[9]); assert.equal(mio.xi[9][0], xi0[2]);
  // in porta va solo un portiere, e un portiere gioca solo in porta
  const prima = JSON.stringify(nomi());
  assert.equal(K.spostaGiocatori(N, cl, { dove: 'xi', i: 0 }, { dove: 'xi', i: 3 }).motivo, 'portiere'); assert.equal(K.spostaGiocatori(N, cl, { dove: 'xi', i: 0 }, { dove: 'pan', i: j }).motivo, 'portiere');
  if (jp >= 0) { assert.equal(K.spostaGiocatori(N, cl, { dove: 'xi', i: 4 }, { dove: 'pan', i: jp }).motivo, 'portiere'); assert.equal(JSON.stringify(nomi()), prima); assert.ok(K.spostaGiocatori(N, cl, { dove: 'xi', i: 0 }, { dove: 'pan', i: jp }).ok); assert.equal(mio.xi[0][1], 'P'); }
  // posti che non esistono, lo stesso giocatore due volte, una rosa con un giocatore in meno: niente
  assert.equal(K.spostaGiocatori(N, cl, { dove: 'xi', i: 20 }, { dove: 'pan', i: 0 }).motivo, 'giocatore'); assert.equal(K.spostaGiocatori(N, cl, { dove: 'xi', i: 3 }, { dove: 'xi', i: 3 }).motivo, 'giocatore');
  assert.equal(K.schiera(N, cl, mio.xi, mio.pan.slice(1)).motivo, 'giocatore'); assert.equal(K.schiera(N, cl, mio.xi.slice(0, 10), mio.pan.concat([mio.xi[10]])).motivo, 'giocatore');
  // incarichi: solo ai titolari; chi finisce in panchina lo perde
  const tit = mio.xi[6][0]; assert.ok(K.assegnaIncarico(N, cl, 'rigori', tit)); assert.equal(K.incaricato(N, cl, 'rigori'), tit);
  assert.ok(K.assegnaIncarico(N, cl, 'capitano', tit)); assert.equal(N.mio.capitano, tit); assert.equal(N.mio.nome, 'Rosa');
  assert.ok(!K.assegnaIncarico(N, cl, 'angoli', mio.pan[j][0])); assert.ok(!K.assegnaIncarico(N, cl, 'portiere', tit)); assert.equal(K.incaricato(N, cl, 'angoli'), null);
  K.spostaGiocatori(N, cl, { dove: 'xi', i: 6 }, { dove: 'pan', i: j }); assert.equal(K.incaricato(N, cl, 'rigori'), null); assert.equal(K.incaricato(N, cl, 'capitano'), null);
  K.applica(null, cl);
}
/* ====================================================================================================================
   Da qui le prove girano col mondo intero, come nel gioco: le sessanta squadre inventate, la rosa di partenza, il mercato.
   ==================================================================================================================== */
const { creaMondo } = await import('./lib/mondo.mjs'), { ECONOMIA: E, DIVISIONI, STAGIONE } = await import('../src/config.js');
const W = creaMondo(), mioW = W.clubs.find((c) => c.id === 'academy'), valW = (x) => W.DATI.scheda(x, 'academy').val, giorno = (d) => new Date(2027, 0, 4 + d, 12);
const nuovaW = () => { K.applica(null, W.clubs); const M = K.nuova(W.clubs, 'p', 'academy', rnd, { nome: 'Prova FC', sigla: 'PRO', c1: '#111111', c2: '#ffffff' }); W.K = M; K.applica(M, W.clubs); return M; };
const rosaW = () => mioW.xi.concat(mioW.pan);

// ---------- le squadre inventate: sessanta, nomi e sigle tutti diversi e diversi da quelli veri, valutazioni della divisione
{
  const inv = W.DIV.inventate, veri = new Set(W.clubs.flatMap((c) => c.xi.concat(c.pan).map((x) => x[0])));
  assert.equal(inv.length, 60); assert.equal(new Set(inv.map((c) => c.id)).size, 60); assert.equal(new Set(inv.map((c) => c.name)).size, 60);
  assert.equal(new Set(inv.map((c) => c.short).concat(W.clubs.map((c) => c.short))).size, 76, 'sigle doppie'); assert.ok(inv.every((c) => c.name.length <= 14 && /^[A-Z]{3}$/.test(c.short)));
  assert.ok(!inv.some((c) => W.clubs.some((v) => v.name === c.name)));
  for (let div = 2; div <= 5; div++) {
    const sq = inv.filter((c) => c.div === div), [lo, hi] = DIVISIONI[div - 1].val, nomi = sq.flatMap((c) => c.xi.concat(c.pan).map((x) => x[0]));
    assert.equal(sq.length, 15); assert.deepEqual(W.DIV.perDiv[div], sq.map((c) => c.id)); assert.equal(new Set(nomi).size, nomi.length, 'nomi doppi nella divisione ' + div);
    assert.ok(!nomi.some((n) => veri.has(n)), 'un giocatore inventato ha il nome di uno vero');
    for (const c of sq) {
      assert.equal(c.xi.length, 11); assert.equal(c.pan.length, 7); assert.equal(c.xi.map((x) => x[1]).join(''), 'PDDDDCCCAAA'); assert.ok(c.str >= 1 && c.str <= 5 && c.c1 && c.c2 && c.stemma.forma);
      const tutti = c.xi.concat(c.pan); assert.equal(new Set(tutti.map((x) => x[2])).size, tutti.length, c.id + ': numeri doppi');
      for (const x of tutti) { const s = W.DATI.scheda(x, c.id); assert.ok(s.val >= lo && s.val <= hi, `${c.id} ${x[0]}: ${s.val} fuori da ${lo}-${hi}`); assert.ok(x[3] >= 1 && x[3] <= 99); assert.ok(s.altezza >= 170 && s.altezza <= 195); }
      // i titolari hanno il ruolo del loro posto nel 4-3-3: i terzini sui lati, le ali sulle ali
      assert.equal(c.xi.map((x) => W.DATI.scheda(x, c.id).ruolo).join(' '), 'POR TS DC DC TD CC CDC CC AS ATT AD');
    }
    // nella divisione ci sono squadre forti e squadre deboli
    const forze = sq.map((c) => c.forza); assert.ok(Math.max(...forze) - Math.min(...forze) > 2); assert.ok(sq.every((c) => Number.isInteger(c.str)));
  }
  assert.equal(W.DIV.perDiv[1].length, 15); assert.ok(!W.DIV.perDiv[1].includes('academy'));
  // la quotazione che dà una valutazione: avanti e indietro torna lo stesso numero, anche sotto il più debole giocatore vero
  for (const r of ['P', 'D', 'C', 'A']) for (let v = 40; v <= 82; v++) assert.equal(W.DATI.valore(r, W.DATI.quotazione(r, v)), v);
  // i giocatori veri non sono cambiati: nessuno ha una valutazione sotto 55
  assert.ok(W.clubs.every((c) => c.xi.concat(c.pan).every((x) => W.DATI.scheda(x, c.id).val >= 55)));
}
// ---------- carriera nuova: ultima divisione, quindici avversarie inventate, rosa di partenza, capitano tra nove giocatori veri
{
  const M = nuovaW(), I = E.inizio;
  assert.equal(M.v, 2); assert.equal(M.div, 5); assert.equal(K.divisione(M).nome, 'Lega Esordienti'); assert.equal(M.squadre.length, 16); assert.ok(M.squadre.includes('academy'));
  assert.equal(M.squadre.filter((id) => id.startsWith('esordienti-')).length, 15); assert.equal(K.lega(M, W.clubs).length, 16); assert.equal(K.classifica(M, W.clubs).length, 16);
  assert.equal(M.monete, I.monete); assert.equal(M.gemme, I.diamanti); assert.ok(K.STRUTTURE.every((q) => K.stelle(M, q) === 0)); assert.equal(K.quantiAllenatori(M), 0);
  assert.equal(mioW.xi.length, 11); assert.equal(mioW.pan.length, I.panchina); assert.ok(rosaW().every((x) => valW(x) >= I.rosa[0] && valW(x) <= I.rosa[1]), 'rosa di partenza fuori da 42-50');
  assert.equal(mioW.xi.map((x) => x[1]).join(''), 'PDDDDCCCAAA'); assert.equal(new Set(rosaW().map((x) => x[0])).size, 18);
  // il capitano: nove candidati veri tra 70 e 78; entra tra i titolari e la sua squadra resta con undici
  const cand = W.DATI.candidatiCapitano('academy'); assert.equal(cand.length, 9); assert.ok(cand.every((c) => c.s.val >= 70 && c.s.val <= 78));
  const cap = cand[4], da = W.clubs.find((c) => c.id === cap.club); assert.ok(K.scegliCapitano(M, W.clubs, cap.club, cap.i));
  assert.ok(mioW.xi.some((x) => x[0] === cap.x[0])); assert.equal(rosaW().length, 19); assert.equal(da.xi.length, 11); assert.ok(!da.xi.concat(da.pan).some((x) => x[0] === cap.x[0])); assert.equal(M.mio.capitano, cap.x[0]);
  assert.equal(valW(mioW.xi.find((x) => x[0] === cap.x[0])), cap.s.val, 'il capitano tiene la sua valutazione nel club nuovo');
  // salvata e riletta resta uguale; una carriera di prima delle divisioni non si può continuare
  const letta = K.carica({ getItem: () => JSON.stringify(M) }); assert.deepEqual(letta, M); assert.equal(K.completa({ ...JSON.parse(JSON.stringify(M)), v: 1 }), null);
  // tutte le partite della stagione sono contro squadre della divisione
  assert.ok(M.cal.flat(2).every((id) => M.squadre.includes(id))); assert.ok(M.coppa.squadre.every((id) => M.squadre.includes(id))); assert.ok(M.castelli.gironi.flat().every((id) => M.squadre.includes(id)));
}
// ---------- valore dei giocatori: 100 monete a 55, raddoppia ogni 5 punti; vendendo si incassa la metà
{
  for (const [v, m] of [[45, 25], [50, 50], [55, 100], [60, 200], [65, 400], [70, 800], [75, 1600], [80, 3200]]) { assert.equal(K.prezzo(v), m); assert.equal(K.incasso(v), Math.max(5, Math.round(m / 10) * 5)); }
  for (let v = 40; v < 85; v++) assert.ok(v < 46 ? K.prezzo(v + 1) >= K.prezzo(v) : K.prezzo(v + 1) > K.prezzo(v));
}
// ---------- premi delle partite: la vittoria della divisione, metà per il pareggio, un quarto per la sconfitta; strutture
{
  const M = nuovaW(), V = K.vittoria(M); assert.equal(V, 60);
  let r = K.giocaCampionato(M, W.clubs, 2, 0, [], rnd, giorno(0)); assert.equal(r.monete, V);
  r = K.giocaCampionato(M, W.clubs, 1, 1, [], rnd, giorno(0)); assert.equal(r.monete, V / 2); r = K.giocaCampionato(M, W.clubs, 0, 3, [], rnd, giorno(0)); assert.equal(r.monete, V / 4);
  assert.equal(M.monete, E.inizio.monete + V + V / 2 + V / 4); assert.equal(M.storico.filter((x) => x.c === 'partita').length, 3);
  assert.equal(M.storico.reduce((t, x) => t + x.m, 0), M.monete - E.inizio.monete, 'lo storico non torna col saldo'); assert.equal(M.storico[0].sm, M.monete);
  // turno di coppa superato: il premio della partita più mezza vittoria
  r = K.giocaCoppa(M, W.clubs, 1, 0, [], rnd, null, giorno(0)); assert.equal(r.monete, V + K.inMonete(M, E.premi.turno));
  // Ufficio commerciale: dieci per cento in più a stella; Stadio: incasso nelle partite in casa
  M.strutture.commerciale = 5; assert.equal(K.premioVittoria(M), V * 1.5); M.strutture.stadio = 5;
  for (let i = 0; i < 4; i++) { const p = K.prossima(M), m0 = M.monete; r = K.giocaCampionato(M, W.clubs, 1, 0, [], rnd, giorno(0)); assert.equal(M.monete - m0, V * 1.5 + (p.inCasa ? K.inMonete(M, E.strutture.stadio.incasso[5]) : 0)); }
  assert.equal(K.finanze(nuovaW()), 'Scarse');
}
// ---------- strutture: sette, da zero a cinque stelle; le ultime due vogliono anche i diamanti; cosa danno
{
  const M = nuovaW(), S = E.strutture; assert.equal(K.STRUTTURE.length, 7);
  assert.equal(K.miglioraStruttura(M, 'piscina').motivo, 'cosa'); M.monete = S.costi[0] - 1; assert.equal(K.miglioraStruttura(M, 'centro').motivo, 'soldi');
  M.monete = 1e6; M.gemme = 0;
  for (let n = 1; n <= 3; n++) { const m0 = M.monete, r = K.miglioraStruttura(M, 'centro'); assert.ok(r.ok); assert.equal(r.stelle, n); assert.equal(m0 - M.monete, S.costi[n - 1]); }
  assert.equal(K.miglioraStruttura(M, 'centro').motivo, 'soldi', 'la quarta stella vuole i diamanti'); M.gemme = S.diamanti[3] + S.diamanti[4];
  assert.ok(K.miglioraStruttura(M, 'centro').ok && K.miglioraStruttura(M, 'centro').ok); assert.equal(M.gemme, 0); assert.equal(K.stelle(M, 'centro'), 5); assert.equal(K.miglioraStruttura(M, 'centro').motivo, 'massimo');
  assert.equal(M.storico[0].c, 'struttura'); assert.deepEqual(K.costoStruttura(M, 'stadio'), { monete: S.costi[0], gemme: 0 }); assert.equal(K.costoStruttura(M, 'centro'), null);
  const moduli = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], Z = nuovaW();
  assert.equal(K.moduliAperti(Z, moduli).length, 4); assert.equal(K.moduliAperti(M, moduli).length, 8); assert.equal(K.rosaMax(Z), 22); Z.strutture.foresteria = 5; assert.equal(K.rosaMax(Z), 32);
  assert.equal(K.recupero(Z), E.energia.recupero); Z.strutture.infermeria = 3; assert.equal(K.recupero(Z), Math.round(E.energia.recupero * 1.3));
  const c0 = K.costoOsservatore(Z, 'alta'); Z.strutture.osservatori = 5; assert.equal(K.costoOsservatore(Z, 'alta'), c0 / 2);
  assert.equal(K.bonusPartita(Z, true), 0); Z.strutture.curva = 4; assert.ok(Math.abs(K.bonusPartita(Z, true) - .04) < 1e-9); assert.equal(K.bonusPartita(Z, false), 0);
  assert.equal(K.postiStadio(Z), S.stadio.posti[0]); Z.monete = 1e6; K.miglioraStruttura(Z, 'stadio'); K.miglioraStruttura(Z, 'stadio'); assert.equal(Z.stadio, 2); assert.equal(K.postiStadio(Z), S.stadio.posti[2]);
  // sfida di carriera: una struttura a tre stelle
  assert.ok(K.statoSfide(M).c.find((x) => x.id === 'c4').fatto && !K.statoSfide(nuovaW()).c.find((x) => x.id === 'c4').fatto);
}
// ---------- vendita e svincolo: metà del valore, oppure un allenatore; il titolare venduto ha un sostituto; mai sotto sedici
{
  const M = nuovaW(); M.monete = 1e5; M.strutture.foresteria = 5; for (let k = 0; k < 6; k++) assert.ok(K.compraLista(M, W.clubs, k).ok);
  const n0 = rosaW().length, x = mioW.pan[1].slice(), v = valW(x), m0 = M.monete;
  let r = K.vendi(M, W.clubs, 'pan', 1); assert.ok(r.ok); assert.equal(r.monete, K.incasso(v)); assert.equal(M.monete, m0 + K.incasso(v)); assert.equal(rosaW().length, n0 - 1); assert.ok(!rosaW().some((y) => y[0] === x[0]));
  assert.equal(M.movimenti[0].ceduto, x[0]);
  // un titolare: al suo posto entra la riserva più forte del suo reparto; il portiere titolare si vende solo se ce n'è un altro
  const tit = mioW.xi[5].slice(), ris = mioW.pan.filter((y) => y[1] === tit[1]).sort((a, b) => valW(b) - valW(a))[0]; M.energia[tit[0]] = 40; M.incarichi.rigori = tit[0];
  r = K.vendi(M, W.clubs, 'xi', 5); assert.ok(r.ok); assert.equal(mioW.xi[5][0], ris[0]); assert.equal(mioW.xi.length, 11); assert.equal(M.energia[tit[0]], undefined); assert.equal(M.incarichi.rigori, undefined);
  r = K.vendi(M, W.clubs, 'xi', 0); assert.ok(r.ok); assert.equal(mioW.xi[0][1], 'P'); while (mioW.pan.some((y) => y[1] === 'P')) assert.ok(K.vendi(M, W.clubs, 'xi', 0).ok);
  assert.equal(K.vendi(M, W.clubs, 'xi', 0).motivo, 'portiere');
  // svincolo: niente monete, un allenatore; più raro se il giocatore è forte; quello dei portieri solo da un portiere
  assert.equal(K.raritaSvincolo(54), 'comune'); assert.equal(K.raritaSvincolo(55), 'raro'); assert.equal(K.raritaSvincolo(64), 'raro'); assert.equal(K.raritaSvincolo(65), 'leggendario');
  const Z = nuovaW(), z0 = Z.monete; r = K.svincola(Z, W.clubs, 'pan', 1, rnd); assert.ok(r.ok && r.rarita === 'comune' && r.categoria !== 'portieri'); assert.equal(Z.monete, z0); assert.equal(K.quantiAllenatori(Z), 1);
  r = K.svincola(Z, W.clubs, 'pan', 0, rnd); assert.equal(r.categoria, 'portieri');
  while (rosaW().length > E.valore.minimo) assert.ok(K.vendi(Z, W.clubs, 'pan', mioW.pan.length - 1).ok);
  assert.equal(K.vendi(Z, W.clubs, 'pan', 0).motivo, 'pochi'); assert.equal(K.svincola(Z, W.clubs, 'xi', 3).motivo, 'pochi'); assert.equal(K.vendi(Z, W.clubs, 'pan', 99).motivo, 'giocatore');
}
// ---------- lista trasferimenti: giocatori della divisione a prezzo pieno; cambia dopo ogni partita; rosa piena, monete, rinnovo
{
  const M = nuovaW(), [lo, hi] = K.divisione(M).val, L = K.listaMercato(M, W.clubs);
  assert.equal(L.length, E.mercato.lista.quanti); assert.ok(L.every((g) => g.val >= lo && g.val <= hi && g.prezzo === K.prezzo(g.val) && valW(g.x) === g.val && !g.da && !g.preso));
  assert.equal(new Set(L.map((g) => g.x[0])).size, L.length); assert.ok(!L.some((g) => rosaW().some((x) => x[0] === g.x[0])));
  assert.deepEqual(K.listaMercato(M, W.clubs), L, 'la lista non cambia finché non si gioca');
  M.monete = 0; assert.equal(K.compraLista(M, W.clubs, 0).motivo, 'soldi'); M.monete = L[0].prezzo + 7;
  const n0 = rosaW().length, r = K.compraLista(M, W.clubs, 0); assert.ok(r.ok); assert.equal(M.monete, 7); assert.equal(rosaW().length, n0 + 1); assert.equal(mioW.pan[mioW.pan.length - 1][0], L[0].x[0]);
  assert.ok(K.listaMercato(M, W.clubs)[0].preso); assert.equal(K.compraLista(M, W.clubs, 0).motivo, 'giocatore'); assert.equal(M.sfide.w.c.acquisti, 1); assert.equal(M.movimenti[0].preso, L[0].x[0]);
  assert.equal(new Set(rosaW().map((x) => x[2])).size, rosaW().length, 'numero di maglia doppio dopo un acquisto');
  // chi arriva resta lo stesso giocatore: stessa valutazione, e la carta lo trova anche dai soli dati che arrivano alla partita
  const preso = mioW.pan[mioW.pan.length - 1]; assert.equal(valW(preso), L[0].val); assert.deepEqual(W.DATI.scheda(preso.slice(0, 4), 'academy').stat, W.DATI.scheda(preso, 'academy').stat);
  // dopo una partita la lista è un'altra; rinnovarla subito costa diamanti
  K.giocaCampionato(M, W.clubs, 1, 0, [], rnd, giorno(0)); const L2 = K.listaMercato(M, W.clubs); assert.notDeepEqual(L2.map((g) => g.x[0]), L.map((g) => g.x[0])); assert.ok(L2.every((g) => !g.preso));
  M.gemme = 4; assert.equal(K.rinnovaLista(M).motivo, 'soldi'); M.gemme = 9; assert.ok(K.rinnovaLista(M).ok); assert.equal(M.gemme, 9 - E.mercato.lista.rinnovo); assert.notDeepEqual(K.listaMercato(M, W.clubs).map((g) => g.x[0]), L2.map((g) => g.x[0]));
  // rosa piena: non si compra finché la Foresteria non cresce
  M.monete = 1e6; let k = 0; while (rosaW().length < K.rosaMax(M)) { const g = K.listaMercato(M, W.clubs).findIndex((x) => !x.preso); if (g < 0) { M.gemme = 99; K.rinnovaLista(M); if (++k > 20) break; continue; } assert.ok(K.compraLista(M, W.clubs, g).ok); }
  assert.equal(rosaW().length, 22); M.gemme = 99; K.rinnovaLista(M); assert.equal(K.compraLista(M, W.clubs, 0).motivo, 'rosa'); M.strutture.foresteria = 1; assert.ok(K.compraLista(M, W.clubs, 0).ok);
  assert.equal(new Set(rosaW().map((x) => x[0])).size, rosaW().length, 'nomi doppi in rosa');
}
// ---------- osservatore: tre fasce, sconto del venti per cento; agente: un contatto, giocatore della divisione sopra; offerte a tempo
{
  const M = nuovaW(), [lo, hi] = K.divisione(M).val, terzo = (hi - lo) / 3; M.monete = 5000;
  assert.equal(K.osserva(M, W.clubs, 'altissima').motivo, 'cosa');
  K.FASCE.forEach((fascia, i) => {
    const m0 = M.monete, r = K.osserva(M, W.clubs, fascia, 'C'); assert.ok(r.ok); assert.equal(m0 - M.monete, K.costoOsservatore(M, fascia)); const g = M.mercato.osservato;
    assert.ok(g.val >= Math.round(lo + terzo * i) && g.val <= Math.round(lo + terzo * (i + 1)), `fascia ${fascia}: ${g.val}`); assert.equal(g.x[1], 'C');
    assert.equal(g.prezzo, Math.max(5, Math.round(K.prezzo(g.val) * (1 - E.mercato.osservatore.sconto) / 5) * 5)); assert.ok(g.prezzo < g.pieno);
    assert.equal(K.osserva(M, W.clubs, fascia).motivo, 'aperta');
    if (i < 2) K.lasciaTrovato(M, 'osservato'); else { const m1 = M.monete, n = rosaW().length; assert.ok(K.compraTrovato(M, W.clubs, 'osservato').ok); assert.equal(m1 - M.monete, g.prezzo); assert.equal(rosaW().length, n + 1); assert.equal(M.mercato.osservato, null); }
  });
  assert.ok(K.costoOsservatore(M, 'bassa') < K.costoOsservatore(M, 'media') && K.costoOsservatore(M, 'media') < K.costoOsservatore(M, 'alta'));
  M.monete = 0; assert.equal(K.osserva(M, W.clubs, 'bassa').motivo, 'soldi'); M.monete = 5000;
  // agente: senza contatto no; col contatto trova un giocatore della Lega dei Borghi, metà alta, a prezzo pieno
  assert.equal(K.agente(M, W.clubs).motivo, 'contatto'); M.gemme = 24; assert.equal(K.compraContatto(M).motivo, 'soldi'); M.gemme = 25; assert.ok(K.compraContatto(M).ok); assert.equal(M.gemme, 0); assert.equal(M.contatti, 1);
  const m0 = M.monete, r = K.agente(M, W.clubs, 'A'); assert.ok(r.ok); assert.equal(M.contatti, 0); assert.equal(m0 - M.monete, K.costoAgente(M)); const g = M.mercato.agente, sopra = DIVISIONI[3].val;
  assert.ok(g.val >= Math.round((sopra[0] + sopra[1]) / 2) && g.val <= sopra[1]); assert.equal(g.prezzo, K.prezzo(g.val)); assert.equal(g.x[1], 'A'); assert.ok(K.compraTrovato(M, W.clubs, 'agente').ok);
  // dalla Serie Cadetta l'agente porta un giocatore vero, che lascia la sua squadra (e quella resta con undici)
  M.div = 2; M.contatti = 2; M.monete = 1e5; K.lasciaTrovato(M, 'agente'); assert.ok(K.agente(M, W.clubs, 'D').ok); const vero = M.mercato.agente, da = W.clubs.find((c) => c.id === vero.da);
  assert.ok(da && vero.val >= 65 && vero.val <= 75 && vero.x[1] === 'D'); assert.ok(K.compraTrovato(M, W.clubs, 'agente').ok);
  assert.ok(rosaW().some((x) => x[0] === vero.x[0]) && !da.xi.concat(da.pan).some((x) => x[0] === vero.x[0])); assert.equal(da.xi.length, 11); assert.equal(valW(rosaW().find((x) => x[0] === vero.x[0])), vero.val);
  // nella divisione più alta: la lista ha giocatori veri tra 55 e 75, l'agente porta i migliori
  M.div = 1; const L = K.listaMercato(M, W.clubs); assert.ok(L.length === E.mercato.lista.quanti && L.every((x) => x.da && x.val >= 55 && x.val <= 75 && !rosaW().some((y) => y[0] === x.x[0])));
  assert.ok(K.agente(M, W.clubs).ok); assert.ok(M.mercato.agente.val >= 76 && M.mercato.agente.da); M.div = 5;
  // offerte a tempo: due, della divisione sopra, valore in monete più diamanti; dopo un giorno sono altre
  const Z = nuovaW(), ora = giorno(0), O = K.offerte(Z, W.clubs, ora); assert.equal(O.length, E.mercato.offerte.quante); assert.ok(O.every((x) => x.gemme === E.mercato.offerte.diamanti && x.prezzo === K.prezzo(x.val) && x.val >= 52 && x.scade > ora.getTime() && !x.presa));
  assert.deepEqual(K.offerte(Z, W.clubs, ora).map((x) => x.x[0]), O.map((x) => x.x[0])); assert.notDeepEqual(K.offerte(Z, W.clubs, giorno(1)).map((x) => x.x[0]), O.map((x) => x.x[0]));
  Z.monete = 1e4; Z.gemme = 29; assert.equal(K.compraOfferta(Z, W.clubs, 0, ora).motivo, 'soldi'); Z.gemme = 30; assert.ok(K.compraOfferta(Z, W.clubs, 0, ora).ok); assert.equal(Z.gemme, 0); assert.equal(Z.monete, 1e4 - O[0].prezzo);
  assert.ok(K.offerte(Z, W.clubs, ora)[0].presa); assert.equal(K.compraOfferta(Z, W.clubs, 0, ora).motivo, 'giocatore');
}
// ---------- allenatori: inventario, categorie, statistiche e valutazione che salgono, potenziale, acquisto coi diamanti
{
  const M = nuovaW(), A = E.allenatori, i = 7, x = mioW.xi[i], s0 = W.DATI.scheda(x, 'academy');
  assert.equal(K.usaAllenatore(M, W.clubs, 'xi', i, 'comune', 'tecnico', rnd).motivo, 'nessuno');
  assert.equal(K.daiAllenatore(M, 'comune', 'tecnico'), 'tecnico'); assert.equal(K.quantiAllenatori(M), 1);
  let r = K.usaAllenatore(M, W.clubs, 'xi', i, 'comune', 'tecnico', rnd); assert.ok(r.ok); assert.equal(K.quantiAllenatori(M), 0); assert.equal(M.sfide.w.c.allenamenti, 1);
  const s1 = W.DATI.scheda(x, 'academy'); for (const [k, v] of s1.stat) assert.equal(v, s0.stat.find((y) => y[0] === k)[1] + (A.categorie.tecnico.includes(k) ? 1 : 0), 'statistica ' + k);
  assert.equal(s1.base, s0.val); assert.ok(s1.val >= s0.val); assert.equal(r.dopo, s1.val);
  // raro +2, leggendario +3: un centrocampista allenato sulla tecnica sale di valutazione
  K.daiAllenatore(M, 'raro', 'tecnico'); K.daiAllenatore(M, 'leggendario', 'tecnico'); K.usaAllenatore(M, W.clubs, 'xi', i, 'raro', 'tecnico', () => .9); K.usaAllenatore(M, W.clubs, 'xi', i, 'leggendario', 'tecnico', () => .9);
  const s2 = W.DATI.scheda(x, 'academy'); assert.equal(s2.stat.find((y) => y[0] === 'PAS')[1], s0.stat.find((y) => y[0] === 'PAS')[1] + 6); assert.ok(s2.val > s0.val, 'la valutazione non è salita'); assert.equal(K.crescitaDi(M, x[0]).pot, A.potenziale);
  // quello dei portieri solo sui portieri, gli altri solo sui giocatori di movimento
  K.daiAllenatore(M, 'comune', 'portieri'); K.daiAllenatore(M, 'comune', 'fisico'); assert.equal(K.usaAllenatore(M, W.clubs, 'xi', i, 'comune', 'portieri', rnd).motivo, 'categoria'); assert.equal(K.usaAllenatore(M, W.clubs, 'xi', 0, 'comune', 'fisico', rnd).motivo, 'categoria');
  assert.ok(K.usaAllenatore(M, W.clubs, 'xi', 0, 'comune', 'portieri', rnd).ok); assert.ok(K.usaAllenatore(M, W.clubs, 'pan', 2, 'comune', 'fisico', rnd).ok, 'anche su una riserva');
  // il potenziale: la valutazione non sale più di dieci punti; col leggendario fortunato, undici
  for (let n = 0; n < 60; n++) { K.daiAllenatore(M, 'raro', 'tecnico'); K.daiAllenatore(M, 'raro', 'fisico'); K.daiAllenatore(M, 'comune', 'difesa'); }
  let fermo = false; for (let n = 0; n < 60 && !fermo; n++) for (const cat of ['tecnico', 'fisico', 'difesa']) { r = K.usaAllenatore(M, W.clubs, 'xi', i, cat === 'difesa' ? 'comune' : 'raro', cat, rnd); if (!r.ok) { assert.equal(r.motivo, 'potenziale'); fermo = true; } }
  assert.ok(fermo); assert.equal(W.DATI.scheda(x, 'academy').val, s0.val + A.potenziale);
  K.daiAllenatore(M, 'leggendario', 'fisico'); r = K.usaAllenatore(M, W.clubs, 'xi', i, 'leggendario', 'fisico', () => 0); assert.ok(r.ok && r.potenziale); assert.equal(K.crescitaDi(M, x[0]).pot, A.potenziale + 1); assert.ok(W.DATI.scheda(x, 'academy').val <= s0.val + A.potenziale + 1);
  // la crescita resta salvata, vale anche coi soli dati che arrivano alla partita, e sparisce se il giocatore viene venduto
  const letta = K.carica({ getItem: () => JSON.stringify(M) }); assert.deepEqual(letta.crescita, M.crescita); assert.equal(W.DATI.scheda(x.slice(0, 4), 'academy').val, W.DATI.scheda(x, 'academy').val);
  const nome = x[0], vPrima = valW(x), m0 = M.monete; assert.ok(K.vendi(M, W.clubs, 'xi', i).ok); assert.equal(M.monete - m0, K.incasso(vPrima), 'chi è cresciuto si vende al valore di adesso'); assert.equal(M.crescita[nome], undefined);
  // coi diamanti: raro e leggendario, il comune no
  const Z = nuovaW(); Z.gemme = 55; assert.equal(K.compraAllenatore(Z, 'comune', 'fisico').motivo, 'cosa'); assert.ok(K.compraAllenatore(Z, 'raro', 'fisico').ok); assert.ok(K.compraAllenatore(Z, 'leggendario', 'difesa').ok);
  assert.equal(Z.gemme, 0); assert.equal(Z.allenatori.raro.fisico, 1); assert.equal(Z.allenatori.leggendario.difesa, 1); assert.equal(K.compraAllenatore(Z, 'raro', 'fisico').motivo, 'soldi');
  // un allenatore in premio senza categoria: escono tutte, quella dei portieri di rado
  const conta = {}; for (let n = 0; n < 2000; n++) { const c = K.daiAllenatore(Z, 'comune', null, rnd); conta[c] = (conta[c] || 0) + 1; } assert.ok(conta.tecnico > 500 && conta.fisico > 500 && conta.difesa > 250 && conta.portieri > 100 && conta.portieri < 300);
}
// ---------- energia, riscaldamento (statistiche su, per una o più partite), fisioterapista a tre interventi
{
  const M = nuovaW(), tit = mioW.xi.map((x) => x[0]), V = K.vittoria(M);
  K.energiaDopoPartita(M, W.clubs, tit.map((nome, i) => ({ nome, energia: 20 + i * 5 }))); tit.forEach((n, i) => assert.equal(K.energiaDi(M, n), Math.min(100, 20 + i * 5 + E.energia.recupero)));
  assert.ok(mioW.pan.every((x) => K.energiaDi(M, x[0]) === 100)); M.energia.Fantasma = 10; K.energiaDopoPartita(M, W.clubs, []); assert.equal(M.energia.Fantasma, undefined);
  // riscaldamento: costa mezza vittoria, alza le statistiche del cinque per cento per una partita; col Centro allenamento dura di più
  let st = K.statoRiscaldamento(M); assert.equal(st.monete, V / 2); assert.equal(st.bonus, 5); assert.equal(st.partite, 1); assert.ok(!st.fatto && st.serve); assert.equal(K.bonusPartita(M, false), 0);
  const m0 = M.monete; assert.ok(K.riscaldamento(M).ok); assert.equal(M.monete, m0 - V / 2); assert.equal(M.storico[0].c, 'riscaldamento'); assert.equal(K.bonusPartita(M, false), .05); assert.equal(K.riscaldamento(M).motivo, 'fatto');
  K.giocaCampionato(M, W.clubs, 1, 0, [], rnd, giorno(0)); assert.equal(K.bonusPartita(M, false), 0); assert.ok(!K.statoRiscaldamento(M).fatto);
  M.strutture.centro = 5; assert.ok(K.riscaldamento(M).ok); for (let n = 0; n < 3; n++) { assert.equal(K.bonusPartita(M, false), .05); K.giocaCampionato(M, W.clubs, 1, 0, [], rnd, giorno(0)); } assert.equal(K.bonusPartita(M, false), 0);
  M.monete = 0; assert.equal(K.riscaldamento(M).motivo, 'monete');
  // fisioterapista: piccolo +20, medio +50, completo tutto; prezzi in vittorie; il completo anche in diamanti
  const Z = nuovaW(); assert.equal(K.statoFisio(Z, W.clubs).manca, 0); assert.equal(K.fisioterapia(Z, W.clubs, 'piccolo').motivo, 'pieni');
  const stanca = () => { Z.energia = {}; for (const x of rosaW()) Z.energia[x[0]] = 30; };
  stanca(); st = K.statoFisio(Z, W.clubs); assert.equal(st.manca, rosaW().length * 70); assert.deepEqual(st.interventi.map((x) => [x.id, x.energia, x.monete]), [['piccolo', 20, V / 2], ['medio', 50, V], ['completo', 100, V * 2]]);
  Z.monete = 1000; assert.ok(K.fisioterapia(Z, W.clubs, 'piccolo').ok); assert.ok(rosaW().every((x) => K.energiaDi(Z, x[0]) === 50)); assert.equal(Z.monete, 1000 - V / 2); assert.equal(Z.storico[0].c, 'fisioterapista');
  assert.ok(K.fisioterapia(Z, W.clubs, 'medio').ok); assert.ok(rosaW().every((x) => K.energiaDi(Z, x[0]) === 100)); stanca(); assert.ok(K.fisioterapia(Z, W.clubs, 'completo').ok); assert.equal(K.statoFisio(Z, W.clubs).manca, 0);
  stanca(); Z.monete = 0; assert.equal(K.fisioterapia(Z, W.clubs, 'medio').motivo, 'soldi'); assert.equal(K.fisioterapia(Z, W.clubs, 'medio', true).motivo, 'cosa');
  Z.gemme = 9; assert.equal(K.fisioterapia(Z, W.clubs, 'completo', true).motivo, 'soldi'); Z.gemme = 10; assert.ok(K.fisioterapia(Z, W.clubs, 'completo', true).ok); assert.equal(Z.gemme, 0); assert.equal(K.statoFisio(Z, W.clubs).manca, 0);
  // orario e tempo: sempre gli stessi per la stessa partita
  assert.deepEqual(K.meteoPartita(M, 'camp'), K.meteoPartita(M, 'camp')); assert.ok(K.meteoPartita(null, 'amichevole').orario);
}
// ---------- diamanti: sette giorni di fila (56 in tutto, col contatto dell'agente al settimo), allenatori del Centro ogni settimana
{
  const M = nuovaW(), S = E.diamanti.serie; assert.equal(S.reduce((a, b) => a + b, 0), 56);
  let g = M.gemme;
  for (let d = 0; d < 7; d++) { K.giocaCampionato(M, W.clubs, 1, 0, [], rnd, giorno(d)); assert.equal(M.gemme - g, S[d], 'giorno ' + (d + 1)); g = M.gemme; K.giocaCampionato(M, W.clubs, 1, 0, [], rnd, giorno(d)); assert.equal(M.gemme, g, 'una volta sola al giorno'); }
  assert.equal(M.contatti, 1); assert.equal(M.gemme, E.inizio.diamanti + 56); assert.equal(M.storico.filter((x) => x.c === 'serie').length, 7);
  // l'ottavo giorno si ricomincia; saltando un giorno pure
  K.giocaCampionato(M, W.clubs, 1, 0, [], rnd, giorno(7)); assert.equal(M.gemme - g, S[0]); const Z = nuovaW(), z = Z.gemme;
  K.giocaCoppa(Z, W.clubs, 1, 0, [], rnd, null, giorno(0)); K.giocaCastelli(Z, W.clubs, 1, 0, [], rnd, null, giorno(1)); K.giocaCampionato(Z, W.clubs, 1, 0, [], rnd, giorno(3)); assert.equal(Z.gemme - z, S[0] + S[1] + S[0]);
  // Centro allenamento: un allenatore comune a settimana per stella, alla prima partita della settimana
  const Y = nuovaW(); Y.strutture.centro = 3; K.giocaCampionato(Y, W.clubs, 1, 0, [], rnd, giorno(0)); K.giocaCampionato(Y, W.clubs, 1, 0, [], rnd, giorno(1));
  assert.equal(K.quantiAllenatori(Y), 3); K.giocaCampionato(Y, W.clubs, 1, 0, [], rnd, giorno(7)); assert.equal(K.quantiAllenatori(Y), 6); assert.equal(RARITA_COMUNI(Y), 6);
}
function RARITA_COMUNI(C) { return Object.values(C.allenatori.comune).reduce((a, b) => a + b, 0); }
// ---------- sfide e percorso coi premi nuovi: monete in vittorie, allenatori, diamanti
{
  const M = nuovaW(), mar = giorno(1), V = K.vittoria(M);
  K.aggiornaSfide(M, mar); Object.assign(M.sfide.d.c, { gioca: 1, vinte: 1, gol: 3, inviolate: 1, coppa: 1 });
  let st = K.statoSfide(M, mar); assert.deepEqual(st.conti.d, [5, 5]); assert.equal(st.daRiscuotere, 6); assert.deepEqual(st.d.map((x) => x.monete), K.SFIDE.d.map((x) => K.inMonete(M, x.v)));
  const m0 = M.monete, g0 = M.gemme, p0 = M.percorso.punti, r = K.riscuotiTutto(M, mar); assert.equal(r.n, 6); assert.equal(M.monete - m0, K.SFIDE.d.reduce((t, x) => t + K.inMonete(M, x.v), 0)); assert.equal(M.gemme, g0);
  // i punti del percorso premi che la schermata mostra sono quelli dati davvero: cinque sfide del giorno, niente per il premio di gruppo
  assert.equal(r.punti, M.percorso.punti - p0); assert.equal(r.punti, K.SFIDE.d.length * E.percorso.punti.sfidaD);
  assert.equal(M.allenatori.comune.tecnico + M.allenatori.comune.fisico + M.allenatori.comune.difesa + M.allenatori.comune.portieri, 1, 'tutte le giornaliere: un allenatore comune');
  assert.equal(K.riscuoti(M, 'd', 'd1', mar).ok, false); assert.deepEqual(K.statoSfide(M, giorno(2)).conti.d, [0, 5]);
  // settimana: tutte fatte, quindici diamanti e un allenatore raro; poi riparte il lunedì
  Object.assign(M.sfide.w.c, { vinte: 5, gol: 12, coppa: 3, acquisti: 1, allenamenti: 3 }); const g1 = M.gemme; K.riscuotiTutto(M, mar); assert.equal(M.gemme - g1, E.diamanti.settimana); assert.equal(RARI(M), 1);
  assert.equal(K.statoSfide(M, giorno(7)).w.find((x) => x.id === 'w5').prog, 0);
  // le sfide pagano di più salendo di divisione, e in tutto meno delle partite di una stagione
  const alta = { ...M, div: 1 }; assert.ok(K.statoSfide(alta, mar).w[0].monete > st.w[0].monete * 3);
  assert.ok(K.SFIDE.d.reduce((t, x) => t + x.v, 0) <= 1.01, 'le giornaliere valgono più di una vittoria al giorno');
  // percorso: sessanta diamanti e due allenatori rari a stagione; ogni livello si ritira una volta
  const P = E.percorso.premi; assert.equal(P.length, 20); assert.equal(P.reduce((t, x) => t + (x.g || 0), 0), 60); assert.equal(P.filter((x) => x.a === 'raro').length, 2);
  const Z = nuovaW(); K.giocaCampionato(Z, W.clubs, 2, 0, [], rnd, giorno(0)); assert.equal(K.statoPercorso(Z).punti, E.percorso.punti.partita + E.percorso.punti.vinta);
  Z.percorso.punti = E.percorso.perLivello * 5 + 5; let sp = K.statoPercorso(Z); assert.equal(sp.livello, 5); assert.equal(sp.daRitirare, 5); assert.equal(sp.nelLivello, 5); assert.equal(sp.premi[0].monete, K.inMonete(Z, P[0].v)); assert.equal(sp.premi[4].allenatore, 'raro');
  const z0 = Z.monete, zg = Z.gemme, rp = K.ritiraPercorso(Z, 0, rnd); assert.ok(rp.ok && rp.n === 5 && rp.allenatori === 1); assert.equal(Z.monete - z0, K.inMonete(Z, P[0].v) + K.inMonete(Z, P[2].v)); assert.equal(Z.gemme - zg, P[1].g + P[3].g); assert.equal(RARI(Z), 1);
  assert.equal(K.ritiraPercorso(Z).ok, false); Z.percorso.punti = 99999; assert.equal(K.statoPercorso(Z).livello, 20);
  // notifiche: le coppe da giocare, le strutture quando ci sono le monete, gli allenatori da usare
  const N = nuovaW(); let nn = K.notifiche(N); assert.ok(nn.some((x) => x.vai === 'coppa') && nn.some((x) => x.vai === 'castelli') && !nn.some((x) => x.vai === 'club') && !nn.some((x) => x.vai === 'squadra'));
  N.monete = 99999; K.daiAllenatore(N, 'comune', 'fisico'); nn = K.notifiche(N); assert.ok(nn.some((x) => x.vai === 'club') && nn.some((x) => x.vai === 'squadra'));
  assert.ok(V > 0);
}
function RARI(C) { return Object.values(C.allenatori.raro).reduce((a, b) => a + b, 0); }
// ---------- obiettivi, promozione e retrocessione: tre su quattro per salire, le ultime due scendono (non dall'ultima divisione)
{
  const stagione = (M, gf, gs, coppe = true) => {
    while (K.prossima(M)) K.giocaCampionato(M, W.clubs, gf, gs, [], rnd, giorno(0));
    if (coppe) { while (K.coppaProssima(M)) K.giocaCoppa(M, W.clubs, gf, gs, [], rnd, null, giorno(0)); while (K.castelliProssima(M)) K.giocaCastelli(M, W.clubs, gf, gs, [], rnd, null, giorno(0)); }
  };
  const M = nuovaW(); let ob = K.obiettivi(M, W.clubs), O = DIVISIONI[4].obiettivi;
  assert.deepEqual(ob.map((o) => o.id), ['posizione', 'coppa', 'castelli', 'rosa']); assert.deepEqual(ob.map((o) => o.n), [O.posizione, O.coppa, O.castelli, O.media]); assert.ok(ob.every((o) => !o.fatto || o.id === 'posizione'));
  // a stagione appena cominciata niente è sicuro e niente è mancato
  assert.ok(ob.every((o) => !o.sicuro && !o.mancato));
  {
    // sicuro e mancato in campionato: con tutte le altre ferme a zero punti, dopo abbastanza vittorie il posto non si
    // può più perdere; se invece le altre vincono sempre e noi mai, a un certo punto non si può più raggiungere
    const S = nuovaW(), giornate = S.cal.length, pos = () => K.obiettivi(S, W.clubs)[0];
    const gioca = (io, altre) => { const g = S.giornata; S.ris[g] = S.cal[g].map((m) => (m.includes(S.club) ? (m[0] === S.club ? io : [io[1], io[0]]) : altre)); S.giornata++; };
    gioca([1, 0], [0, 0]); assert.ok(pos().fatto && !pos().sicuro && !pos().mancato);
    while (!pos().sicuro && S.giornata < giornate) gioca([1, 0], [0, 0]);
    assert.ok(pos().sicuro && S.giornata < giornate, 'il posto è sicuro prima della fine'); assert.ok(!pos().mancato);
    const P = nuovaW(), posP = () => K.obiettivi(P, W.clubs)[0];
    const perde = () => { const g = P.giornata; P.ris[g] = P.cal[g].map((m) => (m.includes(P.club) ? (m[0] === P.club ? [0, 1] : [1, 0]) : [1, 1])); P.giornata++; };
    perde(); assert.ok(!posP().mancato);
    while (!posP().mancato && P.giornata < P.cal.length) perde();
    assert.ok(posP().mancato && !posP().sicuro && !posP().fatto);
    // in coppa: chi esce prima del turno che serve ha mancato l'obiettivo; chi lo ha superato lo ha al sicuro
    const Q = nuovaW(); Q.coppa.fuori = 0; let q = K.obiettivi(Q, W.clubs)[1]; assert.ok(q.mancato && !q.sicuro);
    Q.coppa.fuori = O.coppa; q = K.obiettivi(Q, W.clubs)[1]; assert.ok(q.sicuro && !q.mancato);
    Q.castelli.fuori = 'gironi'; q = K.obiettivi(Q, W.clubs)[2]; assert.ok(q.mancato && !q.sicuro);
  }
  assert.ok(Math.abs(K.mediaTitolari(M, W.clubs) - mioW.xi.reduce((s, x) => s + valW(x), 0) / 11) < 1e-9);
  // vince tutto: tre obiettivi su quattro (la rosa no), sale in Lega dei Borghi coi premi di fine stagione e di promozione
  stagione(M, 3, 0); ob = K.obiettivi(M, W.clubs); assert.deepEqual(ob.map((o) => o.fatto), [true, true, true, false]); assert.deepEqual(ob.map((o) => o.sicuro), [true, true, true, false]); assert.ok(ob.every((o) => !o.mancato));
  let e = K.esitoStagione(M, W.clubs); assert.ok(e.sale && !e.scende && e.fatti === 3 && e.pos === 1 && e.div === 4);
  const g0 = M.gemme, c0 = M.contatti, leg = () => Object.values(M.allenatori.leggendario).reduce((a, b) => a + b, 0), l0 = leg();
  e = K.nuovaStagione(M, W.clubs, rnd); assert.equal(M.div, 4); assert.equal(M.stagione, 2); assert.equal(M.gemme - g0, DIVISIONI[4].fine + E.diamanti.promozione); assert.equal(leg() - l0, 2); assert.equal(M.contatti - c0, 1);
  assert.deepEqual(e.premi, { gemme: DIVISIONI[4].fine + E.diamanti.promozione, leggendari: 2, contatti: 1 }); assert.deepEqual(M.storia, [{ stagione: 1, div: 5, pos: 1, fatti: 3, esito: 'sale' }]);
  assert.equal(M.squadre.filter((id) => id.startsWith('borghi-')).length, 15); assert.ok(M.cal.flat(2).every((id) => M.squadre.includes(id))); assert.equal(K.vittoria(M), 90); assert.ok(K.classifica(M, W.clubs).every((r) => r.g === 0));
  assert.ok(K.listaMercato(M, W.clubs).every((g) => g.val >= 45 && g.val <= 57), 'la lista trasferimenti segue la divisione');
  // perde tutto: ultima, scende; nell'ultima divisione, perdendo tutto, resta dov'è
  stagione(M, 0, 3); e = K.esitoStagione(M, W.clubs); assert.ok(e.scende && !e.sale && e.pos === 16); K.nuovaStagione(M, W.clubs, rnd); assert.equal(M.div, 5); assert.equal(M.storia[1].esito, 'scende');
  stagione(M, 0, 3); e = K.esitoStagione(M, W.clubs); assert.ok(!e.scende && !e.sale); K.nuovaStagione(M, W.clubs, rnd); assert.equal(M.div, 5); assert.equal(M.storia[2].esito, 'resta');
  // solo due obiettivi: non si sale. Prima in campionato e fuori subito dalle coppe
  const Z = nuovaW(); stagione(Z, 3, 0, false); K.giocaCoppa(Z, W.clubs, 0, 2, [], rnd, null, giorno(0)); for (let n = 0; n < 3; n++) K.giocaCastelli(Z, W.clubs, 0, 2, [], rnd, null, giorno(0));
  e = K.esitoStagione(Z, W.clubs); assert.equal(e.fatti, 1); assert.ok(!e.sale);
  // l'obiettivo della rosa: con la media che serve, più la posizione e una coppa, si sale
  for (const x of mioW.xi) Z.crescita[x[0]] = { stat: Object.fromEntries(W.DATI.scheda(x, 'academy').stat.map(([k]) => [k, 12])), pot: 20 };
  assert.ok(K.mediaTitolari(Z, W.clubs) >= O.media); ob = K.obiettivi(Z, W.clubs); assert.ok(ob.find((o) => o.id === 'rosa').fatto); assert.equal(K.esitoStagione(Z, W.clubs).fatti, 2);
  // fino in cima: vincendo tutto si sale ogni anno; nel Campionato Sammarinese le avversarie sono le quindici vere
  const T = nuovaW(); for (let n = 0; n < 4; n++) { stagione(T, 3, 0); K.nuovaStagione(T, W.clubs, rnd); }
  assert.equal(T.div, 1); assert.equal(K.divisione(T).nome, 'Campionato Sammarinese'); assert.deepEqual(T.squadre.slice().sort(), W.clubs.map((c) => c.id).sort()); assert.equal(K.vittoria(T), 250);
  assert.ok(K.statoSfide(T).c.find((x) => x.id === 'c1').fatto); assert.equal(K.obiettivi(T, W.clubs).length, 3);
  stagione(T, 3, 0); e = K.nuovaStagione(T, W.clubs, rnd); assert.ok(!e.sale && T.div === 1); assert.equal(e.premi.gemme, DIVISIONI[0].fine); assert.ok(T.trofei.some((t) => t.tipo === 'Campionato' && t.div === 1));
  // coppa vinta: venti diamanti; arrivare in finale: un leggendario e un contatto
  const Q = nuovaW(), q0 = Q.gemme; for (let n = 0; n < 3; n++) K.giocaCoppa(Q, W.clubs, 2, 0, [], rnd, null, giorno(0));
  assert.equal(Object.values(Q.allenatori.leggendario).reduce((a, b) => a + b, 0), 1); assert.equal(Q.contatti, 1); const q1 = Q.gemme; K.giocaCoppa(Q, W.clubs, 2, 0, [], rnd, null, giorno(0));
  assert.equal(Q.gemme - q1, E.diamanti.coppa); assert.ok(Q.trofei.some((t) => t.tipo === 'Coppa Titano')); assert.ok(q1 - q0 === E.diamanti.serie[0]);
  assert.ok(STAGIONE.servono === 3);
  K.applica(null, W.clubs);
}
// lo stadio nella richiesta del ponte (docs/ponte-partita.md §11): conta chi ospita. Per ognuna delle cinque divisioni
// una partita in casa (la divisione e le stelle dello Stadio dell'utente) e una in trasferta (la divisione e le
// stelle di forza dell'avversario: le squadre vere sono nel Campionato Sammarinese)
{
  const { controllaRichiesta } = await import('../src/ponte.js'), ammesse = DIVISIONI.map((d) => d.id);
  const accettato = (st) => !controllaRichiesta({ versione: 1, stadio: st }, null, ammesse).some((e) => /stadio/.test(e));
  assert.deepEqual(ammesse, ['sammarinese', 'cadetta', 'contrade', 'borghi', 'esordienti']);
  DIVISIONI.forEach((D, k) => {
    const div = k + 1, M = nuovaW(); M.div = div; M.strutture.stadio = k;
    // l'avversario: una squadra inventata di quella divisione, o una vera nella più alta
    const loro = div === 1 ? W.clubs.find((c) => !c.inventata && c.id !== M.club) : W.DIV.inventate.find((c) => c.div === div);
    const casa = K.stadioDi(M, W.clubs, M.club), fuori = K.stadioDi(M, W.clubs, loro.id);
    assert.deepEqual(casa, { divisione: D.id, stelle: k }, `in casa in ${D.nome}`); assert.deepEqual(fuori, { divisione: D.id, stelle: loro.str }, `in trasferta in ${D.nome}`);
    assert.ok(accettato(casa) && accettato(fuori) && fuori.stelle >= 0 && fuori.stelle <= 5);
    // in coppa e in amichevole l'avversario può essere di un'altra divisione: in trasferta vale la sua, in casa la nostra
    const altra = W.DIV.inventate.find((c) => c.div !== div && c.div > 1); assert.equal(K.stadioDi(M, W.clubs, altra.id).divisione, DIVISIONI[altra.div - 1].id); assert.equal(K.stadioDi(M, W.clubs, M.club).divisione, D.id);
  });
  // senza carriera (amichevole dal benvenuto): le squadre vere giocano nello stadio grande, con le loro stelle
  const vera = W.clubs.find((c) => !c.inventata); assert.deepEqual(K.stadioDi(null, W.clubs, vera.id), { divisione: 'sammarinese', stelle: vera.str });
  assert.ok(!accettato({ divisione: 'serie-a' }) && !accettato({ divisione: 'contrade', stelle: 6 }));
  K.applica(null, W.clubs);
}
assert.equal(K.carica({ getItem: () => '{rotto' }), null); assert.equal(K.carica({ getItem: () => null }), null);
console.log(`Carriera: tutte le prove passate (forte contro debole: ${v} vittorie, ${s} sconfitte su 4000, ${(gol / 4000).toFixed(2)} gol a partita)`);
