// Scrive src/dati/giocatori.js: per ogni giocatore di public/data.js il ruolo preciso (POR, DC, TS, TD, CDC, CC, COC,
// AS, AD, ATT), il piede e l'altezza. I nomi vengono da public/data.js (il file che usa anche la partita): qui non se
// ne inventano. Il file scritto si può correggere a mano: chi c'è già resta com'è, si aggiunge solo chi manca.
// Uso: node scripts/genera-giocatori.mjs          aggiunge chi manca, tiene le correzioni a mano
//      node scripts/genera-giocatori.mjs rifai    ricalcola tutti da capo
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { FORMS, CARTE, ALTEZZA } from '../src/config.js';
import { hash, ruoloPosto } from '../src/dati/scala.js';

const src = readFileSync(new URL('../public/data.js', import.meta.url), 'utf8');
const clubs = JSON.parse(src.slice(src.indexOf('['), src.lastIndexOf(']') + 1));
const USCITA = new URL('../src/dati/giocatori.js', import.meta.url);
const rifai = process.argv[2] === 'rifai';
const prima = !rifai && existsSync(USCITA) ? (await import(USCITA)).GIOCATORI : {};

// il club che in carriera diventa quello dell'utente: parte col 4-3-3, il modulo già scelto nel gioco
const MIO = 'academy';
// lo stesso modulo che la partita dà a ogni squadra del computer (aiForm in src/game.js)
const moduloDi = (c) => (c.id === MIO ? '4-3-3' : Object.keys(FORMS)[hash(c.id) % 4]);
// la stessa altezza che la partita dà al modello 3D (statura in src/game.js), in centimetri
const altezza = (seme, portiere) => {
  const A = ALTEZZA, u = ((seme >>> 16) % 11) / 10, esp = (A.max - A.min) / (A.media - A.min) - 1;
  return Math.round((portiere ? A.portiere + (A.max - A.portiere) * u : A.min + (A.max - A.min) * Math.pow(u, esp)) * 100);
};
const caso = (club, nome, cosa) => hash(`${club}/${nome}/${cosa}`) % 100;
// quanti mancini: molti tra chi gioca a sinistra, pochi tra chi gioca a destra
const piede = (club, nome, ruolo) => (caso(club, nome, 'piede') < (ruolo.endsWith('S') ? 70 : /^(TD|AD)$/.test(ruolo) ? 8 : CARTE.sinistri * 100) ? 'S' : 'D');
// il ruolo di chi gioca in un posto che non è del suo reparto (un attaccante messo esterno di centrocampo…)
const nelReparto = (reparto, posto) => {
  const largo = /^[TA][SD]$/.test(posto), lato = posto.slice(-1);
  if (reparto === 'P') return 'POR';
  if (reparto === 'D') return largo ? `T${lato}` : 'DC';
  if (reparto === 'A') return largo ? `A${lato}` : 'ATT';
  return largo ? 'COC' : 'CC';
};

const out = {}; let nuovi = 0, tenuti = 0;
for (const c of clubs) {
  const f = FORMS[moduloDi(c)], gia = new Map((prima[c.id] || []).map((g) => [g[0], g])), lista = [];
  const metti = (x, ruolo) => {
    if (gia.has(x[0])) { lista.push(gia.get(x[0])); tenuti++; return; }
    lista.push([x[0], ruolo, piede(c.id, x[0], ruolo), altezza(hash(c.id + x[0]), x[1] === 'P')]); nuovi++;
  };
  // titolari: il ruolo del posto che occupano nel modulo della loro squadra
  c.xi.forEach((x, i) => { const posto = ruoloPosto(f.roles[i], f.pos[i][0], f.pos[i][1]); metti(x, CARTE.ruoli[posto].reparto === x[1] ? posto : nelReparto(x[1], posto)); });
  // riserve: prima il ruolo che alla rosa manca nel loro reparto (un terzino, un mediano, un'ala…), poi il ruolo centrale
  const voluti = { P: ['POR'], D: ['TS', 'TD', 'DC'], C: ['CDC', 'COC', 'CC'], A: ['AS', 'AD', 'ATT'] };
  for (const x of c.pan || []) metti(x, voluti[x[1]].find((r) => !lista.some((g) => g[1] === r)) || voluti[x[1]].at(-1));
  out[c.id] = lista;
}
const righe = Object.entries(out).map(([id, l]) => `  ${id}: [\n${l.map((g) => `    ${JSON.stringify(g)},`).join('\n')}\n  ],`).join('\n');
writeFileSync(USCITA, `// Ruolo preciso, piede (D destro, S sinistro) e altezza in centimetri di ogni giocatore, squadra per squadra:
// [nome, ruolo, piede, altezza]. I nomi sono quelli di public/data.js (una prova controlla che coincidano).
// Scritto da scripts/genera-giocatori.mjs; si può correggere a mano: le correzioni restano quando lo script gira ancora.
// Ruoli: POR, DC, TS, TD, CDC, CC, COC, AS, AD, ATT.
export const GIOCATORI = {
${righe}
};
`);
console.log(`giocatori: ${nuovi} calcolati, ${tenuti} tenuti com'erano`);
