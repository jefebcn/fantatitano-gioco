/* Il bordo campo: steward in pettorina ad alta visibilità tra i cartelloni e gli spalti (girati verso il pubblico, come
   nelle partite vere) e fotografi inginocchiati davanti ai cartelloni, accanto alle porte, col teleobiettivo che segue il
   pallone. Due InstancedMesh con i colori nei vertici: due chiamate grafiche in tutto. */

// colori: pettorina arancio fluo con bande riflettenti, pantaloni scuri; fotografi in nero con pettorina azzurra
const COL = { pettorina: 0xff6a13, banda: 0xe8eef2, pantaloni: 0x1d2230, pelle: 0xd9a77e, scarpe: 0x111111, giacca: 0x16181f, foto: 0x3fa9f5, macchina: 0x0d0d0f, obiettivo: 0xe9e6dc, berretto: 0x1d2230 };

/** Una figura fatta di scatole colorate, unite in una geometria sola con i colori nei vertici. */
function figura(T, pezzi) {
  const pos = [], nor = [], col = [], idx = [], c = new T.Color();
  for (const [w, h, d, x, y, z, colore, rx = 0] of pezzi) {
    const b = new T.BoxGeometry(w, h, d); if (rx) b.rotateX(rx); b.translate(x, y, z); c.set(colore);
    const o = pos.length / 3, P = b.attributes.position, Nn = b.attributes.normal;
    for (let i = 0; i < P.count; i++) { pos.push(P.getX(i), P.getY(i), P.getZ(i)); nor.push(Nn.getX(i), Nn.getY(i), Nn.getZ(i)); col.push(c.r, c.g, c.b); }
    for (const i of b.index.array) idx.push(o + i);
  }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); g.setAttribute('color', new T.Float32BufferAttribute(col, 3)); g.setIndex(idx); return g;
}

export function creaBordoCampo(T, scene, { HL, HW }) {
  const C = COL;
  // steward in piedi, alto 1,8 m (il davanti è +z)
  const steward = figura(T, [
    [0.14, 0.82, 0.16, -0.1, 0.41, 0, C.pantaloni], [0.14, 0.82, 0.16, 0.1, 0.41, 0, C.pantaloni], [0.16, 0.06, 0.24, -0.1, 0.03, 0.03, C.scarpe], [0.16, 0.06, 0.24, 0.1, 0.03, 0.03, C.scarpe],
    [0.44, 0.6, 0.24, 0, 1.12, 0, C.pettorina], [0.45, 0.05, 0.25, 0, 0.98, 0, C.banda], [0.45, 0.05, 0.25, 0, 1.14, 0, C.banda], // pettorina con due bande riflettenti
    [0.1, 0.56, 0.1, -0.28, 1.1, 0, C.pantaloni], [0.1, 0.56, 0.1, 0.28, 1.1, 0, C.pantaloni], [0.2, 0.24, 0.21, 0, 1.56, 0, C.pelle], [0.22, 0.07, 0.23, 0, 1.7, 0, C.berretto], [0.2, 0.02, 0.1, 0, 1.67, 0.14, C.berretto],
  ]);
  // fotografo inginocchiato, girato verso +z, con la macchina e il teleobiettivo davanti al viso
  const fotografo = figura(T, [
    [0.15, 0.14, 0.5, -0.12, 0.08, -0.05, C.giacca], [0.15, 0.45, 0.15, 0.12, 0.23, 0.12, C.giacca], [0.15, 0.14, 0.42, 0.12, 0.45, -0.05, C.giacca], // una gamba a terra, l'altra piegata
    [0.42, 0.52, 0.26, 0, 0.78, -0.1, C.giacca], [0.43, 0.3, 0.27, 0, 0.86, -0.1, C.foto], // busto e pettorina
    [0.2, 0.23, 0.21, 0, 1.17, -0.08, C.pelle], [0.22, 0.06, 0.23, 0, 1.3, -0.08, C.berretto],
    [0.09, 0.09, 0.32, -0.2, 1.0, 0.08, C.giacca], [0.09, 0.09, 0.32, 0.2, 1.0, 0.08, C.giacca], // braccia in avanti
    [0.14, 0.11, 0.1, 0, 1.15, 0.1, C.macchina], [0.11, 0.11, 0.42, 0, 1.13, 0.36, C.obiettivo], // macchina e teleobiettivo
  ]);
  const mat = new T.MeshLambertMaterial({ vertexColors: true });
  // posti: steward lungo il lato lungo opposto alle telecamere e dietro le porte; fotografi a lato delle porte, tra la linea di fondo e i cartelloni
  const stew = [];
  for (let k = -3; k <= 3; k++) stew.push([k * HL / 3.6, -(HW + 5.5), Math.PI]); // girati verso il pubblico (la tribuna è a -z)
  for (const e of [-1, 1]) for (const z of [-HW * 0.55, HW * 0.55]) stew.push([e * (HL + 7.2), z, e > 0 ? Math.PI / 2 : -Math.PI / 2]);
  const fot = []; for (const e of [-1, 1]) for (const z of [-15, -11, -7.5, 7.5, 11, 15]) fot.push({ x: e * (HL + 3.4), z: z + (Math.abs(z) > 10 ? 0.4 : 0), e });
  const mS = new T.InstancedMesh(steward, mat, stew.length), mF = new T.InstancedMesh(fotografo, mat, fot.length), m4 = new T.Matrix4(), q = new T.Quaternion(), su = new T.Vector3(0, 1, 0), uno = new T.Vector3(1, 1, 1), p = new T.Vector3();
  stew.forEach(([x, z, ry], i) => { m4.compose(p.set(x, 0, z), q.setFromAxisAngle(su, ry), uno); mS.setMatrixAt(i, m4); });
  for (const m of [mS, mF]) { m.castShadow = true; m.frustumCulled = false; scene.add(m); }
  // i fotografi puntano il teleobiettivo verso il pallone (ruotano piano, come chi segue l'azione)
  const dir = fot.map((f) => (f.e > 0 ? -Math.PI / 2 : Math.PI / 2));
  function muovi(dt, bx = 0, bz = 0) {
    fot.forEach((f, i) => {
      let a = Math.atan2(bx - f.x, bz - f.z), da = a - dir[i]; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
      dir[i] += da * Math.min(1, dt * 2.5); m4.compose(p.set(f.x, 0, f.z), q.setFromAxisAngle(su, dir[i]), uno); mF.setMatrixAt(i, m4);
    });
    mF.instanceMatrix.needsUpdate = true;
  }
  muovi(1);
  /** Lo scaler della qualità li può togliere (prima le ombre, poi le figure). */
  function qualita(livello) { mS.castShadow = mF.castShadow = livello < 1; mS.visible = mF.visible = livello < 3; }
  return { muovi, qualita, steward: mS, fotografi: mF };
}
