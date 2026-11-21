# Corpo base dei calciatori (MPFB / MakeHuman)

Maschio adulto atletico, 1,79 m, viso misto e generico, in posa a T, con lo scheletro «mixamo» di MPFB (52 ossa con i nomi
di Mixamo, pesi di MPFB). Creato con MPFB 2.0.18 in Blender 4.2.23 LTS da `scripts/blender/corpo_base.py`; i personaggi
creati con MPFB sono CC0 (il codice del plugin, GPLv3, non entra nel gioco).

Rigenerare: `blender -b --python scripts/blender/corpo_base.py -- <cartella di uscita> [triangoli]`
(Blender da blender.org, MPFB dall'estensione ufficiale su extensions.blender.org).

Prova dello scheletro: `node scripts/blender/prova_scheletro.cjs <corpo_base.glb> <cartella>` applica attesa, corsa, tiro e
tuffo e salva i fotogrammi. Esito del 21/11/2026 sul corpo a 4.500 triangoli: polsi, gomiti, collo e piedi puliti; una
leggera gobba sulla spalla col braccio alzato di traverso (tiro), normale con questo tipo di pesi. Non serve l'auto-rigger
di Mixamo.

`corpo_base.fbx` è la prima versione senza scheletro (serviva per l'auto-rigger): resta solo come ripiego.
