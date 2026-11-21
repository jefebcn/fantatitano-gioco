# Corpo base dei calciatori (MPFB / MakeHuman)

`corpo_base.fbx`: maschio adulto atletico, 1,78 m, viso misto e generico, posa a T, senza scheletro né texture,
~26.800 triangoli (si alleggerisce dopo lo scheletro: ~4.500 vicino, ~1.500 e ~600 da lontano).
Creato con MPFB 2.0.18 in Blender 4.2.23 LTS da `scripts/blender/corpo_base.py`; i personaggi creati con MPFB sono CC0.

Rigenerare: `blender -b --python scripts/blender/corpo_base.py -- <cartella di uscita>`
(Blender da blender.org, MPFB dall'estensione ufficiale su extensions.blender.org).

## Scheletro con l'auto-rigger di Mixamo (Alex, a mano)
1. mixamo.com → accedi → **Upload Character** → scegli `corpo_base.fbx`.
2. Se chiede l'orientamento: il personaggio deve guardare verso di te, in piedi.
3. Metti i cerchi su **mento, polsi, gomiti, ginocchia, inguine**; Symmetry acceso; **Skeleton LOD: Standard Skeleton (65)**.
4. Next, aspetta la fine, controlla l'anteprima che si muove, Next.
5. **Download**: Format **FBX Binary (.fbx)**, Pose **T-pose**, Skin **With Skin**.
6. Rinomina il file in `corpo_mixamo.fbx` e mettilo in questa cartella (o mandalo in chat).

Da lì: tre corporature come forme sullo stesso scheletro, altezze con la scala, alleggerimento e LOD, un materiale con
atlas, GLB compresso.
