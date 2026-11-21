# Come si gioca a Dream League Soccer (solo il funzionamento)

Dati raccolti da Alex il 20/11/2026: quattro video analizzati fotogramma per fotogramma e le sue conferme dirette.
Di Dream League replichiamo **solo il funzionamento** (comandi, tempi, ritmo, comportamento dell'IA e del portiere,
flusso delle palle ferme e del gol). Grafica, loghi, testi, animazioni e nomi sono di Fantatitano.
Tutti i numeri stanno in `src/config.js` (oggetti `CAMERA`, `LEVETTA`, `ANDATURA`, `PRESSIONE`, `SEGNI`, `RITMO`,
`RIVEDI`, `AREA_IA`, `PORTIERE`, `FERMI`, `GOLSEQ`); qui sotto c'è da dove vengono e dove sono nel codice. Quando un comportamento non è descritto qui si chiede ad
Alex, non si inventa (vedi «Domande aperte» in fondo).

Questo file sostituisce le note precedenti sulla modalità «come DLS» dove sono in conflitto.

## 0. Campo e telecamera (valori di Alex, corretti il 20/11)
- Scala vera dalla PR #57 (prompt precedente): campo 105 × 68, porta 7,32 × 2,44, pallone di 22 cm, giocatori 1,70-1,95 m.
- Telecamera di gioco (`CAMERA` in `src/config.js`): misure di Alex **36,9 m in pianta**, **12,5 m** di altezza, **21,3°**,
  campo visivo verticale **28°**; ritoccate di poco (36,8 m, 21,75°, campo visivo orizzontale fisso 58,7°) perché il cerchio
  di centrocampo occupi il **43%** della larghezza, come chiesto il 21/11. Mai girata a destra o sinistra, niente zoom in
  area. Segue il pallone per intero lungo il campo e al 45% in profondità.
- Controllo (`scripts/prove/inquadratura.cjs`, anche nella CI, 844 × 390): cerchio 43,0% (rif. 43), bordo lontano 28,0% (29),
  dischetto 40,0% (40), bordo vicino 58,7% (60), linea laterale lontana 10,0% (10), giocatore 8,2% (9), pallone 1,0% (1).
- La vista dall'alto è solo di controllo: `?alto` nell'indirizzo.

## 1. Comandi
- **Levetta a sinistra**: la base è un cerchio fisso, la levetta si muove dentro. Poco inclinata si cammina, poi si
  corre; **lo scatto parte da solo** quando la levetta arriva al bordo (soglia ~85-90% del raggio, `LEVETTA.scatto`).
  Non c'è un tasto per lo scatto.
- **Tre tasti a destra**: A in basso a destra, B alla sua sinistra, C sopra A.
- Le scritte dei tasti cambiano in tempo reale col possesso:

  | tasto | con la palla | senza palla |
  |---|---|---|
  | A | **Calcio forte**: tiro | **Calcio forte**: scivolata nella direzione della levetta |
  | B | **Calcio basso**: passaggio rasoterra | **Pressing**: il giocatore va addosso al portatore e prova il contrasto in piedi |
  | C | **Calcio alto**: lancio o cross | **Cambia giocatore** |

  «Senza palla» vale appena la squadra perde il possesso, anche con il pallone vagante dopo un nostro tiro. Mentre viaggia
  un nostro passaggio (o cross) si resta «con la palla».
- **Potenza**: si tiene premuto e si rilascia. Direzione dalla levetta, potenza dalla durata. Nessun effetto con lo
  swipe: strisciare il dito non cambia la traiettoria.
- **Passaggio (Calcio basso)**, scelta provvisoria di Alex finché non verifica su DLS: assistito verso il compagno nella
  direzione della levetta; la durata della pressione cambia solo un po' la velocità (±15%). Si spegne con
  `PASSAGGIO.assistito = false` (allora la potenza decide anche quanto lontano si passa).
- Dopo un passaggio il controllo passa subito al compagno che riceve, già mentre la palla viaggia.
- Nel codice: `modoAttacco`, `pressA` (B), `pressB` (A), `pressD` (C), `userThink` (pressing), `bindInput` (levetta fissa).

## 2. Segni in campo
- Giocatore controllato: nome e segnalino verde sopra la testa (niente anello ai piedi).
- Avversario con la palla: solo il nome, in bianco.
- In difesa: segnalino grigio semitrasparente sopra il compagno che verrebbe scelto con «Cambia giocatore».
- Barra della potenza sotto il nome mentre si tiene premuto un tasto di calcio: si riempie di bianco e diventa rossa
  verso il massimo.
- Palloni alti (lanci, cross, rimesse): **X gialla a terra** nel punto in cui scende, per tutte e due le squadre.
- Nel codice: `segni()` in `src/regia.js` (nomi, segnalini, barra), `segnoAlto()` in `src/game.js` (X gialla).

## 3. Interfaccia
- In alto a sinistra: pausa, tabellone (stemmi, sigle, punteggio) e cronometro accanto.
- In basso al centro: minimappa con tutti i giocatori in tempo reale; sotto, il riquadro della mentalità con le frecce
  ai lati per cambiarla. La minimappa non indica chi ha la palla.
- In alto a destra: pulsante replay, per ora **solo segnaposto** (scelta provvisoria di Alex).
- **Replay automatico e breve** (scelta provvisoria di Alex): dopo un gol e alla prima palla ferma dopo una grande
  occasione (parata, tiro deviato, palo, tiro fuori di poco) rivede ~3 s di gioco (~3,5 s veri) tra due stacchi col logo
  Fantatitano. Si salta toccando lo schermo o il pulsante «Replay» in basso a destra. `RIVEDI` e `FERMI.occasione`;
  nel codice `rivedi()` in `src/regia.js` e `restart()` in `src/game.js`.

## 4. Ritmo
- Cronometro ~**22,5×** il tempo vero (90 minuti ≈ 4 minuti veri); ~**3-4×** durante le palle ferme e dopo i gol
  (`RITMO`).
- **Velocità dei giocatori** (valori di partenza di Alex del 21/11, `VELOCITA` e `RITMO.conduzione` in `src/config.js`):
  corsa senza palla ~**5 m/s**, scatto ~**7 m/s**, conduzione ~**4,5 m/s** (misurata su Dream League), scatto con palla
  ~**6 m/s**. La quotazione sposta la corsa di qualche decimo.
- **Accelerazione**: da fermo allo scatto in circa **un secondo**; frenata rapida (da 7 m/s a fermo in 0,36 s).
- **Cambi di direzione**: la corsa gira subito ma perde velocità in proporzione all'angolo: a 90° resta il 72%, su
  un'inversione circa metà; finché non si è girati non si accelera (`CORPO.gira`, `giraScatto`, `perde`).
- Le animazioni di camminata, corsetta e corsa girano alla velocità vera del giocatore (la clip della corsa copre anche
  lo scatto), e si fondono in base alla velocità: il piede in appoggio non scivola.
- Con `?debug` nell'indirizzo, nel riquadro in alto a sinistra c'è la velocità del giocatore comandato in m/s.
- Letto dal gioco (giocatore comandato dalla levetta): da fermo a 6,65 m/s in 0,8 s; scatto 7,2 m/s; conduzione 4,3 m/s;
  scatto con palla 6,0 m/s; dopo mezzo secondo da un'inversione in scatto 3,6 m/s.

## 5. IA
- Quando un compagno conduce verso l'area, **3-4 compagni** si inseriscono in area. Sui calci d'angolo **4-5
  attaccanti** in area.
- In possesso le punte aspettano sulla linea dell'ultimo difensore avversario, un passo dietro (`ATTACCO`): ogni tanto
  si distraggono e finiscono in fuorigioco. Il computer tira secondo le soglie di `TIRO_IA`.
- I difensori scalano verso la porta e restano compatti (`AREA_IA`): col pallone vicino alla propria porta la squadra si
  stringe. Nel codice: `possesso()` (chi va in area), `corner()`, `blocco()`.

## 6. Portiere
- Resta sulla linea seguendo il pallone di lato; esce verso il **palo vicino** quando l'attaccante entra in area.
- Reagisce al tiro entro ~**0,3 s**, col tuffo. Respinge di lato (spesso in angolo) o lascia la palla in area e poi va a
  riprenderla. A volte para in presa (`PORTIERE`). Nel codice: `gkThink()` e le parate in `contacts()`.
- Col pallone in mano lo lancia teso e basso a un compagno libero: tocca terra un po' prima di lui e gli arriva di
  rimbalzo (`RINVIO`). Nel codice: `rilasciaPortiere()`.

## Gol e tiri (obiettivo di Alex del 21/11)
Alex, giocando: «pochi gol». In Dream League a difficoltà media una partita finisce spesso con più gol. Obiettivo:
**2–3 gol e 10–12 tiri per squadra a partita** (4–6 e 20–24 in tutto), poi si tara giocando.

Si misura tra computer con `node scripts/prove/partita.cjs 16 normale` (16 partite, semi 7–22). La partita dura 4 minuti:
di questi il pallone è in gioco per circa 215 secondi.

| | Gol a partita | Tiri a partita | Anomalie |
|---|---|---|---|
| Prima (20/11) | 1,00 | 7,00 | 0 |
| Passo 1 (21/11) | 2,69 | 10,38 | 0 |

Su 16 partite il caso conta ancora molto. Le stesse misure su **32 partite** (semi 7–38), più affidabili:

| | Gol | Tiri | Passaggi riusciti | Rimesse laterali | Anomalie |
|---|---|---|---|---|---|
| Passo 1 | 2,31 | 9,53 | 74% | 3,3 | 0 |
| Passo 2: lancio del portiere corretto | 2,56 | 9,84 | 75% | 2,3 | 0 |

Dal 21/11 la simulazione è ripetibile (modalità di prova) e i generatori di numeri casuali sono separati: i numeri di
riferimento sono cambiati un po' senza che cambiasse il gioco. Sempre 32 partite, semi 7–38:

| | Gol | Tiri | Passaggi riusciti | Contrasti vinti | Anomalie |
|---|---|---|---|---|---|
| Prima delle velocità nuove | 2,22 | 9,34 | 74% | 4,6 | 0 |
| Velocità nuove (corsa 5, scatto 7, palla 4,5 e 6) | 1,66 | 6,84 | 71% | 1,9 | 0 |

Con giocatori più lenti, in quattro minuti si fanno meno azioni: gol e tiri scendono di un quarto e i difensori
vincono meno contrasti. Le stime che il computer usa per i passaggi sono già adattate (senza, i passaggi riusciti
scendevano al 66%). Per risalire servono azioni più dirette: è il prossimo lavoro su gol e tiri.

**Passo 1**, tre cose insieme (ognuna da sola sposta poco):
- il computer tira più volentieri e da un po' più lontano (`TIRO_IA`);
- i portieri parano meno a tutte le difficoltà (`save` in `DIFF` e `MATE`: a normale da 0,70 a 0,58);
- chi difende va sul portatore dalla metà campo, non più 18 metri dentro la metà avversaria (`PRESSING.da`): prima si
  perdevano troppi palloni a centrocampo e le azioni non arrivavano in fondo.

**Passo 2**: era un difetto. Il portiere, lanciando con le mani, sbagliava 8 volte su 10: il pallone passava accanto al
compagno ad altezza del petto a più di 20 m/s e finiva in fallo laterale o agli avversari. Ora il lancio è più lento e
tocca terra un po' prima del compagno (`RINVIO.mano`, `vicino`, `rimbalzo`): su 4 partite 16 lanci riusciti su 16.

Provato e **scartato** perché non cambia i numeri: far reagire i difensori un attimo dopo al passaggio (0,35 e 0,6
secondi), pretendere passaggi più sicuri, far temporeggiare di più chi difende.

**Dove si perde ancora** (diagnosi su 8 partite): su 80 passaggi a partita ne riescono 74. Quelli sbagliati sono quasi
tutti presi dal difensore proprio sull'uomo che riceve; i traversoni riescono una volta su tre e i lanci lunghi sopra la
difesa finiscono spesso oltre il compagno. Il passo dopo lavora lì.
Siamo a metà strada dall'obiettivo: i numeri di Alex restano scritti negli obiettivi dello script (escono con ✗ finché
non ci si arriva, senza bloccare).

## 7. Palle ferme
- Scritta sotto il tabellone col tipo («CALCIO D'ANGOLO», «RIMESSA LATERALE»…). Comandi nascosti, cronometro lento.
- **Rimessa laterale**: breve dissolvenza scura, stacco della telecamera sul punto di battuta, comandi di nuovo visibili
  dopo ~2 s.
- **Angolo dopo una grande occasione** (es. una parata): stacco col logo (~0,3 s: una fascia diagonale viola col logo
  Fantatitano attraversa lo schermo, e a metà corsa lo copre tutto), breve replay con il pulsante «REPLAY»
  in basso a destra per saltarlo, stacco col logo, poi l'inquadratura dell'angolo. Logo degli stacchi: Fantatitano.
  Vale per ogni palla ferma dopo una grande occasione (vedi «Replay automatico»).
- Durante il calcio piazzato: tre icone in alto a destra (guanti, maglia, pallone): **segnaposto senza funzione**
  (scelta provvisoria di Alex).
- L'angolo si può battere corto con un passaggio rasoterra: un compagno si offre vicino alla bandierina (`FERMI.corto`).
- Nel codice: `restart()` (scritta, dissolvenza, comandi), `corner()` (replay dopo la grande occasione), `hud()`.

## 8. Sequenza del gol
| tempo | cosa succede |
|---|---|
| 0 s | punteggio aggiornato subito; levetta, tasti e minimappa spariscono |
| 0-0,5 s | tabelloni LED a bordo campo con la scritta del gol alternata al nome del marcatore |
| ~0,5-1,2 s | leggero rallentatore; avversari con le mani in testa, arbitro che indica il centro |
| ~1,3 s | stacco su una telecamera bassa (~1,7 m) a pochi metri dal marcatore che esulta, con un difensore deluso in primo piano |

Esultanze e reazioni: esultanze di GameplayFootball (`esulta`, `esulta_corsa`). Chi subisce il gol: clip Mixamo
`mani_testa` (entrambe le mani sopra la testa; finché manca resta la `delusione` di GameplayFootball). Arbitro: clip Mixamo
`indica` (braccio teso in avanti verso il centro; finché manca si ferma e guarda il centro, senza braccio). Tempi in `GOLSEQ`;
nel codice `inizio()` e `delusoDavanti()` in `src/regia.js`, `rallenta()` in `src/game.js`.

## Vista di controllo dell'IA (solo per sviluppare)
`?ia` nell'indirizzo, o il tasto **O** della tastiera durante la partita (`src/debug-ia.js`). Sopra il campo compaiono: la
posizione base di ogni giocatore (cerchietto: azzurro la squadra di chi gioca, arancione l'altra) e la linea verso dove sta
andando; le linee di passaggio che il portatore ha valutato all'ultima decisione, col punteggio (verde la migliore, rosso le
peggiori, tratteggiata se un avversario la chiude); sopra ogni giocatore la decisione in corso (pressing, raddoppio,
copertura, marcatura, linea, smarcamento, sostegno, inserimento, sovrapposizione, area, rientro; per il portatore: tira,
passa a…, cross per…, porta palla); la linea difensiva delle due squadre. Legge soltanto: le partite restano identiche.

## Energia
Non si vede durante il gioco. Sta nel menu di pausa, nella schermata «Sostituzioni»: una barretta per giocatore (verde,
arancione sotto il 70%, rossa sotto il 40%); in panchina sono freschi.

## Clip Mixamo da scaricare (Alex)
Su mixamo.com, col personaggio «X Bot» e le stesse impostazioni delle clip del Soccer Game Pack (FBX, 30 fps):
- «disappointed», «defeated» o «frustrated»: quella con **entrambe le mani sopra la testa** → file `mani in testa.fbx`;
- «pointing» o «point»: **braccio teso in avanti** → file `indica.fbx`.
Vanno nella **stessa cartella degli FBX del Soccer Game Pack** (quella con `X Bot.fbx`), sul computer, non nel repository
(gli FBX di Mixamo non si ridistribuiscono). Poi `node scripts/animazioni.mjs <quella cartella>` rigenera `public/anim.js`
(le clip sono già in `CLIP`, facoltative: se un file manca si salta). Se preferisci, colleghi la cartella a una sessione e
lo faccio io.

## Licenze delle animazioni
- GameplayFootball (Bastiaan Konings Schuiling, dal motore di Google Research Football): **Unlicense**, pubblico dominio
  (`modelli/gfootball/LICENSE`). Si possono usare, modificare e pubblicare senza limiti: vanno bene nella versione pubblicata.
- Mixamo: si possono usare nei giochi, anche commerciali, dentro il gioco (in `public/anim.js` sono già convertite); non si
  ridistribuiscono i file FBX così come sono. Per questo stanno fuori dal repository.

## Domande aperte per Alex
Risposte provvisorie di Alex (20/11, da verificare su DLS): passaggio assistito (`PASSAGGIO.assistito`), replay automatico
breve, icone dei calci piazzati e pulsante replay in alto a destra come segnaposto. Risposte definitive: telecamera (sopra),
energia nella schermata sostituzioni, clip Mixamo per mani in testa e arbitro; tastiera (solo per i test al computer:
frecce o WASD = levetta al bordo, quindi scatto; Maiusc tenuto = corsa normale senza scatto); nessuna scritta al centro
dopo il gol (in DLS la scritta del gol compare solo sui cartelloni LED a bordo campo, alternata al nome del marcatore).
1. Gol tra computer e computer: con la porta vera (PR #57) erano già scesi da 3 a 1,4; con conduzione a 4,5 m/s e il portiere
   nuovo sono 0,5 a partita (8 partite). Da tarare giocando: conduzione, reazione e prese del portiere, valore dei tiri.
