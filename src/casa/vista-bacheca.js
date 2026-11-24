// La Bacheca (richiesta di Alex del 24/11), dentro «Il mio club»: quello che il club ha vinto e fatto finora. A sinistra
// i tre trofei: quelli vinti a colori col numero di volte, gli altri grigi e trasparenti. A destra in alto i numeri
// della carriera (partite, vinte, pareggiate, perse, gol fatti e subiti); in basso il capocannoniere con la sua carta,
// la stessa del campo (grande quanto lascia l'altezza del pannello), e accanto il secondo e il terzo, se ci stanno.
// Stile e misure sono quelli delle schermate a pannelli (quadri.js, PANNELLI in src/config.js).
import * as CAR from '../carriera.js';
import { PANNELLI } from '../config.js';
import { K, DATI, pan, esc, club } from './casa.js';
import { figura } from './immagini.js';
import { icona } from './icone.js';
import { adatta } from './carte.js';
import { cartaGiocatore, prontaCarte } from './giocatore.js';
import { pannello } from './quadri.js';
import { t } from './testi.js';

// i tre trofei: l'illustrazione e il nome con cui la carriera li ricorda (`tipo` in C.trofei)
const TROFEI = [['trofeo-campionato', 'Campionato'], ['coppa-titano', 'Coppa Titano'], ['trofeo-castelli', 'Trofeo dei Castelli']];

/** Disegna la Bacheca. */
export function panBacheca() {
  const B = PANNELLI.bacheca, me = club(K.club), s = K.stat;
  const trofei = TROFEI.map(([fig, tipo]) => { const n = K.trofei.filter((x) => x.tipo === tipo).length;
    return `<div class="kTess bTrofeo${n ? '' : ' mai'}">${figura(fig, 'bFig', B.trofeo) || icona('coppa', 'bFig')}<span><b>${t('bacheca.trofeo.' + fig)}</b><i>${n ? t('bacheca.vinto', n) : t('bacheca.mai')}</i></span>${n ? `<em>${n}</em>` : ''}</div>`; }).join('');
  const numeri = [['partite', s.g], ['vinte', s.v], ['pareggiate', s.n], ['perse', s.p], ['golFatti', s.gf], ['golSubiti', s.gs]]
    .map(([k, n]) => `<div class="kTess bNumero"><b>${n}</b><i>${t('bacheca.' + k)}</i></div>`).join('');
  // i marcatori: del primo la carta (se gioca ancora nel club), il nome e i gol in grande; degli altri nome e gol
  const primi = CAR.marcatori(K, 1 + B.altri), rosa = me.xi.concat(me.pan || []), gol = (n) => `<span class="bGol"><b>${n}</b><i>${t('bacheca.gol', n)}</i></span>`;
  let cannoniere = `<p class="bVuoto">${t('bacheca.nessunGol')}</p>`;
  if (primi.length) {
    const [primo, ...altri] = primi, x = rosa.find((g) => g[0] === primo.nome), sc = x ? DATI.scheda(x, K.club) : null;
    cannoniere = `<div class="bPrimo">${sc ? `<span class="bCarta">${cartaGiocatore(sc, { club: K.club, larga: B.carta, ferma: true, entra: true })}</span>` : ''}`
      + `<span class="bChi"><b data-adatta data-due-righe>${esc(primo.nome)}</b><i>${sc ? `${sc.ruolo} · ${sc.val}` : t('bacheca.partito')}</i></span>${gol(primo.gol)}</div>`
      + (altri.length ? `<div class="bAltri">${altri.map((a, i) => `<div class="kTess bAltro"><u>${i + 2}°</u><b data-adatta>${esc(a.nome)}</b>${gol(a.gol)}</div>`).join('')}</div>` : '');
  }
  pan(t('bacheca.titolo'), pannello('bTrofei', t('bacheca.trofei'), `<div class="bLista">${trofei}</div>`)
    + pannello('bCarriera', t('bacheca.carriera'), `<div class="bNumeri">${numeri}</div>`, `<i class="bLato">${t('bacheca.stagione', K.stagione)}</i>`)
    + pannello('bCannoniere', t('bacheca.capocannoniere'), `<div class="bMarcatori">${cannoniere}</div>`), '', 'bacheca');
  // i nomi lunghi si adattano, e la carta prende ritratto e cognome
  const dentro = document.getElementById('panC'); adatta(dentro); prontaCarte(dentro);
}
