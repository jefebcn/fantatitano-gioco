# Immagini in arrivo

Qui Alex mette le illustrazioni generate, col nome esatto dell'elenco in `docs/immagini-da-generare.md`
(esempio: `sfondo-home.png`), anche dentro una sottocartella (esempio: `premi/busta-giorno.png`). Poi `python3 scripts/importa_immagini.py` le controlla, le ritaglia se serve, le prepara
nelle tre grandezze in WebP dentro `public/img/illustrazioni/` e le collega al gioco. Gli originali restano qui.
