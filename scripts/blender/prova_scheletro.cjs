/* Prova dello scheletro del corpo nuovo: applica quattro animazioni (attesa e corsa dal manichino Mixamo, tiro e tuffo dalle
   clip del gioco) al corpo esportato da scripts/blender/corpo_base.py e salva quattro momenti per animazione, da davanti e da
   dietro, per guardare polsi, gomiti, spalle, piedi e collo.
   Uso: node scripts/blender/prova_scheletro.cjs <corpo.glb> <cartella di uscita>   (serve Playwright, come le altre prove) */
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const R = path.join(__dirname, '..', '..'), D = process.argv[3] || os.tmpdir();
require('esbuild').buildSync({ entryPoints: [path.join(__dirname, 'prova_scheletro.js')], bundle: true, format: 'iife', outfile: path.join(D, 'p.js'), logLevel: 'error' });
const F = { '/corpo.glb': process.argv[2], '/base.glb': R + '/modelli/animazioni-base.glb', '/calciatore.glb': R + '/modelli/calciatore.glb', '/anim.js': R + '/public/anim.js', '/p.js': D + '/p.js' };
const srv = http.createServer((q, r) => { const u = q.url.split('?')[0]; if (u === '/') { r.writeHead(200, { 'content-type': 'text/html' }); return r.end('<body style="margin:0"><script src="anim.js"></script><script src="p.js"></script>'); } fs.readFile(F[u] || '', (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200); r.end(d); } }); });
srv.listen(0, async () => {
  const br = await chromium.launch(), pg = await br.newPage(); pg.on('pageerror', (e) => console.log('ERR', String(e))); await pg.goto(`http://localhost:${srv.address().port}/`);
  const T4 = [.08, .36, .62, .88];
  const anims = [['attesa', 'base', 'idle', T4], ['corsa', 'base', 'run', [.0, .25, .5, .75]], ['tiro', 'gioco', 'tiro', [.1, .35, .5, .8]], ['tuffo', 'gioco', 'tuffoS', [.1, .3, .5, .75]]];
  const r = await pg.evaluate(([a, v]) => window.prova(a, v), [anims, [[2.6, 1.5, 4.2, .95], [-3.2, 1.4, -3.6, .95]]]);
  const per = {}; r.out.forEach(([n, u]) => { (per[n] = per[n] || []).push(Buffer.from(u.split(',')[1], 'base64')); });
  for (const n in per) per[n].forEach((b, i) => fs.writeFileSync(path.join(D, `an-${n}-${i}.png`), b));
  console.log(JSON.stringify(r.misure)); await br.close(); srv.close();
});
