// La Home (livello 0): un menu di otto carte grandi su tre righe (docs/navigazione.md §2).
// Riga 1: Carriera (due terzi) e Scenario. Riga 2: Percorso premi (due terzi) e Amichevole. Riga 3: Sfide, Squadra,
// Mercato, Il mio club. Ogni carta riassume la sua sezione coi dati salvati e la apre.
import * as CAR from '../carriera.js';
import { img, club } from '../game.js';
import { K, DATI, mon, ritratto, consigliato, avviso, esc } from './casa.js';
import { ILLUSTRAZIONI } from './illustrazioni.js';
import { icona, stelline } from './icone.js';
import { carta, adatta } from './carte.js';
import { t } from './testi.js';
import { apri } from './nav.js';

document.getElementById('vs').insertAdjacentHTML('beforebegin', '<div id="casa" class="scr nas"></div>');
const radice = document.getElementById('casa');
radice.addEventListener('click', (e) => {
  const b = e.target.closest('.carta'); if (!b) return;
  if (b.dataset.chiusa) return avviso(t('inArrivo'));
  apri(b.dataset.vai);
});

// quando arriva un'immagine (lo stemma, il ritratto) o cambia la misura dello schermo i posti si spostano: i testi si riadattano
radice.addEventListener('load', () => adatta(radice), true);
addEventListener('resize', () => { if (!radice.classList.contains('nas')) adatta(radice); });

const premio = (m, g) => (m ? `${icona('moneta')} ${mon(m)}` : `${icona('diamante')} ${g}`);
const riga = (ico, testo) => `<span class="riga">${icona(ico)}<i data-adatta>${testo}</i></span>`;

/** Disegna la Home coi dati del momento. */
export function disegnaHome() {
  const me = club(K.club), oggi = new Date(), p = CAR.prossima(K), tab = CAR.classifica(K, CLUBS), pos = tab.findIndex((r) => r.id === K.club) + 1;
  const st = CAR.statoSfide(K, oggi), pe = CAR.statoPercorso(K), note = CAR.notifiche(K, oggi);
  // carriera: lo stemma, il nome e le stelle, poi una riga per competizione
  const cp = CAR.coppaProssima(K), cc = CAR.castelliProssima(K);
  const coppa = cp ? cp.nome : K.coppa.vinta ? t('carriera.vinta') : t('carriera.fuori');
  const castelli = cc ? (cc.fase === 'gironi' ? t('carriera.gironi') : cc.nome) : K.castelli.vinta ? t('carriera.vinto') : t('carriera.fuori');
  const carriera = carta({ rotta: 'carriera', titolo: t('home.carriera'), colore: 'oro', sfondo: 'carta-carriera', classe: 'c-carriera',
    corpo: `<img class="stemma" src="${img(me.id)}" alt=""><span class="nome"><b data-adatta data-min="16" data-corto="${esc(me.short)}">${esc(me.name)}</b>${stelline(me.str)}</span>`
      + `<span class="righe">${riga('campionato', p ? t('carriera.campionato', pos, p.giornata, p.totale) : t('carriera.campionatoFinito', pos))}${riga('coppa', coppa)}${riga('castelli', castelli)}</span>`,
    piede: `<i data-adatta>${p ? t('carriera.prossima', esc(club(p.avv).name), p.inCasa) : t('carriera.nuovaStagione')}</i>` });
  // scenario: ancora chiuso, finché la partita non sa partire da un minuto e da un punteggio dati
  const scenario = carta({ rotta: 'scenario', titolo: t('home.scenario'), colore: 'rossa', chiusa: true, sfondo: 'carta-scenario', classe: 'c-scenario',
    corpo: `<span class="testo"><b>${t('scenario.esempio')}</b><i>${icona('diamante')} ${t('scenario.testo')}</i></span>` });
  // percorso premi: livello, barra dei punti, prossimo premio, quando si azzera
  const fine = pe.livello >= pe.livelli, prossimo = pe.premi[pe.livello], mancano = p ? p.totale - p.giornata + 1 : 0;
  const percorso = carta({ rotta: 'percorso', titolo: t('home.percorso'), colore: 'azzurra', bollino: pe.daRitirare > 0, sfondo: 'carta-percorso', classe: 'c-percorso',
    corpo: `<span class="livello"><i>${t('percorso.etichetta')}</i><b>${pe.livello}</b></span>`
      + `<span class="avanza"><b>${fine ? t('percorso.completo') : t('percorso.punti', pe.nelLivello, pe.perLivello)}</b><span class="barretta"><i style="width:${fine ? 100 : Math.round(pe.nelLivello / pe.perLivello * 100)}%"></i></span><i>${pe.daRitirare ? t('percorso.daRitirare', pe.daRitirare) : t('percorso.livello', pe.livello, pe.livelli)}</i></span>`
      + (prossimo ? `<span class="prossimo"><i>${t('percorso.prossimo')}</i><b>${premio(prossimo.monete, prossimo.gemme)}</b></span>` : ''),
    piede: `<i data-adatta>${icona('orologio')} ${t('percorso.stagione', K.stagione, mancano)}</i>` });
  const amichevole = carta({ rotta: 'amichevole', titolo: t('home.amichevole'), colore: 'blu', sfondo: 'carta-amichevole', classe: 'c-amichevole',
    corpo: `${icona('pallone', 'grande')}<span class="testo"><b>${t('amichevole.titolo')}</b><i>${t('amichevole.testo')}</i></span>`, piede: `<i data-adatta>${t('amichevole.piede')}</i>` });
  // le quattro carte piccole
  const conto = (g, k) => `<span class="conto"><i>${t(k)}</i><b>${st.conti[g][0]}/${st.conti[g][1]}</b></span>`;
  // nelle carte piccole lo spazio è poco: i nomi dei gruppi di sfide sono abbreviati
  const sfide = carta({ rotta: 'sfide', titolo: t('home.sfide'), colore: 'blu', bollino: st.daRiscuotere > 0, classe: 'c-piccola c-sfide',
    corpo: conto('d', 'sfide.oggi') + conto('w', 'sfide.settimana.breve') + conto('c', 'sfide.carriera.breve') + conto('s', 'sfide.stagione.breve') });
  const mioCap = K.mio && me.xi.find((x) => x[0] === K.mio.capitano), cap = mioCap || me.xi.slice().sort((a, b) => DATI.valore(b[1], b[3]) - DATI.valore(a[1], a[3]))[0], sc = DATI.scheda(cap, K.club);
  const foto = ritratto(K.club, cap[0], cap[2], cap[1] === 'P');
  const squadra = carta({ rotta: 'squadra', titolo: t('home.squadra'), colore: 'blu', classe: 'c-piccola c-squadra',
    corpo: `<span class="ritr">${foto ? `<img src="${foto}" alt="">` : icona('segnaposto-giocatore')}<em class="val ${sc.fascia}">${sc.val}</em></span><span class="testo"><i>${mioCap ? icona('capitano') : ''}${sc.ruolo}</i><b data-adatta>${esc(cap[0])}</b></span>` });
  // mercato: il giocatore in evidenza, con la valutazione, il ruolo e la squadra da cui arriverebbe
  const c = consigliato(), cs = c && DATI.scheda(c.x, c.c.id);
  const mercato = carta({ rotta: 'mercato', titolo: t('home.mercato'), colore: 'blu', classe: 'c-piccola c-mercato',
    corpo: c ? `<em class="val ${cs.fascia}">${cs.val}</em><span class="testo"><i>${cs.ruolo} · ${esc(c.c.short)}</i><b data-adatta>${esc(c.x[0])}</b></span>` : `${icona('mercato', 'grande')}<span class="testo"><b>${t('mercato.vuoto')}</b></span>` });
  // il mio club: le stelle e le tre voci (stadio, personalizza, allenamento) come icone
  const clubC = carta({ rotta: 'club', titolo: t('home.club'), colore: 'blu', bollino: note.some((n) => n.vai === 'stadio' || n.vai === 'allenatore'), classe: 'c-piccola c-club',
    corpo: `<img class="mini" src="${img(me.id + '-mini')}" alt=""><span class="testo">${stelline(me.str)}<span class="voci">${icona('stadio')}${icona('personalizza')}${icona('allenamento')}</span></span>` });
  radice.classList.toggle('illustrata', !!ILLUSTRAZIONI['sfondo-home']);
  radice.innerHTML = carriera + scenario + percorso + amichevole + sfide + squadra + mercato + clubC;
  adatta(radice);
}
