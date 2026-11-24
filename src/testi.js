/* I testi della PARTITA che chi gioca legge stanno qui, in un file solo: tabellone, tasti, striscioni, pausa, sostituzioni,
   fine partita, regia. Il gioco oggi è solo in italiano. I testi della home stanno per ora in src/casa/testi.js, che ha la
   stessa forma (un elenco per lingua, t('chiave', valori)): per avere un file solo basta spostare quell'elenco qui dentro
   e cambiare l'import. Lo decide la sessione della home.

   COME SI AGGIUNGE L'INGLESE (o un'altra lingua)
   1. Copia tutto il blocco `it: { ... }` qui sotto e incollalo subito dopo, chiamandolo `en: { ... }`.
   2. Traduci solo quello che sta a destra dei due punti. Le chiavi a sinistra ('partita.fuorigioco', 'pausa.riprendi'...)
      non si toccano: sono i nomi con cui il gioco cerca i testi.
      - Dove c'è una funzione, per esempio (n, tot) => `Sostituzioni · ${n} di ${tot}`, si traducono le parole e si
        lasciano com'è i pezzi ${...}: sono le parti che cambiano (numeri, nomi). Si possono spostare nella frase.
      - Dove c'è un elenco ({ ... } oppure [ ... ]) si traducono solo i testi tra apici, non le sigle a sinistra, e
        l'elenco va copiato intero: se manca una voce, quella voce resta vuota.
      - I pezzi tra < e > (<b>, <br>, <span>) sono grassetti e a capo: restano dove stanno.
   3. Aggiungi 'en' a LINGUE, qui sotto: LINGUE = ['it', 'en'].
   4. Per provarla: impostaLingua('en') all'avvio (in src/game.js, prima di riempiTesti), poi ricaricare la pagina.
   Un testo che manca in inglese esce in italiano; se manca anche in italiano esce il nome della chiave (e nella console
   compare un avviso), così si vede subito cosa è rimasto indietro.
   Per controllare che cambiando qui non si sia rotto niente: scripts/prove/testi.cjs (controlla le chiavi; salva le
   scritte di una partita intera prima e dopo e le confronta).

   COSA NON STA QUI, E PERCHÉ
   - Quello che si vede prima che parta il gioco, scritto in src/pagina.html: il titolo della scheda del browser e la
     scritta «CARICAMENTO…». Nella pagina restano anche le lettere A, B, C dei tre tasti.
   - Nomi di squadre e giocatori: public/data.js.
   - Le scritte disegnate nello stadio (cartelloni, «GOL!» sui tabelloni) e sulle maglie.
   - I messaggi per chi sviluppa (console, ?debug, ?ia).

   Nel codice si usa t('chiave') o t('chiave', valori). In src/game.js e src/regia.js la funzione è importata col nome
   `tr`, perché lì `t` è già il nome di tante variabili (la squadra, il tempo). */

export const LINGUE = ['it'];

export const TESTI = {
  it: {
    /* ---------- telefono in verticale */
    'ruota.titolo': 'Ruota il telefono',
    'ruota.aiuto': 'Se non si gira, disattiva il blocco rotazione dal Centro di Controllo',
    /* ---------- comuni */
    'formato.decimale': ',',
    'comune.rigori': (a, b) => `(${a}-${b} rig.)`,
    'comune.piuMonete': (n) => `+${n} monete`,
    'ruoli.sigle': { P: 'POR', D: 'DIF', C: 'CEN', A: 'ATT' },
    'gare.coppa': 'Coppa Titano',
    'gare.castelli': 'Trofeo dei Castelli',
    'mentalita.nomi': ['Difensiva', 'Equilibrata', 'Offensiva'],
    'mentalita.hud': ['In difesa', 'Equilibrata', 'In attacco'],
    'tattica.ora': { giorno: '☀ Giorno', notte: '☾ Notte' },



    /* ---------- scelta delle squadre e pre-partita */
    'contro.vs': 'VS',

    /* ---------- in partita: tabellone, tasti, striscioni */
    'hud.piuDifensiva': 'Più difensiva',
    'hud.piuOffensiva': 'Più offensiva',
    'hud.portiere': 'Portiere',
    'hud.maglia': 'Maglia',
    'hud.pallone': 'Pallone',
    'hud.audio': 'Audio',
    'hud.replay': 'Replay',
    'hud.pausa': 'Pausa',
    'tasti.calcioAlto': 'Calcio alto',
    'tasti.calcioBasso': 'Calcio basso',
    'tasti.calcioForte': 'Calcio forte',
    'tasti.contrasto': 'Contrasto',
    'tasti.pressing': 'Pressing',
    'tasti.cambia': 'Cambia giocatore',
    'partita.calcioInizio': "Calcio d'inizio",
    'partita.fermo': { fuorigioco: 'Fuorigioco', fondo: 'Rimessa dal fondo', laterale: 'Rimessa laterale', angolo: "Calcio d'angolo", rigore: 'Rigore', punizione: 'Punizione' },
    'partita.cambio': (squadra, nome) => `Cambio ${squadra} · entra ${nome}`,
    'partita.intervallo': 'Intervallo',
    'partita.fine': 'Fine partita',
    'partita.miraRigore': 'Mira con la levetta e tira',
    'partita.rigore': 'Rigore!',
    'partita.vantaggio': 'Vantaggio',
    'partita.vantaggioAmmonito': (nome) => `Vantaggio · ammonito ${nome}`,
    'partita.infortunio': (nome) => `Infortunio · ${nome}`,
    'partita.espulso': 'Espulso!',
    'partita.rosso': (nome) => `Cartellino rosso · ${nome}`,
    'partita.ammonito': (nome) => `Ammonito · ${nome}`,
    'partita.calciDiRigore': 'Calci di rigore',
    'partita.rigoriHud': (tiriCasa, golCasa, golOspiti, tiriOspiti) => `${tiriCasa}  Rigori ${golCasa} - ${golOspiti}  ${tiriOspiti}`,
    'partita.rigoriTiro': (nome, a, b) => `${nome} · rigori ${a} - ${b}`,
    'partita.rigoriFine': (a, b) => `Rigori ${a} - ${b}`,
    'partita.gol': 'Gol!',
    'partita.parato': 'Parato!',
    'partita.fuori': 'Fuori!',
    'partita.golDi': (nome, minuto, squadra) => `${nome} ${minuto}' · ${squadra}`,
    'partita.autogol': (nome) => `Autogol${nome ? ` (${nome})` : ''}`,
    'regia.gol': 'Gol',
    'regia.autogol': 'Autogol',
    'regia.salta': 'Tocca per saltare',
    'regia.replay': 'Replay',
    'regia.assist': (nome) => `Assist · <b>${nome}</b>`,

    /* ---------- pausa e sostituzioni */
    'pausa.titolo': 'Pausa',
    'pausa.istruzioni': 'Levetta: muovi il giocatore, spinta fino al bordo <b>scatta</b><br>Con la palla: <b>Calcio forte</b> tiro · <b>Calcio basso</b> passaggio · <b>Calcio alto</b> lancio o cross<br>(tieni premuto: più a lungo, più forte)<br>Senza palla: <b>Contrasto</b> in scivolata · <b>Pressing</b> (tieni premuto) · <b>Cambia giocatore</b><br>Tastiera: frecce (Maiusc per non scattare), Spazio calcio forte, X calcio basso, C calcio alto<br>In campo: le frecce della mentalità sotto la mappa la cambiano',
    'pausa.sostituzioni': 'Sostituzioni',
    'pausa.riprendi': 'Riprendi',
    'pausa.esci': 'Esci dalla partita',
    'cambi.sostituzioni': 'Sostituzioni',
    'cambi.titolo': (fatti, massimo) => `Sostituzioni · ${fatti} di ${massimo}`,
    'cambi.finiti': 'Cambi finiti',
    'cambi.tocca': 'Tocca chi esce e chi entra',
    'cambi.inCampo': 'In campo',
    'cambi.panchina': 'Panchina',
    'cambi.infortunato': 'infortunato',
    'cambi.giaEntrato': 'già entrato',
    'cambi.fatto': (entra, esce) => `Entra ${entra}, esce ${esce}`,
    'cambi.portiere': 'Il portiere si cambia solo con un portiere',
    'cambi.no': 'Cambio non possibile',
    'cambi.ok': 'Fatto',

    /* ---------- fine partita */
    'fine.vittoria': 'Vittoria!',
    'fine.sconfitta': 'Sconfitta',
    'fine.pareggio': 'Pareggio',
    'fine.campioni': 'Campioni!',
    'fine.stagioneFinita': (posto) => `Stagione finita · ${posto}º posto`,
    'fine.campionatoOra': (posto) => `Campionato · ora sei ${posto}º`,
    'fine.avantiRigori': 'Avanti ai rigori!',
    'fine.fuoriRigori': 'Fuori ai rigori',
    'fine.tuo': (gara) => `${gara}: è tuo!`,
    'fine.superato': (gara, turno) => `${gara} · ${turno} superato`,
    'fine.eliminato': (gara, turno) => `${gara} · eliminato: ${turno}`,
    'fine.girone': (posto) => `Trofeo dei Castelli · ${posto}º nel girone`,
    'fine.gironeAiQuarti': ': ai quarti!',
    'fine.gironeEliminato': ': eliminato',
    'fine.tiri': 'Tiri',
    'fine.possesso': 'Possesso',
    'fine.falli': 'Falli',
    'fine.fuorigioco': 'Fuorigioco',
    'fine.migliore': 'Migliore in campo',
    'fine.pagelle': 'Pagelle',
    'fine.gol': 'gol',
    'fine.nGol': (n) => `${n} gol`,
    'fine.assist': 'assist',
    'fine.continua': 'Continua',
    'fine.rivincita': 'Rivincita',
    'fine.cambia': 'Cambia squadre',














  },
};

let lingua = 'it';
const avvisati = new Set();

/** Il testo di una chiave nella lingua corrente. Se lì manca si usa l'italiano; se manca del tutto torna la chiave. */
export function t(chiave, ...valori) {
  let v = (TESTI[lingua] || TESTI.it)[chiave];
  if (v === undefined) v = TESTI.it[chiave];
  if (v === undefined) {
    if (!avvisati.has(chiave)) { avvisati.add(chiave); if (typeof console !== 'undefined') console.warn(`testi: manca la chiave «${chiave}»`); }
    return chiave;
  }
  return typeof v === 'function' ? v(...valori) : v;
}

/** Cambia la lingua (solo tra quelle in LINGUE che hanno il loro blocco in TESTI). Dice se l'ha cambiata. */
export function impostaLingua(codice) {
  if (!LINGUE.includes(codice) || !TESTI[codice]) return false;
  lingua = codice; return true;
}

/** La lingua in uso. */
export const linguaCorrente = () => lingua;
