# Stato — Fantatitano, La Partita (gioco)
20/11/2026 · tema: verso un gioco fluido "tipo Dream League" (meccaniche sì, grafica/file/codice DLS no)

## Dove siamo
- Produzione: https://fantatitano-gioco.vercel.app (non pubblico, noindex).
- Rete di sicurezza: `npm run partite` (partite riproducibili + obiettivi), `scripts/prove/rigori.cjs`,
  `scripts/prove/fluidita.cjs`, CI `.github/workflows/prove.yml` a ogni PR.
- IA: TENUTA (regola GameplayFootball), PRESSING a due, CALCI (angoli dal gioco, fuorigioco), PASSA.
- Animazioni GameplayFootball: esultanze, rimessa con le mani, testa, scivolata/caduta + rialzarsi, cartellino,
  e ora i movimenti senza palla (partenze col perno, inversioni, frenata dallo scatto: `movimento`/`MOVI`).
- Piedi piantati (src/grafica/piedi.js, IK a due ossa), si spegne a qualità ≥2.

## Piano "fluido come DLS" (deciso con Alex il 20/11, una PR per punto)
1. Animazioni di passaggio senza palla — FATTO (PR #53).
2. Portiere completo — FATTO: pallone al petto, rialzarsi col pallone, prese per altezza (tuffi in 6 zone c'erano già).
   Manca un rinvio di piede al volo dedicato: nessuna clip libera, resta il tiro di Mixamo.
3. Impostazioni grafiche Bassa/Media/Alta/Molto alta, 30/60 fps, preset iniziale dal telefono.
4. Difficoltà continua: parametri da 0 a 1 per difficoltà e valore del giocatore.
5. Ruoli in campo: rigori, punizioni, angoli (oltre al capitano).
6. Hub: nuova dashboard dal disegno di Alex — FATTO (colori Fantatitano, ritratti 3D). Restano avvisi prima di GIOCA e un solo popup.
7. Stadio come requisito di promozione.
Fuori: pubblicità, acquisti in-app, online P2P (gioco non pubblico).

## Modalità partita «come DLS» (richiesta di Alex del 20/11 sera)
- Obiettivo: gameplay il più possibile uguale a Dream League nelle meccaniche; aspetto tutto Fantatitano.
- Fonti: quello che descrive Alex e i suoi video; l'analisi che ha fatto lui resta fuori dal repository e vale solo
  come elenco di categorie. Mai codice, valori, asset, interfaccia, testi o nomi loro. Se un comportamento non è noto: chiedere.
- Passo 1 FATTO: valori di gioco in `src/config.js` (partite identiche prima e dopo).
- Passo 2 FATTO: misure vere (campo, porta, pallone, stature) e telecamera di gioco dalle misure di Alex; controllo
  `scripts/prove/inquadratura.cjs` (sette misure dentro ±2). Effetto: gol ~1,4 e tiri ~6,4 a partita (prima 3 e 9).
- Passo 3 FATTO (20/11, notte): i dati di Alex da 4 video in `docs/dls-gameplay.md`, applicati: comandi (levetta fissa, scatto
  automatico, tre tasti col possesso, pressing), segni in campo, telecamera fissa, interfaccia (tabellone a sinistra,
  minimappa e mentalità a frecce, replay), ritmo (cronometro lento a gioco fermo, conduzione 4,5 m/s), IA in area, portiere,
  palle ferme e sequenza del gol. Domande aperte in fondo a `docs/dls-gameplay.md`.
- Prossimo: risposte di Alex alle domande aperte; tarare la conduzione (4,5 m/s è una stima) e il portiere.
- Prestazioni: 60 fps su iPhone nella webview dell'app, minimo 30.

## Giocatori 3D: corpo nuovo MPFB (Fase 3 del prompt del 21/11) — FATTO
- Corpo MakeHuman/MPFB (CC0, viso generico) sullo scheletro che il gioco usava già: animazioni e codice invariati.
  Tre livelli di dettaglio (4.264 / 1.500 / 600 triangoli, soglie `LOD` in `src/config.js`), forme «snello» e «robusto»,
  sette capigliature, capelli corti, sopracciglia e barba dipinti nello shader, un materiale solo, modello compresso con
  Meshopt (`public/modello.js` da 656 a 329 KB). A fotogramma: ~404 mila triangoli contro ~562 mila di prima.
- Come si rifà: `modelli/mpfb/LEGGIMI.md`. Ripiego: `?corpo=vecchio` nell'indirizzo carica il corpo di Quaternius.
- Non fatto: texture KTX2. Le texture dei giocatori (divisa, zone, rilievo) sono disegnate dal gioco coi colori della
  squadra, quindi non c'è un file da comprimere; maschera e pelle sono due immagini piccole (PNG e WebP).
- Da vedere su iPhone: fps veri con `?debug`.

## Fase 4 (verifica delle sezioni 2-6 del prompt del 21/11) — FATTO
- C'era già tutto tranne due cose, aggiunte ora: la vista di controllo dell'IA (`?ia` o tasto O, `src/debug-ia.js`) e lo
  stacco col logo come fascia diagonale.
- Diverso da DLS per scelta o in attesa di Alex: scritta «GOL!» (non «GOAL!») sui cartelloni; icone dei calci piazzati e
  pulsante replay in alto a destra come segnaposto; clip Mixamo «mani in testa» e «indica» da ricevere; logo: usiamo
  `img/corona-lime.png`, se Alex vuole la corona viola serve il file.
- Da tarare giocando: gol tra computer (0,7-1 a partita), fuorigioco rari, conduzione a 4,5 m/s.
- Prossimo: Fase 5, `docs/home-spec.md` da far approvare ad Alex prima di scrivere codice della home.

## Fase 6 (home nuova) — IN CORSO
- Specifica: `docs/home-spec.md`. Alex (21/11) ha chiesto di non fermarsi ad aspettare: si va avanti con le scelte proposte,
  provvisorie. Fermo solo il database (serve il suo sì esplicito).
- Fatto: home blu notte e oro (gradiente segnaposto al posto della foto di San Marino), barra nuova, carte del disegno, font
  Bebas Neue e Montserrat (OFL), percorso premi, «come guadagnare» e storico, notifiche, allenatore, finanze, avatar,
  qualità grafica e passaggio assistito nelle impostazioni. Economia nuova in `ECONOMIA` (`src/config.js`); ogni entrata e
  uscita passa da `muovi` in `src/carriera.js`. Prove in `scripts/prova-carriera.mjs`.
- Resta: saldo sul server (SQL da far leggere ad Alex), immagine di sfondo (la genera Alex, 3840 × 1800), stemma a pezzi,
  oggetti da comprare coi diamanti, altre schermate nello stesso stile (decisione 7), `docs/stato-lavori.md` alla fine.

## Taratura dei tiri del computer (21/11)
- Soglie in `TIRO_IA` (`src/config.js`). Su 16 partite, semi 7-22, difficoltà normale: prima 0,88 gol e 5,44 tiri a partita,
  dopo 1,31 e 7,31 (obiettivi 1-6 e 7-30); 0 anomalie, altre misure invariate. Rapporti: prima e dopo sugli stessi semi.
- Fuorigioco: era 0 su 32 partite perché in possesso le punte restavano una decina di metri dietro l'ultima linea
  avversaria. Ora aspettano sulla linea dell'ultimo difensore (`ATTACCO` in `src/config.js`, `homeOf` in `src/game.js`):
  stesse 16 partite, fuorigioco 0,44, gol 1,00, tiri 7,00, 0 anomalie, tutte le 11 misure dentro gli obiettivi.

## Decisioni recenti di Alex ancora valide
- "Merge fallo sempre tu": PR → controlli verdi + anteprima Vercel → squash merge → verifica produzione.
- Il gioco non è pubblico finché non lo dice lui (PR #114 dell'app non va unita).
- Somiglianza a Dream League solo nelle meccaniche. Alex ha fatto da sé un'analisi del pacchetto DLS e ha passato due
  documenti: si usano solo come lista di idee generiche; niente nomi, valori, file o altro reverse engineering da parte nostra.
  Non metterli nel repository.

## Attenzione
- `public/anim-gf.js` è a 747 KB (precaricato dal service worker): crescere con giudizio.
- Le modifiche solo grafiche cambiano comunque le partite a parità di seme (la posa delle mani entra nel gioco):
  confrontare medie su 16+ partite. Contrasti vinti oscillano tra 3 e 5 a gruppo di 8.
