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
| Applicare il file SQL e collegare il gioco al saldo sul server | il progetto è quello dell'app pubblicata e Alex ha chiesto prima un backup: Supabase gratuito non ne fa e Claude non può farlo da qui | il backup (o la decisione che non serve), e l'ok alle sette funzioni in `public`: `docs/home-spec.md` §8.1 |
| Logo | Alex deve dire se la corona giusta è la lime (quella che c'è) o la viola | la risposta, e il file se è la viola |
| Testi in un unico file | è un lavoro che tocca quasi tutto il codice dell'interfaccia: va fatto da solo, dopo queste modifiche | niente, è il prossimo passo |
| Esultanza del capitano (negozio) | nel gioco ci sono solo due esultanze | altre animazioni da Mixamo |
| Immagine di sfondo della home | la manda Alex | 3840 × 1800 pixel, indicazioni in `docs/home-spec.md` §6; ora c'è un gradiente |
| Clip «mani in testa» e «indica» | le manda Alex | FBX, Without Skin, 30 fps |
| fps veri su iPhone | qui non c'è un iPhone | aprire il gioco con `?debug` e dirmi i numeri |
| Più gol e più tiri | Alex: pochi, puntare a 2–3 gol e 10–12 tiri per squadra | vedi `docs/dls-gameplay.md`, «Gol e tiri» |
| Texture KTX2 | le texture dei giocatori le disegna il gioco coi colori della squadra | niente, salvo cambiare sistema |

## Da sapere
- Resta su GitHub il ramo `claude/dls-risposte-tastiera-gol`, creato per errore: si può cancellare dalla pagina dei rami.
- Come provare ogni cosa: `docs/dls-gameplay.md` (partita), `docs/home-spec.md` §7 (home), `modelli/mpfb/LEGGIMI.md` (giocatori).

## Sessione «Home, menu e sezioni» (prompt del 21/11, 14 passi)
Un'altra sessione lavora sulla partita: questa non tocca i suoi file senza averlo detto prima ad Alex.

| Passo | Cosa | Stato |
|---|---|---|
| 1 | `docs/navigazione.md`: albero, da dove si entra, dove porta Indietro | fatto |
| 2 | `docs/immagini-da-generare.md` (26 illustrazioni coi prompt), `scripts/importa_immagini.py`, icone SVG (`scripts/icone.mjs`, `public/img/icone/`), logo senza scritta (`public/img/logo-fantatitano.png`) | fatto |
| 3 | Scala delle valutazioni e file di dati | fermo: servono le risposte di Alex (sotto) |
| 4–11 | Barra, carte, Home, Carriera, Sfida, Squadra, Mercato, Il mio club, Sfide | da fare |
| 12 | Database dell'economia | da fare (condizioni in `docs/home-spec.md` §8.1) |

Immagini: tutte le 26 illustrazioni sono **segnaposto** (nessuna consegnata); icone e cornici **definitive**; ritratti:
quelli che il gioco disegna da sé, in attesa dei render da Blender.

Domande aperte per Alex prima del passo 3: `docs/navigazione.md` §5 (campanella, Scenario, Allenamento, energia tra le
partite, moduli, dove sta il codice della home) e la scala delle valutazioni (cambia solo il numero mostrato o anche la
forza in partita; ruoli nuovi dei giocatori).
