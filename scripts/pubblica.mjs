// Prepara public/ per la pubblicazione, dopo esbuild (npm run build).
// - public/index.html da src/pagina.html, con la versione negli indirizzi degli script (app.js?v=…): un telefono che ha
//   la pagina nuova non può prendere uno script vecchio dalla memoria.
// - public/sw.js da src/sw.js, con la versione di tutti i file e la lista di quelli da precaricare.
// Uso: node scripts/pubblica.mjs
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const hash = (buf) => createHash('sha256').update(buf).digest('hex').slice(0, 10);
const P = 'public';
const tutti = (dir) => readdirSync(join(P, dir)).flatMap((f) => (statSync(join(P, dir, f)).isDirectory() ? tutti(join(dir, f)) : [join(dir, f)]));

let html = readFileSync('src/pagina.html', 'utf8');
const script = [];
// in sviluppo app.js può non esserci ancora: versione 'dev'
html = html.replace(/<script src="([\w.-]+\.js)"><\/script>/g, (_, f) => { const v = `${f}?v=${existsSync(join(P, f)) ? hash(readFileSync(join(P, f))) : 'dev'}`; script.push(v); return `<script src="${v}"></script>`; });
writeFileSync(join(P, 'index.html'), html);

// da precaricare: la pagina, gli script, i font, le texture e le immagini che servono già alla prima schermata e alla
// prima partita (gli stemmi piccoli, maschera della divisa, pelle e occhi). Gli stemmi grandi si salvano al primo uso.
const IMG = /^img\/(.*-mini\.webp|corona-lime\.png|divisa-maschera\.png|occhi\.webp|pelle\.webp|saluta\.webp|braccia\.webp|indica\.webp)$/;
const file = [...tutti('font'), ...tutti('textures').filter((f) => !f.endsWith('.md')), ...tutti('img').filter((f) => IMG.test(f)), 'manifest.webmanifest', 'icona-192.png', 'icona-512.png'];
const precarica = ['./', ...script, ...file];
const versione = hash([html, ...file.map((f) => hash(readFileSync(join(P, f))))].join('|'));
writeFileSync(join(P, 'sw.js'), readFileSync('src/sw.js', 'utf8').replace("'__VERSIONE__'", `'${versione}'`).replace('= __PRECARICA__', `= ${JSON.stringify(precarica)}`));
console.log(`pubblica: versione ${versione}, ${precarica.length} file da precaricare`);
