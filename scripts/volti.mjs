// Scrive src/dati/volti.json: l'elenco dei ritratti che il gioco può usare, letto dai file di public/img/ritratti.
// veri: i volti dei giocatori veri (squadra-nome); condivisi: i volti per i giocatori inventati e del mercato;
// sopra: i volti che hanno anche lo strato dei capelli davanti alla maglia.
// Uso: node scripts/volti.mjs   (dopo scripts/blender/tutti.sh, e ogni volta che si aggiungono ritratti)
import { readdirSync, writeFileSync } from 'node:fs';
const file = readdirSync('public/img/ritratti'), id = (coda) => file.filter((f) => f.endsWith(coda) && !f.startsWith('maglia-')).map((f) => f.slice(0, -coda.length)).sort();
const sopra = id('-sopra-256.webp'), tutti = id('-256.webp').filter((x) => !x.endsWith('-sopra'));
const volti = { veri: tutti.filter((x) => !x.startsWith('volto-')), condivisi: tutti.filter((x) => x.startsWith('volto-')), sopra };
writeFileSync('src/dati/volti.json', JSON.stringify(volti) + '\n');
console.log(`volti: ${volti.veri.length} veri, ${volti.condivisi.length} condivisi, ${sopra.length} con lo strato sopra`);
