# Fantatitano — La Partita

Gioco di calcio 3D nel browser (telefono e computer), con squadre, stemmi, rose e Tito
presi dal progetto Fantatitano. **Prototipo 0.4**: una partita amichevole giocabile, con calciatori veri (volto, capelli, divisa della squadra) e animazioni registrate.

Vive in un repository e in un deploy suoi, ma è pensato per comparire sotto
`fantatitano.site/gioco`, con lo stesso account e lo stesso database Supabase dell'app
(decisione di Alex, 17/11/2026). Il collegamento all'app non è ancora fatto.

## Avvio

```bash
npm install
npm run dev      # apre un server locale e ricompila a ogni modifica
npm run build    # produce public/app.js, public/index.html e public/sw.js (lo fa anche Vercel a ogni deploy)
```

`public/` è il sito: `index.html` e `sw.js` (generati da `scripts/pubblica.mjs`), `data.js`, `modello.js`, `anim.js`, `app.js` (generato), `img/`, `font/`, `manifest.webmanifest` e le icone dell'app.

## Struttura

| Percorso | Contenuto |
|---|---|
| `src/game.js` | La partita: scena, motore, IA, comandi, pausa, sostituzioni, fine partita, audio |
| `src/casa/casa.js`, `casa.html`, `casa.css` | La home, i menu e le schermate fuori dalla partita (ingresso, club, carriera, pannelli, scelta squadre, prima della partita). `casa.js` aggiunge alla pagina schermate e stili all'avvio; con `src/game.js` si scambia solo i nomi elencati nei due `import` |
| `src/casa/nav.js`, `barra.js`, `carte.js`, `home.js`, `vista-carriera.js`, `vista-sfida.js`, `vista-squadra.js`, `vista-economia.js`, `scheda-giocatore.js`, `giocatore.js`, `campo.js`, `rosa.js`, `finestra.js`, `icone.js`, `testi.js`, `stile.css` | Le schermate nuove della home: navigazione a livelli con Indietro, barra in alto, carte di navigazione, Home a otto carte, Carriera, Sfida, Squadra, pannelli di club e mercato, finestre di conferma, icone, testi in un file solo, stili |
| `src/dati/scala.js`, `giocatori.js`, `squadre.js`, `divisioni.js` | Valutazioni e statistiche mostrate (una sola conversione), ruoli precisi, piede e altezza dei giocatori; i tre nomi di ogni squadra (completo, breve, sigla); le sessanta squadre inventate delle divisioni basse coi loro giocatori |
| `src/pagina.html` | Pagina, stili comuni e schermate della partita (comandi, VS, pausa, sostituzioni, fine partita). La build la copia in `public/index.html` con la versione negli indirizzi degli script |
| `src/audio.js` | L'audio, uno solo per home e partita: effetti e pubblico generati al momento, musica della home da file (`public/audio/`), volumi di musica ed effetti e tasto muto salvati sul telefono |
| `src/sw.js` | Service worker: app installabile, avvio dalla memoria e gioco offline. La build lo copia in `public/sw.js` con la versione e i file da precaricare |
| `src/prestazioni.js` | Risoluzione dinamica e indicatore delle prestazioni (`?debug` nell'indirizzo) |
| `src/debug-ia.js` | Vista di controllo dell'IA (`?ia` nell'indirizzo o tasto O): posizioni base, linee di passaggio col punteggio, decisioni |
| `docs/home-spec.md` | La specifica della home (schermate, dati, economia, sfondo) e le decisioni aperte per Alex |
| `docs/stato-lavori.md` | Cosa è fatto, cosa resta e le decisioni aperte del prompt «modalità partita + home» |
| `supabase/002-lapartita-economia.sql` | Proposta, non applicata: monete e diamanti sul server (tabelle, listino, funzioni). Si prova con `supabase/prove/002-economia-prova.sql` su un Postgres locale |
| `public/data.js` | 16 squadre con colori, undici titolari e riserve. **Generato**: `python3 scripts/genera-dati.py <cartella dell'app>` |
| `src/regia.js` | Regia: sequenza del gol (primo piano, scheda del marcatore, replay, transizione), arbitro, segnaposto col nome, tabelloni che festeggiano. Crea da sola la sua grafica, senza toccare `index.html` |
| `src/divisa.js` | Disegna la divisa come texture: una per divisa e tono di pelle, non per giocatore |
| `public/modello.js` | Calciatore e capigliature, compressi con Meshopt, in base64. **Generato**: `npm run modello` |
| `public/anim.js` | Tutte le animazioni, già adattate allo scheletro del calciatore. **Generato**: `node scripts/animazioni.mjs <cartella degli FBX>` |
| `public/img/` | Stemmi di fantasia (grande e `-mini`), pose di Tito, logo (copiati da `media/` dell'app); `pelle.webp`, `occhi.webp`, `divisa-maschera.png` (generati) |
| `modelli/calciatore.glb` · `capelli.glb` | Il calciatore in uso: corpo MakeHuman/MPFB (CC0) sullo scheletro del gioco, tre livelli di dettaglio (4.264, 1.500 e 600 triangoli), due forme (snello, robusto), sette capigliature. Fatti da `scripts/blender/calciatore.py` (in Blender) e `scripts/calciatore-nuovo.py`; vedi `modelli/mpfb/LEGGIMI.md` |
| `modelli/mpfb/blender/` | Quello che esce da Blender (tre corpi, capigliature, punti del viso): `npm run modello` parte da qui, senza Blender |
| `modelli/quaternius/` · `quaternius-scheletro.glb` · `quaternius-capelli.glb` | Il calciatore di prima («Universal Base Characters» di Quaternius, CC0): dà lo scheletro a quello nuovo e resta come ripiego (`?corpo=vecchio`, con `public/modello-vecchio.js` e `public/img/vecchio/`) |
| `modelli/animazioni-base.glb` | Solo sorgente di attesa, camminata e corsa (manichino di three.js, scheletro Mixamo) |
| `scripts/maschera-nuova.py` | Dice, per ogni punto della texture del corpo, se è pelle, maglia, pantaloncini, calzettoni, scarpe; sulla pelle anche capelli, sopracciglia, barba, occhio. Disegna la pelle (`pelle.webp`) |
| `scripts/modello-js.mjs` | Comprime i due GLB (Meshopt) e li mette in `public/modello.js` |
| `scripts/calciatore.mjs` · `scripts/maschera-divisa.py` | Gli stessi passi per il corpo di ripiego |
| `scripts/animazioni.mjs` | Porta le clip Mixamo sullo scheletro del calciatore; in cima c'è l'elenco `CLIP` |
| `src/carriera.js` | La logica della carriera, senza schermate: cinque divisioni, coppe, obiettivi, mercato, allenatori, strutture, monete e diamanti (`docs/home-spec.md` §5). `scripts/simula-carriera.mjs` la fa giocare da sola per misurare l'economia |
| `src/testi.js` | I testi della partita, in un file solo (oggi solo italiano; quelli della home in `src/casa/testi.js`, stessa forma): `t('chiave')` nel codice, `data-t="chiave"` in `src/pagina.html`. In testa al file c'è come si aggiunge l'inglese |
| `scripts/prova-carriera.mjs` | Prove della logica della carriera: `npm run prova` |
| `scripts/controlla-commenti.mjs` | Cerca i commenti che si sono mangiati del codice nelle righe lunghe: `npm run controlla` |
| `scripts/simula.cjs` | Gioca partite simulate e stampa gol, tiri, possesso, inserimenti e scivolate: serve per tarare l'IA (richiede Playwright). Stampa anche falli, fuorigioco, rigori, cartellini, angoli, cross e colpi di testa |
| `scripts/prove/partita.cjs` | Rete di sicurezza: partite intere computer contro computer con tutti i controlli (giocatori che saltano, gesti bloccati, corpi nell'erba, palla abbandonata, errori nella pagina) e le misure di gioco confrontate con gli obiettivi. `npm run partite` dopo `npm run build`; `RAPPORTO=prima.json` salva tutto per confrontare prima e dopo una modifica |
| `scripts/prove/testi.cjs` | Testi della partita: `chiavi` controlla che ogni chiave esista e sia usata (è in `npm run prova`); `salva` e `confronta` salvano le scritte di una partita intera sempre uguale e le confrontano con un salvataggio precedente |
| `scripts/prove/riprese.cjs` | Le otto riprese (calcio d'inizio, punizioni, fuorigioco, angolo, rimesse, rigore), battute da chi gioca e dal computer: il pallone resta fermo finché non si batte, con chi gioca non parte mai da sola, il computer aspetta `FERMI.cpu`, nessuno scatta verso il suo posto |
| `scripts/prove/gira.cjs` | Il telefono che si gira senza un evento «resize» utile, come su iPhone: Home, barra e Squadra riprendono le misure da sole (`src/casa/schermo.js`) e vengono uguali a quando il gioco si apre già in orizzontale |
| `scripts/prove/vagante.cjs` | Passaggio al giocatore comandato con la levetta tenuta in otto direzioni: il pallone viene preso. Palla libera vicino a un compagno: il comando passa a lui entro un secondo |
| `scripts/prove/passaggi.cjs` | Misura il peso del passaggio rasoterra a 6–30 m, al compagno fermo o in corsa: velocità alla partenza e all'arrivo, tempo, se è corto o lungo. Non è nelle prove automatiche: serve per confrontare con Dream League |
| `scripts/prove/divise.cjs` | Per ogni coppia di squadre: le due maglie sono lontane e nessuna parte della divisa degli ospiti (disegno, maniche, pantaloncini, calzettoni) ha il colore della maglia di casa |
| `scripts/prove/rigori.cjs` | Sei rigori fischiati con i giocatori sparsi: tutti arrivano al loro posto correndo (nessun salto oltre 60 cm), il tiro parte e il gioco riprende |
| `scripts/prove/fluidita.cjs` | Fluidità dei movimenti: quanto scivola il piede in appoggio e quanti scatti ha la posa (`PIEDI=0` per confrontare senza i piedi piantati) |
| `.github/workflows/prove.yml` | A ogni PR: compilazione, `npm run controlla`, `npm run prova`, tre partite simulate e i rigori. Un'anomalia ferma la PR; le misure di gioco si leggono nel registro |
| `scripts/analizza.mjs` | Misura le clip di un pacchetto Mixamo, per scegliere quali usare e dove ritagliarle |

## Cosa c'è

- Partita 11 contro 11 di 4 minuti, tre difficoltà, visuale TV.
- **Solo orizzontale** (`resize`): se lo schermo è in verticale, anche col blocco della rotazione, il gioco si
  disegna ruotato di lato e i tocchi vengono riportati nel verso giusto. In CSS si usano `--vw` e `--vh`
  (misure del gioco) al posto di `vw` e `vh`, e le classi `largo`, `basso`, `bassissimo` al posto delle
  regole `@media`. `manifest.webmanifest` chiede l'orizzontale quando il gioco è installato.
- Comandi touch come Dream League (levetta fissa con scatto al bordo; Calcio forte, Calcio basso, Calcio alto, che senza palla
  diventano Scivolata, Pressing, Cambia giocatore) e tastiera (frecce, Spazio, X, C; Maiusc per non scattare).
- Gol, rimesse, angoli, rimesse dal fondo, pali e traverse.
- **Falli e cartellini** (`foul`, `card`, numeri in `FOUL`): fallo sul contrasto in piedi o in
  scivolata (molto più probabile da dietro) e per contatto prolungato. Giallo, secondo giallo e
  rosso diretto per il fallo da ultimo uomo: l'espulso esce e la squadra resta in dieci (mai sotto
  i sette; il portiere non viene espulso).
- **Vantaggio e infortuni** (in `foul`): se chi subisce il fallo resta in piedi col pallone e senza altri
  avversari addosso, l'arbitro lascia correre (il giallo si dà lo stesso). Dopo un fallo chi lo subisce
  può farsi male e da lì in poi va più piano: succede solo se la squadra ha una panchina.
- **Panchina e sostituzioni** (`creaGiocatore`, `sostituisci`, `aiSubs`, numeri in `SUB`): cinque cambi a
  partita dalla pausa (si tocca chi esce e chi entra; il portiere si cambia solo con un portiere). L'IA ne
  fa fino a tre a gioco fermo: prima chi si è fatto male, poi forze fresche nel secondo tempo.
  Le riserve stanno nel campo `pan` di ogni squadra in `public/data.js` (da 5 a 7: un portiere e fino a due
  per ruolo), scritte da `scripts/genera-dati.py`. In «La mia rosa» si tocca un titolare e una riserva dello
  stesso ruolo per scambiarli (`cambiaTitolare` in `src/carriera.js`).
- **Calci di rigore** (`startShootout`, `soKick`, `soEsito`): le partite di coppa finite in parità si
  decidono ai rigori giocati, cinque a testa e poi a oltranza. Ognuno tira nella porta verso cui attaccava.
- **Casa e trasferta**: in trasferta si comincia attaccando verso sinistra e, se i colori si somigliano, è
  la squadra dell'utente a mettere la seconda maglia; all'intervallo le squadre cambiano campo.
- **Punizioni e rigori** (`freeKick`, `penalty`): se la punizione è a tiro, tre avversari fanno
  barriera a 9 metri e l'IA calcia in porta. Sul rigore tutti escono dall'area; l'utente mira con
  la levetta e tira (dopo 6 secondi parte da solo).
- **Fuorigioco** (`offsideLine`, `offside`): si guarda la posizione al momento del passaggio, non
  vale su rimessa, angolo e rimessa dal fondo. I compagni restano in linea coi difensori e scattano
  col passaggio. Tra due squadre guidate dall'IA capita di rado, perché le difese stanno basse.
- **Gioco aereo** (`cross`, `header`, `corner`, numeri in `AIR`): il tasto **Cross** (C sulla
  tastiera) fa un traversone verso il compagno in area o, se in area non c'è nessuno, un lancio lungo nella
  direzione della levetta; l'IA crossa da sola dalla fascia. Sul pallone alto
  chi ci arriva colpisce di testa: in porta se è a tiro, via dall'area se difende, di sponda negli
  altri casi; i tiri forti passano. Sul calcio d'angolo cinque attaccanti entrano in area, ognuno con
  un marcatore, e chi batte crossa. Il portiere esce sui traversoni che scendono vicino alla porta e
  alcune sue respinte finiscono in angolo. Il colpo di testa usa l'animazione `testa`.
- **Carriera** (`src/carriera.js`, schermate in `drawHub` e nei pannelli `pan…`): al primo avvio si
  scelgono nome e squadra. La dashboard mostra la prossima partita di campionato, la classifica, la
  Coppa Titano, l'amichevole, la rosa, i numeri del club e il tabellone di coppa.
  - **Campionato**: 16 squadre, 15 giornate a girone unico; le altre sette partite di ogni giornata
    sono simulate secondo la forza delle squadre. A fine stagione se ne comincia un'altra.
  - **Coppa Titano**: eliminazione diretta dagli ottavi, partita secca; in parità decidono i rigori, giocati
  - **Monete e mercato** (`PREMI`, `prezzo`, `scambio`, pannello `panMercato`): le monete arrivano da
    risultati, gol, turni di coppa e trofei. Si prende un titolare di un'altra squadra cedendo in cambio
    un proprio giocatore dello stesso ruolo e pagando la differenza (chi si cede vale il 70% del suo
    prezzo). Le rose cambiate stanno in `rose` dentro la carriera e valgono anche nelle amichevoli. La
    forza delle squadre nei risultati simulati non cambia con gli scambi.
  - Tutto è salvato sul dispositivo (`localStorage`, chiave `fantatitano-carriera`): non c'è ancora il
    collegamento all'account dell'app. Uscire a metà partita non registra il risultato.
- **Prima della partita** (la Sfida, `src/casa/vista-sfida.js`): due campi in prospettiva con le carte dei
  giocatori secondo il modulo, la competizione, l'ora e il tempo al centro, sotto ogni campo stemma, nome,
  stelle, modulo e maglia della partita. «Riscaldamento» dà un po' di energia ai titolari per monete, una
  volta per partita. «Gioca» avvia la partita dal ponte (`docs/ponte-partita.md`); alla fine la home registra
  il risultato e salva l'energia con cui i giocatori sono usciti dal campo (`energiaDopoPartita`).
- **Tattica** (`FORMS`, `MENT`, `setTactics`): quattro moduli (4-3-3, 4-4-2, 3-5-2, 4-2-3-1) e tre
  mentalità. Si scelgono prima della partita e dalla pausa; in campo un tocco sulla scritta sopra la
  mappa cambia mentalità. Ogni avversaria ha il suo modulo e nel finale attacca se è sotto e si copre
  se è sopra. Le scelte restano salvate sul dispositivo (`localStorage`).
- **Qualità e fatica**: chi vale di più (`q`) sbaglia meno tiri e passaggi (`qf`); lo scatto consuma
  energia (`TIRE`, barretta sotto il nome) e chi è stanco scatta meno forte.
- **Pagelle** a fine partita (`vote`, pesi in `VOTE`): voto da 3 a 10 da gol, assist, passaggi,
  contrasti, palloni intercettati, parate, falli, cartellini e risultato; migliore in campo.
- Calciatori: un solo corpo con scheletro per tutti e 22 (MakeHuman/MPFB, CC0, viso generico), in tre livelli di
  dettaglio scelti secondo la distanza dalla telecamera (`LOD` in `src/config.js`), tre corporature (forme «snello» e
  «robusto»), stature da 1,70 a 1,95, sette capigliature più la testa rasata, barba, cinque toni di pelle. Un materiale
  solo: capelli corti, sopracciglia e barba sono dipinti nello shader col colore dei capelli del giocatore. La divisa è una texture generata dai colori della squadra (`src/divisa.js`): maglia,
  pantaloncini, calzettoni col risvolto, scarpe, colletto e bordo delle maniche nel secondo colore; disegno della
  maglia dal campo `st` in `data.js` (`righe` verticali, `fasce` orizzontali, `meta` metà e metà, `banda`
  diagonale; l'elenco è `DISEGNI` in `src/divisa.js`); maniche lunghe e guanti per il portiere. Cognome e numero
  sulla schiena e stemma sul petto sono due piccoli piani appesi all'osso del torace. Chi gioca fuori casa
  usa il proprio secondo colore se si distingue da quello di casa, altrimenti bianco o nero (`pickKits`).
- Animazioni registrate (Mixamo, «Soccer Game Pack»): tiro, passaggio, scivolata, caduta di chi
  subisce la scivolata, tuffo del portiere a destra e a sinistra, presa, attesa del portiere, passi laterali
  del portiere, rinvio con le mani, colpo di testa (`testa`), corsetta. Costruite a mano sopra le clip di base:
  `aereo` (corsa a braccia aperte del marcatore) e `bandiera` (braccio alzato del guardalinee). L'esultanza è costruita (braccia alzate sopra la posa d'attesa).
  Il portiere che ha il pallone lo tiene in mano all'altezza del petto e lo rilancia dopo un secondo
  (`HOLD`, `LANCIO`): il pallone parte nel momento in cui il braccio lo lascia.
  Le fa partire `azione(p, nome)`; velocità e sfumature stanno nella tabella `FX`.
- IA di squadra:
  - **Inserimento a condizione** (`runs`, `INSERIMENTO`; idea di GameplayFootball): ogni mezzo secondo si
    guarda il punto 26 m davanti al portatore; se lì c'è spazio parte il compagno più vicino, per 4
    secondi, verso la porta. Uno alla volta. Dopo un passaggio in avanti può scattare il dai e vai. Chi
    ha palla cerca chi si inserisce e gli passa sulla corsa.
  - **Smarcamento col voto di chi passa** (`puntoVoto`, `votoPassaggio`, `SMARCA`): chi è senza palla
    prova otto punti attorno a dove sta andando e sceglie quello a cui il portatore darebbe il voto più
    alto per un passaggio, senza allontanarsi troppo dal posto nel modulo né ammucchiarsi.
  - **Tiro** (`valoreTiro`, `TIRO_IA`): quando tirare dipende da angolo, distanza e avversari nel cono;
    dove mirare si sceglie tra palo, centro e palo, guardando dove gli avversari arrivano più tardi.
  - **Difesa a tre distanze** (`chase`): il più vicino al portatore si avvicina, poi temporeggia
    tenendosi tra lui e la porta, poi va sul pallone; aspetta di meno se la porta è vicina o se è
    arrivato il raddoppio. In scivolata va solo se è stato saltato o vicino all'area.
  - **Marcature** (`roles`): un avversario per difensore, senza doppioni; chi si inserisce viene
    seguito anche dai centrocampisti.
  I numeri stanno in `RUN`, `DEF` e nei campi `wait` e `slide` di `DIFF`, in cima a `src/game.js`.
- **Regia** (`src/regia.js`), presa a esempio da un video di Dream League Soccer ma rifatta con grafica nostra:
  - **Dopo un gol**: un secondo di azione dal vivo, poi primo piano del marcatore che corre verso la bandierina ed
    esulta coi compagni, con la scheda (stemma, numero, nome, minuto, assist); transizione con la corona; **replay**
    dell'azione da un'altra telecamera (dietro la porta o bassa dal lato opposto, a turno) con lo zoom che segue il
    pallone; seconda transizione e calcio d'inizio. Si salta toccando lo schermo. I tempi sono in `SEQ` e `REP`.
  - Il replay non rifà girare la partita: di ogni figura si registrano posizione, verso e rotazioni delle ossa
    (30 volte al secondo, ultimi 6,5 secondi) e si rimettono com'erano. Dopo un calcio da fermo la registrazione
    riparte, quindi un gol su punizione o rigore ha un replay corto.
  - **Arbitro** in campo: segue l'azione restando a qualche metro dal pallone; non tocca niente e non fischia
    (i fischi li decide sempre il gioco). La maglia è il colore più lontano da quelli delle due squadre e dei portieri.
  - **Guardalinee**, uno per metà campo su lati opposti: seguono il penultimo difensore (o il pallone, se è più
    avanti) e alzano la bandierina per due secondi quando il gioco fischia un fuorigioco nella loro metà (`ASS`).
  - **Pubblico coi colori delle squadre**: la curva dietro la porta a -x è degli ospiti, il resto è di casa; dopo un
    gol salta il pubblico della squadra che ha segnato (`TIFO`).
  - **Esultanza**: il marcatore corre verso la bandierina e festeggia coi compagni (la corsa a braccia aperte è stata tolta:
    sembrava una posa a T).
  - **Segnaposto col nome** sopra il giocatore che si comanda, al posto della freccia.
  - **Tabelloni** a bordo campo che scorrono con «GOL!» e il nome del marcatore.
  - **Telecamera in diagonale** vicino alle porte (`DIAG`), così la porta si vede; prato tagliato a cerchi.
  - Agganci in `game.js`: `REGIA.figure()` e `REGIA.dopo()` in `draw()`, `G.goalEnd` in `step()`, `G.cine` in `think()`.
    Con i pupazzi a blocchi la sequenza non parte e il gol resta com'era (4,2 secondi).
- Se il modello non si carica, il gioco ripiega da solo sui pupazzi a blocchi (`makeFigure`).

## Cosa manca, in ordine

1. **Animazioni che mancano.** Il rinvio di piede del portiere e il portiere che cammina col pallone in mano (le clip
   `tiene_palla` e `cammina_palla` sono già convertite, non ancora usate). Esultanze, rimessa laterale con le mani, colpi
   di testa, scivolate, cadute, rialzarsi e cartellino dell'arbitro vengono da GameplayFootball (`scripts/gfootball.mjs`,
   sorgenti in `modelli/gfootball`).
2. **Divisa.** È dipinta sul corpo, quindi aderente: niente maglia larga con le pieghe. Il disegno è
   assegnato a mano a tre squadre (`STILE` in `scripts/genera-dati.py`); le altre sono a tinta unita.
   Il corpo è quello «Superhero» della versione gratuita del pacchetto: le proporzioni più normali sono
   nella versione a pagamento.
3. **Collegamento all'app.** Rewrite `/gioco` nel `vercel.json` di `fantasyfootballrsm` verso
   questo deploy, poi login condiviso e tabelle Supabase per carriera e rosa.
4. **Sfide**: mancano gli obiettivi. Il mercato resta a scambio tra titolari e le riserve non si comprano. Le
   altre squadre non fanno mercato tra loro.

## Cose da sapere

- **Il gioco non è ancora pubblico** (Alex, 17/11: «non deve essere ancora visibile per tutte le persone, finché non
  decido io di pubblicarlo»). Il collegamento a fantatitano.site/gioco è pronto nella PR #114 dell'app
  (`jefebcn/fantasyfootballrsm`, bozza): **non va unita finché Alex non lo dice**. Intanto il deploy di questo repository
  chiede ai motori di ricerca di non mostrarlo (`X-Robots-Tag` in `vercel.json` e `public/robots.txt`): resta
  raggiungibile da chi ha l'indirizzo fantatitano-gioco.vercel.app. **Quando si pubblica** vanno tolti tutti e due,
  se no anche fantatitano.site/gioco resterebbe fuori dai motori di ricerca.
- **Dentro l'app per iPhone.** Alex, 17/11: dall'app dell'App Store il gioco deve aprirsi dentro l'app, non nel
  browser. L'app carica fantatitano.site, quindi fantatitano.site/gioco/ resta nella stessa finestra; la PR #114
  lascia anche i link universali su /gioco (un link toccato fuori apre l'app). Nell'app non c'è la barra del browser:
  quando il gioco gira sotto /gioco/ la schermata iniziale mostra «‹ Fantatitano», che riporta all'app
  (`public/casa.js`). Sul deploy di prova non compare.

- **Prove.** Quelle automatiche sono fatte in un browser senza scheda grafica; Alex l'ha provato sul
  suo telefono e funziona. Su altri telefoni la fluidità è da verificare: se scatta, abbassare ancora il
  numero di triangoli dei tre livelli (`LOD` in `scripts/blender/calciatore.py`) o avvicinare le soglie `LOD` in `src/config.js`.
- **Livello degli avversari** tarato solo con partite simulate (`DIFF` in cima a `src/game.js`):
  `node scripts/simula.cjs 64` dopo `npm run build`. Con la squadra di casa che gioca da sola, oggi
  finisce in media 2,4-0,5 a facile, 1,0-0,8 a normale, 0,6-1,2 a difficile, con uno o due falli,
  due cross e meno di un angolo a partita, e un rigore ogni cinque partite circa.
- **IA col pallone e pressing** (`TENUTA` e `PRESSING` in `src/game.js`). Il portatore passa solo se il compagno sta meglio di
  lui di una soglia (regola presa da GameplayFootball, `elizacontroller.cpp`), altrimenti conduce. Dopo lo stop aspetta 1-2 s
  e passa di prima solo verso chi è davvero libero; negli ultimi 28 metri decide in fretta. Senza palla si pressa fino a
  18 m oltre la metà campo, e il secondo uomo raddoppia quando il primo è sul portatore (come Kickoff di Yuka). Su 8
  partite a normale, prima e dopo: tenuta palla 0,43→0,94 s, contrasti vinti 0,25→6,8, falli 0→0,8, portatore libero
  55→33%, tiri 8,9→8,8. Si misura con `npm run partite` (le misure fuori obiettivo sono segnate con ✗).
  Passaggi riusciti 58→73% dopo aver tolto un difetto: col gesto caricato il calcio parte qualche fotogramma dopo la
  decisione e il pallone appena calciato riceveva ancora un tocco di conduzione dal passatore (finiva lento e di lato).
  Se al momento del calcio c'è un avversario addosso sulla traiettoria, l'IA cambia compagno o alza un pallonetto corto.
- **Calci piazzati dal gioco e fuorigioco** (`CALCI` in `src/game.js`). Il difensore che in area devia un pallone degli
  avversari spesso lo manda in angolo, di testa con l'attaccante addosso anche; la respinta del portiere può finire in
  angolo. Un attaccante su tre ogni tanto resta oltre la linea di un metro o due e chi passa non vede il fuorigioco di poco.
  Su 8 partite a normale (4 minuti di gioco l'una): 1,4 angoli, 0,13 fuorigioco, 4,4 rimesse laterali, 1,1 dal fondo.
- **Piedi piantati** (`src/grafica/piedi.js`). Quando un piede tocca terra resta fermo dov'è sceso e la gamba si piega
  (cinematica inversa a due ossa) finché l'animazione non lo rialza; se l'animazione lo porta più lontano di 28 cm, il punto
  si fa trascinare invece di staccarsi di colpo. Piede in appoggio che scivola, mediana: camminata 0,94→0,50 m/s, corsetta
  0,88→0,43, corsa 0,76→0,37, durante i gesti 3,95→1,92. Scatti della posa invariati (meno di uno su mille fotogrammi).
  Costa circa mezzo millisecondo a fotogramma; dal livello di qualità 2 si spegne (`G.senzaPiedi`).
- **Movimenti senza palla** (`movimento` e `MOVI` in `src/game.js`, clip `parte_*`, `inverti_*`, `frena_scatto` da
  GameplayFootball). Chi parte da fermo verso una direzione girata (45°, 90°, 135°, 180°) fa la partenza col perno, chi
  inverte la corsa pianta il piede e si gira, chi smette di scattare frena a passi corti; il corpo gira insieme al gesto e
  poi aspetta che il corpo fisico lo raggiunga. In corsa il gesto parte solo col piede giusto a terra (`appoggio`, misurato
  dal convertitore), entra più piano ed esce più svelto degli altri gesti. Solo grafica: le regole non cambiano, ma la posa
  delle mani del portiere e di chi batte la rimessa si legge dallo scheletro, quindi a parità di seme la partita prende
  presto un'altra strada. Su 90 s di gioco: piede che scivola (mediana) camminata 0,55→0,38 m/s, corsetta 0,49→0,42,
  corsa e scatto invariate (0,36-0,38); scatti della posa circa 1 per mille fotogrammi come prima.
- **Portiere col pallone** (`MANO`, `presaPortiere` in `src/game.js`). Con il pallone in mano le braccia lo tengono al petto
  (dalla clip `tiene_palla` di GameplayFootball solo braccia e spalle, sopra la corsa normale: le clip intere col pallone
  sono un passo solo e non si ripetono bene); dopo una presa in tuffo si rialza col pallone stretto (`rialza_palla`); le
  prese senza parata preparata (cross, tiro addosso) scelgono la clip per altezza: terra, ginocchio, busto, alta.
  Tuffi già in sei zone (terra, mezza altezza, vicino/lontano, busto, alto) e rinvio con le mani o di collo.
- **Dashboard** (`drawHub` in `src/casa/casa.js`, CSS «Dashboard» in `src/casa/casa.css`). Impaginazione dal disegno di Alex
  (20/11/2026) con i colori Fantatitano: a sinistra il campionato alto (prossima partita, maglia grande, matchday, ultimi
  risultati), al centro classifica, la sagoma del Titano sopra lo stadio 3D e le coppe, a destra squadra, mercato, sfide
  e club. I ritratti (mister e capitano) li disegna `ritratto()` dal modello 3D del gioco, una volta sola. Le misure sono
  in px per un telefono in orizzontale; sugli schermi più grandi tutto si ingrandisce con `zoom` (`--zh`).
- **Misure vere e telecamera di gioco** (20/11/2026, su misure prese da Alex). Campo 105 × 68 con aree, dischetto e cerchio
  regolamentari (`LINEE`), porta 7,32 × 2,44, pallone di 22 cm, giocatori alti in media 1,80 m (da 1,70 a 1,95, `ALTEZZA` e
  `statura()`): prima il gioco era ingrandito (giocatori di 2,72 m, pallone di 52 cm, porta di 8,4 m). Con la statura sono
  cambiate le andature (`ANDATURE` in `src/fisica/corpo.js`, misurate per 1,80 m; la corsa gira al massimo a 1,6 volte, oltre
  il piede scivola un poco), le altezze del gioco aereo (`AIR`) e del portiere (`PARATA`), la gamba in scivolata e la distanza
  dei duelli. Le distanze di contrasto e conduzione erano già in metri veri e sono rimaste. La telecamera (`CAMERA`) sta 12,5 m
  sopra e 37 m dietro il punto inquadrato, inclinata di 21° e mai girata, con 56,8° in orizzontale su ogni schermo; segue
  il pallone per intero lungo il campo e al 45% in profondità. `node scripts/prove/inquadratura.cjs` misura il calcio
  d'inizio su 844 × 390 e lo confronta col riferimento (gira anche nella CI). Dopo il cambio: gol da circa 3 a 1,4 a
  partita e tiri da 9 a 6,4 su 16 partite, nessuna anomalia; il ritmo dei tiri e il portiere si tarano nei passi successivi.
- **Valori di gioco in un file solo** (`src/config.js`): campo, tempi, difficoltà, IA, comandi, portiere, riprese, fisica di
  pallone, giocatori e contrasti. `game.js` e `src/fisica/*` li importano da lì (i moduli di fisica li riesportano). I numeri
  ancora scritti dentro le funzioni passano nel file man mano che si lavora su quella parte.
- **Partita «come Dream League»** (`docs/dls-gameplay.md`, numeri in `src/config.js`). Dai video di Alex: levetta a base
  fissa con lo scatto automatico al bordo, tre tasti con le scritte che cambiano col possesso (Calcio forte, Calcio basso,
  Calcio alto; senza palla scivolata, Pressing, Cambia giocatore), nome e segnalino sopra la testa con la barra della
  potenza, X gialla dove scende un pallone alto, telecamera fissa (12,5 m di altezza, 36,9 m in pianta, 21,3°, 28°, pallone al 40% dall'alto), tabellone in alto a sinistra,
  minimappa con la mentalità a frecce, replay dal pulsante in alto a destra, cronometro più lento a gioco fermo,
  conduzione a 4,5 m/s, 3-4 compagni in area quando si arriva al limite, portiere sulla linea che esce sul palo vicino,
  palle ferme con la scritta sotto il tabellone e il replay prima dell'angolo dopo una parata, sequenza del gol con
  rallentatore, arbitro che indica il centro e primo piano basso col difensore deluso davanti. L'energia non si vede in
  partita: sta nella schermata Sostituzioni (pausa), una barretta per giocatore.
- **Colori delle maglie** da `src/data.js` dell'app; il secondo colore è scelto a occhio dagli
  stemmi (`scripts/genera-dati.py`). Qualche divisa non combacia col suo stemma.
- **Nomi dei calciatori**: sono quelli del listone dell'app. Verificare che l'accordo con
  l'associazione calciatori copra anche un videogioco.
- `window.__g` espone lo stato per le prove: `__g.G.auto = true` fa giocare da sola anche la
  squadra dell'utente; `__g.step(1/60)` fa avanzare la simulazione senza disegnare.
- **Le clip Mixamo non si copiano così come sono.** Il calciatore ha un altro scheletro (nomi e assi delle
  ossa diversi): `scripts/animazioni.mjs` applica ogni clip al manichino sorgente, legge di quanto ogni osso
  è ruotato nel mondo rispetto alla posa a T e applica la stessa rotazione all'osso corrispondente del
  calciatore. Nei file di Mixamo ogni osso compare due volte con lo stesso nome: conta quello esterno.
- **Controllare una clip a occhio**: `node scripts/prove/fotogrammi.cjs <cartella> <clip>…` salva sei pose per clip.
- **Rigenerare in ordine.** Se cambia la forma del corpo: Blender (`scripts/blender/calciatore.py`, comando in
  `modelli/mpfb/LEGGIMI.md`), copiare l'uscita in `modelli/mpfb/blender/`, poi `npm run modello` (assembla sullo scheletro del
  gioco, rifà maschera e pelle, comprime). Le animazioni non vanno rifatte: lo scheletro ha gli stessi nomi e le stesse
  rotazioni a riposo di prima, cambiano solo le posizioni delle giunture.
- **Il repository resta privato**: `modelli/animazioni-base.glb` e le clip vengono da Mixamo.
- Lo spostamento orizzontale del bacino viene tolto dalle clip: a muovere il giocatore è il motore.
- Il mixer di three.js non riscrive un osso se la posa non è cambiata: i ritocchi a codice vanno
  tolti a ogni fotogramma prima di `mixer.update` (lo fa `f.saved`), se no si accumulano.
