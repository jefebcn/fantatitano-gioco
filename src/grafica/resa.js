/* La resa dell'immagine: riflessi dall'ambiente, tonalità da diretta TV e alone delle luci.

   - Ambiente: un cielo disegnato al momento (gradiente, sole o le quattro torri faro accese) diventa una mappa d'ambiente
     filtrata (PMREM). Dà riflessi veri a pali, pallone lucido, scarpini e maglie e una luce diffusa che viene dal cielo.
     Due mappe, giorno e notte, fatte una volta sola all'avvio.
   - Tonalità: «Neutral» di Khronos. Fino a ~0,8 lascia i colori come sono (le divise restano quelle), sopra comprime
     le luci forti invece di bruciarle in bianco.
   - Alone (bloom): solo dove la luce è molto forte (fari, pannelli accesi, riflessi del sole). È l'unica parte che costa a
     ogni fotogramma: parte accesa sui telefoni con almeno 6 core e WebGL2 con multisample, ed è la prima cosa che si
     spegne se i fotogrammi calano (prima ancora della risoluzione, vedi prestazioni.js). */
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export const RESA = {
  esposizione: 1,
  giorno: { alto: 0x5d97da, orizzonte: 0xcfe2f2, terra: 0x3d5a2c, sole: [30, 70, 40], luce: 0xfff1d8, forza: 5, ambiente: 0.45, alone: [0.12, 0.3, 0.97] },
  notte: { alto: 0x03050c, orizzonte: 0x161d33, terra: 0x0c120c, ambiente: 0.6, alone: [0.55, 0.5, 0.78], torri: 0xfff4dd, forzaTorri: 14 },
};

/** Il cielo per la mappa d'ambiente: una sfera col gradiente e, dentro, le sorgenti luminose come piccoli dischi. */
function cielo(T, o, torri) {
  const sc = new T.Scene();
  const mat = new T.ShaderMaterial({
    side: T.BackSide, depthWrite: false,
    uniforms: { alto: { value: new T.Color(o.alto) }, orizzonte: { value: new T.Color(o.orizzonte) }, terra: { value: new T.Color(o.terra) } },
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 alto, orizzonte, terra; varying vec3 vD; void main(){ float y = vD.y; vec3 c = y > 0.0 ? mix(orizzonte, alto, pow(y, 0.6)) : mix(orizzonte, terra, pow(-y, 0.35)); gl_FragColor = vec4(c, 1.0); }',
  });
  sc.add(new T.Mesh(new T.SphereGeometry(100, 32, 16), mat));
  const disco = (dir, colore, forza, r) => {
    const m = new T.Mesh(new T.SphereGeometry(r, 12, 8), new T.MeshBasicMaterial({ color: new T.Color(colore).multiplyScalar(forza) }));
    m.position.copy(dir).normalize().multiplyScalar(90); sc.add(m);
  };
  if (o.sole) disco(new T.Vector3(...o.sole), o.luce, o.forza, 7);
  for (const t of torri) disco(new T.Vector3(t.x, t.y, t.z), o.torri, o.forzaTorri, 4);
  return sc;
}

export function creaResa(T, { renderer, scene, cam, torri = [] }) {
  renderer.toneMapping = T.NeutralToneMapping; renderer.toneMappingExposure = RESA.esposizione;
  // le mappe d'ambiente, giorno e notte
  const pm = new T.PMREMGenerator(renderer), mappe = {};
  for (const nome of ['giorno', 'notte']) { const sc = cielo(T, RESA[nome], nome === 'notte' ? torri : []); mappe[nome] = pm.fromScene(sc, 0.02).texture; sc.traverse((x) => { if (x.geometry) x.geometry.dispose(); if (x.material) x.material.dispose(); }); }
  pm.dispose();

  // gli effetti: si creano solo se servono (WebGL2 con multisample: i bordi restano lisci anche passando da una texture)
  const gl2 = renderer.capabilities.isWebGL2 !== false && renderer.capabilities.maxSamples >= 4;
  let comp = null, bloom = null, attivi = gl2 && (navigator.hardwareConcurrency || 4) >= 6, ora = 'giorno';
  const w0 = new T.Vector2(), w1 = new T.Vector2();
  function prepara() {
    if (comp) return;
    renderer.getSize(w0);
    const rt = new T.WebGLRenderTarget(w0.x * renderer.getPixelRatio(), w0.y * renderer.getPixelRatio(), { type: T.HalfFloatType, samples: 4 });
    comp = new EffectComposer(renderer, rt);
    comp.addPass(new RenderPass(scene, cam));
    bloom = new UnrealBloomPass(new T.Vector2(w0.x, w0.y), 0.3, 0.4, 0.9); comp.addPass(bloom);
    comp.addPass(new OutputPass());
    applicaAlone();
  }
  function applicaAlone() { if (!bloom) return; const [s, r, t] = RESA[ora].alone; bloom.strength = s; bloom.radius = r; bloom.threshold = t; }

  /** Giorno o notte: ambiente e alone. */
  function imposta(nome) {
    ora = RESA[nome] ? nome : 'giorno';
    scene.environment = mappe[ora]; scene.environmentIntensity = RESA[ora].ambiente; applicaAlone();
  }
  /** Al posto di renderer.render(scene, cam). */
  function disegna() {
    if (!attivi) { renderer.render(scene, cam); return; }
    prepara();
    renderer.getSize(w1);
    if (w1.x !== w0.x || w1.y !== w0.y || comp._pixelRatio !== renderer.getPixelRatio()) { w0.copy(w1); comp.setPixelRatio(renderer.getPixelRatio()); comp.setSize(w1.x, w1.y); }
    comp.render();
  }
  /** La prima rinuncia quando i fotogrammi calano: ritorna true se ha spento qualcosa. */
  function rinuncia() { if (!attivi) return false; attivi = false; return true; }
  imposta('giorno');
  return { imposta, disegna, rinuncia, effetti: (v) => { if (v !== undefined) attivi = !!v && gl2; return attivi; }, mappe };
}
