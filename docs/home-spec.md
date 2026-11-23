# Home del gioco — specifica (Fase 5)

Stato (21/11): Alex ha approvato la struttura di **carriera, economia, diamanti e strutture** del §5, che sostituisce le
regole di prima su capitano, prezzi, allenamento, stadio e diamanti. È fatta nella logica (`src/carriera.js`) e collegata
alle schermate: Home, Carriera, Sfida e Squadra sono quelle nuove; Mercato, Il mio club, Sfide e «Come guadagnare» usano
già le regole nuove ma hanno ancora l'aspetto vecchio, fino ai passi 9, 10 e 11. Saldo e storico stanno sul telefono (e
nella copia sull'account), passando tutti da una sola funzione (`muovi` in `src/carriera.js`): per ora niente database (§4).

Regole che valgono per tutto il documento:
- Monete e diamanti non si comprano con soldi veri. Niente acquisti in-app, niente negozio a pagamento, niente pagamenti
  Apple o Google.
- Il logo è solo quello originale di Fantatitano. Gli stemmi sono segnaposto sostituibili. Le facce sono generiche: i
  ritratti sono render dei nostri modelli 3D.
- Niente testo finto: ogni scritta e ogni numero viene dai dati salvati.

## 1. Cosa c'è già e cosa cambia

I §1 e §2 raccontano il primo disegno della home. Dove dicono cose diverse valgono il §5 (carriera ed economia) e
`docs/navigazione.md` (schermate e percorsi).

La schermata principale di oggi (viola e lime) ha già quasi tutte le funzioni: carriera con campionato a 16 squadre, Coppa
Titano, Trofeo dei Castelli, classifica, sfide (5 giornaliere, 5 settimanali, 4 di carriera, 8 di stagione), mercato a
scambio, stadio a 5 livelli, allenamento, creazione del club (nome, colori, stemma), profilo, impostazioni, salvataggio sul
telefono e sull'account Fantatitano. I contatori del tuo disegno («0/5, 0/5, 0/4, 0/8») coincidono con le sfide che esistono.

| Parte | Oggi | Con la home nuova |
|---|---|---|
| Aspetto | viola e lime, carte semplici | blu notte e oro, sfondo San Marino, carte col bordo luminoso |
| Barra in alto | nome club e monete | pannello manager, pillola della settimana, PREMI, diamanti, monete, 4 pulsanti |
| Campionato, coppe, classifica | ci sono | stesse funzioni, carte nuove |
| Sfide | ci sono (4 gruppi) | carta con 4 anelli + stessa lista |
| Mercato | scambio alla pari di ruolo | uguale, con carta giocatore e frecce |
| Il mio club | stadio, allenamento, personalizza, amichevole | + allenatore, stemma, finanze |
| Percorso premi della stagione | non c'è | nuovo |
| «Come guadagnare» | non c'è | nuovo |
| Notifiche | non c'è | nuovo (elenco dentro il gioco, niente notifiche push) |
| Storico di entrate e uscite | solo gli scambi di mercato | completo, sul server |
| Monete e gemme | salvate dal telefono | saldo sul server, validato dal server (vedi §4) |
| Nome «gemme» | gemme | diamanti (solo il nome) |

## 2. Schermate e navigazione

### 2.1 La home
Orizzontale, disegnata su una base 2,36:1 e adattata a ogni schermo: su schermi più stretti (iPad 4:3) le carte si
accorciano in larghezza e crescono in altezza, sugli iPhone la barra e le carte rispettano la safe area (tacca e angoli).
Tutto in componenti HTML e CSS, nessuna immagine dell'interfaccia incollata.

Griglia (percentuali della larghezza utile, margini esclusi):

```
┌ pannello manager ─┐  [ SETTIMANA 2g 9h • 0/5 ] [PREMI]   ◆ 20 [+]  ● 500 [+]  [⌂][⚙][i][🔔]
┌───────────────┬───────────────────────────────────┬──────────────────┐
│ FANTATITANO   │ CLASSIFICA GENERALE - STAGIONE 1  │ SQUADRA          │
│ CAMPIONATO    │ (6 righe attorno alla nostra) logo│ capitano         │
│ avversario    ├─────────────────┬─────────────────┼──────────────────┤
│ GIOCA ADESSO  │ TROFEO DEI      │ COPPA TITANO    │ MERCATO          │
│ maglia nostra │ CASTELLI        │                 │                  │
│ MATCHDAY      ├─────────────────┴────────┬────────┴─────────┬────────┤
│               │ (spazio per lo sfondo)   │ SFIDE (4 anelli) │ IL MIO │
│               │                          │                  │ CLUB   │
└───────────────┴──────────────────────────┴──────────────────┴────────┘
   27%                     45%                        28%
```

Stile delle carte: fondo blu notte al 70%, angoli 12 px, bordo sottile luminoso (azzurro, oro per la carta del campionato),
titoli in maiuscolo condensato bianco. Colori: blu notte `#0B1530`, oro `#E8B64C`, azzurro `#3FC6FF`, verde dei valori
`#5BE37A`, rosso `#FF5A5A`. Font: Anton (titoli grandi, c'è già), Bebas Neue (titoli) e Montserrat (testi): gli ultimi due
vanno aggiunti al gioco, sono liberi (licenza OFL), circa 60 KB in tutto.

Su ogni carta o pulsante con qualcosa da ritirare o da fare compare il badge «!» (funzione 12).

### 2.2 Dove porta ogni elemento (le 12 funzioni)

| # | Elemento | Apre | Dati |
|---|---|---|---|
| 1 | Pannello manager (avatar, nome, club, stelle, stemma) | **Profilo**: nome del manager, avatar (8 generici tra cui scegliere), nome del club, colori, stemma, divisa; statistiche e trofei | carriera (club, statistiche, trofei) |
| 2a | Pillola «SETTIMANA 2g 9h • 0/5» | **Obiettivi della settimana**: i 5 obiettivi, il tempo vero che manca al lunedì, i premi da ritirare | sfide settimanali |
| 2b | Pulsante PREMI | **Percorso premi della stagione**: 20 livelli, barra dei punti, premio di ogni livello | percorso (punti, livelli riscossi) |
| 3 | «+» accanto a diamanti e monete | **Come guadagnare**: elenco delle fonti con gli importi (§5) e **storico** degli ultimi movimenti | listino, movimenti |
| 4a | Home | torna alla home (evidenziato quando ci sei) | — |
| 4b | Impostazioni | audio (musica, effetti, pubblico), comandi (lato dei tasti, passaggio assistito), qualità grafica (automatica, bassa, media, alta; 30 o 60 fps; giorno o sera), lingua | sul telefono |
| 4c | Info | regole del gioco, crediti, licenze (MakeHuman CC0, GameplayFootball Unlicense, Mixamo, Poly Haven, font) | testo fisso |
| 4d | Notifiche | elenco: premi da ritirare, sfide completate, partita di coppa disponibile, livello del percorso raggiunto, mercato aggiornato | calcolato dai dati |
| 5 | Carta campionato → GIOCA ADESSO | **Pre-partita** (formazione, modulo, mentalità, difficoltà) → **partita** → **dopo partita** (risultato, premi presi, classifica e calendario aggiornati) → home | carriera, partite, movimenti |
| 6 | Carta classifica | **Classifica completa** (16 squadre: punti, poi differenza reti, poi gol fatti) con **calendario e risultati** | carriera |
| 7a | Trofeo dei Castelli | **Gironi** (4 gironi, classifiche) e poi **tabellone**; pulsante per giocare la prossima | carriera |
| 7b | Coppa Titano | **Tabellone** a eliminazione diretta; pulsante per giocare la prossima | carriera |
| 8 | Squadra | **Rosa**: formazione, titolari e panchina, energia, capitano | carriera (rosa) |
| 9 | Mercato | **Mercato**: prendi un giocatore di un'altra squadra cedendone uno tuo dello stesso ruolo, paghi la differenza in monete; elenco degli scambi fatti | carriera, movimenti |
| 10 | Sfide | **Sfide** nei 4 gruppi (Oggi, Settimana, Carriera, Stagione), con «Riscuoti» | sfide |
| 11 | Il mio club | **Club**: stadio, allenatore, stemma, allenamento dei giocatori, finanze, amichevole | club, movimenti |
| 12 | Badge «!» | — | calcolato dai dati |

Ogni schermata si apre sopra la home (pannello a tutto schermo con «‹ Indietro»), come oggi. La partita è l'unica che
lascia la home.

### 2.3 Contenuto delle carte della home
- **Campionato**: «FANTATITANO» in oro e «CAMPIONATO» in bianco; stemma e nome dell'avversario, stelle, «Partita 3 di 15 •
  in casa»; pulsante dorato GIOCA ADESSO a freccia; render della **nostra** maglia (dai colori del club) nella cornice
  azzurra con l'anello luminoso; etichetta «MATCHDAY». A campionato finito: «Stagione finita» e pulsante «Nuova stagione».
- **Classifica**: 6 righe attorno alla nostra (se siamo tra le prime, le prime 6). Colonne: movimento rispetto alla
  giornata prima (▲ ▼ –), posizione, stemma, squadra, DR, punti. La nostra riga in oro. Posizioni calcolate, mai doppie.
  A destra il logo originale.
- **Squadra**: «CAPITANO», nome, ruolo e valutazione in oro («POR • 88»), busto 3D con la nostra divisa nella cornice
  azzurra.
- **Mercato**: il giocatore consigliato (il migliore che ti puoi permettere nel ruolo più debole), valutazione grande tra le
  due frecce (verde: chi entra, rossa: chi esce), barra in basso «85 – [stemma] Rinaldi ATT».
- **Trofeo dei Castelli** e **Coppa Titano**: stemma e nome del prossimo avversario, stelle, fase («Gironi • giornata 1 di
  3», «Ottavi di finale»), icona (tre torri dorate, coppa dorata). Se sei stato eliminato: «Eliminato agli ottavi»; se hai
  vinto: «Campione».
- **Sfide**: 4 anelli (Oggi, Settimana, Carriera, Stagione) col contatore. I contatori delle sfide stanno solo qui.
- **Il mio club**: Stadio • livello, Allenatore • valutazione, Stemma • percentuale, Finanze • giudizio (§3.3).
- **Stelle del club** (pannello manager e avversari): da 1 a 5, dalla valutazione media dei titolari (c'è già).

## 3. Funzioni nuove, in dettaglio

### 3.1 Obiettivi della settimana
Sono le 5 sfide settimanali che esistono già. La pillola mostra il tempo vero fino al prossimo lunedì alle 00:00 (ora del
telefono per il conto alla rovescia, ora del server per decidere se un premio vale) e quanti obiettivi sono fatti.

### 3.2 Percorso premi della stagione
Venti livelli per ogni stagione della carriera; si riparte da zero alla stagione nuova. Si sale coi **punti stagione**:

| Fonte | Punti |
|---|---|
| Partita giocata | 10 |
| Partita vinta | +10 |
| Sfida giornaliera riscossa | 5 |
| Sfida settimanale riscossa | 15 |
| Sfida di stagione riscossa | 20 |
| Turno di coppa superato | 15 |

Ogni livello costa 40 punti (800 in tutto). Una stagione piena dà circa 25 partite: chi gioca solo quelle arriva verso
il livello 9, chi fa anche buona parte delle sfide arriva in fondo. I premi sono nel §5.9: monete della divisione in cui
si gioca, 60 diamanti in tutto e due allenatori rari.

### 3.3 Il mio club
Sette strutture da zero a cinque stelle (Centro allenamento, Infermeria, Foresteria, Ufficio commerciale, Osservatori,
Curva dei tifosi, Stadio), gli allenatori in inventario, le finanze (giudizio dal saldo contato in vittorie: Scarse sotto
3, Discrete fino a 10, Buone fino a 30, Eccellenti oltre), il negozio dell'aspetto, Personalizza e Amichevole. I numeri
sono nel §5.6.

### 3.4 Notifiche
Un elenco dentro il gioco, calcolato dai dati: niente notifiche push e niente da salvare sul server. La campanella ha il
badge col numero.

## 4. Dati e tabelle Supabase

### 4.1 Principio
Oggi il telefono salva tutta la carriera in una riga (`lapartita_carriere`), monete comprese: chi sa come fare potrebbe
scriversi il saldo che vuole. Con la home nuova:
- **saldo e storico stanno sul server** e li cambia solo il server, con funzioni che calcolano premi e prezzi da un
  listino che sta nel database;
- il telefono non manda mai «dammi 300 monete»: manda «ho finito questa partita 2-1» o «compro questo», e il server decide
  quanto vale;
- nessuna tabella si legge o si scrive direttamente: si passa solo dalle funzioni, come già per `lapartita_carriere`.

Limite da dire chiaro: un gioco che gira nel browser non può dimostrare al server che la partita è stata giocata davvero.
Il server può però rendere inutile barare: importi decisi da lui, una partita alla volta, durata minima vera, tetto ai gol
e alle partite al giorno. Non essendoci soldi veri, è una protezione proporzionata.

Stesso progetto Supabase dell'app (stessi account). Tutte le tabelle con RLS attiva e nessun permesso diretto.

Il file `supabase/002-lapartita-economia.sql` (prova in `supabase/prove/002-economia-prova.sql`) era pronto per
l'economia di prima. **Non è applicato e non è più allineato**: Alex ha deciso il 21/11 che per ora saldo e storico
restano sul telefono; il listino va riscritto coi numeri del §5 quando si farà il passo 12 (la proposta della «cassa» è
in `docs/ponte-partita.md` §9). Rispetto alle tabelle qui sotto la
prima versione è più semplice: portafogli, movimenti, partite, club e listino; i contatori delle sfide e l'elenco dei
giocatori restano al passo dopo (il server controlla importi e doppioni, il gioco che la sfida sia completa).

### 4.2 Tabelle

| Tabella | Una riga è | Colonne principali |
|---|---|---|
| `lapartita_carriere` (c'è già) | la carriera di una persona | `user_id`, `dati` (calendario, risultati, rosa, club), `aggiornato_at`. Monete e diamanti non si leggono più da qui |
| `lapartita.portafogli` | il saldo di una persona | `user_id`, `monete`, `diamanti`, `aggiornato_at` |
| `lapartita.movimenti` | un'entrata o un'uscita | `id`, `user_id`, `quando`, `valuta` (monete o diamanti), `importo` (positivo o negativo), `causale` (codice del listino), `dettagli` (partita, sfida, giocatore), `saldo_dopo` |
| `lapartita.partite` | una partita giocata | `id`, `user_id`, `competizione`, `turno`, `avversario`, `in_casa`, `iniziata_at`, `finita_at`, `gol_fatti`, `gol_subiti`, `marcatori`, `stato` (aperta, chiusa, annullata), `premio_monete` |
| `lapartita_progressi` | i contatori di una persona per un periodo | `user_id`, `periodo` (giorno, settimana, stagione, carriera), `contatori`, `riscosse` |
| `lapartita_percorso` | il percorso premi di una stagione | `user_id`, `stagione`, `punti`, `livelli_riscossi` |
| `lapartita.club` | i miglioramenti del club | `user_id`, `stadio`, `allenatore`, `stemma_pezzi`, `avatar`, `oggetti` (cose comprate coi diamanti), `allenamenti` (sedute per giocatore) |
| `lapartita.listino` | una voce di premio o di costo | `codice`, `tipo` (premio o costo), `valuta`, `importo`, `attivo`. È la tabella del §5: cambiare un prezzo è cambiare una riga |
| `lapartita_giocatori` | un giocatore del gioco | `club`, `nome`, `ruolo`, `valutazione`: copia dei dati del gioco, serve al server per calcolare i prezzi del mercato |

### 4.3 Funzioni (le uniche porte d'ingresso)

| Funzione | Cosa fa | Controlli del server |
|---|---|---|
| `lapartita_stato()` | saldo, progressi, percorso, club, listino | — |
| `lapartita_partita_inizia(competizione, turno, avversario, in_casa)` | apre una partita e ne restituisce il numero | una sola partita aperta; al massimo 60 al giorno |
| `lapartita_partita_chiudi(partita, gol_fatti, gol_subiti, marcatori)` | chiude la partita, calcola il premio dal listino, aggiorna contatori delle sfide e punti del percorso, scrive i movimenti | la partita è tua ed è aperta; sono passati almeno 150 secondi veri dall'inizio; al massimo 12 gol per squadra |
| `lapartita_riscuoti(tipo, codice)` | premio di una sfida, bonus «tutte fatte», livello del percorso, trofeo | la sfida è davvero completa secondo i contatori del server e non è già stata riscossa |
| `lapartita_compra(codice, dettagli)` | stadio, allenatore, pezzo dello stemma, seduta di allenamento, oggetto | prezzo dal listino; saldo sufficiente; livello precedente posseduto |
| `lapartita_scambia(prendi, cedi)` | scambio di mercato | prezzo calcolato dalle valutazioni in `lapartita_giocatori` più gli allenamenti; stesso ruolo; saldo sufficiente |
| `lapartita_movimenti(quanti, prima_di)` | lo storico, a pagine | solo i propri |

Ogni funzione che tocca il saldo scrive la riga del movimento e aggiorna il portafoglio nella stessa operazione: lo
storico e il saldo non possono divergere.

### 4.4 Senza rete e senza account
- **Senza rete**: si gioca lo stesso. Le partite finite restano in coda sul telefono (al massimo 3) e vengono mandate
  appena torna la rete; i premi arrivano allora. Mercato e miglioramenti chiedono la rete.
- **Senza account** (ospite): si gioca con un saldo solo sul telefono, segnato «non salvato». Al primo accesso il server
  importa una volta sola quello che c'è, con un tetto (proposta: 5.000 monete e 50 diamanti).
- **Carriere già iniziate**: al primo avvio con la home nuova il saldo salvato viene importato una volta, con lo stesso
  tetto.

### 4.5 Valori nel codice
I valori dell'economia oggi sono in `src/carriera.js`. Diventano una voce `ECONOMIA` in `src/config.js` (per mostrare gli
importi anche senza rete) e le stesse righe in `lapartita_listino`; una prova automatica controlla che siano uguali.

## 5. Carriera, economia, diamanti e strutture (approvata da Alex il 21/11)

Questa sezione sostituisce le regole di prima su capitano, prezzi, allenamento, stadio e diamanti. Tutti i numeri stanno in
`src/config.js` (`DIVISIONI`, `STAGIONE`, `ECONOMIA`); la logica in `src/carriera.js`; le squadre inventate in
`src/dati/divisioni.js`. Dove Alex non aveva dato un numero l'ho scelto io: è segnato con «(scelta mia)» e si cambia in una riga.

### 5.1 Le cinque divisioni
Si parte dall'ultima. In ognuna sedici squadre: quindici avversarie e il nostro club.

| # | Divisione | Squadre | Valutazioni | Vittoria | Diamanti a fine stagione |
|---|---|---|---|---|---|
| 1 | Campionato Sammarinese | le quindici vere | 55–75 (i migliori 76–82) | 250 | 50 |
| 2 | Serie Cadetta del Titano | 15 inventate | 54–68 | 180 | 40 |
| 3 | Lega delle Contrade | 15 inventate | 50–63 | 130 | 30 |
| 4 | Lega dei Borghi | 15 inventate | 45–57 | 90 | 20 |
| 5 | Lega Esordienti (partenza) | 15 inventate | 40–52 | 60 | 10 |

- Le sessanta squadre inventate hanno nome, sigla, colori, stemma (fatto coi pezzi dello stemma) e giocatori inventati. I
  nomi delle squadre vengono da curazie e contrade di San Marino; nessun giocatore inventato ha il cognome di uno vero.
- In ogni divisione ci sono squadre forti e deboli: la più forte ha la media dei titolari due punti sotto il massimo, la più
  debole tre sopra il minimo.
- Stagione: 15 partite di campionato, Trofeo dei Castelli (quattro gironi da quattro, poi quarti, semifinale, finale) e
  Coppa Titano (eliminazione diretta dagli ottavi), tutte tra le sedici squadre della divisione.
- Premi di una partita: vittoria piena, pareggio metà, sconfitta un quarto. Niente più premio per ogni gol.
- Rosa iniziale: undici titolari e sette riserve con valutazioni 42–50. Capitano iniziale tra 70 e 78, scelto tra nove
  giocatori veri del Campionato Sammarinese: è il premio di partenza, non costa niente.
- Monete e diamanti d'inizio: 150 e 20 (scelta mia: con 500 monete in Lega Esordienti si comprava subito mezza squadra).
- I giocatori veri si ottengono solo con l'agente dalla Serie Cadetta in su, o arrivati in cima (lista trasferimenti e
  agente del Campionato Sammarinese).
- Le carriere cominciate prima delle divisioni non si possono continuare: si riparte da zero.

**Promozione e retrocessione.** Ogni stagione ha quattro obiettivi; con tre si sale. Chi arriva tra le ultime due scende
(non dalla Lega Esordienti), anche se ha fatto gli obiettivi. Gli obiettivi diventano più difficili salendo (scelta mia,
tarata con la simulazione del §5.8):

| Divisione | Posizione finale | Coppa Titano | Trofeo dei Castelli | Media dei titolari |
|---|---|---|---|---|
| Lega Esordienti | tra le prime 5 | quarti | passare i gironi | 51 |
| Lega dei Borghi | tra le prime 4 | semifinale | passare i gironi | 56 |
| Lega delle Contrade | tra le prime 4 | semifinale | semifinale | 62 |
| Serie Cadetta del Titano | tra le prime 3 | semifinale | semifinale | 67 |
| Campionato Sammarinese | tra le prime 3 | semifinale | semifinale | – (non c'è dove salire) |

Premi di fine stagione: i diamanti della divisione e un allenatore leggendario. Con la promozione: altri 25 diamanti, un
altro leggendario e un contatto dell'agente.

### 5.2 Valore dei giocatori
100 monete a valutazione 55, raddoppia ogni 5 punti, arrotondato a 5 monete:

| Valutazione | 45 | 50 | 55 | 60 | 65 | 70 | 75 | 80 |
|---|---|---|---|---|---|---|---|---|
| Valore | 25 | 50 | 100 | 200 | 400 | 800 | 1.600 | 3.200 |

Vendendo si incassa la metà. La rosa va da 16 giocatori (sotto non si vende: scelta mia) a 22, fino a 32 con la Foresteria.

### 5.3 Allenatori
Sono oggetti in inventario: si usano dalla scheda del giocatore («Allena»).

- Comune +1, raro +2, leggendario +3 alle statistiche della sua categoria; la valutazione, che è la media pesata delle
  statistiche secondo il ruolo, sale di conseguenza. Il leggendario ha il 25% di probabilità di alzare di 1 il potenziale.
- Categorie: Tecnico (controllo, passaggio, tiro), Fisico (velocità, accelerazione, resistenza, potenza), Difesa
  (contrasto e posizione, che sulla carta sono la statistica «Difesa»), Portieri (le doti del portiere). Quello dei
  portieri va solo sui portieri, gli altri solo sui giocatori di movimento.
- Potenziale: la valutazione di un giocatore sale al massimo di 10 punti rispetto a quella con cui è arrivato.
- Come ho letto «+1, +2, +3»: sono punti sulle statistiche della categoria, come in Dream League, non sulla valutazione.
  Per questo un allenatore di tecnica su un difensore centrale alza le statistiche ma quasi mai la valutazione. Se Alex
  intendeva punti di valutazione, si cambia.
- Da dove arrivano: tutte le sfide del giorno (1 comune), tutte le sfide della settimana e i livelli 5 e 15 del percorso
  premi (rari), fine stagione, promozione e finale di coppa raggiunta (leggendari), svincolo di un giocatore (comune sotto
  55, raro 55–64, leggendario da 65), Centro allenamento (1 comune a settimana per stella). Raro e leggendario anche con
  15 e 40 diamanti.

### 5.4 Mercato
- **Lista trasferimenti**: sei giocatori della nostra divisione a prezzo pieno; cambia dopo ogni partita.
- **Osservatore**: per monete trova un giocatore della fascia scelta (bassa, media, alta: i tre terzi delle valutazioni
  della divisione) e del reparto scelto, con lo sconto del 20%. La ricerca costa 0,3 / 0,6 / 1 vittoria (scelta mia), meno
  il 10% per stella della struttura Osservatori.
- **Agente**: per un contatto e una vittoria in monete (scelta mia) trova un giocatore della metà alta della divisione
  sopra, a prezzo pieno. Dalla Serie Cadetta porta giocatori veri; nel Campionato Sammarinese porta i migliori (76–82).
  Contatti: uno al settimo giorno giocato di fila, uno con la promozione, uno per ogni finale di coppa raggiunta, oppure 25
  diamanti.
- **Offerte a tempo**: due giocatori della divisione sopra, cambiano ogni 24 ore; costano il loro valore più 30 diamanti.
- Il giocatore comprato entra tra le riserve. Un giocatore vero lascia la sua squadra, che mette al suo posto una riserva.

### 5.5 Diamanti (si guadagnano solo giocando, niente soldi veri)
Entrate:

| Fonte | Diamanti |
|---|---|
| Sette giorni di fila con almeno una partita | 4, 5, 6, 7, 8, 10, 16 = 56 a settimana |
| Tutte le sfide della settimana | 15 |
| Percorso premi | 60 a stagione |
| Fine stagione | da 10 (Esordienti) a 50 (Campionato Sammarinese) |
| Promozione | 25 |
| Coppa vinta | 20 |
| Sfide di stagione e di carriera | 20 a stagione; 130 una volta sola |

Spese: contatto dell'agente 25; allenatore raro 15, leggendario 40; fisioterapista completo 10; lista trasferimenti
rinnovata subito 5; giocatore delle offerte a tempo 30 più il suo valore; quarta e quinta stella delle strutture 20 e 40
oltre alle monete; aspetto (terza maglia 30, disegni speciali 20, avatar, cornici, scarpini e pallone 10, pezzi rari
dello stemma 5; l'esultanza aspetta le animazioni).

### 5.6 Strutture del club
Sette strutture, da zero a cinque stelle. Ogni stella costa 300 / 800 / 2.000 / 5.000 / 12.000 monete (scelta mia); la
quarta e la quinta anche 20 e 40 diamanti.

| Struttura | Cosa dà per stella |
|---|---|
| Centro allenamento | moduli aperti 4, 5, 6, 7, 8; riscaldamento che dura 1, 1, 1, 2, 2, 3 partite; 1 allenatore comune a settimana |
| Infermeria | +10% di energia recuperata tra le partite |
| Foresteria | rosa massima 22, 24, 26, 28, 30, 32 |
| Ufficio commerciale | +10% di monete a partita |
| Osservatori | −10% sul costo delle ricerche |
| Curva dei tifosi | +1% alle statistiche nelle partite in casa (scelta mia: «piccolo bonus») |
| Stadio | posti 500 → 10.000; incasso in casa 0 / 0,1 / 0,2 / 0,3 / 0,45 / 0,6 vittorie (scelta mia) |

### 5.7 Energia, riscaldamento, fisioterapista
- L'energia cala giocando e risale di 35 punti tra una partita e l'altra (di più con l'Infermeria).
- Riscaldamento: mezza vittoria in monete, +5% alle statistiche dei titolari per la prossima partita.
- Fisioterapista, su tutta la rosa: piccolo +20 energia (mezza vittoria), medio +50 (una vittoria), completo tutta (due
  vittorie, oppure 10 diamanti). I prezzi in vittorie sono una scelta mia.
- «Sotto il 60% cala prima la velocità, poi le altre statistiche» è una regola di campo: tocca alla sessione della
  partita (`docs/ponte-partita.md`).

### 5.8 Simulazione: quante stagioni per arrivare in cima
`node scripts/simula-carriera.mjs [carriere] [vittorie%] [pareggi%] [partite al giorno]` gioca carriere intere con le
regole vere; cambiano solo i risultati delle partite del giocatore, tirati a sorte. Mille carriere, 4 partite al giorno:

| Giocatore | Stagioni in media | La metà entro | Nove su dieci entro |
|---|---|---|---|
| medio: 50% vittorie, 30% pareggi, 20% sconfitte | **6,9** | 6 | 10 |
| forte: 65 / 20 / 15 | 4,7 | 4 | 6 |
| debole: 40 / 30 / 30 | 15,5 | 14 | 25 |

Giocatore medio, divisione per divisione: Esordienti 1,3 stagioni (sale il 79% delle volte), Borghi 1,5 (68%), Contrade
1,9 (52%), Cadetta 2,2 (46%). In tutto circa 150 partite. Entrate in monete per stagione, contate in vittorie: partite 17,
sfide 11, vendite 7, percorso premi 5, trofei e turni di coppa 5, piazzamento in campionato 2 (numeri del 23/11, col
premio per piazzamento).

Cosa ha insegnato la simulazione:
- Coi primi numeri (obiettivi uguali in tutte le divisioni, sfide che pagavano il doppio) il giocatore medio arrivava in
  cima in **5,0 stagioni**: un po' sotto l'obiettivo di 6–8.
- Tagliare i premi in monete da solo non basta: nelle tre divisioni basse i giocatori costano pochissimo rispetto ai premi
  (in Lega Esordienti una vittoria compra il giocatore più forte della divisione), quindi l'obiettivo sulla rosa si
  raggiunge sempre. I premi cominciano a pesare dalla Serie Cadetta.
- Per questo la correzione applicata è doppia: obiettivi più difficili salendo di divisione (tabella del §5.1) e monete
  delle sfide dimezzate, così le partite restano l'entrata più grande.
- Per allungare o accorciare: la posizione richiesta e i turni di coppa in `DIVISIONI[].obiettivi`; per far pesare di più
  le monete, alzare la media richiesta o abbassare i premi delle sfide (`SFIDE` in `src/carriera.js`).

### 5.9 Sfide e percorso premi
- I premi in monete di sfide, percorso, turni di coppa e trofei sono scritti «in vittorie»: valgono quel numero per la
  vittoria della divisione in cui si gioca, quindi crescono da soli salendo.
- Sfide del giorno: 0,15–0,25 vittorie l'una (una vittoria in tutto); tutte fatte: un allenatore comune.
- Sfide della settimana: 0,5–1 vittoria l'una (3,5 in tutto); tutte fatte: 15 diamanti e un allenatore raro.
- Sfide di stagione: 0,75–1,5 vittorie (sei sfide) e 10 diamanti (due sfide).
- Sfide di carriera: arrivare nel Campionato Sammarinese 50 diamanti, Coppa Titano 30, Trofeo dei Castelli 30, una
  struttura a tre stelle 20.
- Percorso premi, 20 livelli a stagione: monete (0,7 vittorie, 1 ai livelli 17 e 19), 60 diamanti in tutto, un allenatore
  raro ai livelli 5 e 15.
- Turno di coppa superato: mezza vittoria. Campionato vinto: 8 vittorie; Coppa Titano 5; Trofeo dei Castelli 4.
- Piazzamento in campionato (deciso da Alex il 23/11): chi non vince ha comunque un premio a fine campionato, in
  vittorie della sua divisione: secondo 5, terzo 3,5, quarto 2,5, quinto 2, sesto 1,5, settimo e ottavo 1; dal nono in
  giù niente. Vale di più nelle divisioni alte, dove una vittoria paga di più. Misurato con la simulazione prima e
  dopo: al giocatore medio dà 2,1 vittorie a stagione in più (da 44,3 a 46,8 con 300 carriere), le strutture all'arrivo
  passano da 11,8 a 13,0 stelle su 35, e le stagioni per arrivare in cima non cambiano (6,9 con mille carriere).

### 5.10 Negozio: l'aspetto (approvato il 21/11, fatto)
Una cosa non ancora presa si compra in due tocchi e poi resta per sempre.

| Scheda | Cosa | Costo | Gratis dall'inizio |
|---|---|---|---|
| Stemma | Forme: scudo, tondo, stendardo, rombo, esagono | ● 300 l'una | scudo, tondo, stendardo |
| Stemma | Simboli in cima: corona, stella, pallone, torre, nessuno, fulmine, tre torri, alloro | ● 300 il fulmine, ◆ 5 tre torri e alloro | i primi cinque |
| Stemma | Bordi: semplice, doppio, sottile, a punti, oro | ● 300 a punti, ◆ 5 oro | i primi tre |
| Divisa | Disegni speciali della prima maglia: onde, chevron, sfumata, mimetica, pennellata | ◆ 20 l'uno | gli altri quindici disegni |
| Divisa | Terza maglia | ◆ 30 | — |
| Manager | Avatar (otto) e cornici del ritratto | ◆ 10 l'uno | quattro avatar, la cornice semplice |
| Squadra | Scarpini uguali per tutti e pallone delle partite in casa | ◆ 10 l'uno | ognuno i suoi, pallone classico |

**Manca ancora**: l'esultanza scelta per il capitano. Servono altre animazioni (da Mixamo).

## 6. Immagine di sfondo (la genera Alex)

- **Misura**: **3840 × 1800 pixel** (rapporto 2,13:1), orizzontale, JPG o PNG di buona qualità. Se il generatore non
  arriva a tanto: un 21:9 da almeno **2520 × 1080**, lo ritaglio e lo adatto io.
- **Senza niente sopra**: nessuna interfaccia, nessun testo, nessun logo, nessuna persona in primo piano.
- **Dove mettere le cose** (in percentuale della larghezza e dell'altezza, da sinistra e dall'alto):
  - torre Guaita sulla rupe, illuminata di luce calda: tra il 28% e il 42% in larghezza, cima attorno al 25% in altezza;
  - stadio ovale illuminato, tetto azzurro e torri faro: tra il 52% e il 72% in larghezza, tra il 60% e l'85% in altezza;
  - valle con nebbia e luci della città: fascia tra il 50% e il 75% in altezza;
  - cielo blu notte nel 20% in alto (ci va la barra) e zona scura nel 10% in basso.
- **Zona sicura**: su iPad l'immagine viene tagliata ai lati. Tutto quello che conta deve stare tra il 19% e l'81% della
  larghezza; fuori solo cielo e colline.
- **Toni**: blu notte dominante, luci calde dorate; non troppo luminosa, perché sopra ci vanno carte semitrasparenti e
  testo bianco.
- Io la preparo in due misure (2560 × 1200 e 1280 × 600, WebP, 300 KB e 90 KB circa). Finché non c'è: gradiente blu notte.

## 7. Come si prova (a home fatta)
- Home su iPhone (orizzontale), iPad e computer: niente carte tagliate, niente scritte fuori posto, safe area rispettata.
- Ogni elemento della tabella del §2.2 apre la sua schermata con dati veri; chiudere e riaprire il gioco non perde niente.
- Una partita di campionato dall'inizio alla fine: premi nello storico, classifica e calendario aggiornati, sfide avanzate.
- Prova di falsificazione: cambiare il saldo nella memoria del telefono non cambia il saldo vero al riavvio.
- Prove automatiche: economia (listino del gioco uguale a quello del database), classifica (posizioni mai doppie),
  funzioni del server (partita troppo corta rifiutata, premio riscosso due volte rifiutato, saldo insufficiente rifiutato).

## 8. Decisioni di Alex (21/11)
Le domande erano dieci, più cinque cose pratiche. Queste le risposte.

| # | Domanda | Risposta di Alex | Stato |
|---|---|---|---|
| 1 | Logo | Deciso il 21/11: solo la corona gialla su fondo nero, senza scritte (`public/img/logo-fantatitano.png`) | fatto dalla sessione della partita |
| 2 | Prezzi del mercato | Superata dal §5.2: 100 monete a valutazione 55, raddoppia ogni 5 punti | fatto |
| 3 | Diamanti | Superata dal §5.5: oltre all'aspetto comprano contatti dell'agente, allenatori, fisioterapista completo, rinnovo della lista, offerte a tempo e le ultime stelle delle strutture. Restano non comprabili con soldi veri | fatto (manca l'esultanza: servono animazioni) |
| 4 | Percorso premi | Legato alla stagione della carriera | fatto |
| 5 | Allenatore | Superata dal §5.3: gli allenatori sono oggetti da usare sui giocatori | fatto |
| 6 | Stemma a pezzi | Sì, con una base di pezzi gratis già ricca | fatto |
| 7 | Colori | Tutte le schermate in blu notte e oro; il lime resta solo come accento, finché la corona è lime | fatto |
| 8 | Lingua | Solo italiano, ma coi testi in un unico file per aggiungere l'inglese dopo | da fare |
| 9 | Database | Per ora no (21/11): saldo e storico restano sul telefono. Quando si farà: sapere prima quale progetto; se è quello dell'app pubblicata, nessuna tabella esistente toccata, schema separato e prima un backup | fermo; il file SQL è da riallineare al §5 |
| 10 | Saldo sul server e rete | Mercato e miglioramenti chiedono la rete; i premi delle partite senza rete arrivano dopo | col punto 9 |
| 11 | Carriere già iniziate | Si riparte da zero: nessun saldo importato | nel file SQL |
| 12 | Immagine di sfondo | La manda Alex; intanto il gradiente | in attesa |
| 13 | Animazioni Mixamo | Le manda Alex («mani in testa» e «indica», FBX, Without Skin, 30 fps) | in attesa |
| 14 | fps su iPhone | Li misura Alex con `?debug` | in attesa |
| 15 | Gol e tiri | Pochi: puntare a 2–3 gol e 10–12 tiri per squadra a partita, poi tarare giocando | vedi `docs/dls-gameplay.md` |
| 16 | Carriera, economia, diamanti, strutture | Approvata il 21/11: cinque divisioni, valore dei giocatori, allenatori, osservatore e agente, diamanti, sette strutture (§5) | fatto; aspetto di Mercato, Club e Sfide ai passi 9–11 |

### 8.1 Come si applica il file SQL (quando c'è il backup)
- Il progetto è **fantasyfootball** (`nskgzpbcssnpfuxmbepa`): è quello dell'app Fantatitano pubblicata (circa 250 iscritti).
- Il file crea solo cose nuove: lo schema `lapartita` con cinque tabelle e quattro funzioni interne, e sette funzioni in
  `public` (le sole che il gioco chiama). Non modifica e non legge nessuna tabella dell'app; usa soltanto
  `public.current_user_id()`, che c'è già.
- Perché sette funzioni restano in `public`: il collegamento dell'app guarda solo quello schema. Per metterle altrove
  bisognerebbe aggiungere `lapartita` agli schemi esposti nelle impostazioni dell'app pubblicata, cioè cambiare una sua
  impostazione. Se Alex preferisce così, si fa dalla pagina Settings → API di Supabase e le funzioni si spostano.
- Backup: il piano gratuito di Supabase non ne fa. Claude da qui non può farlo (serve la password del database). Lo fa Alex
  dal suo computer, oppure decide che non serve perché il file non tocca niente di esistente.
- Per tornare indietro basta una riga: `drop schema lapartita cascade;` più la cancellazione delle sette funzioni.
