# Stato — Fantatitano, La Partita (gioco)
23/11/2026 · tema: verso un gioco fluido "tipo Dream League" (meccaniche sì, grafica/file/codice DLS no)

## Dove siamo
- Produzione: https://fantatitano-gioco.vercel.app (non pubblico, noindex).
- Rete di sicurezza: `npm run partite` (partite riproducibili + obiettivi), `scripts/prove/rigori.cjs`, `riprese.cjs`,
  `scripts/prove/fluidita.cjs`, CI `.github/workflows/prove.yml` a ogni PR.
- IA: TENUTA (regola GameplayFootball), PRESSING a due, CALCI (angoli dal gioco, fuorigioco), PASSA.
- Animazioni GameplayFootball: esultanze, rimessa con le mani, testa, scivolata/caduta + rialzarsi, cartellino,
  e ora i movimenti senza palla (partenze col perno, inversioni, frenata dallo scatto: `movimento`/`MOVI`).
- Piedi piantati (src/grafica/piedi.js, IK a due ossa), si spegne a qualità ≥2.

## Schermata di pausa (Alex, 28/11: «migliorare graficamente la schermata quando si stoppa il gioco, i pulsanti e il resto»)
- **FATTO.** In alto il risultato con stemmi e minuto (o «Rigori»); a sinistra i pulsanti grandi con l'icona (Riprendi in
  oro, Sostituzioni, Esci, e col collaudo i due pulsanti piccoli sotto); a destra un pannello con due schede: Tattica
  (moduli 5 per riga, mentalità) e Comandi (le istruzioni a righe, prima erano un muro di testo). Il campo resta dietro,
  sfocato. HTML e stile in `src/pagina.html` (sezione «pausa»), `riempiPausa` e `schedaPausa` in `src/game.js`, testi
  `pausa.*` in `src/testi.js`. Entra senza scorrere in un telefono girato (667×375, 844×390) e su monitor.

## Collaudo con un amico (Alex, 27/11: «un link per un mio amico che lo testa, e ci vengono scritte le problematiche»)
- **FATTO.** Link: https://fantatitano-gioco.vercel.app/?collaudo, ma finché il gioco è privato è acceso per tutti
  (`COLLAUDO.perTutti`, 28/11: Alex entrava dall'icona sul telefono e i pulsanti non c'erano, perché su iPhone l'icona ha
  una memoria sua e non vede cosa ricorda Safari). Si spegne aprendo una volta `?collaudo=0`. **Prima del lancio
  pubblico: `perTutti: false`.** Codice in `src/collaudo.js`, valori in `COLLAUDO` (`src/config.js`), prova
  `scripts/prove/collaudo.cjs` (in CI). Le segnalazioni arrivano su WhatsApp (scelta di Alex): niente server.
- Il gioco controlla da solo, durante la partita, le stesse cose di `diagnosi.cjs` (pallone impossibile, sotto terra,
  lontanissimo, fermo senza nessuno; giocatori teletrasportati, a terra, gesto bloccato, corpo sollevato) più il pallone
  che entra o esce dalla porta attraverso la rete, le riprese del computer che non partono, gli scatti, il gioco lento e
  gli errori nella pagina. In pausa «Segnala un problema» (argomento, due righe, foto del campo) e «Manda il rapporto»
  (anche a fine partita): Condividi del telefono con `rapporto.txt` e le foto. Ogni voce ha la scena: pallone, chi ce
  l'ha, i tre giocatori più vicini e cosa fanno, il pallone negli ultimi 3 secondi.
- Su 8 partite intere col collaudo acceso nessun problema finto. Il rapporto resta sul telefono finché non si manda
  (le foto solo finché la pagina è aperta). Nessun dato personale: telefono, browser, schermo, fotogrammi.

## Portiere: la presa con le mani (amici di Alex col collaudo, 27/11: «problemi col portiere, soprattutto la presa»)
- Misura `scripts/prove/presa.cjs` (a ogni pallone che va in mano al portiere, quanto erano lontane le mani). Prima, 4
  partite: 19 prese, mani dal pallone mediana 0,84 m, oltre 35 cm 17 (89%); il pallone volava da solo tra le mani.
- **Passo 1 FATTO: rimessa dal fondo e palloni che rotolano.** Alex: in Dream League la rimessa dal fondo il portiere la
  raccoglie con le mani. Ora chi prende in mano un pallone basso con le mani lontane prima lo raccoglie (`raccogli` in
  `src/game.js`): va dove le mani della presa a terra lo prendono, si abbassa, e il pallone è in mano quando le mani ci
  arrivano (al più dopo `PARATA.raccoltaMax`). Sul pallone che rotola verso di lui la presa a terra parte in tempo
  (`prevediRaccolta`), sul pallone vagante in area corre fin dove le mani lo raccolgono, e il pallone diventa suo solo
  con le mani a meno di `PARATA.raccogli` (contacts). Si raccoglie solo un pallone lento (`PARATA.lento`): un tiro preso
  in raccolta continuava la corsa dentro la porta e usciva dalla rete (l'ha trovato il collaudo, `collaudo.cjs`). Dopo,
  4 partite: 22 prese, mediana 0,27 m, oltre 35 cm 7 (32%); rimesse dal fondo 10 su 10 con le mani a 25 cm (prima 88).
  Restano i cross (mediana 0,31 m, 3 oltre) e i tiri alti (2, a 0,9 m): passo 2.
  32 partite, semi 7 e 39: nessuna anomalia, tiri 6,72→6,81 e 7,75→8,19, gol 2,34→1,97 e 2,19→2,50, angoli 0,38→0,25
  (sotto l'obiettivo di 0,3) e 0,47→0,50.
- **Passo 2 FATTO: cross, rimbalzi e tiri alti.** Misura su 8 partite: prima 45 prese, oltre 35 cm 12 (27%), tiri
  mediana 0,89 m (2 presi da fermo con le mani a 1,2 e 2 m), cross 4 su 12 oltre. Tre cause:
  1. il gesto si sceglieva con soglie d'altezza spostate di una categoria (a 1 m la parata al busto, con le mani a 1,6 m;
     a 1,3 m la presa alta, con le mani a 2 m). Ora si sceglie la clip con le mani più vicine all'altezza del pallone
     (`clipAllAltezza`; tolti `PARATA.tuffo` e le soglie della presa);
  2. sul cross la presa partita in anticipo non cambiava più, anche se il pallone scendeva o rimbalzava: ora, prima del
     tocco, passa all'altra clip se ha le mani più vicine di `PARATA.cambia` (`prevediPresa`);
  3. il pallone in aria e il tiro preso da fermo diventavano del portiere con le mani dove capitava: ora parte la presa
     all'altezza del pallone, si decide al passo dopo con le mani alzate, e con le mani oltre `PARATA.manca` il pallone
     prosegue (`G.stats.lontane` li conta: 0 in 8 partite).
  Dopo, 8 partite: 40 prese, oltre 35 cm 5 (13%), mediana 0,25 m, cross mediana 0,27 m. 32 partite, semi 7 e 39: nessuna
  anomalia, tiri 6,81→6,94 e 8,19→7,78, gol 1,97→2,13 e 2,50→2,41, angoli 0,25→0,50 e 0,38→0,28.

## Pallone al piede (richiesta di Alex del 25/11): conduzione, calci, contrasti
Alex: «calibrare bene il pallone quando è attaccato al piede; guarda come si muove anche quando viene calciato o c'è un
intervento». Misurato su una partita registrata (seme 7, 200 s) con `scripts/prove/registra.cjs` e un'analisi apposta
(piede più vicino al pallone nell'istante in cui il pallone accelera in avanti; il «piede» è la caviglia, quindi
circa 20 cm è il contatto giusto: è quello dei calci, che il pallone al piede lo portano già).
- **Conduzione: il pallone si muove solo col piede (Alex, 27/11: «anche se fai un 360 la palla non deve seguirti in
  ogni modo, si deve vedere che il calciatore appoggia il piede sulla palla»).** Misurato con
  `scripts/prove/calamita.cjs` (chi gioca conduce in sei modi; si conta la spinta del pallone col piede a più di 30 cm):
  prima fino al 99% della spinta arrivava senza piede (giro veloce), 93% nel giro lento, 89% nello zig-zag, perché
  mentre il piede «arrivava» `guidaTocco` dava al pallone la velocità del giocatore. Ora `guidaTocco`, `avviaTocco` e
  la molla «riprende» non ci sono più: tra un tocco e l'altro il pallone rotola da solo; `prevediTocco` fa partire il
  gesto (tocco in corsa, o taglio oltre `COND.taglia` gradi) quando il pallone arriverà al punto del piede della clip;
  la spinta c'è solo se il piede vero è a meno di `COND.piede` dal pallone, e nell'ultimo decimo la caviglia si allunga
  fino al pallone (`piedeAlPallone`, `raggiungi` in `src/grafica/piedi.js`); `mira` manda il pallone dove il giocatore
  sarà, seguendo la sua curva; nei tagli da 90° in su si frena al passo del gesto (`COND.frena`). Dopo: 0-13% senza
  piede in tutti e sei i modi. Nei giri la corsa segue la levetta un po' meno di prima (giro lento da 2° a 37° di
  scarto medio, inversione da 13° a 18°): il pallone va raggiunto. Gioco, 32 partite su due serie di semi (7 e 39):
  nessuna anomalia, tiri e gol nel rumore (7,41→7,66 e 7,97→7,53; 2,25→2,50 e 2,22→2,16), ma il pallone libero si ruba
  di più: possessi da 30,7 a 36,5 e da 31,6 a 35,3, falli da 1,7 a 2,8 e da 2,3 a 3,4. Dopo un passaggio ricevuto le
  spinte senza piede nel secondo dopo da 11,2 a 2,0 (`scripts/prove/ricezione.cjs`).
- **Stop: FATTO, il pallone cambia strada solo col piede (Alex, 27/11: «vai avanti con lo stop»).** Prima chi riceveva
  prendeva il pallone appena smetteva di avvicinarsi, anche col piede a un metro, e `FIS.controlla` gli cambiava subito
  strada: era la «calamita» dello stop. Ora (`contacts`, `avviaStop`, `smorza` in `moveBall`, in `src/game.js`) chi
  prende il pallone resta lo stesso, ma se il piede è oltre `COND.piede` parte il gesto di stop dalla parte del
  pallone, la caviglia si allunga (`piedeAlPallone`) e il pallone rotola finché il piede non ci arriva: lì si smorza.
  Se in `COND.smorza` secondi non ci arriva non si smorza affatto e lo riprende il tocco di conduzione. Provato prima e
  scartato: non dare il pallone a chi ha il piede lontano (32 partite: tiri da 7,7 a 6,6, passaggi da 44 a 40, palla
  vagante da 5,5 a 8,6 s, anche solo per chi riceve il passaggio). `ricezione.cjs`, 3 partite: piede oltre 30 cm alla
  presa da 36% a 26%, spinte senza piede nel secondo dopo da 1,8 a 1,3 a passaggio (1617 → 997 m/s), dei palloni presi
  lontano 12 smorzati col piede e 19 ripresi col tocco. 32 partite, semi 7 e 39: nessuna anomalia, passaggi 43,9→43,8
  e 44,3→43,9, palla vagante 5,5→5,8 e 6,1→5,3 s, tiri 7,66→6,72 e 7,53→7,75, gol 2,50→2,34 e 2,16→2,19, possessi
  36,5→35,8 e 35,3→38,5, falli 2,8→3,7 e 3,4→3,5. Con lo stop che parte alla presa è venuto fuori un errore raro
  (partita 23 del seme 7): un gesto chiesto e tolto nello stesso passo (calcio caricato, tuffo) lasciava `fxNew` acceso e
  il disegno faceva partire un'animazione inesistente, con la partita ferma. Ora chi toglie `p.fx` spegne anche `fxNew`,
  e `poseSkinned` fa partire solo gesti che esistono. Chi vuole restare fermo col pallone oltre la suola ci va sopra
  (`corri`): serve al portiere sul retropassaggio lento (`retropassaggio.cjs`).
- **Conduzione: FATTO il tocco col piede.** Prima la fisica spingeva il pallone quando decideva lei e il gesto provava a
  indovinare l'istante: piede a 41 cm in mediana, metà dei tocchi oltre 40 cm, 13 spinte senza nessun gesto e 9 nei
  cambi di direzione col piede a un metro. Ora la spinta parte quando il piede della clip arriva sul pallone
  (`o.tocca`, `avviaTocco`, `guidaTocco` in `src/game.js`; `modo` di `FIS.conduci` in `src/fisica/pallone.js`) e
  nell'ultimo decimo di secondo il pallone va dove lo colpisce la clip (`GESTI[nome].palla`), senza scivolare più
  svelto di `COND.guida`. Dopo: 28 cm in mediana, 10 tocchi su 63 oltre 40 cm, nessuno nei cambi di direzione. Di
  riflesso anche i calci: col piede oltre 55 cm da 14 a 4 (due sono rimesse con le mani), senza gesto da 9 a 1.
  Effetto sul gioco, 16 partite (semi 7 e 15): tiri da 7,0 a 9,25, gol da 2,4 a 2,6, **contrasti vinti da 2,2 a 1,1**
  (il pallone più vicino al piede si ruba meno), nessuna anomalia. Da ritarare nel passo dei contrasti.
- **Distanza del pallone in conduzione: tarata sul video di Dream League di Alex (25/11).** Misurato nel video (scala:
  le strisce dell'erba, circa 5,2 m, verificate col cerchio di centrocampo e col pallone): in corsa il pallone sta a
  0,8-1 m davanti ai piedi, a 25-35 cm quando viene toccato, un tocco ogni 0,4-0,6 s; chi conduce va a circa 5 m/s in
  campo aperto, 3 m/s col difensore addosso; chi lo insegue a 4-6 m/s. Da noi il pallone arrivava a 1,5-1,6 m con un
  tocco ogni 0,9-1,1 s: `COND.passo` da 1,22 a 1,12 e `passoScatto` da 1,3 a 1,2. Dopo, in corsa: 0,77 m in mediana,
  9 su 10 sotto 1,17 m, un tocco ogni 0,55 s. Le velocità (`VELOCITA`, `RITMO.conduzione`) sono già in linea col video
  entro il margine della misura (circa 20%): non cambiate. Gioco, 32 partite: nessuna anomalia, contrasti vinti da
  1,13 a 1,38, passaggi in avanti riusciti da 9,9 a 11,0, tiri da 8,0 a 7,7, gol da 2,34 a 1,97 (al limite del
  rumore: da tenere d'occhio, l'obiettivo è 4-6). La prova 8 di `scripts/prova-fisica.mjs` voleva il pallone oltre
  0,9 m a 7 m/s: soglia portata a 0,7 m (incollato vorrebbe dire sotto la suola, 0,55 m).
- **Contrasti in piedi: FATTO col gesto.** Prima il pallone passava al difensore entro 1,15 m senza nessun gesto. Ora
  quattro clip di GameplayFootball (`interfere`: da fermo davanti e di lato, in corsa allungando la gamba, in scatto,
  col destro e col sinistro, `contrasto*` in `public/anim-gf.js`, aggiunte con `scripts/gfootball.mjs` senza rigenerare
  le altre); l'intervento parte solo se, all'arrivo del piede, il pallone sarà a portata della gamba, e l'esito si
  decide nel fotogramma del contatto (`avviaContrasto`, `piedeContrasto`, `gambaContrasto` in `src/game.js`, valori in
  `CONTRASTO`). Frequenza scelta su 32 partite per variante: con `ritmo` 2 i contrasti vinti scendevano da 1,03 a
  0,59 e i gol da 2,6 a 2,1; con 4 contrasti 0,88, gol 2,59 (uguali), tiri 7,8 invece di 8,8, interventi a segno 58%;
  con 6 contrasti 1,16 ma un intervento su due a vuoto.
- **Difensori un po' più sul portatore: FATTO** (Alex il 25/11: «poco, non eccessivamente»). Contati fotogramma per
  fotogramma su 16 partite: chi ha la palla la tiene 1500 s, un difensore è a portata d'intervento solo per 23 s
  (1,5%); lì l'intervento parte spesso e va a segno tre volte su quattro. Il limite è arrivare a portata, e più
  pressione non lo allunga: il portatore passa prima. Provate su 32 partite (o 16) e scartate: attesa del primo uomo un
  quarto più corta (`wait`), distanza a cui si temporeggia 2,0 e 1,8 m (`DEF.hold`), accompagnare a 4,5 m invece di 6,5:
  nessuna più contrasti, alcune meno. Scelto `PRESSING.da` 10: il primo uomo va sul portatore anche nei primi 10 m
  della metà avversaria, non solo dalla metà campo. 32 partite: nessuna anomalia, portatore libero dal 43% al 40%,
  contrasti vinti da 1,38 a 1,47, falli da 0,56 a 0,81, tiri da 7,7 a 6,8, gol da 1,97 a 2,16.
- **Avversari che vanno sul pallone: CORRETTO** (video di Alex del 25/11 sera: «gli avversari non attaccano mai il
  pallone», «deve funzionare come Dream League»). Due cause. Col pallone nella metà di chi attacca il primo uomo lo
  accompagnava a 6,5 m e basta: ora, se il portatore è il giocatore comandato da chi gioca, il computer va sul pallone
  in tutto il campo (`PRESSING.utente`). E chi andava sul pallone non puntava il portatore ma un punto spostato verso la
  propria porta del 5% della distanza dalla porta, tre metri a metà campo: il difensore restava lì e non arrivava mai
  (`chase` in `src/game.js`). Ora lo spostamento è fisso, `DEF.porta` 0,8 m. Era questa la causa dei pochi contrasti
  (il difensore a portata solo l'1,5% del tempo). Prova del video, portatore di lato vicino a metà campo: prima nessun
  intervento in 8 s, avversario fermo a 6-7 m; dopo un intervento in tutte le prove (`scripts/prove/pressing.cjs`, ora
  anche nella CI). 32 partite computer contro computer: contrasti vinti da 1,47 a 3,97, falli da 0,81 a 1,84, tiri da
  6,8 a 8,3, possessi da 25 a 29, gol 2,2 uguali, nessuna anomalia.
- **Altri problemi del video di Alex del 25/11 sera**, uno per PR:
  - Segnalino: FATTO. Ora la sua punta è l'ancoraggio e sta `SEGNI.sopra` (0,45 m) sopra la testa a ogni distanza;
    prima 0,6 m da lontano e 0,47 da vicino. Differenza piccola: in Dream League è circa mezzo metro; nel video sembrava
    staccato soprattutto perché dietro la testa c'erano subito i cartelloni.
  - Comando dopo un passaggio: FATTO. Il passaggio dava il comando al destinatario, ma il cambio automatico a palla
    libera lo riportava subito a chi aveva passato (il pallone gli era ancora vicino). Ora non interviene mentre il
    nostro passaggio va al giocatore comandato (`scripts/prove/comando.cjs`, anche nella CI).
  - Punizione: FATTO. Come angoli e rimesse: dissolvenza, tutti al loro posto, comandi dopo 1,9 s; prima 2,7-5,2 s
    camminando. Vale anche per il fuorigioco. 29 partite: nessuna anomalia, numeri come prima. Il rigore aspetta
    ancora 7-12 s che tutti escano dall'area camminando: da chiedere ad Alex.
  - Inquadratura vicino alla linea lontana: NON cambiata. Nel video di Dream League di Alex, col gioco vicino alla
    linea lontana il pallone sta al 15% dell'altezza dello schermo; da noi al massimo al 30% (`CAMERA.fascia`).
- **Calci: FATTO.** Due casi rimasti. I piazzati del computer (angoli, punizioni dirette, rigori) chiamavano il calcio
  direttamente: il pallone partiva subito e il gesto arrivava dopo, col piede ancora lontano; ora passano da `prepara`
  come gli altri calci (chi batte sta già a mezzo metro, dove le clip da fermo colpiscono). Il tiro su un pallone alzato
  da un rimbalzo faceva saltare il pallone giù al piede: ora il calcio aspetta che scenda a `CARICO.aria`. Partita
  registrata col seme 15: nessun calcio col piede oltre 55 cm (prima uno a partita) e nessuno senza gesto; restano
  segnalate solo le rimesse laterali, che si battono con le mani.
- **Partita ferma per sempre: CORRETTO** (difetto vecchio, emerso misurando). Sulle punizioni e sui rigori chi batte
  veniva scelto prima delle sostituzioni automatiche di `restart`: se usciva proprio lui il pallone andava a un giocatore
  non più in campo, nessuno lo muoveva e, col cronometro fermo durante la palla ferma, la partita non finiva più. Ora,
  se chi doveva battere è uscito, batte il compagno più vicino.

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
  (11.848 / 1.500 / 600 triangoli: il primo solo entro 22 m, cioè primi piani e replay), un materiale, texture 1024,
  `public/modello.js` compresso con Meshopt (648 KB), capelli a 1.500 triangoli.
  Come si rifà: `modelli/mpfb/LEGGIMI.md` e la ricetta in `docs/RICETTE.md`. Ripiego: `?corpo=vecchio`.
- FATTO (#131): proporzioni da atleta, divisa con volume (maglia, maniche, pantaloncini, risvolto, scarpini con suola),
  viso più scolpito, capelli con ciocche, dal riferimento generico di Alex del 23/11 (niente volti veri né grafica di altri giochi).
- FATTO (#132): varietà, 11 capigliature + rasata, 5 corporature (`FORME_CORPO`), 26 stature (`ALTEZZA.passi`).
  Partite: 0 anomalie, gol 1,88 → 1,50 su 16 partite (la statura conta nel colpo di testa: rimescolamento, media uguale).
- FATTO (#135): pieghe di maglia e pantaloncini nella normal map calcolata dal gioco (`pieghe()` e `PIEGHE` in
  `src/divisa.js`: vita, ascelle, maniche, inguine, orlo; coordinate della maschera lisciate perché a 8 bit fanno gradini),
  risvolto dei calzettoni da 4 a 8 cm (`MISURE.risvolto` 0,355 e `risvolto` in `scripts/blender/calciatore.py`).
  Stessi triangoli, nessun file nuovo. Partite: 16 su 16 identiche prima e dopo (semi 7 e 15), 0 anomalie.
  Foto: `docs/calciatore/16-18`. Da vedere su iPhone: fps con `?debug`. Non fatto: texture KTX2 (non servono).
- FATTO (#171): più dettaglio come la foto di riferimento di Alex. Il livello vicino passa a 11.848 triangoli (si vede solo entro
  22 m: in partita in media 2,15 giocatori per fotogramma, al massimo 18 nelle inquadrature strette), capelli a 1.500,
  parastinchi sotto il calzettone (`VOLUME.parastinchi`), due nastri sui calzettoni (`MISURE.nastri`). Texture sempre 1024.
  Partite (semi 7 e 15, 8+8): 0 anomalie, gol e tiri uguali come media; non più identiche perché il modello nuovo ha il punto
  più basso diverso e il gioco lo riscala dello 0,1%. Rifatte sopra main dopo il merge (seme 7, 8): gol 2,75 → 2,38, tiri
  8,12 → 8,50, 0 anomalie prima e dopo. Foto: `docs/calciatore/19-21`. Ancora da fare: capelli ricci
  sfaccettati da vicino, parastinchi poco visibili di fronte, fps su iPhone con `?debug`.

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

## Gol, tiri e difetti della partita (stato al 23/11)
- Obiettivi di Alex (23/11, dalle sue statistiche di Dream League, abbassati per computer contro computer): 10–14 tiri,
  4–6 gol (35–45 tiri in gol su 100), 30–45 passaggi per squadra. Sono in `scripts/prove/partita.cjs` e `diagnosi.cjs`.
- Oggi, su 64 partite (semi 7–70): 7,5 tiri (5 da vicino), 2,45 gol, 32 tiri in gol su 100, 36 passaggi per squadra,
  11–12 possessi su 27 oltre la trequarti. Prima del 23/11: 6,4 tiri e 1,75 gol.
- FATTO il 23/11 (giro sull'IA, tabella e lezioni in `docs/studio-ia.md`, crediti in `docs/crediti.md`): smarcamento col
  voto di chi passa (`votoPassaggio`, `puntoVoto`, `SMARCA`), inserimento a condizione (`INSERIMENTO`), mira a tre
  bersagli (`TIRO_IA.bersagli`), portiere un po' più debole (`save` 0,42 e 0,44), rete che non lascia più uscire il
  pallone di lato, schermo giusto dopo la rotazione su iPhone (#109).
- Scartati dopo la misura: tre bersagli come soglia del tiro (restavano solo colpi di testa), campo di forze in
  conduzione, premio «avanti a campo libero», portiere molto più debole. Le venti varianti di prima: `docs/dls-gameplay.md`.
- Regola imparata: guardare i tiri di piede e di testa separati (`scripts/prove/tiri.cjs`), non solo il totale.
- Da dove ripartire: i tiri in più sono tutti colpi di testa (da 1,4 a 4,6 a partita), quelli di piede sono rimasti 4,3:
  servono palloni rasoterra a chi si inserisce e meno tiri da 20 metri ribattuti; poi difesa meno perfetta (ritardo 0,2–0,3 s sui
  passaggi, linea meno compatta, anticipi sul corto tra 9 e 12 su 100).
- Difetti della lista, nell'ordine deciso (aggiornato il 25/11, misure sulla partita registrata col seme 7):
  1) giravolta di scatto: FATTO (#194, #195). Il corpo non resta più girato al contrario dopo un'inversione ripensata
  e oltre i 150 gradi gira svelto ma non di colpo (`MOVI.corpo`); chi passa si gira mentre carica il calcio. Girate di
  colpo da 32 a 22, oltre 90 gradi da 12 a 0. 2) parate a distanza: FATTO (#196), il pallone rimbalza quando arriva
  alle mani (`PARATA.mani`, `PARATA.manca`); gol da 2,13 a 2,41. Prese sui cross FATTE: la presa parte in anticipo (`prevediPresa`, `PARATA.portata`) e il pallone
  si ferma quando arriva alle mani; su 20 cross di prova da 1,14 a 0,48 m dalle mani. Pugni FATTI: partono
  dalle mani della presa preparata (0,4 m), con la clip della presa invece del colpo di testa. 3) chi riceve si lascia sfilare il pallone: lo stop scattava a 1,05 m dal corpo, a circa un metro dal
  piede; ora aspetta che il pallone arrivi al piede (`PASSAGGIO.piede`) e il gesto parte in tempo per quel punto.
  Distanza piede-pallone alla presa da 0,96 a 0,51 m (0,40 col gesto di stop); su 32 partite gol da 2,19 a 2,53, tiri
  da 7,28 a 7,94. Le andature di ogni figura partono da un punto che dipende solo da chi è (`fase` in `makeSkinned`):
  prima la posa cambiava con la partita giocata prima e la partita rigiocata non finiva uguale.
  4) piedi che strisciano nel passo laterale e nei cambi di direzione: il passo laterale FATTO, chi temporeggia guarda
  il pallone solo sotto i 2,4-2,9 m/s, più svelto si gira e corre (`DEF.laterale`): appoggio di lato da 27,7 a 6,3 s,
  metri strisciati da 59 a 14 (seme 7). Cambi di direzione FATTI: l'inversione col perno parte solo fino a 1,4 volte
  la velocità della sua clip (`MOVI.invertiV`), più svelto il giocatore resta nella corsa; metri strisciati nelle
  inversioni da 52 a 13 (seme 7). Alex (26/11): in DLS chi inverte o curva perde poca velocità; `CORPO.perde` da 1 a
  0,3 (curve 93%, inversioni 81%). Costo: in corsa i piedi strisciavano di più (0,46 -> 0,60 m/s): FATTO, chi corre ha
  il corpo disegnato verso dove va la corsa (`MOVI.segui`), corsetta 0,60 -> 0,31 m/s, corsa 0,60 -> 0,49 (seme 7).
  Rimesse laterali scese da 1,6 a 0,9 a partita con le curve svelte: Alex (26/11) dice che in DLS il pallone che esce si
  rincorre sempre; gioco invariato, obiettivo delle prove da 1,5 a 0,6. Portieri che arretrano di corsa: FATTO
  (#193, `PORTIERE.gira`), da 9 corse all'indietro a 1.
- Risposte di Alex del 26/11: riprese rapide sì (`FERMI.comandi`, `FERMI.cpu`, `FERMI.inizio`, `RINVIO.attesa`); tiro e
  passaggio seguono sempre la levetta, il cross solo col passaggio alto; il calcio d'inizio aspetta chi gioca (lo fa già).
  Cambio del giocatore in difesa: solo col tasto, come già fa il gioco.
- Grafica e flusso del 26/11: segno sopra il portiere col pallone in mano; pallone nuovo (icosaedro troncato, 1,3×);
  esultanze: i 3 compagni più vicini vanno dal marcatore, primo piano verso il pubblico (`GOLSEQ.lato`, `compagni`,
  `posti`), esultanze Mixamo facoltative in `GOLSEQ.esultanze` (file da scaricare: elenco in docs/dls-gameplay.md).
  27/11: dentro vittoria, pugno, ginocchio, applauso, tifo (manca braccia larghe); `scripts/animazioni.mjs` ora prende
  la presa più lunga di ogni FBX (in vittoria.fbx la prima, «Take 001», è vuota). 32 partite identiche a prima.
- Strumenti: `scripts/prove/diagnosi.cjs`, `tiri.cjs`, `registra.cjs`, `rivedi.cjs`, `analisi-partita.py` (righe in
  `docs/RICETTE.md`).

## Video di Alex del 23/11 sera: quindici punti, una PR per punto
- Elenco completo nel messaggio di Alex (priorità 1 riprese, 2 palla e passaggi, 3 luci e campo, 4 telecamera,
  interfaccia, animazioni). Alla fine: video di 30 s con calcio d'inizio, punizione e rimessa.
- 1, 2, 3 FATTI insieme (stessa regola, stesso meccanismo): nessuna ripresa parte da sola. `G.attesa`, `aspetta`,
  `attesaPasso`, `postoFermo` in `src/game.js`; valori in `FERMI`; prova `scripts/prove/riprese.cjs` (anche in CI).
  32 partite, semi 7–38: 0 anomalie, tiri e gol dentro il rumore. Dettagli in `docs/dls-gameplay.md` §7.
- Da chiedere ad Alex: se sulla rimessa dal fondo il pallone va a terra.
- 4 FATTO: pallone disegnato fino a 1,7 volte più grande quando la telecamera è lontana (vero nei primi piani), più
  chiaro, ombra a disco scuro dal bordo netto (`PALLA_VISTA`, `mettiPalla` in `src/game.js`, usata anche dal replay).
  Solo grafica: partite identiche.
- 5 FATTO: la causa era la levetta. Chi riceve va da solo sul pallone, ma con la levetta tenuta mirava a un punto
  spostato di 1,4 m, oltre la distanza di presa (1,05 m): gli correva accanto senza toccarlo. Ora 0,5 m
  (`PASSAGGIO.incontro`). In più, a palla libera il comando passa a chi la può prendere prima (`CAMBIO`). Prova:
  `scripts/prove/vagante.cjs` (prima 4 direzioni su 8 fallivano). Partite tra computer identiche.
- 6 MISURATO, da decidere con Alex: `scripts/prove/passaggi.cjs` dice che a campo libero nessun passaggio è corto o lungo
  (10 m: parte a 11,7 m/s, arriva a 8,9 in 0,67 s; 30 m: parte a 23,2, arriva a 13,5 in 1,30 s). I valori di Dream
  League non li sappiamo: chiesto ad Alex se li vuole più forti o più lenti. Non si tocca finché non risponde.
- 9 FATTO: il prato ha solo strisce dritte, uguali su tutto il campo; tolti gli anelli attorno al centrocampo e gli
  scacchi nel cerchio (`src/grafica/campo.js`, `PRATO` in `src/config.js`).
- 7 FATTO: l'alone biancastro e i cunei chiari erano i fasci di luce dei fari, disegnati fino a terra: la telecamera ci
  guardava attraverso. Ora si spengono in aria vicino al tetto e sono più leggeri; un po' più di luce diffusa sui
  giocatori. Le chiazze biancastre erano i riflessi dei quattro faretti d'angolo sull'erba: ora sono deboli e la luce
  viene dall'alto, uguale su tutto il campo (`NOTTURNA` in `src/config.js`, `src/grafica/luce.js`).
- 8 FATTO: in notturna ogni giocatore ha l'ombra corta e morbida sotto i piedi più quattro ombre leggere a croce, una
  per faro (`NOTTURNA.croce`, `dettagliFigure` in `src/game.js`: una sola chiamata di disegno). I cunei erano i fasci
  di luce del punto 7, non ombre dello stadio.
- 10 FATTO: i cartelloni si disegnano su una tela doppia (`LED.tela`), filtrata al massimo, e di notte sono un po' meno
  accesi (`NOTTURNA.cartelloni`): senza l'alone luminoso le scritte piccole che scorrono non sfarfallano più.
  Da confermare sull'iPhone di Alex: qui si vede solo la foto ferma.
- 11 FATTO: la telecamera non scende (resta a 12,5 m): sulla linea laterale vicina sale sopra la tribuna e le prime file
  spuntavano in basso. Ora quella tribuna non si disegna quando la telecamera le è sopra (`CAMERA.spalle`,
  `spalle` in `src/grafica/spalti.js`); il cambio avviene quando è ancora fuori dallo schermo.
- 12 FATTO: un solo segnalino, sul giocatore comandato (quello grigio sul compagno è spento: `SEGNI.grigio`); il nome
  dell'avversario col pallone si nasconde quando finirebbe sopra nome o segnalino del comandato (`SEGNI.largo`,
  `sopraIlNome` in `src/regia.js`); lettere col bordo scuro, leggibili anche davanti ai cartelloni.
- 14 FATTO: il controllo delle divise c'era già (gli ospiti cambiano maglia se è vicina a quella di casa), ma guardava
  solo maglia contro maglia: ospiti blu con le maniche gialle contro una squadra gialla passavano. Ora nemmeno disegno,
  maniche e calzettoni degli ospiti possono avere il colore della maglia di casa (`DIVISE`, `pickKits`). Prova:
  `scripts/prove/divise.cjs`, nelle prove automatiche (prima 29 coppie su 342 sbagliate, ora 0).
- Riprese, difetto trovato nel video finale: un avversario col posto appena oltre i 9,15 m si fermava un palmo dentro la
  distanza e la punizione aspettava a vuoto 8 secondi (`FERMI.arrivo`) prima di dare i comandi. Ora gli avversari stanno
  mezzo metro oltre la distanza (`postoFermo`). Caso aggiunto a `scripts/prove/riprese.cjs` (limite 5 s).
  Resta lento il calcio d'angolo (si può battere dopo circa 10 s: si aspettano i saltatori): da decidere con Alex.
- 13 FATTO (risposta di Alex del 24/11): in difesa A = «Scivolata», come in Dream League; B = pressing col contrasto
  in piedi (c'era già); C = cambia giocatore.
- 15 MANDATO: video rallentato (3 volte più lento) di corsa, cambio di direzione, passaggio, stop e tiro, più il video
  finale di 30 s (calcio d'inizio, punizione, rimessa: nessuna parte da sola). Si aspetta il giudizio di Alex. Visto al
  rallentatore: nel tiro il pallone sembra partire un attimo prima della gamba. FATTO il 26/11: il gesto del tiro ha solo 4 fotogrammi
  per partire e un tocco di conduzione, uno stop o un taglio non ancora arrivati al pallone lo bloccavano: al colpo partiva
  la clip dall'inizio, 3 fotogrammi indietro. Ora il calcio li interrompe (`calciCaricati`), e il pallone del tiro sta dove
  passa il collo del piede nella clip (`CARICO.tiro`). Dita del piede dal pallone nel tiro: da 22 a 9 cm; nessun passaggio
  usa più la clip di riserva. 32 partite: gol 1,97 -> 2,00, tiri 7,75 uguali, 0 anomalie. Prova: `scripts/prove/contatto.cjs`.
  Resta il passaggio corto da palla ferma: chi batte sta dietro il pallone verso la porta avversaria e si gira verso il
  compagno, il pallone gli resta 55 cm di lato e il piede lo manca di 25 cm. Alex (26/11): in Dream League calcia da
  fermo, già sistemato. FATTO: sul calcio d'inizio, sulla punizione indiretta e sul fuorigioco chi batte gira attorno al
  pallone, coi passi laterali, fino al posto del passaggio da fermo verso dove mira (la levetta per chi gioca, il compagno
  scelto per il computer: `sistemaBattitore`, `FERMI.giro`, `vicino`, `scivola`, `posto`, `sistema`); calcia col destro.
  Tocco e punto del passaggio da fermo misurati sul nostro scheletro (`CARICO.passaFermo`: GameplayFootball diceva 0,35 s,
  il piede arriva a 0,42). Pallone di lato da 55 a 12 cm, piede sul pallone 1 fotogramma dopo la partenza (erano 9).
  Il computer batte dopo 0,55-0,65 s, 0,9 s sul calcio d'inizio e con un avversario vicino (prima 0,52-0,57).
  Lezione: il computer all'inizio passava al compagno scelto quando l'attesa cominciava, quasi un secondo prima del
  calcio, coi compagni non ancora al loro posto: su 96 partite (semi 7-102) un tiro in meno a partita, soprattutto da
  fuori. Ora quel compagno serve solo a dove sistemarsi; al calcio sceglie di nuovo.
- Retropassaggio (Alex, 27/11: in Dream League il portiere lo stoppa coi piedi e lo comandi tu): quando il pallone arriva
  al portiere da un calcio di un compagno (non di testa, non da una rimessa, non deviato) il portiere gli va incontro, lo
  stoppa al piede e non lo prende con le mani (`retropassaggio`, `alPiede`, `p.piedi` in `src/game.js`). Quello di chi
  gioca passa al comando: si muove con la levetta, passa, lancia, e gli avversari possono rubarglielo; quando il pallone non
  è più suo il comando torna al compagno più vicino. Quello del computer lo passa dopo 0,5-0,9 s, o lo rinvia lungo da
  terra se è pressato (`gkPiedi`, `PORTIERE.piedi`). Il computer non passa mai indietro al portiere (`bestPass` lo
  esclude): cambia solo per i palloni dei compagni che gli arrivano. Prova: `scripts/prove/retropassaggio.cjs`.

## Risposte di Alex del 24/11 e nuovo video (riprese-30s)
- Tasti in difesa: A «Scivolata», B pressing e contrasto in piedi, C cambia giocatore. FATTO (vedi punto 13 qui sopra).
- Passaggi: restano così, se ne riparla dopo averci giocato.
- Cronometro: FATTO per il calcio d'inizio dei due tempi (fermo a 00:00 e a 45:00 finché non si batte:
  `G.inizioTempo` in `src/game.js`, controllato da `scripts/prove/riprese.cjs`). Sulle altre riprese va ancora, più
  piano (`RITMO.fermo`: 3,5 volte il tempo vero contro 22,5 in gioco). Alex il 25/11: «anche le altre, ma non
  totalmente fermo»: è già così, resta com'è. Punto chiuso.
- Calcio d'angolo e rimessa laterale: FATTO. Dissolvenza scura e stacco sul punto di battuta; a metà, a schermo nero,
  ognuno viene messo al suo posto (`piazzaFermi` in `src/game.js`), poi si batte: comandi dopo 2 s (prima 10,5 s
  sull'angolo e 5,2 s sulla rimessa), il computer dopo 3. La dissolvenza ora segue il tempo di gioco (`buio`), così il
  nero coincide con lo spostamento anche se il telefono rallenta. `scripts/prove/riprese.cjs` controlla i 3 s e che
  dopo lo stacco nessuno salti da un punto all'altro.
  La telecamera dell'angolo va bene così (Alex, 25/11).
- Lanci lunghi: FATTO. La telecamera sale col pallone in volo, che resta sotto `CAMERA.cielo` (altezza dello schermo).
- Alone bianco sul bordo sinistro: FATTO. Erano ancora i riflessi dei quattro faretti d'angolo sull'erba: ora sono
  spenti (`NOTTURNA.faretti` a 0); la luce dall'alto resta uguale.
- Icone in alto a destra: FATTO. Resta solo la maglia, a ogni palla ferma: mette in pausa e apre le sostituzioni; «Fatto»
  porta alla pausa, dove si cambia il modulo. Mano e mirino tolti finché Alex non dice cosa devono fare.

## Seconda risposta di Alex del 24/11 (dopo il video «angolo-rimessa-30s»)
- Rimessa laterale coi piedi in campo: FATTO. Chi batte sta 40 cm fuori (`RIMESSA.linea`), col pallone in mano dietro la
  riga; rientra in campo quando lo lancia. `scripts/prove/riprese.cjs` lo controlla.
- «Fanno gol e danno il rinvio dal fondo»: in 10 partite simulate nessun gol vero non assegnato; trovati invece molti
  tiri a 10-60 cm dal palo o appena sopra la traversa. Il pallone spariva sulla linea, la rete si muoveva lo stesso e
  partiva il replay della grande occasione: sembrava gol. FATTO: il pallone uscito si vede andare fuori per
  `FERMI.uscita` secondi (`G.fantasma`, solo disegno), la rete da fuori si muove solo se toccata (`Porta.urtaFuori`), il
  replay parte dopo e lo mostra uscire. Da chiedere ad Alex se era questo, o se il tabellone aveva segnato il gol.
- Calcio d'angolo: FATTO. Telecamera bassa dietro chi batte (`ANGOLO_CAM`), si vedono lui, bandierina, area e porta; la
  levetta segue lo schermo (in su è verso l'area), anche dall'angolo sul lato lontano.
- Levetta su rigore e punizione: FATTO (Alex il 25/11: in Dream League è come sull'angolo). Anche lì segue lo schermo
  (`gira` in `inquadratura`, `src/game.js`): in su è verso la porta, a destra e a sinistra si sceglie il palo. Vale per
  il rigore, per i calci di rigore finali e per la punizione con la barriera; le altre punizioni restano con la
  telecamera di gioco. `scripts/prove/rigori.cjs` lo controlla nei due tempi.
- Divise troppo simili: FATTO. Oltre alla distanza di colore, le due maglie devono differire in chiarezza di almeno
  `DIVISE.chiaro` (una chiara e una scura): gli ospiti passano alla seconda maglia, poi bianca o nera. Prima 147 coppie
  su 240 avevano maglie chiare quasi uguale (rosso contro blu, verde contro blu). `scripts/prove/divise.cjs` lo controlla.

## Stadi per divisione (richiesta di Alex del 24/11): fatti tutti e tre, con la presentazione prima del calcio d'inizio

Tre stadi secondo la divisione di chi gioca in casa: **paese** (Esordienti, Borghi), **medio** (Contrade, Cadetta),
**grande** (Sammarinese). Numeri in `STADI` (`src/config.js`); `src/grafica/spalti.js` costruisce i tre dagli stessi
pezzi (quattro lati, anelli di gradoni, tetto), `src/grafica/dintorni.js` quello che c'è fuori, e `alzaStadio` in
`src/game.js` cambia stadio sotto la schermata delle due squadre. Prova: `?stadio=paese|medio|grande` nell'indirizzo,
con `&alto` per la vista dall'alto e `&fps` per il contatore dei fotogrammi al secondo.

- **La divisione arriva dalla home** (`docs/ponte-partita.md` §11.1, campo `stadio` nella richiesta): le squadre vere
  giocano nel grande, le altre nello stadio della loro divisione. Senza il campo si gioca nel medio.
- **Telecamera**: il muretto sta alla stessa distanza dalle linee in tutti e tre (`STADI.dist`) e il primo anello non è
  mai più ripido di prima, quindi le regole di `CAMERA.spalle` e `zMax` valgono uguali. Le tribune non sono state
  avvicinate: per farlo vanno spostati cartelloni e panchine e rifatta la misura dell'inquadratura.
- **Dalla telecamera di gioco gli stadi si somigliano**: guarda in giù, e della tribuna di fronte entrano solo le
  prime file (2-5 m). Alex ha chiesto, dopo i tre stadi e in una PR a parte, una presentazione dello stadio prima del
  calcio d'inizio (giro di 5-6 s, saltabile con un tocco) e lo stadio visibile nei replay dei gol.
- **Grande, dettagli fatti** (risposte di Alex del 24/11): conca con gli angoli curvi (`chiuso.raggio`, `spicchi`);
  tetto ad anello che copre tutte le tribune fino al bordo del primo anello, con costole sopra e lame sulla parete;
  fascia LED continua che scorre piano con FANTATITANO, CALCIO SAMMARINESE e i nomi delle due squadre nei loro
  colori; palchi con le vetrate accese; fuori piazzale, strada ad anello, parcheggi, lampioni e palazzi con le
  finestre accese di notte. 58.852 tifosi disegnati su 75 mila dichiarati; in vista di gioco 166 chiamate di disegno
  e 421 mila triangoli, contro 140 e 348 mila del medio.
- **Fotogrammi al secondo sul telefono di Alex** (video del 24/11, stadio grande, risoluzione 2.00x, qualità 0, con
  la vista `?ia` accesa): 56-61 in gioco. Un solo calo a 22 per un secondo subito dopo il gol: tre fermi in fila
  (0,32 + 0,10 + 0,23 s) mentre la scheda grafica preparava per la prima volta una cinquantina di immagini e due
  materiali (tribune, striscioni, gente a bordo campo, numeri e stemmi dei primi piani). Ora `scalda` in `src/game.js`
  disegna tutto una volta prima del calcio d'inizio, sotto la schermata delle due squadre: al gol restano solo i
  cartelloni e il tabellone che cambiano scritta.
- **Riprova di Alex (24/11, dopo `scalda` e la presentazione)**: grande, minimo 31 dopo il gol (prima 22); medio,
  minimo 39. Cala ancora e non si sa dove: il minimo degli ultimi dieci secondi non dice se è uno scatto o una ripresa
  pesante. Sospetti, non provati: il replay da dietro la porta, allargato nella PR #177, disegna nel grande 252
  chiamate e 599 mila triangoli contro 169 e 345 mila del gioco; il giro da fuori 282 e 514 mila. Per saperlo il
  contatore di `?fps` ora scrive, per giro, gioco, gol e replay, il secondo peggiore e il fotogramma più lungo
  dall'inizio della partita (`fasePerf` in `src/game.js`, `contatore` in `src/prestazioni.js`). Serve una foto di Alex
  dopo un gol col replay finito; solo dopo si decide cosa alleggerire.
- **Foto di Alex col contatore nuovo (25/11, grande, risoluzione 2.00x, qualità 0)**, scattata durante il primo piano
  del gol: 60 fps, minimo 60; giro 59 (22 ms), gioco 56 (86 ms), gol 60 (20 ms). Nessun calo nel giro né al gol: lo
  scatto dopo il gol è sparito. In gioco un solo fotogramma da 86 ms. I 31 e 39 di prima non si sono ripetuti:
  probabile che il vecchio minimo contasse anche la costruzione dello stadio a inizio partita, che ora è esclusa.
  Mancava il numero del replay (la foto è prima che partisse): Alex l'ha poi guardato e ha risposto «il numero va
  bene, è tutto ok» (25/11), senza dire la cifra. Punto chiuso: non c'è niente da alleggerire.
- **Medio, dettagli fatti**: tetti che salgono verso il campo (`tetto.sale`) con la fronte nei colori di casa, il sotto
  illuminato di notte e una fila di luci sotto il bordo; tabellone col risultato vero (`SPALTI.punteggio`, vale anche
  per i maxischermi del grande); torri faro a traliccio con la griglia dei proiettori; da fuori una fascia coi colori di
  casa in cima ai muri e i portoni (`esterno`).
- **Tribune fuori inquadratura non disegnate** (`SPALTI.inquadra`, chiamata prima di ogni disegno): la tribuna alle
  spalle della telecamera di gioco è lunga quanto il campo e il controllo a sfere di three.js la disegnava sempre, con
  tutta la sua gente. Ora si prova la sua scatola contro l'inquadratura. In vista di gioco, di giorno: medio 147
  chiamate e 265 mila triangoli, grande 169 e 345 mila, paese 139 e 157 mila; lo stadio unico di prima ne faceva 148
  e 432 mila.
- **Notte**: in paese e medio la luce è stata alzata (`STADI.tipi.*.luce`) finché l'erba resta verde.
- **Paese, dettagli fatti**: cartelloni dipinti e fermi (`cartelloni` in `STADI.tipi.paese`: tavole da otto metri con
  fondo e scritta a pennello; non scorrono, al gol non cambiano, di notte restano in penombra), i LED solo da medio in
  su; panchine semplici (panca sotto una tettoia); casetta degli spogliatoi col tetto di tegole; tetto della tribuna che
  sale verso il campo coi colori di casa; tribune meno buie di notte. In vista di gioco 141 chiamate e 157 mila
  triangoli.
- **Presentazione dello stadio, fatta** (richiesta di Alex): prima del calcio d'inizio la telecamera fa un giro di 6
  secondi, da fuori (2 s), dentro lungo la tribuna (2,4 s), poi scende al suo posto di gioco (1,6 s); solo allora
  arrivano «Calcio d'inizio» e il fischio. Si salta toccando lo schermo o con un tasto, dopo mezzo secondo. Valori in
  `PRESENTA` e in `STADI.tipi.*.giro` (`src/config.js`), codice in `iniziaPresenta`, `cameraPresenta`, `finePresenta`
  (`src/game.js`). Parte solo dalla partita avviata dall'interfaccia: con un seme fisso (`prova`) e con `&alto` non
  c'è, così le prove restano uguali. Scelte provvisorie, da confermare con Alex: a ogni partita, senza scritte, non
  alla ripresa del secondo tempo (Alex il 24/11: «scegli tu»). Nel grande il primo sguardo è dall'alto, dentro la
  conca, come ha chiesto Alex: da più lontano la foschia lo sbiadisce (la nebbia di giorno parte a 130 m).
- **Stadio nei replay dei gol**: il replay basso di lato lo mostrava già; quello da dietro la porta è stato abbassato e
  allargato (`RIVEDI.porta`), così sopra la porta resta la tribuna di fronte invece della sola erba.
- Monte Titano sullo sfondo del grande: resta com'è, Alex non lo vuole più in vista (25/11).
- I riflessi dell'ambiente di notte (`src/grafica/resa.js`) usano ancora i fari dello stadio costruito all'avvio.

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
