# Come decidono gli altri giochi (studio del 22/11)

Letti prima del prossimo giro sull'IA. Licenze controllate nel file LICENSE di ogni repository: da questi si può riprendere
codice citandolo in `docs/crediti.md`. Finora non è stato ripreso niente: qui ci sono solo le idee e dove trovarle.

| Repository | Licenza | Cosa è |
|---|---|---|
| BazkieBumpercar/GameplayFootball | Unlicense | 11 contro 11 in 3D, l'IA «Eliza» (`src/onthepitch/`) |
| google-research/football | Apache 2.0 | lo stesso motore, ripulito (`third_party/gfootball_engine/src/onthepitch/`) |
| GallagherAiden/footballSimulationEngine | MIT | simulatore a griglia in JavaScript (`engine.js`, `lib/`) |
| nicolasbize/soccer-course | MIT | gioco in Godot, stati dei giocatori (`scenes/characters/`) |

## Smarcamenti (squadra in possesso)
**Noi**: ognuno ha un posto di casa (modulo spostato col pallone) e ogni mezzo secondo sceglie il migliore di 9 punti entro
5 metri da lì (`puntoLibero`). Il più vicino fa da sostegno a 9–13 m. Gli inserimenti partono a tempo, ogni 1,55 s, 13 m
più avanti, per 2,8 s. Le punte aspettano sulla linea del fuorigioco.

**GameplayFootball** (`player/controller/elizacontroller.cpp:597-789`, `teamAIcontroller.cpp`): il punto si ricalcola di
continuo (ogni 20–80 ms vicino al pallone) come somma di spinte, al massimo 8 m da dove si è:
- verso il posto del modulo, spinto in avanti secondo il ruolo (fino a 12 m chi sta vicino al portatore, fino a 22 m le
  punte, verso una corsia dalla parte opposta al portatore);
- via dai 3 avversari più vicini, ma col centro 2 m dietro l'avversario visto dal portatore: così si esce dalla sua ombra
  sulla linea di passaggio (raggio 5 m);
- via dai 5 compagni più vicini entro 10,5 m (non ci si ammucchia) e dalla traiettoria del pallone (2 m);
- un anello attorno al portatore: né addosso né lontani (attrazione fino a 21 m, repulsione entro 12);
- fuorigioco: fermo 8 cm prima del penultimo difensore, previsto 0,24 s avanti.
Quanto pesa tutto questo rispetto al modulo dipende dal possesso (misurato e reso morbido) e dal ruolo.
**Inserimento a condizione** (`teamAIcontroller.cpp:189-222`): ogni mezzo secondo, se nessuno sta già correndo, parte il
compagno più vicino al punto 26 m davanti al portatore, ma solo se lì c'è spazio (vicinanza × spazio libero ≥ 0,5). Dura
4 secondi e punta la linea di fondo.
**Passaggio e smarcamento parlano la stessa lingua** (`elizacontroller.cpp:796-926, 1008-1060`): chi passa dà un voto a
ogni compagno (spazio libero entro 5 m, spazio davanti, quanto è avanti) e alla linea di passaggio con una gara di tempi
(pallone contro avversario, mezzo secondo di margine). Chi si smarca si muove proprio per alzare quei voti.

Il simulatore in JavaScript e il gioco Godot fanno meno di noi: posto = origine + parte della strada verso il pallone,
nessuna ricerca dello spazio. Dal gioco Godot l'idea utile è sommare le spinte con pesi che crescono tra due raggi.

## Decisione di tiro
**Noi** (`valoreTiro`, `TIRO_IA`): un valore = angolo della porta × distanza (zero a 32 m) × 0,75 per ogni avversario nel
cono. Si tira sopra una soglia, sempre entro 20 m, e 8 volte su 10 a ogni decisione entro 30 m. Si decide ogni 1,2–2 s
(ogni 0,25 s negli ultimi 28 m). Mira: dal lato lontano dal portiere, a caso tra metà porta e il palo.

**GameplayFootball** (`elizacontroller.cpp:796-960`): nessuna attesa, si rivaluta ogni 20–30 ms, in quest'ordine:
1. passa, ma solo a un compagno messo chiaramente meglio;
2. tira, solo da vicino (fino a circa 20 m al centro): prova tre bersagli (palo, centro, palo) con la stessa gara di tempi
   del passaggio, col pallone tre volte più svelto e il portiere contato come un avversario qualsiasi. Tira se la radice
   della probabilità migliore più un numero a caso tra 0 e 0,5 supera 0,5. Mira al bersaglio migliore, con un errore che
   dipende dalla bravura; la forza cresce con la distanza;
3. altrimenti porta palla con un campo di forze (`AIsupport/AIfunctions.cpp:364-497`): gli avversari entro 10 m
   respingono, la porta attira; a campo libero scatta verso la porta, in mezzo alla gente rallenta o gira.
Più si tiene palla e più le soglie si allentano (in 5 secondi), così l'azione non si pianta.

Gli altri due: il simulatore JavaScript tira per zone (10 su 100 a metà campo solo se bravo e libero, 70 al limite, fino
a 100 vicino alla linea); il gioco Godot tira 3 volte su 10 a ogni decisione entro una certa distanza.

## Portiere (GameplayFootball)
Sta sulla bisettrice tra pallone e pali, 70 cm davanti alla linea. Esce solo se l'attaccante arriva al «punto di tiro»
prima del difensore più vicino (più di un metro di vantaggio). Trattiene il pallone solo se arriva piano, se no respinge.
Lo rimette in gioco solo verso un compagno con 10 m liberi attorno, o dopo 4 secondi
(`strategies/offtheball/goalie_default.cpp`, `humanoid.cpp:585-614`).

## Tre prove proposte (32 partite, semi 7–38, una per volta)
1. **Smarcamento fuori dall'ombra**: al posto dei 9 punti attorno a casa, le spinte di GameplayFootball (via dall'ombra
   dell'avversario, 10 m tra compagni, anello attorno al portatore), ricalcolate ogni 0,1–0,2 s. Si guarda: passaggi in
   avanti di almeno 8 m (oggi 13,6 a partita, riusciti 69 su 100) e possessi oltre la trequarti (13 su 28).
2. **Inserimento a condizione**: un solo corridore, quello più vicino al punto 26 m davanti al portatore, che parte quando
   lì c'è spazio e corre 4 secondi, al posto degli inserimenti a tempo.
3. **Tiro a tre bersagli**: niente tiri da oltre 22 m, tre bersagli valutati con la gara di tempi (portiere compreso),
   mira al migliore. Si guarda: tiri per distanza e gol ogni quanti tiri.
Dopo queste, la conduzione in avanti a campo libero (già chiesta da Alex) si può fare col campo di forze del punto 3.
