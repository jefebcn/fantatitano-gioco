# Ritratti dei giocatori

## Ritratti delle carte fatti con Gemini (23/11)
Alex ha scartato i volti di Blender per le carte: troppo poco realistici. Blender resta solo per i giocatori 3D in
partita. Decisioni di Alex:
- **Volti realistici generati con Gemini**, tutti inventati, mai somiglianti a calciatori o persone famose (Alex li ha
  controllati uno per uno; 22 sono stati rifatti cambiando la descrizione del viso).
- **Maglia stampata nel ritratto**, già coi colori e il disegno della squadra: la carta non segue i cambi di divisa e va
  bene così. Maglie da calcio vere, con disegno che cambia ogni pochi giocatori; i 150 volti condivisi hanno colori a caso.
- Pose diverse tra un ritratto e l'altro.

File: `public/img/ritratti-carte/<id>-512.webp` e `-256.webp` (415: i 265 veri e i 150 condivisi di
`src/dati/volti.json`), sfondo trasparente, testa larga il 40% del lato con la cima al 7%. Vanno usati interi, senza lo
strato della maglia colorata. Si rifanno con `scripts/ritratti_gemini.py` (ricetta in `docs/RICETTE.md`).

**Nel gioco (23/11 sera)**: la home li usa dappertutto. `src/casa/ritratti.js` sceglie il volto (stessa regola di
prima: mai due facce uguali nella stessa rosa) e dà il file intero di `img/ritratti-carte/`; la carta lo mostra così
com'è, senza ritagliarlo e senza comporlo con la maglia (niente più strato «sopra»): dove sta e quanto è grande lo dice
`CARTA.ritratto` in `src/config.js` (`docs/carte-giocatori.md`). Le carte larghe almeno 80 punti prendono il file da 512,
le altre quello da 256.

**Pulizia del 24/11 (decisa da Alex)**: i ritratti delle carte sono solo quelli di Gemini.
- La cartella `public/img/ritratti/` (teste, maglie e strati «sopra» di Blender: 908 file, 12,5 MB) è stata tolta.
- `src/dati/volti.json` è l'elenco dei volti (265 veri, 150 condivisi) e lo scrive `node scripts/volti.mjs` leggendo i
  file `<id>-512.webp` di `public/img/ritratti-carte/`. La voce «sopra» non c'è più.
- Non c'è più il ritratto di ripiego disegnato dal modello 3D: se a gioco acceso un file non c'è o non arriva, la carta
  resta con la sagoma neutra, senza errori.
- Per questo `npm run prova` (in `scripts/prova-dati.mjs`) controlla che ogni volto dell'elenco abbia i suoi due file,
  da 512 e da 256, e che nella cartella non ci siano file che l'elenco non conosce: se manca qualcosa la prova fallisce.
- Blender resta solo per i giocatori 3D della partita. L'avatar del manager è ancora disegnato dal modello 3D.

## Chi ha quale volto
- **Giocatori veri**: ognuno ha il suo ritratto, `squadra-nome` (per esempio `trefiori-nardi`). Lo tiene anche se cambia
  squadra, maglia compresa (è stampata nel ritratto).
- **Giocatori inventati e del mercato**: prendono uno dei 150 volti condivisi (`volto-001` … `volto-150`), scelto dal
  nome. La regola di Alex, **mai due facce uguali nella stessa rosa o nella stessa partita**, è in `voltoDi`:
  - nella mia rosa il volto di ogni giocatore resta scritto nella carriera (`volti`), così non cambia mai faccia, ed è
    sempre diverso da quello dei compagni;
  - ogni altra squadra ha volti tutti diversi tra loro e diversi da quelli della mia rosa: così in partita non ci sono
    doppioni. Se compro un giocatore, in un'altra squadra qualcuno può cambiare volto.

# Storia: i ritratti composti da Blender (21-22/11)

Da qui in giù è storia: racconta la prima versione dei ritratti, resi con Blender e composti dal gioco a strati (testa,
maglia colorata, capelli davanti). Alex l'ha scartata per le carte il 23/11 e i suoi file sono stati tolti il 24/11.
Resta scritta perché spiega le scelte e perché gli strumenti ci sono ancora (`scripts/aspetti.mjs`,
`scripts/blender/render_ritratti.py`, `scripts/blender/tutti.sh`, `scripts/ritratti_webp.py`), ma **non servono più a
fare i ritratti delle carte**: la cartella in cui scrivevano non esiste più e il gioco non la legge.

## Ritratti composti da Blender (prima versione)

Stato (22/11): **Alex ha approvato il terzo foglio di prova** e tutti i volti sono generati (265 giocatori veri + 150
condivisi); la home li usa dappertutto. Se un ritratto manca o non si carica resta quello vecchio, disegnato al momento
dal modello 3D della partita. I ritratti sono resi a 800 punti di lato, come il foglio approvato (nel gioco servono a
512 e a 256).

## Decisioni di Alex del 21/11 (sui ritratti di Blender)
- **Maglia neutra, colorata dal gioco**: con il mercato i giocatori cambiano squadra, una maglia «stampata» nel ritratto
  sarebbe sbagliata metà delle volte.
- **Quanti volti**: un ritratto per ogni giocatore vero (265) e circa 150 volti condivisi per inventati e mercato, con
  una regola: **mai due facce uguali nella stessa rosa o nella stessa partita**.
- Dal primo foglio: spalle e trapezi meno gonfi, pieghe nella stoffa, niente riflessi gialli sui capelli, tratti più
  maschili, calvo senza ciocche, capelli lunghi a ciocche e non a casco, espressioni e teste appena girate, tutta la
  testa sempre nell'inquadratura.
- Dal secondo foglio: pelle come nel primo (più dettaglio e profondità, non di cera) tenendo il contorno neutro; **niente
  colletti da polo**: di base girocollo o scollo a V, il colletto piccolo solo come variante di alcune squadre; stoffa
  con più volume, righe e scacchi che seguono il corpo; sopracciglia folte e naturali, poco arcuate; **colore degli
  occhi legato alla pelle** (pelle 4-6 quasi sempre occhi scuri, azzurri e grigi soprattutto con pelle 1-2);
  attaccatura dei capelli naturale; un velo di barba a chi sembra ancora femminile.

## A strati: la testa, la maglia, i capelli davanti
Dal collo in giù tutti i giocatori hanno **lo stesso busto**, e le maglie sono poche e uguali per tutti. Quindi:

| File | Cosa contiene | Quanti |
|---|---|---|
| `<id>.png` | testa, collo e petto del giocatore con capelli e barba, sfondo trasparente, **senza maglia** | uno a volto |
| `<id>-sopra.png` | capelli e barba che cadono davanti alla maglia | solo per chi li ha lunghi |
| `maglia-<scollo>-luce.png` | la maglia bianca con luci, ombre e pieghe | uno per scollo |
| `maglia-<scollo>-mappa.png` | per ogni punto della maglia: dove cade sulla stoffa e se è bordo | uno per scollo |

Gli scolli sono due: `girocollo` e `v`. Il **colletto piccolo** come variante di alcune squadre è ancora da fare: due
prove (accorciare il colletto della polo, cucirne uno sul girocollo) non erano all'altezza; serve un modello suo.

Il gioco compone il ritratto in tre passi: disegna la testa; sopra la maglia, cioè il motivo della squadra (tinta unita,
righe, fasce, banda, metà, scacchi, V) letto dalla mappa e moltiplicato per `luce` (così prende ombre e pieghe), con la
fascia attorno al collo nel colore del bordo; in cima lo strato `sopra`, se c'è. Nel gioco lo fa `src/casa/ritratti.js`
(coi numeri di `RITRATTI` in `src/config.js`); la stessa regola è scritta in `componi` di `scripts/ritratti_webp.py`, che
fa il foglio di controllo. Il gioco usa i **disegni delle maglie della partita** (`DISEGNI` in `src/divisa.js`): il
ritratto ha la stessa maglia che il giocatore porta in campo, con lo scollo del colletto scelto per la squadra.

La mappa dice dove cade ogni punto **sulla stoffa**, misurato prima delle pieghe: per questo righe e scacchi si piegano
con la stoffa, come su una maglia vera. È larga il doppio della maglia, a otto bit, senza
trasparenza: metà sinistra rosso e verde = posizione di lato (parte grossa e parte fine, insieme fanno un numero da 0 a
65535 che copre da −0,60 a +0,60 metri), blu = bordo; metà destra rosso e verde = altezza (da −0,50 a +0,10 metri
rispetto agli occhi). Va letta punto per punto, senza sfumare.

## Come sono fatti
- **Programmi**: Blender 4.2 LTS (blender.org) senza interfaccia, estensione MPFB 2.0.18 (extensions.blender.org). Il codice
  di MPFB è GPL e non entra nel gioco; i personaggi che crea sono CC0.
- **Pacchetti di MakeHuman** (tutti CC0, da files2.makehumancommunity.org): `makehuman_system_assets` (pelli, occhi,
  ciglia, la posizione delle sopracciglia), `skins02` (altre pelli maschili), `shirts01` (la maglietta girocollo, di MRT).
- **Corpo**: quello ad alta definizione di MPFB (19 mila vertici, lisciato due volte nel render). Corporatura da
  calciatore, uguale per tutti dal collo in giù; la testa è ingrandita del 4%.
- **Viso**: 36 regolazioni di MPFB tirate a sorte dal «seme» del viso, dentro intervalli che tengono i tratti maschili
  (mascella e mento larghi, labbra sottili, occhi non grandi), più la forma generale della testa. Età da 18 a 36 anni. I
  volti escono da numeri a caso: nessuno è fatto per somigliare alla persona vera con quel nome.
- **Espressione e posa**: sorriso, mezzo sorriso, sguardo deciso o serio (le «unità d'espressione» di MPFB); la testa
  gira di 4-14 gradi verso la camera, si inclina e si china di pochi gradi. Gli occhi guardano in camera e finiscono
  sempre nello stesso punto dell'immagine.
- **Pelle**: materiale pelle di MPFB con subsurface scattering e pori ben visibili, poco lucida, sei tonalità; lentiggini
  per le più chiare.
- **Occhi**: occhi ad alta definizione di MPFB con iride disegnata dal materiale e cornea lucida, sei colori. Se
  l'aspetto non dice il colore, lo script lo sceglie in base alla pelle (tabella `OCCHI_PER_PELLE`: azzurri e grigi
  soprattutto con le pelli chiare, quasi sempre scuri con le scure). Ciglia di MPFB.
- **Sopracciglia**: a peli veri cresciuti dalla pelle lungo l'arcata, folte, poco arcuate, del colore dei capelli.
- **Capelli e barbe**: a ciocche vere, cresciute da script dalla pelle. I capelli sono divisi in ciuffi, ognuno col suo
  verso, la sua lunghezza e la sua onda; all'attaccatura si diradano e si accorciano, senza riga netta. Dodici capigliature (rasato, corto, sfumato, ciuffo, pettinati indietro, riga di
  lato, ricci, afro, raccolti, calvo, stempiato, lunghi), sei barbe (ombra di barba, corta, piena, pizzetto, baffi,
  collare) più il viso rasato, sei colori naturali. Con `velo` si aggiunge un'ombra di barba sotto la barba scelta.
- **Maglia**: maglietta bianca a girocollo o con scollo a V, pieghe vere nella stoffa e trama fitta; resta sempre
  staccata dal corpo di qualche millimetro.
- **Inquadratura**: busto di tre quarti (22 gradi), obiettivo 85 mm, occhi al 38% dall'alto (poco sotto un terzo: così
  entra tutta anche la capigliatura più alta), uguale per tutti.
- **Luci**: principale calda da sinistra a 45 gradi, riempimento morbido da destra, contorno neutro e forte da dietro
  (dà profondità al viso). Il contorno non tocca capelli e barba (attraversandoli li accendeva di giallo): per loro ce
  n'è uno suo, debole. Il cielo attorno è grigio: se è azzurro si specchia negli occhi e li fa sembrare tutti grigi.
- **Render**: Cycles, 256 campioni con riduzione del rumore, 800 × 800 PNG con sfondo trasparente; poi WebP a 512 e 256.

## Come si rifacevano
1. Blender e MPFB (una volta): scaricare Blender 4.2 LTS, poi
   `blender --command extension install-file -r user_default --enable add-on-mpfb-v2.0.18.zip`.
2. Pacchetti (una volta): scompattare i tre zip in `~/.config/blender/4.2/extensions/.user/user_default/mpfb/data/`.
   Il sito di MakeHuman è lento con una connessione sola: conviene scaricare a pezzi in parallelo.
3. Aspetti: `node scripts/aspetti.mjs` scrive `scripts/blender/aspetti.json` (i giocatori veri di `public/data.js` più
   i volti condivisi). Va rifatto se cambiano le rose vere.
4. Tutti i ritratti che mancano: `scripts/blender/tutti.sh <blender> <cartella di lavoro> [minuti] [lato]`. Rendeva a
   blocchi e scriveva i file in `public/img/ritratti/`, la cartella tolta il 24/11.
5. Elenco per il gioco: `node scripts/volti.mjs` (oggi legge `public/img/ritratti-carte/`, vedi in cima).
6. Un ritratto solo, o un foglio di controllo:
   `blender -b --python scripts/blender/render_ritratti.py -- aspetti.json uscita [campioni] [lato] [id,id]` (tra gli id,
   `maglia` rifà i file delle maglie) e `python3 scripts/ritratti_webp.py uscita cartella foglio.jpg aspetti.json`.

Ogni riga di `aspetti.json` è un volto:

```json
{ "id": "01-trefiori", "eta": 29, "pelle": 1, "viso": 1000, "occhi": "castani", "capelli": "corto", "colore": "castano scuro",
  "barba": "ombra", "lentiggini": false }
```

`pelle` va da 0 (la più chiara) a 5; `viso` è il seme del volto, da cui escono anche espressione e posa (si possono
fissare con `espressione`, `gira`, `inclina`, `china`). Lo stesso aspetto dà sempre lo stesso ritratto. Nel file di
prova c'è anche `maglia` (colori in valori lineari, disegno e scollo): serve solo al foglio di controllo. Le tabelle di capelli,
barbe, pelli, occhi, espressioni e luci sono in cima allo script.

## Tempi e peso (misurati sul computer cloud, 4 processori, senza scheda grafica)
Vedi `docs/stato-lavori.md`, sezione «Ritratti».
