// Tutti i testi delle schermate nuove della home, in un file solo: per aggiungere l'inglese basta un secondo elenco con
// le stesse chiavi. Un testo è una frase oppure una funzione che la compone coi numeri del momento.
// Le schermate non ancora rifatte (in casa.js) hanno ancora i testi nel codice: passano di qui man mano che si rifanno.
const IT = {
  // barra in alto
  'barra.home': 'Home',
  'barra.indietro': 'Indietro',
  'barra.impostazioni': 'Impostazioni',
  'barra.info': 'Info',
  'barra.settimana': 'Sfide della settimana',
  'barra.premi': 'Percorso premi',
  'barra.livello': (n) => `Liv. ${n}`,
  'barra.diamanti': 'Diamanti: come guadagnarli',
  'barra.monete': 'Monete: come guadagnarle',
  'barra.profilo': 'Profilo',
  // home: titoli delle carte
  'home.carriera': 'Carriera',
  'home.scenario': 'Scenario',
  'home.percorso': 'Percorso premi',
  'home.amichevole': 'Amichevole',
  'home.sfide': 'Sfide',
  'home.squadra': 'Squadra',
  'home.mercato': 'Mercato',
  'home.club': 'Il mio club',
  // home: carta Carriera
  'carriera.campionato': (pos, g, tot) => `${pos}° · Partita ${g} di ${tot}`,
  'carriera.campionatoFinito': (pos) => `Stagione finita · ${pos}° posto`,
  'carriera.fuori': 'Eliminato',
  'carriera.vinta': 'Vinta!',
  'carriera.vinto': 'Vinto!',
  'carriera.gironi': 'Fase a gironi',
  'carriera.prossima': (nome, casa) => `Prossima partita: ${nome}, ${casa ? 'in casa' : 'in trasferta'}`,
  'carriera.nuovaStagione': 'Stagione finita: entra per cominciare la prossima',
  // carriera: prossima partita, classifica, coppe
  'carriera.gioca': 'Gioca adesso',
  'carriera.campionatoNome': 'Campionato',
  'carriera.partita': (g, tot) => `Partita ${g} di ${tot}`,
  'carriera.inCasa': 'In casa',
  'carriera.inTrasferta': 'In trasferta',
  'carriera.prepara': 'Entra per scegliere la formazione e giocare',
  'carriera.nuova': 'Nuova stagione',
  'carriera.campione': 'Campione',
  'carriera.tuoPosto': (n) => `Tu: ${n}° posto`,
  'carriera.classifica': 'Classifica',
  'carriera.stagione': (n) => `Stagione ${n}`,
  'classifica.pos': 'Pos', 'classifica.squadra': 'Squadra', 'classifica.dr': 'DR', 'classifica.pt': 'PT',
  'carriera.castelli': 'Trofeo dei Castelli',
  'carriera.coppa': 'Coppa Titano',
  'carriera.prossimaPartita': 'Prossima partita',
  'carriera.finito': 'Lo vince', 'carriera.finita': 'La vince',
  'carriera.tuo': 'Il trofeo è tuo', 'carriera.tua': 'La coppa è tua',
  'carriera.fuoriA': (dove) => `Tu fuori: ${dove}`,
  'carriera.aiGironi': 'gironi',
  'sfida.campionato': (g, tot, casa) => `Campionato · giornata ${g} di ${tot} · ${casa ? 'in casa' : 'in trasferta'}`,
  // stagione nuova (finestra di conferma)
  'stagione.titolo': (n) => `Stagione ${n}`,
  'stagione.testo': 'Il campionato è finito. Con la stagione nuova classifica, coppe e percorso premi ripartono da zero; squadra, monete e diamanti restano.',
  'stagione.testoCoppe': 'Il campionato è finito, ma hai ancora partite di coppa da giocare: con la stagione nuova le perdi. Classifica, coppe e percorso premi ripartono da zero; squadra, monete e diamanti restano.',
  'stagione.si': 'Comincia',
  'finestra.chiudi': 'Chiudi', 'finestra.annulla': 'Annulla',
  // home: carta Scenario
  'scenario.esempio': 'Sei sotto 0-1 al 70\': rimonta',
  'scenario.testo': 'Premio in diamanti',
  'inArrivo': 'In arrivo',
  // home: carta Percorso premi
  'percorso.etichetta': 'Livello',
  'percorso.livello': (n, tot) => `Livello ${n} di ${tot}`,
  'percorso.punti': (p, tot) => `${p} / ${tot} punti`,
  'percorso.prossimo': 'Prossimo premio',
  'percorso.completo': 'Percorso completato',
  'percorso.daRitirare': (n) => (n === 1 ? '1 premio da ritirare' : `${n} premi da ritirare`),
  'percorso.stagione': (s, n) => (n > 0 ? `Stagione ${s} · si azzera tra ${n === 1 ? '1 partita' : n + ' partite'} di campionato` : `Stagione ${s} · si azzera con la stagione nuova`),
  // home: carta Amichevole
  'amichevole.titolo': 'Partita libera',
  'amichevole.testo': 'Scegli le squadre e gioca quando vuoi',
  'amichevole.piede': 'Non conta per la classifica',
  // home: carte piccole
  'sfide.oggi': 'Oggi',
  'sfide.settimana.breve': 'Sett.',
  'sfide.carriera.breve': 'Carr.',
  'sfide.stagione.breve': 'Stag.',
  'mercato.vuoto': 'Rinforza la squadra',
  // ingresso
  'capitano.tocca': 'Tocca un giocatore',
  'capitano.ingaggia': (nome) => `Ingaggia ${nome}`,
  'capitano.forte': 'Punto forte',
  // statistiche dei giocatori: sigla e nome intero
  'stat.PAR': 'Parate', 'stat.RIF': 'Riflessi', 'stat.POS': 'Posizione', 'stat.USC': 'Uscite', 'stat.PRE': 'Presa', 'stat.RIN': 'Rinvio',
  'stat.VEL': 'Velocità', 'stat.ACC': 'Accelerazione', 'stat.RES': 'Resistenza', 'stat.POT': 'Potenza', 'stat.CON': 'Controllo', 'stat.PAS': 'Passaggio',
  'stat.TIR': 'Tiro', 'stat.DIF': 'Difesa',
};
const LINGUE = { it: IT };
let lingua = 'it';
/** Cambia lingua (oggi c'è solo l'italiano). */
export const usaLingua = (l) => { if (LINGUE[l]) lingua = l; };
/** Il testo di una chiave, coi suoi valori. Una chiave che manca torna com'è: si vede subito nella schermata. */
export const t = (chiave, ...valori) => { const v = LINGUE[lingua][chiave]; return typeof v === 'function' ? v(...valori) : v === undefined ? chiave : v; };
