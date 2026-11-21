// La Carriera (livello 1, docs/navigazione.md §3.2): in alto la prossima partita con «Gioca adesso» e la classifica
// attorno alla nostra squadra; sotto il Trofeo dei Castelli e la Coppa Titano; in fondo le scorciatoie per Sfide,
// Squadra, Mercato e Il mio club.
import * as CAR from '../carriera.js';
import { img, club } from '../game.js';
import { K, salvaK, esc } from './casa.js';
import { ILLUSTRAZIONI } from './illustrazioni.js';
import { icona, stelline } from './icone.js';
import { carta, adatta } from './carte.js';
import { finestra } from './finestra.js';
import { t } from './testi.js';
import { apri, ridisegna } from './nav.js';

document.getElementById('vs').insertAdjacentHTML('beforebegin', '<div id="carriera" class="scr nas"></div>');
const radice = document.getElementById('carriera');
// quando arriva un'immagine o cambia la misura dello schermo i posti si spostano: i testi si riadattano
radice.addEventListener('load', () => adatta(radice), true);
addEventListener('resize', () => { if (!radice.classList.contains('nas')) adatta(radice); });

// cosa fa ogni carta e ogni scorciatoia
const AZIONI = {
  prossima: () => { const p = CAR.prossima(K); if (p) apri('sfida', 'camp', p.avv, t('sfida.campionato', p.giornata, p.totale, p.inCasa), !p.inCasa); else nuovaStagione(); },
  classifica: () => apri('classifica'), castelli: () => apri('castelli'), coppa: () => apri('coppa'),
  sfide: () => apri('sfide'), squadra: () => apri('squadra'), mercato: () => apri('mercato'), club: () => apri('club'),
};
radice.addEventListener('click', (e) => { const b = e.target.closest('[data-vai]'); if (b && AZIONI[b.dataset.vai]) AZIONI[b.dataset.vai](); });

/** Stagione finita: si conferma in una finestra, poi comincia la stagione nuova (il percorso premi riparte). */
function nuovaStagione() {
  const aperte = CAR.coppaProssima(K) || CAR.castelliProssima(K);
  finestra({ titolo: t('stagione.titolo', K.stagione + 1), testo: t(aperte ? 'stagione.testoCoppe' : 'stagione.testo'), si: t('stagione.si'), fatto: () => { CAR.nuovaStagione(K, CLUBS); salvaK(); ridisegna(); } });
}

// l'avversario di una carta: stemma, nome (o sigla, se il nome non ci sta) e stelle
const avversario = (id) => { const c = club(id); return `<img class="stemma" src="${img(c.id)}" alt=""><span class="chi"><b data-adatta data-min="16" data-corto="${esc(c.short)}">${esc(c.name)}</b>${stelline(c.str)}</span>`; };
// la posizione in classifica: una medaglia (oro, argento, bronzo) per i primi tre, il numero per gli altri
const posto = (n) => `<i class="pos${n <= 3 ? ' med m' + n : ''}">${n}</i>`;
const dr = (n) => (n > 0 ? `+${n}` : String(n).replace('-', '−'));
const trofeo = (nome, ico) => (ILLUSTRAZIONI[nome] ? `<img class="trofeo" src="img/illustrazioni/${nome}@2x.webp" alt="">` : icona(ico, 'trofeo'));

/** Disegna la Carriera coi dati del momento. */
export function disegnaCarriera() {
  const p = CAR.prossima(K), tab = CAR.classifica(K, CLUBS), io = tab.findIndex((r) => r.id === K.club), oggi = new Date();
  const st = CAR.statoSfide(K, oggi), note = CAR.notifiche(K, oggi);
  // prossima partita di campionato, o la stagione nuova quando il campionato è finito
  const prossima = p
    ? carta({ rotta: 'prossima', titolo: t('carriera.gioca'), nota: t('carriera.campionatoNome'), colore: 'oro', sfondo: 'carta-carriera', classe: 'k-prossima',
      corpo: `${avversario(p.avv)}<span class="quando"><b>${t('carriera.partita', p.giornata, p.totale)}</b><i>${icona(p.inCasa ? 'home' : 'avanti')} ${t(p.inCasa ? 'carriera.inCasa' : 'carriera.inTrasferta')}</i></span>`,
      piede: `<i data-adatta>${t('carriera.prepara')}</i>` })
    : carta({ rotta: 'prossima', titolo: t('carriera.nuova'), nota: t('carriera.campionatoNome'), colore: 'oro', classe: 'k-prossima',
      corpo: `${avversario(K.campione || tab[0].id)}<span class="quando"><b>${t('carriera.campione')}</b><i>${t('carriera.tuoPosto', io + 1)}</i></span>`,
      piede: `<i data-adatta>${t('carriera.nuovaStagione')}</i>` });
  // classifica: cinque righe attorno alla nostra, che è evidenziata
  const righe = 5, da = Math.max(0, Math.min(io - 2, tab.length - righe));
  const classifica = carta({ rotta: 'classifica', titolo: t('carriera.classifica'), nota: t('carriera.stagione', K.stagione), colore: 'azzurra', classe: 'k-classifica',
    corpo: `<span class="tabella"><span class="rigaC testa"><i>${t('classifica.pos')}</i><i></i><i>${t('classifica.squadra')}</i><i>${t('classifica.dr')}</i><i>${t('classifica.pt')}</i></span>`
      + tab.slice(da, da + righe).map((r, i) => { const c = club(r.id); return `<span class="rigaC${r.id === K.club ? ' io' : ''}">${posto(da + i + 1)}<img src="${img(r.id + '-mini')}" alt=""><b data-adatta data-corto="${esc(c.short)}">${esc(c.name)}</b><i>${dr(r.gf - r.gs)}</i><em>${r.pt}</em></span>`; }).join('') + '</span>' });
  // le due coppe: la prossima partita, oppure come è finita
  const coppaCarta = (rotta, titolo, classe, immagine, ico, pr, fine) => {
    const f = pr ? null : fine();
    const c = club(pr ? pr.avv : f.id);
    return carta({ rotta, titolo, colore: 'blu', classe: `k-coppa ${classe}`,
      corpo: `<img class="stemma" src="${img(c.id)}" alt=""><span class="chi"><i class="su">${pr ? t('carriera.prossimaPartita') : f.titolo}</i><b data-adatta data-min="16" data-corto="${esc(c.short)}">${esc(c.name)}</b>${stelline(c.str)}<i class="fase" data-adatta>${pr ? pr.nome : f.testo}</i></span>${trofeo(immagine, ico)}` });
  };
  const kc = K.castelli, camC = CAR.castelliCampione(K), k = K.coppa;
  const castelli = coppaCarta('castelli', t('carriera.castelli'), 'k-castelli', 'trofeo-castelli', 'castelli', CAR.castelliProssima(K),
    () => ({ id: camC || K.club, titolo: t(kc.vinta ? 'carriera.vinto' : 'carriera.finito'), testo: kc.vinta ? t('carriera.tuo') : t('carriera.fuoriA', kc.fuori === 'gironi' ? t('carriera.aiGironi') : CAR.TURNI_KO[kc.fuori].toLowerCase()) }));
  const coppa = coppaCarta('coppa', t('carriera.coppa'), 'k-titano', 'coppa-titano', 'coppa', CAR.coppaProssima(K),
    () => ({ id: k.campione || K.club, titolo: t(k.vinta ? 'carriera.vinta' : 'carriera.finita'), testo: k.vinta ? t('carriera.tua') : t('carriera.fuoriA', CAR.TURNI[k.fuori].toLowerCase()) }));
  // scorciatoie, col bollino dove c'è qualcosa da ritirare o da migliorare
  const scorciatoia = (rotta, ico, bollino) => `<button class="scorc" data-vai="${rotta}">${icona(ico)}<b>${t('home.' + rotta)}</b>${bollino ? '<em class="bollino">!</em>' : ''}</button>`;
  radice.classList.toggle('illustrata', !!ILLUSTRAZIONI['sfondo-home']);
  radice.innerHTML = prossima + classifica + castelli + coppa
    + `<span class="scorciatoie">${scorciatoia('sfide', 'sfide', st.daRiscuotere > 0)}${scorciatoia('squadra', 'squadra', false)}${scorciatoia('mercato', 'mercato', false)}${scorciatoia('club', 'club', note.some((n) => n.vai === 'stadio' || n.vai === 'allenatore'))}</span>`;
  adatta(radice);
}
