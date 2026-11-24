// La Stagione (bozza di Alex del 24/11): la schermata della divisione in cui si gioca. In alto una fascia con il trofeo
// e il nome della lega, a che partita si è e la prossima da giocare col suo pulsante. Sotto, a sinistra i quattro
// obiettivi della stagione (un anello dice a che punto è ognuno), a destra la classifica: la nostra riga in oro, una
// striscia verde sui posti che valgono l'obiettivo, la forma di ogni squadra (gli ultimi risultati) a pallini.
// Se le righe non ci stanno scorre solo la classifica, e la nostra riga resta in vista. In fondo alla stessa colonna,
// scorrendo, ci sono i risultati dell'ultima giornata e il calendario.
import * as CAR from '../carriera.js';
import { img } from '../game.js';
import { DIVISIONI, STAGIONE, PANNELLI } from '../config.js';
import { K, pan, esc, club } from './casa.js';
import { figura } from './immagini.js';
import { icona } from './icone.js';
import { adatta, attrNome } from './carte.js';
import { nomiDi } from '../dati/squadre.js';
import { pannello, barra } from './quadri.js';
import { t } from './testi.js';

const dr = (n) => (n > 0 ? `+${n}` : String(n).replace('-', '−'));
// l'anello della percentuale: azzurro mentre si sale, verde pieno con la spunta quando l'obiettivo è sicuro, grigio e
// vuoto quando non si può più raggiungere (sotto, al posto di «ora…», c'è scritto «mancato»)
const anello = (parte, o) => { const pc = o.sicuro ? 100 : o.mancato ? 0 : Math.max(0, Math.min(99, Math.round(parte * 100)));
  return `<span class="lAnello${o.sicuro ? ' fatto' : o.mancato ? ' mancato' : ''}"><svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="15" pathLength="100"/><circle class="pieno" cx="18" cy="18" r="15" pathLength="100" stroke-dasharray="${pc} 100"/></svg>${o.sicuro ? icona('spunta') : o.mancato ? icona('chiudi') : `<b>${pc}%</b>`}</span>`; };

// Le quattro tessere degli obiettivi: illustrazione, nome corto, dove si è adesso, parte fatta (0-1)
function obiettivi() {
  const D = CAR.divisione(K), k = K.coppa, c = K.castelli, squadre = K.squadre.length;
  // a che turno si è (o si è usciti) in una coppa a eliminazione; `primo` è il nome del primo turno
  const turno = (ko, primo) => (ko.vinta ? t('lega.vinta') : ko.fuori !== null ? t('lega.fuori', t('lega.turno.' + (ko.fuori + primo))) : t('lega.sei', t('lega.turno.' + (ko.turno + primo))));
  const cosa = {
    posizione: (o) => ['trofeo-campionato', t('lega.obPosizione', o.n), t('lega.ora', `${o.ora}°`), K.ris.length ? (squadre - o.ora) / (squadre - o.n) : 0],
    coppa: (o) => ['coppa-titano', t('lega.obCoppa', t('lega.turno.' + o.n)), turno(k, 0), o.ora / o.n],
    // nel Trofeo dei Castelli il primo passo sono i gironi: valgono per le giornate giocate, finché non si sa come finiscono
    castelli: (o) => ['trofeo-castelli', o.n === 1 ? t('lega.obGironi') : t('lega.obCastelli', t('lega.turno.' + o.n)), c.fuori === 'gironi' ? t('lega.fuori', t('lega.turno.gironi')) : c.ko ? turno(c.ko, 1) : t('lega.gironi'), (o.ora + (c.ko ? 0 : c.giornata / (c.gironi[0].length - 1) * .9)) / o.n],
    rosa: (o) => ['icona-categoria-tecnico', t('lega.obRosa', o.n), t('lega.ora', o.ora.toFixed(1).replace('.', ',')), (o.ora - D.val[0]) / (o.n - D.val[0])],
  };
  return CAR.obiettivi(K, CLUBS).map((o) => { const [fig, nome, stato, parte] = cosa[o.id](o);
    return `<div class="kTess lOb${o.sicuro ? ' fatto' : o.mancato ? ' mancato' : ''}">${figura(fig, 'lFig', 34)}${anello(parte, o)}<b>${nome}</b><i>${o.mancato ? t('lega.mancato') : stato}</i></div>`; });
}

/** Disegna la Stagione. */
export function panStagione() {
  const D = CAR.divisione(K), tab = CAR.classifica(K, CLUBS), io = tab.findIndex((r) => r.id === K.club), mia = tab[io], p = CAR.prossima(K), forme = CAR.forma(K, PANNELLI.stagione.forma);
  const ob = CAR.obiettivi(K, CLUBS), sopra = DIVISIONI[K.div - 2], quanti = PANNELLI.stagione.forma;
  // la fascia in alto
  const avv = p ? club(p.avv) : null;
  const prossima = p ? `<img src="${img(avv.id + '-mini')}" alt=""><span class="lChi"><i>${t('lega.prossima')}</i><span class="lAvv"><b ${attrNome(nomiDi(avv), 11)}>${esc(avv.name)}</b><u>· ${t(p.inCasa ? 'lega.inCasa' : 'lega.inTrasferta')}</u></span></span><button class="kOro" data-az="prossima">${t('home.gioca')}</button>`
    : `<span class="lChi"><i>${t('lega.finito')}</i><span class="lAvv"><b>${t('lega.arrivato', io + 1)}</b></span></span><button class="kOro" data-az="prossima">${t('lega.avanti')}</button>`;
  const fascia = `<section class="kPan lFascia"><span class="lLega">${figura('trofeo-campionato', 'lTrofeo', 44)}<span><b class="lNome" data-adatta data-min="16">${D.nome}</b><i data-adatta data-min="11" data-corto="${t('lega.rigaCorta', io + 1, mia.pt)}">${t('lega.riga', K.stagione, io + 1, mia.pt)}</i></span></span>`
    + `<span class="lPartita"><b>${p ? t('barra.partita', p.giornata, p.totale) : t('lega.finito')}</b>${barra(p ? (p.giornata - 1) / p.totale : 1)}</span><span class="lProssima">${prossima}</span></section>`;
  // gli obiettivi
  const lato = `<i class="lSali">${sopra ? t('lega.sali', STAGIONE.servono) : t('lega.cima')}</i>`;
  const sinistra = pannello('lObiettivi', t('lega.obiettivi', ob.filter((o) => o.sicuro).length, ob.length), `<div class="lGriglia">${obiettivi().join('')}</div>`, lato);
  // la classifica: la forma si legge da sinistra (la più vecchia) a destra (l'ultima); i posti senza partita restano vuoti
  const pallini = (id) => { const f = forme[id] || []; return `<span class="lForma">${'<i></i>'.repeat(quanti - f.length)}${f.map((x) => `<i class="${x}">${t('lega.esito.' + x)}</i>`).join('')}</span>`; };
  const righe = tab.map((r, i) => { const c = club(r.id); return `<div class="lRiga${r.id === K.club ? ' io' : ''}${i < D.obiettivi.posizione ? ' su' : ''}"><b>${i + 1}</b><img src="${img(r.id + '-mini')}" alt=""><b class="lSq" ${attrNome(nomiDi(c), 11)}>${esc(c.name)}</b><i>${r.g}</i><i>${dr(r.gf - r.gs)}</i><b>${r.pt}</b>${pallini(r.id)}</div>`; }).join('');
  // sotto la classifica, scorrendo: i risultati dell'ultima giornata e il calendario del club
  const g = K.giornata - 1, nome = (id) => esc(club(id).name);
  const ultima = g >= 0 ? `<h4 class="lSez">${t('lega.risultati', g + 1)}</h4><div class="lRis">${K.cal[g].map(([a, b], i) => `<div class="${a === K.club || b === K.club ? 'io' : ''}"><span>${nome(a)}</span><b>${K.ris[g][i][0]}-${K.ris[g][i][1]}</b><span>${nome(b)}</span></div>`).join('')}</div>` : '';
  const calendario = `<h4 class="lSez">${t('lega.calendario')}</h4><div class="lCal">${K.cal.map((gg, n) => { const [x, y] = gg.find((m) => m.includes(K.club)), i = gg.findIndex((m) => m.includes(K.club)), r = K.ris[n] && K.ris[n][i], casa = x === K.club, miei = r ? r[casa ? 0 : 1] : 0, loro = r ? r[casa ? 1 : 0] : 0;
    return `<div class="${n === K.giornata ? 'io' : ''}"><i>${n + 1}</i><span>${nome(casa ? y : x)}<u>${t(casa ? 'lega.inCasa' : 'lega.inTrasferta')}</u></span><b class="${r ? (miei > loro ? 'v' : miei < loro ? 'p' : 'n') : ''}">${r ? `${miei}-${loro}` : n === K.giornata ? t('lega.daGiocare') : '–'}</b></div>`; }).join('')}</div>`;
  const destra = pannello('lClassifica', t('carriera.classifica'), `<div class="lScorre"><div class="lTab">${righe}</div>${ultima}${calendario}</div>`,
    `<span class="lCapo"><i>${t('lega.g')}</i><i>${t('classifica.dr')}</i><i>${t('classifica.pt')}</i><i class="lForma">${t('lega.forma')}</i></span>`);
  pan(D.nome, fascia + sinistra + destra, '', 'stagione');
  // i nomi lunghi si adattano; poi la classifica scorre fin dove serve per avere la nostra riga a metà
  const dentro = document.getElementById('panC'), scorre = dentro.querySelector('.lScorre'), alta = dentro.querySelector('.lRiga').offsetHeight;
  adatta(dentro);
  // (a righe intere, così in cima non resta mezza riga; mai oltre la fine della classifica)
  scorre.scrollTop = Math.max(0, Math.min(Math.round(((io + .5) * alta - scorre.clientHeight / 2) / alta) * alta, tab.length * alta - scorre.clientHeight));
}
