// I tre nomi di ogni squadra: completo, breve e sigla di tre lettere. Ogni schermata usa il più lungo che ci sta per
// intero, così nessun nome viene tagliato. Completo e sigla sono quelli di public/data.js (una prova controlla che
// coincidano); il nome breve si scrive qui e si può correggere a mano.
// Il club dell'utente ha il nome che sceglie lui: il suo nome breve lo calcola nomeBreve().
export const SQUADRE = {
  trefiori: { nome: 'Tre Fiori', breve: 'Tre Fiori', sigla: 'TFI' },
  lafiorita: { nome: 'La Fiorita', breve: 'La Fiorita', sigla: 'FIO' },
  virtus: { nome: 'Virtus', breve: 'Virtus', sigla: 'VIR' },
  trepenne: { nome: 'Tre Penne', breve: 'Tre Penne', sigla: 'TPE' },
  folgore: { nome: 'Folgore', breve: 'Folgore', sigla: 'FOL' },
  cosmos: { nome: 'Cosmos', breve: 'Cosmos', sigla: 'COS' },
  murata: { nome: 'Murata', breve: 'Murata', sigla: 'MUR' },
  libertas: { nome: 'Libertas', breve: 'Libertas', sigla: 'LIB' },
  juvenes: { nome: 'Juvenes/Dogana', breve: 'Juvenes', sigla: 'JUV' },
  fiorentino: { nome: 'Fiorentino', breve: 'Fiorentino', sigla: 'FRT' },
  faetano: { nome: 'Faetano', breve: 'Faetano', sigla: 'FAE' },
  domagnano: { nome: 'Domagnano', breve: 'Domagnano', sigla: 'DOM' },
  pennarossa: { nome: 'Pennarossa', breve: 'Pennarossa', sigla: 'PEN' },
  cailungo: { nome: 'Cailungo', breve: 'Cailungo', sigla: 'CAI' },
  sangiovanni: { nome: 'San Giovanni', breve: 'S. Giovanni', sigla: 'SGV' },
  academy: { nome: 'SM Academy U22', breve: 'SM Academy', sigla: 'ACA' },
};

// quanto può essere lungo un nome breve, e come si accorciano le parole più comuni all'inizio di un nome di club
const LUNGO = 14;
const ABBREVIA = { sporting: 'Sp.', atletico: 'Atl.', atletica: 'Atl.', polisportiva: 'Pol.', unione: 'Un.', associazione: 'Ass.', societa: 'Soc.', società: 'Soc.', libera: 'Lib.', virtus: 'V.', football: 'F.', calcio: 'C.', united: 'Utd', juventus: 'Juve', internazionale: 'Inter', accademia: 'Acc.', academy: 'Ac.', real: 'Real', san: 'S.', santa: 'S.', santo: 'S.' };
// parole che in un nome breve si possono lasciare fuori
const SALTA = /^(fc|ac|as|ss|us|asd|ssd|cf|sc|club|u\d*|\d{4})$/i;

/**
 * Il nome breve di un club dal nome completo (per il club creato dall'utente): al massimo 14 lettere, senza tagliare
 * le parole a metà. «Sporting Serravalle U» diventa «Sp. Serravalle». Prima toglie le sigle di contorno (FC, U22…),
 * poi accorcia le parole comuni, poi le lascia fuori una alla volta; se non basta resta la parola più lunga, e se
 * nemmeno quella ci sta non c'è nome breve (si usa la sigla).
 */
export function nomeBreve(nome) {
  const pulito = String(nome || '').trim().replace(/\s+/g, ' ');
  if (pulito.length <= LUNGO) return pulito;
  let parole = pulito.split(' ');
  const senza = parole.filter((p) => !SALTA.test(p)); if (senza.length) parole = senza;
  const unisci = (l) => l.join(' ');
  if (unisci(parole).length <= LUNGO) return unisci(parole);
  const comune = (p) => !!ABBREVIA[p.toLowerCase()];
  const corte = parole.map((p, i) => (i < parole.length - 1 && comune(p) ? ABBREVIA[p.toLowerCase()] : p));
  if (unisci(corte).length <= LUNGO) return unisci(corte);
  // ancora lungo: le parole comuni (Calcio, Sporting, Polisportiva…) si lasciano fuori una alla volta, dall'ultima
  for (let i = parole.length - 1; i >= 0 && parole.length > 1; i--) if (comune(parole[i])) { parole.splice(i, 1); corte.splice(i, 1); if (unisci(corte).length <= LUNGO) return unisci(corte); }
  if (unisci(parole).length <= LUNGO) return unisci(parole);
  // resta la parola più lunga tra quelle che dicono chi è il club
  const lunga = parole.slice().sort((a, b) => b.length - a.length)[0] || pulito;
  // una parola sola più lunga del posto non si taglia: niente nome breve, chi chiede usa la sigla
  return lunga.length <= LUNGO ? lunga : '';
}

/** I tre nomi di un club com'è adesso (`c` è la squadra del gioco: id, name, short): completo, breve, sigla. */
export function nomiDi(c) {
  const s = SQUADRE[c.id];
  // il club dell'utente prende il posto di una squadra dell'elenco ma ha un nome suo: breve calcolato dal nome di adesso
  if (!s || s.nome !== c.name) return { nome: c.name, breve: nomeBreve(c.name) || c.short, sigla: c.short };
  return { nome: s.nome, breve: s.breve, sigla: s.sigla };
}
