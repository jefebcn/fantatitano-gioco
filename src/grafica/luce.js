/* Giorno e notte. Di giorno: sole caldo e basso, cielo limpido, ombre nette (sole basso a ~45°, di lato e un po' dal fondo: l'ombra di
   ogni giocatore cade in basso a sinistra sullo schermo, lunga circa quanto il giocatore). Il sole è forte e la luce diffusa
   del cielo debole, così l'ombra è scura e netta come in Dream League. Di notte: cielo scuro, le quattro torri faro
   accese (pannelli luminosi, alone, fasci di luce visibili e quattro faretti che danno i riflessi su erba e linee), ombre
   corte e morbide che vengono dall'alto. Si sceglie prima della partita. */

export function creaAtmosfera(T, { scene, hemi, sun, sole, fari, sfondo, campo, tribune = [], resa = null }) {
  const notte = { fasci: [], aloni: [], faretti: [] };
  const alone = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,250,230,1)'); g.addColorStop(0.35, 'rgba(255,240,200,.45)'); g.addColorStop(1, 'rgba(255,240,200,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new T.CanvasTexture(c); })();
  // il fascio è più visibile vicino alla torre e sfuma verso il campo (alphaMap a gradiente lungo il cono)
  const sfuma = (() => { const c = document.createElement('canvas'); c.width = 4; c.height = 128; const x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, '#fff'); g.addColorStop(0.35, '#555'); g.addColorStop(1, '#000'); x.fillStyle = g; x.fillRect(0, 0, 4, 128); return new T.CanvasTexture(c); })();
  const fascio = new T.MeshBasicMaterial({ color: 0xfff3d6, alphaMap: sfuma, transparent: true, opacity: 0.16, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide });
  for (const l of fari.luci) {
    const p = new T.Vector3(l.pos.x, l.pos.y, l.pos.z), bersaglio = new T.Vector3(l.pos.x * 0.25, 0, l.pos.z * 0.25), lungo = p.distanceTo(bersaglio);
    // fascio di luce: un cono aperto, additivo e quasi trasparente, dalla torre verso il campo
    const g = new T.ConeGeometry(13, lungo, 24, 1, true); g.translate(0, -lungo / 2, 0); g.rotateX(-Math.PI / 2);
    const f = new T.Mesh(g, fascio); f.position.copy(p); f.lookAt(bersaglio); f.visible = false; scene.add(f); notte.fasci.push(f);
    const s = new T.Sprite(new T.SpriteMaterial({ map: alone, color: 0xffffff, blending: T.AdditiveBlending, depthWrite: false, transparent: true })); s.position.copy(p); s.scale.set(16, 16, 1); s.visible = false; scene.add(s); notte.aloni.push(s);
    const sp = new T.SpotLight(0xf6f4ff, 0, 0, 0.55, 0.65, 0); sp.position.copy(p); sp.target.position.copy(bersaglio); scene.add(sp, sp.target); notte.faretti.push(sp);
  }
  const ORE = {
    giorno: { cielo: 0x86b9ea, nebbia: [0xa9cdee, 130, 330], hemi: [0xffffff, 0x47703a, 0.7], sole: [0xfff0d4, 3.7], dir: [14, 39, -37], morbide: .6, fari: 0.15, faretti: 0, sfondo: 0x4d6f9c, ruvido: 1, tribune: 0xffffff },
    notte: { cielo: 0x060a18, nebbia: [0x0a1022, 110, 320], hemi: [0x34436e, 0x0b130c, 0.35], sole: [0xf3f6ff, 0.95], dir: [6, 95, 14], morbide: 4, fari: 2.6, faretti: 1.0, sfondo: 0x111a30, ruvido: 0.7, tribune: 0x5c6378 },
  };
  let ora = 'giorno';
  function applica(nome) {
    const o = ORE[nome] || ORE.giorno; ora = ORE[nome] ? nome : 'giorno';
    scene.background = new T.Color(o.cielo); if (scene.fog) { scene.fog.color.set(o.nebbia[0]); scene.fog.near = o.nebbia[1]; scene.fog.far = o.nebbia[2]; }
    hemi.color.set(o.hemi[0]); hemi.groundColor.set(o.hemi[1]); hemi.intensity = o.hemi[2];
    sun.color.set(o.sole[0]); sun.intensity = o.sole[1]; sole.set(o.dir[0], o.dir[1], o.dir[2]); sun.shadow.radius = o.morbide;
    fari.materiale.emissiveIntensity = o.fari;
    const n = ora === 'notte'; for (const f of notte.fasci) f.visible = n; for (const s of notte.aloni) s.visible = n; for (const sp of notte.faretti) { sp.intensity = o.faretti; sp.visible = n; } // di giorno i faretti sono spenti del tutto: non costano niente
    if (sfondo) sfondo.color.set(o.sfondo);
    for (const m of tribune) m.color.set(o.tribune); // di notte il pubblico resta in penombra, il campo sotto i fari
    if (campo && campo.material) campo.material.roughness = o.ruvido; // di notte l'erba (e le linee) luccicano un po' sotto i fari
    if (resa) resa.imposta(ora); // riflessi dall'ambiente e alone delle luci (src/grafica/resa.js)
  }
  return { applica, get ora() { return ora; } };
}
