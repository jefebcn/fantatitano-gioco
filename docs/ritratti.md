# Ritratti dei giocatori

Stato (21/11): **foglio di prova da 12 fatto, in attesa dell'OK di Alex**. Gli altri ritratti non si generano prima.
Il foglio di prova è stato reso a 800 punti di lato; i ritratti definitivi si rendono a 1024.
I ritratti di oggi nel gioco sono ancora quelli vecchi, disegnati al momento dal modello 3D della partita.

## Come sono fatti
- **Programmi**: Blender 4.2 LTS (blender.org) senza interfaccia, estensione MPFB 2.0.18 (extensions.blender.org). Il codice
  di MPFB è GPL e non entra nel gioco; i personaggi che crea sono CC0.
- **Pacchetti di MakeHuman** (tutti CC0, da files2.makehumancommunity.org): `makehuman_system_assets` (pelli, occhi,
  sopracciglia, ciglia, maglietta), `skins02` (altre pelli maschili), `shirts01`.
- **Corpo**: quello ad alta definizione di MPFB (19 mila vertici, lisciato due volte nel render), non quello alleggerito
  della partita.
- **Viso**: 37 regolazioni di MPFB (forma della testa, fronte, naso, mento, mascella, bocca, zigomi, orecchie, occhi,
  collo) tirate a sorte dal «seme» del viso, più la forma generale della testa. Età da 18 a 36 anni. I volti escono da
  numeri a caso: nessuno è fatto per somigliare alla persona vera con quel nome.
- **Pelle**: materiale pelle di MPFB con subsurface scattering e pori, sei tonalità; lentiggini per le più chiare.
- **Occhi**: occhi ad alta definizione di MPFB con iride disegnata dal materiale e cornea lucida, sei colori; guardano in
  camera. Sopracciglia (nove forme) e ciglia.
- **Capelli e barbe**: a ciocche vere. Ogni ciocca cresce da script dalla pelle e piega nel verso in cui è pettinata,
  restando fuori dalla testa. Dodici capigliature (rasato, corto, sfumato, ciuffo, pettinati indietro, riga di lato,
  ricci, afro, raccolti, calvo, stempiato, lunghi), sei barbe (ombra di barba, corta, piena, pizzetto, baffi, collare) più
  il viso rasato, sei colori naturali.
- **Maglia**: la maglietta di MPFB coi colori e il disegno della squadra (tinta unita, righe, fasce, banda, metà,
  scacchi, V), bordi di collo e maniche nel secondo colore, nessun marchio.
- **Inquadratura**: busto di tre quarti (22 gradi), obiettivo 85 mm, occhi a un terzo dall'alto, uguale per tutti.
- **Luci**: principale calda da sinistra a 45 gradi, riempimento morbido da destra, contorno azzurro da dietro.
- **Render**: Cycles, 256 campioni con riduzione del rumore, 1024 × 1024 PNG con sfondo trasparente; poi WebP a 512 e 256.

## Come si rifanno
1. Blender e MPFB (una volta): scaricare Blender 4.2 LTS, poi
   `blender --command extension install-file -r user_default --enable add-on-mpfb-v2.0.18.zip`.
2. Pacchetti (una volta): scompattare i tre zip in `~/.config/blender/4.2/extensions/.user/user_default/mpfb/data/`.
   Il sito di MakeHuman è lento con una connessione sola: conviene scaricare a pezzi in parallelo.
3. Render: `blender -b --python scripts/blender/render_ritratti.py -- aspetti.json uscita [campioni] [lato] [id,id]`.
4. WebP e foglio di controllo: `python3 scripts/ritratti_webp.py uscita public/img/ritratti foglio.jpg`.

Ogni riga di `aspetti.json` è un giocatore:

```json
{ "id": "01-trefiori", "eta": 29, "pelle": 1, "viso": 1000, "occhi": "castani", "capelli": "corto", "colore": "castano scuro",
  "barba": "ombra", "lentiggini": false, "maglia": { "c1": [0.01, 0.25, 0.07], "c2": [0, 0, 0], "stile": "" } }
```

`pelle` va da 0 (la più chiara) a 5; `viso` è il seme del volto; i colori della maglia sono in valori lineari. Lo stesso
aspetto dà sempre lo stesso ritratto. Le tabelle di capelli, barbe, pelli, occhi e luci sono in cima allo script.

## Tempi e peso (misurati sul computer cloud, 4 processori, senza scheda grafica)
Vedi `docs/stato-lavori.md`, sezione «Ritratti».
