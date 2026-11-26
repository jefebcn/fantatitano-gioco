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
- In profondità il pallone resta sempre tra il **30% e il 70%** dell'altezza dello schermo (`CAMERA.fascia`, 21/11): verso
  la linea laterale lontana finiva al 19%, sotto il tabellone; ora la telecamera lo segue quanto serve, senza cambiare
  altezza, inclinazione e campo visivo. Verso la linea vicina si ferma a `zMax` (oltre entrerebbe in tribuna): lì il
  pallone arriva al 76%.
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
  | A | **Calcio forte**: tiro | **Scivolata** nella direzione della levetta (ferma: verso il pallone) |
  | B | **Calcio basso**: passaggio rasoterra | **Pressing** (tenuto): il giocatore va addosso al portatore e fa il contrasto in piedi |
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
- **Pallone al piede** (`COND` in `src/config.js`, `conduci` in `src/fisica/pallone.js`): in conduzione la palla non è
  incollata e non è libera. A ogni tocco, dato quando un piede sta per appoggiare, viene spinta avanti e resta tra 0,6 e
  0,8 m dal portatore (un tocco ogni due o tre appoggi); nei cambi di direzione il tocco dopo la porta nella direzione
  nuova. Non si allontana mai più di 1,5 m (`COND.guinzaglio`): la perde solo un contrasto o un calcio.
- Giocatori e pallone avanzano a passi fissi di 1/120 di secondo e a schermo si disegnano con l'avanzo di tempo non
  ancora simulato: non si staccano e non vanno a scatti quando i fotogrammi calano.
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
| Pallone al piede (tocchi più lunghi, mai oltre 1,5 m) | 1,75 | 5,88 | 70% | 1,3 | 0 |

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

**Passo 3** (21/11, PR #96): il rasoterra al compagno che corre arrivava più svelto di lui e lui gli correva accanto
senza prenderlo. Ora arriva al massimo a 5,5 m/s, solo sui passaggi medi e lunghi (`PASSAGGIO.inCorsa`). 32 partite,
semi 7–38: rasoterra lungo in avanti riuscito da 53 a 73 su 100, tiri da 6,16 a 7,59, gol da 2,22 a 2,09.

### Dove si ferma l'azione (misure del 21/11, 32 partite, semi 7–38)
Il gioco di oggi: **2,09 gol, 7,59 tiri** (casa 4,09, ospiti 3,50), 27,9 possessi da 8,4 secondi, di cui solo **13,2
superano la trequarti**; di quelli più della metà finisce col tiro. Il collo di bottiglia è risalire il campo.
- Tempo: il pallone è in gioco 234 secondi su 240. A palla ferma (37 secondi veri: esultanza 17, punizioni e
  fuorigioco 7, rimesse dal fondo 5, calci d'inizio 5, rimesse laterali 3) il cronometro va a un sesto, quindi quei
  secondi quasi non tolgono gioco. Il portiere tiene il pallone in mano 11 secondi a partita. Chi porta palla lo fa per
  metà del tempo nella propria metà campo; un'azione che finisce col tiro dura 11 secondi.
- Passaggi rasoterra (57 a partita) per libertà di chi riceve, cioè distanza dell'avversario più vicino: sotto 2 m
  riescono 49 su 100, tra 2 e 4 m 61, tra 4 e 7 m 78, oltre 7 m 87. In avanti di almeno 8 metri sono solo 13,6 a partita
  e ne riescono 69 su 100; indietro o di lato sono 32 e ne riescono 87.
- Energia media a fine partita 53 su 100 (il più stanco 7), falli 0,59.

**Provato e scartato** (ogni riga una prova da 32 partite sugli stessi semi, nessuna anomalia; contano tiri e possessi
oltre la trequarti):

| Prova | Gol | Tiri | Possessi | Oltre la trequarti |
|---|---|---|---|---|
| Gioco di oggi | 2,09 | 7,59 | 27,9 | 13,2 |
| Tira più volentieri e da più lontano (`TIRO_IA`) | 2,16 | 7,81 | 27,0 | – |
| Decide più in fretta (`TENUTA` 0,7–1,2 s) | 1,75 | 6,78 | 27,0 | – |
| Meno traversoni (`AIR.cross` a metà) | 1,94 | 6,69 | 27,2 | – |
| Passa più volentieri (`TENUTA.soglia` 3) | 1,69 | 6,53 | 26,9 | – |
| Nessuno sulle linee di passaggio | 1,63 | 7,72 | 27,0 | – |
| Marcatura più larga (5 m) | 1,97 | 7,53 | 28,9 | – |
| Più inserimenti (`RUN` ogni 0,8 s, fino a 3) | 2,19 | 7,03 | 29,7 | – |
| Pressing più basso (`PRESSING.da` −15) | 1,53 | 5,91 | 24,6 | – |
| Pressing più alto (`PRESSING.da` 15) | 2,16 | 7,38 | 29,3 | 12,6 |
| Passaggio più in avanti | 1,47 | 5,94 | 32,7 | 10,9 |
| Rinvio lungo del portiere | 2,00 | 7,63 | 27,9 | 13,4 |
| Portieri meno forti (`save` 0,48) | 2,00 | 6,88 | 27,8 | 12,5 |
| Riprese rapide (si batte subito, esultanza a metà) | 1,69 | 6,81 | 27,8 | 12,4 |
| Riprese rapide + pressing alto | 1,72 | 7,25 | 29,1 | 12,3 |
| Quattro movimenti senza palla insieme | 1,03 | 5,44 | 28,5 | 12,5 |
| Quattro movimenti + passaggio più in avanti | 1,25 | 5,56 | 29,2 | 12,9 |
| Solo ali larghe fino alla trequarti | 1,28 | 6,16 | 26,2 | 12,4 |
| Solo un compagno che si offre più avanti | 1,69 | 6,63 | 27,9 | 13,0 |
| Solo punta che viene incontro | 1,53 | 5,56 | 26,1 | 12,0 |

Tra una prova e l'altra uguale i tiri oscillano di circa ±1,3: quasi tutte le righe sono dentro l'oscillazione, i
movimenti senza palla sono sotto. Le riprese rapide portano il gioco da 234 a 236 secondi: accorciano la partita vera,
non danno possessi in più. Il pressing alto non fa crollare l'energia (51 contro 53) né alza i falli. Con la punta che
viene incontro e le ali larghe i tiri da meno di 12 metri scendono da 1,8 a 0,6–1,3: restano lontane dalla porta quando
l'azione arriva in fondo; chi si offre viene anticipato più spesso (14–19 su 100 sul passaggio corto, contro 9).

**Fermi qui finché Alex non manda le statistiche di una partita di Dream League** (tiri per squadra): lì una squadra la
guida chi gioca, il bersaglio per il computer può essere più basso di 20–24 tiri. Alla ripartenza, due strade non ancora
provate (indicazioni di Alex del 21/11):
1. Conduzione in avanti: se il portatore ha campo libero davanti (nessun avversario entro 6–8 metri) avanza palla al
   piede, anche in scatto, invece di passare subito. In Dream League il computer lo fa spesso.
2. Difesa meno perfetta: ritardo di reazione di 0,2–0,3 secondi sui passaggi avversari e linea difensiva un po' meno
   compatta, controllando che gli anticipi sul passaggio corto restino tra 9 e 12 su 100.
Il portiere si tara per ultimo, su circa un gol ogni 4–5 tiri (oggi uno ogni 3,6).

### Difetti visti registrando una partita intera (21/11)
Due partite registrate passo per passo (pallone, giocatori, gesti, piedi e mani), controlli automatici su tutti i
fotogrammi e primi piani dei momenti sospetti. Trovati, in ordine di quanto si vedono:
1. **Calci a vuoto**: il pallone partiva col piede a un metro (9 calci su 10). CORRETTO: il calcio aspetta che il piede
   arrivi sul pallone, al massimo 0,18 secondi, e intanto il pallone viene portato dove lo colpisce la clip del gesto
   (`CARICO`, `prepara` e `moveBall` in `src/game.js`); il piede che calcia non viene più tenuto fermo dal blocco dei
   piedi (`src/grafica/piedi.js`). Ora il piede è sul pallone nell'istante giusto in 18 calci su 22.
2. **Rinvio con le mani del portiere**: il pallone restava sospeso davanti al petto. CORRETTO: segue la mano che lancia.
3. Parate a distanza: il pallone si ferma a più di un metro dai guanti (1–3 a partita). CORRETTO il 25/11: si aspetta che arrivi alle mani (`PARATA.mani`, `PARATA.manca`).
4. Giravolta di scatto: il corpo gira di oltre 120° in un fotogramma (7–25 a partita). CORRETTO il 25/11: oltre 90 gradi da 12 a 0 (`MOVI.corpo`, `verso` in `prepara`).
5. Chi riceve si lascia sfilare il pallone a 1,2–1,4 metri e lo rincorre (4–9 a partita). CORRETTO il 25/11: lo stop aspetta il pallone al piede (`PASSAGGIO.piede`).
6. Piedi che strisciano nel passo laterale: CORRETTO il 26/11 (`DEF.laterale`, chi temporeggia veloce si gira e corre). Nei cambi di direzione stretti: da fare. Portieri che arretrano di corsa: CORRETTO il 25/11 (`PORTIERE.gira`).

Il prezzo della correzione dei calci, su 32 partite (semi 7–38, nessuna anomalia): gol da 2,09 a 1,34, tiri da 7,59 a
7,16, passaggi riusciti da 75 a 74 su 100, falli da 0,59 a 0,88. Con attese più lunghe (0,3 secondi) i passaggi
scendevano a 70 su 100. I gol calano perché chi calcia ha il pallone tra i piedi un attimo in più: un gol ogni 5 tiri,
dentro il bersaglio del portiere (uno ogni 4–5).

## 7. Palle ferme
- Scritta sotto il tabellone col tipo («CALCIO D'ANGOLO», «RIMESSA LATERALE»…). Comandi nascosti, cronometro lento.
- **Rimessa laterale e calcio d'angolo**: breve dissolvenza scura, stacco della telecamera sul punto di battuta, comandi
  di nuovo visibili dopo ~2 s (`FERMI.comandi`). A metà dello stacco, a schermo nero, ognuno viene messo al suo posto
  (`piazzaFermi`): chi batte è già sul pallone, i saltatori in area. Richiesta di Alex del 24/11: prima sull'angolo si
  aspettavano 10 s che i saltatori arrivassero camminando, sulla rimessa 5 s. Il computer batte dopo un altro secondo.
  La dissolvenza segue il tempo di gioco (`buio()`): il nero coincide sempre con lo spostamento.
- **Angolo dopo una grande occasione** (es. una parata): stacco col logo (~0,3 s: una fascia diagonale viola col logo
  Fantatitano attraversa lo schermo, e a metà corsa lo copre tutto), breve replay con il pulsante «REPLAY»
  in basso a destra per saltarlo, stacco col logo, poi l'inquadratura dell'angolo. Logo degli stacchi: Fantatitano.
  Vale per ogni palla ferma dopo una grande occasione (vedi «Replay automatico»).
- A palla ferma, in alto a destra, l'icona della **maglia**: pausa e sostituzioni, poi il modulo (risposta di Alex del
  24/11; guanti e pallone tolti finché non dice cosa devono fare).
- L'angolo si può battere corto con un passaggio rasoterra: un compagno si offre vicino alla bandierina (`FERMI.corto`).
- **Nessuna ripresa parte da sola** (richiesta di Alex del 23/11, dal suo video): calcio d'inizio, punizione, fuorigioco,
  angolo, rimessa laterale, rimessa dal fondo, rigore. Il gioco si ferma, il pallone resta sul punto, ognuno va al suo posto
  senza scattare e si ferma lì (barriera se la porta è vicina). Quando chi batte è sul pallone: se è di chi gioca tornano i
  comandi e non succede niente finché non passa o tira, senza limite di tempo (sul rigore vale solo il tiro; sulla rimessa
  dal fondo il portiere aspetta Passa o Cross); se è del computer aspetta `FERMI.cpu` secondi (uno) e batte.
  Scelte provvisorie, da far vedere ad Alex: andatura verso il posto (`FERMI.passo`: al passo gli ultimi metri, di corsetta
  chi è aspettato, di corsa solo chi è lontano; chi batte scatta se è a più di 12 m); la rimessa dal fondo resta col
  pallone in mano al portiere.
- **Cronometro**: fermo prima del calcio d'inizio di ogni tempo (00:00 e 45:00); sulle altre riprese va piano
  (`RITMO.fermo`), da decidere con Alex se fermarlo.
- Nel codice: `restart()` (scritta, dissolvenza, comandi), `piazzaFermi()` e `buio()` (lo stacco di rimessa e angolo),
  `corner()` (replay dopo la grande occasione), `hud()`,
  `aspetta()` e `attesaPasso()` (l'attesa), `postoFermo()` (dove va ciascuno), `batti…()` (come batte il computer).
  Prova: `scripts/prove/riprese.cjs`.

## 8. Sequenza del gol
- Riquadro in basso col nome di chi ha segnato: in Dream League non c'è. `GOLSEQ.riquadro` dice per quanti secondi resta:
  ora **0** (scelta provvisoria, Alex deve ancora decidere tra tenerlo, toglierlo o mostrarlo 2 secondi).
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
