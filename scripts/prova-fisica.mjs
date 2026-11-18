// Prove della fisica del pallone e della conduzione (src/fisica/pallone.js): node scripts/prova-fisica.mjs
import assert from 'node:assert/strict';
import { CORPO, FATICA, spingi, ruota, stanca, forma, cammina, cadenza } from '../src/fisica/corpo.js';
import { FIS, passo, copia, percorso, atterraggio, attraversa, mira, rasoterra, rotolaFino, gittata, conduci, COND } from '../src/fisica/pallone.js';

const R = FIS.r, hyp = Math.hypot, palla = (o = {}) => ({ x: 0, y: R, z: 0, vx: 0, vy: 0, vz: 0, c: 0, t: 0, ...o });
const corri = (b, T, dt) => { for (let t = 0; t < T - 1e-9; t += dt) passo(b, Math.min(dt, T - t)); return b; };
const out = [];

// 1. Indipendente dal frame rate: lo stesso tiro con effetto a 30, 60 e 144 fotogrammi finisce nello stesso punto
{
  const via = palla({ vx: 26, vy: 6, vz: 2, c: .8, t: .3 }), fine = [1 / 30, 1 / 60, 1 / 144, 1 / 50].map((dt) => corri(copia(via), 2.2, dt));
  for (const f of fine) assert.ok(hyp(f.x - fine[0].x, f.y - fine[0].y, f.z - fine[0].z) < .08, `frame rate: ${JSON.stringify(f)} vs ${JSON.stringify(fine[0])}`);
  out.push(`frame rate: stesso punto a 30/50/60/144 fps (scarto ${hyp(fine[2].x - fine[0].x, fine[2].z - fine[0].z).toFixed(4)} m)`);
}
// 2. Rasoterra: frena piano piano e si ferma; più forte va più lontano
{
  const g10 = gittata(10), g20 = gittata(20);
  assert.ok(g10 > 8 && g10 < 25, `gittata 10 m/s: ${g10}`); assert.ok(g20 > g10 * 1.3, 'più forte, più lontano');
  const b = palla({ vx: 12 }); let prima = 12;
  for (let i = 0; i < 300; i++) { passo(b, 1 / 60); assert.ok(b.vx <= prima + 1e-9); prima = b.vx; }
  assert.equal(b.vx, 0); assert.equal(b.y, R);
  out.push(`rotola: a 10 m/s fa ${g10.toFixed(1)} m, a 20 m/s ${g20.toFixed(1)} m, poi si ferma`);
}
// 3. Rimbalzi smorzati: ogni rimbalzo più basso, poi rotola
{
  const b = palla({ y: 6, vx: 4 }); const picchi = []; let su = false, max = 0;
  for (let i = 0; i < 600; i++) { passo(b, 1 / 60); if (b.vy > 0) { su = true; max = Math.max(max, b.y); } else if (su) { picchi.push(max); su = false; max = 0; } }
  assert.ok(picchi.length >= 2, 'rimbalza'); for (let i = 1; i < picchi.length; i++) assert.ok(picchi[i] < picchi[i - 1]);
  assert.equal(b.y, R); assert.equal(b.vy, 0);
  out.push(`rimbalzi: ${picchi.map((h) => h.toFixed(2)).join(' → ')} m, poi rotola`);
}
// 4. Effetto: la curva sposta il tiro di lato, senza effetto va dritto; la rotazione in avanti lo fa scendere prima
{
  const dritto = corri(palla({ y: 1, vx: 28, vy: 3 }), .9, 1 / 60), curvo = corri(palla({ y: 1, vx: 28, vy: 3, c: 1 }), .9, 1 / 60), giu = corri(palla({ y: 2, vx: 28, vy: 5, t: 1 }), .6, 1 / 60), dritto2 = corri(palla({ y: 2, vx: 28, vy: 5 }), .6, 1 / 60);
  assert.ok(Math.abs(dritto.z) < 1e-9); assert.ok(curvo.z > 1, `curva: ${curvo.z}`); assert.ok(giu.y < dritto2.y - .3, 'rotazione in avanti');
  out.push(`effetto: a 28 m/s in 0,9 s la curva sposta ${curvo.z.toFixed(2)} m, la rotazione in avanti abbassa di ${(dritto2.y - giu.y).toFixed(2)} m`);
}
// 5. Mira: arriva sul bersaglio anche con aria ed effetto (la palla parte storta e rientra)
{
  for (const [a, T, c, t] of [[{ x: 25, y: 1.5, z: 3 }, 1, .8, .2], [{ x: 30, y: 1.95, z: -12 }, 1.3, -.6, 0], [{ x: 18, y: 2.4, z: 0 }, .7, 0, .5], [{ x: 40, y: .5, z: 5 }, 1.8, 0, -.3]]) {
    const da = { x: 0, y: R, z: 0 }, v = mira(da, a, T, c, t), b = corri(palla({ ...v, c, t }), T, 1 / 60);
    assert.ok(hyp(b.x - a.x, b.y - a.y, b.z - a.z) < .12, `mira ${JSON.stringify(a)}: ${b.x.toFixed(2)},${b.y.toFixed(2)},${b.z.toFixed(2)}`);
    if (c) { const meta = corri(palla({ ...v, c, t }), T / 2, 1 / 60), lineaZ = a.z * meta.x / a.x; assert.ok(Math.abs(meta.z - lineaZ) > .15, 'con la curva a metà strada è fuori dalla linea dritta'); }
  }
  out.push('mira: quattro tiri (con curva, rotazione e pallonetto) arrivano sul bersaglio entro 12 cm');
}
// 6. Rasoterra dosato: arriva alla distanza giusta con la velocità chiesta
{
  for (const [d, va] of [[8, 6], [20, 9], [35, 11]]) { const v0 = rasoterra(d, va), r = rotolaFino(v0, d); assert.ok(Math.abs(r.v - va) < .15, `rasoterra ${d}: ${r.v}`); }
  out.push(`rasoterra: per 20 m arrivando a 9 m/s parte a ${rasoterra(20, 9).toFixed(1)} m/s`);
}
// 7. Previsioni: dove scende un traversone e dove passa un tiro sulla linea di porta
{
  const v = mira({ x: 0, y: R, z: 0 }, { x: 20, y: 1.95, z: 8 }, 1.1, .5, 0), b = palla({ ...v, c: .5 }), l = atterraggio(b, 1.95);
  assert.ok(l && hyp(l.x - 20, l.z - 8) < .3 && Math.abs(l.t - 1.1) < .05, `atterraggio ${JSON.stringify(l)}`);
  const s = palla({ x: 30, ...mira({ x: 30, y: R, z: 0 }, { x: 50, y: 1.2, z: -3 }, .8, -.7, 0), c: -.7 }), a = attraversa(s, 50);
  assert.ok(a && Math.abs(a.z + 3) < .15 && Math.abs(a.y - 1.2) < .15 && Math.abs(a.t - .8) < .03, `attraversa ${JSON.stringify(a)}`);
  const p = percorso(palla({ vx: 10 }), 3); assert.ok(p.length > 10 && p[p.length - 1].x > 8);
  out.push(`previsioni: traversone a terra in ${l.t.toFixed(2)} s, tiro sulla linea a z ${a.z.toFixed(2)} alto ${a.y.toFixed(2)}`);
}
// 8. Conduzione: la palla va avanti a tocchi, non resta incollata, non scappa; in scatto i tocchi sono più lunghi
function corsa(sprint, giro = false, q = .6) {
  const b = palla({ x: .6 }), p = { x: 0, z: 0, vx: 0, vz: 0, dir: Math.PI / 2, sprint }; let tocchi = 0, max = 0, min = 9, perso = false, k = 0;
  const caso = () => ((k = (k * 9301 + 49297) % 233280) / 233280);
  const vMax = sprint ? 8.6 : 7;
  for (let t = 0; t < 6; t += 1 / 60) {
    let ang = giro && t > 3 ? 0 : Math.PI / 2; const vb = Math.atan2(b.x - p.x, b.z - p.z); // come in partita: se la palla non è sulla strada, prima ci va
    if (Math.abs(Math.atan2(Math.sin(vb - ang), Math.cos(vb - ang))) > .5 && hyp(b.x - p.x, b.z - p.z) > .6) ang = vb;
    const vx = Math.sin(ang) * vMax, vz = Math.cos(ang) * vMax, a = 1 - Math.exp(-6 / 60);
    p.vx += (vx - p.vx) * a; p.vz += (vz - p.vz) * a; p.x += p.vx / 60; p.z += p.vz / 60; if (hyp(p.vx, p.vz) > .5) p.dir = Math.atan2(p.vx, p.vz);
    const r = conduci(b, p, 1 / 60, q, caso); if (r === 'tocco') tocchi++; if (r === 'perso') { perso = true; break; }
    passo(b, 1 / 60); if (t > 1) { const d = hyp(b.x - p.x, b.z - p.z); max = Math.max(max, d); min = Math.min(min, d); }
  }
  return { tocchi, max, min, perso };
}
{
  const n = corsa(false), s = corsa(true), g = corsa(false, true);
  assert.ok(!n.perso && !s.perso && !g.perso, 'non la perde da solo ' + JSON.stringify([n, s, g]));
  assert.ok(n.tocchi >= 5 && n.tocchi <= 20, `tocchi ${n.tocchi}`); assert.ok(n.max > .9 && n.max < COND.perde, `lontana ${n.max}`);
  assert.ok(s.max > n.max, 'in scatto la palla va più lontano');
  out.push(`conduzione: in 6 s ${n.tocchi} tocchi, palla tra ${n.min.toFixed(2)} e ${n.max.toFixed(2)} m; in scatto fino a ${s.max.toFixed(2)} m; girata a 90° senza perderla`);
}
// 9. Da fermo la palla resta sotto la suola
{
  const b = palla({ x: 1.2, z: .3 }), p = { x: 0, z: 0, vx: 0, vz: 0, dir: Math.PI / 2 };
  for (let i = 0; i < 120; i++) { conduci(b, p, 1 / 60); passo(b, 1 / 60); }
  assert.ok(hyp(b.x - COND.suola, b.z) < .1, `suola ${b.x},${b.z}`);
  out.push('da fermo: la palla torna sotto la suola');
}

// ------------------------------------------------------------------ corpo (src/fisica/corpo.js)
const H = CORPO.passoMax, gioc = (o = {}) => ({ x: 0, z: 0, vx: 0, vz: 0, dir: 0, wy: 0, en: 1, fondo: 1, ...o });
function muovi(p, wx, wz, T, dt = 1 / 60, vMax = 7.3, o = {}) { // come in partita: accumulo e passi fissi
  for (let t = 0; t < T - 1e-9; t += dt) { p.resto = (p.resto || 0) + Math.min(dt, T - t); while (p.resto >= H - 1e-9) { p.resto -= H; spingi(p, wx, wz, H, vMax, o); p.x += p.vx * H; p.z += p.vz * H; } }
  return p;
}
const tempoFino = (p, cond, wx, wz, max = 5, o) => { let t = 0; while (t < max && !cond(p)) { spingi(p, wx, wz, H, 7.3, o); p.x += p.vx * H; p.z += p.vz * H; t += H; } return t; };
{
  const a = tempoFino(gioc(), (p) => p.vx >= 6.6, 7.3, 0); // da fermo al 90% di 7,3 m/s
  const f = gioc({ vx: 7.3 }), tf = tempoFino(f, (p) => p.vx <= 0.01, 0, 0);
  const u = gioc({ vx: 7.3 }), tu = tempoFino(u, (p) => p.vx <= -6.6, -7.3, 0); // inversione a 180°
  assert.ok(a > .7 && a < 1.6, `partenza ${a}`); assert.ok(tf > .3 && tf < .7 && f.x < 2.6, `frenata ${tf} ${f.x}`); assert.ok(tu > a && tu < a + .8, `inversione ${tu}`);
  out.push(`corpo: da fermo a 6,6 m/s in ${a.toFixed(2)} s; frena da 7,3 in ${tf.toFixed(2)} s (${f.x.toFixed(1)} m); inversione completa in ${tu.toFixed(2)} s`);
}
{ // curva: raggio a velocità normale e in scatto (con la curva più larga)
  const raggio = (v, o) => { const p = gioc({ vx: v }); let maxZ = 0; for (let t = 0; t < 3; t += H) { const ang = Math.atan2(p.vz, p.vx); if (ang > Math.PI / 2) break; spingi(p, 0, v, H, v, o); p.x += p.vx * H; p.z += p.vz * H; maxZ = Math.max(maxZ, p.x); } return maxZ; };
  const r7 = raggio(7), r9 = raggio(9, { lat: CORPO.latScatto }), r4 = raggio(4);
  assert.ok(r4 < r7 && r7 < r9, `raggi ${r4} ${r7} ${r9}`);
  out.push(`curva a 90°: avanza ${r4.toFixed(1)} m a 4 m/s, ${r7.toFixed(1)} m a 7 m/s, ${r9.toFixed(1)} m in scatto a 9 m/s`);
}
{ // rotazione del busto: niente scatti, niente oscillazioni
  const p = gioc(); let t = 0, max = 0; while (t < 1) { ruota(p, Math.PI - .01, H, 0); max = Math.max(max, p.dir); t += H; if (Math.abs(p.dir - (Math.PI - .01)) < .05 && !p.t) p.t = t; }
  const c = gioc(); for (let i = 0; i < 120; i++) ruota(c, Math.PI - .01, H, 8);
  assert.ok(p.t > .2 && p.t < .5, `giro ${p.t}`); assert.ok(max < Math.PI - .01 + .09, `oscilla ${max}`);
  out.push(`busto: mezzo giro in ${p.t.toFixed(2)} s da fermo (velocità massima ${CORPO.giro} rad/s, in corsa ${CORPO.giroCorsa})`);
}
{ // frame rate: stessa corsa (con curva) a 30, 60 e 144 fps
  const fine = [1 / 30, 1 / 60, 1 / 144].map((dt) => { const p = gioc(); muovi(p, 7, 0, 1, dt); muovi(p, 0, 7, 1.2, dt); return p; });
  for (const f of fine) assert.ok(hyp(f.x - fine[0].x, f.z - fine[0].z) < .05, `fps ${f.x},${f.z} vs ${fine[0].x},${fine[0].z}`);
  out.push(`corpo e frame rate: stessa corsa a 30/60/144 fps (scarto ${hyp(fine[2].x - fine[0].x, fine[2].z - fine[0].z).toFixed(3)} m)`);
}
{ // fatica: lo scatto consuma, la corsetta poco, il passo recupera; il fondo cala piano
  const p = gioc(); for (let t = 0; t < 10; t += H) stanca(p, H, 9, 7.3, true); const dopoScatto = p.en;
  for (let t = 0; t < 10; t += H) stanca(p, H, 2, 7.3, false); const dopoPasso = p.en;
  const q = gioc(); for (let t = 0; t < 240; t += H) stanca(q, H, 5.5, 7.3, false);
  assert.ok(dopoScatto < .6 && dopoScatto > .45, `scatto ${dopoScatto}`); assert.ok(dopoPasso > dopoScatto + .1, 'recupera'); assert.ok(p.fondo < 1 && q.fondo > .7, `fondo ${p.fondo} ${q.fondo}`);
  assert.ok(forma(.2).v < forma(1).v && forma(.2).acc < forma(1).acc);
  out.push(`fatica: 10 s di scatto ${dopoScatto.toFixed(2)}, poi 10 s al passo ${dopoPasso.toFixed(2)}; una partita di corsa continua lascia il fondo a ${q.fondo.toFixed(2)}`);
}
{ // passo: tre o quattro appoggi al secondo in corsa, nessuno da fermo
  const p = gioc(); let n = 0; for (let t = 0; t < 2; t += H) if (cammina(p, H, 7)) n++;
  const f = gioc(); let m = 0; for (let t = 0; t < 2; t += H) if (cammina(f, H, 0)) m++;
  assert.ok(n >= 5 && n <= 8, `appoggi ${n}`); assert.equal(m, 0);
  out.push(`passo: a 7 m/s ${n / 2} appoggi al secondo (${cadenza(7).toFixed(2)} passi completi), da fermo nessuno`);
}
console.log('Fisica del pallone: tutte le prove passate\n - ' + out.join('\n - '));
