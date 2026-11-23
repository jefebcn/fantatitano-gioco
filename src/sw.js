/* Service worker di Fantatitano — La Partita. Modello: scripts/pubblica.mjs lo copia in public/sw.js mettendo al posto
   dei due segnaposto in cima la versione dei file e la lista di quelli da tenere in memoria.

   - La pagina arriva dalla rete (così una versione nuova si vede subito); se la rete non risponde entro 3 secondi o
     non c'è, quella salvata: il gioco parte anche offline.
   - Gli script hanno la versione nell'indirizzo (app.js?v=…): una volta salvati non cambiano più, quindi si danno dalla
     memoria senza chiedere niente alla rete. Texture, font e immagini idem; quelli non precaricati si salvano al primo uso.
   - Ogni pubblicazione ha la sua memoria; all'attivazione quelle vecchie si cancellano.
   - La musica (cartella audio/) non passa di qui: il lettore la chiede a pezzi mentre suona, e una risposta a pezzi non
     si può salvare né ridare intera (su iPhone il brano non partirebbe). La gestisce il browser da solo; senza rete il
     gioco va lo stesso, senza musica.
   - Le richieste ad altri siti (l'account, Supabase) non passano di qui. */
const VERSIONE = '__VERSIONE__', NOME = 'ft-' + VERSIONE, PRECARICA = __PRECARICA__, ATTESA_RETE = 3000;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(NOME).then((c) => c.addAll(PRECARICA)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k.startsWith('ft-') && k !== NOME).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function pagina(req) {
  const rete = fetch(req).then((r) => {
    if (r.ok) { const copia = r.clone(); caches.open(NOME).then((c) => c.put('./', copia)); }
    return r;
  });
  const salvata = () => caches.match('./', { cacheName: NOME });
  const tempo = new Promise((ok) => setTimeout(ok, ATTESA_RETE)).then(salvata);
  return Promise.race([rete.catch(salvata), tempo.then((r) => r || rete)]).then((r) => r || rete);
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.origin !== self.location.origin) return;
  if (req.mode === 'navigate') { e.respondWith(pagina(req)); return; }
  if (u.pathname.endsWith('/sw.js')) return;
  if (u.pathname.includes('/audio/') || req.headers.has('range')) return;
  e.respondWith(caches.open(NOME).then((c) => c.match(req).then((hit) => hit || fetch(req).then((r) => {
    if (r.ok && r.type === 'basic') c.put(req, r.clone());
    return r;
  }))));
});
