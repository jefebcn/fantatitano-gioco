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

## Com'è andata (23/11): cosa è entrato nel gioco e cosa no
Obiettivi nuovi di Alex per computer contro computer: 10–14 tiri, 4–6 gol (35–45 tiri in gol su 100), 30–45 passaggi per
squadra. Ogni riga è una serie di 32 partite (semi 7–38), nessuna anomalia salvo dove detto.

| | Tiri (vicini / lontani) | Gol | In gol | Passaggi per squadra | In avanti riusciti | Oltre trequarti |
|---|---|---|---|---|---|---|
| Gioco di prima | 7,2 (4,2 / 3,0) | 1,3 | 19% | 37,8 | 8,8 su 13,0 | 12,3 su 27,6 |
| 1. Smarcamento col voto unico | 7,1 (3,6 / 3,4) | 1,7 | 23% | 37,8 | 12,5 su 18,5 | 13,5 su 30,3 |
| 3. Tiro a tre bersagli, come soglia | 4,1 (3,7 / 0,4) | 1,1 | 28% | 38,8 | 9,0 su 14,4 | 12,4 su 28,7 |
| 1 + 3 | 3,4 (2,9 / 0,5) | 1,0 | 30% | 39,7 | 12,7 su 19,4 | 13,8 su 32,8 |
| 1 + 3 + 2 (inserimento a condizione) | 5,5 (5,2 / 0,3) | 0,8 | 15% | 37,7 | 11,5 su 16,4 | 12,2 su 26,8 |
| … più campo di forze in conduzione | 3,7 (3,5 / 0,2) | 0,8 | 22% | 37,1 | 9,9 su 15,0 | 11,3 su 26,2 |
| … più portiere molto più debole | 5,3 (5,1 / 0,2) | 1,7 | 32% | 37,8 | 10,4 su 15,7 | 11,0 su 26,8 |
| **Tenuto**: 1 + 2, tre bersagli solo per la mira, portiere un po' più debole | 8,1 (5,5 / 2,7) | 2,8 | 34% | 36,5 | 9,4 su 13,5 | 11,4 su 26,7 |

Su altri 32 semi (39–70) il pacchetto tenuto fa 6,9 tiri e 2,2 gol contro 6,0 e 1,9 del gioco di prima: in tutto, su 64
partite, 7,5 tiri e 2,45 gol contro 6,4 e 1,75. Gli obiettivi restano lontani (10–14 tiri, 4–6 gol).

Cosa si è capito:
- **Il totale dei tiri inganna: bisogna separare piede e testa.** Con la soglia dei tre bersagli i tiri di piede erano
  scesi da 4,1 a 0,6 a partita: restavano quasi solo colpi di testa (3,4 a partita), che vanno fuori 3 volte su 10 e in
  gol 1–2 volte su 10. La gara di tempi conta ogni avversario, portiere compreso, e in area c'è sempre qualcuno vicino
  alla traiettoria. Per questo i tre bersagli ora scelgono solo dove mirare; quando tirare lo decidono le regole di prima.
  Strumento: `scripts/prove/tiri.cjs` (che fine fa ogni tiro).
- **L'inserimento a condizione è la prova che rende di più**: senza, la stessa combinazione fa 6,3 tiri e 1,4 gol; con,
  8,3 e 2,3. Chi si inserisce deve arrivare davanti alla porta (9 m dal fondo), non sulla linea: da lì tirava da posizione
  impossibile.
- **Il campo di forze in conduzione non ha reso** (meno tiri, più falli), e nemmeno il solo premio «avanti a campo
  libero» (dentro l'oscillazione). Scartati per ora.
- **Il portiere pesa poco**: da `save` 0,58 a 0,30 i tiri in gol salgono solo dal 27 al 32 per cento, perché metà dei
  tiri non gli arriva (fuori o ribattuti). Tenuto un ritocco moderato: `save` 0,42 per il computer, 0,44 per il portiere
  di chi gioca.
- **Difetto trovato per strada**: un gol da posizione molto angolata attraversava la rete laterale e il pallone usciva
  di quasi 50 metri («palla lontanissima»). Corretto in `src/grafica/stadio.js` (`urta`, `trattieni`).

Piede e testa separati, 16 partite (semi 7–22, `scripts/prove/tiri.cjs`):

| | Tiri di piede | in gol | Colpi di testa | in gol |
|---|---|---|---|---|
| Gioco di prima | 4,6 a partita | 23% | 1,4 a partita | 17% |
| Pacchetto tenuto | 4,3 a partita | 38% | 4,6 a partita | 26% |

Quindi i tiri in più sono tutti colpi di testa (chi si inserisce riceve palloni alti in area: 3 su 10 vanno fuori), mentre
i tiri di piede sono rimasti gli stessi ma entrano di più (mira e portiere). Di piede, 1 su 4 è ribattuto da un difensore
e 1 su 4 parato, quasi tutti da 20 metri.

Da dove ripartire per avvicinarsi agli obiettivi: più tiri di piede da dentro l'area (a chi si inserisce il pallone deve
arrivare rasoterra, non alto) e meno tiri da 20 metri ribattuti. I possessi oltre la trequarti restano 11–12 su 27: la
metà non diventa un tiro.
