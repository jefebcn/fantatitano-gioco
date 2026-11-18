/* Unisce le parti ferme di uno stadio: i figli diretti di un gruppo che hanno lo stesso materiale (e le stesse ombre)
   diventano una mesh sola, con le loro posizioni già dentro i vertici. Meno chiamate di disegno, stessa immagine.
   Si passano solo i materiali dei pezzi che non si muovono mai: bandiere, reti e coperture animate restano fuori. */
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Ritorna quante mesh ha tolto. */
export function unisci(T, gruppo, materiali) {
  const per = new Map();
  for (const o of gruppo.children) {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || o.children.length || !materiali.includes(o.material)) continue;
    const g = o.geometry, chiave = [o.material.id, o.castShadow, o.receiveShadow, o.visible, !!g.index, Object.keys(g.attributes).sort().join(',')].join('|');
    if (!per.has(chiave)) per.set(chiave, []);
    per.get(chiave).push(o);
  }
  let tolte = 0;
  for (const pezzi of per.values()) {
    if (pezzi.length < 2) continue;
    const geos = pezzi.map((o) => { o.updateMatrix(); return o.geometry.clone().applyMatrix4(o.matrix); });
    const geo = mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    if (!geo) continue;
    geo.clearGroups();
    const m = new T.Mesh(geo, pezzi[0].material);
    m.castShadow = pezzi[0].castShadow; m.receiveShadow = pezzi[0].receiveShadow; m.name = 'unito';
    for (const o of pezzi) gruppo.remove(o);
    gruppo.add(m); tolte += pezzi.length - 1;
  }
  return tolte;
}
