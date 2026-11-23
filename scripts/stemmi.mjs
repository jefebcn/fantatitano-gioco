// Gli stemmi delle squadre inventate: scrive i loro sessanta riquadri in assets/immagini.json (uno per squadra, col
// nome del file, 512 × 512 trasparente) e stampa la tabella per docs/immagini-da-generare.md.
// Uso: node scripts/stemmi.mjs            aggiorna assets/immagini.json e stampa la tabella
import { readFileSync, writeFileSync } from 'node:fs';
import { creaMondo } from './lib/mondo.mjs';
import { DIVISIONI } from '../src/config.js';
import { nomeStemma } from '../src/casa/nomi-stemmi.js';

const COLORI = { '#C0392B': 'rosso', '#FFFFFF': 'bianco', '#1D4F8A': 'blu', '#111111': 'nero', '#F2B822': 'giallo oro', '#2E8B57': 'verde', '#E0B400': 'giallo', '#1B2A5C': 'blu scuro', '#7A1F3D': 'granata',
  '#E8C77A': 'oro chiaro', '#FF7A1A': 'arancione', '#5B2A86': 'viola', '#0E7C86': 'verde acqua', '#F4F1DE': 'crema', '#87CEEB': 'celeste', '#8B5A2B': 'marrone', '#D6336C': 'rosa', '#556B2F': 'verde oliva' };
const SIMBOLI = { corona: 'una corona', stella: 'una stella', pallone: 'un pallone', torre: 'una torre', nessuno: 'nessun simbolo' };
const colore = (c) => { if (!COLORI[c.toUpperCase()]) throw new Error(`colore senza nome: ${c}`); return COLORI[c.toUpperCase()]; };
const { DIV } = creaMondo();
const squadre = DIV.inventate.slice().sort((a, b) => a.div - b.div || a.name.localeCompare(b.name, 'it'));
// l'elenco è scritto una riga per immagine: si tolgono le righe degli stemmi di prima e si rimettono in fondo
const file = new URL('../assets/immagini.json', import.meta.url), righe = readFileSync(file, 'utf8').split('\n').filter((r) => !r.includes('"nome": "stemma-'));
const chiude = righe.lastIndexOf('  ]'), nuove = squadre.map((c) => `    { "nome": "${nomeStemma(c.name)}", "w": 512, "h": 512, "alfa": true, "rifila": true, "priorita": "C", "squadra": ${JSON.stringify(c.name)} }`);
righe[chiude - 1] = righe[chiude - 1].replace(/,?$/, ',');
righe.splice(chiude, 0, nuove.join(',\n'));
writeFileSync(file, righe.join('\n'));
JSON.parse(readFileSync(file, 'utf8'));
console.log('| Squadra | Divisione | Nome del file | Colori | Forma e simbolo di adesso |\n|---|---|---|---|---|');
for (const c of squadre) console.log(`| ${c.name} | ${DIVISIONI[c.div - 1].nome} | \`${nomeStemma(c.name)}.png\` | ${colore(c.c1)} e ${colore(c.c2)} | ${c.stemma.forma}, ${SIMBOLI[c.stemma.simbolo]} |`);
console.error(`${squadre.length} stemmi scritti in assets/immagini.json`);
