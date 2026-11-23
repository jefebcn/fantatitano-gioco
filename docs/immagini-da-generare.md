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
2. Salvala in `assets/arrivo/` col **nome esatto** della tabella (esempio `sfondo-home.png`); va bene anche una
   sottocartella, come `assets/arrivo/premi/`. PNG o JPG; PNG con sfondo trasparente dove è scritto «trasparente».
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
Stato, oggi: **tutte e 38 definitive**. Le dodici dell'apertura premi (27–38) sono arrivate il 23/11 in
`assets/arrivo/premi/`; le altre ventiquattro (1–18 e 21–26) lo stesso giorno in `assets/arrivo/menu/`; la 19 e la 20
usano `icona-monete` e `icona-diamanti`. Dove si vede ognuna nel gioco è scritto in `docs/stato-lavori.md`
(«Illustrazioni nelle schermate»).

| # | File | Dove si usa | Misure | Formato | Pr. |
|---|---|---|---|---|---|
| 1 | `sfondo-home` | sfondo della home e, scurito, di tutte le sezioni | 3840 × 1800 (se è più piccola viene ingrandita) | JPG o PNG | A |
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
| 19 | `premio-monete` | Percorso premi e Sfide: premio in monete | non si genera: usa `icona-monete` (32) | | B |
| 20 | `premio-diamanti` | Percorso premi e Sfide: premio in diamanti | non si genera: usa `icona-diamanti` (33) | | B |
| 21 | `carta-carriera` | fondo della carta CARRIERA | 1800 × 510 | JPG o PNG | C |
| 22 | `allenamento-tutorial` | Allenamento, carta Tutorial | 600 × 400 | JPG o PNG | C |
| 23 | `allenamento-libero` | Allenamento, carta Allenamento libero | 600 × 400 | JPG o PNG | C |
| 24 | `allenamento-rigori` | Allenamento, carta Rigori | 600 × 400 | JPG o PNG | C |
| 25 | `allenamento-punizioni` | Allenamento, carta Calci di punizione | 600 × 400 | JPG o PNG | C |
| 26 | `allenamento-angoli` | Allenamento, carta Calci d'angolo | 600 × 400 | JPG o PNG | C |
| 27 | `busta-giorno` | apertura premi: busta blu, premio del giorno e sfide | 417 × 666 (solo la busta, senza margine) | PNG trasparente | B |
| 28 | `busta-percorso` | apertura premi: busta argento, percorso premi | 417 × 666 | PNG trasparente | B |
| 29 | `busta-stagione` | apertura premi: busta oro, fine stagione | 417 × 666 | PNG trasparente | B |
| 30 | `sfondo-premi` | sfondo dell'apertura premi: stadio di notte sfocato | 1536 × 858 (se è più piccola viene ingrandita) | JPG o PNG | B |
| 31 | `icona-punti-percorso` | premio: punti del percorso premi | 512 × 512 | PNG trasparente | B |
| 32 | `icona-monete` | premio in monete (vale anche per la 19) | 512 × 512 | PNG trasparente | B |
| 33 | `icona-diamanti` | premio in diamanti (vale anche per la 20) | 512 × 512 | PNG trasparente | B |
| 34 | `icona-allenatore-comune` | premio: allenatore comune | 512 × 512 | PNG trasparente | B |
| 35 | `icona-allenatore-raro` | premio: allenatore raro | 512 × 512 | PNG trasparente | B |
| 36 | `icona-allenatore-leggendario` | premio: allenatore leggendario | 512 × 512 | PNG trasparente | B |
| 37 | `icona-contatto-agente` | premio: contatto dell'agente | 512 × 512 | PNG trasparente | B |
| 38 | `icona-fisioterapista` | premio: intervento del fisioterapista (pronta: oggi nessun premio lo dà) | 512 × 512 | PNG trasparente | B |

Le immagini dalla 27 alla 38, tranne lo sfondo, sono segnate «rifila» nell'elenco: lo script toglie il margine vuoto
attorno al soggetto e lo mette, intero e centrato, nella misura scritta. Le buste arrivate erano 687 × 1024 con la busta
vera di 418 × 669: a 3x si vedono nitide fino a 223 punti d'altezza, e nel gioco sono alte il 56% dello schermo (al
massimo 241 punti sull'iPhone più grande: un ingrandimento dell'8%, che non si nota).

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

**19. `premio-monete`** e **20. `premio-diamanti`** — i due forzieri dei premi. Non servono più: al loro posto valgono
`icona-monete` e `icona-diamanti` (decisione di Alex del 23/11). I prompt restano qui solo come traccia.
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

## 2b. Stemmi delle squadre inventate (60 riquadri, da generare)

Le sessanta squadre delle quattro divisioni sotto il Campionato Sammarinese oggi hanno uno stemma disegnato dal gioco coi
pezzi dello stemma (forma, simbolo, colori, sigla). Ognuna ha un riquadro pronto per uno stemma vero: quando il file
arriva, il gioco lo usa dappertutto (Home, Carriera, classifica, prepartita, partita) al posto di quello disegnato; finché
manca non cambia niente.

- **Misura**: 512 × 512, PNG con lo **sfondo trasparente**, lo stemma intero e centrato (il margine vuoto lo tolgo io).
- **Nome del file**: il nome della squadra. Vanno bene tutte e tre le scritture: `Real Acquaviva.png`,
  `real-acquaviva.png`, `stemma-real-acquaviva.png`.
- **Dove**: `assets/arrivo/` (anche in una sottocartella, per esempio `assets/arrivo/stemmi/`), poi
  `python3 scripts/importa_immagini.py`. `python3 scripts/importa_immagini.py stato` dice quanti ne mancano.
- **Colori**: quelli della tabella sono i colori della maglia della squadra: lo stemma deve usarli, se no in campo non
  si riconosce. La forma e il simbolo sono quelli dello stemma disegnato adesso: tenerli aiuta, non è obbligatorio.
- **Niente scritte né sigle** nello stemma (il nome lo scrive il gioco accanto), niente marchi veri, niente stemmi che
  somiglino a quelli di squadre vere.
- Se i nomi delle squadre cambiano (`src/dati/divisioni.js`): `node scripts/stemmi.mjs` riscrive i riquadri in
  `assets/immagini.json` e stampa questa tabella.

Prompt di base (cambiare forma, colori e simbolo):

> Stemma di una squadra di calcio di fantasia, vettoriale pulito, forma a [scudo], colori [rosso] e [bianco], al centro
> [una torre], bordo scuro sottile, leggera luce dall'alto, visto di fronte, centrato, sfondo trasparente. Nessun
> testo, nessuna lettera, nessun numero, nessun marchio vero.

| Squadra | Divisione | Nome del file | Colori | Forma e simbolo di adesso |
|---|---|---|---|---|
| Audace Fiorina | Serie Cadetta del Titano | `stemma-audace-fiorina.png` | giallo e blu scuro | stendardo, un pallone |
| Aurora Ventoso | Serie Cadetta del Titano | `stemma-aurora-ventoso.png` | nero e giallo oro | esagono, nessun simbolo |
| Borgo Antico | Serie Cadetta del Titano | `stemma-borgo-antico.png` | rosa e nero | rombo, una stella |
| Castellaro | Serie Cadetta del Titano | `stemma-castellaro.png` | celeste e blu scuro | esagono, nessun simbolo |
| Città Alta | Serie Cadetta del Titano | `stemma-citta-alta.png` | bianco e rosso | rombo, una torre |
| Gualdicciolo | Serie Cadetta del Titano | `stemma-gualdicciolo.png` | viola e bianco | tondo, nessun simbolo |
| La Serra | Serie Cadetta del Titano | `stemma-la-serra.png` | marrone e crema | esagono, una corona |
| Monte Cerreto | Serie Cadetta del Titano | `stemma-monte-cerreto.png` | verde oliva e giallo oro | stendardo, nessun simbolo |
| Montegiardino | Serie Cadetta del Titano | `stemma-montegiardino.png` | verde acqua e crema | scudo, un pallone |
| Real Acquaviva | Serie Cadetta del Titano | `stemma-real-acquaviva.png` | rosso e bianco | tondo, un pallone |
| Robur Rovereta | Serie Cadetta del Titano | `stemma-robur-rovereta.png` | verde e bianco | scudo, una torre |
| Stella Titano | Serie Cadetta del Titano | `stemma-stella-titano.png` | blu scuro e giallo | tondo, una stella |
| Torraccia | Serie Cadetta del Titano | `stemma-torraccia.png` | granata e oro chiaro | stendardo, una torre |
| Valdragone | Serie Cadetta del Titano | `stemma-valdragone.png` | arancione e nero | esagono, una stella |
| Vigor Falciano | Serie Cadetta del Titano | `stemma-vigor-falciano.png` | blu e bianco | esagono, una torre |
| Borgoloto | Lega delle Contrade | `stemma-borgoloto.png` | viola e bianco | scudo, un pallone |
| Cantone | Lega delle Contrade | `stemma-cantone.png` | celeste e blu scuro | stendardo, nessun simbolo |
| Collegio | Lega delle Contrade | `stemma-collegio.png` | verde e bianco | rombo, una corona |
| La Fratta | Lega delle Contrade | `stemma-la-fratta.png` | bianco e rosso | stendardo, un pallone |
| La Pieve | Lega delle Contrade | `stemma-la-pieve.png` | arancione e nero | stendardo, una stella |
| La Ripa | Lega delle Contrade | `stemma-la-ripa.png` | marrone e crema | stendardo, nessun simbolo |
| Le Mura | Lega delle Contrade | `stemma-le-mura.png` | giallo e blu scuro | scudo, un pallone |
| Le Piagge | Lega delle Contrade | `stemma-le-piagge.png` | blu scuro e giallo | scudo, una corona |
| Lo Stradone | Lega delle Contrade | `stemma-lo-stradone.png` | rosa e nero | stendardo, una corona |
| Magazzeni | Lega delle Contrade | `stemma-magazzeni.png` | granata e oro chiaro | scudo, una corona |
| Omerelli | Lega delle Contrade | `stemma-omerelli.png` | blu e bianco | scudo, una stella |
| Pianello | Lega delle Contrade | `stemma-pianello.png` | rosso e bianco | tondo, una corona |
| Portanova | Lega delle Contrade | `stemma-portanova.png` | verde acqua e crema | rombo, una torre |
| San Francesco | Lega delle Contrade | `stemma-san-francesco.png` | verde oliva e giallo oro | rombo, nessun simbolo |
| Santa Croce | Lega delle Contrade | `stemma-santa-croce.png` | nero e giallo oro | stendardo, una corona |
| Caladino | Lega dei Borghi | `stemma-caladino.png` | verde e bianco | scudo, una corona |
| Canepa | Lega dei Borghi | `stemma-canepa.png` | marrone e crema | scudo, un pallone |
| Casole | Lega dei Borghi | `stemma-casole.png` | rosso e bianco | stendardo, nessun simbolo |
| Cerbaiola | Lega dei Borghi | `stemma-cerbaiola.png` | bianco e rosso | esagono, un pallone |
| Cinque Vie | Lega dei Borghi | `stemma-cinque-vie.png` | celeste e blu scuro | tondo, nessun simbolo |
| Confine | Lega dei Borghi | `stemma-confine.png` | giallo e blu scuro | rombo, un pallone |
| Corianino | Lega dei Borghi | `stemma-corianino.png` | arancione e nero | scudo, una stella |
| Galavotto | Lega dei Borghi | `stemma-galavotto.png` | nero e giallo oro | esagono, nessun simbolo |
| Lesignano | Lega dei Borghi | `stemma-lesignano.png` | verde acqua e crema | tondo, una torre |
| Molarini | Lega dei Borghi | `stemma-molarini.png` | granata e oro chiaro | rombo, una corona |
| Piandivello | Lega dei Borghi | `stemma-piandivello.png` | viola e bianco | tondo, un pallone |
| Ponte Mellini | Lega dei Borghi | `stemma-ponte-mellini.png` | blu scuro e giallo | rombo, una stella |
| Seggiano | Lega dei Borghi | `stemma-seggiano.png` | rosa e nero | tondo, una stella |
| Spinaroti | Lega dei Borghi | `stemma-spinaroti.png` | verde oliva e giallo oro | scudo, nessun simbolo |
| Teglio | Lega dei Borghi | `stemma-teglio.png` | blu e bianco | stendardo, un pallone |
| Ca' Berlone | Lega Esordienti | `stemma-ca-berlone.png` | blu e bianco | scudo, nessun simbolo |
| Ca' Chiavello | Lega Esordienti | `stemma-ca-chiavello.png` | nero e giallo oro | esagono, una stella |
| Ca' Giannino | Lega Esordienti | `stemma-ca-giannino.png` | granata e oro chiaro | esagono, nessun simbolo |
| Ca' Martino | Lega Esordienti | `stemma-ca-martino.png` | arancione e nero | tondo, una corona |
| Ca' Melone | Lega Esordienti | `stemma-ca-melone.png` | verde e bianco | rombo, un pallone |
| Ca' Ragni | Lega Esordienti | `stemma-ca-ragni.png` | giallo e blu scuro | rombo, nessun simbolo |
| Ca' Rigo | Lega Esordienti | `stemma-ca-rigo.png` | rosso e bianco | esagono, nessun simbolo |
| Calligaria | Lega Esordienti | `stemma-calligaria.png` | bianco e rosso | rombo, una torre |
| Capanne | Lega Esordienti | `stemma-capanne.png` | celeste e blu scuro | tondo, un pallone |
| Casalino | Lega Esordienti | `stemma-casalino.png` | verde acqua e crema | esagono, una corona |
| Crociale | Lega Esordienti | `stemma-crociale.png` | blu scuro e giallo | rombo, una torre |
| Le Tane | Lega Esordienti | `stemma-le-tane.png` | verde oliva e giallo oro | tondo, un pallone |
| Montalbo | Lega Esordienti | `stemma-montalbo.png` | rosa e nero | rombo, una torre |
| Monte Pulito | Lega Esordienti | `stemma-monte-pulito.png` | viola e bianco | stendardo, una stella |
| Pianacci | Lega Esordienti | `stemma-pianacci.png` | marrone e crema | esagono, un pallone |

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
| Cornici delle carte | carta-bronzo (sotto 60), carta-azzurro (60–69), carta-oro (da 70): la stessa forma a scudo |
| Segnaposto dei ritratti | segnaposto-giocatore, segnaposto-manager |

Icone piccole delle competizioni (campionato, coppa, castelli) sono SVG; le coppe grandi sono le illustrazioni 2, 3 e 4.

## 4. Logo

`public/img/logo-fantatitano.png`: solo la corona gialla, senza scritte, su trasparente (scelta di Alex del 21/11: corona
gialla su fondo nero). Il disegno è quello del file che ha mandato Alex (controllato: è lo stesso della corona del file
ufficiale, a meno dell'1% dei punti), nel giallo del file ufficiale (`#D9F51F`), senza ridisegnare niente. È l'unico
logo del progetto: lo usano la schermata iniziale e lo stacco del replay. Il file con le scritte
(`corona-lime.png`) è stato tolto. Le icone dell'app (`public/icona-192.png`, `public/icona-512.png`) sono la stessa
corona su nero.

## 5. Ritratti e avatar dai modelli 3D (da fare quando ci sono i modelli)

`scripts/blender/render_ritratti.py` (da scrivere): busto di tre quarti, stessa camera e stessa luce per tutti (calda da
sinistra, controluce azzurra), sfondo trasparente, PNG 512 × 512 poi WebP.
- Giocatori: un ritratto per giocatore, dai modelli MPFB dell'altra sessione, con la divisa del club.
- Manager: almeno 12 allenatori diversi per età (30–65), pelle, capelli, barba, occhiali; giacca, polo, felpa o tuta nei
  colori del club. Nessuna faccia somigliante a persone reali.
- Anteprime delle divise per Personalizza e Negozio.

Oggi i ritratti sono quelli che il gioco disegna da sé coi modelli che ha (carta Squadra e avatar); dove mancano si usa
`segnaposto-giocatore` o `segnaposto-manager`.
