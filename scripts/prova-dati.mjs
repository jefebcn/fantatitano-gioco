/* Prove della scala delle valutazioni e dei dati dei giocatori (src/dati/scala.js, src/dati/giocatori.js).
   Uso: node scripts/prova-dati.mjs */
import { readFileSync, readdirSync } from 'node:fs';
import assert from 'node:assert/strict';
import { SCALA, CARTE, FORMS, RITRATTI } from '../src/config.js';
import { scala, creaDati, statistiche, moduli, postiModulo, adatto, fascia, hash } from '../src/dati/scala.js';
import { GIOCATORI } from '../src/dati/giocatori.js';
import { SQUADRE, nomeBreve, nomiDi } from '../src/dati/squadre.js';
import { resa, squadraMigliore } from '../src/casa/rosa.js';

const src = readFileSync(new URL('../public/data.js', import.meta.url), 'utf8');
const clubs = JSON.parse(src.slice(src.indexOf('['), src.lastIndexOf(']') + 1));
const D = creaDati(clubs, GIOCATORI), RUOLI = Object.keys(CARTE.ruoli);
const tutti = clubs.flatMap((c) => c.xi.concat(c.pan || []).map((x) => ({ c, x, s: D.scheda(x, c.id) })));

// la conversione è una sola ed è sempre crescente, anche fuori dai punti scritti
for (let x = -20; x < 140; x += .25) assert.ok(scala(x + .25) > scala(x), `la scala scende a ${x}`);
assert.equal(scala(SCALA.interno[0]), 55); assert.equal(scala(SCALA.interno[1]), 82);

// il file dei giocatori e quello delle squadre hanno gli stessi nomi, squadra per squadra; ruoli e piedi validi
for (const c of clubs) {
  const nomi = c.xi.concat(c.pan || []).map((x) => x[0]).sort(), miei = (GIOCATORI[c.id] || []).map((g) => g[0]).sort();
  assert.deepEqual(miei, nomi, `nomi diversi per ${c.id}: rifare con node scripts/genera-giocatori.mjs`);
  for (const g of GIOCATORI[c.id]) { assert.ok(RUOLI.includes(g[1]), `ruolo ${g[1]}`); assert.ok(g[2] === 'D' || g[2] === 'S'); assert.ok(g[3] >= 165 && g[3] <= 200, `altezza ${g[3]}`); }
}
// il ruolo preciso sta nel reparto del giocatore
for (const t of tutti) assert.equal(CARTE.ruoli[t.s.ruolo].reparto, t.x[1], `${t.s.nome}: ${t.s.ruolo} non è un ruolo da ${t.x[1]}`);

// valutazione e statistiche coerenti: la valutazione è la media pesata delle statistiche che si vedono
for (const t of tutti) {
  const p = CARTE.ruoli[t.s.ruolo].pesi; let somma = 0, pesi = 0;
  for (const [k, v] of t.s.stat) { somma += v * (p[k] || 0); pesi += p[k] || 0; assert.ok(v >= SCALA.stat[0] && v <= SCALA.stat[1]); }
  assert.equal(t.s.val, Math.round(somma / pesi), `${t.s.nome}: valutazione ${t.s.val} diversa dalla media pesata`);
  assert.equal(t.s.val, D.valore(t.x[1], t.x[3]), `${t.s.nome}: la carta e la funzione breve danno numeri diversi`);
  assert.equal(t.s.stat.length, 8);
  assert.equal(t.s.fascia, fascia(t.s.val));
}
// l'ordine di forza resta quello della partita: nello stesso reparto, chi ha la quotazione più alta non ha mai la valutazione più bassa
for (const r of 'PDCA') {
  const l = tutti.filter((t) => t.x[1] === r).sort((a, b) => a.x[3] - b.x[3]);
  for (let i = 1; i < l.length; i++) assert.ok(l[i].s.val >= l[i - 1].s.val, `${l[i].s.nome} più forte di ${l[i - 1].s.nome} ma con la valutazione più bassa`);
  assert.equal(l[0].s.val, 55); assert.equal(l.at(-1).s.val, 82);
}
// con l'allenamento (un punto di quotazione alla volta) la valutazione non scende mai e la carta resta coerente
for (const t of tutti.filter((_, i) => i % 9 === 0)) {
  let prima = t.s.val;
  for (let k = 1; k <= 10; k++) { const s = D.scheda([t.x[0], t.x[1], t.x[2], t.x[3] + k], t.c.id); assert.ok(s.val >= prima); assert.equal(s.val, D.valore(t.x[1], t.x[3] + k)); prima = s.val; }
}
// le stesse statistiche dallo stesso giocatore, sempre
assert.deepEqual(statistiche('prova/Rossi', 'ATT', 70), statistiche('prova/Rossi', 'ATT', 70));

// la scala del Campionato Sammarinese: quasi tutti tra 55 e 75, i migliori tra 76 e 82, nessuno oltre
const n = tutti.length, alti = tutti.filter((t) => t.s.val >= 76).length;
assert.ok(tutti.every((t) => t.s.val >= 55 && t.s.val <= 82));
assert.ok(alti / n > .05 && alti / n < .15, `da 76 in su: ${alti} su ${n}`);

// i candidati capitano: nove, tra 70 e 78, ruoli tutti diversi, nessuno del club dell'utente, punti forti riconoscibili
const cap = D.candidatiCapitano('academy'), C = SCALA.capitani;
assert.equal(cap.length, C.quanti);
assert.ok(cap.every((t) => t.s.val >= C.min && t.s.val <= C.max && t.club !== 'academy'));
assert.equal(new Set(cap.map((t) => t.s.ruolo)).size, cap.length, 'due capitani con lo stesso ruolo');
assert.ok(new Set(cap.map((t) => t.s.forte)).size >= 7, 'punti forti troppo uguali: ' + cap.map((t) => t.s.forte).join(' '));
for (const t of cap) assert.ok(t.s.stat.find((v) => v[0] === t.s.forte)[1] >= t.s.val + 2, `${t.s.nome}: il punto forte non si distingue`);

// moduli: quelli della partita, coi ruoli letti dalle posizioni; un portiere solo, undici posti
assert.deepEqual(moduli(), Object.keys(FORMS));
for (const m of moduli()) { const p = postiModulo(m); assert.equal(p.length, 11); assert.equal(p.filter((x) => x.ruolo === 'POR').length, 1); assert.ok(p.every((x) => RUOLI.includes(x.ruolo))); }
assert.deepEqual(postiModulo('4-3-3').map((p) => p.ruolo), ['POR', 'TS', 'DC', 'DC', 'TD', 'CC', 'CDC', 'CC', 'AS', 'ATT', 'AD']);
// ogni squadra del computer, nel suo modulo, non ha titolari fuori ruolo (al più in un ruolo vicino)
const moduloDi = (c) => (c.id === 'academy' ? '4-3-3' : Object.keys(FORMS)[hash(c.id) % 4]);
for (const c of clubs) { const p = postiModulo(moduloDi(c)); c.xi.forEach((x, i) => assert.ok(adatto(D.scheda(x, c.id).ruolo, p[i].ruolo) < 2, `${c.id}: ${x[0]} fuori ruolo da ${p[i].ruolo}`)); }
// fuori ruolo: stesso ruolo 0, vicino 1, lontano 2; fuori ruolo la valutazione non sale mai, e un giocatore di movimento in porta crolla
assert.equal(adatto('TS', 'TS'), 0); assert.equal(adatto('TS', 'TD'), 1); assert.equal(adatto('DC', 'ATT'), 2);
for (const t of tutti) for (const r of RUOLI) { const v = D.valoreIn(t.s, r); assert.ok(v <= t.s.val); if ((r === 'POR') !== (t.s.ruolo === 'POR')) assert.equal(v, SCALA.stat[0]); }
// ogni rosa copre tutti e dieci i ruoli o quasi: si può sempre schierare un 4-3-3 senza fuori ruolo gravi
for (const c of clubs) assert.ok(new Set(GIOCATORI[c.id].map((g) => g[1])).size >= 8, `${c.id}: pochi ruoli in rosa`);
// chi cambia squadra si porta dietro ruolo, piede e altezza
const viaggia = clubs[0].xi[1], s0 = D.scheda(viaggia, clubs[0].id), s1 = D.scheda(viaggia.concat(clubs[0].id), 'academy');
assert.deepEqual([s1.ruolo, s1.piede, s1.altezza, s1.val], [s0.ruolo, s0.piede, s0.altezza, s0.val]);

// i tre nomi di ogni squadra: completo e sigla come nei dati delle squadre, breve non più lungo di 14 lettere e mai vuoto
assert.deepEqual(Object.keys(SQUADRE).sort(), clubs.map((c) => c.id).sort());
for (const c of clubs) {
  const n = nomiDi(c); assert.equal(n.nome, c.name); assert.equal(n.sigla, c.short); assert.equal(n.sigla.length, 3);
  assert.ok(n.breve && n.breve.length <= 14 && n.breve.length <= n.nome.length, `nome breve di ${c.id}: «${n.breve}»`);
}
// il club dell'utente ha un nome suo: il breve si calcola, senza tagliare parole a metà; se non si può resta la sigla
for (const [nome, breve] of [['Sporting Serravalle U', 'Sp. Serravalle'], ['Titani FC', 'Titani FC'], ['Libera Acquaviva', 'Lib. Acquaviva'], ['Polisportiva Tre Castelli', 'Tre Castelli'], ['Unione Sportiva Montegiardino', 'Montegiardino'], ['Atletico Fiorentino Calcio', 'Fiorentino']]) assert.equal(nomeBreve(nome), breve);
for (const nome of ['Real Montale', 'Atletico Borgo', 'Rocca United', 'Guaita Calcio 1921', 'Sporting Serravalle', 'Real Sporting Borgo Maggiore']) { const b = nomeBreve(nome); assert.ok(b.length <= 14 && b.split(' ').every((p) => nome.includes(p.replace(/\.$/, ''))), `«${nome}» → «${b}»`); }
assert.deepEqual(nomiDi({ id: 'academy', name: 'Supercalifragilistico', short: 'SUP' }), { nome: 'Supercalifragilistico', breve: 'SUP', sigla: 'SUP' });

// «Squadra migliore»: per ogni squadra e ogni modulo sceglie undici giocatori diversi con un portiere in porta, non rende
// mai meno della formazione di partenza, e rifatta sul suo risultato non cambia più niente
for (const c of clubs) for (const m of moduli()) {
  const posti = postiModulo(m), rosa = c.xi.concat(c.pan || []).map((x) => ({ x, sc: D.scheda(x, c.id), energia: 100 })), r = squadraMigliore(rosa, posti);
  const tot = (ordine) => ordine.reduce((s, i, k) => s + resa(rosa[i].sc, posti[k].ruolo, rosa[i].energia), 0);
  assert.equal(new Set(r.ordine.concat(r.fuori)).size, rosa.length, `${c.id} ${m}: giocatori ripetuti o persi`); assert.equal(r.ordine.length, 11);
  r.ordine.forEach((i, k) => assert.equal(rosa[i].sc.reparto === 'P', posti[k].ruolo === 'POR', `${c.id} ${m}: portiere fuori posto`));
  assert.ok(tot(r.ordine) >= tot(rosa.map((_, i) => i).slice(0, 11)) - 1e-9, `${c.id} ${m}: la squadra migliore rende meno di quella di partenza`);
  const di = r.ordine.concat(r.fuori).map((i) => rosa[i]); assert.equal(squadraMigliore(di, posti).cambiata, false, `${c.id} ${m}: rifatta, cambia ancora`);
}
// un titolare senza energia lascia il posto a una riserva del suo ruolo, quando in panchina ce n'è una quasi forte come lui
{
  let provati = 0;
  for (const c of clubs) {
    const posti = postiModulo('4-3-3'), rosa = c.xi.concat(c.pan || []).map((x) => ({ x, sc: D.scheda(x, c.id), energia: 100 })), prima = squadraMigliore(rosa, posti);
    const ord = prima.ordine.concat(prima.fuori).map((i) => rosa[i]), k = ord.findIndex((g, i) => i > 0 && i < 11 && ord.slice(11).some((r) => r.sc.ruolo === g.sc.ruolo && r.sc.val >= g.sc.val - 6));
    if (k < 0) continue;
    ord[k].energia = 0; const dopo = squadraMigliore(ord, posti); assert.ok(dopo.cambiata && !dopo.ordine.includes(k), `${c.id}: il titolare stremato resta in campo`); provati++;
  }
  assert.ok(provati > 3, 'troppo pochi casi per provare il cambio di un titolare stremato');
}

// ---------- ritratti: ogni volto dell'elenco (src/dati/volti.json) ha i suoi due file in public/img/ritratti-carte, e
// nella cartella non ci sono file che l'elenco non conosce. Nel gioco non c'è più un ritratto di ripiego: se un file
// manca la carta resta con la sagoma, quindi qui la prova si ferma prima.
let quantiVolti = 0;
{
  const VOLTI = JSON.parse(readFileSync(new URL('../src/dati/volti.json', import.meta.url), 'utf8')), ids = [...VOLTI.veri, ...VOLTI.condivisi];
  const file = new Set(readdirSync(new URL(`../public/${RITRATTI.cartella}`, import.meta.url)));
  const attesi = ids.flatMap((id) => Object.values(RITRATTI.lato).map((lato) => `${id}-${lato}.webp`)), voluti = new Set(attesi);
  assert.ok(VOLTI.veri.length && VOLTI.condivisi.length, 'l\'elenco dei volti è vuoto');
  assert.equal(new Set(ids).size, ids.length, 'un volto è scritto due volte nell\'elenco');
  assert.ok(VOLTI.veri.every((x) => !x.startsWith('volto-')) && VOLTI.condivisi.every((x) => x.startsWith('volto-')), 'un volto è nella lista sbagliata (i condivisi cominciano con «volto-»)');
  assert.deepEqual(attesi.filter((f) => !file.has(f)), [], 'mancano dei file di ritratto in public/img/ritratti-carte');
  assert.deepEqual([...file].filter((f) => !voluti.has(f)), [], 'ci sono file di ritratto che l\'elenco non conosce: rilanciare node scripts/volti.mjs');
  quantiVolti = ids.length;
}

const conta = {}; for (const t of tutti) conta[t.s.ruolo] = (conta[t.s.ruolo] || 0) + 1;
console.log(`dati: ${n} giocatori, valutazioni 55-82, ${alti} da 76 in su; ruoli ${JSON.stringify(conta)}`);
console.log(`ritratti: ${quantiVolti} volti, ognuno coi suoi due file`);
console.log('capitani: ' + cap.map((t) => `${t.s.ruolo} ${t.s.val} ${t.s.nome} (${t.s.forte})`).join(', '));
