# Stato dei lavori — prompt «modalità partita + home» (aggiornato il 21/11/2026)

In breve: le fasi 1–5 sono fatte e in produzione; la fase 6 (home) è fatta nella parte che non dipende dal database e
dalle risposte di Alex. Le scelte prese senza la sua risposta sono segnate **provvisorio**.

## Fatto

| Fase | Cosa | Dove |
|---|---|---|
| 1 | Telecamera col cerchio al 43%, tabellone e cronometro, tre tasti con le scritte giuste (bug del calcio d'inizio corretto), minimappa, linee del campo nello shader, ombre lunghe, mai posa a T | PR #60, #61 |
| 2 | Campo (strisce, anelli, scacchi), stadio a conca con due anelli e tetto, pubblico fitto, steward, cameraman, panchine con riserve e staff, cartelloni che scorrono | PR #60, #62 |
| 3 | Giocatori nuovi MakeHuman/MPFB: tre livelli di dettaglio, tre corporature, sette capigliature, barba, un materiale, modello compresso (Meshopt). Corpo di prima come ripiego con `?corpo=vecchio` | PR #63, `modelli/mpfb/LEGGIMI.md` |
| 4 | Verifica delle sezioni 2–6: c'era tutto tranne la vista di controllo dell'IA (`?ia` o tasto O) e lo stacco col logo a fascia diagonale, aggiunti | PR #64, `docs/dls-gameplay.md` |
| 5 | Specifica della home | PR #65, `docs/home-spec.md` |
| 6 | Home in blu notte e oro; percorso premi; «monete e diamanti» con lo storico; notifiche; allenatore e finanze; avatar del manager; classifica completa col calendario; impostazioni (passaggio assistito, qualità grafica, lingua) | PR #66 e seguenti |

Le 12 funzioni della home (§8.4 del prompt): tutte aprono una schermata che funziona con dati salvati. In dettaglio:
1 profilo e personalizzazione (avatar, nome, colori, stemma a pezzi); 2 obiettivi della settimana e percorso premi; 3 «+»
→ come guadagnare e storico; 4 home, impostazioni, info, notifiche; 5 campionato → pre-partita → partita → premi e
classifica; 6 classifica completa con calendario; 7 Trofeo dei Castelli e Coppa Titano; 8 rosa; 9 mercato; 10 sfide;
11 club (stadio, allenatore, stemma, allenamento, finanze, amichevole); 12 badge «!» su premi, pillole, sfide, club, campanella.

## Dopo le risposte di Alex del 21/11
Le risposte sono nella tabella in fondo a `docs/home-spec.md` (§8). Fatto subito:
- **Colori** (7B): menu iniziale, scelta squadre, pausa, sostituzioni e fine partita sono in blu notte e oro come la home.
  Il lime resta accanto alla corona, che è gialla. Tabellone e tasti in partita non sono cambiati.
- **Negozio** (3A, 6A): quattro schede (stemma, divisa, manager, squadra), acquisto in due tocchi. Stemma a pezzi (forme,
  simboli, bordi) con una base gratis ricca; disegni speciali e terza maglia; avatar e cornici; scarpini della squadra,
  pallone di casa, rinnovo del giocatore consigliato. Elenco e prezzi in `docs/home-spec.md` §5.5.
- **Database** (9, 10, 11): il file SQL ora lavora nello schema separato `lapartita`, non tocca niente di esistente, non
  importa i saldi vecchi (si riparte da zero) e conosce anche il negozio. Provato su un database locale. **Non applicato.**

## Prova di Alex su iPhone (21/11): i nove punti
Tutti in produzione. Dopo un aggiornamento, per vedere barra di stato e bordi sicuri bisogna **togliere l'app dalla
schermata Home e rimetterla** (Safari → Condividi → Aggiungi alla schermata Home).

| Punto | Cosa è stato fatto | Come provarlo |
|---|---|---|
| 1 Rotazione e tastiera | la pagina non si gira più da sola: in verticale compare «Gira il telefono» e la partita va in pausa; con la tastiera aperta la schermata si accorcia e il campo in cui scrivi resta visibile | girare il telefono in partita; in «Il mio club» scrivere il nome |
| 2 Levetta | torna al centro a ogni tocco nuovo, quando il dito esce, quando l'app va in secondo piano | muovere la levetta, uscire col dito dallo schermo, rientrare |
| 3 Velocità | corsa 5, scatto 7, conduzione 4,5, scatto con palla 6 m/s; da fermo alla corsa in circa un secondo; girando si perde velocità in proporzione all'angolo (metà nell'inversione) | `?debug` in fondo all'indirizzo: nel riquadro c'è «giocatore … m/s» |
| 4 Animazioni | il passo della corsa segue la velocità vera, anche sopra i 6 m/s | guardare i piedi in scatto: non scivolano |
| 5 Pallone al piede | un tocco ogni passo, pallone tra 0,6 e 1 m, mai oltre 1,5 m; disegno senza scatti tra un passo di calcolo e l'altro | condurre a zig-zag e invertire: il pallone resta lì |
| 6 Telecamera | il pallone resta tra il 30% e il 70% dell'altezza dello schermo (prima sul lato lontano saliva al 19%); altezza, inclinazione e apertura non sono cambiate | portare il pallone sulla fascia lontana |
| 7 Erba e pubblico | erba più scura e meno gialla, strisce più leggibili; pubblico con metà colori delle squadre e metà vestiti di tutti i giorni | guardare il calcio d'inizio |
| 8 Riquadro del gol | **provvisorio: tolto, come in DLS** (Alex non ha scelto tra tenerlo, toglierlo o ridurlo a due secondi). È un numero solo: `GOLSEQ.riquadro` in `src/config.js` (0 = mai, 2 = due secondi, 9 = tutta l'esultanza) | segnare un gol |
| 9 Giocatori MPFB | già fatti (PR #63) | — |

**Registrazione di 10 secondi di conduzione con `?debug`** (giocatore comandato, avversari tenuti lontani). Velocità
lette nel riquadro: conduzione **4,5 m/s** (4,1 dopo mezzo secondo), scatto con palla **6,0 m/s**, curva di 90° scende a
4,0 e torna a 4,4, inversione scende a **2,5 m/s** (il 55%) e torna a 4,3 in un secondo, fermo in meno di mezzo secondo.
Pallone tra 0,3 e 1,06 m dal giocatore, mai perso. Senza palla (misura a parte): da 0 a 6,6 m/s in 0,8 s, scatto 7,2 m/s.
**Gli fps non si possono misurare qui**: il server non ha una scheda grafica e disegna a 2–5 fps, per questo il video è
fatto un fotogramma alla volta (il «60 fps» che si legge nel riquadro del video è il passo imposto, non una misura). Gli
fps veri li dà solo l'iPhone: aprire con `?debug` e leggere la prima riga del riquadro.

Con le velocità nuove la partita tra computer fa meno gol e meno tiri di prima (1,75 gol e 5,9 tiri a partita su 32
partite, senza anomalie): è il prossimo lavoro sulla partita, in `docs/dls-gameplay.md`, «Gol e tiri».

Con la sessione della home (`docs/ponte-partita.md`): fatti il ponte (`ponte.avviaPartita`), l'energia iniziale, i
quattro moduli nuovi (4-3-1-2, 5-3-2, 4-1-4-1, 3-4-3) e lo scenario con minuto e punteggio di partenza. Restano le
modalità Tutorial, Allenamento libero, Calci di punizione e Calci d'angolo.

## Resta da fare

| Cosa | Perché non è fatto | Cosa serve |
|---|---|---|
| Saldo e storico sul server | deciso da Alex (21/11): **per ora niente sul database**. Il gioco è privato, saldo e storico restano sul telefono. `supabase/002-lapartita-economia.sql` resta pronto | vedi «Prima del lancio» qui sotto |
| Logo | **Deciso il 21/11**: corona gialla su fondo nero, senza scritte. Il file con la scritta è stato tolto | niente |
| Testi in un unico file | fatto per la partita: `src/testi.js` (93 chiavi). La home ha i suoi in `src/casa/testi.js`, con la stessa forma | unire i due file quando la home ha finito di rifare le schermate (è uno spostamento) |
| Esultanza del capitano (negozio) | nel gioco ci sono solo due esultanze | altre animazioni da Mixamo |
| Immagine di sfondo della home | la manda Alex | 3840 × 1800 pixel, indicazioni in `docs/home-spec.md` §6; ora c'è un gradiente |
| Clip «mani in testa» e «indica» | le manda Alex | FBX, Without Skin, 30 fps |
| fps veri su iPhone | qui non c'è un iPhone | aprire il gioco con `?debug` e dirmi i numeri |
| Più gol e più tiri | Alex: pochi, puntare a 2–3 gol e 10–12 tiri per squadra | vedi `docs/dls-gameplay.md`, «Gol e tiri» |
| Texture KTX2 | le texture dei giocatori le disegna il gioco coi colori della squadra | niente, salvo cambiare sistema |

## Prima del lancio: saldo sul server
Deciso da Alex il 21/11: sul progetto Supabase «fantasyfootball» (l'app pubblicata, circa 250 iscritti) **non si applica
niente** finché il gioco è privato. Prima di passare al saldo sul server servono, nell'ordine:

1. **Backup completo** del database dell'app (il piano gratuito non ne fa: va scaricato a mano).
2. **Controllo di sicurezza delle sette funzioni in `public`** (`lapartita_stato`, `lapartita_partita_inizia`,
   `lapartita_partita_chiudi`, `lapartita_riscuoti`, `lapartita_compra`, `lapartita_scambia`, `lapartita_movimenti`):
   - sono `SECURITY DEFINER` con `search_path` vuoto e leggono l'utente solo da `public.current_user_id()`: nessun
     parametro dice «per conto di chi»;
   - nessuna permette di cambiare il saldo di un altro o di darsi monete: gli importi vengono dal listino, non dal telefono;
   - chi non ha fatto l'accesso non può chiamarle; le tabelle e le funzioni interne dello schema `lapartita` non si
     raggiungono da fuori;
   - passare il controllo automatico di Supabase (advisor di sicurezza) dopo l'applicazione sul progetto di prova.
   La prova `supabase/prove/002-economia-prova.sql` controlla già i primi tre punti su un database locale.
3. **Prova su un progetto Supabase di test** (non quello dell'app): applicare il file, giocare qualche partita vera,
   comprare al negozio, guardare lo storico.
4. Solo dopo: applicarlo al progetto vero e cambiare l'interruttore del gioco da «telefono» a «server».

**L'interruttore non c'è ancora nel codice.** Monete, diamanti e storico sono gestiti da `src/carriera.js` e dalle
schermate in `src/casa/`, che sono della sessione della home (il suo passo 12). La proposta, scritta per lei in
`docs/ponte-partita.md` §9: un valore solo in `src/config.js` (`ECONOMIA.saldo: 'telefono'`) e un solo punto del codice
che lo legge, così passare al server è cambiare quella parola.

## Da sapere
- Resta su GitHub il ramo `claude/dls-risposte-tastiera-gol`, creato per errore: si può cancellare dalla pagina dei rami.
- Come provare ogni cosa: `docs/dls-gameplay.md` (partita), `docs/home-spec.md` §7 (home), `modelli/mpfb/LEGGIMI.md` (giocatori).

## Sessione «Home, menu e sezioni» (prompt del 21/11, 14 passi)
Un'altra sessione lavora sulla partita: questa non tocca i suoi file senza averlo detto prima ad Alex.

| Passo | Cosa | Stato |
|---|---|---|
| 1 | `docs/navigazione.md`: albero, da dove si entra, dove porta Indietro | fatto |
| 2 | `docs/immagini-da-generare.md` (26 illustrazioni coi prompt), `scripts/importa_immagini.py`, icone SVG (`scripts/icone.mjs`, `public/img/icone/`), logo senza scritta (`public/img/logo-fantatitano.png`) | fatto |
| 3 | Scala delle valutazioni e file di dati: `SCALA` e `CARTE` in `src/config.js`, `src/dati/scala.js` (una sola conversione), `src/dati/giocatori.js` (ruolo, piede, altezza), `scripts/genera-giocatori.mjs`, `scripts/prova-dati.mjs`; `docs/ponte-partita.md` | pronto e provato, **non ancora collegato alle schermate** (si collega col trasloco) |
| trasloco | Il codice della home è in `src/casa/` (`casa.js`, `casa.html`, `casa.css`): righe spostate così com'erano da `src/game.js` e `src/pagina.html`. Verifica: 153 foto delle schermate identiche a prima, tre partite simulate identiche | fatto |
| 4 | Barra fissa (`barra.js`), carte di navigazione (`carte.js`), navigazione a livelli con Indietro (`nav.js`), icone nella pagina (`icone.js`), testi delle schermate nuove in un file (`testi.js`), stili nuovi (`stile.css`). Scala 55–82, ruoli precisi e prezzi nuovi accesi sulle schermate. «Ingaggia il tuo capitano» coi nove candidati nuovi e il pulsante fuori dalle carte | fatto |
| 5 | Home a otto carte (`home.js`): righe al 38, 27 e 35%; nessun testo abbreviato o tagliato (nomi delle squadre in tre misure, `src/dati/squadre.js`); Carriera con le tre competizioni e la prossima partita; Percorso premi coi livelli da 1 e i prossimi quattro premi; Squadra con la fascia «C»; Mercato con la carta del giocatore, lo stemma e il prezzo; Scenario col premio; sfondo blu notte con vignettatura | fatta, coi dati veri; restano le illustrazioni (segnaposto) e il premio ridotto dell'amichevole |
| 6 | Carriera (`vista-carriera.js`): prossima partita con «Gioca adesso», classifica a cinque righe con le medaglie, Trofeo dei Castelli, Coppa Titano, quattro scorciatoie. Stagione nuova con finestra di conferma (`finestra.js`). Classifica a pari punti: differenza reti, gol fatti, nome. Tolta la schermata di prima e 200 regole di stile rimaste senza uso | fatto |
| 7 | Sfida (`vista-sfida.js`): due campi in prospettiva con le carte a scudo dei giocatori secondo il modulo (`giocatore.js`: valutazione, ritratto, ruolo, energia, nome, fascia «C», avviso di fuori ruolo), competizione, fase, ora e tempo al centro, sotto ogni campo stemma, nome, stelle, modulo e maglia della partita; in basso Squadra, Riscaldamento e Gioca. La partita parte dal ponte e alla fine la home registra il risultato, salva l'energia e mostra il premio in una finestra. Energia tra le partite, riscaldamento e orario in `src/carriera.js`, coi numeri in `ECONOMIA.energia` e `METEO` | fatto |
| carte | Cornice delle carte ridisegnata sul modello di Alex (`docs/riferimenti/modello-carte.png`): scudo con angoli smussati e punta, bordo, riflessi, tre fasce. Tre misure in `giocatore.js`: grande (tutto dentro, nome su fascia scura, stemma ed energia), piccola (per i campi stretti, nome sotto) e mini (Home). Usata in Home, Sfida, Squadra, scheda del giocatore e scelta del capitano | fatto |
| 8 | Squadra (`vista-squadra.js`): titolo «Gestione squadra» nella barra; campo in prospettiva con gli undici (`campo.js`), panchina a due colonne, Modulo, Riserve, Fisioterapista, Allenatore, i quattro incarichi, «Squadra migliore» (`rosa.js`). Scambio a tocchi o trascinando, tocco lungo per la scheda del giocatore (`scheda-giocatore.js`: statistiche, altezza, piede, valore, capitano, allena, vendi). In `src/carriera.js`: `schiera`, `spostaGiocatori`, incarichi, fisioterapista | fatto |
| economia | Carriera a cinque divisioni, economia, diamanti e strutture approvate da Alex (`docs/home-spec.md` §5): sessanta squadre inventate (`src/dati/divisioni.js`), obiettivi, promozione e retrocessione, valore dei giocatori, vendita e svincolo, allenatori in inventario, lista trasferimenti, osservatore, agente, offerte a tempo, sette strutture, fisioterapista a tre interventi, riscaldamento, serie di sette giorni (`src/carriera.js`, numeri in `DIVISIONI`, `STAGIONE`, `ECONOMIA` di `src/config.js`). Collegata a Home, Carriera, Sfida, Squadra e scheda del giocatore; pannelli semplici per Mercato, Il mio club e «Come guadagnare» (`vista-economia.js`). Simulazione: `node scripts/simula-carriera.mjs` | fatto; l'aspetto di Mercato e Club arriva coi passi 9 e 10 |
| 9–11 | Mercato, Il mio club, Sfide | da ridisegnare: funzionano già con le regole nuove, ma con l'aspetto di prima sotto la barra nuova |
| 12 | Database dell'economia | fermo per decisione di Alex (21/11): saldo e storico restano sul telefono. Il file SQL è da riscrivere coi numeri nuovi; la proposta della «cassa» è in `docs/ponte-partita.md` §9 |

Immagini: tutte le 26 illustrazioni sono **segnaposto** (nessuna consegnata); icone e cornici **definitive**; ritratti:
quelli che il gioco disegna da sé, in attesa dei render da Blender.

Controllo delle schermate: `node scripts/prove/schermate.cjs cartella` fotografa tutto alle tre misure di iPhone e, nelle
parti rifatte (barra, Home, Carriera, Sfida, Squadra, scheda del giocatore, finestre), controlla le regole di qualità: testo mai sotto 12 px, niente tagli, niente fuori schermo,
pulsanti da 44 px, anche con nomi lunghi e saldi grandi; sui campi della Sfida nessun giocatore ne copre un altro.
Sfida: le carte sono grandi quanto il campo consente. Un modulo a cinque linee (3-5-2, 4-2-3-1) le vuole più piccole di
uno a quattro: sull'iPhone più piccolo lo scudo è largo 26 px invece di 31. Giorno o notte in campo vengono dall'orario
della partita, non si scelgono più. Una partita di carriera abbandonata non viene registrata (da decidere con Alex).
La schermata vecchia `#pre` non si raggiunge più: il suo codice in `casa.js` e in `src/game.js` si toglie insieme
all'altra sessione.
Squadra: le carte grandi (col nome dentro) vogliono almeno 58 px di larghezza. Con un modulo a cinque linee, sugli iPhone
da 667 e 844 punti, non ci stanno e il campo passa alle carte piccole col nome sotto; a 932 restano grandi. In porta va
solo un portiere. La panchina ha otto posti: si parte con sette riserve, più quella che lascia il posto al capitano;
«Riserve» conta chi sta oltre l'ottavo posto.
Sfondo della Home: l'importatore e la vignettatura sono pronti, manca il file (`docs/riferimenti/LEGGIMI.md`).

Decisioni di Alex del 21/11: `docs/navigazione.md` §5. Da girare alla sessione «partita»: `docs/ponte-partita.md`.
I nomi dei giocatori stanno ancora in `public/data.js` (lo usa la partita); `src/dati/giocatori.js` li ripete con ruolo,
piede e altezza e una prova controlla che coincidano. Unirli in un file solo vuol dire toccare il file della partita.

## Carriera a divisioni ed economia nuova (21/11)
Regole e numeri: `docs/home-spec.md` §5. Qui cosa c'è da sapere per riprendere.

- **Simulazione** (`node scripts/simula-carriera.mjs 1000`): un giocatore che vince il 50%, pareggia il 30% e perde il 20%
  arriva dalla Lega Esordienti al Campionato Sammarinese in **6,9 stagioni** in media (la metà entro 6, nove su dieci
  entro 10; circa 150 partite). Coi primi numeri erano 5,0: corretto con obiettivi più difficili salendo di divisione e
  con le monete delle sfide dimezzate. Giocatore forte (65/20/15): 4,7 stagioni; debole (40/30/30): 15.
- **Carriere di prima**: non si possono continuare, si riparte da zero (la versione del salvataggio è la 2).
- **Come arriva alla partita**: la partita conosce un numero solo per giocatore, la `forza`. Crescita con gli allenatori,
  riscaldamento e Curva dei tifosi ci stanno dentro. Le squadre inventate arrivano per intero nella richiesta; lo stemma
  lo disegna la home coi pezzi dello stemma. Dettagli in `docs/ponte-partita.md`.
- **Scelte mie da confermare con Alex** (segnate «scelta mia» nella specifica): monete d'inizio 150; obiettivi per
  divisione; «+1, +2, +3» degli allenatori letti come punti sulle statistiche della categoria; prezzi in vittorie di
  osservatore, agente, riscaldamento e fisioterapista; costo delle stelle delle strutture; bonus della Curva 1% per
  stella; incasso dello Stadio; rosa mai sotto 16; chi arriva tra le ultime due scende anche con gli obiettivi fatti.
- **Resta da fare**: aspetto nuovo di Mercato (passo 9), Il mio club (10) e Sfide (11); «sotto il 60% di energia cala
  prima la velocità» (sessione della partita); il limite dei moduli nella pausa della partita; l'esultanza del capitano
  (servono animazioni); il listino del database.
- **Prove**: `npm run prova` copre squadre inventate, rosa iniziale, premi, valore, vendita e svincolo, lista, osservatore,
  agente, offerte, allenatori e potenziale, strutture, energia, serie di sette giorni, sfide e percorso, obiettivi,
  promozione e retrocessione fino al Campionato Sammarinese. `scripts/lib/mondo.mjs` prepara fuori dal browser quello che
  la home prepara all'avvio.

## Ritratti (21/11)
Come sono fatti, chi ha quale volto e come si rifanno: `docs/ritratti.md`. Strumenti: `scripts/aspetti.mjs`,
`scripts/blender/render_ritratti.py`, `scripts/blender/tutti.sh`, `scripts/ritratti_webp.py`, `scripts/volti.mjs`.

- **Stato**: Alex ha approvato il terzo foglio di prova e ha chiesto tutti i ritratti. **In generazione**: 415 volti (265
  giocatori veri + 150 condivisi), a blocchi, prima i condivisi. I file arrivano in `public/img/ritratti/`; l'elenco
  per il gioco è `src/dati/volti.json` (da rifare con `node scripts/volti.mjs` quando arrivano altri volti).
- **Nel gioco, fatto**: la home compone i ritratti nuovi (`src/casa/ritratti.js`, numeri in `RITRATTI` di
  `src/config.js`): testa, maglia coi colori e i disegni della squadra in cui il giocatore gioca adesso, capelli
  davanti. Carte piccole col viso, carta grande col busto. Chi non ha ancora il ritratto nuovo tiene quello vecchio.
- **Regola dei volti, fatta**: un volto per ogni giocatore vero; 150 condivisi per inventati e mercato, mai due facce
  uguali nella stessa rosa né tra un'altra squadra e la mia (nella mia rosa i volti restano scritti nella carriera).
- **Decisioni di Alex**: maglia neutra colorata dal gioco; di base girocollo o scollo a V, colletto piccolo solo come
  variante di alcune squadre; colore degli occhi legato alla pelle.
- **Ancora da fare**: il colletto piccolo (per ora chi ha la polo in partita ha il girocollo nel ritratto); gli avatar
  del manager sono ancora quelli vecchi del modello 3D; il giro completo delle foto alle tre misure di iPhone con tutti
  i volti, prima di unire. `docs/riferimenti/modello-carte.png` non è nel repository.
- **Tempi** (computer cloud, 4 processori, senza scheda grafica, 800 punti di lato, 256 campioni con soglia di rumore):
  in media 80-95 secondi a volto (chi ha i capelli lunghi arriva a 160, perché ha anche lo strato «sopra»); ogni maglia
  26 secondi, una volta sola. 415 volti: circa 10-11 ore.
- **Peso**: testa a 512 e 256 punti insieme circa 27 KB a volto (415 volti: circa 11 MB); le due maglie 345 KB in tutto.
  I ritratti non si precaricano: ogni telefono prende solo quelli che guarda.
