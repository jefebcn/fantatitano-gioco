# Calciatore (MPFB / MakeHuman)

Il corpo dei calciatori è fatto con MPFB 2.0.18 in Blender 4.2.23 LTS (Blender da blender.org, MPFB dall'estensione ufficiale
su extensions.blender.org). I personaggi creati con MPFB sono CC0; il codice del plugin (GPLv3) non entra nel gioco.
Maschio adulto atletico, viso misto e generico (nessuna persona reale).

## Come si rifà
1. In Blender, senza interfaccia:
   `blender -b --python scripts/blender/calciatore.py -- modelli/quaternius-scheletro.glb <cartella di uscita>`
   Crea tre corpi con gli stessi vertici (normale, snello, robusto), con gli arti nelle direzioni di riposo dello scheletro
   del gioco; tiene corpo e occhi; fa i tre livelli di dettaglio (4.500, 1.500, 600 triangoli: `LOD` in cima allo script) e
   porta su ognuno le due forme e i segni di labbra, cuoio capelluto, occhi e unghie; fa le sette capigliature dal cuoio
   capelluto. La forma si regola in cima allo script: `BASE` (età, muscoli, peso), `DETTAGLI` (spalle, vita, fianchi, collo,
   testa, mento) e `CORPI` (le due corporature in più).
2. Copiare l'uscita (`lod0.glb`, `lod1.glb`, `lod2.glb`, `capelli.glb`, `punti.json`) in `modelli/mpfb/blender/`.
3. `npm run modello`:
   - `scripts/calciatore-nuovo.py` mette il corpo sullo scheletro che il gioco usa già (`modelli/quaternius-scheletro.glb`:
     stessi nomi, stessa gerarchia, stesse rotazioni a riposo; cambiano solo le posizioni delle giunture), con la gamba lunga
     come prima, e scrive `modelli/calciatore.glb` e `modelli/capelli.glb`. Per questo tutte le animazioni restano valide;
   - `scripts/maschera-nuova.py` rifà `public/img/divisa-maschera.png` (zone della divisa, e sulla pelle capelli,
     sopracciglia, barba, occhio) e `public/img/pelle.webp` (pelle disegnata, labbra, occhio);
   - `scripts/modello-js.mjs` comprime con Meshopt e scrive `public/modello.js`.

## Prova dello scheletro (21/11/2026)
`node scripts/blender/prova_scheletro.cjs <corpo_base.glb> <cartella>` applica attesa, corsa, tiro e tuffo e salva i
fotogrammi. Esito sul corpo a 4.500 triangoli con i pesi di MPFB: polsi, gomiti, collo e piedi puliti; una leggera gobba sulla
spalla col braccio alzato di traverso (tiro). Non serve l'auto-rigger di Mixamo.

## Altri file
- `corpo_base.fbx` e `scripts/blender/corpo_base.py`: la prima versione (corpo in posa a T con lo scheletro «mixamo» di MPFB),
  servita per la prova dello scheletro. Resta come ripiego.
- `punti.json`: dove stanno occhi e bocca e la cella dell'occhio nella texture (lo legge `scripts/maschera-nuova.py`).
