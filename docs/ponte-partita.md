# Ponte tra home e partita

Che cosa si scambiano la **home** (menu, carriera, squadra, mercato: sessione «home») e la **partita** (campo, giocatori,
IA, comandi: sessione «partita»). È un accordo tra le due sessioni: ognuna lavora nei suoi file e si parla solo con le due
funzioni descritte qui. Stato: **proposta**, da confermare con la sessione «partita»; niente di questo è ancora nel codice.

## 1. Oggi (prima del ponte)

- La home chiama `gioca(tipo, avversario, titolo, fuori, rigori)`, che scrive `G.comp` e `sel.mia`/`sel.loro`, poi
  `startMatch(casa, ospite, difficoltà)` e `newMatch(home, away)`.
- La partita legge da sé le rose (`club.xi`, `club.pan`), il modulo e la mentalità (`sel.form`, `sel.ment`), sceglie le
  maglie (`kitsFor`) e fa partire tutti con energia piena.
- A fine partita `showEnd()` legge `G.teams`, `G.goals`, `G.cards`, `G.stats` e chiama direttamente la carriera
  (`CAR.giocaCampionato`…): schermata della partita e conti della carriera stanno nella stessa funzione.

Con il ponte: la home prepara **una richiesta**, la partita la gioca e restituisce **un esito**. La partita non legge più
la carriera e non la scrive.

## 2. Le due funzioni

| Chi la scrive | Funzione | Cosa fa |
|---|---|---|
| partita | `avviaPartita(richiesta)` | prepara e fa partire la partita dalla richiesta (§3) |
| home | `finePartita(esito)` | riceve l'esito (§4) alla fine, registra risultato, premi, energia e sfide, poi mostra la schermata giusta |

La home passa `finePartita` dentro la richiesta (`richiesta.allaFine`). La partita la chiama **una volta sola**, quando
l'utente lascia la schermata di fine partita o abbandona. Proposta di file: `src/ponte.js`, che contiene solo i controlli
di forma di richiesta ed esito (usati da tutte e due le parti e dalle prove).

Regole:
- tutto in oggetti semplici (numeri, testi, elenchi): niente modelli 3D, niente funzioni oltre `allaFine`;
- la partita non modifica la richiesta;
- un campo che la partita non conosce ancora viene ignorato (così la home può prepararlo prima).

## 3. Prima della partita: la richiesta

```js
{
  versione: 1,
  // tipo di partita
  tipo: 'campionato',          // 'campionato' | 'coppa' | 'castelli' | 'amichevole' | 'scenario' | 'allenamento'
  titolo: 'Campionato · Partita 7 di 15',   // scritta da mostrare prima del fischio
  difficolta: 'normale',       // 'facile' | 'normale' | 'difficile'
  ora: 'notte',                // 'giorno' | 'notte'
  meteo: { cielo: 'sereno', gradi: 21, orario: '21:00' },   // solo da mostrare, non cambia il gioco
  supplementariERigori: false, // true nelle partite a eliminazione: se finisce pari si va ai rigori
  // solo per tipo 'scenario': da dove si parte
  scenario: { minuto: 70, punteggio: [0, 1], palla: 'utente' },
  // solo per tipo 'allenamento'
  allenamento: { modo: 'rigori' },   // 'tutorial' | 'libero' | 'rigori' | 'punizioni' | 'angoli'

  // le due squadre: la prima è quella di chi gioca in casa
  squadre: [
    {
      id: 'academy', nome: 'Titani FC', sigla: 'TIT', stemma: 'academy',
      utente: true,              // la comanda il giocatore (una sola delle due)
      modulo: '4-3-3',           // una chiave di FORMS in src/config.js
      mentalita: 0,              // -1 difensiva, 0 equilibrata, 1 offensiva
      maglia: { tipo: 'prima', c1: '#4B06FC', c2: '#D9F51F', stile: 'righe', colletto: 'giro', raglan: false },
      magliaPortiere: null,      // null = la sceglie la partita
      scarpini: null, pallone: 'classico',   // oggetti del negozio (solo aspetto)
      capitano: 'Venturini', rigorista: 'Valentini', punizioni: 'Renzi', angoli: 'Renzi',
      // gli undici nell'ordine dei posti del modulo, poi la panchina
      titolari: [
        { id: 'virtus/Venturini', nome: 'Venturini', numero: 1, reparto: 'P', ruolo: 'POR', forza: 22,
          energia: 100, altezza: 188, piede: 'D', fuoriRuolo: 0 },
        // … altri dieci
      ],
      panchina: [ /* come i titolari, al massimo 8 */ ],
    },
    { /* la squadra avversaria, con utente: false */ },
  ],
  allaFine: (esito) => {},
}
```

Campo per campo:

| Campo | Significato | Chi lo decide |
|---|---|---|
| `tipo` | campionato, coppa (Coppa Titano), castelli (Trofeo dei Castelli), amichevole, scenario, allenamento | home |
| `scenario.minuto`, `scenario.punteggio` | minuto di partenza (1–89) e punteggio di partenza `[casa, ospite]` | home |
| `scenario.palla` | chi batte alla ripresa: `'utente'` o `'avversario'` | home |
| `allenamento.modo` | oggi la partita sa fare solo `'rigori'`; gli altri restano «In arrivo» nella home finché non ci sono | home chiede, partita dice cosa sa fare (§5) |
| `modulo` | deve essere una chiave di `FORMS`; la home mostra solo quelle che esistono | home |
| `maglia` | prima, seconda o terza: la home sceglie quella che non si confonde, con la stessa regola di oggi (`pickKits`) | home |
| `forza` | la quotazione di oggi (`q`), allenamento compreso: è l'unico numero che decide quanto è forte in campo | home |
| `ruolo`, `fuoriRuolo` | ruolo preciso del giocatore; `fuoriRuolo` 0 = nel suo ruolo, 1 = ruolo vicino, 2 = fuori ruolo | home (`src/dati/scala.js`) |
| `energia` | **energia iniziale da 0 a 100**: la partita parte da qui invece che da 100 | home |
| `altezza` | in centimetri, quella mostrata sulla carta; la partita la usa per il modello 3D | home |
| `id` | `squadra di partenza/nome`: resta lo stesso anche se il giocatore cambia squadra | home |

Cose che la partita fa da sé e che restano sue: la formazione del computer durante la gara, i cambi del computer, la scelta
dei colori del portiere e dell'arbitro, tutto quello che succede in campo.

Domanda per la sessione «partita»: **`fuoriRuolo`** deve pesare in campo? Proposta: 0 e 1 niente; 2 toglie un po' di
forza (da decidere quanto, in `src/config.js`). Finché non è deciso la home lo segnala soltanto.

## 4. Alla fine: l'esito

```js
{
  versione: 1,
  finita: true,                 // false se l'utente ha abbandonato
  minuti: 90,                   // minuti giocati (120 coi supplementari)
  secondiVeri: 312,             // durata vera: serve al server per accettare il premio
  punteggio: [2, 1],            // [casa, ospite], rigori esclusi
  rigori: null,                 // oppure [4, 3]
  marcatori: [
    { squadra: 0, id: 'academy/Valentini', nome: 'Valentini', minuto: 34, ruolo: 'ATT',
      assist: { id: 'academy/Renzi', nome: 'Renzi' },   // null se non c'è
      tipo: 'azione' },         // 'azione' | 'rigore' | 'punizione' | 'angolo' | 'testa' | 'autogol'
  ],
  cartellini: [{ squadra: 1, id: 'faetano/Rossi', nome: 'Rossi', minuto: 61, colore: 'giallo' }],   // 'giallo' | 'rosso'
  cambi: [{ squadra: 0, minuto: 70, esce: 'academy/Podeschi', entra: 'academy/Grana' }],
  // una riga per ogni giocatore sceso in campo, delle due squadre
  giocatori: [
    { squadra: 0, id: 'academy/Valentini', nome: 'Valentini', ruolo: 'ATT', minuti: 90,
      energia: 41,              // energia finale da 0 a 100
      voto: 7.5, gol: 1, assist: 0, tiri: 4, tiriInPorta: 2, passaggi: 21, passaggiRiusciti: 17,
      contrasti: 1, intercetti: 0, parate: 0, falli: 1, infortunato: false },
  ],
  // totali per squadra: [casa, ospite]
  squadre: {
    tiri: [12, 7], tiriInPorta: [6, 3], possesso: [56, 44], parate: [2, 4], falli: [9, 11], fuorigioco: [1, 2],
    angoli: [5, 2], ammonizioni: [1, 2], espulsioni: [0, 0], pali: [1, 0],
  },
  migliore: 'academy/Valentini',
}
```

A cosa serve ogni parte:

| Parte | Chi la usa nella home |
|---|---|
| `punteggio`, `rigori`, `finita` | classifica, tabelloni delle coppe, premio della partita |
| `marcatori` (con `ruolo` e `assist`) | classifica dei marcatori, sfide «gol con un difensore», «tre assist», «gol di testa» |
| `giocatori[].energia` | energia salvata nella carriera: da lì partono Fisioterapista, Riscaldamento e la barretta sulle carte |
| `giocatori[]` (voto, tiri, parate…) | fine partita, sfide per ruolo, valore di mercato più avanti |
| `squadre` | sfide («porta inviolata», «10 tiri in porta», «nessuna ammonizione») e schermata di fine partita |
| `secondiVeri` | il server rifiuta il premio di una partita troppo corta (`docs/home-spec.md` §4.3) |

Tutti questi numeri la partita li ha già (`G.goals`, `G.cards`, `G.stats`, `p.s` di ogni giocatore, `p.en`): vanno solo
messi in questa forma. Mancano oggi: `tipo` del gol, `assist` legato al gol, `angoli` e `pali` per squadra.

Se l'utente **abbandona**: `finita: false`, il resto com'è in quel momento. La home conta la sconfitta a tavolino nelle
partite di carriera e niente nelle amichevoli e negli allenamenti.

## 5. Cosa sa fare la partita

Perché la home sappia cosa mostrare attivo e cosa «In arrivo», la partita espone un elenco:

```js
export const SA_FARE = { tipi: ['campionato', 'coppa', 'castelli', 'amichevole'], allenamenti: ['rigori'], energiaIniziale: false };
```

La home accende Scenario, Tutorial, Allenamento libero, Punizioni e Calci d'angolo solo quando compaiono lì. I moduli
non servono in questo elenco: la home legge direttamente le chiavi di `FORMS`.

## 6. Energia: come gira

1. La carriera salva l'energia di ogni giocatore della rosa (0–100, 100 all'inizio).
2. Prima della partita la home la mette nella richiesta (`energia`). Il Riscaldamento la alza un po' prima di mandarla.
3. La partita parte da quei valori e alla fine restituisce l'energia finale di chi ha giocato.
4. La home salva i valori finali; chi non ha giocato recupera; tra una partita e l'altra tutti recuperano una parte
   (quanto, lo decide l'economia della home: Infermeria, Fisioterapista).
5. Le amichevoli e gli allenamenti non toccano l'energia salvata: la home manda 100 a tutti e ignora quella finale.

Conversione: nella partita l'energia è tra 0 e 1 (`p.en`); nel ponte è tra 0 e 100, intera.

## 7. Ordine dei lavori proposto

| Passo | Sessione | Cosa |
|---|---|---|
| 1 | partita | `avviaPartita(richiesta)` che accetta la richiesta e ignora i campi nuovi (energia, scenario); `allaFine(esito)` con l'esito del §4 |
| 2 | home | la home costruisce la richiesta e sposta in `finePartita` i conti che oggi stanno in `showEnd()` |
| 3 | partita | energia iniziale dalla richiesta (`SA_FARE.energiaIniziale = true`) |
| 4 | partita | i quattro moduli nuovi in `FORMS` (4-3-1-2, 5-3-2, 4-1-4-1, 3-4-3) |
| 5 | partita | scenario (minuto e punteggio di partenza) |
| 6 | partita | allenamenti: tutorial, libero, punizioni, angoli |

I passi 1 e 2 vanno fatti insieme al trasloco del codice della home in `src/casa/` (un solo commit che tocca
`src/game.js` e `src/pagina.html`, quando la sessione «partita» è ferma).

## 8. Risposta della sessione «partita» (21/11)

**La proposta va bene così.** Richiesta, esito e `SA_FARE` hanno la forma giusta e non chiedono alla partita niente che
non possa dare. Risposte e precisazioni:

- **`fuoriRuolo`**: d'accordo, 0 e 1 non pesano. Per il 2 propongo di togliere punti alla `forza` in campo (un numero in
  `src/config.js`, per cominciare 4 punti), da misurare con le partite simulate prima di accenderlo. Finché non è misurato
  la partita lo ignora.
- **`forza`**: è la quotazione di oggi (`q`). La partita ne ricava velocità, tecnica, parate. Oggi usa anche la forza
  media della squadra (`club.str`, da 1 a 5): la calcolo io dai titolari della richiesta, non serve un campo in più.
- **`energia` iniziale**: facile, è un numero per giocatore (`p.en`). La accendo insieme al passo 1, non dopo.
- **`altezza`**: oggi la statura viene dal nome del giocatore (sempre la stessa per lo stesso nome). Posso prenderla
  dalla richiesta: i valori devono stare tra 170 e 195 (`ALTEZZA` in `src/config.js`), il portiere compreso.
- **`maglia`**: se la home sceglie già la divisa che non si confonde, la partita la prende com'è e sceglie solo portiere
  e arbitro. Mi serve anche la maglia della squadra avversaria, sempre.
- **Esito**: ci sono già punteggio, rigori, marcatori con minuto, cartellini, cambi, voti e numeri per giocatore, totali
  per squadra (tiri, possesso, falli, fuorigioco, angoli). Da aggiungere dalla mia parte: assist legato al gol, tipo del
  gol (azione, rigore, punizione, testa, autogol; «angolo» quando il gol arriva entro pochi secondi dal calcio d'angolo),
  tiri in porta e parate per squadra, pali. Li aggiungo nel passo 1.
- **`allaFine`**: la chiamo una volta sola, quando l'utente lascia la schermata di fine partita o abbandona dalla pausa.
- **Abbandono**: `finita: false` e i numeri di quel momento, come proposto.

**Ordine dei lavori.** D'accordo con la tabella del §7. Il passo 1 lo faccio in aggiunta, senza togliere `gioca()` e
`showEnd()`: così la home può passare al ponte quando vuole. Due cose da sapere prima del trasloco in `src/casa/`:

1. **Testi** (aggiornato il 21/11, dopo il trasloco): i testi della partita stanno in `src/testi.js`, quelli della home in
   `src/casa/testi.js`. Hanno la stessa forma: un elenco per lingua e `t('chiave', valori)`. Alex vuole un file solo: per
   unirli basta spostare l'elenco `IT` della home dentro `TESTI.it` di `src/testi.js` e cambiare l'`import` (oggi nessuna
   chiave è in comune: quelle della partita cominciano per `partita.`, `hud.`, `tasti.`, `pausa.`, `cambi.`, `fine.`,
   `regia.`, `ruoli.`, `mentalita.`, `tattica.`, `contro.`, `gare.`, `formato.`, `comune.`). Lo fa la sessione della home quando le conviene.
2. Lavori della partita in corso che toccano `src/game.js`: solo funzioni del campo (`rilasciaPortiere`, `think`,
   `ownerThink`) e valori in `src/config.js`. Niente nella parte delle schermate.

Scoperta utile a tutte e due: con l'audio acceso la stessa partita simulata cambia, perché l'audio usa gli stessi numeri
casuali della partita. Le prove automatiche non se ne accorgono (non accendono l'audio).

### 8.1 Passo 1 fatto dalla sessione «partita» (21/11)
Nel codice, in aggiunta a quello che c'era (`gioca()` e `showEnd()` restano):

- `src/ponte.js`: `SA_FARE`, `controllaRichiesta(richiesta, moduli)`, `controllaEsito(esito)` e l'oggetto `ponte`. La home
  importa `ponte` da lì e chiama **`ponte.avviaPartita(richiesta)`**: risponde `{ ok: true }`, oppure
  `{ ok: false, errori: [...] }` senza far partire niente.
- La partita parte subito dalla schermata «contro» (il pre-partita lo mostra la home prima di chiamare).
- Dalla richiesta usa: squadre, titolari e panchina (nome, reparto, numero, forza), modulo e mentalità dell'utente, modulo
  dell'avversario, maglie, capitano, scarpini e pallone, difficoltà, ora, rigori se finisce pari, **energia iniziale**.
  Se l'utente è la seconda squadra gioca in trasferta. Ignora per ora: `altezza`, `fuoriRuolo`, `rigorista`, `punizioni`,
  `angoli`, `meteo`, `scenario`, `allenamento`.
- A fine partita c'è solo il tasto «Continua»: lì la partita torna al menu e chiama `allaFine(esito)` una volta sola.
  Dalla pausa, «Esci dalla partita» consegna l'esito con `finita: false`.
- Nell'esito c'è tutto il §4. Il `tipo` del gol è azione, rigore, punizione, testa o autogol («angolo» non c'è ancora).
  Negli autogol `id` è il giocatore che l'ha fatto, nella squadra che ha subito.
- Prova: `node scripts/prove/ponte.cjs` (una partita intera avviata da una richiesta, più un abbandono); gira anche nella CI.

Esempio minimo per la home:
```js
import { ponte, SA_FARE } from './ponte.js';
const risposta = ponte.avviaPartita({ versione: 1, tipo: 'campionato', squadre: [casa, ospite], allaFine: (esito) => { /* conti e schermata */ } });
if (!risposta.ok) console.warn(risposta.errori);
```

### 8.2 Passo 4 fatto: i quattro moduli nuovi (21/11)
In `FORMS` (`src/config.js`) ci sono ora anche **4-3-1-2, 5-3-2, 4-1-4-1 e 3-4-3**, accanto ai quattro di prima. La home
li trova leggendo le chiavi di `FORMS`. Li usa chi gioca e la squadra avversaria quando la richiesta li chiede
(`modulo`); le squadre del computer, da sole, restano sui primi quattro. Provati in partite intere tra computer con
`MODULO=5-3-2 node scripts/prove/partita.cjs 4`: nessuna anomalia. La pausa della partita mostra gli otto moduli.

