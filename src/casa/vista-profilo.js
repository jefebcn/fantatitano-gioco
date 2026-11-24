// Il Profilo (bozza di Alex del 24/11). A sinistra «chi sei»: l'avatar grande, il nome, il club con le sue stelle, il
// livello del percorso premi e gli avatar tra cui scegliere. A destra in alto «Il tuo club», tre tessere che aprono
// nome e colori, avatar e cornici, pezzi dello stemma; in basso l'account Fantatitano, per salvare la carriera.
// Senza una carriera (dal benvenuto) resta solo il pannello dell'account, al centro.
import * as CAR from '../carriera.js';
import * as CLOUD from '../cloud.js';
import { img } from '../game.js';
import { PANNELLI } from '../config.js';
import { K, pan, esc, club, ritratto, testoCloud } from './casa.js';
import { figura } from './immagini.js';
import { icona } from './icone.js';
import { adatta } from './carte.js';
import { pannello } from './quadri.js';
import { t } from './testi.js';

// l'avatar numero n del manager: un busto disegnato dal modello 3D (cambia il seme, quindi faccia e capelli)
const avatarNome = (n) => `${K.nome}${n ? `#${n}` : ''}`;
const avatar = (n) => `<img src="${ritratto(K.club, avatarNome(n), '', false, true)}" alt="">`;

// L'account: chi è connesso con «Salva adesso» ed «Esci», oppure i due campi e «Accedi»
function account() {
  const a = CLOUD.info(), u = a.utente;
  if (u) return `<p class="uFrase">${t('profilo.connesso', esc(u.nome || u.email))}</p><p class="uNota" id="accStato">${testoCloud(a.stato)}</p><div class="uForm"><button data-az="salvaora" class="kOro">${t('profilo.salva')}</button><button data-az="esci" class="kBlu">${t('profilo.esci')}</button></div>`;
  if (a.stato === 'spento') return `<p class="uFrase">${t('profilo.spento')}</p>`;
  return `<p class="uFrase">${t('profilo.accedi')}</p><div class="uForm"><input id="accEmail" type="email" autocomplete="username" placeholder="Email" enterkeyhint="next"><input id="accPw" type="password" autocomplete="current-password" placeholder="Password" enterkeyhint="go"><button data-az="accedi" class="kOro">${t('profilo.entra')}</button></div>`
    + `<p class="uNota" id="accErr"></p><p class="uNota">${t('profilo.crea')} <a href="https://fantatitano.site" target="_blank" rel="noopener">fantatitano.site</a></p>`;
}

// la freccia azzurra delle tessere
const FRECCIA = '<svg class="uVai" viewBox="0 0 10 16" aria-hidden="true"><path d="M2.5 2.5 8 8l-5.5 5.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/** Disegna il Profilo. */
export function panProfilo() {
  if (!K) return pan(t('profilo.account'), pannello('uAccount', t('profilo.accountTitolo'), account()), '', 'account');
  const me = club(K.club), pe = CAR.statoPercorso(K), scelta = K.scelte && CAR.possiede(K, 'cornice', K.scelte.cornice) ? K.scelte.cornice : 'semplice';
  const miei = CAR.NEGOZIO.avatar.tutti.filter((n) => CAR.possiede(K, 'avatar', n));
  const chi = `<span class="uAvatar tondo cor-${scelta}">${avatar(K.avatar || 0)}</span><b class="uNome" data-adatta data-min="18">${esc(K.nome)}</b><i class="uClub">${t('profilo.mister', esc(me.name), me.str)}</i>`
    + `<span class="uLivello"><b>${t('profilo.livello', pe.inCorso)}</b><i>${pe.livello >= pe.livelli ? t('percorso.completo') : `${pe.nelLivello} / ${pe.perLivello}`}</i></span>`
    + `<h3 class="kTitolo uCambia">${t('profilo.cambia')}</h3><div class="uScelta">${miei.map((n) => `<button data-avatar="${n}" class="${n === (K.avatar || 0) ? 'on' : ''}" aria-label="${t('profilo.avatar', n + 1)}">${avatar(n)}</button>`).join('')}</div>`;
  // le tre tessere: l'icona, il titolo su due righe, una riga di spiegazione e la freccia
  const tessera = (attr, ico, chiave) => `<button class="kTess uTess" ${attr}>${ico}<b>${t(chiave)}</b><i>${t(chiave + '.sotto')}</i>${FRECCIA}</button>`;
  const stemma = `<img class="uIco" src="${img(me.id + '-mini')}" alt="">`;
  const tuo = `<div class="uTessere">${tessera('data-club="personalizza"', stemma, 'profilo.nome')}${tessera('data-ntab="manager"', figura('icona-allenatore-raro', 'uIco', PANNELLI.profilo.scelta) || icona('manager', 'uIco'), 'profilo.avatarCornici')}${tessera('data-ntab="stemma"', stemma, 'profilo.pezzi')}</div>`;
  pan(K.nome, pannello('uChi', '', chi) + pannello('uClubTuo', t('profilo.tuoClub'), tuo) + pannello('uAccount', t('profilo.accountTitolo'), account()), '', 'profilo');
  // un nome lungo si rimpicciolisce finché sta nella colonna
  adatta(document.getElementById('panC'));
}
