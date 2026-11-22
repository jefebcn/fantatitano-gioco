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

## Dove non è identica, e perché
Nella foto le scritte delle carte in campo sono molto piccole (il nome è alto circa 5 punti, il ruolo 4). La regola di
qualità del progetto dice **testo mai sotto 12 px**: dove la carta è larga meno di circa 100 px (il campo e la panchina
della Squadra, la scelta del capitano) nome, ruolo e numero restano di 12 px. Quindi la fascia del nome e la riga in
basso sono più alte in proporzione, il cerchio è un po' più grande e il ritratto, che deve farci stare anche collo e
maglia, è un po' più piccolo. Nella scheda del giocatore, dove la carta è larga 96 px, le proporzioni sono quelle della
foto. La scelta tra «12 px» e «proporzioni esatte anche in campo» è di Alex (chiesta il 22/11).
