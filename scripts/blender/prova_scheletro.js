// Pagina della prova dello scheletro (vedi prova_scheletro.cjs): porta le animazioni sul corpo nuovo con lo stesso metodo del
// gioco (rotazione di ogni osso nel mondo rispetto alla posa a T) e disegna i fotogrammi.
import * as T from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
const OSSA = { Hips: 'pelvis', Spine: 'spine_01', Spine1: 'spine_02', Spine2: 'spine_03', Neck: 'neck_01', Head: 'Head',
  LeftShoulder: 'clavicle_l', LeftArm: 'upperarm_l', LeftForeArm: 'lowerarm_l', LeftHand: 'hand_l', RightShoulder: 'clavicle_r', RightArm: 'upperarm_r', RightForeArm: 'lowerarm_r', RightHand: 'hand_r',
  LeftUpLeg: 'thigh_l', LeftLeg: 'calf_l', LeftFoot: 'foot_l', LeftToeBase: 'ball_l', RightUpLeg: 'thigh_r', RightLeg: 'calf_r', RightFoot: 'foot_r', RightToeBase: 'ball_r' };
const SRC = Object.keys(OSSA), FIGLIO = { LeftArm: 'LeftForeArm', LeftForeArm: 'LeftHand', RightArm: 'RightForeArm', RightForeArm: 'RightHand', LeftUpLeg: 'LeftLeg', LeftLeg: 'LeftFoot', RightUpLeg: 'RightLeg', RightLeg: 'RightFoot' };
const senza = (n) => n.replace(/^mixamorig:?/, '');
const ossa = (root, mappa) => { const m = {}; root.traverse((o) => { if (!o.isBone) return; const n = senza(o.name); for (const s of SRC) if ((mappa ? mappa[s] : s) === n && !m[s]) m[s] = o; }); return m; };
const WQ = (o) => o.getWorldQuaternion(new T.Quaternion()), WP = (o) => o.getWorldPosition(new T.Vector3());
window.prova = async (anims, viste) => {
  const L = new GLTFLoader(), W = 420, H = 560;
  const r = new T.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); r.setSize(W, H); document.body.appendChild(r.domElement);
  const sc = new T.Scene(); sc.background = new T.Color(0x8f9aa8); sc.add(new T.HemisphereLight(0xffffff, 0x556655, 1.5)); const l = new T.DirectionalLight(0xffffff, 2.2); l.position.set(2, 4, 3); sc.add(l);
  const terra = new T.Mesh(new T.PlaneGeometry(8, 8), new T.MeshStandardMaterial({ color: 0x4f8a2c })); terra.rotation.x = -Math.PI / 2; sc.add(terra);
  const tg = await L.loadAsync('/corpo.glb'); sc.add(tg.scene); tg.scene.traverse((o) => { if (o.isMesh) { o.material = new T.MeshStandardMaterial({ color: 0xd9b08c, roughness: .8 }); o.frustumCulled = false; } });
  tg.scene.updateMatrixWorld(true); const tb = ossa(tg.scene), tRest = {}, tLoc = {}; for (const s of SRC) { tRest[s] = WQ(tb[s]); tLoc[s] = tb[s].quaternion.clone(); }
  const tHipsY = WP(tb.Hips).y, hips0 = tb.Hips.position.clone(), tutte = []; tg.scene.traverse((o) => { if (o.isBone) tutte.push([o, o.quaternion.clone()]); });
  // sorgenti: il manichino Mixamo (attesa, corsa) e il calciatore attuale con le clip del gioco (tiro, tuffo)
  const base = await L.loadAsync('/base.glb'), cal = await L.loadAsync('/calciatore.glb'); const A = window.ANIMS;
  const clipGioco = (nome) => { const c = A.clip[nome], B = A.ossa.length, times = new Float32Array(c.n), pos = new Float32Array(c.n * 3);
    for (let i = 0; i < c.n; i++) { times[i] = i / A.fps; for (let j = 0; j < 3; j++) pos[i * 3 + j] = c.p[i * 3 + j] / 10000; }
    const tracks = [new T.VectorKeyframeTrack(`${A.bacino}.position`, times, pos)];
    A.ossa.forEach((b, n) => { const v = new Float32Array(c.n * 4); for (let i = 0; i < c.n; i++) for (let j = 0; j < 4; j++) v[i * 4 + j] = c.q[(i * B + n) * 4 + j] / 10000; tracks.push(new T.QuaternionKeyframeTrack(`${b}.quaternion`, times, v)); });
    return new T.AnimationClip(nome, (c.n - 1) / A.fps, tracks); };
  const sorg = { base: { root: base.scene, b: ossa(base.scene), clip: (n) => base.animations.find((c) => c.name === n) }, gioco: { root: cal.scene, b: ossa(cal.scene, OSSA), clip: clipGioco } };
  for (const s of Object.values(sorg)) { s.root.updateMatrixWorld(true); s.rest = {}; for (const k of SRC) s.rest[k] = WQ(s.b[k]).invert(); s.hipsY = WP(s.b.Hips).y; s.mixer = new T.AnimationMixer(s.root);
    s.corr = {}; for (const k of SRC) { s.corr[k] = new T.Quaternion(); if (FIGLIO[k]) { const vs = WP(s.b[FIGLIO[k]]).sub(WP(s.b[k])).normalize(), vt = WP(tb[FIGLIO[k]]).sub(WP(tb[k])).normalize(); s.corr[k].setFromUnitVectors(vt, vs); } } }
  const cam = new T.PerspectiveCamera(30, W / H, .1, 50), out = [], misure = {};
  for (const [nome, da, clipNome, tempi, modo] of anims) {
    const s = sorg[da], clip = s.clip(clipNome); s.mixer.stopAllAction(); const az = s.mixer.clipAction(clip); az.play(); misure[nome] = { durata: +clip.duration.toFixed(2), piedeMin: 9, piedeMax: -9 };
    for (const [o, q] of tutte) o.quaternion.copy(q); tb.Hips.position.copy(hips0);
    for (const fr of tempi) {
      s.mixer.setTime(clip.duration * fr); s.root.updateMatrixWorld(true);
      for (const k of SRC) { // rotazione nel mondo rispetto alla posa a T della sorgente, applicata alla posa a T del corpo nuovo
        const D = WQ(s.b[k]).multiply(s.rest[k]), w = D.multiply(s.corr[k]).multiply(tRest[k]); tb[k].parent.updateWorldMatrix(true, false);
        tb[k].quaternion.copy(WQ(tb[k].parent).invert().multiply(w));
      }
      const hy = WP(s.b.Hips).y / s.hipsY * tHipsY; tb.Hips.parent.updateWorldMatrix(true, false); const p = tb.Hips.parent.worldToLocal(new T.Vector3(0, hy, 0)); tb.Hips.position.set(hips0.x, p.y !== undefined ? tb.Hips.parent.worldToLocal(new T.Vector3(WP(tb.Hips).x, hy, WP(tb.Hips).z)).y : hips0.y, hips0.z);
      tb.Hips.position.copy(tb.Hips.parent.worldToLocal(new T.Vector3(0, hy, 0)));
      tg.scene.updateMatrixWorld(true);
      const py = Math.min(WP(tb.LeftToeBase).y, WP(tb.RightToeBase).y, WP(tb.LeftFoot).y, WP(tb.RightFoot).y); misure[nome].piedeMin = Math.min(misure[nome].piedeMin, +py.toFixed(3)); misure[nome].piedeMax = Math.max(misure[nome].piedeMax, +py.toFixed(3));
      for (const [vx, vy, vz, ty] of viste) { cam.position.set(vx, vy, vz); cam.lookAt(0, ty, 0); r.render(sc, cam); out.push([nome, r.domElement.toDataURL('image/png')]); }
    }
  }
  return { out, misure };
};
