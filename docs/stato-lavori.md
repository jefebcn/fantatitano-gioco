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
  Il lime resta accanto alla corona, finché il logo è quello lime. Tabellone e tasti in partita non sono cambiati.
- **Negozio** (3A, 6A): quattro schede (stemma, divisa, manager, squadra), acquisto in due tocchi. Stemma a pezzi (forme,
  simboli, bordi) con una base gratis ricca; disegni speciali e terza maglia; avatar e cornici; scarpini della squadra,
  pallone di casa, rinnovo del giocatore consigliato. Elenco e prezzi in `docs/home-spec.md` §5.5.
- **Database** (9, 10, 11): il file SQL ora lavora nello schema separato `lapartita`, non tocca niente di esistente, non
  importa i saldi vecchi (si riparte da zero) e conosce anche il negozio. Provato su un database locale. **Non applicato.**

## Resta da fare

| Cosa | Perché non è fatto | Cosa serve |
|---|---|---|
| Saldo e storico sul server | deciso da Alex (21/11): **per ora niente sul database**. Il gioco è privato, saldo e storico restano sul telefono. `supabase/002-lapartita-economia.sql` resta pronto | vedi «Prima del lancio» qui sotto |
| Logo | Alex deve dire se la corona giusta è la lime (quella che c'è) o la viola | la risposta, e il file se è la viola |
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
| 8–11 | Squadra, Mercato, Il mio club, Sfide | da fare: per ora sono le schermate di prima, sotto la barra nuova |
| 12 | Database dell'economia | da fare (condizioni in `docs/home-spec.md` §8.1) |

Immagini: tutte le 26 illustrazioni sono **segnaposto** (nessuna consegnata); icone e cornici **definitive**; ritratti:
quelli che il gioco disegna da sé, in attesa dei render da Blender.

Controllo delle schermate: `node scripts/prove/schermate.cjs cartella` fotografa tutto alle tre misure di iPhone e, nelle
parti rifatte (barra, Home, Carriera, Sfida, finestre), controlla le regole di qualità: testo mai sotto 12 px, niente tagli, niente fuori schermo,
pulsanti da 44 px, anche con nomi lunghi e saldi grandi; sui campi della Sfida nessun giocatore ne copre un altro.
Sfida: le carte sono grandi quanto il campo consente. Un modulo a cinque linee (3-5-2, 4-2-3-1) le vuole più piccole di
uno a quattro: sull'iPhone più piccolo lo scudo è largo 26 px invece di 31. Giorno o notte in campo vengono dall'orario
della partita, non si scelgono più. Una partita di carriera abbandonata non viene registrata (da decidere con Alex).
La schermata vecchia `#pre` resta solo come «La mia rosa», fino al passo 8.

Decisioni di Alex del 21/11: `docs/navigazione.md` §5. Da girare alla sessione «partita»: `docs/ponte-partita.md`.
I nomi dei giocatori stanno ancora in `public/data.js` (lo usa la partita); `src/dati/giocatori.js` li ripete con ruolo,
piede e altezza e una prova controlla che coincidano. Unirli in un file solo vuol dire toccare il file della partita.
