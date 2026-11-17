// Impacchetta modelli/calciatore.glb e modelli/capelli.glb dentro public/modello.js (base64), che la pagina carica senza fetch.
import { readFileSync, writeFileSync } from 'node:fs';
const b = (f) => readFileSync(f).toString('base64');
const js = `// Generato da scripts/modello-js.mjs: il calciatore e le acconciature (Quaternius, CC0), in base64.\nwindow.MODEL_B64="${b('modelli/calciatore.glb')}";\nwindow.HAIR_B64="${b('modelli/capelli.glb')}";\n`;
writeFileSync('public/modello.js', js); console.log('public/modello.js', Math.round(js.length / 1024), 'KB');
