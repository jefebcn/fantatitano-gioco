# Stemmi delle 60 squadre inventate

Tutti i 60 riquadri `stemma-*` di `assets/immagini.json` (sezione 2b di `docs/immagini-da-generare.md`):
Lega Esordienti, Lega dei Borghi, Lega delle Contrade, Serie Cadetta del Titano.

- 512 × 512, PNG con sfondo trasparente, stemma intero e centrato.
- Colori della maglia di ogni squadra come da tabella; forma e simbolo per lo più quelli dello stemma disegnato.
  Alle squadre «nessun simbolo» è stato dato un disegno araldico (bande, quarti, raggi) per distinguerle.
- Nessuna scritta, sigla o marchio vero.
- Generati con Gemini (account di Alex) in fogli 2×2 su fondo verde o magenta, poi tagliati e scontornati.

Per usarli: `python3 scripts/importa_immagini.py`, poi `python3 scripts/importa_immagini.py stato` deve dire
che gli stemmi mancanti sono zero.
