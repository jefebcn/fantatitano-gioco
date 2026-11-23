# Navigazione — home, menu e sezioni

Prompt di Alex del 21/11/2026 («Home, menu e sezioni»). Questo file dice **dove si entra** in ogni schermata e **dove porta
Indietro**. Prevale su `docs/home-spec.md` §2 dove sono in conflitto; economia e database restano in `docs/home-spec.md`.
Stato di ogni schermata: in fondo, §6.

## 1. Regole che valgono ovunque

- **Livelli**: la HOME è il livello 0 (un menu di carte). Ogni carta apre una SEZIONE (livello 1). Ogni sezione ha le sue
  schermate (livello 2 e 3). La schermata che prima chiamavamo «home» (prossima partita, classifica, coppe) è la
  **Carriera**, livello 1.
- **Indietro** torna sempre alla schermata da cui si è arrivati (non salta livelli). Esempio: Carriera → Squadra →
  Indietro torna a Carriera; Home → Squadra → Indietro torna alla Home.
- **Finestre** (conferme, scheda del giocatore, scelta del modulo): si aprono sopra la schermata e si chiudono con la X o
  toccando fuori. Non contano come livello: Indietro non c'entra.
- **Barra in alto**, fissa e uguale ovunque:

  | Zona | Cosa | Tocco |
  |---|---|---|
  | sinistra | tre pulsanti quadrati: **Home** (la casetta: accesa nella home; nelle schermate aperte dalla home riporta lì; più in profondità diventa la **freccia Indietro**), Impostazioni, Info | livello precedente, Impostazioni, Info |
  | sinistra | **Premio del giorno**, verde | finestra con la serie di sette giorni |
  | centro | banner **Stagione**: divisione, «Partita 3 di 15», barra delle partite giocate, punti in classifica | Carriera |
  | centro | banner **Percorso premi**: livello, sfide della settimana col tempo che resta («2/5 1g 12h»), barra e punti verso il prossimo premio | Percorso premi |
  | destra | Diamanti e Monete in due capsule colorate, senza «+» (qui non si compra niente) | Come guadagnare |
  | estrema destra | stemma; nome del manager, nome del club e stelle uno sotto l'altro | Profilo |

  Struttura chiesta da Alex il 23/11. I pezzi si vedono alti 36 px e si toccano su 44. Se non ci sta tutto la barra si
  stringe a gradini: spariscono i nomi dentro i banner, poi le barre e le stelle, poi il profilo si accorcia. Nella barra
  non c'è più il titolo della schermata, né il collegamento diretto alle sfide della settimana (ci si arriva dalla Home).
  In partita la barra non c'è. Nella Sfida (pre-partita) c'è.
- **Apertura dei premi** (`src/casa/premio.js`, dal 23/11): una busta che si apre e mostra il premio. Breve, meno di un
  secondo, per il premio del giorno (dopo la prima partita della giornata), le sfide riscosse e i livelli del percorso
  premi; lunga, circa tre secondi, per i premi di fine stagione. Un tocco la salta; chi ha chiesto al telefono meno
  movimento vede subito il premio. Non è un livello della navigazione.
- **Bollino «!»** su ogni carta o pulsante dove c'è qualcosa da ritirare o da fare. La campanella delle notifiche non è
  più nella barra: gli avvisi sono i bollini (vedi §5, domanda 1).
- **Carte di navigazione**: fascia in alto col TITOLO e «>>», riassunto al centro, fascia sottile in basso con una frase
  o un timer. Tutta la carta si tocca. Carriera con la fascia oro, Scenario rossa scura, le altre azzurre o blu scuro.

## 2. Albero completo

```
AVVIO
├── prima volta → Benvenuto → Crea il club → Ingaggia il capitano → HOME
└── carriera già iniziata → HOME

HOME (livello 0)
├── CARRIERA
│   ├── GIOCA ADESSO → Sfida → Partita → Fine partita → Carriera
│   │                  └── Squadra (e ritorno alla Sfida)
│   ├── Classifica completa (schede: Classifica, Calendario, Risultati)
│   ├── Trofeo dei Castelli (gironi, poi tabellone) → Sfida
│   ├── Coppa Titano (tabellone) → Sfida
│   └── scorciatoie: Sfide, Squadra, Mercato, Il mio club
├── SCENARIO → Sfida già impostata → Partita → Fine partita → Scenario
├── PERCORSO PREMI
├── AMICHEVOLE → scelta dell'avversario → Sfida → Partita → Fine partita → Amichevole
├── SFIDE (schede: Giornaliere, Settimanali, Carriera, Stagione)
├── SQUADRA
│   ├── Modulo (finestra)
│   ├── Riserve
│   ├── Fisioterapista
│   ├── Allenatore (sedute di allenamento)
│   └── Scheda del giocatore (finestra): vendi, allena, capitano
├── MERCATO
│   ├── Scheda del giocatore (finestra) → conferma di acquisto
│   ├── Osservatore: ricerca comune, rara, leggendaria → giocatore scoperto (finestra)
│   └── Gestisci giocatori (vendita e svincolo)
└── IL MIO CLUB
    ├── Stadio e strutture → una struttura (finestra): livello, effetto, costo, Migliora
    ├── Personalizza
    │   ├── Divisa
    │   ├── Stemma
    │   ├── Nome (finestra)
    │   ├── Modifica giocatori
    │   ├── Modifica manager
    │   └── Negozio (categorie: Stemma, Divisa, Manager, Squadra)
    ├── Allenamento → Tutorial, Allenamento libero, Rigori, Calci di punizione, Calci d'angolo
    └── Amichevole (la stessa della home)

DALLA BARRA (da qualsiasi schermata)
├── Impostazioni (audio, comandi, grafica, lingua, account Fantatitano)
├── Info (regole, crediti, licenze)
├── Come guadagnare (fonti di monete e diamanti, storico)
└── Profilo (manager, statistiche, trofei)
```

## 3. Ogni schermata: da dove si entra, dove porta Indietro

Livello: 0 home, 1 sezione, 2 e 3 schermate interne. «da dove sei venuto» = la schermata precedente (regola del §1).

### 3.1 Avvio

| Schermata | Si entra da | Indietro | Cosa si tocca |
|---|---|---|---|
| Benvenuto | apertura del gioco senza carriera | — | «Inizia la carriera» → Crea il club; «Accedi con l'account Fantatitano» (se c'è una carriera salvata la riprende → Home) |
| Crea il club | Benvenuto | Benvenuto | nome del manager, nome e sigla del club, colori, divisa → «Avanti» |
| Ingaggia il capitano | Crea il club | Crea il club | 9 carte; il pulsante «Ingaggia …» sta in basso, fuori dalle carte → Home |

### 3.2 Home e Carriera

| Schermata | Liv. | Si entra da | Indietro | Cosa si tocca |
|---|---|---|---|---|
| **Home** | 0 | avvio; Indietro dal livello 1 | — | le 8 carte (§2) |
| **Carriera** | 1 | Home, carta CARRIERA | Home | Prossima partita → Sfida; Classifica → Classifica completa; Trofeo dei Castelli → gironi; Coppa Titano → tabellone; 4 scorciatoie |
| Classifica completa | 2 | Carriera, carta Classifica | Carriera | schede Classifica, Calendario, Risultati |
| Trofeo dei Castelli | 2 | Carriera | Carriera | gironi (poi tabellone); «Gioca» → Sfida |
| Coppa Titano | 2 | Carriera | Carriera | tabellone; «Gioca» → Sfida |
| **Sfida** | 2 | Carriera (GIOCA ADESSO), coppe («Gioca»), Scenario, Amichevole | da dove sei venuto | SQUADRA → Squadra (poi Indietro riporta qui); Riscaldamento (finestra di conferma); GIOCA → Partita |
| Partita | — | Sfida | non c'è: Pausa → Riprendi, Sostituzioni, Abbandona (→ da dove era partita la Sfida) | — |
| Fine partita | — | fine della partita | non c'è: «Continua» → Carriera (campionato e coppe), Scenario, Amichevole o Allenamento, secondo da dove si era partiti | premi presi, classifica aggiornata |
| Nuova stagione | finestra | Carriera, a campionato finito | chiude | conferma → Carriera della stagione nuova (il percorso premi riparte) |

### 3.3 Scenario, Percorso premi, Amichevole, Sfide

| Schermata | Liv. | Si entra da | Indietro | Cosa si tocca |
|---|---|---|---|---|
| **Scenario** | 1 | Home | Home | situazione di partenza, i due stemmi, timer, premio in diamanti; «Gioca» → Sfida già impostata |
| **Percorso premi** | 1 | Home; barra; Sfide (pannello a destra) | da dove sei venuto | 20 livelli; «Ritira» sui livelli raggiunti |
| **Amichevole** | 1 | Home; Il mio club | da dove sei venuto | avversario, difficoltà → Sfida |
| **Sfide** | 1 | Home; barra (evento della settimana → scheda Settimanali); scorciatoia in Carriera | da dove sei venuto | 4 schede; «Ritira»; premi dei giorni di fila; pannello Percorso premi |

### 3.4 Squadra

| Schermata | Liv. | Si entra da | Indietro | Cosa si tocca |
|---|---|---|---|---|
| **Squadra** | 1 (2 dalla Sfida) | Home; scorciatoia in Carriera; Sfida | da dove sei venuto | scambio (campo, sostituti, riserve) con due tocchi o trascinando una carta sull'altra; il primo tocco sceglie la carta e mostra il pulsante «Scheda», ritoccarla o toccare il vuoto annulla; pressione lunga → scheda; le linguette C, rigori, punizioni e corner si trascinano su un altro titolare; tessera Squadra migliore |
| Modulo | finestra | Squadra | chiude | 15 moduli su cinque colonne; quelli chiusi hanno il lucchetto |
| Riserve | 2 | Squadra | Squadra | i giocatori fuori dai 19 convocati; scambio con la panchina |
| Fisioterapista | 2 | Squadra | Squadra | recupero dell'energia per monete (uno o tutti) |
| Allenatore | 2 | Squadra; scheda del giocatore («Allena») | Squadra | sedute di allenamento per giocatore |
| Scheda del giocatore | finestra | pulsante «Scheda» della carta scelta o pressione lunga (Squadra, Riserve, Mercato, Gestisci giocatori) | chiude | statistiche, altezza, piede, valore; Vendi, Allena, Capitano (o Compra, dal Mercato) |

### 3.5 Mercato

| Schermata | Liv. | Si entra da | Indietro | Cosa si tocca |
|---|---|---|---|---|
| **Mercato** | 1 | Home; scorciatoia in Carriera | da dove sei venuto | carte evento, griglia dei giocatori → scheda → conferma |
| Osservatore | pannello nel Mercato | — | — | 3 ricerche col prezzo → giocatore scoperto (finestra: Ingaggia o Lascia) |
| Gestisci giocatori | 2 | Mercato; scheda del giocatore («Vendi») | Mercato | vendita e svincolo, con conferma |

### 3.6 Il mio club

| Schermata | Liv. | Si entra da | Indietro | Cosa si tocca |
|---|---|---|---|---|
| **Il mio club** | 1 | Home; scorciatoia in Carriera | da dove sei venuto | 4 carte: Stadio e strutture, Personalizza, Allenamento, Amichevole |
| Stadio e strutture | 2 | Il mio club | Il mio club | 6 strutture → finestra (livello, effetto del successivo, costo, Migliora) |
| Personalizza | 2 | Il mio club; Profilo | da dove sei venuto | Divisa, Stemma, Nome, Modifica giocatori, Modifica manager, Negozio |
| Divisa, Stemma, Modifica giocatori, Modifica manager | 3 | Personalizza | Personalizza | — |
| Negozio | 3 | Personalizza; «Sblocca» dentro Divisa, Stemma, Modifica manager | da dove sei venuto | categorie, griglia, anteprima, «Usa» o «Sblocca per ◆ 10» → conferma; se i diamanti non bastano «Come guadagnare» |
| Allenamento | 2 | Il mio club | Il mio club | 5 modi → Partita in allenamento → Fine → Allenamento |

### 3.7 Dalla barra

| Schermata | Si entra da | Indietro | Cosa si tocca |
|---|---|---|---|
| Impostazioni | barra | da dove sei venuto | audio, comandi, grafica, lingua, account Fantatitano |
| Info | barra | da dove sei venuto | regole, crediti, licenze |
| Come guadagnare | «+» della barra; negozio, mercato e strutture quando il saldo non basta | da dove sei venuto | elenco delle fonti; scheda Storico |
| Profilo | barra, a destra | da dove sei venuto | nome del manager, statistiche, trofei; «Personalizza» → Personalizza |

## 4. Cosa cambia rispetto a oggi

| Oggi | Con questa navigazione |
|---|---|
| Menu iniziale con «Continua la carriera», «Amichevole», «Accedi» | chi ha una carriera arriva subito alla Home; l'account va nelle Impostazioni, l'amichevole è una carta |
| La «home» è la schermata con prossima partita, classifica e coppe | quella è la **Carriera**; la Home è il menu di 8 carte |
| Barra: profilo a sinistra, Settimana, Premi, valute, 4 pulsanti con la campanella | barra del §1: Home o Indietro a sinistra, profilo a destra, senza campanella |
| Pre-partita con un campo solo | **Sfida** con i due campi e le carte dei giocatori |
| Mercato a scambio (cedi uno, prendi uno) | compravendita con le monete, osservatore, vendita e svincolo |
| Club: stadio, allenatore, stemma, finanze | 6 strutture a stelle; Personalizza col Negozio; Allenamento (5 modi) |
| Scenario | nuovo |
| Finanze, notifiche | lo storico sta in «Come guadagnare»; gli avvisi sono i bollini |

## 5. Decisioni di Alex (21/11)

| # | Cosa | Decisione |
|---|---|---|
| 1 | Campanella | non c'è: solo bollini «!» sulle carte e sui pulsanti della barra |
| 2 | Scenario | carta «In arrivo» finché la partita non sa partire da un minuto e da un punteggio dati |
| 3 | Allenamento | Rigori attivo; Tutorial, Allenamento libero, Punizioni e Calci d'angolo «In arrivo» |
| 4 | Energia tra le partite e risultati | formato dei dati in `docs/ponte-partita.md`, da girare alla sessione «partita» |
| 5 | Moduli | i 4 nuovi li aggiunge la sessione «partita» in `FORMS`; la home mostra quelli che esistono e i nuovi compaiono da soli (`moduli()` in `src/dati/scala.js`) |
| 6 | Codice della home | trasloca in `src/casa/` con un solo commit che tocca `src/game.js` e `src/pagina.html`, quando Alex conferma che la sessione «partita» è ferma |
| 7 | Valutazioni | cambia solo il numero mostrato, con una sola conversione (`scala` in `src/dati/scala.js`) per valutazione e statistiche; la forza in partita resta quella |
| 8 | Ruoli | ogni giocatore ha un ruolo preciso fisso in `src/dati/giocatori.js`, modificabile; il modulo dice i posti e chi è fuori ruolo viene segnalato |

## 6. Stato delle schermate

| Schermata | Stato |
|---|---|
| Benvenuto, Crea il club, Ingaggia il capitano | fatti: logo senza scritta, scala nuova, nove candidati con ruoli diversi, pulsante fuori dalle carte. Le carte a scudo ci sono nella Sfida; qui arrivano con la Squadra |
| Barra in alto e navigazione a livelli | fatte: uguali in tutte le schermate, Indietro torna da dove si era arrivati |
| Home (8 carte) | fatta, coi dati veri; illustrazioni ancora segnaposto |
| Carriera | fatta: prossima partita, classifica a cinque righe, le due coppe, scorciatoie; stagione nuova con finestra di conferma |
| Classifica completa, Trofeo dei Castelli, Coppa Titano | esistono |
| Sfida | fatta: due campi con le carte, competizione e tempo al centro, Squadra, Riscaldamento, Gioca; dopo la partita una finestra dice risultato e premio |
| Scenario | da fare (serve l'aggancio nella partita) |
| Percorso premi, Sfide | esistono, da risistemare (schede, giorni di fila) |
| Amichevole | esiste |
| Squadra | fatta, con la struttura del 23/11: quattro pulsanti a sinistra, campo fino al bordo in basso, sostituti a destra, incarichi trascinabili, squadra migliore, scheda del giocatore |
| Mercato | esiste a scambio, da rifare |
| Il mio club, Stadio e strutture | esiste con stadio e allenatore, da rifare con le 6 strutture |
| Personalizza, Negozio | esistono, da risistemare (anteprima grande, testi chiari) |
| Allenamento (5 modi) | da fare (serve la partita) |
| Impostazioni, Info, Come guadagnare, Profilo | esistono |
