/* Cerca i commenti «//» che si sono mangiati del codice: in src/game.js le righe sono lunghe e un commento messo a metà riga
   spegne tutto quello che segue (è successo due volte). Esce con errore se ne trova. Uso: npm run controlla */
import { readFileSync } from 'node:fs';
const commento = (l) => {
  let q = null;
  for (let i = 0; i < l.length; i++) {
    const c = l[i];
    if (q) { if (c === '\\') i++; else if (c === q) q = null; }
    else if (c === "'" || c === '"' || c === '`') q = c;
    else if (c === '/' && l[i + 1] === '/') return l.slice(i + 2);
  }
  return null;
};
let trovati = 0;
for (const f of ['src/game.js', 'src/carriera.js', 'src/fisica/pallone.js', 'src/fisica/corpo.js', 'src/fisica/contatti.js', 'src/grafica/campo.js', 'src/grafica/stadio.js', 'src/grafica/luce.js', 'src/grafica/spalti.js', 'src/grafica/bordocampo.js', 'src/regia.js', 'src/audio.js']) {
  readFileSync(new URL('../' + f, import.meta.url), 'utf8').split('\n').forEach((l, n) => {
    const c = commento(l);
    if (c && /;\s*\S/.test(c) && /[=(]/.test(c)) { trovati++; console.log(`${f}:${n + 1}: nel commento sembra esserci del codice → ${c.trim().slice(0, 140)}`); }
  });
}
console.log(trovati ? `${trovati} da controllare` : 'Commenti a posto');
process.exit(trovati ? 1 : 0);
