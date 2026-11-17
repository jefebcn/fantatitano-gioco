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
| `scripts/simula.cjs` | Gioca partite simulate e stampa gol, tiri, possesso, inserimenti e scivolate: serve per tarare l'IA (richiede Playwright). Stampa anche falli, fuorigioco, rigori e cartellini |
| `scripts/analizza.mjs` | Misura le clip di un pacchetto Mixamo, per scegliere quali usare e dove ritagliarle |

## Cosa c'è

- Partita 11 contro 11 di 4 minuti, tre difficoltà, visuale TV in orizzontale e da dietro in verticale.
- Comandi touch (levetta, Passa/Cambia, Tira/Scivolata, Scatto) e tastiera (frecce, X, Spazio, Shift).
- Gol, rimesse, angoli, rimesse dal fondo, pali e traverse.
- **Falli e cartellini** (`foul`, `card`, numeri in `FOUL`): fallo sul contrasto in piedi o in
  scivolata (molto più probabile da dietro) e per contatto prolungato. Giallo, secondo giallo e
  rosso diretto per il fallo da ultimo uomo: l'espulso esce e la squadra resta in dieci (mai sotto
  i sette; il portiere non viene espulso). Non c'è la regola del vantaggio.
- **Punizioni e rigori** (`freeKick`, `penalty`): se la punizione è a tiro, tre avversari fanno
  barriera a 9 metri e l'IA calcia in porta. Sul rigore tutti escono dall'area; l'utente mira con
  la levetta e tira (dopo 6 secondi parte da solo).
- **Fuorigioco** (`offsideLine`, `offside`): si guarda la posizione al momento del passaggio, non
  vale su rimessa, angolo e rimessa dal fondo. I compagni restano in linea coi difensori e scattano
  col passaggio. Tra due squadre guidate dall'IA capita di rado, perché le difese stanno basse.
- **Qualità e fatica**: chi vale di più (`q`) sbaglia meno tiri e passaggi (`qf`); lo scatto consuma
  energia (`TIRE`, barretta sotto il nome) e chi è stanco scatta meno forte.
- **Pagelle** a fine partita (`vote`, pesi in `VOTE`): voto da 3 a 10 da gol, assist, passaggi,
  contrasti, palloni intercettati, parate, falli, cartellini e risultato; migliore in campo.
- Calciatori: un solo corpo con scheletro per tutti e 22 (Quaternius, CC0), con volto, tre acconciature, barba,
  cinque toni di pelle. La divisa è una texture generata dai colori della squadra (`src/divisa.js`): maglia,
  pantaloncini, calzettoni col risvolto, scarpe, colletto e bordo delle maniche nel secondo colore; disegno della
  maglia dal campo `st` in `data.js` (`righe` verticali, `fasce` orizzontali, `meta` metà e metà, `banda`
  diagonale; l'elenco è `DISEGNI` in `src/divisa.js`); maniche lunghe e guanti per il portiere. Cognome e numero
  sulla schiena e stemma sul petto sono due piccoli piani appesi all'osso del torace. Chi gioca fuori casa
  usa il proprio secondo colore se si distingue da quello di casa, altrimenti bianco o nero (`pickKits`).
- Animazioni registrate (Mixamo, «Soccer Game Pack»): tiro, passaggio, scivolata, caduta di chi
  subisce la scivolata, tuffo del portiere a destra e a sinistra, presa, attesa del portiere, passi laterali
  del portiere, rinvio con le mani, corsetta. L'esultanza è costruita (braccia alzate sopra la posa d'attesa).
  Il portiere che ha il pallone lo tiene in mano all'altezza del petto e lo rilancia dopo un secondo
  (`HOLD`, `LANCIO`): il pallone parte nel momento in cui il braccio lo lascia.
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

1. **Animazioni che mancano.** Esultanza vera, colpo di testa, stop, rimessa laterale, rinvio di piede
   del portiere. Molte sono già nel pacchetto scaricato (54 clip): basta aggiungerle a `CLIP` in
   `scripts/animazioni.mjs` e a `FX` nel gioco. Gli FBX non stanno nel repository (i file grezzi di Mixamo non
   si ridistribuiscono): vanno riscaricati da mixamo.com (Soccer Game Pack, FBX, 30 fps) con un Adobe ID.
2. **Divisa.** È dipinta sul corpo, quindi aderente: niente maglia larga con le pieghe. Il disegno è
   assegnato a mano a tre squadre (`STILE` in `scripts/genera-dati.py`); le altre sono a tinta unita.
   Il corpo è quello «Superhero» della versione gratuita del pacchetto: le proporzioni più normali sono
   nella versione a pagamento.
3. **Collegamento all'app.** Rewrite `/gioco` nel `vercel.json` di `fantasyfootballrsm` verso
   questo deploy, poi login condiviso e tabelle Supabase per carriera e rosa.
4. **Carriera, Coppa Titano, La mia rosa**: nel menu sono solo segnaposto.

## Cose da sapere

- **Prove.** Quelle automatiche sono fatte in un browser senza scheda grafica; Alex l'ha provato sul
  suo telefono e funziona. Su altri telefoni la fluidità è da verificare: se scatta, abbassare ancora il
  rapporto in `npm run modello` (oggi 0.36 del corpo originale) e rigenerare.
- **Livello degli avversari** tarato solo con partite simulate (`DIFF` in cima a `src/game.js`):
  `node scripts/simula.cjs 64` dopo `npm run build`. Con la squadra di casa che gioca da sola, oggi
  finisce in media 2,7-0,7 a facile, 1,4-1,0 a normale, 0,6-1,3 a difficile, con uno o due falli a
  partita e un rigore ogni cinque partite circa.
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
