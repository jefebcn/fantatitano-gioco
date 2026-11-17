// Prepara il calciatore dal pacchetto «Universal Base Characters» di Quaternius (CC0), in modelli/quaternius/:
//  - modelli/calciatore.glb: corpo, occhi e sopracciglia senza texture, alleggeriti, con lo scheletro originale
//  - modelli/capelli.glb: le acconciature (si agganciano all'osso della testa)
// Uso: node scripts/calciatore.mjs [rapporto corpo, es. 0.36]
import { NodeIO } from '@gltf-transform/core';
import { weld, prune, dedup, mergeDocuments, unpartition, compactPrimitive } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import { readFileSync } from 'node:fs';

const SRC = 'modelli/quaternius', ratio = Number(process.argv[2] || 0.36);
const io = new NodeIO();
// I .gltf del pacchetto citano texture che qui non servono (e in parte mancano): si tolgono prima di leggere.
const leggi = (nome) => {
  const json = JSON.parse(readFileSync(`${SRC}/${nome}.gltf`, 'utf8')), resources = {};
  delete json.images; delete json.textures; delete json.samplers;
  for (const m of json.materials || []) { const p = m.pbrMetallicRoughness || {}; delete p.baseColorTexture; delete p.metallicRoughnessTexture; delete m.normalTexture; delete m.occlusionTexture; delete m.emissiveTexture; }
  for (const b of json.buffers || []) resources[b.uri] = new Uint8Array(readFileSync(`${SRC}/${decodeURIComponent(b.uri)}`));
  return io.readJSON({ json, resources });
};
const spoglia = (doc) => {
  for (const m of doc.getRoot().listMaterials()) { m.setBaseColorTexture(null); m.setNormalTexture(null); m.setMetallicRoughnessTexture(null); m.setOcclusionTexture(null); m.setEmissiveTexture(null); }
  for (const t of doc.getRoot().listTextures()) t.dispose();
  for (const mesh of doc.getRoot().listMeshes()) for (const p of mesh.listPrimitives()) for (const s of p.listSemantics()) if (/^(COLOR_|TEXCOORD_[1-9])/.test(s)) p.setAttribute(s, null);
};
await MeshoptSimplifier.ready; MeshoptSimplifier.useExperimentalFeatures = true; // simplifyWithAttributes è ancora marcata sperimentale
// Alleggerisce tenendo conto anche delle coordinate di texture e delle normali: la funzione di gltf-transform guarda solo
// le posizioni e accavalla i triangoli nella texture vicino alle cuciture, con gli orli della divisa che vengono strappati.
const alleggerisci = (doc, rapporto) => {
  for (const mesh of doc.getRoot().listMeshes()) for (const p of mesh.listPrimitives()) {
    const idx = new Uint32Array(p.getIndices().getArray()), pos = new Float32Array(p.getAttribute('POSITION').getArray()), n = pos.length / 3;
    const uv = p.getAttribute('TEXCOORD_0'), nr = p.getAttribute('NORMAL'), at = new Float32Array(n * 5);
    for (let i = 0; i < n; i++) { if (uv) { const e = uv.getElement(i, []); at[i * 5] = e[0]; at[i * 5 + 1] = e[1]; } if (nr) { const e = nr.getElement(i, []); at[i * 5 + 2] = e[0]; at[i * 5 + 3] = e[1]; at[i * 5 + 4] = e[2]; } }
    const [out] = MeshoptSimplifier.simplifyWithAttributes(idx, pos, 3, at, 5, [PESO_UV, PESO_UV, .4, .4, .4], null, Math.floor(idx.length * rapporto / 3) * 3, 0.03, []);
    p.getIndices().setArray(n > 65535 ? out : new Uint16Array(out)); compactPrimitive(p);
  }
};
const PESO_UV = 4;
const conta = (doc) => doc.getRoot().listMeshes().map((m) => `${m.getName()} ${m.listPrimitives().reduce((n, p) => n + p.getIndices().getCount() / 3, 0)} tri (${m.listPrimitives()[0].getMaterial().getName()})`).join(' · ');

const corpo = await leggi('Superhero_Male_FullBody');
spoglia(corpo);
await corpo.transform(weld({}));
alleggerisci(corpo, ratio);
await corpo.transform(prune({ keepAttributes: true }), dedup());
console.log('calciatore:', conta(corpo));
await io.write('modelli/calciatore.glb', corpo);

const capelli = await leggi('Hair_Buzzed');
for (const f of ['Hair_SimpleParted', 'Hair_Beard']) mergeDocuments(capelli, await leggi(f));
spoglia(capelli);
const scena = capelli.getRoot().listScenes()[0];
for (const s of capelli.getRoot().listScenes().slice(1)) { for (const n of s.listChildren()) scena.addChild(n); s.dispose(); }
await capelli.transform(unpartition(), weld({}));
alleggerisci(capelli, 0.55);
await capelli.transform(prune({ keepAttributes: true }), dedup());
console.log('capelli:', capelli.getRoot().listNodes().map((n) => n.getName()).join(', '), '·', conta(capelli));
await io.write('modelli/capelli.glb', capelli);
