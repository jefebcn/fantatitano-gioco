# Icone del negozio e degli allenatori (20)

Tutte 512 × 512, PNG con sfondo trasparente, già rifilate. Generate con Gemini (account di Alex) in fogli 2×2 su
fondo verde, poi tagliate e scontornate. Nessun marchio vero (gli scarpini non hanno loghi né strisce di marca).

## Sostituiscono file che ci sono già
- `icona-allenatore-comune`, `icona-allenatore-raro`, `icona-allenatore-leggendario`: medaglione bronzo, argento-azzurro
  e oro con cartellina e fischietto. Le vecchie (lavagna bianca in cornice) a misura piccola sembravano un quadrato
  grigio vuoto (Percorso premi, livelli 5 e 15; Premi di fine stagione).

## Riquadri nuovi (aggiunti in `assets/immagini.json`, da collegare nel codice)
- `icona-categoria-tecnico`, `-fisico`, `-difesa`, `-portieri`: le quattro categorie di allenatore, per la scheda
  Allenatori e il popup «Scegli l'allenatore» (oggi solo scritte).
- `scarpini-misti`, `-neri`, `-bianchi`, `-oro`, `-azzurri`, `-lime`, `-arancio`, `-rosa`: Personalizza › Squadra ›
  Scarpini, al posto dei pallini colorati (chiavi di `SCARPE_NEGOZIO`, più «misti» = Ognuno i suoi).
- `pallone-classico`, `-oro`, `-azzurro`, `-notte`, `-arancio`: Personalizza › Squadra › Pallone delle partite in casa,
  al posto dei cerchi (chiavi di `PALLONI`).

Per usarle: `python3 scripts/importa_immagini.py`, poi nel codice `img('scarpini-' + chiave)` (o la funzione che usa già
la home per le illustrazioni), con il disegno di adesso come riserva se il file manca.
