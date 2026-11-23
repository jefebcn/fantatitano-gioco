# Stato — Fantatitano, La Partita (gioco)
23/11/2026 · tema: verso un gioco fluido "tipo Dream League" (meccaniche sì, grafica/file/codice DLS no)

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

## Giocatori 3D: corpo MPFB (chat «3D», aggiornato il 23/11/2026)
- Corpo MakeHuman/MPFB (CC0, viso generico) sullo scheletro di sempre: animazioni invariate. Tre livelli di dettaglio
  (4.266 / 1.500 / 600 triangoli), un materiale, texture 1024, `public/modello.js` compresso con Meshopt (376 KB).
  Come si rifà: `modelli/mpfb/LEGGIMI.md` e la ricetta in `docs/RICETTE.md`. Ripiego: `?corpo=vecchio`.
- FATTO (#131): proporzioni da atleta, divisa con volume (maglia, maniche, pantaloncini, risvolto, scarpini con suola),
  viso più scolpito, capelli con ciocche, dal riferimento generico di Alex del 23/11 (niente volti veri né grafica di altri giochi).
- FATTO (#132): varietà, 11 capigliature + rasata, 5 corporature (`FORME_CORPO`), 26 stature (`ALTEZZA.passi`).
  Partite: 0 anomalie, gol 1,88 → 1,50 su 16 partite (la statura conta nel colpo di testa: rimescolamento, media uguale).
- Aperto: pieghe della divisa in una normal map e risvolto dei calzettoni più alto, in `src/divisa.js` (file della
  sessione partita: serve l'ok di Alex). Da vedere su iPhone: fps con `?debug`. Non fatto: texture KTX2 (non servono).

## Fase 4 (verifica delle sezioni 2-6 del prompt del 21/11) — FATTO
- C'era già tutto tranne due cose, aggiunte ora: la vista di controllo dell'IA (`?ia` o tasto O, `src/debug-ia.js`) e lo
  stacco col logo come fascia diagonale.
- Diverso da DLS per scelta o in attesa di Alex: scritta «GOL!» (non «GOAL!») sui cartelloni; icone dei calci piazzati e
  pulsante replay in alto a destra come segnaposto; clip Mixamo «mani in testa» e «indica» da ricevere.
- Logo (deciso da Alex il 21/11): solo la corona gialla su fondo nero, senza scritte. Un file solo,
  `public/img/logo-fantatitano.png` (corona su trasparente: il nero lo mette chi la mostra), più le due icone dell'app.
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
- Resta: applicare l'SQL (progetto dell'app pubblicata: Alex vuole prima un backup, vedi `docs/home-spec.md` §8.1), esultanza del capitano (servono animazioni), immagine di sfondo.
- Testi della partita in un file solo — FATTO: `src/testi.js` (93 chiavi; in testa al file come si aggiunge l'inglese). Nel
  codice `tr('chiave')`, nella pagina `data-t`. La home ha i suoi in `src/casa/testi.js`, stessa forma: unirli è uno
  spostamento. Controllo: `node scripts/prove/testi.cjs chiavi` (in `npm run prova`), `salva` e `confronta` per le scritte.

## Taratura dei tiri del computer (21/11)
- Soglie in `TIRO_IA` (`src/config.js`). Su 16 partite, semi 7-22, difficoltà normale: prima 0,88 gol e 5,44 tiri a partita,
  dopo 1,31 e 7,31 (obiettivi 1-6 e 7-30); 0 anomalie, altre misure invariate. Rapporti: prima e dopo sugli stessi semi.
- Fuorigioco: era 0 su 32 partite perché in possesso le punte restavano una decina di metri dietro l'ultima linea
  avversaria. Ora aspettano sulla linea dell'ultimo difensore (`ATTACCO` in `src/config.js`, `homeOf` in `src/game.js`):
  stesse 16 partite, fuorigioco 0,44, gol 1,00, tiri 7,00, 0 anomalie, tutte le 11 misure dentro gli obiettivi.

## Gol, tiri e difetti della partita (stato al 22/11)
- Obiettivo di Alex: 2–3 gol e 10–12 tiri per squadra, da rivedere quando manda le statistiche di una partita di Dream
  League (tiri per squadra). Fino ad allora NIENTE varianti di gioco. Oggi, 32 partite (semi 7–38): 1,3–1,8 gol e 7,2 tiri
  in tutto, 28 possessi di cui 13 oltre la trequarti, un gol ogni 5 tiri.
- Storia, misure e le venti varianti scartate: `docs/dls-gameplay.md` («Gol e tiri», «Dove si ferma l'azione»).
- FATTO il 21/11: passaggio morbido a chi corre (#96), calci a vuoto e rinvio con le mani del portiere (#102).
- Difetti ancora aperti, nell'ordine deciso: 1) giravolta di scatto (corpo che gira di oltre 120° in un fotogramma,
  `poseSkinned`: «oltre i 150° si gira subito»); 2) parate a distanza (pallone fermato a più di un metro dai guanti);
  3) chi riceve si lascia sfilare il pallone a 1,2–1,4 m (gesto di stop laterale, ma la presa arriva a 1,05 m);
  4) piedi che strisciano nel passo laterale e nei cambi di direzione, portieri che arretrano di corsa.
- Alla ripartenza delle varianti: conduzione in avanti a campo libero, poi difesa meno perfetta (ritardo 0,2–0,3 s sui
  passaggi, linea meno compatta, anticipi sul corto tra 9 e 12 su 100), portiere per ultimo (un gol ogni 4–5 tiri).
- In sospeso da Alex: riprese rapide sì o no (tolgono 11 s di attesa, non danno tiri); tiro lontano o di spalle (segue
  la levetta o va sempre in porta?); cambio automatico del giocatore in difesa; calcio d'inizio che aspetta il passaggio.
- Studio di GameplayFootball, Google Research Football e due giochi più piccoli: `docs/studio-ia.md`, con tre prove
  proposte (smarcamento fuori dall'ombra, inserimento a condizione, tiro a tre bersagli). Aspettano il via di Alex.
- Strumenti: `scripts/prove/diagnosi.cjs`, `registra.cjs`, `rivedi.cjs`, `analisi-partita.py` (righe in `docs/RICETTE.md`).

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
