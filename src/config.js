/* Tutti i valori di gioco in un posto solo: misure del campo, tempi, difficoltà, IA, comandi e fisica. game.js e i moduli
   di src/fisica li prendono da qui. Per cambiare come «si sente» la partita si tocca solo questo file; ogni modifica si
   misura con `npm run partite` sugli stessi semi, prima e dopo. Niente grafica qui dentro (colori, luci, animazioni).
   I numeri ancora scritti dentro le funzioni di game.js passano qui man mano che si lavora su quella parte. */

/* ---------------------------------------------------------------- campo, tempi, difficoltà, IA di squadra */
// Misure vere, in metri, niente ingrandimenti: campo 105 × 68 (HL e HW sono le metà), porta 7,32 × 2,44 (GH mezza
// larghezza, GT altezza), pallone di 22 cm (BR il raggio). GRAV è la gravità del gioco.
export const HL = 52.5, HW = 34, GH = 3.66, GT = 2.44, BR = 0.11, GRAV = 20;
// Giocatori a grandezza vera: alti in media 1,80 m, da 1,70 a 1,95 secondo il giocatore; i portieri da `portiere` in su
export const ALTEZZA = { min: 1.70, max: 1.95, media: 1.80, portiere: 1.84 };
// Le linee: area di rigore 16,5 × 40,32, area piccola 5,5 × 18,32, dischetto a 11 m, cerchio di centrocampo e lunetta 9,15
export const LINEE = { area: [16.5, 40.32], piccola: [5.5, 18.32], dischetto: 11, cerchio: 9.15 };
// Ritmo come Dream League: il cronometro corre `gioco` volte il tempo vero quando si gioca (90 minuti in 4 minuti veri) e
// `fermo` volte durante le palle ferme, dopo i gol e al calcio d'inizio. Conduzione: velocità di corsa col pallone (senza
// scatto) in m/s, stima dai video da tarare
export const RITMO = { gioco: 22.5, fermo: 3.5, conduzione: 4.5 };
// Velocità dei giocatori in m/s (valori di partenza di Alex del 21/11, da Dream League): `corsa` e `scatto` senza palla,
// `scattoPalla` col pallone tra i piedi (la conduzione senza scatto è RITMO.conduzione). `qualita`: quanti m/s separano
// il più scarso dal più forte. `squadra`: m/s per ogni stella di forza della squadra. `portiere`: la corsa del portiere.
export const VELOCITA = { corsa: 5, scatto: 7, scattoPalla: 6, qualita: .5, squadra: .05, portiere: 4.6 };
export const HALF_SECS = 45 * 60 / RITMO.gioco;
export const DIFF = {
  facile:    { spd: .88, steal: .7,  save: .48, err: 1.7, think: .6, wait: 1.2, slide: 1.5 },
  normale:   { spd: .97, steal: 1.25, save: .58, err: 1.0, think: .4, wait: 1.0, slide: 4 },
  difficile: { spd: 1.04, steal: 1.9, save: .8, err: .6, think: .26, wait: .6, slide: 6 },
};
export const MATE = { spd: 1, steal: .95, save: .6, err: 1, think: .4, wait: .9, slide: 4 };
// `save`: quanto para il portiere (da 0 a 1). Quello di MATE è il portiere della squadra di chi gioca.
// `wait`: secondi in cui chi difende temporeggia prima di andare sul pallone; `slide`: scivolate al secondo quando ce n'è l'occasione
// Inserimenti senza palla: ogni quanti secondi si valuta, quanti insieme, quanto durano, punteggio minimo per partire, profondità in metri,
// probabilità del dai e vai dopo un passaggio e di cercare chi si inserisce
export const RUN = { every: 1.55, max: 2, life: 2.8, min: 8.5, depth: 13, oneTwo: .35, thru: .3 };
// Difesa a tre distanze dal portatore: oltre `far` ci si avvicina, fino a `near` si temporeggia, sotto si va sul pallone.
// `danger` è la distanza dalla propria porta sotto cui non si aspetta più; `slide` l'intervallo utile per la scivolata
export const DEF = { far: 8.5, near: 2.4, hold: 2.3, danger: 24, slide: [1.6, 3.4] };
// Falli: probabilità che un contrasto riuscito in piedi sia fallo [di fronte, da dietro], in scivolata lo decide la gamba tesa. Falli al secondo mentre si sta addosso
// al portatore [di fronte, da dietro]; probabilità del giallo [in piedi, in scivolata];
// distanza della barriera; quanto para il portiere su rigore rispetto a un tiro normale; quante volte l'arbitro lascia correre
// quando chi subisce il fallo resta in piedi con campo davanti; probabilità di infortunio [in piedi, in scivolata] e quanto va piano chi si fa male
export const FOUL = { stand: [.08, .3], rate: [.45, 1.2], yellow: [.1, .4], wall: 9.15, penSave: .42, adv: .75, inj: [.03, .12], limp: .72 };
// Peso di ogni evento nel voto in pagella (si parte da 6)
export const VOTE = { g: 1.1, a: .7, kp: .12, sot: .15, tk: .2, int: .08, sv: .4, pass: 1.2, fl: -.15, og: -1, yel: -.4, red: -1.5, clean: .6, concGk: -.35, concD: -.22, win: .25 };
// Gioco aereo: fin dove si arriva di testa, quanto si deve essere vicini, da dove si crossa (larghezza e profondità),
// velocità oltre la quale il pallone non si prende di testa (i tiri passano), probabilità che l'IA crossi quando può,
// distanza massima per tirare di testa, da quanti metri chi attacca va incontro
// al cross e quanto più lontano arriva staccando in corsa
// Calci piazzati che nascono dal gioco: il difensore che devia in area un pallone degli avversari lo manda in angolo con
// probabilità deviaAngolo; di testa, in area e con l'attaccante addosso, testaAngolo; la respinta del portiere può finire in
// angolo se il pallone arriva a meno di respintaLato metri dal palo; chi passa non vede il fuorigioco sotto vedeFuori metri;
// un attaccante su tre, a tratti di 2-5 s, resta oltre la linea di `oltre` metri
export const CALCI = { deviaAngolo: .4, testaAngolo: .35, respintaLato: 3.2, vedeFuori: 1.4, distratto: .35, oltre: [.8, 2] };
// (altezze per giocatori di 1,80 m: salto è l'altezza oltre cui si stacca per colpire, bersaglio quella a cui mira un cross,
// intercetta e stop fin dove un giocatore arriva sul pallone con la testa e col petto, scende l'altezza minima di un pallone che cade forte)
export const AIR = { low: 1.05, top: 2.4, reach: .8, salto: 1.5, bersaglio: 1.4, intercetta: 1.5, stop: 1.15, scende: .7, fast: 22.6, wide: 13, deep: 24, cross: .5, shot: 15, attacca: 6, stacco: .1 };
// Moduli: dove sta ciascuno degli undici e che compito ha (P portiere, D difensore, C centrocampista, A attaccante).
// Nei dati l'ordine è sempre portiere, quattro difensori, tre centrocampisti, tre attaccanti: cambiando modulo qualcuno cambia compito
export const FORMS = {
  '4-3-3': { pos: [[-46, 0], [-30, -20], [-33, -7], [-33, 7], [-30, 20], [-13, -14], [-17, 0], [-13, 14], [7, -19], [11, 0], [7, 19]], roles: 'PDDDDCCCAAA' },
  '4-4-2': { pos: [[-46, 0], [-30, -20], [-33, -7], [-33, 7], [-30, 20], [-15, -7], [-15, 7], [-11, -21], [-11, 21], [9, -6], [9, 6]], roles: 'PDDDDCCCCAA' },
  '3-5-2': { pos: [[-46, 0], [-33, -12], [-35, 0], [-33, 12], [-16, -23], [-18, 0], [-9, -9], [-9, 9], [-16, 23], [9, -6], [9, 6]], roles: 'PDDDCCCCCAA' },
  '4-2-3-1': { pos: [[-46, 0], [-30, -20], [-33, -7], [-33, 7], [-30, 20], [-19, -7], [-19, 7], [-3, 0], [1, -20], [11, 0], [1, 20]], roles: 'PDDDDCCCAAA' },
  // i quattro moduli aggiunti il 21/11 per la home (li sceglie chi gioca, o la richiesta del ponte: le squadre del computer
  // restano sui primi quattro). Stesse regole: undici posti, il primo è il portiere, il decimo e l'undicesimo battono il
  // calcio d'inizio. `roles` dice il reparto di ogni posto, ed è quello che decide come si comporta il computer
  '4-3-1-2': { pos: [[-46, 0], [-30, -20], [-33, -7], [-33, 7], [-30, 20], [-17, -13], [-20, 0], [-17, 13], [-4, 0], [9, -6], [9, 6]], roles: 'PDDDDCCCCAA' },
  '5-3-2': { pos: [[-46, 0], [-27, -24], [-33, -11], [-35, 0], [-33, 11], [-27, 24], [-14, -12], [-17, 0], [-14, 12], [9, -6], [9, 6]], roles: 'PDDDDDCCCAA' },
  '4-1-4-1': { pos: [[-46, 0], [-30, -20], [-33, -7], [-33, 7], [-30, 20], [-22, 0], [-9, -22], [-12, -7], [-12, 7], [-9, 22], [11, 0]], roles: 'PDDDDCCCCCA' },
  '3-4-3': { pos: [[-46, 0], [-33, -12], [-35, 0], [-33, 12], [-14, -23], [-17, -7], [-17, 7], [-14, 23], [7, -19], [11, 0], [7, 19]], roles: 'PDDDCCCCAAA' },
};
// le posizioni qui sopra sono scritte per un campo di 100 × 64: si allargano in proporzione al campo vero
for (const f of Object.values(FORMS)) f.pos = f.pos.map(([x, z]) => [x * HL / 50, z * HW / 32]);
// Mentalità (-1, 0, 1): quanti metri in più si sale quando si attacca, quanto restano alti gli attaccanti quando si difende
// (con la difensiva rientrano), quanto spesso ci si inserisce, quanto prima si va sul pallone con l'offensiva;
// con la difensiva: a quanti metri dal portatore sta il secondo uomo in copertura, quanti metri prima si smette di temporeggiare
// Pressing senza palla: da dove (metri dalla metà campo verso la porta avversaria, mentalità equilibrata) si va sul portatore.
// Zero vuol dire dalla metà campo: più avanti il primo uomo lo accompagna soltanto, come fa il computer in Dream League.
// Il secondo uomo raddoppia quando il primo è a meno di `primo` metri dal portatore e lui a meno di `raggio`, stringendo a
// `stretto` metri
export const PRESSING = { da: 0, primo: 3.5, raggio: 16, stretto: 2.2 };
export const MENT = { names: ['Difensiva', 'Equilibrata', 'Offensiva'], hud: ['In difesa', 'Equilibrata', 'In attacco'], push: 4, stay: 6, runs: .3, press: .4, cover: 12, guard: 3, hold: 14, back: 9 };

/* ---------------------------------------------------------------- telecamera di gioco */
// Telecamera di gioco come in Dream League. Valori di partenza di Alex (36,9 m in pianta, 12,5 m, 21,3°, 28° verticali),
// ritoccati di poco perché sullo schermo, al calcio d'inizio su un telefono 19,5:9, tornino le sue misure: cerchio di
// centrocampo largo il 43%, dischetto al 40% dall'alto, linea laterale lontana al 10% (tolleranza 2 punti: le controlla
// scripts/prove/inquadratura.cjs, anche nella CI). Non cambiarli senza rifare la misura.
// alto e dietro: dove sta la telecamera rispetto al punto inquadrato, in metri (dietro, in pianta, è verso la linea laterale
// vicina). inclina: gradi verso il basso, fissi. La telecamera non gira mai a destra o a sinistra. fovOriz: campo visivo
// ORIZZONTALE in gradi, uguale su ogni schermo (su 19,5:9 sono 29,1° in verticale, quelli della PerspectiveCamera di three.js).
// seguiX e seguiZ: quanto il punto inquadrato segue il pallone lungo il campo (tutto) e in profondità (il 45%: pallone a
// +30 m, telecamera avanti di circa 14). molla è la prontezza con cui segue (più alta, meno ritardo), bordoX i metri dalla
// linea di fondo a cui si ferma, zMax fin dove arriva verso la tribuna vicina (oltre ci entrerebbe)
// fascia: il pallone resta sempre tra queste due altezze dello schermo (0 in alto, 1 in basso). Se seguendolo al 45% ne
// uscirebbe (verso la linea laterale lontana finiva sotto il tabellone), la telecamera lo segue per intero in profondità.
export const CAMERA = { alto: 12.5, dietro: 36.8, inclina: 21.75, fovOriz: 58.7, seguiX: 1, seguiZ: .45, molla: 6, bordoX: 16, zMax: 56, fascia: [.3, .7] };
// Vista dall'alto di tutto lo stadio, solo per controlli: si accende con ?alto nell'indirizzo. [x, y, z della telecamera,
// x, y, z del punto guardato, FOV verticale]
export const CAMERA_ALTO = [0, 95, 40, 0, 0, 0, 55];

/* ---------------------------------------------------------------- comandi dell'utente (come Dream League, docs/dls-gameplay.md) */
// La levetta: base fissa (un cerchio di `raggio` px), la levetta si muove dentro. Poco inclinata si cammina, poi si corre;
// oltre `scatto` (parte del raggio) si scatta da soli: non c'è un tasto per lo scatto. Sulla tastiera le frecce sono la levetta
// tutta inclinata (scatto): tenendo Maiusc si corre senza scattare, a `tastieraCorsa`.
export const LEVETTA = { raggio: 52, scatto: .87, tastieraCorsa: .8 };
// Andatura dalla levetta: sotto `morta` fermi, poi si cammina, a metà si corricchia, da `piena` si corre (prima dello scatto).
// Tra un'andatura e l'altra il passaggio è morbido, così si può dosare la velocità vicino all'avversario.
export const ANDATURA = { morta: .15, cammina: .3, corsetta: .62, piena: .78 };
// Senza palla: «Pressing» (tasto B tenuto) porta il giocatore addosso al portatore, puntando dove sarà fra `anticipo`
// secondi; a meno di `vicino` metri rallenta e prova il contrasto in piedi. «Calcio forte» è una scivolata verso la levetta
export const PRESSIONE = { anticipo: .25, vicino: 1.6 };
// Passaggio (Calcio basso), da confermare con DLS: con `assistito` va al compagno nella direzione della levetta e la durata
// della pressione cambia solo un po' la velocità (± `dosa`, da un tocco a tutta carica). Senza, la potenza decide anche quanto
// lontano si passa (DIST)
// `arrivo`: a che velocità il rasoterra arriva al compagno, in m/s: base, più tanto per ogni metro di distanza, tra un
// minimo e un massimo. Sono in proporzione alla corsa dei giocatori (VELOCITA): una palla troppo tesa non si ferma.
// `inCorsa`: al compagno che corre il rasoterra arriva più morbido, al massimo a questa velocità (m/s): più svelto di
// così lui non lo prende, gli corre accanto finché il pallone rallenta. Vale per intero dai 16 metri in su, per niente
// sotto gli 8 (il corto resta teso, se no lo intercettano), a metà strada in mezzo: [velocità, da metri, a metri].
export const PASSAGGIO = { assistito: true, dosa: .15, arrivo: [6, .15, 6.5, 10.5], inCorsa: [5.5, 8, 16] };
// Passa, Cross e Tira si tengono premuti: la barra sotto il giocatore si riempie (in 0,8 s) e al rilascio parte il colpo
// con quella potenza. Un tocco veloce su Passa o Cross fa il passaggio dosato da solo, come prima.
export const CARICA = { piena: .8, tocco: .12, max: .95 };
// distanza a cui si vuole arrivare con una certa potenza (passaggio e lancio), e potenza giusta per una distanza
export const DIST = { pass: [5, 45], cross: [12, 30], lancio: [15, 40] };
// Segni in campo: X gialla dove scende un pallone alto (lanci, cross, rimesse), larga `x` metri: il pallone è «alto» se
// sale oltre `alto` metri. Il segnalino grigio sul compagno che si prenderebbe con «Cambia giocatore» si ricalcola ogni
// `cambio` secondi. La barra della potenza diventa rossa da `rosso` (parte della carica piena). `scala`: grandezza dei segni
// sopra le teste (parte dell'altezza dello schermo)
export const SEGNI = { x: 1.1, alto: 1.6, cambio: .2, rosso: .8, scala: .12 };
// Secondi tra l'inizio del gesto e il momento in cui il piede colpisce il pallone (passaggio, tiro, lancio).
// In conduzione il pallone sta fino a un metro e mezzo davanti: il calcio aspetta che il piede ci arrivi. Dove il piede
// lo colpisce lo dice la clip del gesto. Per i gesti che non lo dicono: `portata` metri davanti al corpo e `lato` metri
// dalla parte del piede che calcia. `chiude`: a quanti metri al secondo il giocatore gli arriva sopra in quell'attesa.
// `attesa`: quanto si aspetta al massimo, in secondi.
export const CARICO = { passa: .1, calcia: .14, lancia: .14, portata: .4, lato: .15, chiude: 6, attesa: .18 };

/* ---------------------------------------------------------------- palle ferme e sequenza del gol (come Dream League) */
// Palle ferme: i comandi tornano `comandi` secondi dopo il fischio della rimessa laterale; la dissolvenza scura della rimessa
// dura `buio` secondi (a metà la telecamera stacca sul punto di battuta). Una palla ferma che arriva entro `occasione` secondi
// da una grande occasione (parata, tiro deviato, palo, tiro fuori di poco: entro `fuori` metri dal palo) è preceduta dal
// replay (RIVEDI). Sull'angolo un compagno si offre per batterlo corto, a `corto` = [metri dalla linea di fondo, metri dalla
// linea laterale]
export const FERMI = { comandi: 2, buio: .5, occasione: 4, fuori: 2.5, corto: [7, 7] };
// Gol, in secondi veri dal pallone in rete: da `lento` per `durataLento` secondi un leggero rallentatore (a velocità `vel`),
// con gli avversari fermi a disperarsi per `fermi` secondi e l'arbitro che indica il centro; a `stacco` la telecamera passa
// al primo piano del marcatore: alta `camAlt` metri, a `camDist` metri da lui, con un difensore deluso in primo piano
// Il deluso sta a `deluso` = [parte della distanza dalla telecamera, metri di lato]
// `riquadro`: per quanti secondi si vede la striscia in fondo allo schermo col nome di chi ha segnato (scelta di Alex:
// piccola, sottile, 2 secondi, in dissolvenza, senza coprire chi esulta). 0 = mai, come in Dream League.
export const GOLSEQ = { lento: .5, durataLento: .7, vel: .45, fermi: 2.4, stacco: 1.3, camAlt: 1.7, camDist: 4.6, deluso: [.55, 1.7], riquadro: 2 };

// Livelli di dettaglio del calciatore: sotto `vicino` metri dalla telecamera il corpo pieno (circa 4.300 triangoli: primi
// piani, replay, esultanze), fino a `lontano` quello medio (1.500: la telecamera di gioco), oltre quello leggero (600)
// Il prato (Alex, 21/11): `tinta` moltiplica rosso, verde e blu dell'erba (meno rosso e meno blu: verde più pieno e meno
// giallo). `strisce`: quanto sono scure e chiare le strisce di taglio. `anelli`: lo stesso per gli anelli concentrici e
// gli scacchi del cerchio, più leggeri delle strisce. `rilievo`: quanto risalta la grana dell'erba. `piastrella`: ogni
// quanti metri si ripete la texture (più piccola, più nitida). `maglia`: il lato in metri dei riquadri di cui è fatto il
// prato (triangoli piccoli: nessuno sparisce quando la telecamera è vicina a un angolo).
export const PRATO = { tinta: [.8, 1.04, .7], strisce: [.74, 1.18], anelli: [.9, 1.05], rilievo: .8, piastrella: 3, maglia: 6 };
export const LOD = { vicino: 22, lontano: 62 };
// Cartelloni LED a bordo campo: scorrono piano di continuo (frazione di tutta la striscia al secondo: 4 pannelli)
export const LED = { scorre: .02 };

/* ---------------------------------------------------------------- replay e stacchi */
// Replay automatico e breve (da confermare con DLS): dopo un gol e alla prima palla ferma dopo una grande occasione rivede gli
// ultimi `secs` secondi registrati a velocità `vel` (circa 3,5 s veri), tra due stacchi col logo di `stacco` secondi. Si salta
// toccando lo schermo o il pulsante in basso a destra. Sotto `min` secondi registrati non parte
export const RIVEDI = { secs: 3, vel: .85, stacco: .3, min: 1.5 };


/* ---------------------------------------------------------------- IA col pallone, passaggi, scatti */
/* Col pallone (l'IA). Regola presa da GameplayFootball (elizacontroller.cpp): si passa solo se il compagno sta meglio di
   chi ha la palla di una certa soglia; altrimenti si porta palla. Così il computer tiene palla uno o due secondi invece di
   giocare tutto di prima. primo: attesa prima della prima decisione dopo lo stop (secondi, per think 0,4: si scala con la
   difficoltà); pensa: tra una decisione e l'altra; addosso: avversario a meno di questo tempo dal pallone, si scarica
   subito se c'è un passaggio sensato (punteggio oltre scarico); primoAddosso: la prima decisione quando lo stop arriva
   con l'avversario a meno di 2,5 m; soglia: di quanto il passaggio deve battere il portare palla; diPrima: in
   più, se la palla è appena arrivata (passaggio di prima solo verso un compagno davvero libero); negli ultimi `area` metri
   si decide al più ogni `inArea` secondi. */
export const TENUTA = { primo: [1.2, 2], primoAddosso: .5, pensa: [1.2, 2], addosso: .45, scarico: 5, soglia: 6, diPrima: 8, appena: .4, area: 28, inArea: .25 };
// Al momento del calcio (dopo il caricamento del gesto, 0,1-0,27 s dalla decisione) l'avversario può essersi messo davanti al
// pallone: allora l'IA cambia compagno se ce n'è uno con la linea libera, se no (e per l'utente) alza un pallonetto corto
export const PASSA = { addosso: 1.6, cono: 40, scavalca: 3.6 };
// L'IA dosa gli scatti: sotto un quarto di energia scatta solo quando conta davvero (palla da prendere, chi ha la palla, il
// portiere) e riprende a scattare solo sopra il 40%. Così nel finale nessuno resta a secco e le squadre restano corte.
export const RISERVA = { soglia: .25, riparte: .4 };

// Come Dream League: quando un compagno conduce verso l'area (negli ultimi `da` metri, andando verso la porta ad almeno
// `corsa` m/s, o sulla fascia) da 3 a 4 compagni (`quanti`) si inseriscono in area. Sui calci d'angolo `angolo` attaccanti
// in area (4 o 5). In difesa, col pallone a meno di `vicino` metri dalla propria porta, la squadra si stringe a `stretta`
// della sua larghezza normale e la linea scala verso la porta
export const AREA_IA = { da: 30, corsa: 1.5, quanti: [3, 4], angolo: [4, 5], vicino: 35, stretta: .62 };

/* ---------------------------------------------------------------- portiere */
// Sotto queste altezze del pallone, in metri, cambia il gesto. tuffo: rasoterra, mezza altezza, busto e oltre alto. presa al
// centro: a terra, al ginocchio, al busto e oltre alta. uscita: da che altezza un cross è una presa alta. lancio: da che
// altezza parte il pallone lanciato con le mani. rinvio: a che altezza arriva il rinvio lungo
export const PARATA = { tuffo: [.3, .8, 1.25], presa: [.25, .6, 1.2], uscita: .9, lancio: 1.9, rinvio: 1.1 };
// Come Dream League: sta sulla linea (`linea` metri davanti) e segue il pallone di lato. Quando l'attaccante col pallone entra
// in area (`area` metri dalla linea di fondo) esce verso il palo vicino: `palo` = [metri davanti alla linea, metri dentro dal
// palo]. Reagisce al tiro dopo `reazione` secondi (il più bravo il primo numero, il meno bravo il secondo), poi si tuffa.
// Sulle parate: tiene il pallone solo con probabilità `presa` quando potrebbe; delle respinte, `davanti` lo lascia in area
// (poi va a riprenderlo), `angolo` lo manda di lato oltre la linea di fondo (più spesso vicino al palo)
export const PORTIERE = { linea: .9, area: 16.5, palo: [2.4, 1.5], reazione: [.18, .3], presa: .6, davanti: .3, angolo: .4 };
// Il portiere col pallone in mano. attesa: secondi prima di rimetterlo in gioco; braccio e piede: quanto prima parte
// l'animazione del lancio e del rinvio. corto: fin dove lancia con le mani, in metri. limite: quanto può avanzare dalla linea.
// Il lancio con le mani: `mano` è la velocità media in m/s. Oltre `vicino` metri la palla tocca terra a `rimbalzo` della
// distanza (0,7: a sette decimi della strada) e arriva al compagno di rimbalzo. Più vicino gliela dà sui piedi.
export const RINVIO = { attesa: [1.3, 2.1], braccio: .63, piede: .3, corto: 30, limite: 14, mano: 17, vicino: 9, rimbalzo: .7 };
/** Portiere col pallone in mano. peso: quanto le braccia che lo tengono contano rispetto alla corsa (9 = nove decimi). */
export const MANO = { peso: 9 };

/* ---------------------------------------------------------------- riprese, panchina, a terra */
// Rimessa laterale con le mani. linea: dove sta chi batte; max: fin dove può lanciare; lunga: da quanti metri il lancio è
// lungo e alto; fermo: il secondo della clip in cui si tiene il pallone dietro la testa; pensa: quanto aspetta dopo il fischio
// mani e manoMin: a che altezza sta il pallone sopra la testa, se la posa non si può leggere, e il minimo
export const RIMESSA = { linea: HW - .25, max: 28, lunga: 14, fermo: .08, pensa: [.4, .9], mani: 1.95, manoMin: .9 };
// Panchina: quante sostituzioni a partita, quante ne fa l'IA, da che punto della partita comincia e ogni quanto ne fa un'altra
export const SUB = { max: 5, ai: 3, from: .55, every: .12 };
/** Quanto si resta a terra dopo una scivolata, un tuffo o un contrasto subito: si allunga se ci sono le clip registrate. */
export const DOWN = { pl: .38, gk: .5, fall: .7 };

/* ---------------------------------------------------------------- movimenti senza palla (solo grafica, ma coi tempi del gioco) */
// fermo: sotto questa velocità, in m/s, si è fermi. parte: velocità voluta minima per una partenza. giro: gradi minimi per una
// partenza girata; corsa: velocità minima per un'inversione; inverti: coseno sotto cui la direzione voluta è alle spalle;
// scatto: velocità dello scatto; pausa: secondi tra un movimento e il successivo; passo: entro che parte del passo il piede
// giusto deve essere appena sceso; attesa: quanto si aspetta quel piede; corsaAttesa: velocità minima mentre si aspetta
export const MOVI = { fermo: .6, parte: 2, giro: 35, corsa: 2.4, inverti: -.35, scatto: 5.3, pausa: .3, passo: .2, attesa: .35, corsaAttesa: 1.2 };

/* ---------------------------------------------------------------- fisica del pallone */
export const FIS = {
  g: GRAV, // gravità del gioco (più alta del vero: le parabole sono più brevi e leggibili sul telefono)
  r: BR, // raggio del pallone in campo (ingrandito per vederlo)
  aria: 0.0075, // resistenza dell'aria: decelerazione = aria · velocità² (a 30 m/s circa 6,8 m/s²)
  magnus: 0.2, // curva: accelerazione laterale = magnus · effetto · velocità orizzontale
  top: 0.12, // rotazione in avanti: accelerazione verso il basso = top · t · velocità orizzontale
  giroAria: 0.3, // quanto si perde l'effetto al secondo in volo
  giroErba: 3.5, // e quando rotola
  rotola: 1.2, // attrito dell'erba quando rotola: frenata costante in m/s²
  viscoso: 0.22, // più una frenata che cresce con la velocità (erba alta, piccoli saltelli)
  rimbalzo: 0.55, // quanta velocità verticale resta dopo un rimbalzo
  strisciaRimbalzo: 0.86, // quanta velocità orizzontale resta dopo un rimbalzo
  minRimbalzo: 1.8, // sotto questa velocità verticale non rimbalza più: si appoggia e rotola
  passoMax: 1 / 120,
};
/**
 * Il dribbling: chi ha palla non se la porta incollata, la spinge avanti di un tocco quando la raggiunge e la rincorre.
 * Il tocco è più lungo in scatto e per chi ha meno tecnica: la palla resta più a lungo lontana dal piede e un avversario
 * può arrivarci prima. Da fermo (o quasi) la palla resta sotto la suola.
 *  vicino:  sotto questa distanza "davanti al piede" scatta il tocco successivo
 *  passo:   tocco normale = velocità di corsa · passo; scatto: passoScatto
 *  perde:   oltre questa distanza dal giocatore la palla non è più sua
 *  guinzaglio: in conduzione la palla non va mai più lontano di così (Alex, 21/11: circa 1,5 m)
 *  fermo:   sotto questa velocità si tiene la palla sotto la suola
 *  errore:  di quanto (radianti) può andare storto un tocco per chi ha la tecnica più bassa
 *  pausa:   tempo minimo tra due tocchi
 *  stretto: con un avversario addosso (p.pressato) il tocco si accorcia: la palla resta più vicina al piede
 *  ritmo:   col passo (p.ritmo, vedi corpo.js) il tocco parte quando un piede sta per scendere, anche un po' prima (fino a
 *           vicino + ritmo); tra un passo e l'altro aspetta, a meno che la palla non sia già sotto i piedi (forza)
 */
export const COND = { riprendi: 1.8, stretto: 0.9, forza: 0.3, ritmo: 0.15, vicino: 0.5, passo: 1.22, passoScatto: 1.3, guinzaglio: 1.5, perde: 3.2, fermo: 1.4, errore: 0.14, pausa: 0.2, suola: 0.55, girata: 0.6 };

/* ---------------------------------------------------------------- fisica dei giocatori */
export const CORPO = {
  acc: 16, // accelerazione da fermo (m/s²): da fermo allo scatto in circa un secondo
  accMin: 0.22, // quanta accelerazione resta vicino alla velocità massima (frazione di acc)
  frena: 20, // frenata massima (m/s²)
  gira: 9, // quanto in fretta la corsa cambia direzione andando piano (rad/s): mezzo giro in un terzo di secondo
  giraScatto: 5, // e in pieno scatto: la curva si allarga
  perde: 1, // quanta velocità costa girare, in proporzione all'angolo: a 90° ne resta il 72%, su un'inversione completa circa metà
  latScatto: 0.75, // in scatto si gira ancora un po' più piano
  giro: 13, // velocità massima di rotazione del busto da fermo (rad/s)
  giroCorsa: 7.5, // e a piena corsa
  molla: 160, // quanto forte il busto insegue la direzione voluta
  smorza: 24, // e quanto si smorza (oltre questo valore niente oscillazioni)
  passoMax: 1 / 120,
};
// Fatica (en da 0 a 1): lo scatto consuma, correndo forte si consuma poco, piano si recupera. `fondo` è il tetto a cui si
// recupera e cala piano durante la partita: nel finale chi ha corso tanto non torna più fresco come all'inizio.
export const FATICA = { scatto: 0.045, corsa: 0.006, recupero: 0.022, fondoCorsa: 0.0011, fondoScatto: 0.0022, fondoMin: 0.6, intervallo: 0.4 };

/* ---------------------------------------------------------------- contrasti */
// Duelli: sotto `vicini` metri due avversari in corsa si toccano. Conta la forza (massa, velocità, freschezza): chi ne ha di
// più sposta l'altro e lo sbilancia per un attimo (meno velocità, meno controllo della palla).
export const DUELLO = { vicini: 0.63, corsa: 3, paralleli: 0.35, spinta: 14, sbilancio: 0.45, perde: 0.32 }; // spinta in m/s² finché ci si tocca
// La scivolata: si parte a `v0` (almeno la velocità che si ha, un po' di più) e l'erba frena (attrito). Le gambe colpiscono
// solo nella parte centrale (da `attiva` a `fine`, in secondi), quando il piede è tutto avanti: lungo la gamba, da `anca` a
// `piede` metri davanti al bacino, con uno spessore `raggio`. Tempi e misure vengono dall'animazione del modello.
export const SCIVOLATA = { v0: 8.5, spinta: 1.1, attrito: 2.2, durata: 0.75, attiva: 0.16, fine: 0.62, anca: 0.13, piede: 0.83, raggio: 0.25, giuPalla: 0.5, uomo: 0.33, dopo: 0.12 };

// Quando il computer tira. La bontà dell'occasione va da 0 a 1 e la calcola valoreTiro in game.js.
// Tira sempre sopra `buona`. Tira sopra il primo numero di `pressato` se l'avversario arriva entro il secondo (in secondi).
// Con un'occasione almeno `minima` tira sempre entro `vicino` metri dalla porta e, entro il primo numero di `daFuori`
// (metri), con la probabilità del secondo a ogni decisione.
export const TIRO_IA = { buona: .12, pressato: [.06, .9], minima: .03, vicino: 20, daFuori: [30, .8] };

// Le punte quando la squadra ha palla: aspettano `sullaLinea` metri dietro la linea del fuorigioco (l'ultimo difensore),
// mai oltre `massimo` metri dal centro del campo verso la porta avversaria.
export const ATTACCO = { sullaLinea: 1.2, massimo: 44 };

// Le cinque divisioni della carriera, dalla più alta (docs/home-spec.md, §3). Si parte dall'ultima.
// val: tra quali valutazioni stanno i giocatori della divisione. vittoria: monete per una vittoria. fine: diamanti a
// fine stagione. vere: le squadre sono quelle vere del Campionato Sammarinese; nelle altre divisioni sono inventate.
// obiettivi: i quattro obiettivi della stagione, più difficili salendo. posizione: arrivare tra le prime tante in
// campionato. coppa: quanti turni di Coppa Titano superare (1 = arrivare ai quarti, 2 = in semifinale). castelli: 1 =
// passare i gironi del Trofeo dei Castelli, 2 = arrivare in semifinale. media: la valutazione media dei titolari.
export const DIVISIONI = [
  { id: 'sammarinese', nome: 'Campionato Sammarinese', val: [55, 75], vittoria: 250, fine: 50, vere: true, obiettivi: { posizione: 3, coppa: 2, castelli: 2 } },
  { id: 'cadetta', nome: 'Serie Cadetta del Titano', val: [54, 68], vittoria: 180, fine: 40, obiettivi: { posizione: 3, coppa: 2, castelli: 2, media: 67 } },
  { id: 'contrade', nome: 'Lega delle Contrade', val: [50, 63], vittoria: 130, fine: 30, obiettivi: { posizione: 4, coppa: 2, castelli: 2, media: 62 } },
  { id: 'borghi', nome: 'Lega dei Borghi', val: [45, 57], vittoria: 90, fine: 20, obiettivi: { posizione: 4, coppa: 2, castelli: 1, media: 56 } },
  { id: 'esordienti', nome: 'Lega Esordienti', val: [40, 52], vittoria: 60, fine: 10, obiettivi: { posizione: 5, coppa: 1, castelli: 1, media: 51 } },
];
// Come finisce una stagione: per salire servono `servono` obiettivi su quattro; scende chi arriva tra le ultime
// `retrocedono`, tranne nell'ultima divisione. Nella divisione più alta gli obiettivi restano ma non c'è dove salire.
export const STAGIONE = { servono: 3, retrocedono: 2 };

// Economia della carriera (docs/home-spec.md, §5). Monete e diamanti si guadagnano solo giocando: niente acquisti.
// Tutti i premi e i costi in monete scritti «in vittorie» valgono quel numero per il premio di una vittoria nella
// divisione in cui si gioca: così crescono da soli salendo di divisione.
// inizio: monete e diamanti di partenza; tra quali valutazioni sta la rosa iniziale e quante riserve ha.
// premi: pareggio e sconfitta sono una parte della vittoria; turno di coppa superato e trofei vinti, in vittorie.
//   arrotonda: a quante monete si arrotonda ogni importo calcolato.
// valore: un giocatore vale `base` monete a valutazione `a` e raddoppia ogni `raddoppia` punti; vendendolo si incassa
//   la parte `vendita`. minimo: sotto quanti giocatori in rosa non si vende più.
// allenatori: oggetti che si usano su un giocatore. Per ogni rarità: di quanti punti alza le statistiche della sua
//   categoria, quanti diamanti costa (il comune non si compra), e per il leggendario la probabilità di alzare di uno il
//   potenziale. categorie: quali statistiche alza ognuna. potenziale: di quanto può salire al massimo la valutazione
//   di un giocatore rispetto a quella con cui è arrivato. svincolo: sotto quale valutazione lo svincolo di un giocatore
//   dà un allenatore di ogni rarità.
// mercato. lista: quanti giocatori ha la lista trasferimenti e quanti diamanti costa rinnovarla subito. osservatore:
//   lo sconto sul valore del giocatore trovato e il costo della ricerca per fascia, in vittorie. agente: il costo in
//   vittorie oltre al contatto, e quanti diamanti costa un contatto. offerte: quante sono le offerte a tempo, quanti
//   diamanti costano oltre al valore in monete, quante ore durano.
// diamanti: la serie di sette giorni (uno per giorno giocato di fila), tutte le sfide della settimana, la promozione,
//   una coppa vinta, il fisioterapista completo pagato in diamanti.
// strutture: le sette strutture del club, da zero a cinque stelle. costi e diamanti: quanto costa ogni stella.
//   centro (quanti moduli sono aperti, quante partite dura il riscaldamento, quanti allenatori comuni dà a settimana
//   per stella), infermeria (energia recuperata in più per stella), foresteria (rosa massima), commerciale (monete in
//   più a partita per stella), osservatori (sconto sulle ricerche per stella), curva (statistiche in più in casa per
//   stella), stadio (posti, e incasso di una partita in casa in vittorie).
// percorso: il percorso premi della stagione. Punti per fonte, punti che servono per ogni livello e premio di ogni
//   livello (v monete in vittorie, g diamanti, a un allenatore di quella rarità).
// finanze: fino a quante vittorie di saldo vale ogni giudizio. storico: quanti movimenti si tengono.
// scenario: quanti diamanti dà uno scenario vinto (g).
// energia: quanta energia, su 100, recupera ogni giocatore del club tra una partita e l'altra. Riscaldamento: di quanto
//   alza le statistiche dei titolari e quanto costa in vittorie. Fisio: i tre interventi, quanta energia ridanno a
//   tutta la rosa e quanto costano in vittorie.
// negozio: quanto costa un oggetto di ogni tipo (m monete, g diamanti): solo aspetto. Quali oggetti esistono e quali
//   si hanno dall'inizio sta in NEGOZIO, in src/carriera.js.
export const ECONOMIA = {
  inizio: { monete: 150, diamanti: 20, rosa: [42, 50], panchina: 7 },
  premi: { pareggio: .5, sconfitta: .25, turno: .5, campionato: 8, coppa: 5, castelli: 4, arrotonda: 5 },
  valore: { base: 100, a: 55, raddoppia: 5, vendita: .5, minimo: 16 },
  allenatori: {
    rarita: { comune: { punti: 1 }, raro: { punti: 2, diamanti: 15 }, leggendario: { punti: 3, diamanti: 40, potenziale: .25 } },
    categorie: { tecnico: ['CON', 'PAS', 'TIR'], fisico: ['VEL', 'ACC', 'RES', 'POT'], difesa: ['DIF'], portieri: ['PAR', 'RIF', 'POS', 'USC', 'PRE', 'RIN'] },
    potenziale: 10,
    svincolo: [[55, 'comune'], [65, 'raro'], [Infinity, 'leggendario']],
  },
  mercato: {
    lista: { quanti: 6, rinnovo: 5 },
    osservatore: { sconto: .2, fasce: { bassa: .3, media: .6, alta: 1 } },
    agente: { vittorie: 1, diamanti: 25 },
    offerte: { quante: 2, diamanti: 30, ore: 24 },
  },
  diamanti: { serie: [4, 5, 6, 7, 8, 10, 16], settimana: 15, promozione: 25, coppa: 20, fisio: 10 },
  strutture: {
    costi: [300, 800, 2000, 5000, 12000], diamanti: [0, 0, 0, 20, 40],
    centro: { moduli: [4, 5, 6, 7, 8, 8], riscaldamento: [1, 1, 1, 2, 2, 3], allenatori: 1 },
    infermeria: .1, foresteria: [22, 24, 26, 28, 30, 32], commerciale: .1, osservatori: .1, curva: .01,
    stadio: { posti: [500, 1000, 2000, 3500, 6000, 10000], incasso: [0, .1, .2, .3, .45, .6] },
  },
  percorso: {
    perLivello: 40, punti: { partita: 10, vinta: 10, sfidaD: 5, sfidaW: 15, sfidaS: 20, sfidaC: 20, turno: 15 },
    premi: [{ v: .7 }, { g: 4 }, { v: .7 }, { g: 4 }, { a: 'raro' }, { g: 4 }, { v: .7 }, { g: 4 }, { v: .7 }, { g: 10 },
      { v: .7 }, { g: 4 }, { v: .7 }, { g: 4 }, { a: 'raro' }, { g: 4 }, { v: 1 }, { g: 4 }, { v: 1 }, { g: 18 }],
  },
  finanze: [[3, 'Scarse'], [10, 'Discrete'], [30, 'Buone'], [Infinity, 'Eccellenti']],
  storico: 120,
  scenario: { g: 15 },
  energia: {
    recupero: 35, riscaldamento: { bonus: .05, vittorie: .5 },
    fisio: { piccolo: { energia: 20, vittorie: .5 }, medio: { energia: 50, vittorie: 1 }, completo: { energia: 100, vittorie: 2 } },
  },
  negozio: {
    avatar: { g: 10 }, cornice: { g: 10 }, scarpini: { g: 10 }, pallone: { g: 10 }, disegno: { g: 20 }, terza: { g: 30 },
    stemma: { m: 300 }, stemmaRaro: { g: 5 },
  },
};


// ---------- Ritratti dei giocatori (home) ----------
// I ritratti sono resi una volta sola con Blender (docs/ritratti.md) e composti dal gioco: la testa del giocatore, sopra
// la maglia coi colori della sua squadra, in cima i capelli che cadono davanti alla maglia. Questi numeri devono
// restare uguali a quelli di scripts/blender/render_ritratti.py e scripts/ritratti_webp.py.
// cartella: dove stanno i file. lato: le due misure dei file.
// taglio: la parte del ritratto che entra nella carta (da dove parte, di lato e dall'alto, quanto è larga e quanto è
//   alta, in parti dell'immagine) e da quale misura di file si prende. `piccolo` è per le carte piccole dei campi
//   stretti, dove il viso riempie lo scudo. `carta` e `scheda` sono lo stesso ritaglio, alto e stretto, della carta
//   grande (misure prese dalla foto di riferimento di Alex): la testa larga il 63% del ritaglio, i capelli in cima, il
//   mento all'82% dell'altezza, sotto collo e maglia. `scheda` lo prende dal file grande.
// mappa: i metri coperti dalla mappa della maglia, di lato e in altezza rispetto agli occhi. occhi: a che altezza stanno
//   gli occhi sul calciatore della partita, per usare gli stessi disegni delle sue maglie (src/divisa.js).
// bianco: la luce della stoffa bianca più chiara (vale come bianco pieno). ombre: quanto si approfondiscono le pieghe.
// filo: quanta luce tengono i colori scuri, perché le pieghe si vedano anche sul nero.
// scolli: quale maglia per ogni colletto della partita (il colletto piccolo non c'è ancora: per ora è un girocollo).
// insieme: quanti ritratti si compongono per volta, per non fermare la schermata.
export const RITRATTI = {
  cartella: 'img/ritratti/', lato: { piccolo: 256, grande: 512 }, taglio: { piccolo: { x: .18, y: .055, largo: .64, alto: .64, lato: 'piccolo' }, carta: { x: .24, y: .025, largo: .6, alto: .726, lato: 'piccolo' }, scheda: { x: .24, y: .025, largo: .6, alto: .726, lato: 'grande' } },
  mappa: { x: [-.6, .6], z: [-.5, .1] }, occhi: 1.65,
  bianco: .86, ombre: 2.2, filo: .07,
  scolli: { giro: 'girocollo', v: 'v', polo: 'girocollo' },
  insieme: 4,
};
// Carta grande del giocatore: larghezza diviso altezza della cornice, misurata sulla foto di riferimento di Alex
// (docs/carte-giocatori.md). Le altre proporzioni della carta sono nello stile (src/casa/stile.css).
export const CARTA_GRANDE = { forma: .737 };
// La schermata Squadra (docs/navigazione.md §3.3), con le misure date da Alex il 23/11.
// carta: quanto è larga una carta, in parti della larghezza dello schermo (uguale in campo e tra i sostituti).
// stretto: la mezza larghezza del campo in alto, in percento (in basso è 50): il lato alto è il 55% di quello basso.
// trascina: di quanti punti deve muoversi il dito perché una carta o un incarico cominci a seguirlo.
// lungo: dopo quanti millesimi un dito fermo su una carta apre la scheda del giocatore.
export const SQUADRA = { carta: .055, stretto: 27.5, trascina: 10, lungo: 520 };
// ---------- Valutazioni mostrate (home, carte dei giocatori, mercato) ----------
// La forza usata in partita non cambia: qui si decide solo che numero si vede. Funzioni in src/dati/scala.js.
// interno: la scala di lavoro, dal giocatore più debole al più forte del suo reparto (portieri, difensori,
//   centrocampisti, attaccanti).
// punti: la conversione, UNA sola per valutazione e statistiche: coppie [valore interno, numero mostrato] unite da
//   segmenti. È sempre crescente, quindi l'ordine di forza resta quello. Per il Campionato Sammarinese: quasi tutti tra
//   55 e 75, i migliori tra 76 e 82, oltre 85 solo chi si allena molto.
// stat: il minimo e il massimo di una statistica mostrata. rumore: di quanto una statistica si scosta, giocatore per
//   giocatore, dal profilo del suo ruolo.
// fasce: il colore della carta dice la rarità. Da che valutazione la carta è azzurra (i rari) e da quale è oro (i
//   più forti: tutti i capitani che si possono ingaggiare); sotto è bronzo. Si parte con una rosa di bronzi e il capitano
//   d'oro, e con le stagioni si sale. cerchio: da che valutazione il cerchio della carta è verde (sotto è rosso).
// colori: da che valore una statistica è gialla e da quale è verde (sotto è rossa).
// capitani: tra quali valutazioni stanno i candidati di «Ingaggia il tuo capitano» e quanti sono.
// basso: il valore interno di chi ha quotazione 1. Serve ai giocatori inventati delle divisioni sotto il Campionato
//   Sammarinese, più deboli del più debole giocatore vero: sotto il minimo vero la quotazione scende fino a 1.
export const SCALA = {
  interno: [55, 88],
  punti: [[30, 42], [55, 55], [65, 60], [72, 64], [78, 68], [82, 71], [85, 75], [88, 82], [100, 90]],
  stat: [30, 99],
  rumore: 5,
  fasce: { azzurro: 60, oro: 70 },
  cerchio: 60,
  colori: [60, 72],
  capitani: { min: 70, max: 78, quanti: 9 },
  basso: 20,
};
// Carte dei giocatori: le otto statistiche (portieri e giocatori di movimento) e, ruolo per ruolo, quanto pesa ogni
// statistica nella valutazione (pesi) e come è fatto in media chi gioca lì (doti, in punti della scala interna).
// simili: coppie di ruoli vicini, dove un giocatore rende quasi uguale (avviso leggero invece di «fuori ruolo»).
// posto: come si legge il ruolo di un posto dalle posizioni del modulo (FORMS, campo di 100 × 64): oltre `largo` di
//   lato è un esterno (`largoC` per i centrocampisti), un esterno di centrocampo più indietro di `basso` è un terzino,
//   un centrocampista più indietro di `cdc` è un mediano e più avanti di `coc` un trequartista.
// migliore: come «Squadra migliore» sceglie gli undici. Dalla valutazione toglie `vicino` punti a chi gioca in un ruolo
//   vicino al suo, `fuori` a chi è fuori ruolo, ed `energia` per ogni punto di energia che gli manca.
// sinistri: la parte di giocatori mancini. altezze: tra quali centimetri sta un giocatore inventato di ogni reparto.
export const CARTE = {
  chiavi: { P: ['PAR', 'RIF', 'POS', 'USC', 'PRE', 'RIN', 'PAS', 'VEL'], G: ['VEL', 'ACC', 'RES', 'POT', 'CON', 'PAS', 'TIR', 'DIF'] },
  ruoli: {
    POR: { reparto: 'P', pesi: { PAR: 6, RIF: 5, POS: 4, USC: 3, PRE: 2 }, doti: { PAR: 3, RIF: 2, USC: -2, PRE: -1, RIN: -6, PAS: -14, VEL: -18 } },
    DC: { reparto: 'D', pesi: { DIF: 8, POT: 5, RES: 4, VEL: 2, PAS: 1 }, doti: { VEL: -6, ACC: -8, RES: 2, POT: 6, CON: -8, PAS: -5, TIR: -20, DIF: 6 } },
    TS: { reparto: 'D', pesi: { DIF: 6, RES: 4, VEL: 4, POT: 2, PAS: 2, ACC: 2 }, doti: { VEL: 4, ACC: 2, RES: 3, POT: -4, CON: -3, PAS: -1, TIR: -16, DIF: 2 } },
    TD: { reparto: 'D', pesi: { DIF: 6, RES: 4, VEL: 4, POT: 2, PAS: 2, ACC: 2 }, doti: { VEL: 4, ACC: 2, RES: 3, POT: -4, CON: -3, PAS: -1, TIR: -16, DIF: 2 } },
    CDC: { reparto: 'C', pesi: { PAS: 5, DIF: 5, CON: 4, RES: 4, POT: 2 }, doti: { VEL: -5, ACC: -4, RES: 4, POT: 2, PAS: 2, TIR: -10, DIF: 3 } },
    CC: { reparto: 'C', pesi: { PAS: 7, CON: 6, RES: 5, TIR: 1, DIF: 1 }, doti: { VEL: -3, ACC: -2, RES: 3, POT: -3, CON: 2, PAS: 4, TIR: -6, DIF: -6 } },
    COC: { reparto: 'C', pesi: { CON: 7, PAS: 6, TIR: 4, RES: 2, ACC: 1 }, doti: { ACC: 2, RES: -3, POT: -6, CON: 5, PAS: 4, TIR: 1, DIF: -16 } },
    AS: { reparto: 'A', pesi: { VEL: 6, CON: 5, TIR: 4, ACC: 3, PAS: 2 }, doti: { VEL: 5, ACC: 5, RES: -2, POT: -8, CON: 3, PAS: -2, TIR: -1, DIF: -20 } },
    AD: { reparto: 'A', pesi: { VEL: 6, CON: 5, TIR: 4, ACC: 3, PAS: 2 }, doti: { VEL: 5, ACC: 5, RES: -2, POT: -8, CON: 3, PAS: -2, TIR: -1, DIF: -20 } },
    ATT: { reparto: 'A', pesi: { TIR: 8, VEL: 4, CON: 4, POT: 3, ACC: 1 }, doti: { VEL: 1, RES: -3, POT: 3, PAS: -6, TIR: 5, DIF: -22 } },
  },
  simili: [['TS', 'TD'], ['AS', 'AD'], ['DC', 'CDC'], ['CDC', 'CC'], ['CC', 'COC'], ['TS', 'AS'], ['TD', 'AD'], ['COC', 'AS'], ['COC', 'AD'], ['COC', 'ATT'], ['AS', 'ATT'], ['AD', 'ATT']],
  posto: { largo: 15, largoC: 17, basso: -14, cdc: -16.5, coc: -5 },
  sinistri: .24,
  altezze: { P: [183, 195], D: [176, 192], C: [170, 186], A: [170, 190] },
  migliore: { vicino: 2, fuori: 8, energia: .12 },
};

// Orario e tempo delle partite, mostrati nella Sfida. orari: a che ora si gioca e se in campo è giorno o notte.
// cieli: com'è il cielo, solo da mostrare, perché in partita non piove. gradi: la temperatura più bassa e la più alta.
export const METEO = {
  orari: [['15:00', 'giorno'], ['18:00', 'notte'], ['20:45', 'notte'], ['21:00', 'notte']],
  cieli: ['sereno', 'sereno', 'pocoNuvoloso', 'nuvoloso'],
  gradi: [8, 26],
};
