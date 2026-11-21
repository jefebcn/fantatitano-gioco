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
- Risposte di Alex alle domande (21/11, tabella in `docs/home-spec.md` §8). Fatto: tutte le schermate in blu notte e oro
  (variabili su `.scr` in `src/pagina.html`); negozio a quattro schede con stemma a pezzi, disegni speciali, terza maglia,
  avatar, cornici, scarpini, pallone di casa, rinnovo del consigliato (`NEGOZIO` in `src/carriera.js`, prezzi in
  `ECONOMIA.negozio`, `panNegozio` in `src/game.js`); SQL nello schema separato `lapartita`, senza importazione dei saldi.
- Resta: applicare l'SQL (progetto dell'app pubblicata: Alex vuole prima un backup, vedi `docs/home-spec.md` §8.1), logo
  (lime o viola: decide Alex), esultanza del capitano (servono animazioni), immagine di sfondo.
- Testi della partita in un file solo — FATTO: `src/testi.js` (93 chiavi; in testa al file come si aggiunge l'inglese). Nel
  codice `tr('chiave')`, nella pagina `data-t`. La home ha i suoi in `src/casa/testi.js`, stessa forma: unirli è uno
  spostamento. Controllo: `node scripts/prove/testi.cjs chiavi` (in `npm run prova`), `salva` e `confronta` per le scritte.

## Taratura dei tiri del computer (21/11)
- Soglie in `TIRO_IA` (`src/config.js`). Su 16 partite, semi 7-22, difficoltà normale: prima 0,88 gol e 5,44 tiri a partita,
  dopo 1,31 e 7,31 (obiettivi 1-6 e 7-30); 0 anomalie, altre misure invariate. Rapporti: prima e dopo sugli stessi semi.
- Fuorigioco: era 0 su 32 partite perché in possesso le punte restavano una decina di metri dietro l'ultima linea
  avversaria. Ora aspettano sulla linea dell'ultimo difensore (`ATTACCO` in `src/config.js`, `homeOf` in `src/game.js`):
  stesse 16 partite, fuorigioco 0,44, gol 1,00, tiri 7,00, 0 anomalie, tutte le 11 misure dentro gli obiettivi.

## Più gol e più tiri (21/11, obiettivo di Alex: 2–3 gol e 10–12 tiri per squadra)
- Passo 1 FATTO: `TIRO_IA` più pronto, portieri meno forti (`save`), pressing dalla metà campo (`PRESSING.da` da 18 a 0).
  16 partite, semi 7–22: gol da 1,00 a 2,69, tiri da 7,00 a 10,38, 0 anomalie. Tabella in `docs/dls-gameplay.md`.
- Le prove con 6 partite ingannano (lo stesso valore dà da 10 a 15 tiri): si decide solo su 16.
- Passo 2 FATTO: il lancio con le mani del portiere sbagliava 8 volte su 10 (palla ad altezza petto a 20 m/s): ora arriva
  di rimbalzo (`RINVIO.mano`, `vicino`, `rimbalzo`). 32 partite, semi 7–38: gol da 2,31 a 2,56, tiri da 9,53 a 9,84,
  rimesse laterali da 3,3 a 2,3, 0 anomalie.
- Scartati perché non spostano i numeri: reazione ritardata dei difensori al passaggio, passaggi più sicuri, più attesa.
- Prossimo: passaggi presi sull'uomo che riceve (riescono 75 su 100), traversoni (1 su 3), lanci lunghi troppo lunghi.
- Simulazione ripetibile (21/11): modalità di prova `?seme=N` o `__g.prova(N)` (audio spento, semi fissi); lo stato di una
  partita si azzera a ogni partita nuova (`DI_PARTITA`). `RIPETI=1` nello script delle partite lo controlla, anche in CI.
  I numeri di riferimento sono cambiati rispetto a prima (generatori separati): si confronta sempre prima e dopo.

## Prova di Alex su iPhone (21/11): punti in ordine
- 1 e 2 FATTI (PR #82): niente gioco girato a forza, schermata «Ruota il telefono», tastiera e aree sicure, barra di stato
  nascosta (l'app va tolta e rimessa nella Home), levetta che non resta incastrata.
- 3 e 4 FATTI: velocità di partenza di Alex (`VELOCITA`, `CORPO` in `src/config.js`), girare costa velocità in proporzione
  all'angolo (`spingi` in `src/fisica/corpo.js`), stime del computer adattate (`svolta` in `src/game.js`), velocità nel
  riquadro `?debug`. 32 partite: gol da 2,22 a 1,66, tiri da 9,34 a 6,84, 0 anomalie: da ritarare, vedi `docs/dls-gameplay.md`.
- 5 FATTO: tocchi più lunghi col passo (palla tra 0,6 e 0,8 m), guinzaglio a 1,5 m (`COND`), disegno con l'avanzo di tempo
  (`avanzo` in `src/game.js`). 32 partite: gol 1,75, tiri 5,88, 0 anomalie.
- 6, 7, 8 FATTI: `CAMERA.fascia` (pallone tra 30% e 70% dell'altezza), `PRATO` (verde più pieno, strisce più
  contrastate, anelli a metà), pubblico smorzato e vario con tribune più scure (`src/grafica/spalti.js`),
  `GOLSEQ.riquadro` = 0 (provvisorio: Alex non ha scelto). Partite simulate identiche.
- Il punto 9 (giocatori MPFB2) era già fatto con la PR #63.
- Moduli nuovi FATTI: 4-3-1-2, 5-3-2, 4-1-4-1, 3-4-3 in `FORMS`; si provano con `MODULO=… node scripts/prove/partita.cjs`.
- Da fare: scenario del ponte (minuto e punteggio di partenza), poi tutorial e allenamenti; ritarare gol e tiri.

## Due sessioni insieme (dal 21/11)
- Questa sessione lavora sulla **partita** (campo, giocatori, IA, comandi). Un'altra lavora su **home, menu e sezioni**:
  il suo stato è in fondo a `docs/stato-lavori.md`, l'accordo tra le due in `docs/ponte-partita.md`.
- Ponte, passo 1 FATTO: `ponte.avviaPartita(richiesta)` in `src/ponte.js` e `src/game.js`, esito a fine partita con
  `allaFine(esito)`. Prova: `scripts/prove/ponte.cjs` (anche in CI). `gioca()` e `showEnd()` restano finché la home non passa di lì.
- Ponte, passi 3, 4 e 5 FATTI: energia iniziale, otto moduli in `FORMS` (i quattro nuovi li usa solo chi li chiede), scenario
  (`tipo: 'scenario'` con minuto, punteggio e chi batte; nell'esito `partenza`): `docs/ponte-partita.md` §8.2 e §8.3.
  Restano il passo 6 (tutorial, allenamento libero, punizioni, angoli) e i campi ignorati (`altezza`, `fuoriRuolo`,
  `rigorista`, `punizioni`, `angoli`, gol di tipo «angolo»).
- Le schermate della home ora sono in `src/casa/` (dell'altra sessione): non toccarle senza dirlo ad Alex.

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
