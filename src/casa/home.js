// La Home (livello 0): un menu di otto carte grandi su tre righe (docs/navigazione.md §2).
// Riga 1 (38%): Carriera (due terzi) e Scenario. Riga 2 (27%): Percorso premi (due terzi) e Amichevole.
// Riga 3 (35%): Sfide, Squadra, Mercato, Il mio club. Ogni carta riassume la sua sezione coi dati salvati e la apre.
import * as CAR from '../carriera.js';
import { ECONOMIA } from '../config.js';
import { img } from '../game.js';
import { nomiDi } from '../dati/squadre.js';
import { K, DATI, mon, ritratto, consigliato, avviso, esc, club } from './casa.js';
import { ILLUSTRAZIONI } from './illustrazioni.js';
import { icona, stelline } from './icone.js';
import { carta, adatta, attrNome } from './carte.js';
import { miniCarta } from './giocatore.js';
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

// una riga della carta Carriera: l'icona della competizione, il suo nome e a che punto si è; se non ci sta, solo il punto
const riga = (ico, nome, stato) => `<span class="riga">${icona(ico)}<i data-adatta data-corto="${stato}">${nome} · ${stato}</i></span>`;
// un premio del percorso: il numero del livello, l'icona (moneta o diamante) e la quantità
const premio = (x, prossimo) => `<span class="premioL${prossimo ? ' pross' : ''}"><i>${x.livello}</i>${icona(x.monete ? 'moneta' : 'diamante')}<b>${mon(x.monete || x.gemme)}</b></span>`;
// un anello di avanzamento delle sfide, con l'etichetta sotto
const anello = (fatte, tot, chiave) => `<span class="giro"><b style="--p:${Math.round(fatte / Math.max(1, tot) * 100)}">${fatte}/${tot}</b><i>${t(chiave)}</i></span>`;

/** Disegna la Home coi dati del momento. */
export function disegnaHome() {
  const me = club(K.club), nomi = nomiDi(me), oggi = new Date(), p = CAR.prossima(K), tab = CAR.classifica(K, CLUBS), pos = tab.findIndex((r) => r.id === K.club) + 1;
  const st = CAR.statoSfide(K, oggi), pe = CAR.statoPercorso(K), note = CAR.notifiche(K, oggi);

  // carriera: lo stemma grande, il nome e le stelle, una riga per competizione; a destra la prossima partita in evidenza
  const cp = CAR.coppaProssima(K), cc = CAR.castelliProssima(K);
  const campionato = p ? t('carriera.campionato', pos, p.giornata, p.totale) : t('carriera.campionatoFinito', pos);
  const coppa = cp ? cp.nome : t(K.coppa.vinta ? 'carriera.vinta' : 'carriera.fuori');
  const castelli = cc ? (cc.fase === 'gironi' ? t('carriera.gironi') : cc.nome) : t(K.castelli.vinta ? 'carriera.vinto' : 'carriera.fuori');
  const avv = p && club(p.avv), nAvv = avv && nomiDi(avv);
  const carriera = carta({ rotta: 'carriera', titolo: t('home.carriera'), colore: 'oro', sfondo: 'carta-carriera', classe: 'c-carriera',
    corpo: `<img class="stemma" src="${img(me.id)}" alt=""><span class="club"><span class="nome"><b ${attrNome(nomi, 16)}>${esc(nomi.nome)}</b>${stelline(me.str)}</span>`
      + `${riga('campionato', t('carriera.campionatoNome'), campionato)}${riga('coppa', t('carriera.coppa'), coppa)}${riga('castelli', t('carriera.castelli'), castelli)}</span>`
      + (avv ? `<span class="prossima"><i>${t('carriera.prossima')}</i><span><img src="${img(avv.id + '-mini')}" alt=""><b ${attrNome({ breve: nAvv.sigla, sigla: nAvv.sigla })}>${esc(nAvv.breve)}</b></span><i>${t(p.inCasa ? 'carriera.inCasa' : 'carriera.trasferta')}</i></span>`
        : `<span class="prossima"><i>${t('carriera.prossima')}</i><b>${t('carriera.nuova')}</b></span>`),
    piede: `<i data-adatta>${t('carriera.motto', CAR.divisione(K).nome, K.stagione)}</i>` });

  // scenario: ancora chiuso, finché la partita non sa partire da un minuto e da un punteggio dati; si vede il premio
  const scenario = carta({ rotta: 'scenario', titolo: t('home.scenario'), colore: 'rossa', chiusa: true, sfondo: 'carta-scenario', classe: 'c-scenario',
    corpo: `<span class="testo"><b>${t('scenario.esempio')}</b><i>${icona('diamante')} ${t('scenario.premio', ECONOMIA.scenario.g)}</i></span>` });

  // percorso premi: il livello in corso (si parte da 1), i punti, i prossimi quattro premi col primo in evidenza
  const fine = pe.livello >= pe.livelli, mancano = p ? p.totale - p.giornata + 1 : 0, prossimi = pe.premi.slice(pe.livello, pe.livello + 4);
  const percorso = carta({ rotta: 'percorso', titolo: t('home.percorso'), colore: 'azzurra', bollino: pe.daRitirare > 0, sfondo: 'carta-percorso', classe: 'c-percorso',
    corpo: `<span class="livello"><i>${t('percorso.etichetta')}</i><b>${pe.inCorso}</b></span>`
      + `<span class="avanza"><span class="barretta"><i style="width:${fine ? 100 : Math.round(pe.nelLivello / pe.perLivello * 100)}%"></i></span><b>${fine ? t('percorso.completo') : t('percorso.punti', pe.nelLivello, pe.perLivello)}</b></span>`
      + `<span class="premi">${prossimi.map((x, i) => premio(x, i === 0)).join('')}</span>`,
    piede: `${icona('orologio')}<i data-adatta>${t('percorso.stagione', K.stagione, mancano)}</i>` });
  const amichevole = carta({ rotta: 'amichevole', titolo: t('home.amichevole'), colore: 'blu', sfondo: 'carta-amichevole', classe: 'c-amichevole',
    corpo: `${icona('pallone', 'grande')}<span class="testo"><b>${t('amichevole.titolo')}</b><i data-adatta>${t('amichevole.testo')}</i></span>`, piede: `<i data-adatta>${t('amichevole.piede')}</i>` });

  // sfide: quattro anelli (oggi, settimana, carriera, stagione) coi nomi interi
  const sfide = carta({ rotta: 'sfide', titolo: t('home.sfide'), colore: 'blu', bollino: st.daRiscuotere > 0, classe: 'c-piccola c-sfide',
    corpo: anello(...st.conti.d, 'sfide.oggi') + anello(...st.conti.w, 'sfide.settimana') + anello(...st.conti.c, 'sfide.carriera') + anello(...st.conti.s, 'sfide.stagione') });

  // squadra: il capitano (o il migliore, se non c'è) con la sua carta, la fascia «C», il nome e il ruolo
  const mioCap = K.mio && me.xi.find((x) => x[0] === K.mio.capitano), cap = mioCap || me.xi.slice().sort((a, b) => DATI.valore(b[1], b[3]) - DATI.valore(a[1], a[3]))[0], sc = DATI.scheda(cap, K.club);
  const foto = ritratto(K.club, cap[0], cap[2], cap[1] === 'P');
  const squadra = carta({ rotta: 'squadra', titolo: t('home.squadra'), colore: 'blu', classe: 'c-piccola c-squadra',
    corpo: `<span class="conC">${miniCarta({ val: sc.val, fascia: sc.fascia, foto })}${mioCap ? '<em class="fasciaC">C</em>' : ''}</span>`
      + `<span class="testo"><i class="su">${t(mioCap ? 'squadra.capitano' : 'squadra.migliore')}</i><b data-adatta data-due-righe>${esc(cap[0])}</b><span class="gDati"><u>${sc.ruolo}</u></span></span>` });

  // mercato: il giocatore in evidenza della lista trasferimenti con la sua carta, il nome, il ruolo, il prezzo e, se
  // arriva da una squadra vera, il suo stemma
  const c = consigliato(), cs = c && DATI.scheda(c.x, c.c.id);
  const mercato = carta({ rotta: 'mercato', titolo: t('home.mercato'), colore: 'blu', classe: 'c-piccola c-mercato',
    corpo: c ? `${miniCarta({ val: cs.val, fascia: cs.fascia, foto: ritratto(c.c.id, c.x[0], c.x[2], c.x[1] === 'P') })}<span class="testo"><b data-adatta data-due-righe>${esc(c.x[0])}</b><span class="gDati"><u>${cs.ruolo}</u>${c.da ? `<img src="${img(c.da + '-mini')}" alt="">` : ''}</span><span class="prezzo">${icona('moneta')}<b>${mon(c.costo)}</b></span></span>`
      : `${icona('mercato', 'grande')}<span class="testo"><b>${t('mercato.vuoto')}</b></span>` });

  // il mio club: lo stemma, le stelle e le tre voci, ognuna con la sua icona e il suo nome
  const voce = (ico, chiave) => `<span class="voce">${icona(ico)}<i>${t(chiave)}</i></span>`;
  const clubC = carta({ rotta: 'club', titolo: t('home.club'), colore: 'blu', bollino: note.some((n) => n.vai === 'club'), classe: 'c-piccola c-club',
    corpo: `<img class="stemma" src="${img(me.id)}" alt=""><span class="voci">${stelline(me.str)}${voce('stadio', 'club.stadio')}${voce('personalizza', 'club.personalizza')}${voce('allenamento', 'club.allenamento')}</span>` });

  radice.classList.toggle('illustrata', !!ILLUSTRAZIONI['sfondo-home']);
  radice.innerHTML = carriera + scenario + percorso + amichevole + sfide + squadra + mercato + clubC;
  adatta(radice);
}
