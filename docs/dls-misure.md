# Dream League Soccer: misure di gameplay per il gioco di calcio Fantatitano

> **Per la chat Claude Code «gioco - dls x fantatitano».** Questo file raccoglie i valori misurati da una partita reale di DLS registrata da Alex su iPhone (28 nov 2026, Sander-Arsenal 1-0, partita intera). Serve a tarare velocità, accelerazioni, palla, portiere e telecamera del gioco di Fantatitano.
> Tutte le unità sono **metri, secondi, m/s, m/s²**. I numeri descrivono *come si comporta* DLS: è uno studio di riferimento, non codice né asset copiati.

---

## 0. Riassunto veloce (i numeri da usare subito)

| Cosa | Valore DLS misurato | Affidabilità |
|---|---|---|
| Corsa "normale" dei giocatori | **~6 m/s** (22 km/h); range tipico 4-7 m/s | alta |
| Scatto massimo | **8,5-9 m/s** (30-32 km/h) | alta |
| Accelerazione da fermo a 6 m/s | **~0,65 s** (mediana; metà dei casi tra 0,3 e 1,1 s) | media |
| Frenata da 6 m/s a quasi fermo | **~0,6 s** (mediana; metà dei casi tra 0,25 e 1,1 s) | media |
| Conduzione palla al piede | **~6 m/s** tipico, fino a ~8,3 m/s | media |
| Passaggio rasoterra | **12-16 m/s** | media-alta |
| Passaggio forte / filtrante | **20-24 m/s** | media |
| Tiro | **24-30 m/s** (gol verificato: ~24 m/s di media su 13 m); i più forti 30-38 m/s | media |
| Rallentamento della palla che rotola | **~4-6 m/s²** | bassa |
| Reazione del portiere al tiro | **0,1-0,3 s** al primo movimento; tuffo a ~0,4 s | media (2 tiri) |
| Barra di carica del tiro | visibile **0,1-0,4 s** prima del calcio | media |
| Telecamera | alta **~14 m**, a **~45 m** dalla palla (37-52), inclinata **~20°**, FOV verticale **~27°**; inquadra **~46 m** di campo in larghezza | media |
| Durata partita | 90' di gioco in **~6 minuti reali** (~3 min a tempo) | alta |
| Altezza giocatori (in piedi) | **~1,80-1,85 m**; durante la corsa la sagoma scende a 1,6-1,75 m | media-alta |
| Proporzioni del corpo | **~8 teste** di altezza (più slanciato del reale, ~7,5) | media (1 primo piano) |
| Larghezza spalle/torso | **~0,45-0,50 m** di fronte, ~0,30 m di profilo | media |
| Palla | diametro **~0,22-0,23 m** (misura reale) | media |
| Scala del mondo | **realistica**: campo standard, palla e giocatori a misura reale | alta |

---

## 1. Da dove vengono i numeri (metodo)

- **Fonte**: 8 clip da circa 60 s (registrazione schermo dell'iPhone, 1180×2556 a ~58 fps, ruotata in orizzontale). Le clip di gioco sono 7, per circa 6 minuti di partita; l'ottava contiene i menu di fine partita.
- **Il metro**: in DLS l'erba ha **strisce larghe 5,25 m** (una coppia chiara+scura = 10,5 m, cioè 20 strisce su 105 m). Il valore è verificato al calcio d'inizio con il cerchio di centrocampo (diametro 18,3 m): in quel fotogramma il cerchio era largo 1094 px e una coppia di strisce 622 px, quindi 10,5 m. In ogni fotogramma la larghezza delle strisce, riga per riga, dà la scala locale (px per metro) anche quando la telecamera si muove o zooma.
- **Controllo della scala**: l'altezza dei giocatori, misurata con questa scala, esce tra **1,6 e 1,85 m**. La scala è corretta.
- **Palla**: in DLS è **gialla**. È stata rilevata per colore e dimensione (scartati i blob grandi come la maglia gialla del portiere dell'Arsenal), poi seguita nel tempo. La posizione lungo il campo viene dalla fase delle strisce, quella in profondità dalla riga dello schermo e dalla geometria della telecamera.
- **Giocatori**: rilevati dal colore della maglia (rosso Arsenal, blu Sander) e seguiti fotogramma per fotogramma. La velocità è calcolata su finestre di 0,25-0,5 s per togliere il tremolio. Il campione è di circa **1.480 secondi-giocatore**.
- **Tiri e portiere**: verificati **a mano**, fotogramma per fotogramma, su 2 azioni.
- **Margine d'errore** sulle velocità: circa **±10-15%**.

### Limiti noti
- **Palla in aria** (cross, rilanci, tiri alti): il metodo la tratta come se fosse a terra, quindi la velocità viene sovrastimata. Per questo i valori sopra i 35 m/s rilevati in automatico sono in gran parte errori; i tiri sono stati controllati a mano.
- **Palla molto veloce**: con la sfocatura di movimento il colore cambia e il rilevamento la perde per qualche fotogramma.
- **"Cosa pensa" l'IA**: non si vede dal video. La sezione 6 descrive comportamenti osservati, non regole interne.
- **Forma della squadra dalla minimappa**: ho provato a misurarla, ma i dati uscivano troppo sporchi (segnaposto sovrapposti, linee del campo scambiate per giocatori) e li ho scartati. Restano solo le osservazioni qualitative.

---

## 2A. Personaggi: altezza, grandezza e struttura del corpo

### 2A.1 Scala del mondo
DLS usa una **scala realistica**, ed è la prima cosa da replicare: se il mondo di Fantatitano non è 1 unità = 1 metro, velocità e animazioni sembreranno sbagliate.
- **Cerchio di centrocampo**: 18,3 m (misura regolamentare), usato come metro.
- **Strisce dell'erba**: 5,25 m l'una, cioè 20 strisce su 105 m.
- **Palla**: 15×12 px su una scala di 65,9 px/m, quindi **~0,23 m** di diametro (reale 0,22 m). L'altezza apparente è minore per la prospettiva.
- **Giocatori**: ~1,8 m (vedi sotto).

### 2A.2 Altezza e ingombro in partita
Misurati su **1.156 sagome di giocatori** (1 fotogramma al secondo da 4 clip, solo sagome con la maglia della squadra visibile), convertiti in metri con la scala locale. L'altezza è corretta di 0,95 per l'inclinazione della telecamera.

| Misura | p10 | p25 | mediana | p75 | p90 |
|---|---|---|---|---|---|
| Altezza sagoma (m) | 1,35 | 1,49 | 1,65 | 1,78 | 1,89 |
| Ingombro in larghezza, braccia e gambe comprese (m) | 0,58 | 0,67 | 0,79 | 0,96 | 1,11 |
| Larghezza torso / maglia (m) | 0,24 | 0,28 | 0,33 | 0,39 | 0,49 |
| Altezza sullo schermo (px, schermo 1180 px di altezza) | | | 82 | | |

**Lettura**:
- In piedi i giocatori sono alti **~1,80-1,85 m** (p75-p90). La mediana più bassa (1,65 m) dipende dal fatto che in corsa il corpo è inclinato e le ginocchia piegate, e da qualche sagoma tagliata o sovrapposta.
- Il torso è largo **~0,45-0,50 m** visto di fronte e **~0,25-0,33 m** di profilo.
- In corsa l'ingombro arriva a **~0,8-1,1 m**: con il passo lungo e le braccia larghe la sagoma diventa più ampia.
- Sullo schermo un giocatore occupa **~80 px su 1180 di altezza, cioè ~7%**: è piccolo. Per questo DLS usa colori di maglia molto saturi e un indicatore verde sopra il giocatore controllato.
- Le altezze sembrano **tutte simili**: dalla telecamera di gioco non si notano giocatori molto più alti o bassi. Se DLS varia l'altezza, la variazione è piccola, sotto i ±5 cm visibili.

### 2A.3 Proporzioni del corpo (da un primo piano di profilo)
Misurate sul giocatore n.5 dell'Arsenal, in piedi a figura intera di profilo (clip 1mFi, t ≈ 48,1 s; sagoma alta 844 px). Valori in frazione dell'altezza totale H, misurati da terra.

| Punto del corpo | Altezza da terra | Riferimento reale (adulto) |
|---|---|---|
| Testa (dalla cima al mento) | **~0,12 H**, cioè ~8 teste | ~0,13 H (7,5 teste) |
| Mento | ~0,88 H | ~0,87 H |
| Spalle (punto più alto) | **~0,85 H** | ~0,82 H |
| Fondo della maglia | ~0,52 H | n/d |
| Fondo dei pantaloncini | **~0,35 H** | n/d |
| Inizio calzettoni (sotto il ginocchio) | ~0,29 H | n/d |
| Ginocchio | **~0,27 H** | ~0,28 H |
| Caviglia | ~0,06 H | ~0,04 H |

**Lettura**:
- Il corpo è **atletico e slanciato**: testa leggermente piccola (~8 teste), spalle alte e larghe, gambe lunghe e muscolose. Le proporzioni sono "da calciatore idealizzato", non caricaturali.
- **Divisa**: maglia aderente a maniche corte, pantaloncini al ginocchio con fondo a ~0,35 H, calzettoni fin sotto il ginocchio, scarpini colorati e ben visibili.
- **Posa a riposo**: in piedi, leggermente inclinato in avanti, braccia lungo i fianchi o mani sui fianchi.
- **Per gli avatar chibi/fumetto di Fantatitano** (figura intera tipo figurina): sono un'altra cosa, vanno bene teste grandi (2,5-4 teste). Per i **giocatori 3D in partita** invece conviene restare vicini a queste proporzioni realistiche: con una telecamera a 45 m una testa grande si vede appena e falsa la scala.

### 2A.4 Valori consigliati per i modelli 3D di Fantatitano (in partita)
- **Altezza modello**: 1,80 m, con una variazione eventuale di ±0,05-0,08 m per ruolo (difensori e portieri più alti).
- **Spalle**: 0,46 m. **Profondità torace**: ~0,25 m.
- **Testa**: 0,22-0,23 m (1/8 dell'altezza).
- **Ginocchio** a 0,49 m da terra (0,27 H); **anca/cavallo** a ~0,85-0,90 m.
- **Raggio di collisione** (capsula) **~0,35-0,40 m**, altezza 1,8 m. Due giocatori non si avvicinano oltre ~0,7-0,8 m tra i centri, coerente con l'ingombro in corsa.
- **Palla**: raggio **0,11 m**.
- **Mixamo**: gli scheletri standard sono già intorno a 1,8 m. Controlla che la scala d'importazione dia 1,8 unità, perché spesso arrivano in centimetri (fattore 100).

---

## 2. Giocatori: velocità

### 2.1 Distribuzione delle velocità (tutti i giocatori visibili, tutte le clip)

| Percentile | m/s | km/h |
|---|---|---|
| p10 | 0,56 | 2,0 |
| p25 | 1,59 | 5,7 |
| p50 (mediana) | 3,31 | 11,9 |
| p75 | 5,19 | 18,7 |
| p90 | 6,76 | 24,3 |
| p95 | 7,55 | 27,2 |
| p98 | 8,39 | 30,2 |
| p99 | 8,98 | 32,3 |

| Fascia di velocità | % del tempo |
|---|---|
| 0-1 m/s (fermo / aggiustamento) | 16,6% |
| 1-2 m/s (camminata) | 14,1% |
| 2-4 m/s (corsetta) | 28,8% |
| 4-6 m/s (corsa) | 24,1% |
| 6-7 m/s (corsa veloce) | 8,1% |
| 7-8 m/s (scatto) | 5,0% |
| 8-9 m/s (scatto pieno) | 2,2% |
| > 9 m/s | 1,0% (quasi tutto rumore di tracking) |

**Lettura**:
- I giocatori senza palla passano metà del tempo sotto i 3,3 m/s: si riposizionano, non corrono sempre.
- La corsa "di default" si aggira sui 6 m/s.
- Lo scatto vero (sopra 7 m/s) copre solo l'8% del tempo, ed è quello che dà l'effetto "esplosivo".
- La velocità massima realistica da usare come tetto è **9 m/s**.

### 2.2 Accelerazione e frenata

| Passaggio | Mediana | p25-p75 | Campioni |
|---|---|---|---|
| da < 1 m/s a 6 m/s | **0,65 s** | 0,30-1,08 s | 522 |
| da > 6 m/s a < 1 m/s | **0,62 s** | 0,25-1,07 s | 449 |

- In accelerazione media, 0→6 m/s in ~0,65 s corrisponde a **~9 m/s²**. Nei casi più rapidi (p25) si arriva a ~20 m/s².
- La frenata ha un ordine di grandezza simile: **~10 m/s²**, picchi oltre 20.
- Da 6 a 8 m/s il passaggio è troppo breve per misurarlo con questo metodo. Indicazione pratica: in DLS lo scatto arriva quasi subito dopo la corsa (meno di 0,5 s).

### 2.3 Conduzione palla
- 41 tratti di conduzione da almeno 1,2 s: **velocità mediana 6,0 m/s**, punte (p90 dentro il tratto) **8,3 m/s**, durata mediana di un tratto 1,8 s.
- **Chi ha la palla è lento quasi quanto chi corre senza**: perde solo 0,5-1 m/s rispetto allo scatto libero. È una scelta "arcade" che rende la partita veloce.

---

## 3. Palla

### 3.1 Velocità iniziale dei calci (409 calci rilevati in automatico)

| Velocità iniziale | Numero | Interpretazione |
|---|---|---|
| 8-10 m/s | 48 | tocchi, controlli, passaggi corti morbidi |
| 10-18 m/s | 182 | **passaggi rasoterra normali** (picco a 12-16 m/s) |
| 18-26 m/s | 123 | **passaggi forti / filtranti / lanci** (picco a 22-24 m/s) |
| 26-46 m/s | 56 | tiri, rinvii, palle alte (sopra i 35 m/s in gran parte palla in aria, quindi sovrastimati) |

### 3.2 Esempi di passaggi seguiti dall'inizio alla fine

| Clip / t (s) | Velocità iniziale | Durata | Distanza | Velocità finale |
|---|---|---|---|---|
| 1tLV 25,29 | 11,5 m/s | 0,62 s | 5,9 m | 6,6 m/s |
| 1DUA 40,32 | 12,5 m/s | 0,97 s | 6,1 m | 3,9 m/s |
| 1_c5 20,27 | 18,2 m/s | 0,88 s | 9,5 m | 6,1 m/s |
| 1NKE 48,26 | 15,4 m/s | 0,88 s | 12,0 m | 9,8 m/s |
| 1tLV 26,71 | 12,5 m/s | 1,15 s | 13,8 m | 6,9 m/s |
| 1uh_ 53,85 | 12,0 m/s | 1,65 s | 14,4 m | 3,0 m/s |
| 1_c5 2,83 | 18,0 m/s | 1,60 s | 22,3 m | 12,1 m/s |
| 1_c5 34,35 | 14,9 m/s | 1,58 s | 24,6 m | 8,3 m/s |
| 02_1y9M 37,56 | 21,7 m/s | 1,65 s | 28,8 m | 9,5 m/s |

**Regola pratica DLS**:
- passaggio corto (5-10 m): arriva in **0,6-0,9 s**;
- passaggio medio (12-15 m): **~1,1-1,6 s**;
- passaggio lungo rasoterra (22-29 m): **~1,6 s**, perché parte più forte.

In pratica il gioco **alza la potenza con la distanza**, così i tempi di arrivo restano brevi.

### 3.3 Rallentamento della palla
- Ricavato da velocità iniziale, velocità finale e durata dei passaggi qui sopra: **~4-6 m/s²** (affidabilità bassa, perché il valore include anche il momento in cui il compagno la controlla).
- Su un campo vero una palla che rotola rallenta di meno (circa 1-2 m/s²). DLS la frena di più, così la palla "muore" vicino al compagno e non scappa.
- Suggerimento: un attrito/damping che dia **4-5 m/s²** a terra, più una resistenza dell'aria proporzionale a v² per i tiri.

### 3.4 Tiro (verificato a mano)

**Gol 1-0 (clip 1DUA, t ≈ 23,3-24,0 s, minuto ~35')**

| Momento | t (s) | Cosa succede |
|---|---|---|
| Carica | fino a 23,415 | barra di carica bianca sopra il tiratore (visibile almeno 0,12 s) |
| Calcio | ~23,43-23,45 | la barra sparisce, la palla parte |
| +0,11 s | 23,55 | palla già a ~2,9 m dal piede (~26-29 m/s in partenza) |
| +0,30 s | ~23,75 | il portiere fa il primo movimento (braccio) |
| +0,40 s | ~23,83-23,90 | il portiere inizia il tuffo |
| +0,55 s | ~23,99 | palla in rete |

- Distanza tiratore-linea di porta: **~13 m** (dentro l'area, tra il dischetto e il limite).
- Velocità media: 13 m / 0,55 s = **~24 m/s** (~85 km/h); in partenza ~27 m/s.

**Tiro di Son a lato (clip 1mFi, t ≈ 43,2-44,0 s, minuto ~81')**

| Momento | t (s, offset da 43,2) | Cosa succede |
|---|---|---|
| Carica | 0,05 → 0,45 | barra di carica visibile **~0,4 s** (si riempie di rosso) |
| Calcio | ~0,50 | barra sparita, palla in volo a 0,548 |
| Reazione portiere | ~0,60 | il portiere alza già il braccio (**~0,1 s dopo il calcio**) |
| Esito | da 3,46 | palla alta/a lato, compare «CALCIO DI RINVIO» |

**Lettura**:
- Il tiro in DLS è **"carica e rilascia"**: più tieni il pulsante, più la barra si riempie. In questi due casi la carica è durata da 0,1 a 0,4 s.
- La velocità finale del tiro sta sui **24-30 m/s**. È più lenta di un tiro reale potente (30-35 m/s), ma con la telecamera lontana sembra fortissima.

---

## 4. Portiere

### 4.1 Tempi
- **Primo movimento: 0,1-0,3 s dopo il calcio.** Sul tiro di Son la reazione è quasi immediata (0,1 s); sul gol arriva a 0,3 s.
- **Tuffo: ~0,4 s dopo il calcio.** Su un tiro da 13 m a ~24 m/s, che arriva in 0,55 s, il portiere è in ritardo: **i tiri forti da dentro l'area entrano**.
- Con 0,1 s la reazione è più veloce di quella umana: è probabile che il gioco conosca la traiettoria e lanci un'animazione di parata. Il ritardo variabile (0,1-0,3 s) è ciò che decide parata o gol.

### 4.2 Posizionamento (osservato)
- Quando la palla è vicina all'area, il portiere sta **in piedi, 2-5 m davanti alla linea di porta**, all'altezza dell'area piccola.
- **Segue la palla di lato**: mentre l'attaccante scende sulla fascia, si sposta verso il palo vicino restando tra palla e centro della porta (movimento ad arco).
- Prima del tiro fa piccoli passi laterali e in avanti; non si "carica" basso prima del calcio.
- **Quando la sua squadra attacca, esce molto**: nella minimappa il portiere del Sander è stato visto **a ~22 m dalla porta**, al limite dell'area, e quello dell'Arsenal a ~10 m. È un portiere che fa anche il libero.

### 4.3 Logica suggerita per il portiere di Fantatitano
1. Posizione base: su un arco a **3-5 m** dalla linea, sempre sulla bisettrice tra palla e centro porta.
2. Squadra in attacco: avanza fino a **15-20 m** (stile "libero").
3. Al tiro calcola il punto di arrivo e applica un **ritardo di reazione casuale tra 0,1 e 0,3 s**, più lungo se il tiro è forte o angolato.
4. Il tuffo parte **~0,1 s dopo il primo movimento** e dura ~0,4-0,5 s.
5. Parata se il portiere raggiunge il punto prima della palla; altrimenti gol o deviazione.

---

## 5. Telecamera

| Parametro | Valore stimato | Note |
|---|---|---|
| Altezza | **~14 m** (p10-p90: 12,7-14,3) | quasi costante |
| Distanza dalla palla (a terra) | **~45 m** (p10-p90: 37-52) | varia con lo zoom |
| Inclinazione verso il basso | **~20°** | dal cerchio di centrocampo al calcio d'inizio |
| FOV verticale | **~27°** (orizzontale ~54° su schermo 19,5:9) | stima, dipende dall'inclinazione |
| Campo visibile in larghezza | **~46 m** all'altezza della palla (p10-p90: 37-54) | |
| Scala sulla palla | ~56 px/m (schermo 1180 px di altezza) | |
| Comportamento | segue la palla tenendola **al centro** | pan laterale continuo |
| Zoom | **stretto al calcio d'inizio** (cerchio largo quasi tutto lo schermo), **più largo in gioco aperto** | |
| Lato | sempre dalla stessa tribuna, laterale stile TV | |
| Impostazioni nel menu di DLS (viste all'intervallo) | **Telecamera: «Linea laterale»**, **Distanza telecamera: 50%** | altre voci: Risparmio energetico No, Sostituzioni rapide Sì, Boost squadra Sì |

> I valori misurati valgono per **«Linea laterale» con distanza al 50%**. DLS permette di cambiare la distanza: per Fantatitano conviene offrire anche tu un cursore "distanza telecamera".

**Perché conta per i "giocatori lenti"**: la velocità che si *percepisce* dipende da quanti metri entrano nello schermo.
- Con ~46 m in larghezza, un giocatore a 9 m/s attraversa un quinto dello schermo in un secondo.
- Se la telecamera di Fantatitano è più vicina o più bassa, la stessa velocità sembra più lenta e "pesante"; se è molto più lontana, i giocatori sembrano formiche lente.
- Conviene replicare **altezza ~14 m, distanza ~40-45 m, FOV ~27° verticale** e poi tarare a occhio.

---

## 6. IA e movimento della squadra (osservazioni qualitative)

Sono comportamenti visti nei fotogrammi e nella minimappa, non misurati con precisione:

- **Blocco compatto vicino alla palla**: nella minimappa la maggior parte dei giocatori si raccoglie in una zona di 30-40 m attorno alla palla, sia in attacco sia in difesa.
- **Pressing**: senza palla il pulsante B diventa «PRESSING». I difensori vicini vanno sul portatore, gli altri chiudono le linee di passaggio.
- **Smarcamenti**: i compagni del portatore corrono in avanti (4-7 m/s) mentre lui conduce, offrendo passaggi in profondità. È qui che si vedono i passaggi forti a 20-24 m/s.
- **Mentalità**: sotto la minimappa compare un banner tipo «IN ATTACCO», con frecce per alzare o abbassare la mentalità della squadra.
- **Portiere libero** quando la squadra attacca (vedi 4.2).
- **Cambio giocatore**: senza palla il pulsante C diventa «CAMBIA GIOCATORE». Sul giocatore controllato c'è un indicatore verde con il nome.

---

## 7. Comandi e interfaccia (contestuali)

| Situazione | A | B | C |
|---|---|---|---|
| Con la palla | Calcio forte (tiro) | Calcio basso (passaggio rasoterra) | Calcio alto (lob / cross) |
| Senza palla | contrasto / scivolata | Pressing | Cambia giocatore |

- Joystick virtuale a sinistra, tre pulsanti a destra, minimappa in basso al centro, punteggio e tempo in alto a sinistra.
- Il tiro carica una barra sopra il giocatore mentre si tiene premuto.
- Al gol: replay con «TOCCA PER SALTARE». All'intervallo: pubblicità e schermata del giocatore.

---

## 8. Ritmo della partita

- Calcio d'inizio a ~24 s della prima clip, 90:00 nella settima: **circa 6 minuti reali per 90'** (intervallo incluso), cioè ~3 minuti per tempo.
- Il cronometro corre in media **~15 volte** più veloce del reale. In un tratto è sembrato rallentare vicino all'area, ma non è confermato.
- Nella partita analizzata ci sono 409 calci rilevati, cioè circa **1 calcio ogni 0,85 s** di gioco (tocchi compresi).

---

## 9. Costanti consigliate per Fantatitano (punto di partenza)

Valori pensati per partire vicini alla sensazione di DLS. Unità SI; il motore è indifferente (Three.js, Unity…).

```ts
// === Scala e corpo (1 unità = 1 metro) ===
export const BODY = {
  height: 1.80,            // m (variazione ruolo ±0.05-0.08)
  headHeight: 0.225,       // m  (~8 teste)
  shoulderWidth: 0.46,     // m
  chestDepth: 0.25,        // m
  kneeHeight: 0.49,        // m  (0.27 H)
  shortsHemHeight: 0.63,   // m  (0.35 H)
  collisionRadius: 0.38,   // m  capsula
  ballRadius: 0.11,        // m
};
export const PITCH = { length: 105, width: 68, centreCircleRadius: 9.15, stripeWidth: 5.25 };

// === Giocatori ===
export const PLAYER = {
  walkSpeed: 1.6,        // m/s
  jogSpeed: 3.5,         // m/s
  runSpeed: 6.0,         // m/s  (corsa "di default" DLS)
  sprintSpeed: 8.8,      // m/s  (tetto 9.0)
  dribbleSpeed: 6.0,     // m/s  con palla, corsa
  dribbleSprintSpeed: 8.2,
  accel: 9.5,            // m/s^2  (0->6 m/s in ~0.65 s)
  accelBurst: 18,        // m/s^2  per i primi 0.2 s di uno scatto (sensazione "esplosiva")
  decel: 10,             // m/s^2  (6->0 in ~0.6 s)
  turnRateDeg: 540,      // deg/s  (stima: i cambi di direzione in DLS sono quasi istantanei)
};

// === Palla ===
export const BALL = {
  passGround: { min: 10, max: 18 },   // m/s, scala con la distanza del compagno
  passDriven: { min: 18, max: 25 },   // m/s, filtranti/lanci
  shot:       { min: 22, max: 32 },   // m/s, scala con la carica
  rollingDecel: 4.5,                  // m/s^2 a terra
  airDragK: 0.012,                    // decel = k * v^2 in volo (da tarare)
  shotChargeTime: 0.4,                // s per arrivare alla carica piena
};

// === Portiere ===
export const GK = {
  baseDistanceFromLine: 4,       // m
  sweeperDistanceWhenAttacking: 18, // m
  reactionDelay: [0.10, 0.30],   // s, casuale; più alto per tiri forti/angolati
  diveDuration: 0.45,            // s
  lateralSpeed: 4.5,             // m/s passi laterali (stima)
};

// === Telecamera ===
export const CAMERA = {
  height: 14,          // m
  distance: 44,        // m dalla palla (orizzontale)
  pitchDeg: 20,        // inclinazione verso il basso
  fovVerticalDeg: 27,
  followCentered: true,
  kickoffZoomDistance: 30, // m, più stretta al calcio d'inizio
};

// === Ritmo ===
export const MATCH = {
  realMinutesPerHalf: 3,   // ~90' in ~6 min reali
};
```

### Sincronizzare animazioni Mixamo e velocità (causa n.1 dei giocatori "lenti")
- Usa animazioni **in-place**, cioè senza root motion, e muovi il giocatore via codice con le velocità qui sopra.
- Imposta la **velocità di riproduzione** dell'animazione in proporzione a quella reale: `playbackRate = velocitàAttuale / velocitàDiRiferimentoClip`. La velocità di riferimento di una clip si ricava misurando quanti metri copre un ciclo di passo: `lunghezzaCiclo / durataCiclo`.
- Fai un **blend** tra le clip in base alla velocità (idle → walk → jog → run → sprint) con soglie vicine a 0,5 / 1,6 / 3,5 / 6 / 7,5 m/s.
- Se i piedi "scivolano" il giocatore sembra lento anche se va veloce. Verifica che un ciclo di corsa a 6 m/s copra ~1,4-1,6 m per passo.

---

## 10. Checklist: perché i giocatori di Fantatitano sembrano lenti

0. **Scala dei modelli**: un giocatore è alto 1,8 unità e la palla ha raggio 0,11? Con Mixamo importato in centimetri tutto è sbagliato di un fattore 100, e nemmeno con le velocità giuste il gioco sembrerà a posto.
1. **Velocità**: corsa a ~6 m/s e scatto a ~8,8-9 m/s? Se sono sotto i 5 m/s, sono più lenti di DLS.
2. **Accelerazione**: arrivano a 6 m/s in ~0,6 s? Una rampa da 1,5-2 s li rende "pesanti".
3. **Frenata e cambi di direzione**: si fermano in ~0,6 s e girano quasi subito? Se derapano a lungo sembrano lenti.
4. **Scala del mondo**: il campo è 105×68 m e i giocatori sono alti ~1,8 m nelle stesse unità? Se il campo è più grande in unità (per esempio 1 unità ≠ 1 m), tutto sembra più lento.
5. **Animazioni**: playback proporzionale alla velocità, senza scivolamento.
6. **Telecamera**: altezza ~14 m, distanza ~45 m, FOV ~27°. Una camera vicina e bassa rallenta la percezione.
7. **Delta time**: il movimento usa il tempo reale (`dt`) e non i fotogrammi? Se scende il frame rate, i giocatori rallentano.
8. **Palla**: passaggi a 12-16 m/s e tiri a 24-30 m/s, con la palla che frena a ~4-5 m/s². Una palla lenta fa sembrare lento tutto il gioco.

---

## 11. Prossime registrazioni utili (per misure più precise)

Brevi clip (20-60 s ciascuna), con il microfono acceso per dire cosa si sta facendo:
1. **Scatto puro**: un giocatore che corre da fermo in linea retta per tutto il campo, sia con palla sia senza.
2. **Passaggi**: 10 rasoterra corti, 10 lunghi, 10 alti, dicendo il tasto e quanto lo tieni premuto.
3. **Tiri**: da dischetto, limite dell'area e 25 m, con carica bassa, media e piena.
4. **Portiere**: 10 tiri in porta da posizioni diverse, per avere più tempi di reazione.
5. **Cambi di direzione**: zig-zag con e senza palla, per misurare il raggio di curva.
6. **Primi piani dei personaggi**: schermata della rosa, esultanze e replay, per misurare meglio le proporzioni (di fronte e di profilo) e vedere se l'altezza cambia da giocatore a giocatore.

---

*Analisi fatta con Claude il 28/11/2026 sulla registrazione «ScreenRecording_11-28-2026 10-45-02» (cartella Drive con 8 clip). Metodo: tracking a colori + strisce dell'erba come metro (OpenCV/ffmpeg).*
