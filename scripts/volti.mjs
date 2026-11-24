// Scrive src/dati/volti.json: l'elenco dei ritratti che il gioco può usare, letto dai file di public/img/ritratti-carte
// (ogni volto ha <id>-512.webp e <id>-256.webp; l'elenco si legge da quelli da 512).
// veri: i volti dei giocatori veri (squadra-nome); condivisi: i volti per i giocatori inventati e del mercato.
// Uso: node scripts/volti.mjs   (ogni volta che si aggiungono o si tolgono ritratti; `npm run prova` controlla che
// elenco e file vadano d'accordo)
import { readdirSync, writeFileSync } from 'node:fs';
const CODA = '-512.webp', tutti = readdirSync('public/img/ritratti-carte').filter((f) => f.endsWith(CODA)).map((f) => f.slice(0, -CODA.length)).sort();
const volti = { veri: tutti.filter((x) => !x.startsWith('volto-')), condivisi: tutti.filter((x) => x.startsWith('volto-')) };
writeFileSync('src/dati/volti.json', JSON.stringify(volti) + '\n');
console.log(`volti: ${volti.veri.length} veri, ${volti.condivisi.length} condivisi`);
