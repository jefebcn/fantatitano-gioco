/* Prestazioni: risoluzione che si adatta da sola e indicatore di debug.

   Risoluzione dinamica: il canvas parte alla densità dello schermo (al massimo 2) e, se durante la partita i fotogrammi
   scendono sotto i ~50 al secondo, si disegna con meno pixel (passi del 15%, fino a poco più della metà); quando il gioco
   torna stabile a 60 risale piano. Solo quando la risoluzione è già al minimo, o quando il collo di bottiglia è il
   processore (i pixel non c'entrano), chiede al gioco di togliere dettagli (vedi qualita in game.js).
   I telefoni in risparmio energetico che fissano lo schermo a 30 al secondo danno fotogrammi tutti uguali: lì non si
   scende, perché meno pixel non darebbero un fotogramma in più.

   Indicatore (?debug nell'indirizzo): fotogrammi al secondo, il fotogramma peggiore, quanto lavora il processore
   (logica + preparazione del disegno), quanto lavora la scheda grafica dove il browser lo dice, chiamate di disegno,
   triangoli, risoluzione e livello di qualità. */

export const RIS = { giu: 1 / 50, su: 1 / 57, passoGiu: 0.85, passoSu: 1.08, minimo: 0.55, attesaGiu: 1.5, attesaSu: 6, tettoPer: 25 };

export function creaPrestazioni({ renderer, debug = false, livello = () => 0, rinuncia = () => false }) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const S = {
    max: dpr, min: Math.max(0.7, dpr * RIS.minimo), ora: dpr, media: 1 / 60, scarto: 0, cpu: 0, attesa: 3, stabile: 0, tetto: dpr, tettoT: 0,
  };
  renderer.setPixelRatio(S.ora);
  let t0 = 0;

  /** Imposta quanti pixel per punto disegnare (cambia la misura del canvas: si fa di rado). */
  function scala(r) {
    r = Math.max(S.min, Math.min(S.max, r));
    if (Math.abs(r - S.ora) < 0.02) return false;
    S.ora = r; renderer.setPixelRatio(r); return true;
  }

  /** Da chiamare a inizio e fine del lavoro di un fotogramma (logica + disegno) per sapere quanto pesa il processore. */
  const inizio = () => { t0 = performance.now(); if (G2) G2.inizio(); };
  const fine = () => { if (G2) G2.fine(); const c = (performance.now() - t0) / 1000; S.cpu += (c - S.cpu) * 0.05; };

  /**
   * Ogni fotogramma, col tempo vero dal precedente. Ritorna true quando la risoluzione è finita e serve togliere dettagli.
   * inGioco: solo durante la partita si decide (nei menu i fotogrammi non dicono nulla).
   */
  function aggiorna(dt, inGioco) {
    if (HUD) HUD.conta(dt);
    if (!inGioco || !(dt > 0)) return false;
    const k = 1 - Math.exp(-dt / 0.5); // media su mezzo secondo, qualunque sia il ritmo dei fotogrammi
    S.media += (dt - S.media) * k; S.scarto += (Math.abs(dt - S.media) - S.scarto) * k; S.attesa -= dt;
    if (S.tettoT > 0 && (S.tettoT -= dt) <= 0) S.tetto = S.max;
    if (S.attesa > 0) return false;
    const fisso30 = Math.abs(S.media - 1 / 30) < 0.002 && S.scarto < 0.0015 && S.cpu < 0.012; // schermo bloccato a 30, non lentezza
    if (S.media > RIS.giu && !fisso30) {
      const processore = S.cpu > S.media * 0.75; // il fotogramma è tutto logica e preparazione: meno pixel non aiutano
      S.attesa = RIS.attesaGiu; S.stabile = 0; const prima = S.ora;
      if (rinuncia()) { S.media = 1 / 60; return false; } // prima gli effetti (l'alone delle luci), poi i pixel
      if (!processore && scala(S.ora * RIS.passoGiu)) { S.tetto = prima; S.tettoT = RIS.tettoPer; S.media = 1 / 60; return false; }
      if (S.media > 1 / 40 || processore) { S.attesa = 4; S.media = 1 / 60; return true; }
      return false;
    }
    if (S.media < RIS.su) {
      S.stabile += dt;
      if (S.stabile > RIS.attesaSu && S.ora < S.tetto - 0.02) { scala(Math.min(S.tetto, S.ora * RIS.passoSu)); S.stabile = 0; S.attesa = RIS.attesaGiu; }
    } else S.stabile = 0;
    return false;
  }

  // tempo della scheda grafica, dove il browser lo misura (Chrome su Android e desktop, non Safari)
  const G2 = debug ? tempoGpu(renderer.getContext()) : null;
  const HUD = debug ? indicatore(renderer, S, livello, G2) : null;

  return { aggiorna, inizio, fine, scala, stato: S };
}

function tempoGpu(gl) {
  const ext = gl.getExtension && gl.getExtension('EXT_disjoint_timer_query_webgl2');
  if (!ext || !gl.createQuery) return null;
  const coda = [], G = { ms: 0, inizio() { if (coda.length > 4) return; const q = gl.createQuery(); gl.beginQuery(ext.TIME_ELAPSED_EXT, q); G.q = q; },
    fine() {
      if (G.q) { gl.endQuery(ext.TIME_ELAPSED_EXT); coda.push(G.q); G.q = null; }
      while (coda.length && gl.getQueryParameter(coda[0], gl.QUERY_RESULT_AVAILABLE)) {
        const q = coda.shift(); if (!gl.getParameter(ext.GPU_DISJOINT_EXT)) G.ms += (gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6 - G.ms) * 0.1; gl.deleteQuery(q);
      }
    } };
  return G;
}

function indicatore(renderer, S, livello, G2) {
  const el = document.createElement('div');
  el.id = 'debug';
  el.style.cssText = 'position:fixed;left:6px;top:6px;z-index:99;pointer-events:none;font:11px/1.35 ui-monospace,Menlo,monospace;color:#cfff6a;background:rgba(0,0,0,.62);padding:5px 7px;border-radius:6px;white-space:pre';
  document.body.appendChild(el);
  let n = 0, somma = 0, peggiore = 0, t = 0;
  return {
    conta(dt) {
      if (!(dt > 0)) return; n++; somma += dt; peggiore = Math.max(peggiore, dt); t += dt;
      if (t < 0.5) return;
      const i = renderer.info, mem = performance.memory ? ` · js ${(performance.memory.usedJSHeapSize / 1048576).toFixed(0)}MB` : '';
      el.textContent = `${(n / somma).toFixed(0)} fps · peggiore ${(peggiore * 1000).toFixed(0)}ms\n`
        + `cpu ${(S.cpu * 1000).toFixed(1)}ms${G2 ? ` · gpu ${G2.ms.toFixed(1)}ms` : ''}${mem}\n`
        + `disegni ${i.render.calls} · triangoli ${(i.render.triangles / 1000).toFixed(0)}k\n`
        + `geometrie ${i.memory.geometries} · texture ${i.memory.textures}\n`
        + `risoluzione ${S.ora.toFixed(2)}x (${renderer.domElement.width}×${renderer.domElement.height}) · qualità ${livello()}`;
      n = 0; somma = 0; peggiore = 0; t = 0;
    },
  };
}
