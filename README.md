# Fantatitano — La Partita

Gioco di calcio 3D nel browser (telefono e computer), con squadre, stemmi, rose e Tito
presi dal progetto Fantatitano. **Prototipo 0.4**: una partita amichevole giocabile, con calciatori veri (volto, capelli, divisa della squadra) e animazioni registrate.

Vive in un repository e in un deploy suoi, ma è pensato per comparire sotto
`fantatitano.site/gioco`, con lo stesso account e lo stesso database Supabase dell'app
(decisione di Alex, 17/11/2026). Il collegamento all'app non è ancora fatto.

## Avvio

```bash
npm install
npm run dev      # apre un server locale e ricompila a ogni modifica
npm run build    # produce public/app.js (lo fa anche Vercel a ogni deploy)
```

`public/` è il sito: `index.html`, `data.js`, `modello.js`, `anim.js`, `app.js` (generato), `img/`, `font/`.

## Struttura

| Percorso | Contenuto |
|---|---|
| `src/game.js` | Tutto il gioco: scena, motore della partita, IA, comandi, schermate, audio |
| `public/index.html` | Pagina, stile e schermate (home, scelta squadre, VS, pausa, fine partita) |
| `public/data.js` | 16 squadre con colori e undici titolari. **Generato**: `python3 scripts/genera-dati.py <cartella dell'app>` |
| `src/divisa.js` | Disegna la divisa come texture: una per divisa e tono di pelle, non per giocatore |
| `public/modello.js` | Calciatore e acconciature in base64. **Generato**: `npm run modello` |
| `public/anim.js` | Tutte le animazioni, già adattate allo scheletro del calciatore. **Generato**: `node scripts/animazioni.mjs <cartella degli FBX>` |
| `public/img/` | Stemmi di fantasia (grande e `-mini`), pose di Tito, logo (copiati da `media/` dell'app); `pelle.webp`, `occhi.webp`, `divisa-maschera.png` (generati) |
| `modelli/quaternius/` | I file originali del calciatore: «Universal Base Characters» di Quaternius, licenza CC0 |
| `modelli/calciatore.glb` · `capelli.glb` | Corpo, occhi, sopracciglia (5.150 triangoli) e tre acconciature, alleggeriti da `scripts/calciatore.mjs` |
| `modelli/animazioni-base.glb` | Solo sorgente di attesa, camminata e corsa (manichino di three.js, scheletro Mixamo) |
| `scripts/calciatore.mjs` | Alleggerisce il modello tenendo conto di UV e normali |
| `scripts/maschera-divisa.py` | Dice, per ogni punto della texture del corpo, se è pelle, maglia, pantaloncini, calzettoni, scarpe |
| `scripts/animazioni.mjs` | Porta le clip Mixamo sullo scheletro del calciatore; in cima c'è l'elenco `CLIP` |
| `scripts/simula.cjs` | Gioca partite simulate e stampa gol, tiri, possesso, inserimenti e scivolate: serve per tarare l'IA (richiede Playwright) |
| `scripts/analizza.mjs` | Misura le clip di un pacchetto Mixamo, per scegliere quali usare e dove ritagliarle |

## Cosa c'è

- Partita 11 contro 11 di 4 minuti, tre difficoltà, visuale TV in orizzontale e da dietro in verticale.
- Comandi touch (levetta, Passa/Cambia, Tira/Scivolata, Scatto) e tastiera (frecce, X, Spazio, Shift).
- Gol, rimesse, angoli, rimesse dal fondo, pali e traverse. Niente falli né fuorigioco.
- Calciatori: un solo corpo con scheletro per tutti e 22 (Quaternius, CC0), con volto, tre acconciature, barba,
  cinque toni di pelle. La divisa è una texture generata dai colori della squadra (`src/divisa.js`): maglia,
  pantaloncini, calzettoni col risvolto, scarpe; righe verticali dove la squadra le ha (campo `st` in `data.js`);
  maniche lunghe e guanti per il portiere. Numero sulla schiena e stemma sul petto sono due piccoli piani
  appesi all'osso del torace.
- Animazioni registrate (Mixamo, «Soccer Game Pack»): tiro, passaggio, scivolata, caduta di chi
  subisce la scivolata, tuffo del portiere a destra e a sinistra, presa, attesa del portiere, corsetta. L'esultanza è costruita
  (braccia alzate sopra la posa d'attesa).
  Le fa partire `azione(p, nome)`; velocità e sfumature stanno nella tabella `FX`.
- IA di squadra:
  - **Inserimenti senza palla** (`runs`, `runScore`): chi attacca valuta tre corse (dritto, taglio
    dentro, taglio fuori) con un punteggio fatto di distanza dalla porta, spazio libero, distanza dai
    compagni e dal pallone, linea dei difensori; parte solo sopra una soglia. Dopo un passaggio in
    avanti può scattare il dai e vai. Chi ha palla cerca chi si inserisce e gli passa sulla corsa.
  - **Difesa a tre distanze** (`chase`): il più vicino al portatore si avvicina, poi temporeggia
    tenendosi tra lui e la porta, poi va sul pallone; aspetta di meno se la porta è vicina o se è
    arrivato il raddoppio. In scivolata va solo se è stato saltato o vicino all'area.
  - **Marcature** (`roles`): un avversario per difensore, senza doppioni; chi si inserisce viene
    seguito anche dai centrocampisti.
  I numeri stanno in `RUN`, `DEF` e nei campi `wait` e `slide` di `DIFF`, in cima a `src/game.js`.
- Se il modello non si carica, il gioco ripiega da solo sui pupazzi a blocchi (`makeFigure`).

## Cosa manca, in ordine

1. **Animazioni che mancano.** Esultanza vera, colpo di testa, stop, rimessa laterale, rinvio del portiere,
   passi laterali del portiere. Molte sono già nel pacchetto scaricato (54 clip): basta aggiungerle a `CLIP` in
   `scripts/animazioni.mjs` e a `FX` nel gioco. Gli FBX non stanno nel repository (i file grezzi di Mixamo non
   si ridistribuiscono): vanno riscaricati da mixamo.com (Soccer Game Pack, FBX, 30 fps) con un Adobe ID.
2. **Divisa.** È dipinta sul corpo, quindi aderente: niente maglia larga con le pieghe. Mancano fasce
   orizzontali, bordi di maniche e colletto, nome sulla schiena, seconda maglia vera (oggi è bianca).
   Il corpo è quello «Superhero» della versione gratuita del pacchetto: le proporzioni più normali sono
   nella versione a pagamento.
3. **Collegamento all'app.** Rewrite `/gioco` nel `vercel.json` di `fantasyfootballrsm` verso
   questo deploy, poi login condiviso e tabelle Supabase per carriera e rosa.
4. **Carriera, Coppa Titano, La mia rosa**: nel menu sono solo segnaposto.

## Cose da sapere

- **Mai provato su un telefono vero.** Le prove sono state fatte in un browser senza scheda
  grafica: fluidità e comodità dei comandi sono da verificare. Se scatta, abbassare ancora il
  rapporto in `npm run modello` (oggi 0.36 del corpo originale) e rigenerare.
- **Livello degli avversari** tarato solo con partite simulate (`DIFF` in cima a `src/game.js`):
  `node scripts/simula.cjs 64` dopo `npm run build`. Con la squadra di casa che gioca da sola, oggi
  finisce in media 2,9-0,4 a facile, 1,2-0,7 a normale, 0,5-1,3 a difficile. Con gli inserimenti si
  tira e si segna più di prima (a normale erano 0,9-0,5).
- **Colori delle maglie** da `src/data.js` dell'app; il secondo colore è scelto a occhio dagli
  stemmi (`scripts/genera-dati.py`). Qualche divisa non combacia col suo stemma.
- **Nomi dei calciatori**: sono quelli del listone dell'app. Verificare che l'accordo con
  l'associazione calciatori copra anche un videogioco.
- `window.__g` espone lo stato per le prove: `__g.G.auto = true` fa giocare da sola anche la
  squadra dell'utente; `__g.step(1/60)` fa avanzare la simulazione senza disegnare.
- **Le clip Mixamo non si copiano così come sono.** Il calciatore ha un altro scheletro (nomi e assi delle
  ossa diversi): `scripts/animazioni.mjs` applica ogni clip al manichino sorgente, legge di quanto ogni osso
  è ruotato nel mondo rispetto alla posa a T e applica la stessa rotazione all'osso corrispondente del
  calciatore. Nei file di Mixamo ogni osso compare due volte con lo stesso nome: conta quello esterno.
- **Rigenerare in ordine.** Se cambia il modello: `npm run modello` (modello, poi maschera, poi base64) e
  di nuovo le animazioni. La maschera va rifatta dal modello alleggerito, se no gli orli vengono strappati.
- **Il repository resta privato**: `modelli/animazioni-base.glb` e le clip vengono da Mixamo.
- Lo spostamento orizzontale del bacino viene tolto dalle clip: a muovere il giocatore è il motore.
- Il mixer di three.js non riscrive un osso se la posa non è cambiata: i ritocchi a codice vanno
  tolti a ogni fotogramma prima di `mixer.update` (lo fa `f.saved`), se no si accumulano.
