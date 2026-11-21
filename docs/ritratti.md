# Ritratti dei giocatori

Stato (21/11): **secondo foglio di prova da 12 mandato ad Alex, in attesa del suo OK**. Gli altri ritratti non si
generano prima. I ritratti di oggi nel gioco sono ancora quelli vecchi, disegnati al momento dal modello 3D della partita.
I fogli di prova sono resi a 800 punti di lato; i ritratti definitivi si rendono a 1024.

## Decisioni di Alex (21/11)
- **Maglia neutra, colorata dal gioco**: con il mercato i giocatori cambiano squadra, una maglia «stampata» nel ritratto
  sarebbe sbagliata metà delle volte.
- **Quanti volti**: un ritratto per ogni giocatore vero (265) e circa 150 volti condivisi per inventati e mercato, con
  una regola: **mai due facce uguali nella stessa rosa o nella stessa partita**.
- Dal primo foglio: spalle e trapezi meno gonfi, colletto vero, pieghe nella stoffa, niente riflessi gialli sui capelli,
  tratti più maschili, calvo senza ciocche, capelli lunghi a ciocche e non a casco, espressioni e teste appena girate,
  tutta la testa sempre nell'inquadratura.

## Due strati: la testa e la maglia
Dal collo in giù tutti i giocatori hanno **lo stesso busto e la stessa maglia** (una polo col colletto). Quindi:

| File | Cosa contiene | Quanti |
|---|---|---|
| `<id>.png` | testa, collo, capelli e barba del giocatore, sfondo trasparente, **senza maglia** | uno a volto |
| `maglia-luce.png` | la maglia bianca con luci, ombre e pieghe | uno per tutti |
| `maglia-mappa.png` | per ogni punto della maglia: posizione di lato, altezza, colletto e bottoni | uno per tutti |

Il gioco compone il ritratto così: disegna il motivo della squadra (tinta unita, righe, fasce, banda, metà, scacchi, V)
leggendo dalla mappa dove cade ogni punto, lo moltiplica per `maglia-luce` (così prende ombre e pieghe), e sopra mette la
testa. Colletto e bottoni prendono il colore del bordo. La stessa regola è scritta in `componi` di
`scripts/ritratti_webp.py`, che fa anche il foglio di controllo: **il gioco dovrà fare lo stesso conto** (ancora da fare,
dopo l'OK).

La mappa è larga il doppio della maglia, a otto bit, senza trasparenza: metà sinistra rosso e verde = posizione di lato
(parte grossa e parte fine, insieme fanno un numero da 0 a 65535 che copre da −0,40 a +0,40 metri), blu = bordo; metà
destra rosso e verde = altezza (da −0,50 a +0,10 metri rispetto agli occhi). Va letta punto per punto, senza sfumare.

## Come sono fatti
- **Programmi**: Blender 4.2 LTS (blender.org) senza interfaccia, estensione MPFB 2.0.18 (extensions.blender.org). Il codice
  di MPFB è GPL e non entra nel gioco; i personaggi che crea sono CC0.
- **Pacchetti di MakeHuman** (tutti CC0, da files2.makehumancommunity.org): `makehuman_system_assets` (pelli, occhi,
  sopracciglia, ciglia), `skins02` (altre pelli maschili), `shirts01` (la polo, di Namuhekam).
- **Corpo**: quello ad alta definizione di MPFB (19 mila vertici, lisciato due volte nel render). Corporatura da
  calciatore, uguale per tutti dal collo in giù; la testa è ingrandita del 4%.
- **Viso**: 36 regolazioni di MPFB tirate a sorte dal «seme» del viso, dentro intervalli che tengono i tratti maschili
  (mascella e mento larghi, labbra sottili, occhi non grandi), più la forma generale della testa. Età da 18 a 36 anni. I
  volti escono da numeri a caso: nessuno è fatto per somigliare alla persona vera con quel nome.
- **Espressione e posa**: sorriso, mezzo sorriso, sguardo deciso o serio (le «unità d'espressione» di MPFB); la testa
  gira di 4-14 gradi verso la camera, si inclina e si china di pochi gradi. Gli occhi guardano in camera e finiscono
  sempre nello stesso punto dell'immagine.
- **Pelle**: materiale pelle di MPFB con subsurface scattering e pori, sei tonalità; lentiggini per le più chiare.
- **Occhi**: occhi ad alta definizione di MPFB con iride disegnata dal materiale e cornea lucida, sei colori.
  Sopracciglia (nove forme) e ciglia.
- **Capelli e barbe**: a ciocche vere, cresciute da script dalla pelle. I capelli sono divisi in ciuffi, ognuno col suo
  verso, la sua lunghezza e la sua onda. Dodici capigliature (rasato, corto, sfumato, ciuffo, pettinati indietro, riga di
  lato, ricci, afro, raccolti, calvo, stempiato, lunghi), sei barbe (ombra di barba, corta, piena, pizzetto, baffi,
  collare) più il viso rasato, sei colori naturali.
- **Maglia**: polo bianca con colletto e bottoni, pieghe vere nella stoffa e trama fitta.
- **Inquadratura**: busto di tre quarti (22 gradi), obiettivo 85 mm, occhi al 38% dall'alto (poco sotto un terzo: così
  entra tutta anche la capigliatura più alta), uguale per tutti.
- **Luci**: principale calda da sinistra a 45 gradi, riempimento morbido da destra, contorno appena azzurro da dietro. Il
  contorno non tocca capelli e barba (attraversandoli li accendeva di giallo): per loro ce n'è uno suo, debole.
- **Render**: Cycles, 256 campioni con riduzione del rumore, 1024 × 1024 PNG con sfondo trasparente; poi WebP a 512 e 256.

## Come si rifanno
1. Blender e MPFB (una volta): scaricare Blender 4.2 LTS, poi
   `blender --command extension install-file -r user_default --enable add-on-mpfb-v2.0.18.zip`.
2. Pacchetti (una volta): scompattare i tre zip in `~/.config/blender/4.2/extensions/.user/user_default/mpfb/data/`.
   Il sito di MakeHuman è lento con una connessione sola: conviene scaricare a pezzi in parallelo.
3. Render: `blender -b --python scripts/blender/render_ritratti.py -- aspetti.json uscita [campioni] [lato] [id,id]`.
   Tra gli id, `maglia` rifà i due file della maglia; senza id si fa tutto, e la maglia solo se manca.
4. File per il gioco e foglio di controllo:
   `python3 scripts/ritratti_webp.py uscita public/img/ritratti foglio.jpg aspetti.json`.

Ogni riga di `aspetti.json` è un volto:

```json
{ "id": "01-trefiori", "eta": 29, "pelle": 1, "viso": 1000, "occhi": "castani", "capelli": "corto", "colore": "castano scuro",
  "barba": "ombra", "lentiggini": false }
```

`pelle` va da 0 (la più chiara) a 5; `viso` è il seme del volto, da cui escono anche espressione e posa (si possono
fissare con `espressione`, `gira`, `inclina`, `china`). Lo stesso aspetto dà sempre lo stesso ritratto. Nel file di
prova c'è anche `maglia` (colori in valori lineari e disegno): serve solo al foglio di controllo. Le tabelle di capelli,
barbe, pelli, occhi, espressioni e luci sono in cima allo script.

## Tempi e peso (misurati sul computer cloud, 4 processori, senza scheda grafica)
Vedi `docs/stato-lavori.md`, sezione «Ritratti».
