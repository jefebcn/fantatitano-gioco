// Impacchetta modelli/calciatore.glb e modelli/capelli.glb dentro public/modello.js (base64), che la pagina carica senza fetch.
// Prima li comprime con Meshopt: normali, coordinate della texture e pesi diventano numeri interi, poi passa il
// codificatore di meshoptimizer. Le posizioni restano in metri (decimali): il gioco ci fa i conti sopra (numero e stemma
// appoggiati al corpo, stoffa gonfiata nello shader). Il gioco apre il file col decodificatore di three.js.
// I file in modelli/ restano quelli leggibili, non compressi.
import { NodeIO } from '@gltf-transform/core';
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { quantize, reorder, prune } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import { readFileSync, writeFileSync } from 'node:fs';
await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions([EXTMeshoptCompression, KHRMeshQuantization]).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const zitto = { debug() {}, info() {}, warn: console.warn, error: console.error };
async function compresso(file) {
  const doc = await io.read(file); doc.setLogger(zitto);
  // (prune tiene gli attributi: le coordinate della texture servono anche se il materiale del file non ha texture)
  // i segni per vertice (labbra, cuoio capelluto, occhi, unghie) servono solo a scripts/maschera-nuova.py: nel gioco no
  for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) for (const s of p.listSemantics()) if (s.startsWith('_')) p.setAttribute(s, null);
  await doc.transform(prune({ keepAttributes: true }), reorder({ encoder: MeshoptEncoder }), quantize({ pattern: /^(NORMAL|TEXCOORD|JOINTS|WEIGHTS)(_\d+)?$/, patternTargets: /^NIENTE$/ }));
  doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
  const out = Buffer.from(await io.writeBinary(doc)); console.log(file, Math.round(readFileSync(file).length / 1024), 'KB ->', Math.round(out.length / 1024), 'KB');
  return out.toString('base64');
}
const js = `// Generato da scripts/modello-js.mjs: il calciatore e le capigliature (corpo MPFB/MakeHuman, CC0), compressi con Meshopt, in base64.\nwindow.MODEL_B64="${await compresso('modelli/calciatore.glb')}";\nwindow.HAIR_B64="${await compresso('modelli/capelli.glb')}";\n`;
writeFileSync('public/modello.js', js); console.log('public/modello.js', Math.round(js.length / 1024), 'KB');
