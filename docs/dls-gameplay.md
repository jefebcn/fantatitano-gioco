# Come si gioca a Dream League Soccer (solo il funzionamento)

Dati raccolti da Alex il 20/11/2026: quattro video analizzati fotogramma per fotogramma e le sue conferme dirette.
Di Dream League replichiamo **solo il funzionamento** (comandi, tempi, ritmo, comportamento dell'IA e del portiere,
flusso delle palle ferme e del gol). Grafica, loghi, testi, animazioni e nomi sono di Fantatitano.
Tutti i numeri stanno in `src/config.js` (oggetti `TELECAMERA`, `LEVETTA`, `ANDATURA`, `PRESSIONE`, `SEGNI`, `RITMO`,
`RIVEDI`, `AREA_IA`, `PORTIERE`, `FERMI`, `GOLSEQ`); qui sotto c'è da dove vengono e dove sono nel codice. Quando un comportamento non è descritto qui si chiede ad
Alex, non si inventa (vedi «Domande aperte» in fondo).

Questo file sostituisce le note precedenti sulla modalità «come DLS» dove sono in conflitto.

## 0. Campo e telecamera (valori di Alex, corretti il 20/11)
- Telecamera di gioco: **36,9 m in pianta** dal punto inquadrato, **12,5 m** di altezza (39,0 m in linea d'aria),
  inclinazione **21,3°** verso il basso, campo visivo verticale **28°**. Il punto inquadrato (il pallone) sta a circa il
  **40%** dell'altezza dello schermo dall'alto. Segue il pallone di lato, sempre alla stessa distanza (niente zoom in area).
- Controllo nel gioco (pallone fermo in quattro punti, telecamera a regime): al centro 39,7% dall'alto, 21,3°, 12,5 m,
  36,9 m in pianta, 28°; a (20, -10) e (-30, 10) sempre 39,7% (vicino alle porte la telecamera guarda un po' in diagonale,
  `DIAG` in `src/regia.js`: inclinazione 20,8-21,1°). Eccezione: col pallone negli ultimi ~7 m verso la tribuna vicina la
  telecamera si ferma per non entrarci (`TELECAMERA.zMax`) e il pallone scende fino al ~53%.
- Scala del campo: invariata (campo 100 × 64 m, `HL` e `HW`).

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
- Conduzione ~**4,5 m/s** (stima da tarare): chi ha la palla senza scattare non va oltre `RITMO.conduzione`; scattando
  va come prima. Palla sempre vicina ai piedi (il tocco si accorcia da solo andando più piano).

## 5. IA
- Quando un compagno conduce verso l'area, **3-4 compagni** si inseriscono in area. Sui calci d'angolo **4-5
  attaccanti** in area.
- I difensori scalano verso la porta e restano compatti (`AREA_IA`): col pallone vicino alla propria porta la squadra si
  stringe. Nel codice: `possesso()` (chi va in area), `corner()`, `blocco()`.

## 6. Portiere
- Resta sulla linea seguendo il pallone di lato; esce verso il **palo vicino** quando l'attaccante entra in area.
- Reagisce al tiro entro ~**0,3 s**, col tuffo. Respinge di lato (spesso in angolo) o lascia la palla in area e poi va a
  riprenderla. A volte para in presa (`PORTIERE`). Nel codice: `gkThink()` e le parate in `contacts()`.

## 7. Palle ferme
- Scritta sotto il tabellone col tipo («CALCIO D'ANGOLO», «RIMESSA LATERALE»…). Comandi nascosti, cronometro lento.
- **Rimessa laterale**: breve dissolvenza scura, stacco della telecamera sul punto di battuta, comandi di nuovo visibili
  dopo ~2 s.
- **Angolo dopo una grande occasione** (es. una parata): stacco col logo (~0,3 s), breve replay con il pulsante «REPLAY»
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
energia nella schermata sostituzioni, clip Mixamo per mani in testa e arbitro.
1. Tastiera (computer): le frecce sono una levetta tutta inclinata, quindi scatto sempre. Va bene tenere Maiusc per
   correre senza scattare?
2. Il segnale centrale «Gol!» non c'è più (restano tabelloni e primo piano): va bene?
3. Conduzione a 4,5 m/s: tra computer e computer i gol scendono (3,4 → 1,1 a partita su 8): va tarata giocando.
