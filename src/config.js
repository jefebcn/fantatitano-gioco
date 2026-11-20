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
export const HALF_SECS = 120;
export const DIFF = {
  facile:    { spd: .88, steal: .7,  save: .58, err: 1.7, think: .6, wait: 1.2, slide: 1.5 },
  normale:   { spd: .97, steal: 1.25, save: .7, err: 1.0, think: .4, wait: 1.0, slide: 4 },
  difficile: { spd: 1.04, steal: 1.9, save: .87, err: .6, think: .26, wait: .6, slide: 6 },
};
export const MATE = { spd: 1, steal: .95, save: .72, err: 1, think: .4, wait: .9, slide: 4 };
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
// distanza massima per tirare di testa, quante respinte del portiere finiscono in angolo, da quanti metri chi attacca va incontro
// al cross e quanto più lontano arriva staccando in corsa
// Calci piazzati che nascono dal gioco: il difensore che devia in area un pallone degli avversari lo manda in angolo con
// probabilità deviaAngolo; di testa, in area e con l'attaccante addosso, testaAngolo; la respinta del portiere può finire in
// angolo se il pallone arriva a meno di respintaLato metri dal palo; chi passa non vede il fuorigioco sotto vedeFuori metri;
// un attaccante su tre, a tratti di 2-5 s, resta oltre la linea di `oltre` metri
export const CALCI = { deviaAngolo: .4, testaAngolo: .35, respintaLato: 3.2, vedeFuori: 1.4, distratto: .35, oltre: [.8, 2] };
// (altezze per giocatori di 1,80 m: salto è l'altezza oltre cui si stacca per colpire, bersaglio quella a cui mira un cross,
// intercetta e stop fin dove un giocatore arriva sul pallone con la testa e col petto, scende l'altezza minima di un pallone che cade forte)
export const AIR = { low: 1.05, top: 2.4, reach: .8, salto: 1.5, bersaglio: 1.4, intercetta: 1.5, stop: 1.15, scende: .7, fast: 22.6, wide: 13, deep: 24, cross: .5, shot: 15, behind: .55, attacca: 6, stacco: .1 };
// Moduli: dove sta ciascuno degli undici e che compito ha (P portiere, D difensore, C centrocampista, A attaccante).
// Nei dati l'ordine è sempre portiere, quattro difensori, tre centrocampisti, tre attaccanti: cambiando modulo qualcuno cambia compito
export const FORMS = {
  '4-3-3': { pos: [[-46, 0], [-30, -20], [-33, -7], [-33, 7], [-30, 20], [-13, -14], [-17, 0], [-13, 14], [7, -19], [11, 0], [7, 19]], roles: 'PDDDDCCCAAA' },
  '4-4-2': { pos: [[-46, 0], [-30, -20], [-33, -7], [-33, 7], [-30, 20], [-15, -7], [-15, 7], [-11, -21], [-11, 21], [9, -6], [9, 6]], roles: 'PDDDDCCCCAA' },
  '3-5-2': { pos: [[-46, 0], [-33, -12], [-35, 0], [-33, 12], [-16, -23], [-18, 0], [-9, -9], [-9, 9], [-16, 23], [9, -6], [9, 6]], roles: 'PDDDCCCCCAA' },
  '4-2-3-1': { pos: [[-46, 0], [-30, -20], [-33, -7], [-33, 7], [-30, 20], [-19, -7], [-19, 7], [-3, 0], [1, -20], [11, 0], [1, 20]], roles: 'PDDDDCCCAAA' },
};
// le posizioni qui sopra sono scritte per un campo di 100 × 64: si allargano in proporzione al campo vero
for (const f of Object.values(FORMS)) f.pos = f.pos.map(([x, z]) => [x * HL / 50, z * HW / 32]);
// Mentalità (-1, 0, 1): quanti metri in più si sale quando si attacca, quanto restano alti gli attaccanti quando si difende
// (con la difensiva rientrano), quanto spesso ci si inserisce, quanto prima si va sul pallone con l'offensiva;
// con la difensiva: a quanti metri dal portatore sta il secondo uomo in copertura, quanti metri prima si smette di temporeggiare
// Pressing senza palla: da dove (metri dalla metà campo verso la porta avversaria, mentalità equilibrata) si va sul portatore;
// il secondo uomo raddoppia quando il primo è a meno di `primo` metri dal portatore e lui a meno di `raggio`, stringendo a
// `stretto` metri
export const PRESSING = { da: 18, primo: 3.5, raggio: 16, stretto: 2.2 };
export const MENT = { names: ['Difensiva', 'Equilibrata', 'Offensiva'], push: 4, stay: 6, runs: .3, press: .4, cover: 12, guard: 3, hold: 14, back: 9 };

/* ---------------------------------------------------------------- telecamera di gioco */
// Misure prese da Alex sui suoi screenshot di riferimento. alto e dietro: dove sta la telecamera rispetto al punto
// inquadrato, in metri (dietro è verso la linea laterale vicina). inclina: gradi verso il basso, fissi. campoOriz: angolo
// orizzontale in gradi, uguale su ogni schermo (su un telefono 19,5:9 in orizzontale sono 28° in verticale). seguiX e
// seguiZ: quanto il punto inquadrato segue il pallone lungo il campo e in profondità. Scelte nostre, da confrontare coi
// video: molla è la prontezza con cui segue (più alta, meno ritardo) e bordoX i metri dalla linea di fondo a cui si ferma.
export const CAMERA = { alto: 12.5, dietro: 37, inclina: 21, campoOriz: 56.8, seguiX: 1, seguiZ: .45, molla: 6, bordoX: 16 };

/* ---------------------------------------------------------------- comandi dell'utente */
// Come nei giochi di calcio col joystick: poco inclinata si cammina, a metà si corricchia, tutta si corre (lo scatto è un tasto).
// Tra un'andatura e l'altra il passaggio è morbido, così si può dosare la velocità vicino all'avversario.
export const ANDATURA = { morta: .15, cammina: .3, corsetta: .62 };
// Passa, Cross e Tira si tengono premuti: la barra sotto il giocatore si riempie (in 0,8 s) e al rilascio parte il colpo
// con quella potenza. Un tocco veloce su Passa o Cross fa il passaggio dosato da solo, come prima.
export const CARICA = { piena: .8, tocco: .12, max: .95 };
// distanza a cui si vuole arrivare con una certa potenza (passaggio e lancio), e potenza giusta per una distanza
export const DIST = { pass: [5, 45], cross: [12, 30], lancio: [15, 40] };
// Secondi tra l'inizio del gesto e il momento in cui il piede colpisce il pallone (passaggio, tiro, lancio)
export const CARICO = { passa: .1, calcia: .14, lancia: .14 };

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

/* ---------------------------------------------------------------- portiere */
// Sotto queste altezze del pallone, in metri, cambia il gesto. tuffo: rasoterra, mezza altezza, busto e oltre alto. presa al
// centro: a terra, al ginocchio, al busto e oltre alta. uscita: da che altezza un cross è una presa alta. lancio: da che
// altezza parte il pallone lanciato con le mani. rinvio: a che altezza arriva il rinvio lungo
export const PARATA = { tuffo: [.3, .8, 1.25], presa: [.25, .6, 1.2], uscita: .9, lancio: 1.9, rinvio: 1.1 };
// Il portiere col pallone in mano. attesa: secondi prima di rimetterlo in gioco; braccio e piede: quanto prima parte
// l'animazione del lancio e del rinvio. corto: fin dove lancia con le mani, in metri. limite: quanto può avanzare dalla linea
export const RINVIO = { attesa: [1.3, 2.1], braccio: .63, piede: .3, corto: 30, limite: 14 };
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
 *  fermo:   sotto questa velocità si tiene la palla sotto la suola
 *  errore:  di quanto (radianti) può andare storto un tocco per chi ha la tecnica più bassa
 *  pausa:   tempo minimo tra due tocchi
 *  stretto: con un avversario addosso (p.pressato) il tocco si accorcia: la palla resta più vicina al piede
 *  ritmo:   col passo (p.ritmo, vedi corpo.js) il tocco parte quando un piede sta per scendere, anche un po' prima (fino a
 *           vicino + ritmo); tra un passo e l'altro aspetta, a meno che la palla non sia già sotto i piedi (forza)
 */
export const COND = { riprendi: 1.8, stretto: 0.9, forza: 0.3, ritmo: 0.35, vicino: 0.75, passo: 1.12, passoScatto: 1.2, perde: 3.2, fermo: 1.4, errore: 0.14, pausa: 0.2, suola: 0.55, girata: 0.6 };

/* ---------------------------------------------------------------- fisica dei giocatori */
export const CORPO = {
  acc: 12, // accelerazione da fermo (m/s²)
  accMin: 0.22, // quanta accelerazione resta vicino alla velocità massima (frazione di acc)
  frena: 17, // frenata massima (m/s²)
  lat: 30, // forza laterale massima per curvare, da fermo (m/s²)
  latV: 6, // velocità a cui la forza laterale si dimezza: più veloce, curva più larga
  latScatto: 0.75, // in scatto la curva si allarga ancora
  inverti: -0.35, // coseno sotto cui la direzione chiesta è "alle spalle": prima si frena
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
