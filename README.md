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
| `src/regia.js` | Regia: sequenza del gol (primo piano, scheda del marcatore, replay, transizione), arbitro, segnaposto col nome, tabelloni che festeggiano. Crea da sola la sua grafica, senza toccare `index.html` |
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
| `src/carriera.js` | La logica della carriera, senza schermate: calendario, risultati simulati, classifica, coppa, salvataggio |
| `scripts/prova-carriera.mjs` | Prove della logica della carriera: `npm run prova` |
| `scripts/simula.cjs` | Gioca partite simulate e stampa gol, tiri, possesso, inserimenti e scivolate: serve per tarare l'IA (richiede Playwright). Stampa anche falli, fuorigioco, rigori, cartellini, angoli, cross e colpi di testa |
| `scripts/analizza.mjs` | Misura le clip di un pacchetto Mixamo, per scegliere quali usare e dove ritagliarle |

## Cosa c'è

- Partita 11 contro 11 di 4 minuti, tre difficoltà, visuale TV.
- **Solo orizzontale** (`resize`): se lo schermo è in verticale, anche col blocco della rotazione, il gioco si
  disegna ruotato di lato e i tocchi vengono riportati nel verso giusto. In CSS si usano `--vw` e `--vh`
  (misure del gioco) al posto di `vw` e `vh`, e le classi `largo`, `basso`, `bassissimo` al posto delle
  regole `@media`. `manifest.webmanifest` chiede l'orizzontale quando il gioco è installato.
- Comandi touch (levetta, Passa/Cambia, Cross, Tira/Scivolata, Scatto) e tastiera (frecce, X, C, Spazio, Shift).
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
- **Gioco aereo** (`cross`, `header`, `corner`, numeri in `AIR`): il tasto **Cross** (C sulla
  tastiera) fa un traversone verso il compagno in area o, se in area non c'è nessuno, un lancio lungo nella
  direzione della levetta; l'IA crossa da sola dalla fascia. Sul pallone alto
  chi ci arriva colpisce di testa: in porta se è a tiro, via dall'area se difende, di sponda negli
  altri casi; i tiri forti passano. Sul calcio d'angolo cinque attaccanti entrano in area, ognuno con
  un marcatore, e chi batte crossa. Il portiere esce sui traversoni che scendono vicino alla porta e
  alcune sue respinte finiscono in angolo. Il colpo di testa usa l'animazione `testa`.
- **Carriera** (`src/carriera.js`, schermate in `drawHub` e nei pannelli `pan…`): al primo avvio si
  scelgono nome e squadra. La dashboard mostra la prossima partita di campionato, la classifica, la
  Coppa Titano, l'amichevole, la rosa, i numeri del club e il tabellone di coppa.
  - **Campionato**: 16 squadre, 15 giornate a girone unico; le altre sette partite di ogni giornata
    sono simulate secondo la forza delle squadre. A fine stagione se ne comincia un'altra.
  - **Coppa Titano**: eliminazione diretta dagli ottavi, partita secca; in parità decidono i rigori,
    per ora simulati e non giocati.
  - **Monete e mercato** (`PREMI`, `prezzo`, `scambio`, pannello `panMercato`): le monete arrivano da
    risultati, gol, turni di coppa e trofei. Si prende un titolare di un'altra squadra cedendo in cambio
    un proprio giocatore dello stesso ruolo e pagando la differenza (chi si cede vale il 70% del suo
    prezzo). Le rose cambiate stanno in `rose` dentro la carriera e valgono anche nelle amichevoli. La
    forza delle squadre nei risultati simulati non cambia con gli scambi.
  - Tutto è salvato sul dispositivo (`localStorage`, chiave `fantatitano-carriera`): non c'è ancora il
    collegamento all'account dell'app. Uscire a metà partita non registra il risultato.
  - Nel gioco la squadra dell'utente attacca sempre da sinistra a destra, anche in trasferta.
- **Prima della partita** (`showPre`, `drawSide`): dopo la scelta delle squadre si vedono le due formazioni
  sul campo, con numero, nome, compito e valore di ogni giocatore (da 55 a 88, confrontato con quelli
  del suo ruolo), stelle della squadra e modulo.
- **Tattica** (`FORMS`, `MENT`, `setTactics`): quattro moduli (4-3-3, 4-4-2, 3-5-2, 4-2-3-1) e tre
  mentalità. Si scelgono prima della partita e dalla pausa; in campo un tocco sulla scritta sopra la
  mappa cambia mentalità. Ogni avversaria ha il suo modulo e nel finale attacca se è sotto e si copre
  se è sopra. Le scelte restano salvate sul dispositivo (`localStorage`).
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
  del portiere, rinvio con le mani, colpo di testa (`testa`), corsetta. Costruite a mano sopra le clip di base:
  `aereo` (corsa a braccia aperte del marcatore) e `bandiera` (braccio alzato del guardalinee). L'esultanza è costruita (braccia alzate sopra la posa d'attesa).
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
- **Regia** (`src/regia.js`), presa a esempio da un video di Dream League Soccer ma rifatta con grafica nostra:
  - **Dopo un gol**: un secondo di azione dal vivo, poi primo piano del marcatore che corre verso la bandierina ed
    esulta coi compagni, con la scheda (stemma, numero, nome, minuto, assist); transizione con la corona; **replay**
    dell'azione da un'altra telecamera (dietro la porta o bassa dal lato opposto, a turno) con lo zoom che segue il
    pallone; seconda transizione e calcio d'inizio. Si salta toccando lo schermo. I tempi sono in `SEQ` e `REP`.
  - Il replay non rifà girare la partita: di ogni figura si registrano posizione, verso e rotazioni delle ossa
    (30 volte al secondo, ultimi 6,5 secondi) e si rimettono com'erano. Dopo un calcio da fermo la registrazione
    riparte, quindi un gol su punizione o rigore ha un replay corto.
  - **Arbitro** in campo: segue l'azione restando a qualche metro dal pallone; non tocca niente e non fischia
    (i fischi li decide sempre il gioco). La maglia è il colore più lontano da quelli delle due squadre e dei portieri.
  - **Guardalinee**, uno per metà campo su lati opposti: seguono il penultimo difensore (o il pallone, se è più
    avanti) e alzano la bandierina per due secondi quando il gioco fischia un fuorigioco nella loro metà (`ASS`).
  - **Pubblico coi colori delle squadre**: la curva dietro la porta a -x è degli ospiti, il resto è di casa; dopo un
    gol salta il pubblico della squadra che ha segnato (`TIFO`).
  - **Esultanza**: il marcatore corre verso la bandierina a braccia aperte piegandosi di lato (clip `aereo`), poi
    festeggia coi compagni.
  - **Segnaposto col nome** sopra il giocatore che si comanda, al posto della freccia.
  - **Tabelloni** a bordo campo che scorrono con «GOL!» e il nome del marcatore.
  - **Telecamera in diagonale** vicino alle porte (`DIAG`), così la porta si vede; prato tagliato a cerchi.
  - Agganci in `game.js`: `REGIA.figure()` e `REGIA.dopo()` in `draw()`, `G.goalEnd` in `step()`, `G.cine` in `think()`.
    Con i pupazzi a blocchi la sequenza non parte e il gol resta com'era (4,2 secondi).
- Se il modello non si carica, il gioco ripiega da solo sui pupazzi a blocchi (`makeFigure`).

## Cosa manca, in ordine

1. **Animazioni che mancano.** Esultanza vera (nel pacchetto non c'è), stop, rimessa laterale, rinvio di piede
   del portiere. Molte sono già nel pacchetto scaricato (54 clip): basta aggiungerle a `CLIP` in
   `scripts/animazioni.mjs` e a `FX` nel gioco. Gli FBX non stanno nel repository (i file grezzi di Mixamo non
   si ridistribuiscono): vanno riscaricati da mixamo.com (Soccer Game Pack, FBX, 30 fps) con un Adobe ID.
2. **Divisa.** È dipinta sul corpo, quindi aderente: niente maglia larga con le pieghe. Il disegno è
   assegnato a mano a tre squadre (`STILE` in `scripts/genera-dati.py`); le altre sono a tinta unita.
   Il corpo è quello «Superhero» della versione gratuita del pacchetto: le proporzioni più normali sono
   nella versione a pagamento.
3. **Collegamento all'app.** Rewrite `/gioco` nel `vercel.json` di `fantasyfootballrsm` verso
   questo deploy, poi login condiviso e tabelle Supabase per carriera e rosa.
4. **Sfide e riserve**: mancano gli obiettivi, le riserve (ogni squadra ha solo gli undici titolari, quindi
   il mercato è a scambio) e i rigori di coppa giocati davvero. Le altre squadre non fanno mercato tra loro.

## Cose da sapere

- **Il gioco non è ancora pubblico** (Alex, 17/11: «non deve essere ancora visibile per tutte le persone, finché non
  decido io di pubblicarlo»). Il collegamento a fantatitano.site/gioco è pronto nella PR #114 dell'app
  (`jefebcn/fantasyfootballrsm`, bozza): **non va unita finché Alex non lo dice**. Intanto il deploy di questo repository
  chiede ai motori di ricerca di non mostrarlo (`X-Robots-Tag` in `vercel.json` e `public/robots.txt`): resta
  raggiungibile da chi ha l'indirizzo fantatitano-gioco.vercel.app. **Quando si pubblica** vanno tolti tutti e due,
  se no anche fantatitano.site/gioco resterebbe fuori dai motori di ricerca.

- **Prove.** Quelle automatiche sono fatte in un browser senza scheda grafica; Alex l'ha provato sul
  suo telefono e funziona. Su altri telefoni la fluidità è da verificare: se scatta, abbassare ancora il
  rapporto in `npm run modello` (oggi 0.36 del corpo originale) e rigenerare.
- **Livello degli avversari** tarato solo con partite simulate (`DIFF` in cima a `src/game.js`):
  `node scripts/simula.cjs 64` dopo `npm run build`. Con la squadra di casa che gioca da sola, oggi
  finisce in media 2,4-0,5 a facile, 1,0-0,8 a normale, 0,6-1,2 a difficile, con uno o due falli,
  due cross e meno di un angolo a partita, e un rigore ogni cinque partite circa.
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
