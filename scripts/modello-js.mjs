// Impacchetta modelli/giocatore.glb dentro public/modello.js (base64), che la pagina carica senza fetch.
import { readFileSync, writeFileSync } from 'node:fs';
const b64 = readFileSync('modelli/giocatore.glb').toString('base64');
writeFileSync('public/modello.js', `// Modello 3D del giocatore (GLB in base64): segnaposto da sostituire col calciatore definitivo\nwindow.MODEL_B64="${b64}";\n`);
console.log('public/modello.js', Math.round(b64.length / 1024), 'KB');
