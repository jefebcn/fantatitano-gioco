# Riferimenti visivi

Immagini generate con l'AI che Alex usa per dire come devono apparire le schermate. Sono riferimenti: **non entrano nel
gioco così come sono** (tranne lo sfondo della Home, vedi sotto) e non se ne copiano gli errori (nomi ripetuti, testi
illeggibili, valori di esempio).

| File | A cosa serve | Dove è stato usato |
|---|---|---|
| `modello-carte.png` | forma e stile delle carte a scudo: bronzo, argento-azzurro, oro | cornice ridisegnata in SVG in `scripts/icone.mjs` (`carta-bronzo`, `carta-argento`, `carta-oro`); carte in `src/casa/giocatore.js` |
| `mockup-squadra-1.png` | Squadra: disposizione, rifinitura, titolo «Gestione squadra» nella barra, pulsante «Squadra migliore» | `src/casa/vista-squadra.js` |
| `mockup-squadra-2.png` | Squadra: come si distribuiscono le fasce (quasi tutte bronzo, poche argento e oro) | le fasce vengono dalla scala del gioco (`SCALA.fasce` in `src/config.js`) |
| `carta-proposta-A.jpg` | la carta del giocatore approvata il 23/11 (proposta «A»): misure, colori, cosa si vede a ogni larghezza | `CARTA` in `src/config.js`, `src/casa/giocatore.js`; scelte in `docs/carte-giocatori.md`. Questo file è nel repository |
| `sfondo-home.png` | sfondo della Home, San Marino di notte: questo **si usa** | va copiato in `assets/arrivo/sfondo-home.png`, poi `python3 scripts/importa_immagini.py` lo porta a 3840 × 1800 in WebP a 1x, 2x e 3x; la Home lo mostra con la vignettatura scura ai bordi |

Al 21/11 i quattro file non sono ancora nel repository su GitHub: le carte e la Squadra sono state fatte guardando le
immagini che Alex ha mandato in chat; lo sfondo aspetta il file vero.
