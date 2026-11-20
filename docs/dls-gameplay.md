# Come si gioca a Dream League Soccer (solo il funzionamento)

Dati raccolti da Alex il 20/11/2026: quattro video analizzati fotogramma per fotogramma e le sue conferme dirette.
Di Dream League replichiamo **solo il funzionamento** (comandi, tempi, ritmo, comportamento dell'IA e del portiere,
flusso delle palle ferme e del gol). Grafica, loghi, testi, animazioni e nomi sono di Fantatitano.
Tutti i numeri stanno in `src/config.js` (oggetti `TELECAMERA`, `LEVETTA`, `ANDATURA`, `PRESSIONE`, `SEGNI`, `RITMO`,
`RIVEDI`, `AREA_IA`, `PORTIERE`, `FERMI`, `GOLSEQ`); qui sotto c'è da dove vengono e dove sono nel codice. Quando un comportamento non è descritto qui si chiede ad
Alex, non si inventa (vedi «Domande aperte» in fondo).

Questo file sostituisce le note precedenti sulla modalità «come DLS» dove sono in conflitto.

## 0. Campo e telecamera (dal prompt precedente, invariati)
- Telecamera di gioco: altezza **12,5 m**, distanza **37 m** dal punto inquadrato, inclinazione **21°** verso il basso,
  campo visivo verticale **28°**. Segue il pallone di lato, sempre alla stessa distanza (niente zoom in area).
- Interpretazione nel codice (`TELECAMERA` in `src/config.js`): la telecamera sta 12,5 m sopra l'erba, a 37 m in linea
  d'aria dal punto seguito; guarda in giù di 21°. Da confermare con Alex se il «37 m» è in linea d'aria o in pianta.
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
- In alto a destra: pulsante replay (rivede gli ultimi secondi: `rivedi()` in `src/regia.js`, gioco fermo intanto).

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
- Durante il calcio piazzato: tre icone in alto a destra (guanti, maglia, pallone). Per ora solo lo spazio: cosa fanno lo
  decidiamo dopo.
- L'angolo si può battere corto con un passaggio rasoterra: un compagno si offre vicino alla bandierina (`FERMI.corto`).
- Nel codice: `restart()` (scritta, dissolvenza, comandi), `corner()` (replay dopo la grande occasione), `hud()`.

## 8. Sequenza del gol
| tempo | cosa succede |
|---|---|
| 0 s | punteggio aggiornato subito; levetta, tasti e minimappa spariscono |
| 0-0,5 s | tabelloni LED a bordo campo con la scritta del gol alternata al nome del marcatore |
| ~0,5-1,2 s | leggero rallentatore; avversari con le mani in testa, arbitro che indica il centro |
| ~1,3 s | stacco su una telecamera bassa (~1,7 m) a pochi metri dal marcatore che esulta, con un difensore deluso in primo piano |

Esultanze e reazioni: clip libere (GameplayFootball oggi: `esulta`, `esulta_corsa`, `delusione`; l'arbitro usa il braccio
alzato del guardalinee). Mixamo quando Alex scarica le clip giuste (mani in testa, arbitro che indica). Tempi in `GOLSEQ`;
nel codice `inizio()` e `delusoDavanti()` in `src/regia.js`, `rallenta()` in `src/game.js`.

## Domande aperte per Alex
1. Telecamera: i 37 m sono in linea d'aria (come nel codice) o in pianta?
2. Tocco veloce su «Calcio basso»/«Calcio alto»: oggi dosa la potenza da solo verso il compagno. In DLS un tocco
   brevissimo fa un passaggio corto debole o un passaggio «assistito»?
3. Tastiera (computer): le frecce sono una levetta tutta inclinata, quindi scatto sempre. Va bene tenere Maiusc per
   correre senza scattare?
4. Replay dal pulsante in alto a destra: in DLS mette in pausa e fa rivedere gli ultimi secondi con un'altra
   telecamera? Per ora rivede gli ultimi 6 s dalla telecamera bassa.
5. Le tre icone dei calci piazzati (guanti, maglia, pallone): cosa devono fare?
6. In alto al centro c'erano nome del giocatore e barretta dell'energia: li ho nascosti (in DLS non ci sono). L'energia
   va mostrata da qualche parte?
7. Il segnale centrale «Gol!» non c'è più (restano tabelloni e primo piano): va bene?
8. Clip Mixamo per mani in testa e arbitro che indica: quali scarichi? (Gli FBX restano fuori dal repository pubblico.)
