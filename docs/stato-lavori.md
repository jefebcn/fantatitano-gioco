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
1 profilo e personalizzazione (avatar tra otto, nome, colori, stemma); 2 obiettivi della settimana e percorso premi; 3 «+»
→ come guadagnare e storico; 4 home, impostazioni, info, notifiche; 5 campionato → pre-partita → partita → premi e
classifica; 6 classifica completa con calendario; 7 Trofeo dei Castelli e Coppa Titano; 8 rosa; 9 mercato; 10 sfide;
11 club (stadio, allenatore, stemma, allenamento, finanze, amichevole); 12 badge «!» su premi, pillole, sfide, club, campanella.

## Resta da fare

| Cosa | Perché non è fatto | Cosa serve |
|---|---|---|
| Saldo e storico sul server | non si creano tabelle sul database dell'app senza il sì di Alex | leggere `supabase/002-lapartita-economia.sql` (pronto, provato su un database locale) e dare il via libera; poi collego il gioco |
| Immagine di sfondo della home | la genera Alex | 3840 × 1800 pixel, indicazioni in `docs/home-spec.md` §6; ora c'è un gradiente |
| Clip «mani in testa» e «indica» | sono di Mixamo, le scarica Alex | FBX, Without Skin, 30 fps, nella cartella del Soccer Game Pack o in chat |
| Stemma a pezzi da sbloccare | decisione 9 aperta | per ora la percentuale dice quanto è personalizzato |
| Oggetti da comprare coi diamanti (terza maglia, esultanze, scarpini…) | decisione 3 aperta | l'elenco approvato |
| Altre schermate in blu e oro (menu iniziale, pausa, fine partita) | decisione 7 aperta | sì o no |
| fps veri su iPhone | qui non c'è un iPhone | aprire il gioco con `?debug` e dirmi i numeri |
| Taratura del gioco tra computer | serve giocare | gol 0,7–1 a partita (obiettivo 1–6), tiri 6 (obiettivo 7–30), fuorigioco rari |
| Texture KTX2 | le texture dei giocatori le disegna il gioco coi colori della squadra | niente, salvo cambiare sistema |

## Scelte provvisorie (prese per non fermarsi, da confermare)
- Prezzi del mercato della proposta: coefficiente 0,4 (un giocatore da 85 costa 4.900 monete). Si cambia in una riga
  (`ECONOMIA.prezzo` in `src/config.js`, e la riga `mercato_coefficiente` del listino).
- Percorso premi legato alla stagione della carriera (20 livelli, 40 punti a livello).
- Allenatore: cinque livelli, una seduta di allenamento in più e 5% di sconto per livello.
- Logo: resta `img/corona-lime.png` (l'unico originale che c'è nel gioco).
- Lingua: solo italiano.
- La home e i suoi pannelli sono in blu notte e oro; il resto del gioco resta viola e lime.

## Decisioni aperte per Alex
Sono le dieci in fondo a `docs/home-spec.md`. Le più urgenti: il logo (c'è un file della corona viola?), i prezzi del
mercato, il via libera al database.

## Da sapere
- Resta su GitHub il ramo `claude/dls-risposte-tastiera-gol`, creato per errore: si può cancellare dalla pagina dei rami.
- Come provare ogni cosa: `docs/dls-gameplay.md` (partita), `docs/home-spec.md` §7 (home), `modelli/mpfb/LEGGIMI.md` (giocatori).
