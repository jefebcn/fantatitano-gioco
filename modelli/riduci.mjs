import { NodeIO } from '@gltf-transform/core';
import { weld, simplify, prune, dedup, resample } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
const io = new NodeIO();
const doc = await io.read(process.argv[3] || 'modelli/Xbot.glb');
for (const a of doc.getRoot().listAnimations()) if (!['idle', 'run', 'walk'].includes(a.getName())) a.dispose();
await doc.transform(weld({}), simplify({ simplifier: MeshoptSimplifier, ratio: Number(process.argv[2] || .22), error: 0.004 }), resample(), prune(), dedup());
for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) console.log(m.getName(), p.getIndices().getCount() / 3, 'tri', p.getAttribute('POSITION').getCount(), 'vert', p.listSemantics().join(','));
await io.write('modelli/giocatore.glb', doc);
