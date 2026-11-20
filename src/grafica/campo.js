/* Il campo: prato PBR (texture CC0 di ambientCG in public/textures/grass), strisce di taglio, usura e linee regolamentari.
   Le texture si ripetono fitte (una ogni `passo` metri) con il filtro anisotropico, così il prato resta nitido anche in
   lontananza. Strisce, usura e linee non sono disegnate nelle texture ma calcolate nello shader sopra il prato: le linee
   hanno sotto la grana dell'erba e un leggero rilievo. Se le texture non si caricano il campo usa un prato di riserva
   disegnato al momento, senza bloccare la partita. */

const RIS = 'textures/grass/';

/** Le linee del campo su un canvas trasparente: s pixel per metro, M metri di bordo attorno al rettangolo di gioco. */
function disegnaLinee(HL, HW, M, s, L) {
  const c = document.createElement('canvas'); c.width = Math.round((HL * 2 + M * 2) * s); c.height = Math.round((HW * 2 + M * 2) * s);
  const x = c.getContext('2d'), X = (wx) => (wx + HL + M) * s, Z = (wz) => (wz + HW + M) * s;
  x.strokeStyle = '#fff'; x.fillStyle = '#fff'; x.lineWidth = 0.12 * s; x.lineJoin = 'round';
  x.strokeRect(X(-HL), Z(-HW), HL * 2 * s, HW * 2 * s);
  x.beginPath(); x.moveTo(X(0), Z(-HW)); x.lineTo(X(0), Z(HW)); x.stroke();
  const [aL, aW] = L.area, [pL, pW] = L.piccola, R = L.cerchio, D = L.dischetto;
  x.beginPath(); x.arc(X(0), Z(0), R * s, 0, 7); x.stroke();
  x.beginPath(); x.arc(X(0), Z(0), 0.2 * s, 0, 7); x.fill();
  for (const d of [-1, 1]) {
    const gx = d * HL;
    x.strokeRect(Math.min(X(gx), X(gx - d * aL)), Z(-aW / 2), aL * s, aW * s);
    x.strokeRect(Math.min(X(gx), X(gx - d * pL)), Z(-pW / 2), pL * s, pW * s);
    x.beginPath(); x.arc(X(gx - d * D), Z(0), 0.18 * s, 0, 7); x.fill();
    x.beginPath(); const a = Math.acos((aL - D) / R);
    x.arc(X(gx - d * D), Z(0), R * s, d > 0 ? Math.PI - a : -a, d > 0 ? Math.PI + a : a); x.stroke();
    for (const e of [-1, 1]) { const f = Math.atan2(-e, -d); x.beginPath(); x.arc(X(gx), Z(e * HW), 1 * s, f - Math.PI / 4, f + Math.PI / 4); x.stroke(); } // quarto di cerchio dell'angolo, verso l'interno
  }
  return c;
}
// prato di riserva se le texture non arrivano: verde con un po' di grana
function pratoDiRiserva(T) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  x.fillStyle = '#4f8a2c'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 9000; i++) { x.fillStyle = `rgba(${30 + Math.random() * 60},${90 + Math.random() * 80},${20 + Math.random() * 30},.5)`; x.fillRect(Math.random() * 256, Math.random() * 256, 1, 2 + Math.random() * 2); }
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
}

/**
 * Crea il campo e risponde una promessa con { campo, fuori }: il rettangolo di gioco col suo bordo e il prato attorno.
 * `anisotropia` è quella massima della scheda grafica.
 */
export async function creaCampo(T, { HL, HW, linee: L, M = 6, anisotropia = 8, passo = 4, strisce = 5.6 }) {
  const loader = new T.TextureLoader(), carica = (n) => new Promise((ok) => loader.load(RIS + n, ok, undefined, () => ok(null)));
  const [alb, nor, rug] = await Promise.all([carica('grass_albedo.webp'), carica('grass_normal.webp'), carica('grass_roughness.webp')]);
  const W = (HL + M) * 2, H = (HW + M) * 2, prepara = (t, srgb) => {
    if (!t) return null; t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(W / passo, H / passo); t.anisotropy = anisotropia; if (srgb) t.colorSpace = T.SRGBColorSpace; return t;
  };
  const map = prepara(alb, true) || prepara(pratoDiRiserva(T), true);
  const linee = new T.CanvasTexture(disegnaLinee(HL, HW, M, 20, L)); linee.anisotropy = anisotropia;
  const mat = new T.MeshStandardMaterial({ map, normalMap: prepara(nor), roughnessMap: prepara(rug), roughness: 1, metalness: 0, normalScale: new T.Vector2(0.55, 0.55) });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uLinee: { value: linee }, uCampo: { value: new T.Vector4(HL, HW, M, strisce) }, uTexel: { value: 1 / 20 } });
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vMondo;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvMondo = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vMondo; uniform sampler2D uLinee; uniform vec4 uCampo; uniform float uTexel; float gLinea;
vec2 uvLinee(vec2 p) { return vec2((p.x + uCampo.x + uCampo.z) / (2.0 * (uCampo.x + uCampo.z)), 1.0 - (p.y + uCampo.y + uCampo.z) / (2.0 * (uCampo.y + uCampo.z))); }
float linea(vec2 p) { return texture2D(uLinee, uvLinee(p)).a; }
float rumore(vec2 p) { return fract(sin(dot(floor(p), vec2(12.9898, 78.233))) * 43758.5453); }
float macchie(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(rumore(i), rumore(i + vec2(1, 0)), f.x), mix(rumore(i + vec2(0, 1)), rumore(i + vec2(1, 1)), f.x), f.y); }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
{
  vec2 p = vMondo.xz; float luma = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11));
  // strisce di taglio: bande chiare e scure lungo il campo
  float banda = mod(floor((p.x + uCampo.x) / uCampo.w), 2.0);
  diffuseColor.rgb *= mix(0.9, 1.08, banda);
  // usura: davanti alle porte (area piccola), sul dischetto e nel cerchio di centrocampo, a chiazze
  float u = 0.0;
  for (int k = 0; k < 2; k++) { float gx = (k == 0 ? -1.0 : 1.0) * (uCampo.x - 2.8); u += exp(-((p.x - gx) * (p.x - gx) / 7.0 + p.y * p.y / 16.0)); float sx = (k == 0 ? -1.0 : 1.0) * (uCampo.x - 11.0); u += 0.5 * exp(-((p.x - sx) * (p.x - sx) + p.y * p.y) / 2.5); }
  u += 0.45 * exp(-dot(p, p) / 28.0);
  u *= 0.35 + 0.9 * macchie(p * 0.9);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.45, 0.37, 0.24) * (0.75 + 0.6 * luma), clamp(u, 0.0, 0.62));
  // linee: bianche ma con sotto la grana dell'erba
  float L = linea(p); gLinea = L; // letta una volta sola: la riusano rugosità e rilievo
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.94) * (0.86 + 0.32 * luma), L * 0.93);
}`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
roughnessFactor = mix(roughnessFactor, 0.62, gLinea);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
{ // le linee hanno un leggero rilievo: la pendenza della maschera (dalle derivate sullo schermo, senza altre letture) piega la normale
  vec3 sx = dFdx(-vViewPosition), sy = dFdy(-vViewPosition), r1 = cross(sy, normal), r2 = cross(normal, sx);
  float det = dot(sx, r1) * faceDirection; vec3 grad = sign(det) * (dFdx(gLinea) * r1 + dFdy(gLinea) * r2) * 0.6;
  normal = normalize(abs(det) * normal - grad);
}`);
  };
  const campo = new T.Mesh(new T.PlaneGeometry(W, H), mat); campo.rotation.x = -Math.PI / 2; campo.receiveShadow = true;
  // il prato oltre il bordo, più scuro e con la stessa grana
  const fm = map.clone(); fm.repeat.set(700 / passo / 2, 700 / passo / 2); fm.needsUpdate = true;
  const fuori = new T.Mesh(new T.PlaneGeometry(700, 700), new T.MeshStandardMaterial({ map: fm, color: 0x9cb08c, roughness: 1, metalness: 0 }));
  fuori.rotation.x = -Math.PI / 2; fuori.position.y = -0.05; fuori.receiveShadow = true;
  return { campo, fuori, ok: !!alb };
}

/** Un'ombra morbida a terra (macchia sfumata): per i giocatori e il pallone, sotto alle ombre vere. */
export function texturaOmbra(T) {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.45, 'rgba(0,0,0,.65)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new T.CanvasTexture(c);
}
