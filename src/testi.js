/* Tutti i testi che chi gioca legge stanno qui, in un file solo. Il gioco oggi è solo in italiano.

   COME SI AGGIUNGE L'INGLESE (o un'altra lingua)
   1. Copia tutto il blocco `it: { ... }` qui sotto e incollalo subito dopo, chiamandolo `en: { ... }`.
   2. Traduci solo quello che sta a destra dei due punti. Le chiavi a sinistra ('home.sfide', 'negozio.titolo'...) non si
      toccano: sono i nomi con cui il gioco cerca i testi.
      - Dove c'è una funzione, per esempio (n, tot) => `Livello ${n} di ${tot}`, si traducono le parole e si lasciano
        com'è i pezzi ${...}: sono le parti che cambiano (numeri, nomi). Si possono spostare nella frase.
      - Dove c'è un elenco ({ ... } oppure [ ... ]) si traducono solo i testi tra apici, non le sigle a sinistra, e
        l'elenco va copiato intero: se manca una voce, quella voce resta vuota.
      - I pezzi tra < e > (<b>, <br>, <span>) sono grassetti e a capo: restano dove stanno.
   3. Aggiungi 'en' a LINGUE, qui sotto: LINGUE = ['it', 'en'].
   4. Per provarla: impostaLingua('en') all'avvio (in src/game.js, prima di riempiTesti). Il selettore nelle impostazioni
      oggi mostra solo «Italiano»: quando ci sarà la seconda lingua va collegato a impostaLingua e la pagina ricaricata.
   Un testo che manca in inglese esce in italiano; se manca anche in italiano esce il nome della chiave (e nella console
   compare un avviso), così si vede subito cosa è rimasto indietro.
   Per controllare che cambiando qui non si sia rotto niente: scripts/prove/testi.cjs (salva i testi di tutte le schermate
   prima e dopo e li confronta).

   COSA NON STA QUI, E PERCHÉ
   - Quello che si vede prima che parta il gioco, scritto in src/pagina.html: il titolo della scheda del browser
     («Fantatitano — La Partita (prototipo)») e la scritta «CARICAMENTO…». Sempre nella pagina restano i nomi propri
     («Fantatitano», «Tito» nelle descrizioni delle immagini) e le lettere A, B, C dei tre tasti.
   - Nome e nome breve dell'app installata: public/manifest.webmanifest. «‹ Fantatitano» per tornare all'app: public/casa.js.
   - Nomi di squadre e giocatori: public/data.js.
   - Le scritte disegnate nello stadio (cartelloni, «GOL!» sui tabelloni) e sulle maglie.
   - I messaggi per chi sviluppa (console, ?debug, ?ia).
   - I codici che il gioco salva nella carriera: il tipo dei trofei ('Campionato', 'Coppa Titano', 'Trofeo dei Castelli')
     resta in italiano nel salvataggio e si traduce quando si mostra ('trofei.nomi'). Le descrizioni dei movimenti di
     monete e diamanti vengono scritte nella carriera nella lingua del momento: quelle già salvate non cambiano lingua.

   Nel codice si usa t('chiave') o t('chiave', valori). In src/game.js, src/carriera.js e src/regia.js la funzione è
   importata col nome `tr`, perché lì `t` è già il nome di tante variabili (la squadra, il tempo). */

export const LINGUE = ['it'];

export const TESTI = {
  it: {
    /* ---------- comuni */
    'lingua.nome': 'Italiano',
    'formato.locale': 'it-IT',
    'formato.decimale': ',',
    'tempo.giorniOre': (g, h) => `${g}g ${h}h`,
    'tempo.oreMinuti': (h, m) => `${h}h ${m}m`,
    'comune.indietro': '‹ Indietro',
    'comune.inCasa': 'in casa',
    'comune.inTrasferta': 'in trasferta',
    'comune.rigori': (a, b) => `(${a}-${b} rig.)`,
    'comune.piuMonete': (n) => `+${n} monete`,
    'comune.piuDiamanti': (n) => `+${n} diamanti`,
    'comune.servonoMonete': 'Servono più monete',
    'comune.servonoDiamanti': 'Servono più diamanti',
    'comune.servonoMoneteDiamanti': 'Servono più monete o diamanti',
    'ruoli.sigle': { P: 'POR', D: 'DIF', C: 'CEN', A: 'ATT' },
    'doti.sigle': { PAR: 'PAR', RIF: 'RIF', PRE: 'PRE', POS: 'POS', RIN: 'RIN', PAS: 'PAS', VEL: 'VEL', POT: 'POT', ACC: 'ACC', RES: 'RES', CON: 'CON', TIR: 'TIR', DIF: 'DIF' },
    'forma.sigle': { v: 'V', n: 'N', p: 'P' },
    'gare.coppa': 'Coppa Titano',
    'gare.castelli': 'Trofeo dei Castelli',
    'gare.gioca': (turno, avversaria) => `Gioca · ${turno} contro ${avversaria}`,
    'coppa.turni': ['Ottavi di finale', 'Quarti di finale', 'Semifinale', 'Finale'],
    'castelli.turni': ['Quarti di finale', 'Semifinale', 'Finale'],
    'castelli.gironiGiornata': (n, tot) => `Gironi · giornata ${n} di ${tot}`,
    'trofei.nomi': { Campionato: 'Campionato', 'Coppa Titano': 'Coppa Titano', 'Trofeo dei Castelli': 'Trofeo dei Castelli' },
    'difficolta.facile': 'Facile',
    'difficolta.normale': 'Normale',
    'difficolta.difficile': 'Difficile',
    'difficolta.minuscole': { facile: 'facile', normale: 'normale', difficile: 'difficile' },
    'mentalita.nomi': ['Difensiva', 'Equilibrata', 'Offensiva'],
    'mentalita.hud': ['In difesa', 'Equilibrata', 'In attacco'],
    'tattica.ora': { giorno: '☀ Giorno', notte: '☾ Notte' },
    'finanze.giudizi': { scarse: 'Scarse', discrete: 'Discrete', buone: 'Buone', eccellenti: 'Eccellenti' },

    /* ---------- schermata iniziale */
    'menu.sottotitolo': 'La Partita <span>PROTOTIPO</span>',
    'menu.inizia': 'Inizia la carriera',
    'menu.continua': 'Continua la carriera',
    'menu.amichevole': 'Amichevole',
    'menu.accedi': "Accedi con l'account Fantatitano",
    'menu.connesso': (nome) => `Connesso come ${nome}`,
    'menu.nota': 'Crea il tuo club, ingaggia un capitano e gioca campionato, Coppa Titano e Trofeo dei Castelli',

    /* ---------- nuovo club e personalizzazione */
    'nuovo.titolo': 'Il tuo club',
    'nuovo.titoloModifica': 'Personalizza il club',
    'nuovo.tuoNome': 'Il tuo nome',
    'nuovo.nomeBase': 'Mister',
    'nuovo.nomeClub': 'Nome del club',
    'nuovo.nomiClub': ['Titani FC', 'Real Montale', 'Atletico Borgo', 'Sporting Serravalle', 'Libera Acquaviva', 'Rocca United', 'Guaita Calcio', 'Cesta FC', 'Dogana Stars', 'Chiesanuova FC', 'Torri Unite', 'Olimpia Titano'],
    'nuovo.nomeACaso': 'Nome a caso',
    'nuovo.sigla': 'Sigla',
    'nuovo.siglaEsempio': 'TIT',
    'nuovo.siglaBase': 'MIO',
    'nuovo.colori': 'Colori',
    'nuovo.disegno': 'Disegno',
    'nuovo.stili': { '': 'Tinta unita', righe: 'Righe', righine: 'Righine', fasce: 'Fasce', onde: 'Onde', banda: 'Banda', diagonale: 'Diagonale', meta: 'Metà', quarti: 'Quarti', terzi: 'Terzi', scacchi: 'Scacchi', v: 'V', chevron: 'Chevron', petto: 'Fascia sul petto', spalle: 'Spalle', maniche: 'Maniche', fianchi: 'Fianchi', sfumata: 'Sfumata', mimetica: 'Mimetica', pennellata: 'Pennellata' },
    'nuovo.collettoManiche': 'Colletto e maniche',
    'nuovo.colletti': { giro: 'Girocollo', v: 'Scollo a V', polo: 'Polo' },
    'nuovo.raglan': 'Maniche raglan',
    'nuovo.salva': 'Salva',
    'nuovo.avanti': 'Avanti: il capitano',
    'nuovo.ilClub': '‹ Il club',
    'nuovo.titoloCapitano': 'Ingaggia il tuo capitano',
    'nuovo.ingaggia': (nome) => `Ingaggia ${nome}`,
    'nuovo.toccaGiocatore': 'Tocca un giocatore',
    'nuovo.aggiornato': 'Club aggiornato',
    'nuovo.benvenuto': (nome, capitano) => `Benvenuto, ${nome}: ${capitano} è il tuo capitano`,
    'nuovo.soloCreato': "Si personalizza il club creato all'inizio della carriera",

    /* ---------- scelta delle squadre e pre-partita */
    'scelta.tua': 'Scegli la tua squadra',
    'scelta.avversaria': "Scegli l'avversaria",
    'scelta.pronto': 'Tutto pronto',
    'scelta.passo1': 'Passo 1 di 2',
    'scelta.passo2': 'Passo 2 di 2',
    'scelta.avanti': 'Avanti',
    'pre.squadre': '‹ Squadre',
    'pre.amichevole': 'Amichevole',
    'pre.amichevoleDiff': (difficolta) => `Amichevole · ${difficolta}`,
    'pre.campionato': (n, tot) => `Campionato · giornata ${n} di ${tot}`,
    'pre.rosa': 'La mia rosa',
    'pre.gioca': 'Gioca',
    'pre.titolari': 'Titolari',
    'pre.riserve': 'Riserve',
    'pre.nessunaRiserva': 'Nessuna riserva',
    'pre.scambiaNota': 'Tocca un titolare e una riserva dello stesso ruolo per scambiarli',
    'pre.titolare': (nome) => `${nome} è titolare`,
    'pre.stessoRuolo': 'Devono avere lo stesso ruolo',
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
    'pausa.istruzioni': 'Levetta: muovi il giocatore, spinta fino al bordo <b>scatta</b><br>Con la palla: <b>Calcio forte</b> tiro · <b>Calcio basso</b> passaggio · <b>Calcio alto</b> lancio o cross<br>(tieni premuto: più a lungo, più forte)<br>Senza palla: <b>Calcio forte</b> scivolata · <b>Pressing</b> (tieni premuto) · <b>Cambia giocatore</b><br>Tastiera: frecce (Maiusc per non scattare), Spazio calcio forte, X calcio basso, C calcio alto<br>In campo: le frecce della mentalità sotto la mappa la cambiano',
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

    /* ---------- home della carriera */
    'home.settimana': 'Settimana',
    'home.premi': 'Premi',
    'home.ariaDiamanti': 'Diamanti: come guadagnarli',
    'home.ariaMonete': 'Monete: come guadagnarle',
    'home.ariaIniziale': 'Schermata iniziale',
    'home.ariaImpostazioni': 'Impostazioni',
    'home.ariaInfo': 'Come si gioca',
    'home.ariaNotifiche': 'Notifiche',
    'home.campionato': 'Campionato',
    'home.partitaDi': (n, tot) => `Partita ${n} di ${tot}`,
    'home.campioneTu': (posto) => `Campione · tu ${posto}º`,
    'home.toccaNuovaStagione': 'Tocca per la nuova stagione',
    'home.giocaAdesso': 'Gioca<br>adesso',
    'home.nuovaStagione': 'Nuova<br>stagione',
    'home.matchday': 'Matchday',
    'home.primaGiornata': 'Prima giornata',
    'home.classifica': (stagione) => `Classifica generale · stagione ${stagione}`,
    'home.colonne': { g: 'G', squadra: 'Squadra', dr: 'DR', punti: 'PUNTI' },
    'home.prossimaPartita': 'Prossima partita',
    'home.castelliVinto': 'Vinto!',
    'home.castelliFinito': 'Trofeo finito',
    'home.castelliTuo': 'Il trofeo è tuo',
    'home.castelliFuori': (vincitore, dove) => `Lo vince ${vincitore} · tu fuori ${dove}`,
    'home.aiGironi': 'ai gironi',
    'home.coppaVinta': 'Vinta!',
    'home.coppaFinita': 'Coppa finita',
    'home.coppaTua': 'La coppa è tua',
    'home.coppaFuori': (vincitore, turno) => `La vince ${vincitore} · tu fuori: ${turno}`,
    'home.sfide': 'Sfide',
    'home.anelli': { d: 'Oggi', w: 'Sett.', c: 'Carriera', s: 'Stagione' },
    'home.squadra': 'Squadra',
    'home.capitano': 'Capitano',
    'home.migliore': 'Il migliore',
    'home.trasferimenti': 'Trasferimenti',
    'home.mercato': 'Mercato',
    'home.mercatoNota': 'Rinforza la squadra: scambia i tuoi giocatori con quelli delle altre.',
    'home.mioClub': 'Il mio club',
    'home.stadio': 'Stadio',
    'home.allenatore': 'Allenatore',
    'home.stemma': 'Stemma',
    'home.finanze': 'Finanze',

    /* ---------- classifica, coppa, trofeo */
    'classifica.titolo': (stagione) => `Campionato · stagione ${stagione}`,
    'classifica.colonne': { squadra: 'Squadra', g: 'G', v: 'V', n: 'N', p: 'P', gf: 'GF', gs: 'GS', dr: 'DR', pt: 'PT' },
    'classifica.prossima': 'prossima',
    'classifica.giornata': (n) => `Giornata ${n}: tutti i risultati`,
    'classifica.calendario': 'Il tuo calendario',
    'coppa.vuota': 'La coppa comincia dagli ottavi di finale: sedici squadre, partita secca, rigori in caso di parità.',
    'castelli.nota': 'Quattro gironi da quattro, tre giornate: le prime due vanno ai quarti, poi semifinale e finale con i rigori in caso di parità.',
    'castelli.girone': (lettera) => `Girone ${lettera}`,

    /* ---------- sfide */
    'sfide.titolo': 'Sfide',
    'sfide.gruppi': { d: 'Giornaliere', w: 'Settimanali', c: 'Carriera', s: 'Stagione' },
    'sfide.testi': {
      d1: 'Gioca una partita', d2: 'Vinci una partita', d3: 'Segna 3 gol', d4: 'Chiudi una partita senza subire gol', d5: 'Gioca una partita di coppa',
      w1: 'Vinci 5 partite', w2: 'Segna 12 gol', w3: 'Gioca 3 partite di coppa', w4: 'Compra un giocatore al mercato', w5: 'Fai 3 sedute di allenamento',
      c1: 'Vinci il campionato', c2: 'Vinci la Coppa Titano', c3: 'Vinci il Trofeo dei Castelli', c4: 'Porta lo stadio al livello 3',
      s1: 'Vinci 5 partite di campionato', s2: 'Vinci 10 partite di campionato', s3: 'Chiudi il campionato tra le prime 4', s4: 'Segna 25 gol in campionato',
      s5: 'Arriva ai quarti di Coppa Titano', s6: 'Passa i gironi del Trofeo dei Castelli', s7: 'Chiudi 3 partite senza subire gol', s8: 'Vinci 3 partite di fila',
    },
    'sfide.riscuoti': 'Riscuoti',
    'sfide.riscuotiTutto': 'Riscuoti tutto',
    'sfide.tutteFatte': 'Tutte fatte',
    'sfide.ripartonoMezzanotte': 'Ripartono a mezzanotte',
    'sfide.ripartonoTra': (tempo) => `Ripartono tra ${tempo}`,
    'sfide.valgonoStagione': (stagione) => `Valgono per la stagione ${stagione}`,
    'sfide.unaVolta': 'Si fanno una volta sola',
    'sfide.niente': 'Niente da riscuotere: completa le sfide',
    'sfide.premioRiscosso': (premio) => `Premio riscosso: ${premio}`,
    'sfide.premiRiscossi': (premi) => `Premi riscossi: ${premi}`,

    /* ---------- il mio club: stadio, allenatore, allenamento, finanze */
    'club.schede': { stadio: 'Stadio', allenatore: 'Allenatore', allenamento: 'Allenamento', finanze: 'Finanze' },
    'club.negozio': 'Negozio',
    'club.personalizza': 'Personalizza',
    'club.amichevole': 'Amichevole',
    'club.stadioLivello': (livello, tot, posti) => `Livello ${livello} di ${tot} · ${posti} posti`,
    'club.stadioBonus': (monete) => `+${monete} monete a ogni partita in casa`,
    'club.stadioAmplia': (posti, bonus) => `Amplia a ${posti} posti (+${bonus} a partita)`,
    'club.stadioMassimo': 'Lo stadio è al massimo',
    'club.stadioAmpliato': (livello) => `Stadio ampliato: livello ${livello}`,
    'club.stadioGiaMassimo': 'Lo stadio è già al massimo',
    'club.allenatoreLivello': (livello, tot, voto) => `Allenatore · livello ${livello} di ${tot} · valutazione ${voto}`,
    'club.allenatoreSedute': (n) => `Fino a ${n} sedute di allenamento per giocatore`,
    'club.allenatoreSconto': (percento) => `sedute scontate del ${percento}%`,
    'club.allenatorePorta': (voto, percento) => `Porta l'allenatore a ${voto} (una seduta in più a testa, sconto ${percento}%)`,
    'club.allenatoreMassimo': "L'allenatore è al massimo",
    'club.allenatoreMigliorato': (voto) => `Allenatore migliorato: valutazione ${voto}`,
    'club.allenatoreGiaMassimo': "L'allenatore è già al massimo",
    'club.finanze': 'Finanze',
    'club.monete': 'Monete',
    'club.diamanti': 'Diamanti',
    'club.entrate': 'Entrate recenti',
    'club.uscite': 'Uscite recenti',
    'club.finanzeNota': (movimenti) => `Il giudizio dipende dal saldo in monete. Entrate e uscite contano gli ultimi ${movimenti} movimenti.`,
    'club.vediMovimenti': 'Vedi i movimenti e come guadagnare',
    'club.allenamentoNota': (massimo) => `Ogni seduta alza di un punto la quotazione del giocatore (fino a ${massimo} sedute a testa: un allenatore migliore ne permette di più).`,
    'club.sedute': (fatte, massimo) => `sedute ${fatte}/${massimo}`,
    'club.alMassimo': 'al massimo',
    'club.sale': (nome, valore) => `${nome} sale a ${valore}`,
    'club.giaAllenato': 'Già allenato al massimo',

    /* ---------- come si gioca */
    'info.titolo': 'Come si gioca',
    'info.inCampo': 'In campo',
    'info.inCampoTesto': 'Levetta a sinistra per muovere il giocatore. <b>Passa</b>, <b>Cross</b> e <b>Tira</b>: tieni premuto e la barra sotto il giocatore mostra la potenza (la tacca bianca è quella giusta per il compagno che punti, il rosso nel tiro manda la palla alta); un tocco veloce su Passa o Cross fa il passaggio dosato da solo. <b>Scatto</b> per correre. Senza palla: <b>Cambia</b> giocatore e <b>Scivolata</b> (da dietro è fallo). La scritta sopra la mappa cambia la mentalità; dalla pausa si fanno le sostituzioni.',
    'info.carriera': 'La carriera',
    'info.carrieraTesto': "Campionato a 16 squadre, Coppa Titano a eliminazione diretta e Trofeo dei Castelli a gironi. Le partite danno monete; le sfide e il percorso premi danno monete e diamanti. Con le monete si fanno scambi al mercato e sedute di allenamento; con monete e diamanti si migliorano l'allenatore e lo stadio, che rende di più a ogni partita in casa.",
    'info.salvataggio': 'Il salvataggio',
    'info.salvataggioTesto': "La carriera resta su questo dispositivo. Con l'accesso all'account Fantatitano si salva anche sull'account e si ritrova su un altro telefono: dentro l'app è automatico, qui si accede dal profilo in alto a destra.",
    'info.tastiera': 'Tastiera',
    'info.tastieraTesto': 'Frecce per muoversi, X passa, C cross, Spazio tira, Shift scatto, P pausa.',

    /* ---------- account e salvataggio */
    'account.titolo': 'Account',
    'account.connesso': (nome, email) => `Connesso come <b>${nome}</b>${email ? ` (${email})` : ''}. La carriera si salva anche sul tuo account.`,
    'account.salvaAdesso': 'Salva adesso',
    'account.esci': 'Esci',
    'account.spento': "Il salvataggio sull'account non è raggiungibile adesso: la carriera resta su questo dispositivo. Riprova più tardi.",
    'account.invito': "Accedi con l'account Fantatitano per salvare la carriera e ritrovarla su un altro telefono.",
    'account.email': 'Email',
    'account.password': 'Password',
    'account.accedi': 'Accedi',
    'account.crea': "Non hai un account? Crealo nell'app Fantatitano su <b>fantatitano.site</b>, poi torna qui.",
    'account.stati': { salvato: "Salvata sull'account", salvo: "Salvataggio sull'account…", errore: "Salvataggio sull'account non riuscito: si riprova alla prossima partita", pronto: "Collegato all'account" },
    'account.soloQui': "Solo su questo dispositivo: accedi per salvare sull'account",
    'account.ripresa': 'Ripresa la copia più avanti dal tuo account',
    'account.ritrovata': 'Carriera ritrovata dal tuo account',
    'account.due': 'Due carriere',
    'account.dueNota': "Sul tuo account c'è una carriera diversa da quella di questo telefono. Quale tieni? L'altra viene sostituita.",
    'account.dueRiga': (nome, stagione, giornata, trofei) => `${nome} · stagione ${stagione}, giornata ${giornata} · ${trofei} trofei`,
    'account.quellaAccount': "Quella dell'account",
    'account.quellaTelefono': 'Quella di questo telefono',
    'account.accesso': 'Accesso…',
    'account.accessoFatto': 'Accesso fatto',
    'account.uscito': 'Sei uscito: la carriera resta su questo dispositivo',
    'account.salvata': "Salvata sull'account",
    'account.nonSalvata': 'Salvataggio non riuscito',
    'account.tenutaAccount': "Tenuta la carriera dell'account",
    'account.tenutaTelefono': 'Tenuta la carriera di questo telefono',
    'account.erroreRete': 'Collegamento non riuscito: controlla la rete e riprova.',
    'account.erroreCredenziali': 'Email o password sbagliate.',
    'account.erroreConferma': "Conferma prima l'email dal messaggio che ti è arrivato.",
    'account.erroreAltro': 'Accesso non riuscito: riprova.',

    /* ---------- profilo */
    'profilo.avatar': 'Avatar del manager',
    'profilo.personalizza': 'Personalizza il club: nome, colori, disegno',
    'profilo.altriAvatar': 'Altri avatar e cornici',
    'profilo.pezzi': 'Pezzi dello stemma',
    'profilo.stagione': 'Stagione',
    'profilo.partite': 'Partite',
    'profilo.vinteParitePerse': 'Vinte-pari-perse',
    'profilo.golFattiSubiti': 'Gol fatti-subiti',
    'profilo.capocannoniere': 'Capocannoniere',
    'profilo.capocannoniereRiga': (nome, gol) => `${nome} · ${gol} gol`,
    'profilo.nessunGol': 'Ancora nessun gol',
    'profilo.trofei': 'Trofei',
    'profilo.trofeoRiga': (trofeo, stagione) => `${trofeo} (stagione ${stagione})`,
    'profilo.nessunTrofeo': 'Ancora nessuno',
    'profilo.mercato': 'Mercato',
    'profilo.scambioRiga': (preso, ceduto, squadra) => `${preso} per ${ceduto} (${squadra})`,
    'profilo.nessunoScambio': 'Ancora nessuno scambio',

    /* ---------- percorso premi */
    'percorso.titolo': (stagione) => `Percorso premi · stagione ${stagione}`,
    'percorso.livello': (n, tot) => `Livello ${n} di ${tot}`,
    'percorso.punti': (fatti, servono) => `${fatti}/${servono} punti`,
    'percorso.completato': 'Percorso completato',
    'percorso.ritira': 'Ritira',
    'percorso.ritirato': 'Ritirato',
    'percorso.ritiraTutto': 'Ritira tutto',
    'percorso.ritiratoPremio': (premio) => `Ritirato: ${premio}`,
    'percorso.nota': (p) => `Punti: partita giocata ${p.partita}, vittoria +${p.vinta}, sfida di oggi riscossa ${p.sfidaD}, obiettivo della settimana ${p.sfidaW}, sfida di stagione ${p.sfidaS}, turno di coppa superato ${p.turno}. Il percorso riparte da zero a ogni stagione.`,

    /* ---------- monete e diamanti */
    'guadagna.titolo': 'Monete e diamanti',
    'guadagna.come': 'Come si guadagnano',
    'guadagna.fonti': {
      vittoria: 'Vittoria', pareggio: 'Pareggio', sconfitta: 'Sconfitta', gol: 'Ogni gol segnato', casa: 'Partita in casa (dallo stadio)',
      turno: 'Turno di coppa superato', campionato: 'Campionato vinto', coppa: 'Coppa Titano vinta', castelli: 'Trofeo dei Castelli vinto',
      oggi: 'Sfide di oggi (tutte)', settimana: 'Obiettivi della settimana (tutti)', stagione: 'Sfide di stagione (tutte)', carriera: 'Sfide di carriera (tutte)',
      percorso: 'Percorso premi (tutti i livelli)',
    },
    'guadagna.nota': 'Monete e diamanti non si comprano: si guadagnano solo giocando partite e completando sfide e obiettivi.',
    'guadagna.negozio': 'Negozio: dove spenderli',
    'guadagna.ultimi': 'Ultimi movimenti',
    'guadagna.nessuno': 'Ancora nessun movimento: gioca una partita.',

    /* ---------- le descrizioni dei movimenti (restano scritte nella carriera) */
    'movimenti.esiti': { v: 'Vittoria', n: 'Pareggio', p: 'Sconfitta' },
    'movimenti.gare': { camp: 'campionato', coppa: 'Coppa Titano', castelli: 'Trofeo dei Castelli' },
    'movimenti.partita': (esito, fatti, subiti, gara) => `${esito} ${fatti}-${subiti} (${gara})`,
    'movimenti.incasso': 'Incasso dello stadio',
    'movimenti.campionato': 'Campionato vinto',
    'movimenti.trofeoVinto': (trofeo) => `${trofeo}: vinto`,
    'movimenti.turno': (trofeo) => `${trofeo}: turno superato`,
    'movimenti.percorso': (livello) => `Percorso premi, livello ${livello}`,
    'movimenti.sfideTutte': (gruppo) => `Tutte le sfide: ${gruppo}`,
    'movimenti.stadio': (livello) => `Stadio al livello ${livello}`,
    'movimenti.allenatore': (livello) => `Allenatore al livello ${livello}`,
    'movimenti.allenamento': (nome) => `Allenamento di ${nome}`,
    'movimenti.scambio': (preso, ceduto) => `${preso} per ${ceduto}`,
    'movimenti.negozio': (tipo, cosa) => `${tipo}: ${cosa}`,
    'movimenti.rinnovo': 'Nuovo giocatore consigliato',

    /* ---------- negozio */
    'negozio.titolo': 'Negozio',
    'negozio.schede': { stemma: 'Stemma', divisa: 'Divisa', manager: 'Manager', squadra: 'Squadra' },
    'negozio.tipi': {
      avatar: 'Avatar del manager', cornice: 'Cornice del ritratto', scarpini: 'Scarpini della squadra', pallone: 'Pallone di casa', disegno: 'Disegno speciale della divisa',
      terza: 'Terza maglia', forma: 'Forma dello stemma', simbolo: 'Simbolo dello stemma', bordo: 'Bordo dello stemma',
    },
    'negozio.nomi': {
      cornice: { semplice: 'Semplice', oro: 'Oro', azzurra: 'Azzurra', lime: 'Lime', fuoco: 'Fuoco' },
      scarpini: { misti: 'Ognuno i suoi', neri: 'Neri', bianchi: 'Bianchi', oro: 'Oro', azzurri: 'Azzurri', lime: 'Lime', arancio: 'Arancio', rosa: 'Rosa' },
      pallone: { classico: 'Classico', oro: 'Oro', azzurro: 'Azzurro', notte: 'Notte', arancio: 'Arancio' },
      forma: { scudo: 'Scudo', tondo: 'Tondo', stendardo: 'Stendardo', rombo: 'Rombo', esagono: 'Esagono' },
      simbolo: { corona: 'Corona', stella: 'Stella', pallone: 'Pallone', torre: 'Torre', nessuno: 'Nessuno', fulmine: 'Fulmine', tretorri: 'Tre torri', alloro: 'Alloro' },
      bordo: { semplice: 'Semplice', doppio: 'Doppio', sottile: 'Sottile', punti: 'A punti', oro: 'Oro' },
    },
    'negozio.inUso': 'In uso',
    'negozio.usa': 'Usa',
    'negozio.conferma': (prezzo) => `Conferma ${prezzo}`,
    'negozio.soloMio': "Stemma e divisa si personalizzano col club creato da te all'inizio della carriera.",
    'negozio.pezzi': (percento) => `Hai il ${percento}% dei pezzi. I pezzi semplici costano monete, quelli rari diamanti: una volta presi restano tuoi.`,
    'negozio.forma': 'Forma',
    'negozio.simbolo': 'Simbolo in cima',
    'negozio.bordo': 'Bordo',
    'negozio.disegni': 'Disegni speciali della prima maglia',
    'negozio.terza': 'Terza maglia',
    'negozio.terzaNota': 'Una divisa in più, coi colori che vuoi',
    'negozio.inPartitaPrima': 'In partita: prima maglia',
    'negozio.inPartitaTerza': 'In partita: terza maglia',
    'negozio.avatar': 'Avatar del manager',
    'negozio.cornice': 'Cornice del ritratto',
    'negozio.scarpini': 'Scarpini della squadra',
    'negozio.pallone': 'Pallone delle partite in casa',
    'negozio.mercato': 'Mercato',
    'negozio.rinnovo': (nome) => `Cambia il giocatore consigliato${nome ? ` (ora: ${nome})` : ''}`,
    'negozio.rinnovato': 'Giocatore consigliato cambiato: lo trovi nella home, alla voce Trasferimenti',
    'negozio.comprato': (prezzo) => `Comprato: ${prezzo}`,
    'negozio.nota': "Qui si comprano solo aspetto e comodità: niente di quello che c'è nel negozio rende più forte la squadra.",

    /* ---------- notifiche */
    'notifiche.titolo': 'Notifiche',
    'notifiche.vuote': 'Niente di nuovo: tutto ritirato e nessuna partita di coppa in attesa.',
    'notifiche.sfideUno': 'Un premio delle sfide da riscuotere',
    'notifiche.sfide': (n) => `${n} premi delle sfide da riscuotere`,
    'notifiche.percorsoUno': 'Un premio del percorso da ritirare',
    'notifiche.percorso': (n) => `${n} premi del percorso da ritirare`,
    'notifiche.coppa': (turno) => `Coppa Titano: ${turno} da giocare`,
    'notifiche.castelli': (turno) => `Trofeo dei Castelli: ${turno} da giocare`,
    'notifiche.stadio': 'Puoi ampliare lo stadio',
    'notifiche.allenatore': "Puoi migliorare l'allenatore",

    /* ---------- mercato */
    'mercato.titolo': 'Mercato',
    'mercato.monete': 'Monete',
    'mercato.ruoli': { T: 'Tutti', P: 'Portieri', D: 'Difensori', C: 'Centrocampisti', A: 'Attaccanti' },
    'mercato.valore': (valore) => `valore ${valore}`,
    'mercato.prendi': 'Prendi',
    'mercato.chiCedi': 'Chi cedi in cambio?',
    'mercato.paghi': (monete) => `paghi ${monete}`,
    'mercato.incassi': (monete) => `incassi ${monete}`,
    'mercato.allaPari': 'alla pari',
    'mercato.pocheMonete': 'Non hai abbastanza monete: si guadagnano giocando le partite e completando le sfide.',
    'mercato.annulla': 'Annulla',
    'mercato.tuo': (nome) => `${nome} è tuo`,
    'mercato.pagato': (monete) => `pagato ${monete}`,
    'mercato.incassato': (monete) => `incassato ${monete}`,
    'mercato.nonRiuscito': 'Scambio non riuscito.',

    /* ---------- impostazioni */
    'imp.titolo': 'Impostazioni',
    'imp.difficolta': 'Difficoltà',
    'imp.audio': 'Audio',
    'imp.acceso': 'Acceso',
    'imp.spento': 'Spento',
    'imp.volumeMusica': 'Volume musica',
    'imp.volumeEffetti': 'Volume effetti',
    'imp.comandi': 'Comandi',
    'imp.assistito': (acceso) => `Passaggio assistito: ${acceso ? 'sì' : 'no'}`,
    'imp.qualita': 'Qualità grafica',
    'imp.qualitaNomi': { auto: 'Automatica', alta: 'Alta', media: 'Media', bassa: 'Bassa' },
    'imp.qualitaNota': 'Automatica: parte al massimo e si alleggerisce da sola se il telefono fatica. Per tornare a una qualità più alta dopo averla abbassata, chiudi e riapri il gioco.',
    'imp.lingua': 'Lingua',
    'imp.account': 'Account',
    'imp.carriera': 'Carriera',
    'imp.ricomincia': 'Ricomincia la carriera da capo',
    'imp.sicuro': "Sicuro? Tocca ancora per cancellare tutto, anche dall'account",
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
