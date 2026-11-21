/* Il bordo campo: steward in pettorina gialla tra i cartelloni e gli spalti (girati verso il pubblico, come nelle partite
   vere), fotografi inginocchiati accanto alle porte col teleobiettivo che segue il pallone, cameraman in piedi dietro la
   telecamera sul treppiede (a centrocampo e dietro le porte, anche loro seguono il pallone), riserve sedute in panchina con
   la pettorina e un allenatore in piedi davanti a ogni panchina. Una InstancedMesh per tipo, coi colori nei vertici. */

// colori: pettorina gialla fluo con bande riflettenti, pantaloni scuri; fotografi in nero con pettorina azzurra
const COL = { pettorina: 0xF2E21B, banda: 0xe8eef2, pantaloni: 0x1d2230, pelle: 0xd9a77e, scarpe: 0x111111, giacca: 0x16181f, riserva: 0xD9F51F, foto: 0x3fa9f5, macchina: 0x0d0d0f, obiettivo: 0xe9e6dc, berretto: 0x1d2230 };

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
  // cameraman in piedi dietro la telecamera sul treppiede (il davanti è +z)
  const cameraman = figura(T, [
    [0.14, 0.82, 0.16, -0.1, 0.41, -0.35, C.pantaloni], [0.14, 0.82, 0.16, 0.1, 0.41, -0.35, C.pantaloni], [0.44, 0.6, 0.24, 0, 1.12, -0.35, C.giacca], [0.45, 0.28, 0.25, 0, 1.2, -0.35, C.foto],
    [0.2, 0.24, 0.21, 0, 1.56, -0.33, C.pelle], [0.22, 0.07, 0.23, 0, 1.7, -0.33, C.berretto], [0.09, 0.09, 0.4, -0.2, 1.3, -0.12, C.giacca], [0.09, 0.09, 0.4, 0.2, 1.3, -0.12, C.giacca],
    [0.05, 1.25, 0.05, 0, 0.62, 0.1, C.macchina], [0.05, 1.3, 0.05, -0.22, 0.62, 0.3, C.macchina, -0.25], [0.05, 1.3, 0.05, 0.22, 0.62, 0.3, C.macchina, -0.25], // treppiede
    [0.26, 0.24, 0.5, 0, 1.4, 0.2, C.macchina], [0.16, 0.16, 0.3, 0, 1.4, 0.58, C.obiettivo], // telecamera e ottica
  ]);
  // riserva seduta in panchina (tuta scura, pettorina chiara) e allenatore in piedi (abito scuro)
  const seduto = figura(T, [
    [0.14, 0.14, 0.45, -0.1, 0.5, 0.2, C.pantaloni], [0.14, 0.14, 0.45, 0.1, 0.5, 0.2, C.pantaloni], [0.14, 0.45, 0.14, -0.1, 0.25, 0.4, C.pantaloni], [0.14, 0.45, 0.14, 0.1, 0.25, 0.4, C.pantaloni],
    [0.42, 0.55, 0.24, 0, 0.85, 0, C.giacca], [0.43, 0.34, 0.25, 0, 0.9, 0, C.riserva], [0.2, 0.23, 0.21, 0, 1.25, 0.02, C.pelle], [0.21, 0.06, 0.22, 0, 1.38, 0.02, C.macchina],
    [0.1, 0.1, 0.36, -0.26, 0.72, 0.14, C.giacca], [0.1, 0.1, 0.36, 0.26, 0.72, 0.14, C.giacca],
  ]);
  const allenatore = figura(T, [
    [0.14, 0.84, 0.16, -0.1, 0.42, 0, C.giacca], [0.14, 0.84, 0.16, 0.1, 0.42, 0, C.giacca], [0.16, 0.06, 0.24, -0.1, 0.03, 0.03, C.scarpe], [0.16, 0.06, 0.24, 0.1, 0.03, 0.03, C.scarpe],
    [0.46, 0.62, 0.25, 0, 1.14, 0, C.giacca], [0.12, 0.3, 0.02, 0, 1.25, 0.13, C.banda], [0.1, 0.58, 0.1, -0.29, 1.12, 0, C.giacca], [0.1, 0.58, 0.1, 0.29, 1.12, 0, C.giacca], [0.2, 0.24, 0.21, 0, 1.58, 0, C.pelle], [0.21, 0.06, 0.22, 0, 1.72, 0, C.macchina],
  ]);
  const mat = new T.MeshLambertMaterial({ vertexColors: true });
  // posti: steward lungo il lato lungo opposto alle telecamere e dietro le porte; fotografi a lato delle porte, tra la linea di fondo e i cartelloni
  const stew = [];
  for (let k = -3; k <= 3; k++) stew.push([k * HL / 3.6, -(HW + 5.5), Math.PI]); // girati verso il pubblico (la tribuna è a -z)
  for (const e of [-1, 1]) for (const z of [-HW * 0.55, HW * 0.55]) stew.push([e * (HL + 7.2), z, e > 0 ? Math.PI / 2 : -Math.PI / 2]);
  const fot = []; for (const e of [-1, 1]) for (const z of [-15, -11, -7.5, 7.5, 11, 15]) fot.push({ x: e * (HL + 3.4), z: z + (Math.abs(z) > 10 ? 0.4 : 0), e });
  const mS = new T.InstancedMesh(steward, mat, stew.length), mF = new T.InstancedMesh(fotografo, mat, fot.length), m4 = new T.Matrix4(), q = new T.Quaternion(), su = new T.Vector3(0, 1, 0), uno = new T.Vector3(1, 1, 1), p = new T.Vector3();
  stew.forEach(([x, z, ry], i) => { m4.compose(p.set(x, 0, z), q.setFromAxisAngle(su, ry), uno); mS.setMatrixAt(i, m4); });
  // cameraman: uno a centrocampo sul lato lontano (tra le panchine) e uno dietro ogni porta. Riserve e allenatori sulle due
  // panchine (panchine in src/grafica/stadio.js: a x = ±9, sei posti occupati su sette)
  const cam = [{ x: 0, z: -(HW + 3.1) }, { x: HL + 4.6, z: 3.2 }, { x: -(HL + 4.6), z: -3.2 }];
  const mC = new T.InstancedMesh(cameraman, mat, cam.length), panca = [], mister = [];
  for (const px of [-9, 9]) { for (let i = 0; i < 7; i++) if (i !== 3) panca.push([px - 3 + i, 0, -(HW + 2.75)]); mister.push([px + (px > 0 ? -4.4 : 4.4), 0, -(HW + 1.9)]); }
  const mP = new T.InstancedMesh(seduto, mat, panca.length), mA = new T.InstancedMesh(allenatore, mat, mister.length);
  panca.forEach(([x, y, z], i) => { m4.compose(p.set(x, y, z), q.identity(), uno); mP.setMatrixAt(i, m4); });
  mister.forEach(([x, y, z], i) => { m4.compose(p.set(x, y, z), q.identity(), uno); mA.setMatrixAt(i, m4); });
  for (const m of [mS, mF, mC, mP, mA]) { m.castShadow = true; m.frustumCulled = false; scene.add(m); }
  const dirC = cam.map(() => 0);
  // i fotografi puntano il teleobiettivo verso il pallone (ruotano piano, come chi segue l'azione)
  const dir = fot.map((f) => (f.e > 0 ? -Math.PI / 2 : Math.PI / 2));
  function muovi(dt, bx = 0, bz = 0) {
    fot.forEach((f, i) => {
      let a = Math.atan2(bx - f.x, bz - f.z), da = a - dir[i]; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
      dir[i] += da * Math.min(1, dt * 2.5); m4.compose(p.set(f.x, 0, f.z), q.setFromAxisAngle(su, dir[i]), uno); mF.setMatrixAt(i, m4);
    });
    mF.instanceMatrix.needsUpdate = true;
    cam.forEach((f, i) => { // anche le telecamere seguono il pallone
      let a = Math.atan2(bx - f.x, bz - f.z), da = a - dirC[i]; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
      dirC[i] += da * Math.min(1, dt * 2); m4.compose(p.set(f.x, 0, f.z), q.setFromAxisAngle(su, dirC[i]), uno); mC.setMatrixAt(i, m4);
    });
    mC.instanceMatrix.needsUpdate = true;
  }
  muovi(1);
  /** Lo scaler della qualità li può togliere (prima le ombre, poi le figure). */
  function qualita(livello) { for (const m of [mS, mF, mC, mP, mA]) { m.castShadow = livello < 1; m.visible = livello < 3; } }
  return { muovi, qualita, steward: mS, fotografi: mF };
}
