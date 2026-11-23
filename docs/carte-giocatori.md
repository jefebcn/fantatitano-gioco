# Carte dei giocatori

La carta è la **proposta «A»** approvata da Alex il 23/11: l'immagine di riferimento è
`docs/riferimenti/carta-proposta-A.jpg`. Della disposizione di Dream League si riprende solo l'idea (valutazione e ruolo
in alto a sinistra, giocatore grande, fascia col nome, tre statistiche): colori, caratteri e ritratti sono di
Fantatitano (regola del progetto: meccaniche sì, grafica e file di altri giochi mai).

## Dove stanno le misure
Tutte in `CARTA` (`src/config.js`), in parti della larghezza W della carta o, dove è scritto, dell'altezza H (H = 1,38 W).
`src/casa/giocatore.js` le passa allo stile come variabili (`--c-…`): in `src/casa/stile.css` non ci sono numeri, solo
moltiplicazioni per la larghezza (`--gw`) o l'altezza (`--gh`) della carta. La struttura è in `cartaGiocatore`.

## Com'è fatta
- **Forma**: angoli tondi (0,12 W), sfumatura verticale nel colore della rarità, un filo chiaro dentro.
- **Rarità** (`CARTA.rarita`): **oro** da 70, **argento** da 55 a 69, **bronzo** sotto 55.
- **Valutazione** in Anton e **ruolo** in Bebas Neue in alto a sinistra, solo scritti, nel colore scuro della rarità. Chi
  gioca fuori ruolo ha il ruolo su fondo rosso. Niente stemma, niente riquadro dietro il ruolo.
- **Giocatore davanti**: il ritratto intero (`public/img/ritratti-carte/`), spostato a destra per non finire sotto la
  valutazione. Ai lati lo taglia la carta, in basso si ferma dove comincia la fascia del nome, in alto non è tagliato:
  **la testa esce sopra il bordo** di 0,05 H.
- **Fascia del nome** blu scuro, col cognome bianco in maiuscolo (Montserrat 800). «Az. Garcia Rufer» sulla carta è
  «GARCIA RUFER».
- **Energia**: una barretta sottile a cavallo del bordo basso della fascia (solo dove serve: Squadra e scheda).
- **Tre statistiche** in fondo, numero in Anton e sigla sotto, secondo il reparto (`CARTA.statistiche.per`): portieri
  riflessi, posizione, passaggio; difensori difesa, velocità, passaggio; centrocampisti passaggio, controllo,
  resistenza; attaccanti tiro, velocità, controllo.
- **Capitano e incarichi**: tondi in alto a destra, la «C» gialla e sotto rigori, punizioni e angoli; nella Squadra si
  trascinano su un altro titolare.
- **Chi è stato allenato** ha una piccola freccia verde sotto il ruolo.

## Cosa si vede a ogni larghezza
La carta è una sola; cosa mostra dipende da quanto è larga (lo decide `cartaGiocatore` dalla larghezza che riceve).
- **Da 64 punti in su** (`CARTA.stretta.sotto`): tutto, con le tre statistiche. Scheda del giocatore (il 40%
  dell'altezza dello schermo, al più 200 punti: da 150 a 172 sui telefoni), Mercato (90), riquadri della Home dove c'è posto.
- **Sotto i 64 punti**, la carta stretta: niente statistiche, la fascia del nome parte da 0,78 H e arriva in fondo, il
  cognome è più grande e l'energia sta sotto il cognome. Campo e sostituti della Squadra (il 5,5% della larghezza dello
  schermo: 37, 46 e 51 punti alle tre misure di iPhone), scelta del capitano (54).
- **Sotto i 36 punti** il ruolo non si mostra (si vede solo se è rosso, cioè fuori ruolo).
- **Carta piccola** dei campi stretti della Sfida (da 22 a 32 punti): stessi colori, stesso ritratto con la testa che
  esce, valutazione a 12 punti, niente ruolo (chi è fuori ruolo ha un triangolino rosso); energia e nome stanno sotto
  la carta, a 12-14 punti, perché dentro non si leggerebbero.

## Scelte fatte portandola nel gioco
- **Ritratto un po' più grande della proposta**: lato 1,113 W invece di 1,05. Con 1,05 la maglia finiva prima della
  fascia del nome e si vedeva il taglio (c'è anche nell'immagine di riferimento). La cima e il centro della testa sono
  gli stessi; la testa è larga 0,445 W invece di 0,42. Nella carta stretta, dove la fascia parte più in basso, il
  ritratto è 1,232 W per lo stesso motivo.
- **Cognomi lunghi**: il carattere si rimpicciolisce fino a 0,085 W (mai sotto i 5 punti sullo schermo), poi le lettere
  si stringono fino all'80%, e solo dopo arrivano i puntini. Coi cognomi più lunghi dei dati (Scognamiglio,
  Pyantkivskyi, Mazzavillani, Colagiovanni, Garcia Rufer) i puntini compaiono solo sulle carte da 37 punti del telefono
  più piccolo, e solo per Scognamiglio e Colagiovanni.
- **Teste e carte vicine**: sul campo chi sta più in basso sta davanti; nei moduli con cinque linee le carte del campo
  si stringono di un punto o due (`SQUADRA.aria`) perché la testa non copra la carta della linea sopra.
- **Home**: la carta entra intera nel riquadro, testa compresa. Dove di fianco restano almeno 110 punti per titolo e
  testo è alta quanto tutto il riquadro (circa 70 punti di larghezza, con le statistiche); sul telefono più stretto sta
  sotto il titolo (48 punti, senza statistiche).
- **Liste**: la proposta diceva 100-120 punti. Nel Mercato la carta è larga 90, perché su uno schermo alto 390 punti con
  100-120 si vedrebbe una riga sola; i sostituti restano grandi come le carte in campo, come nell'immagine.
- **Ritratto mancante**: se il file non c'è resta il ritratto vecchio, ripreso dal modello 3D: sta tutto dentro la carta,
  a destra della valutazione.

## Scritte sotto i 12 punti: l'unica eccezione
Dentro la carta tutto è in proporzione alla larghezza, scritte comprese: è la sola eccezione alla regola dei 12 punti
(decisa il 22/11 e confermata con la proposta «A»). Anche lì non si scende sotto i 5 punti. `scripts/prove/schermate.cjs`
conosce l'eccezione; nella carta piccola della Sfida, col nome fuori, valgono i 12 punti.

## Storia
- 22/11: prima carta grande, sulle misure di una foto di riferimento di Alex (cornice a scudo, cerchio della
  valutazione, riga con stemma, energia e ruolo).
- 23/11: rarità per colore (bronzo, azzurro poi argento, oro); ritratti nuovi interi (`docs/ritratti.md`).
- 23/11 sera: proposta «A», questa.
