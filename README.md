# Fantatitano — La Partita

Gioco di calcio 3D nel browser (telefono e computer), con squadre, stemmi, rose e Tito
presi dal progetto Fantatitano. **Prototipo 0.2**: una partita amichevole giocabile.

Vive in un repository e in un deploy suoi, ma è pensato per comparire sotto
`fantatitano.site/gioco`, con lo stesso account e lo stesso database Supabase dell'app
(decisione di Alex, 17/11/2026). Il collegamento all'app non è ancora fatto.

## Avvio

```bash
npm install
npm run dev      # apre un server locale e ricompila a ogni modifica
npm run build    # produce public/app.js (lo fa anche Vercel a ogni deploy)
```

`public/` è il sito: `index.html`, `data.js`, `modello.js`, `app.js` (generato), `img/`, `font/`.

## Struttura

| Percorso | Contenuto |
|---|---|
| `src/game.js` | Tutto il gioco: scena, motore della partita, IA, comandi, schermate, audio |
| `public/index.html` | Pagina, stile e schermate (home, scelta squadre, VS, pausa, fine partita) |
| `public/data.js` | 16 squadre con colori e undici titolari. **Generato**: `python3 scripts/genera-dati.py <cartella dell'app>` |
| `public/modello.js` | Il modello 3D del giocatore in base64. **Generato**: `npm run modello` |
| `public/img/` | Stemmi di fantasia (grande e `-mini`), pose di Tito, logo: copiati da `media/` dell'app |
| `modelli/giocatore.glb` | Modello ridotto (10.800 triangoli, clip `idle`, `walk`, `run`) |
| `modelli/riduci.mjs` | Riduce un GLB e tiene solo le clip che servono |

## Cosa c'è

- Partita 11 contro 11 di 4 minuti, tre difficoltà, visuale TV in orizzontale e da dietro in verticale.
- Comandi touch (levetta, Passa/Cambia, Tira/Scivolata, Scatto) e tastiera (frecce, X, Spazio, Shift).
- Gol, rimesse, angoli, rimesse dal fondo, pali e traverse. Niente falli né fuorigioco.
- Giocatori con scheletro: corsa, camminata e attesa sono animazioni registrate; la divisa è
  dipinta sui vertici (`loadModel` in `src/game.js` divide il corpo in maglia, pantaloncini,
  calzettoni, pelle, capelli partendo dalle ossa).
- Se il modello non si carica, il gioco ripiega da solo sui pupazzi a blocchi (`makeFigure`).

## Cosa manca, in ordine

1. **Animazioni da calcio.** Tiro, scivolata, tuffo ed esultanza oggi sono ritocchi a codice
   sulle ossa (`poseSkinned`, tabella `o`). Vanno sostituiti con clip vere da Mixamo
   (serve un Adobe ID): personaggio X Bot, FBX, «Without Skin», 30 fps, «In Place».
   Lo scheletro è già quello di Mixamo (`mixamorig:*`), quindi le clip si applicano così come sono.
   Servono: tiro, passaggio, stop, contrasto in scivolata, colpo di testa, caduta, esultanza;
   per il portiere attesa, tuffo destro e sinistro, presa, rinvio.
2. **Calciatore definitivo.** Il modello è un segnaposto (X Bot di Mixamo, dagli esempi di
   three.js). I file grezzi di Mixamo non si possono ridistribuire: **il repository resta privato**
   finché c'è lui.
3. **Collegamento all'app.** Rewrite `/gioco` nel `vercel.json` di `fantasyfootballrsm` verso
   questo deploy, poi login condiviso e tabelle Supabase per carriera e rosa.
4. **Carriera, Coppa Titano, La mia rosa**: nel menu sono solo segnaposto.

## Cose da sapere

- **Mai provato su un telefono vero.** Le prove sono state fatte in un browser senza scheda
  grafica: fluidità e comodità dei comandi sono da verificare. Se scatta, abbassare il rapporto
  in `npm run modello` (0.22 → 0.12).
- **Livello degli avversari** tarato solo con partite simulate (`DIFF` in cima a `src/game.js`).
- **Colori delle maglie** da `src/data.js` dell'app; il secondo colore è scelto a occhio dagli
  stemmi (`scripts/genera-dati.py`). Qualche divisa non combacia col suo stemma.
- **Nomi dei calciatori**: sono quelli del listone dell'app. Verificare che l'accordo con
  l'associazione calciatori copra anche un videogioco.
- `window.__g` espone lo stato per le prove: `__g.G.auto = true` fa giocare da sola anche la
  squadra dell'utente; `__g.step(1/60)` fa avanzare la simulazione senza disegnare.
- Il mixer di three.js non riscrive un osso se la posa non è cambiata: i ritocchi a codice vanno
  tolti a ogni fotogramma prima di `mixer.update` (lo fa `f.saved`), se no si accumulano.
