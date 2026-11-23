// La Home (livello 0): un menu di otto carte grandi su tre righe (docs/navigazione.md §2).
// Riga 1 (38%): Carriera (due terzi) e Amichevole. Riga 2 (27%): Percorso premi (due terzi) e Scenario, che finché è
// chiuso sta nella riga più bassa e più piccola.
// Riga 3 (35%): Sfide, Squadra, Mercato, Il mio club. Ogni carta riassume la sua sezione coi dati salvati e la apre.
import * as CAR from '../carriera.js';
import { ECONOMIA } from '../config.js';
import { img } from '../game.js';
import { nomiDi } from '../dati/squadre.js';
import { K, DATI, mon, consigliato, avviso, esc, club } from './casa.js';
import { pronta, figura } from './immagini.js';
import { icona, stelline } from './icone.js';
import { carta, adatta, attrNome } from './carte.js';
import { miniCarta, chiRitratto, riempiRitratti } from './giocatore.js';
import { t } from './testi.js';
import { apri } from './nav.js';

document.getElementById('vs').insertAdjacentHTML('beforebegin', '<div id="casa" class="scr nas"></div>');
const radice = document.getElementById('casa');
radice.addEventListener('click', (e) => {
  const b = e.target.closest('.carta'); if (!b) return;
  // il pulsante «Gioca» della carta Carriera porta dritto alla prossima partita di campionato, senza passare dalla Carriera
  const p = e.target.closest('[data-gioca]') && CAR.prossima(K);
  if (p) return apri('sfida', 'camp', p.avv, t('sfida.campionato', p.giornata, p.totale, p.inCasa), !p.inCasa);
  if (b.dataset.chiusa) return avviso(t('inArrivo'));
  apri(b.dataset.vai);
});
// quando arriva un'immagine (lo stemma, il ritratto) o cambia la misura dello schermo i posti si spostano: i testi si riadattano
radice.addEventListener('load', () => adatta(radice), true);
addEventListener('resize', () => { if (!radice.classList.contains('nas')) adatta(radice); });

// una riga della carta Carriera: il trofeo della competizione (o la sua icona, se manca l'illustrazione), il suo nome e a
// che punto si è; se non ci sta, solo il punto
const riga = (ico, trofeo, nome, stato) => `<span class="riga">${figura(trofeo, 'trofeino', 16) || icona(ico)}<i data-adatta data-corto="${stato}">${nome} · ${stato}</i></span>`;
// un premio del percorso: il numero del livello, l'icona (moneta o diamante) e la quantità
const premio = (x, prossimo) => `<span class="premioL${prossimo ? ' pross' : ''}"><i>${x.livello}</i>${icona(x.monete ? 'moneta' : 'diamante')}<b>${mon(x.monete || x.gemme)}</b></span>`;
// un anello di avanzamento delle sfide, con l'etichetta sotto
const anello = (fatte, tot, chiave) => `<span class="giro"><b style="--p:${Math.round(fatte / Math.max(1, tot) * 100)}">${fatte}/${tot}</b><i>${t(chiave)}</i></span>`;

/** Disegna la Home coi dati del momento. */
export function disegnaHome() {
  const me = club(K.club), nomi = nomiDi(me), oggi = new Date(), p = CAR.prossima(K), tab = CAR.classifica(K, CLUBS), pos = tab.findIndex((r) => r.id === K.club) + 1;
  const st = CAR.statoSfide(K, oggi), pe = CAR.statoPercorso(K), note = CAR.notifiche(K, oggi);

  // carriera: lo stemma grande, il nome e le stelle, una riga per competizione; a destra il pulsante grande «Gioca» con
  // l'avversario della prossima partita di campionato (a stagione finita dice «Nuova stagione» e apre la Carriera)
  const cp = CAR.coppaProssima(K), cc = CAR.castelliProssima(K);
  const campionato = p ? t('carriera.campionato', pos, p.giornata, p.totale) : t('carriera.campionatoFinito', pos);
  const coppa = cp ? cp.nome : t(K.coppa.vinta ? 'carriera.vinta' : 'carriera.fuori');
  const castelli = cc ? (cc.fase === 'gironi' ? t('carriera.gironi') : cc.nome) : t(K.castelli.vinta ? 'carriera.vinto' : 'carriera.fuori');
  const avv = p && club(p.avv), nAvv = avv && nomiDi(avv);
  const carriera = carta({ rotta: 'carriera', titolo: t('home.carriera'), colore: 'oro', sfondo: 'carta-carriera', classe: 'c-carriera',
    corpo: `<img class="stemma" src="${img(me.id)}" alt=""><span class="club"><span class="nome"><b ${attrNome(nomi, 16)}>${esc(nomi.nome)}</b>${stelline(me.str)}</span>`
      + `${riga('campionato', 'trofeo-campionato', t('carriera.campionatoNome'), campionato)}${riga('coppa', 'coppa-titano', t('carriera.coppa'), coppa)}${riga('castelli', 'trofeo-castelli', t('carriera.castelli'), castelli)}</span>`
      + (avv ? `<span class="gioca" data-gioca><b>${t('home.gioca')}</b><span><img src="${img(avv.id + '-mini')}" alt=""><i ${attrNome({ breve: nAvv.sigla, sigla: nAvv.sigla })}>${esc(nAvv.breve)}</i></span><u>${t(p.inCasa ? 'carriera.inCasa' : 'carriera.inTrasferta')}</u></span>`
        : `<span class="gioca"><b data-adatta data-min="16">${t('carriera.nuova')}</b></span>`),
    piede: `<i data-adatta>${t('carriera.motto', CAR.divisione(K).nome, K.stagione)}</i>` });

  // scenario: ancora chiuso, finché la partita non sa partire da un minuto e da un punteggio dati; si vede il premio
  const scenario = carta({ rotta: 'scenario', titolo: t('home.scenario'), colore: 'rossa', chiusa: true, sfondo: 'carta-scenario', classe: 'c-scenario',
    corpo: `<span class="testo"><b data-adatta data-min="13" data-due-righe>${t('scenario.esempio')}</b></span><span class="prezzo">${icona('diamante')}<b>+${ECONOMIA.scenario.g}</b></span>` });

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
  const squadra = carta({ rotta: 'squadra', titolo: t('home.squadra'), colore: 'blu', classe: 'c-piccola c-squadra',
    corpo: `<span class="conC">${miniCarta({ val: sc.val, fascia: sc.fascia, ritr: chiRitratto(K.club, sc, 'carta') })}${mioCap ? '<em class="fasciaC">C</em>' : ''}</span>`
      + `<span class="testo"><i class="su">${t(mioCap ? 'squadra.capitano' : 'squadra.migliore')}</i><b data-adatta data-due-righe>${esc(cap[0])}</b><span class="gDati"><u>${sc.ruolo}</u></span></span>` });

  // mercato: il giocatore più forte che ci si può permettere adesso (tra lista trasferimenti e offerte a tempo) con la sua
  // carta e il ritratto, il ruolo sulla carta, il nome e il prezzo; se non ci si può permettere nessuno, il meno caro
  const c = consigliato(), cs = c && DATI.scheda(c.x, c.c.id);
  const mercato = carta({ rotta: 'mercato', titolo: t('home.mercato'), colore: 'blu', classe: 'c-piccola c-mercato',
    corpo: c ? `<span class="conC">${miniCarta({ val: cs.val, fascia: cs.fascia, ritr: chiRitratto(c.c.id, cs, 'carta') })}<em class="ruoloC">${cs.ruolo}</em></span>`
      + `<span class="testo"><i class="su${c.posso ? ' si' : ''}" data-adatta data-due-righe>${t(c.posso ? 'mercato.perTe' : 'mercato.menoCaro')}</i><b data-adatta data-due-righe>${esc(c.x[0])}</b>`
      + `<span class="prezzo${c.posso ? '' : ' caro'}"><span>${icona('moneta')}<b>${mon(c.costo)}</b></span>${c.gemme ? `<span>${icona('diamante')}<b>${c.gemme}</b></span>` : ''}</span></span>`
      : `${icona('mercato', 'grande')}<span class="testo"><b>${t('mercato.vuoto')}</b></span>` });

  // il mio club: lo stemma, le stelle e le tre voci, ognuna con la sua icona e il suo nome
  const voce = (ico, chiave) => `<span class="voce">${icona(ico)}<i>${t(chiave)}</i></span>`;
  const clubC = carta({ rotta: 'club', titolo: t('home.club'), colore: 'blu', bollino: note.some((n) => n.vai === 'club'), classe: 'c-piccola c-club',
    corpo: `<img class="stemma" src="${img(me.id)}" alt=""><span class="voci">${stelline(me.str)}${voce('stadio', 'club.stadio')}${voce('personalizza', 'club.personalizza')}${voce('allenamento', 'club.allenamento')}</span>` });

  radice.classList.toggle('illustrata', pronta('sfondo-home'));
  radice.innerHTML = carriera + amichevole + percorso + scenario + sfide + squadra + mercato + clubC;
  adatta(radice); riempiRitratti(radice);
}
