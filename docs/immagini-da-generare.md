# Immagini da generare (e icone già pronte)

Metodo fisso del prompt del 21/11/2026, §12. Tre famiglie di immagini, ognuna col suo modo di nascere:

| Famiglia | Come nasce | Chi la fa |
|---|---|---|
| **Ritratti, avatar, anteprime delle divise** | render in Blender dai modelli MPFB, con `scripts/blender/render_ritratti.py` | Claude, quando l'altra sessione ha preparato i modelli; intanto segnaposto |
| **Illustrazioni** (sfondi, coppe, Tre Torri, banner, stadio) | generate da Alex coi prompt qui sotto | Alex le mette in `assets/arrivo/`, lo script le importa |
| **Icone e cornici** | SVG con uno stile solo, da `scripts/icone.mjs` | fatte (§3) |

Niente è disegnato col codice al posto di un'illustrazione e niente viene da internet o da altri giochi.

## 1. Come si consegnano le illustrazioni

1. Genera l'immagine col prompt della tabella. Se il generatore non fa la misura esatta va bene una più grande con lo
   stesso rapporto; fino al 15% di differenza nel rapporto la ritaglio al centro.
2. Salvala in `assets/arrivo/` col **nome esatto** della tabella (esempio `sfondo-home.png`). PNG o JPG; PNG con sfondo
   trasparente dove è scritto «trasparente».
3. `python3 scripts/importa_immagini.py` controlla nome, misure e trasparenza, prepara le tre grandezze (1x, 2x, 3x) in
   WebP dentro `public/img/illustrazioni/` e le collega (scrive l'elenco in `src/casa/illustrazioni.js`): il gioco usa
   l'immagine se c'è, il segnaposto se manca.
4. `python3 scripts/importa_immagini.py stato` dice quali sono definitive e quali ancora segnaposto.

Se il generatore non sa fare lo sfondo trasparente: sfondo **blu notte uniforme `#0B1530`**, senza sfumature, e dimmelo.

Frase da aggiungere **in fondo a ogni prompt** (stile comune):

> Illustrazione realistica-illustrata per un videogioco di calcio, scena notturna, colori dominanti blu notte e oro con
> accenti azzurri, luce calda dorata da sinistra e controluce azzurra, atmosfera di San Marino. Nessun testo, nessuna
> scritta, nessun numero, nessun logo, nessun marchio, nessuna persona riconoscibile.

## 2. Elenco

Priorità: **A** serve alla home, **B** alle sezioni, **C** facoltativa (senza, resta un fondo pulito). Misure in pixel.
Stato di tutte, oggi: **segnaposto**.

| # | File | Dove si usa | Misure | Formato | Pr. |
|---|---|---|---|---|---|
| 1 | `sfondo-home` | sfondo della home e, scurito, di tutte le sezioni | 2796 × 1290 | JPG o PNG | A |
| 2 | `trofeo-campionato` | carta Carriera, classifica, fine stagione | 1024 × 1024 | PNG trasparente | A |
| 3 | `coppa-titano` | carta Carriera, tabellone della Coppa Titano, Sfida | 1024 × 1024 | PNG trasparente | A |
| 4 | `trofeo-castelli` | carta Carriera, gironi del Trofeo dei Castelli, Sfida | 1024 × 1024 | PNG trasparente | A |
| 5 | `carta-scenario` | fondo della carta SCENARIO | 900 × 510 | JPG o PNG | A |
| 6 | `carta-percorso` | fondo della carta PERCORSO PREMI | 1800 × 510 | JPG o PNG | A |
| 7 | `carta-amichevole` | fondo della carta AMICHEVOLE | 900 × 510 | JPG o PNG | A |
| 8 | `sfondo-sfida` | sfondo della Sfida (prima della partita) | 2796 × 1290 | JPG o PNG | B |
| 9 | `tre-torri` | decorazione: Benvenuto, Profilo, fine stagione | 1800 × 900 | PNG trasparente | B |
| 10 | `stadio-alto` | Il mio club, carta Stadio e strutture | 1800 × 1200 | JPG o PNG | B |
| 11 | `struttura-allenamento` | struttura Centro allenamento | 600 × 600 | JPG o PNG | B |
| 12 | `struttura-infermeria` | struttura Infermeria | 600 × 600 | JPG o PNG | B |
| 13 | `struttura-foresteria` | struttura Foresteria | 600 × 600 | JPG o PNG | B |
| 14 | `struttura-ufficio` | struttura Ufficio commerciale | 600 × 600 | JPG o PNG | B |
| 15 | `struttura-osservatori` | struttura Osservatori | 600 × 600 | JPG o PNG | B |
| 16 | `struttura-curva` | struttura Curva dei tifosi | 600 × 600 | JPG o PNG | B |
| 17 | `evento-scelte` | Mercato, carta evento «Scelte migliori» | 1200 × 360 | JPG o PNG | B |
| 18 | `evento-occasioni` | Mercato, carta evento «Occasioni della settimana» | 1200 × 360 | JPG o PNG | B |
| 19 | `premio-monete` | Percorso premi e Sfide: premio in monete | 512 × 512 | PNG trasparente | B |
| 20 | `premio-diamanti` | Percorso premi e Sfide: premio in diamanti | 512 × 512 | PNG trasparente | B |
| 21 | `carta-carriera` | fondo della carta CARRIERA | 1800 × 510 | JPG o PNG | C |
| 22 | `allenamento-tutorial` | Allenamento, carta Tutorial | 600 × 400 | JPG o PNG | C |
| 23 | `allenamento-libero` | Allenamento, carta Allenamento libero | 600 × 400 | JPG o PNG | C |
| 24 | `allenamento-rigori` | Allenamento, carta Rigori | 600 × 400 | JPG o PNG | C |
| 25 | `allenamento-punizioni` | Allenamento, carta Calci di punizione | 600 × 400 | JPG o PNG | C |
| 26 | `allenamento-angoli` | Allenamento, carta Calci d'angolo | 600 × 400 | JPG o PNG | C |

### Descrizioni e prompt pronti

Ogni prompt va seguito dalla frase dello stile comune (§1).

**1. `sfondo-home`** — panorama notturno di San Marino con uno stadio nella valle. Sopra ci vanno la barra e otto carte
semitrasparenti: deve essere scuro e tranquillo, coi punti luminosi al centro.
> Panorama notturno molto largo del Monte Titano: sulla rupe a sinistra del centro una torre medievale di pietra con le
> merlature, illuminata da luce calda; nella valle a destra del centro uno stadio di calcio ovale illuminato, col tetto
> azzurro e quattro torri faro; nebbia leggera e luci lontane della città nella valle; cielo blu notte con poche stelle
> nella fascia in alto, terreno scuro nella fascia in basso. Immagine scura e poco contrastata, soggetti al centro, bordi
> laterali vuoti con solo cielo e colline. Formato orizzontale 2,17:1.

**2. `trofeo-campionato`** — il trofeo del campionato, da solo.
> Trofeo di calcio d'oro lucido, a forma di coppa alta con due manici e base di marmo blu scuro, un piccolo scudo liscio
> senza scritte sul davanti, riflessi azzurri sul metallo. Oggetto intero al centro, visto di fronte leggermente dal
> basso, sfondo trasparente.

**3. `coppa-titano`** — la coppa della Coppa Titano, diversa dalla prima: più larga e bassa.
> Coppa di calcio d'argento e oro, larga e bassa, a calice aperto con due grandi manici curvi, fascia dorata incisa a
> motivi geometrici, base ottagonale di pietra scura. Oggetto intero al centro, visto di fronte, sfondo trasparente.

**4. `trofeo-castelli`** — il Trofeo dei Castelli: tre torri invece della coppa.
> Trofeo d'oro formato da tre torri medievali merlate affiancate su una roccia stilizzata, la torre centrale più alta,
> base rotonda di marmo blu scuro, riflessi azzurri. Oggetto intero al centro, visto di fronte, sfondo trasparente.

**5. `carta-scenario`** — tensione da rimonta. Fascia rossa scura sopra, testo bianco a sinistra: soggetto a destra.
> Tabellone luminoso di uno stadio visto di sbieco nella notte, con pannelli accesi ma illeggibili, bagliore rosso
> scuro e fumo leggero, tribune buie sullo sfondo. Soggetto nella metà destra, metà sinistra scura e vuota.

**6. `carta-percorso`** — un percorso di premi che sale. Sopra ci vanno livello, barra e premio: fondo calmo.
> Sentiero di pietra illuminato da lanterne dorate che sale lungo il fianco di un monte verso una torre lontana, di
> notte, con piccoli forzieri chiusi lungo il sentiero. Molto largo, soggetti piccoli nella metà destra, metà sinistra
> scura e vuota. Formato orizzontale 3,5:1.

**7. `carta-amichevole`** — campo d'allenamento, atmosfera rilassata.
> Campo da calcio di periferia di sera, visto da bordo campo: erba, una porta, un pallone fermo vicino alla linea, due
> lampioni accesi, colline sullo sfondo. Soggetto nella metà destra, metà sinistra scura e vuota.

**8. `sfondo-sfida`** — l'interno dello stadio prima del fischio d'inizio. Sopra ci vanno due campi con le formazioni.
> Interno di uno stadio di calcio di notte visto dall'alto della tribuna centrale: tribune piene sfocate, torri faro
> accese con aloni, campo appena visibile in basso. Immagine scura, sfocata e poco contrastata, senza dettagli nitidi al
> centro. Formato orizzontale 2,17:1.

**9. `tre-torri`** — le tre torri sul crinale, come sagoma decorativa.
> Le tre torri medievali sul crinale roccioso del Monte Titano viste di lato, illuminate da luce calda dal basso,
> sagoma netta del crinale, niente cielo. Sfondo trasparente. Formato orizzontale 2:1.

**10. `stadio-alto`** — lo stadio del club visto dall'alto, come in un plastico.
> Piccolo stadio di calcio visto dall'alto a tre quarti, di notte: campo verde illuminato, due tribune coperte col tetto
> azzurro, due curve scoperte, quattro torri faro accese, parcheggio e alberi intorno, colline scure. Stadio intero
> dentro l'immagine, con margine attorno. Formato 3:2.

**11–16. Strutture del club** — sei edifici nello stesso stile, visti a tre quarti dall'alto, uno per immagine, quadrati.
> 11 `struttura-allenamento`: Centro di allenamento di una squadra di calcio di notte: campetto con coni e porticine,
> piccola palazzina moderna illuminata. Vista a tre quarti dall'alto, edificio intero al centro.
>
> 12 `struttura-infermeria`: Piccola palazzina medica di un club di calcio di notte, con una croce luminosa azzurra
> sulla facciata e un lettino da massaggi visibile dalla vetrata. Vista a tre quarti dall'alto, edificio intero al centro.
>
> 13 `struttura-foresteria`: Foresteria di un club di calcio di notte: palazzina a due piani con finestre accese di luce
> calda e un piccolo giardino. Vista a tre quarti dall'alto, edificio intero al centro.
>
> 14 `struttura-ufficio`: Palazzina di uffici moderna di un club di calcio di notte, con vetrate illuminate e cartelloni
> pubblicitari vuoti davanti. Vista a tre quarti dall'alto, edificio intero al centro.
>
> 15 `struttura-osservatori`: Torretta di osservazione con una grande vetrata e un cannocchiale, accanto a un campo da
> calcio, di notte. Vista a tre quarti dall'alto, edificio intero al centro.
>
> 16 `struttura-curva`: Curva di uno stadio di calcio piena di tifosi sfocati con bandiere blu e oro e fumogeni dorati,
> di notte. Vista a tre quarti dall'alto, tribuna intera al centro.

**17. `evento-scelte`** e **18. `evento-occasioni`** — striscioni del mercato. Sopra ci vanno titolo, timer e carte.
> 17: Tavolo di un direttore sportivo di notte, con una lavagna tattica, fascicoli chiusi e una lampada dorata accesa.
> Striscia molto larga, soggetto a destra, sinistra scura e vuota. Formato orizzontale 3,3:1.
>
> 18: Corridoio degli spogliatoi di uno stadio di notte, con maglie blu e oro senza numeri appese in fila e luce
> azzurra in fondo. Striscia molto larga, soggetto a destra, sinistra scura e vuota. Formato orizzontale 3,3:1.

**19. `premio-monete`** e **20. `premio-diamanti`** — i due forzieri dei premi.
> 19: Forziere di legno scuro e ferro aperto, pieno di monete d'oro che brillano. Oggetto intero al centro, sfondo
> trasparente.
>
> 20: Scrigno blu scuro con bordi dorati aperto, pieno di diamanti azzurri che brillano. Oggetto intero al centro,
> sfondo trasparente.

**21. `carta-carriera`** (facoltativa) — fondo della carta più grande della home.
> Tunnel d'ingresso di uno stadio visto da dentro, di notte: in fondo il campo illuminato e le tribune, pareti scure ai
> lati con riflessi dorati. Molto largo, soggetto nella metà destra, sinistra scura e vuota. Formato orizzontale 3,5:1.

**22–26. Allenamento** (facoltative) — cinque scene dello stesso campo d'allenamento, di sera.
> 22 `allenamento-tutorial`: Lavagna tattica su un cavalletto a bordo campo, con frecce e cerchi disegnati col gesso.
>
> 23 `allenamento-libero`: Campo d'allenamento vuoto con molti palloni sparsi e coni arancioni.
>
> 24 `allenamento-rigori`: Pallone fermo sul dischetto del rigore, porta vuota di fronte, vista bassa da dietro il pallone.
>
> 25 `allenamento-punizioni`: Pallone fermo fuori area davanti a una barriera di sagome d'allenamento gialle, porta sullo sfondo.
>
> 26 `allenamento-angoli`: Pallone fermo accanto alla bandierina del calcio d'angolo, porta e area sullo sfondo.

## 3. Icone e cornici (fatte)

`node scripts/icone.mjs` scrive un file per icona in `public/img/icone/` e il foglio unico `public/img/icone.svg`.
Stile: griglia di 24, tratto di 1,8, estremi tondi, colore del testo (bianco, oro o azzurro secondo dove sta). Moneta e
diamante hanno colori fissi e sono identici ovunque.

| Gruppo | Icone |
|---|---|
| Barra e comandi | home, indietro, avanti (»), impostazioni, info, piu, chiudi, spunta, avviso, lucchetto, orologio, stella, stella-vuota, manager |
| Valute | moneta, diamante |
| Sezioni | carriera, scenario, percorso-premi, amichevole, sfide, squadra, mercato, club, stadio, personalizza, allenamento, negozio |
| Competizioni | campionato, coppa, castelli |
| Squadra | modulo, riserve, fisioterapista, allenatore, capitano, rigore, punizione, corner, energia, scarpino, altezza, scambia, vendi, fuori-ruolo |
| Mercato e strutture | osservatore, mistero, centro-allenamento, infermeria, foresteria, ufficio, osservatori, curva, divisa, stemma, esultanza, pallone |
| Sfide e meteo | calendario, medaglia, premi, timer, sole, luna, nuvola, pioggia |
| Cornici delle carte | carta-bronzo (sotto 65), carta-argento (65–74), carta-oro (da 75): la stessa forma a scudo |
| Segnaposto dei ritratti | segnaposto-giocatore, segnaposto-manager |

Icone piccole delle competizioni (campionato, coppa, castelli) sono SVG; le coppe grandi sono le illustrazioni 2, 3 e 4.

## 4. Logo

`public/img/logo-fantatitano.png`: il file ufficiale (corona lime e scritta FANTATITANO) **ritagliato** sopra la riga
«PLAY · MANAGE · BELONG», senza ridisegnare niente. Il file intero resta in `public/img/corona-lime.png` (lo usa ancora
la partita per lo stacco e i cartelloni).

## 5. Ritratti e avatar dai modelli 3D (da fare quando ci sono i modelli)

`scripts/blender/render_ritratti.py` (da scrivere): busto di tre quarti, stessa camera e stessa luce per tutti (calda da
sinistra, controluce azzurra), sfondo trasparente, PNG 512 × 512 poi WebP.
- Giocatori: un ritratto per giocatore, dai modelli MPFB dell'altra sessione, con la divisa del club.
- Manager: almeno 12 allenatori diversi per età (30–65), pelle, capelli, barba, occhiali; giacca, polo, felpa o tuta nei
  colori del club. Nessuna faccia somigliante a persone reali.
- Anteprime delle divise per Personalizza e Negozio.

Oggi i ritratti sono quelli che il gioco disegna da sé coi modelli che ha (carta Squadra e avatar); dove mancano si usa
`segnaposto-giocatore` o `segnaposto-manager`.
