# Carte dei giocatori

Il 22/11 Alex ha mandato una foto di riferimento della schermata della squadra e ha chiesto che **struttura e misure
delle carte e dei volti nelle carte siano identiche**. Qui ci sono le misure prese dalla foto e come sono state portate
nel gioco. Di quella foto si riprendono solo proporzioni e disposizione: cornici, colori, caratteri, ritratti e stemmi
sono di Fantatitano (regola del progetto: meccaniche sì, grafica e file di altri giochi mai).

## Misure prese dalla foto (in parti della carta)
La carta è larga 0,737 volte la sua altezza. Larghezze in percento della larghezza, altezze in percento dell'altezza.

| Parte | Misura |
|---|---|
| Cornice | lato alto appena ad arco, spalle tonde al 9% dell'altezza, fianchi dritti, punta nell'ultimo 16% |
| Cerchio della valutazione | centro al 22% di lato e al 21% dall'alto, largo il 32%, anello scuro del 2,7%, numero bianco alto circa il 15% |
| Ritratto | riquadro dal 35% al 97,5% di lato e dal 3% al 58,7% dall'alto; la testa (orecchie comprese) è larga il 63% del riquadro, i capelli partono in cima, il mento è all'82% dell'altezza, sotto si vedono collo e maglia |
| Fascia del nome | dal 58,7% al 71,8% (alta il 13%), più chiara della carta, nome scuro in maiuscolo al centro |
| Riga in basso | dal 73,5% all'84% (alta il 10,4%): bandiera 21,8% di larghezza, energia 39,3% con un lampo al centro, ruolo 21,8% |
| Punta | stellina al centro per chi è migliorato |
| Segni | capitano e incarichi in colonna fuori dalla carta, a destra, dall'alto |

Colori che fanno parte della struttura: il cerchio della valutazione cambia colore col numero; il ruolo ha un colore per
reparto.

## Come è nel gioco
- **Cornice**: `scripts/icone.mjs` (`sagomaCarta`), tre fasce (bronzo sotto 65, argento-azzurro da 65 a 74, oro da 75).
- **Forma**: `CARTA_GRANDE.forma` in `src/config.js` (0,737); le altre proporzioni sono nello stile, `src/casa/stile.css`
  (`.gC.grande`), e la struttura in `src/casa/giocatore.js` (`cartaCampo`).
- **Cerchio**: rosso, giallo o verde con le stesse soglie delle statistiche (`SCALA.colori`: sotto 60, da 60, da 72).
- **Ritratto**: ritaglio `carta` di `RITRATTI.taglio` (per la scheda `scheda`, dal file grande).
- **Al posto della bandiera** c'è lo stemma del club: i giocatori non hanno una nazionalità nei dati.
- **Ruolo**: rosa gli attaccanti, giallo i centrocampisti, verde i difensori, azzurro i portieri.
- **Carta mini** (Home): stessa cornice, cerchio e ritratto negli stessi punti, senza nome e senza riga.
- **Carta piccola** dei campi stretti (Sfida): resta com'era, con energia e nome sotto lo scudo; cambia solo il cerchio.

## Scritte sotto i 12 px: l'unica eccezione
Nella foto le scritte delle carte in campo sono molto piccole. Una prima versione teneva nome, ruolo e numero a 12 px
(la regola di qualità del progetto): fascia e riga diventavano più alte, il cerchio più grande e il viso più piccolo, e la
carta non somigliava più alla foto. Alex ha lasciato la scelta a Claude (22/11) e la conclusione è stata: **dentro la
carta grande tutto è in proporzione alla larghezza della carta, scritte comprese**. È la sola eccezione ai 12 px; anche lì
il nome non scende sotto i 6 px e il ruolo sotto i 5. `scripts/prove/schermate.cjs` conosce l'eccezione.

## Cosa è stato migliorato rispetto alla prima versione (22/11)
Confronto alla stessa scala con la foto, e cosa ne è uscito:
- **Nome e ruolo** in Montserrat nero invece del Bebas Neue: a queste misure un carattere largo e pieno si legge, uno
  stretto e sottile no. Un nome lungo si rimpicciolisce da solo (`data-adatta`, fino a 5 px) prima di passare a quello corto.
- **Bronzo** più scuro e più ramato: prima aveva il colore della pelle e i visi chiari ci sparivano dentro. In più il
  ritratto ha un filo d'ombra attorno e un po' più di contrasto.
- **Stemma** su una targhetta chiara, come una bandiera: sul fondo scuro non si leggeva.
- **Capitano e incarichi**: linguette piccole attaccate al bordo destro, del colore della carta, al posto dei quadrati
  blu che coprivano la carta accanto.
- **Ombra a terra** sotto ogni carta del campo, ed **erba più scura**: le carte si staccano dal campo.

## Ancora diverso dalla foto
- I ritratti sono di tre quarti e resi al computer, quelli della foto sono fotografie di fronte.
- Al posto della bandiera c'è lo stemma: nella mia squadra è uguale per tutti, quindi dice poco. Proposta aperta: metterci
  il numero di maglia.
- Il cerchio ha tre colori (le soglie delle statistiche), nella foto sono quattro.
