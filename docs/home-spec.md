# Home del gioco — specifica (Fase 5)

Stato: **in attesa delle risposte di Alex**. Il 21/11 Alex ha chiesto di non fermarsi: la home si costruisce con le scelte
proposte qui, segnate come provvisorie; ogni risposta diversa si applica dopo. L'unica parte ferma è il database (§4): niente
tabelle sul progetto Supabase dell'app senza il suo sì esplicito.
Le cose da decidere sono raccolte in fondo, numerate: basta rispondere punto per punto.

Fatto finora (provvisorio dove c'era una decisione aperta): home in blu notte e oro col gradiente segnaposto, barra nuova,
carte secondo il disegno, percorso premi, «come guadagnare» con lo storico, notifiche, allenatore, finanze, avatar del
manager, qualità grafica e passaggio assistito nelle impostazioni, prezzi del mercato della proposta. Saldo e storico
stanno ancora sul telefono (e nella copia sull'account), passando tutti da una sola funzione (`muovi` in `src/carriera.js`).
Lo stemma a pezzi da sbloccare non è fatto: la percentuale dice quanto è personalizzato (40 di serie, 80 col club proprio,
100 con un disegno).

Regole che valgono per tutto il documento:
- Monete e diamanti non si comprano con soldi veri. Niente acquisti in-app, niente negozio a pagamento, niente pagamenti
  Apple o Google.
- Il logo è solo quello originale di Fantatitano. Gli stemmi sono segnaposto sostituibili. Le facce sono generiche: i
  ritratti sono render dei nostri modelli 3D.
- Niente testo finto: ogni scritta e ogni numero viene dai dati salvati.

## 1. Cosa c'è già e cosa cambia

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
il livello 9, chi fa anche buona parte delle sfide arriva in fondo. Premi: livelli dispari 200 monete (400 al 15 e al 19), livelli pari
3 diamanti (10 al livello 10, 20 al livello 20). Totale del percorso: **2.400 monete e 54 diamanti**.

### 3.3 Il mio club
- **Stadio** (c'è già, 5 livelli): più posti e più monete a ogni partita in casa.
- **Allenatore** (nuovo, 5 livelli, valutazione 60 / 70 / 80 / 90 / 99): ogni livello dà una seduta di allenamento in più
  per giocatore (da 6 a 10) e uno sconto del 5% sulle sedute.
- **Stemma** (percentuale): quanti pezzi dell'editor dello stemma hai sbloccato (forme, simboli, bordi). Si parte dal 40%.
- **Finanze**: giudizio dal saldo (Scarse sotto 500 monete, Discrete fino a 2.000, Buone fino a 6.000, Eccellenti oltre) e
  storico di entrate e uscite.
- **Allenamento** dei giocatori e **Amichevole** restano come oggi.

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

Il file è pronto e provato su un database locale: `supabase/002-lapartita-economia.sql` (prova in
`supabase/prove/002-economia-prova.sql`). **Non è applicato**: aspetta il sì di Alex. Rispetto alle tabelle qui sotto la
prima versione è più semplice: portafogli, movimenti, partite, club e listino; i contatori delle sfide e l'elenco dei
giocatori restano al passo dopo (il server controlla importi e doppioni, il gioco che la sfida sia completa).

### 4.2 Tabelle

| Tabella | Una riga è | Colonne principali |
|---|---|---|
| `lapartita_carriere` (c'è già) | la carriera di una persona | `user_id`, `dati` (calendario, risultati, rosa, club), `aggiornato_at`. Monete e diamanti non si leggono più da qui |
| `lapartita_portafogli` | il saldo di una persona | `user_id`, `monete`, `diamanti`, `aggiornato_at` |
| `lapartita_movimenti` | un'entrata o un'uscita | `id`, `user_id`, `quando`, `valuta` (monete o diamanti), `importo` (positivo o negativo), `causale` (codice del listino), `dettagli` (partita, sfida, giocatore), `saldo_dopo` |
| `lapartita_partite` | una partita giocata | `id`, `user_id`, `competizione`, `turno`, `avversario`, `in_casa`, `iniziata_at`, `finita_at`, `gol_fatti`, `gol_subiti`, `marcatori`, `stato` (aperta, chiusa, annullata), `premio_monete` |
| `lapartita_progressi` | i contatori di una persona per un periodo | `user_id`, `periodo` (giorno, settimana, stagione, carriera), `contatori`, `riscosse` |
| `lapartita_percorso` | il percorso premi di una stagione | `user_id`, `stagione`, `punti`, `livelli_riscossi` |
| `lapartita_club` | i miglioramenti del club | `user_id`, `stadio`, `allenatore`, `stemma_pezzi`, `avatar`, `oggetti` (cose comprate coi diamanti), `allenamenti` (sedute per giocatore) |
| `lapartita_listino` | una voce di premio o di costo | `codice`, `tipo` (premio o costo), `valuta`, `importo`, `attivo`. È la tabella del §5: cambiare un prezzo è cambiare una riga |
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

## 5. Economia

### 5.1 Entrate (monete ● e diamanti ◆)

| Fonte | ● | ◆ | Oggi |
|---|---|---|---|
| Inizio della carriera | 500 | 20 | uguale |
| Vittoria | 300 | – | uguale |
| Pareggio | 120 | – | uguale |
| Sconfitta | 50 | – | uguale |
| Ogni gol segnato | 20 | – | uguale |
| Partita in casa, per livello dello stadio (1–5) | 0 / 60 / 130 / 220 / 350 | – | uguale |
| Turno di coppa superato | 150 | – | uguale |
| Campionato vinto | 3.000 | 50 (sfida di carriera) | uguale |
| Coppa Titano vinta | 2.000 | 30 (sfida di carriera) | uguale |
| Trofeo dei Castelli vinto | 1.500 | 30 (sfida di carriera) | uguale |
| Sfide di oggi (5) | 100–150 l'una, 620 in tutto | 5 se le fai tutte | uguale |
| Obiettivi della settimana (5) | 300–600 l'uno, 2.100 in tutto | 15 se li fai tutti | uguale |
| Sfide di stagione (8) | 400–800 (6 sfide), 3.000 in tutto | 10 + 10 (2 sfide) | uguale |
| Sfide di carriera (4) | – | 20–50, 130 in tutto | uguale |
| Percorso premi (20 livelli) | 2.400 | 54 | nuovo |
| Amichevole | 0 | 0 | uguale |

### 5.2 Uscite

| Cosa | Costo | Oggi |
|---|---|---|
| Giocatore al mercato | prezzo dalla valutazione (tabella sotto), meno il 70% del prezzo di chi cedi | formula uguale, prezzi più alti nella proposta |
| Stadio livello 2 / 3 / 4 / 5 | ● 1.500 / ● 4.000 + ◆ 10 / ● 9.000 + ◆ 25 / ● 18.000 + ◆ 50 | uguale |
| Seduta di allenamento (+1 alla valutazione) | ● 200, poi +150 a ogni seduta dello stesso giocatore (massimo 6, fino a 10 con l'allenatore) | uguale |
| Allenatore livello 2 / 3 / 4 / 5 | ● 2.000 / ● 5.000 / ● 10.000 + ◆ 15 / ● 20.000 + ◆ 30 | nuovo |
| Pezzo dello stemma | ● 300 i semplici, ◆ 5 i rari | nuovo |

Prezzo di un giocatore = (valutazione − 50)² × coefficiente, arrotondato alle decine. Le valutazioni vanno da 55 a 88.

| Valutazione | Oggi (coeff. 2,2) | Proposta (coeff. 4) |
|---|---|---|
| 60 | 220 | 400 |
| 65 | 500 | 900 |
| 70 | 880 | 1.600 |
| 72 (medio) | 1.060 | 1.940 |
| 75 | 1.380 | 2.500 |
| 80 | 1.980 | 3.600 |
| 85 (forte) | 2.700 | 4.900 |
| 88 (il massimo) | 3.180 | 5.780 |

### 5.3 Quante partite servono
Due giocatori tipo:
- **medio**: vince il 45% delle partite, ne pareggia il 25%, segna 1,5 gol a partita → **210 monete a partita**; con le
  sfide che completa giocando (circa 3 al giorno su 5 e mezza settimana di obiettivi) → circa **330 a partita**;
- **forte**: vince il 75%, pareggia il 15%, segna 2,5 gol → **300 a partita**; con le sfide → circa **500 a partita**.

Una partita dura 5–6 minuti veri.

| Acquisto | Prezzi | Solo partite: medio / forte | Con le sfide: medio / forte |
|---|---|---|---|
| Giocatore medio (72) | oggi 1.060 | 6 / 4 partite | 4 / 3 |
| Giocatore medio (72) | proposta 1.940 | 10 / 7 | 6 / 4 |
| Giocatore forte (85) | oggi 2.700 | 13 / 9 | 9 / 6 |
| Giocatore forte (85) | proposta 4.900 | 24 / 17 | 15 / 10 |

Cedendo in cambio un proprio giocatore da 65 si risparmiano 350 monete coi prezzi di oggi e 630 con la proposta.
Con la proposta un giocatore forte costa più o meno **un campionato** (15 partite) a chi gioca in modo normale: la squadra
cresce di due o tre acquisti importanti a stagione. Coi prezzi di oggi ne basta metà.

### 5.4 Diamanti: quanti ne arrivano
Giocatore medio: 15–25 a settimana (qualche bonus giornaliero e gli obiettivi della settimana); in più, a stagione, fino a
54 dal percorso premi e 20 dalle sfide di stagione, e quelli dei trofei. Giocatore forte: fino a 50 a settimana.

### 5.5 Diamanti: su cosa spenderli (proposta)
Regola: i diamanti comprano **aspetto e comodità**, non la vittoria. I giocatori si comprano solo con le monete.

| Cosa | ◆ | Perché |
|---|---|---|
| Stadio ai livelli 3, 4, 5 (insieme alle monete) | 10 / 25 / 50 | c'è già |
| Allenatore ai livelli 4 e 5 (insieme alle monete) | 15 / 30 | traguardo lungo |
| Terza maglia e disegni speciali della divisa | 20–40 | aspetto |
| Pezzi rari dello stemma | 5 l'uno | aspetto |
| Avatar del manager e cornici del ritratto | 10 | aspetto |
| Esultanza scelta per il capitano | 15 | aspetto |
| Colore di scarpini e pallone di casa | 10 | aspetto |
| Rinnovare subito i giocatori consigliati al mercato | 5 | comodità |

Sconsigliato: recuperi di energia, ripetizione di partite perse, giocatori in vendita solo a diamanti. Sono le cose che in
altri giochi spingono a pagare, e qui non si paga.

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

## 8. Decisioni che servono da Alex
1. **Logo**: nel gioco c'è `img/corona-lime.png` (corona lime con «FANTATITANO – PLAY · MANAGE · BELONG»). Tu parli della
   corona viola disegnata a mano: è un altro file? Se sì mandamelo, o dimmi dove sta nel repository dell'app.
2. **Prezzi del mercato**: restano quelli di oggi o passano alla proposta (giocatore forte ≈ un campionato)?
3. **Diamanti**: va bene l'elenco del §5.5? Qualcosa da togliere o aggiungere?
4. **Percorso premi**: va bene legato alla stagione della carriera (20 livelli, si azzera alla stagione nuova), o lo vuoi a
   tempo vero (per esempio un mese)?
5. **Saldo sul server**: va bene che mercato e miglioramenti chiedano la rete e che i premi delle partite giocate senza
   rete arrivino al ritorno della rete?
6. **Ospiti e carriere già iniziate**: va bene importare una volta sola il saldo che c'è, con tetto a 5.000 monete e 50
   diamanti?
7. **Colori**: la home diventa blu notte e oro. Le altre schermate (menu iniziale, pausa, fine partita) restano viola e
   lime o le porto allo stesso stile?
8. **Lingua** nelle impostazioni: solo italiano per ora, o preparo già italiano e inglese?
9. **Allenatore e stemma** (§3.3): vanno bene così (allenatore = più sedute di allenamento e sconto; stemma = pezzi
   dell'editor sbloccati)?
10. **Database**: per creare tabelle e funzioni sul progetto Supabase dell'app mi serve il tuo via libera esplicito; prima
    ti mando il file SQL da leggere.
