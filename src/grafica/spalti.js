/* Gli spalti: gradoni in cemento (texture CC0 di ambientCG in public/textures/stadium, o cemento disegnato al momento),
   scale di accesso, muretti, ringhiere, tunnel d'ingresso, striscioni e bandiere coi colori delle due squadre, e la folla.

   Gli stadi sono tre (STADI in src/config.js: paese, medio, grande) e si costruiscono dagli stessi pezzi: quattro lati,
   ognuno coi suoi anelli di gradoni, il tetto se c'è, e poi tabellone, palchi, maxischermi, alberi dove il tipo li ha.
   Campo e telecamera di gioco non cambiano: il muretto sta sempre alla stessa distanza dalle linee.

   La folla sono migliaia di persone (il modello dei calciatori, in piedi e semplificato): prime file dettagliate e il
   resto sagome leggere, una InstancedMesh per anello di ogni tribuna, e la tribuna alle spalle della telecamera viene
   scartata intera. Ogni tifoso ha un colore (della sua squadra, o un po' di neutri) e una fase sua; ondeggia e salta
   alzando le braccia nello shader, senza calcoli per tifoso sul processore: da qui si cambiano solo due numeri (quanto
   esulta ogni settore). */

import { unisci } from './unisci.js';
import { TIFOSO } from './tifoso-dati.js';

const RIS = 'textures/stadium/';

function cementoDiRiserva(T) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  x.fillStyle = '#b9b6b0'; x.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 2500; i++) { const v = 150 + Math.random() * 60; x.fillStyle = `rgba(${v},${v},${v - 4},.35)`; x.fillRect(Math.random() * 128, Math.random() * 128, 1 + Math.random() * 2, 1 + Math.random() * 2); }
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
}

/** Un raccoglitore di facce a quattro vertici: `quad` ne aggiunge una (con la sua normale), `geo` dà la geometria. */
function facce(T) {
  const pos = [], uv = [], nor = [], idx = [];
  const quad = (a, b, c, d, n) => {
    // giro dei vertici coerente con la normale (altrimenti la faccia viene scartata vista dal lato giusto)
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]], cr = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    if (cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2] < 0) [b, d] = [d, b];
    const k = pos.length / 3; for (const p of [a, b, c, d]) { pos.push(...p); nor.push(...n); uv.push((p[0] + p[2] * 0.3) / 4, (p[1] - p[2]) / 4); } idx.push(k, k + 1, k + 2, k, k + 2, k + 3); };
  const geo = () => {
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    return g;
  };
  return { quad, geo };
}

/**
 * I gradoni di un anello lungo `len` al muretto (coordinate dell'anello: x lungo la tribuna, z verso il dietro negativo,
 * y in alto, dal piede del muretto). A è l'anello: file, alt, prof e, per quelli sopra il primo, y e dietro.
 * Con `smusso` ogni fila è più lunga di quella davanti, di quanto sta più indietro: così le tribune vicine si incontrano
 * a 45 gradi negli angoli e la conca è chiusa.
 */
function geometriaGradoni(T, len, A, muro, smusso) {
  const { quad, geo } = facce(T), { file, alt, prof } = A, y0 = A.y || 0, dietro = A.dietro || 0;
  // mezza lunghezza a z metri dal muretto di questo anello
  const L = (z) => len / 2 + (smusso ? dietro - z : 0);
  quad([-L(0), 0, 0.01], [L(0), 0, 0.01], [L(0), muro, 0.01], [-L(0), muro, 0.01], [0, 0, 1]); // muretto davanti
  for (let r = 0; r < file; r++) {
    const y = muro + r * alt, z0 = -r * prof, z1 = -(r + 1) * prof;
    quad([-L(z0), y, z0], [-L(z1), y, z1], [L(z1), y, z1], [L(z0), y, z0], [0, 1, 0]); // pedata
    if (r < file - 1) quad([-L(z1), y, z1], [-L(z1), y + alt, z1], [L(z1), y + alt, z1], [L(z1), y, z1], [0, 0, 1]); // alzata
  }
  const yt = muro + (file - 1) * alt, zt = -file * prof;
  quad([L(zt), -y0, zt], [-L(zt), -y0, zt], [-L(zt), yt + 2.5, zt], [L(zt), yt + 2.5, zt], [0, 0, -1]); // muro di fondo, da terra
  if (y0 > 0) quad([-L(0), 0, 0], [L(0), 0, 0], [L(zt), 0, zt], [-L(zt), 0, zt], [0, -1, 0]); // il sotto di un anello alto
  if (!smusso) for (const s of [-1, 1]) quad([s * len / 2, 0, 0], [s * len / 2, 0, zt], [s * len / 2, yt + 2.5, zt], [s * len / 2, muro, 0], [s, 0, 0]); // fianchi
  return geo();
}

/** Una lastra di tetto da za a zb, larga due volte La in za e due volte Lb in zb, alla quota y e spessa sp. */
function lastra(T, za, zb, La, Lb, y, sp) {
  const { quad, geo } = facce(T), su = y + sp / 2, giu = y - sp / 2;
  quad([-La, su, za], [La, su, za], [Lb, su, zb], [-Lb, su, zb], [0, 1, 0]);
  quad([-La, giu, za], [La, giu, za], [Lb, giu, zb], [-Lb, giu, zb], [0, -1, 0]);
  quad([-La, giu, za], [La, giu, za], [La, su, za], [-La, su, za], [0, 0, Math.sign(za - zb)]);
  quad([-Lb, giu, zb], [Lb, giu, zb], [Lb, su, zb], [-Lb, su, zb], [0, 0, Math.sign(zb - za)]);
  for (const s of [-1, 1]) quad([s * La, giu, za], [s * Lb, giu, zb], [s * Lb, su, zb], [s * La, su, za], [s, 0, 0]);
  return geo();
}

// colori a caso ma sempre uguali (dal seme)
function casuale(seme) { let s = seme >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

/**
 * Costruisce lo stadio del tipo chiesto (`stadi` è STADI di src/config.js, `tipo` una delle sue chiavi): tutto sta in
 * un gruppo solo, che `togli` leva dalla scena quando la partita dopo si gioca in un altro stadio. `luce` è il
 * materiale dei fari: lo prende la striscia luminosa sul bordo del tetto, dove i fari sono nel tetto.
 */
export function creaSpalti(T, scene, { HL, HW, stadi, tipo, renderer = null, luce = null }) {
  const S = stadi, ST = S.tipi[tipo] || S.tipi[S.senza], radice = new T.Group(); radice.name = 'stadio'; scene.add(radice);
  const loader = new T.TextureLoader(), materiali = [], rand = casuale(20261118);
  // tribune scure, come uno stadio ripreso in TV di sera: il pubblico e il campo risaltano
  const riserva = cementoDiRiserva(T), cemento = new T.MeshStandardMaterial({ color: 0x8b8882, roughness: 0.95, metalness: 0, map: riserva });
  const scaleM = new T.MeshStandardMaterial({ color: 0xa39d90, roughness: 0.9, metalness: 0 });
  // se lo stadio viene tolto prima che le texture arrivino, si buttano
  let tolto = false;
  loader.load(RIS + 'concrete_albedo.webp', (t) => { if (tolto) { t.dispose(); return; } riserva.dispose(); t.wrapS = t.wrapT = T.RepeatWrapping; t.colorSpace = T.SRGBColorSpace; cemento.map = t; scaleM.map = t; cemento.needsUpdate = scaleM.needsUpdate = true; });
  loader.load(RIS + 'concrete_roughness.webp', (t) => { if (tolto) { t.dispose(); return; } t.wrapS = t.wrapT = T.RepeatWrapping; cemento.roughnessMap = t; cemento.needsUpdate = true; });
  materiali.push(cemento, scaleM);
  const ferro = new T.MeshStandardMaterial({ color: 0x9aa3b2, metalness: 0.7, roughness: 0.35 });
  const tettoM = new T.MeshStandardMaterial({ color: 0x2b3245, roughness: 0.6, metalness: 0.3, emissive: 0xc8d6ff, emissiveIntensity: 0 });
  const fascia = new T.MeshStandardMaterial({ color: 0x1d2540, roughness: 0.7, metalness: 0.2 }); // la fronte degli anelli alti
  const acciaio = new T.MeshStandardMaterial({ color: 0xb8c0cc, metalness: 0.75, roughness: 0.35 }); // travi del tetto, a vista
  const vetro = new T.MeshStandardMaterial({ color: 0x10182c, roughness: 0.15, metalness: 0.6, emissive: 0xffe9b8, emissiveIntensity: 0.25 }); // palchi
  // fascia LED tra un anello e l'altro e schermi: una tela a riquadri colorati che di notte resta accesa
  const ledM = (() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 16; const x = c.getContext('2d'), col = ['#4B06FC', '#D9F51F', '#ffffff', '#0b1030', '#19c2ff', '#0b1030'];
    for (let i = 0; i < 16; i++) { x.fillStyle = col[i % col.length]; x.fillRect(i * 16, 0, 16, 16); }
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.wrapS = T.RepeatWrapping; t.repeat.set(6, 1);
    return new T.MeshBasicMaterial({ map: t });
  })();
  // i quattro lati: dove sta il muretto e come è girata la tribuna. Lontano è di fronte alla telecamera di gioco (col
  // tunnel), vicino è alle sue spalle (la folla qui non si disegna quando la telecamera le sale sopra, vedi spalle),
  // destra è la curva degli ospiti (settore 1)
  const LATI = { lontano: [0, -(HW + S.dist[0]), 0], vicino: [0, HW + S.dist[0], Math.PI], destra: [HL + S.dist[1], 0, -Math.PI / 2], sinistra: [-(HL + S.dist[1]), 0, Math.PI / 2] };
  const smusso = !!ST.chiuso, muro = ST.muro || S.muro;
  const tribune = Object.keys(LATI).map((nome, k) => {
    const lato = (ST.lati && ST.lati[nome]) || {}, [x, z, ry] = LATI[nome];
    // chiuso: ogni lato va da un angolo dei muretti all'altro, e più indietro si allunga fino a incontrare i lati vicini
    const len = smusso ? 2 * (k < 2 ? HL + S.dist[1] : HW + S.dist[0]) : lato.lungo;
    return { nome, len, x, z, ry, anelli: lato.anelli || ST.anelli, tetto: lato.tetto || ST.tetto || null, tabellone: lato.tabellone || null, settore: nome === 'destra' ? 1 : 0, tunnel: nome === 'lontano' };
  });
  const posti = [], striscioni = [], bandiere = [], m4 = new T.Matrix4();
  for (const tr of tribune) {
    const g = new T.Group(); g.position.set(tr.x, 0, tr.z); g.rotation.y = tr.ry; g.updateMatrix(); radice.add(g); tr.g = g;
    // mezza lunghezza della tribuna a z metri dal muretto del primo anello (z negativo: indietro)
    const mezza = (z) => tr.len / 2 + (smusso ? -z : 0);
    const A0 = tr.anelli[0], ultimo = tr.anelli[tr.anelli.length - 1], fondo = -((ultimo.dietro || 0) + ultimo.file * ultimo.prof);
    // scale di accesso: ogni `scale` metri una fascia di gradini più chiari, senza posti
    const larga = mezza(fondo) * 2, nS = Math.floor(larga / S.scale), scaleX = [];
    for (let k = 1; k < nS; k++) scaleX.push(-larga / 2 + k * larga / nS);
    let filaPrima = 0;
    tr.anelli.forEach((A, a) => {
      const y0 = A.y || 0, z0 = -(A.dietro || 0), hm = a ? S.muro : muro;
      const gr = new T.Mesh(geometriaGradoni(T, tr.len, A, hm, smusso), cemento); gr.position.set(0, y0, z0); g.add(gr);
      // la fronte di un anello alto: scura, oppure una fascia LED continua
      if (a) { const fr = new T.Mesh(new T.BoxGeometry(mezza(z0) * 2, 2.4, 0.5), ST.led ? ledM : fascia); fr.position.set(0, y0 + 0.4, z0 + 0.3); g.add(fr); }
      // i gradini delle scale, dove la fila arriva fin lì
      const scaleDi = (r) => scaleX.filter((sx) => Math.abs(sx) < mezza(z0 - r * A.prof) - 1.5);
      let quanti = 0; for (let r = 0; r < A.file; r++) quanti += scaleDi(r).length * 2;
      if (quanti) {
        const sc = new T.InstancedMesh(new T.BoxGeometry(1.4, A.alt / 2, A.prof / 2), scaleM, quanti); let n = 0;
        for (let r = 0; r < A.file; r++) for (const sx of scaleDi(r)) for (const h of [0, 1]) { m4.makeTranslation(sx, y0 + hm + r * A.alt + A.alt * (h ? 0.5 : 0) + A.alt / 4, z0 - r * A.prof - A.prof * (h ? 0.75 : 0.25)); sc.setMatrixAt(n++, m4); }
        g.add(sc);
      }
      // posti a sedere (tranne scale e tunnel)
      for (let r = 0; r < A.file; r++) {
        const L = mezza(z0 - r * A.prof);
        for (let x = -L + 0.8; x < L - 0.8; x += A.posto || S.posto) {
          if (scaleX.some((sx) => Math.abs(x - sx) < 1.1) || (tr.tunnel && !a && r < 6 && Math.abs(x) < 3.4)) continue;
          posti.push({ p: new T.Vector3(x, y0 + hm + r * A.alt, z0 - r * A.prof - A.prof * 0.45).applyMatrix4(g.matrix), ry: tr.ry, settore: tr.settore, tr, fila: filaPrima + r, anello: a });
        }
      }
      filaPrima += A.file;
    });
    // tetto: dal fondo della tribuna fino al bordo, con le travi a sbalzo a vista. Nella conca chiusa è un anello
    // intero (le lastre si incontrano negli angoli) e il bordo verso il campo è una striscia di luci
    if (tr.tetto) {
      const Tt = tr.tetto, prof = Tt.sporge - fondo, semi = mezza(Tt.sporge);
      g.add(new T.Mesh(lastra(T, fondo, Tt.sporge, mezza(fondo), semi, Tt.y, Tt.spessore), tettoM));
      const nT = Math.max(2, Math.round(semi * 2 / Tt.trave));
      for (let k = 0; k <= nT; k++) {
        const x = -semi + k * 2 * semi / nT;
        const trave = new T.Mesh(new T.BoxGeometry(0.35, 1.2, prof), acciaio); trave.position.set(x, Tt.y - 0.85, fondo + prof / 2); g.add(trave);
        const pil = new T.Mesh(new T.BoxGeometry(0.6, Tt.y, 0.6), acciaio); pil.position.set(x, Tt.y / 2, fondo - 0.4); g.add(pil);
        if (smusso) continue;
        const tir = new T.Mesh(new T.BoxGeometry(0.15, 0.15, Math.hypot(prof * 0.7, 6)), acciaio); tir.position.set(x, Tt.y + 3, fondo + prof * 0.35); tir.rotation.x = Math.atan2(6, prof * 0.7); g.add(tir); // tirante
        const ant = new T.Mesh(new T.BoxGeometry(0.4, 6, 0.4), acciaio); ant.position.set(x, Tt.y + 3, fondo - 0.4); g.add(ant); // antenna del tirante
      }
      const bordo = new T.Mesh(new T.BoxGeometry(semi * 2, 1.4, 0.5), smusso && luce ? luce : acciaio); bordo.position.set(0, Tt.y - 0.5, Tt.sporge); g.add(bordo); // trave di bordo
    }
    // ringhiera sul muretto: montanti e due corrimano
    const nP = Math.floor(tr.len / 2.5), mont = new T.InstancedMesh(new T.CylinderGeometry(0.035, 0.035, 1, 6), ferro, nP + 1);
    for (let k = 0; k <= nP; k++) { m4.makeTranslation(-tr.len / 2 + k * tr.len / nP, muro + 0.5, 0.05); mont.setMatrixAt(k, m4); }
    g.add(mont);
    for (const hy of [0.55, 1]) { const c = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, tr.len, 6), ferro); c.rotation.z = Math.PI / 2; c.position.set(0, muro + hy, 0.05); g.add(c); }
    // tunnel d'ingresso al campo, sotto la tribuna principale
    if (tr.tunnel) {
      const bocca = new T.Mesh(new T.BoxGeometry(4.6, 2.9, 0.4), new T.MeshBasicMaterial({ color: 0x07080c })); bocca.position.set(0, 1.45, 0.05); g.add(bocca);
      for (const s of [-1, 1]) { const m = new T.Mesh(new T.BoxGeometry(0.4, 3.1, 3.2), cemento); m.position.set(s * 2.5, 1.55, 1.6); g.add(m); }
      const cop = new T.Mesh(new T.CylinderGeometry(2.7, 2.7, 3.2, 20, 1, true, -Math.PI / 2, Math.PI), new T.MeshStandardMaterial({ color: 0x4B06FC, roughness: 0.5, side: T.DoubleSide })); cop.rotation.x = Math.PI / 2; cop.position.set(0, 3.1, 1.6); cop.scale.set(1, 1, 0.45); g.add(cop); tr.copertura = cop;
    }
    // palchi: una fascia di vetrate tra il primo e il secondo anello, al centro dei lati lunghi
    if (ST.palchi && (tr.nome === 'lontano' || tr.nome === 'vicino')) { const P = ST.palchi, v = new T.Mesh(new T.BoxGeometry(P.lungo, P.alto, 0.6), vetro); v.position.set(0, P.y + P.alto / 2, -P.dietro); g.add(v); }
    // tabellone luminoso in cima alla tribuna, su due gambe
    if (tr.tabellone) {
      const B = tr.tabellone, cassa = new T.Mesh(new T.BoxGeometry(B.largo, B.alto, 0.8), fascia); cassa.position.set(0, B.y + B.alto / 2, fondo - 1.2); g.add(cassa);
      const schermo = new T.Mesh(new T.PlaneGeometry(B.largo - 1, B.alto - 1), ledM); schermo.position.set(0, B.y + B.alto / 2, fondo - 0.75); g.add(schermo);
      for (const s of [-1, 1]) { const gamba = new T.Mesh(new T.BoxGeometry(0.7, B.y, 0.7), acciaio); gamba.position.set(s * B.largo * 0.35, B.y / 2, fondo - 1.2); g.add(gamba); }
    }
    // striscioni sul muretto e bandiere sui gradoni
    for (let k = 0; k < 3; k++) {
      const c = document.createElement('canvas'); c.width = 512; c.height = 96; const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace;
      const alto = Math.min(1.3, muro - 0.2), s = new T.Mesh(new T.PlaneGeometry(alto * 5.4, alto), new T.MeshStandardMaterial({ map: tex, roughness: 0.85 })); s.position.set((k - 1) * tr.len * 0.28 + (tr.tunnel ? 9 : 0), muro - 0.1 - alto / 2, 0.04); g.add(s);
      striscioni.push({ c, tex, settore: tr.settore, k });
    }
    for (let k = 0; k < 2; k++) {
      const pg = new T.PlaneGeometry(2.2, 1.4, 10, 1), f = new T.Mesh(pg, new T.MeshStandardMaterial({ color: 0xffffff, side: T.DoubleSide, roughness: 0.9, vertexColors: true }));
      pg.setAttribute('color', new T.Float32BufferAttribute(new Float32Array(pg.attributes.position.count * 3).fill(1), 3));
      const asta = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 3.2, 6), ferro), r = Math.min(A0.file - 1, 6 + k * 7), x = (k ? 0.22 : -0.3) * tr.len;
      asta.position.set(x, muro + r * A0.alt + 1.6, -r * A0.prof); f.position.set(x + 1.1, muro + r * A0.alt + 2.5, -r * A0.prof); g.add(asta, f);
      bandiere.push({ f, pg, settore: tr.settore, fase: rand() * 6 });
    }
    unisci(T, g, [cemento, ferro, tettoM, fascia, acciaio]); // gradoni e muri, corrimano e aste, tetto, travi: una mesh per materiale
  }
  // maxischermi appesi sotto il tetto, nei due angoli di fronte alla telecamera di gioco, girati verso il centro del campo
  if (ST.schermi) for (const s of [-1, 1]) {
    const M = ST.schermi, sch = new T.Group(); sch.position.set(s * (HL + S.dist[1] + M.dietro), M.y, -(HW + S.dist[0] + M.dietro)); sch.lookAt(0, M.y * 0.7, 0); radice.add(sch);
    sch.add(new T.Mesh(new T.BoxGeometry(M.largo, M.alto, 1), fascia));
    const tela = new T.Mesh(new T.PlaneGeometry(M.largo - 1.2, M.alto - 1.2), ledM); tela.position.z = 0.55; sch.add(tela);
  }
  // dintorni di un campo di paese: alberi dietro le gradinate (mai dalla parte della telecamera di gioco, dove le
  // starebbero davanti) e qualche collina lontana
  if (ST.alberi) {
    const Al = ST.alberi, verde = new T.MeshLambertMaterial({ color: 0x2f5a2a }), legno = new T.MeshLambertMaterial({ color: 0x5a4330 });
    const chiome = new T.InstancedMesh(new T.ConeGeometry(1, 1, 7), verde, Al.quanti), tronchi = new T.InstancedMesh(new T.CylinderGeometry(0.6, 0.8, 1, 6), legno, Al.quanti);
    const q = new T.Quaternion(), sc = new T.Vector3(), p = new T.Vector3(), lontana = tribune[0], dietroLontana = S.dist[0] + lontana.anelli[0].file * lontana.anelli[0].prof + 5;
    for (let i = 0; i < Al.quanti; i++) {
      let x = 0, z = 0;
      for (let prova = 0; prova < 40; prova++) {
        x = (rand() * 2 - 1) * (HL + 60); z = -(HW + 70) + rand() * (2 * HW + 140);
        const aiLati = Math.abs(x) > HL + S.dist[1] + 9, oltre = z < -(HW + (Math.abs(x) < lontana.len / 2 + 4 ? dietroLontana : 11)), spalle = z > HW + 30;
        if (aiLati || oltre || spalle) break;
      }
      const h = Al.alti[0] + rand() * (Al.alti[1] - Al.alti[0]);
      p.set(x, h * 0.6, z); sc.set(h * 0.32, h * 0.8, h * 0.32); m4.compose(p, q, sc); chiome.setMatrixAt(i, m4);
      p.set(x, h * 0.15, z); sc.set(h * 0.05, h * 0.3, h * 0.05); m4.compose(p, q, sc); tronchi.setMatrixAt(i, m4);
    }
    radice.add(chiome, tronchi);
    const colle = new T.MeshLambertMaterial({ color: 0x4f7a45 });
    for (let i = 0; i < Al.colline; i++) { const c = new T.Mesh(new T.SphereGeometry(1, 20, 10), colle), r = 90 + rand() * 60, a = Math.PI * (0.15 + 0.7 * (i + rand() * 0.6) / Al.colline); c.scale.set(r, r * 0.25, r * 0.8); c.position.set(Math.cos(a) * 230, -4, -Math.sin(a) * 230); radice.add(c); }
  }
  // ---------------------------------------------------------------- la folla
  // Una folla per tribuna (una InstancedMesh), ognuna con la sua sfera d'ingombro: quella alle
  // spalle della telecamera non si disegna affatto. I posti sono in ordine sparso, così i primi n sono sparsi su tutto lo spalto.
  const totale = Math.min(ST.folla || posti.length, posti.length);
  // Il tifoso è una persona vera: il modello dei calciatori messo in piedi e semplificato (scripts/tifoso.mjs, circa 170
  // vertici). In 3D nelle prime due file, dietro è una sagoma (vedi sagome più sotto), cioè la stessa persona fotografata in
  // tre pose e colorata coi suoi colori, due triangoli. Ogni vertice del 3D sa che cos'è: 0 maglia, 1 pelle, 2 braccio,
  // 3 avambraccio, 4 capelli o berretto, 5 visiera, 6 sciarpa, 7 pantaloni, 8 scarpe. Visiera e sciarpa sono due pannelli.
  const H = 1.72, FILE_VICINE = S.vicine, SP = TIFOSO.spalla.map((v) => v * H), GOM = TIFOSO.gomito[1] * H;
  const MANI_SU = SP[1] + Math.hypot(...TIFOSO.mano.map((v, i) => (v - TIFOSO.spalla[i]) * H)); // dove arrivano le mani con le braccia alzate
  const tifoso = () => {
    const L = TIFOSO.lod[0], pos = L.p.map((v) => v / 1000 * H), parte = L.c.slice(), idx = L.i.slice();
    // pannelli piatti di due triangoli: quadro(larghezza, altezza, centro, orizzontale o verticale verso il campo)
    const quadro = (w, h, cx, cy, cz, pt, piano) => { const o = pos.length / 3; for (const [a, c] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { pos.push(cx + a * w / 2, piano ? cy : cy + c * h / 2, piano ? cz - c * h / 2 : cz); parte.push(pt); } idx.push(o, o + 1, o + 2, o, o + 2, o + 3); };
    const t = TIFOSO.testa, tw = (t.max[0] - t.min[0]) * H, th = (t.max[1] - t.min[1]) * H;
    quadro(tw * 0.85, 0.11, 0, t.min[1] * H + th * 0.3, t.max[2] * H + 0.04, 5, true); // visiera (solo chi ha il berretto)
    quadro(0.8, 0.13, 0, MANI_SU + 0.02, 0.07, 6, false); // sciarpa tesa sopra la testa (solo durante i cori)
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('aParte', new T.Float32BufferAttribute(parte, 1)); g.setIndex(idx); g.computeVertexNormals(); return g;
  };
  const DETT = tifoso();
  // il movimento delle braccia (spalla e gomito veri del modello), uguale nel 3D e nelle foto delle sagome
  const BRACCIA = `if (aParte > 1.5 && aParte < 3.5) {
    vec3 q = transformed;
    if (aParte > 2.5) { q.y -= ${GOM.toFixed(3)}; q = vec3(q.x, q.y * cos(a2) - q.z * sin(a2), q.y * sin(a2) + q.z * cos(a2)); q.y += ${GOM.toFixed(3)}; } // gomito
    q.y -= ${SP[1].toFixed(3)}; transformed = vec3(q.x, q.y * cos(a1) - q.z * sin(a1) + ${SP[1].toFixed(3)}, q.y * sin(a1) + q.z * cos(a1)); // spalla
  }`;
  const U = { uT: { value: 0 }, uEsulta: { value: new T.Vector2() }, uCoro: { value: new T.Vector2() }, uMossa: { value: 0.5 } };
  const MAT = (() => {
    const m = new T.MeshLambertMaterial({ color: 0xffffff });
    m.customProgramCacheKey = () => 'folla';
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      // colori netti tra maglia, pantaloni e pelle: un colore per triangolo (flat), niente sfumature sui triangoli grandi
      sh.fragmentShader = sh.fragmentShader.replace('#include <color_pars_fragment>', 'flat varying vec4 vColor;');
      sh.vertexShader = sh.vertexShader.replace('#include <color_pars_vertex>', 'flat varying vec4 vColor;').replace('#include <common>', '#include <common>\nattribute float aParte; attribute vec4 aInfo; attribute vec3 aPelle, aCapo, aSciarpa; uniform float uT, uMossa; uniform vec2 uEsulta, uCoro;')
        .replace('#include <color_vertex>', `#include <color_vertex>
// aInfo: x fase, y settore, z maniche lunghe, w = sciarpa + 2 * berretto
float manica = aInfo.z, berretto = step(1.5, aInfo.w);
float hp = fract(aInfo.x * 13.7), hs = fract(aInfo.x * 29.3);
if (aParte < 0.5) vColor.xyz = instanceColor.xyz;
else if (aParte < 1.5) vColor.xyz = aPelle;
else if (aParte < 2.5) vColor.xyz = instanceColor.xyz; // la manica
else if (aParte < 3.5) vColor.xyz = mix(aPelle, instanceColor.xyz, manica);
else if (aParte < 4.5) vColor.xyz = aCapo;
else if (aParte < 5.5) vColor.xyz = aCapo * 0.75;
else if (aParte < 6.5) vColor.xyz = mod(floor((position.x + 0.4) / 0.13), 2.0) < 0.5 ? instanceColor.xyz : aSciarpa; // sciarpa a strisce coi due colori
else if (aParte < 7.5) vColor.xyz = hp < 0.45 ? vec3(0.04, 0.07, 0.16) : hp < 0.8 ? vec3(0.02, 0.02, 0.025) : vec3(0.18, 0.18, 0.2); // jeans, neri o grigi
else vColor.xyz = hs < 0.6 ? vec3(0.02) : vec3(0.7);`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>
{
  float f = aInfo.x * 6.2831, settore = aInfo.y, e = settore < 0.5 ? uEsulta.x : uEsulta.y, varia = 0.7 + 0.6 * fract(aInfo.x * 7.31);
  float sciarpa = mod(aInfo.w, 2.0), c = (settore < 0.5 ? uCoro.x : uCoro.y) * sciarpa, lato = sign(position.x);
  // braccia: ognuna con la sua fase (agitano asincrone) e il gomito che si piega, nei cori su dritte a tenere la sciarpa
  float a1 = mix(-e * (2.35 + 0.45 * sin(uT * 7.0 + f + lato * 1.7)) * varia, -3.0, c);
  float a2 = mix(-e * (0.3 + 0.35 * sin(uT * 5.0 + f * 1.3 + lato)) * varia, 0.0, c);
  ${BRACCIA}
  if (aParte > 4.5 && aParte < 5.5 && berretto < 0.5) transformed = vec3(0.0, ${(TIFOSO.testa.min[1] * H).toFixed(3)}, 0.0); // niente berretto: niente visiera
  if (aParte > 5.5 && aParte < 6.5) { if (c < 0.02) transformed = vec3(0.0, ${(SP[1] - 0.1).toFixed(3)}, 0.0); else { transformed.x *= c; transformed.x += sin(uT * 3.2 + f) * 0.06 * c; } } // la sciarpa si apre col coro
  transformed.y += e * max(0.0, sin(uT * 9.0 + f)) * 0.34 * varia + sin(uT * 1.7 + f) * 0.015 * uMossa + c * max(0.0, sin(uT * 4.4 + f * 0.2)) * 0.06; // salta quando esulta, nei cori a tempo
  transformed.x += sin(uT * 1.3 + f * 1.7) * 0.035 * uMossa; // ondeggia
}`);
    };
    materiali.push(m); return m;
  })();
  /*
   * Le sagome per le file lontane. All'avvio si fotografa il tifoso 3D in tre pose (fermo, braccia al cielo, sciarpa tesa)
   * in una texture piccola che non porta colori ma tre maschere già illuminate: R maglia (e sciarpa), G pelle, B il resto
   * scuro (capelli, pantaloni, scarpe). Ogni sagoma è un rettangolo girato verso il campo che prende la posa giusta e si
   * colora coi colori suoi (maglia, pelle, pantaloni): da lontano non si distingue dal 3D e costa due triangoli.
   */
  const CELLA = { w: 0.95, h: MANI_SU + 0.3, px: [96, 192] };
  let quadroSagome = null;
  const sagome = (() => {
    if (!renderer) return null;
    const rt = quadroSagome = new T.WebGLRenderTarget(CELLA.px[0] * 3, CELLA.px[1], { generateMipmaps: true, minFilter: T.LinearMipmapLinearFilter, magFilter: T.LinearFilter });
    const sc2 = new T.Scene(), cam = new T.OrthographicCamera(0, CELLA.w * 3, CELLA.h - 0.05, -0.05, -5, 5);
    [[0, 0, 0], [-2.5, -0.45, 0], [-3, 0, 1]].forEach(([a1, a2, sciarpa], k) => {
      const m = new T.ShaderMaterial({ uniforms: { a1: { value: a1 }, a2: { value: a2 }, sciarpa: { value: sciarpa } },
        vertexShader: `attribute float aParte; uniform float a1, a2, sciarpa; flat varying vec3 vMasc; varying float vLuce;
void main() { vec3 transformed = position; ${BRACCIA}
  if (aParte > 4.5 && aParte < 5.5) transformed = vec3(0.0, -9.0, 0.0); // la visiera no: nelle sagome nessuno ha il berretto
  if (aParte > 5.5 && aParte < 6.5 && sciarpa < 0.5) transformed = vec3(0.0, -9.0, 0.0);
  vMasc = (aParte < 0.5 || (aParte > 1.5 && aParte < 2.5) || (aParte > 5.5 && aParte < 6.5)) ? vec3(1.0, 0.0, 0.0) : (aParte < 1.5 || aParte < 3.5) ? vec3(0.0, 1.0, 0.0) : vec3(0.0, 0.0, 1.0);
  vLuce = 0.5 + 0.55 * max(dot(normalize(normal), normalize(vec3(0.35, 0.8, 0.6))), 0.0);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0); }`,
        fragmentShader: 'flat varying vec3 vMasc; varying float vLuce; void main() { gl_FragColor = vec4(vMasc * min(vLuce, 1.0), 1.0); }' });
      const mesh = new T.Mesh(DETT, m); mesh.position.x = CELLA.w * (k + 0.5); sc2.add(mesh);
    });
    const prima = renderer.getRenderTarget(), colore = renderer.getClearColor(new T.Color()), alfa = renderer.getClearAlpha();
    renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(sc2, cam);
    renderer.setRenderTarget(prima); renderer.setClearColor(colore, alfa);
    return rt.texture;
  })();
  const MATS = sagome && (() => {
    const m = new T.MeshBasicMaterial({ map: sagome, color: 0xffffff, alphaTest: 0.45 });
    m.customProgramCacheKey = () => 'sagome';
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 aInfo; attribute vec3 aPelle; uniform float uT, uMossa; uniform vec2 uEsulta, uCoro; flat varying vec3 vMaglia, vPelle, vScuro;')
        .replace('#include <uv_vertex>', `#include <uv_vertex>
float f = aInfo.x * 6.2831, settore = aInfo.y, e = settore < 0.5 ? uEsulta.x : uEsulta.y, varia = 0.7 + 0.6 * fract(aInfo.x * 7.31);
float c = (settore < 0.5 ? uCoro.x : uCoro.y) * mod(aInfo.w, 2.0);
float posa = c > 0.4 ? 2.0 : (e > 0.3 && sin(uT * 6.0 + f) > -0.3 ? 1.0 : 0.0); // ferma, braccia al cielo (a scatti, come chi le agita) o sciarpa
vMapUv = vec2((uv.x + posa) / 3.0, uv.y);
float hp = fract(aInfo.x * 13.7); vMaglia = instanceColor.xyz; vPelle = aPelle; vScuro = hp < 0.45 ? vec3(0.04, 0.07, 0.16) : hp < 0.8 ? vec3(0.02, 0.02, 0.025) : vec3(0.18, 0.18, 0.2);`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>
transformed.y += e * max(0.0, sin(uT * 9.0 + f)) * 0.34 * varia + sin(uT * 1.7 + f) * 0.015 * uMossa + c * max(0.0, sin(uT * 4.4 + f * 0.2)) * 0.06;
transformed.x += sin(uT * 1.3 + f * 1.7) * 0.035 * uMossa;`);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nflat varying vec3 vMaglia, vPelle, vScuro;')
        .replace('#include <map_fragment>', `vec4 masc = texture2D(map, vMapUv);
diffuseColor = vec4((vMaglia * masc.r + vPelle * masc.g + vScuro * masc.b) / max(masc.a, 0.001) * diffuse, masc.a); // le maschere già illuminate, coi colori del tifoso`)
        .replace('#include <color_fragment>', '');
    };
    materiali.push(m); return m;
  })();
  const QUAD = (() => { const g = new T.PlaneGeometry(CELLA.w, CELLA.h); g.translate(0, CELLA.h / 2 - 0.05, 0); return g; })();

  const q = new T.Quaternion(), sc = new T.Vector3(), asse = new T.Vector3(0, 1, 0), pelle = [0xf1c9a5, 0xe0ac7e, 0xc68642, 0x8d5524, 0x5c3a1e, 0xf6d7bd].map((c) => new T.Color(c));
  const folle = []; let N = 0, dove = radice;
  const gruppo = (suoi, geo, mat, visibile) => { // una InstancedMesh per un gruppo di posti, con i suoi attributi
    const n = suoi.length; if (!n) return null;
    const info = new Float32Array(n * 4), cute = new Float32Array(n * 3), capo = new Float32Array(n * 3), sciarpa = new Float32Array(n * 3), m = new T.InstancedMesh(geo.clone(), mat, n);
    for (let i = 0; i < n; i++) {
      const s = suoi[i], k = 0.9 + rand() * 0.2; q.setFromAxisAngle(asse, s.ry + (rand() - 0.5) * (mat === MATS ? 0.2 : 0.5)); sc.set(k, k, k); m4.compose(s.p, q, sc);
      m.setMatrixAt(i, m4); m.setColorAt(i, pelle[0]); pelle[Math.floor(rand() * pelle.length)].toArray(cute, i * 3);
      info[i * 4] = rand(); info[i * 4 + 1] = s.settore;
    }
    // l'ingombro deve tenere conto dei salti, delle braccia e delle sciarpe alzate (lo shader sposta i vertici)
    m.computeBoundingSphere(); m.boundingSphere.radius += 2;
    const A = { aInfo: new T.InstancedBufferAttribute(info, 4), aPelle: new T.InstancedBufferAttribute(cute, 3), aCapo: new T.InstancedBufferAttribute(capo, 3), aSciarpa: new T.InstancedBufferAttribute(sciarpa, 3) };
    for (const k in A) m.geometry.setAttribute(k, A[k]);
    m.visible = visibile; dove.add(m); const f = { m, info, A, n, capo, sciarpa }; folle.push(f); return f;
  };
  for (const tr of tribune) {
    // la folla di ogni tribuna sta in un gruppo suo: quella sotto la telecamera si può togliere tutta insieme (vedi spalle)
    tr.folla = new T.Group(); radice.add(tr.folla); dove = tr.folla;
    const tutti = posti.filter((s) => s.tr === tr);
    for (let i = tutti.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [tutti[i], tutti[j]] = [tutti[j], tutti[i]]; }
    const presi = tutti.slice(0, Math.min(tutti.length, Math.round(totale * tutti.length / posti.length)));
    const vicini = presi.filter((s) => s.fila < FILE_VICINE), lontani = presi.filter((s) => s.fila >= FILE_VICINE);
    const v3d = gruppo(vicini, DETT, MAT, true);
    // le sagome lontane sono una mesh per anello: un anello intero fuori dall'inquadratura non si disegna
    if (MATS) { tr.sagomeVicine = gruppo(vicini, QUAD, MATS, false); tr.anelli.forEach((_, k) => gruppo(lontani.filter((s) => s.anello === k), QUAD, MATS, true)); } else gruppo(lontani, DETT, MAT, true);
    tr.folla3d = v3d; N += presi.length;
  }

  // colori: maglie della squadra di casa negli spalti di casa, degli ospiti nella curva ospiti (più un po' di neutri)
  let squadre = null;
  function colora(casa, ospiti) {
    squadre = [casa, ospiti]; const r = casuale(hashStr((casa.name || '') + (ospiti.name || ''))), col = new T.Color(), grigio = new T.Color();
    // Il pubblico di uno stadio vero: metà coi colori della squadra (smorzati: nessuno ha la maglia accesa come in campo),
    // l'altra metà vestita come capita, con giacche e felpe di tutti i giorni
    const comuni = [0x23283a, 0x2f3338, 0x4a4f58, 0x6b6f76, 0x9a9c9f, 0xd6d3cc, 0x2d3b55, 0x3e5a78, 0x5a4a3c, 0x7a6a55, 0x4c5a40, 0x6e2f35, 0x8a5a2f, 0x1c1c20, 0xb8a98f, 0x55606e].map((c) => new T.Color(c));
    const smorza = (c, quanto, luce) => { const l = c.r * 0.3 + c.g * 0.59 + c.b * 0.11; grigio.setRGB(l, l, l); c.lerp(grigio, quanto).multiplyScalar(luce); };
    const capelli = [0x1c1410, 0x2e2018, 0x5a3a20, 0x8a6a3a, 0x111111, 0xc9a25a, 0x9c9a96].map((c) => new T.Color(c)), c2 = new T.Color();
    for (const { m, info, A, n, capo, sciarpa } of folle) {
      for (let i = 0; i < n; i++) {
        const mia = info[i * 4 + 1] > 0.5 ? 1 : 0, u = r(), altra = u >= 0.42 && u < 0.5, sq = squadre[altra ? 1 - mia : mia], tifa = u < 0.5;
        if (tifa) { col.set(u < 0.27 ? sq.c1 : u < 0.42 ? sq.c2 : r() < 0.6 ? sq.c1 : sq.c2); smorza(col, 0.3 + r() * 0.2, 0.72 + r() * 0.2); }
        else { col.copy(comuni[Math.floor(r() * comuni.length)]).multiplyScalar(0.8 + r() * 0.3); }
        m.setColorAt(i, col); info[i * 4 + 2] = r() < 0.3 ? 1 : 0; // maniche lunghe o braccia scoperte
        const conSciarpa = tifa && r() < 0.45, berretto = r() < 0.18; info[i * 4 + 3] = (conSciarpa ? 1 : 0) + (berretto ? 2 : 0);
        if (berretto) { c2.set(tifa && r() < 0.6 ? sq.c1 : tifa ? sq.c2 : 0x2a2c33); smorza(c2, 0.3, 0.85); } else c2.copy(capelli[Math.floor(r() * capelli.length)]);
        c2.toArray(capo, i * 3);
        c2.set(u < 0.3 ? sq.c2 : sq.c1); smorza(c2, 0.2, 0.9); c2.toArray(sciarpa, i * 3); // la sciarpa ha l'altro colore della squadra, a strisce con quello della maglia
      }
      m.instanceColor.needsUpdate = A.aInfo.needsUpdate = A.aCapo.needsUpdate = A.aSciarpa.needsUpdate = true;
    }
    for (const s of striscioni) disegnaStriscione(s, squadre[s.settore]);
    for (const b of bandiere) { const sq = squadre[b.settore], a = new T.Color(sq.c1), c2 = new T.Color(sq.c2), col3 = b.pg.attributes.color; for (let i = 0; i < col3.count; i++) { const x = b.pg.attributes.position.getX(i), c = Math.floor((x + 1.1) / 0.44) % 2 ? a : c2; col3.setXYZ(i, c.r, c.g, c.b); } col3.needsUpdate = true; }
    if (tribune[0].copertura) tribune[0].copertura.material.color.set(casa.c1);
  }
  function disegnaStriscione(s, sq) {
    const x = s.c.getContext('2d'), testo = [`FORZA ${sq.short || sq.name}`, (sq.name || '').toUpperCase(), 'SEMPRE CON VOI'][s.k];
    x.fillStyle = sq.c1; x.fillRect(0, 0, 512, 96); x.fillStyle = sq.c2; x.fillRect(0, 0, 512, 14); x.fillRect(0, 82, 512, 14);
    x.fillStyle = sq.c2; x.textAlign = 'center'; x.textBaseline = 'middle'; let fs = 54; do { x.font = `${fs}px Anton, Impact, sans-serif`; fs -= 2; } while (x.measureText(testo).width > 470 && fs > 20);
    x.fillText(testo, 256, 50); s.tex.needsUpdate = true;
  }
  // ---------------------------------------------------------------- esultanza e animazione
  const es = [0, 0], fino = [0, 0], coro = [0, 0], cantaFino = [0, 0]; let prossimoCoro = 12 + rand() * 15;
  /** I cori: il settore alza le sciarpe tese sopra la testa e salta a tempo per `durata` secondi. */
  function canta(settore, durata = 9) { cantaFino[settore] = Math.max(cantaFino[settore], durata); }
  function esulta(settore, forza = 1, durata = 5) { es[settore] = Math.max(es[settore], forza); fino[settore] = Math.max(fino[settore], durata); if (forza >= 1) canta(settore, durata + 4); }
  function densita(d) { const k = Math.max(0.1, Math.min(1, d)); for (const f of folle) f.m.count = Math.round(f.n * k); }
  /** Dettagli della folla sì o no (lo scaler della qualità li toglie per primi): anche le prime file diventano sagome. */
  function dettaglio(on) { for (const tr of tribune) if (tr.folla3d && tr.sagomeVicine) { tr.folla3d.m.visible = on; tr.sagomeVicine.m.visible = !on; } }
  /** La tribuna sotto la telecamera di gioco (gradoni, ringhiere e folla) si vede o no. Quando la telecamera le sale sopra
   *  per seguire il pallone sulla linea laterale vicina, le prime file spuntano in basso e coprono gioco e comandi. */
  function spalle(nascosta) { const tr = tribune[1]; if (tr.g.visible === nascosta) tr.g.visible = tr.folla.visible = !nascosta; }
  function muovi(dt, t) {
    U.uT.value = t;
    for (let k = 0; k < 2; k++) { fino[k] -= dt; if (fino[k] <= 0) es[k] = Math.max(0, es[k] - dt * 1.5); }
    // ogni tanto un coro spontaneo, più spesso dalla parte dei tifosi di casa
    prossimoCoro -= dt; if (prossimoCoro <= 0) { canta(Math.random() < 0.7 ? 0 : 1, 7 + Math.random() * 5); prossimoCoro = 25 + Math.random() * 25; }
    for (let k = 0; k < 2; k++) { cantaFino[k] -= dt; coro[k] += ((cantaFino[k] > 0 ? 1 : 0) - coro[k]) * Math.min(1, dt * 2.2); }
    U.uEsulta.value.set(es[0], es[1]); U.uCoro.value.set(coro[0], coro[1]); U.uMossa.value = 0.5 + Math.max(es[0], es[1]);
    for (const b of bandiere) { b.fase += dt * (2 + es[b.settore] * 4); const p = b.pg.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, Math.sin(b.fase + x * 2.2) * 0.16 * (x + 1.1) / 2.2); } p.needsUpdate = true; }
  }
  /** Di notte, dove lo dice il tipo di stadio, il tetto è illuminato da sotto. */
  function illumina(notte) { tettoM.emissiveIntensity = notte && ST.luce ? ST.luce.tetto || 0 : 0; }
  /** Toglie tutto lo stadio dalla scena e libera la memoria della scheda grafica: la partita dopo è in un altro stadio. */
  function togli() {
    tolto = true; scene.remove(radice);
    radice.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      for (const m of o.material ? [].concat(o.material) : []) { if (m === luce) continue; if (m.map && m.map !== sagome) m.map.dispose(); if (m.roughnessMap) m.roughnessMap.dispose(); m.dispose(); }
      if (o.isInstancedMesh) o.dispose();
    });
    DETT.dispose(); QUAD.dispose(); riserva.dispose(); ledM.map.dispose(); if (quadroSagome) quadroSagome.dispose();
  }
  return { colora, esulta, canta, densita, dettaglio, spalle, muovi, illumina, togli, materiali, tipo, get squadre() { return squadre; }, N, posti: posti.length };
}
function hashStr(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
