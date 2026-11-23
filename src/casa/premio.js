// L'apertura di un premio: una busta (blu per il premio del giorno e le sfide, argento per il percorso premi, oro per la
// fine della stagione) entra dal basso con un rimbalzo, vibra mentre dietro cresce una luce dorata, si strappa in alto
// con un lampo e una pioggia di scintille, e il premio sale con un riflesso che lo attraversa. Con la busta d'oro
// l'apertura è più lunga, dietro girano i raggi e i premi si vedono uno alla volta, grandi, prima dell'elenco.
// Un tocco durante l'apertura la salta (coi premi uno alla volta passa al prossimo). Chi ha chiesto al telefono meno
// movimento vede subito il premio.
// Le immagini sono illustrazioni nostre (assets/arrivo/premi, importate da scripts/importa_immagini.py). Il movimento è
// scritto da noi con le animazioni del browser, senza librerie; anima solo posizione, rotazione, grandezza e
// trasparenza, che non pesano sul telefono. Il ritmo delle due aperture è ispirato a card-pack-animations (docs/crediti.md).
import { PREMIO } from '../config.js';
import { ILLUSTRAZIONI } from './illustrazioni.js';
import { t } from './testi.js';

const DOVE = 'img/illustrazioni/', M = PREMIO.misure;
// un'illustrazione alle tre grandezze: il browser prende quella giusta per lo schermo. largo: quanto è larga sullo
// schermo, in centesimi dell'altezza
const figura = (nome, largo, classe) => `<img${classe ? ` class="${classe}"` : ''} src="${DOVE}${nome}@2x.webp" srcset="${[1, 2, 3].map((k) => `${DOVE}${nome}@${k}x.webp ${ILLUSTRAZIONI[nome][0] * k}w`).join(', ')}" sizes="${Math.round(largo)}vh" alt="" draggable="false">`;
const numero = (n) => n.toLocaleString('it-IT');
// un premio: la sua figura, col riflesso ritagliato sulla sua sagoma, il numero e che cos'è
const premio = (p, lato) => `<span class="pPremio"><span class="pFig" style="--img:url(${DOVE}${p.figura}@2x.webp)">${figura(p.figura, lato)}<i class="pRifl"><b></b></i></span><b>+${numero(p.quanti)}</b><i>${p.nota}</i></span>`;

document.getElementById('vs').insertAdjacentHTML('beforebegin', `<div id="premio" class="nas" role="dialog" aria-modal="true">
  <i class="pRaggi" aria-hidden="true"></i><i class="pAlone" aria-hidden="true"></i><span class="pBusta"></span><i class="pLampo" aria-hidden="true"></i><span class="pScintille" aria-hidden="true"></span><div class="pUno nas"></div>
  <div class="pDentro nas"><h3 id="prT"></h3><p id="prS"></p><div class="pLista" id="prL"></div><button class="bottone" id="prOk">${t('dopo.continua')}</button></div></div>`);
const radice = document.getElementById('premio'), el = (s) => radice.querySelector(s), FORMA = ILLUSTRAZIONI['busta-giorno'];
// le misure dello stile vengono da qui, così stanno in un posto solo
radice.style.setProperty('--busta', M.busta); radice.style.setProperty('--fig', M.premio); radice.style.setProperty('--uno', M.uno); radice.style.setProperty('--forma', `${FORMA[0]}/${FORMA[1]}`);

// corsa: cambia a ogni apertura e a ogni salto, così un'apertura interrotta smette di andare avanti. vive: le animazioni
// della scena; scie: lampo e scintille, che finiscono da sole; giro: i raggi che girano. quando: cosa fare alla
// chiusura. avanti: durante una pausa, la funzione che la fa finire subito. elenco: i premi di questa apertura.
// dalle: da quando si vede l'elenco dei premi
let corsa = 0, vive = [], scie = [], giro = null, quando = null, avanti = null, elenco = [], dalle = 0;

// un'animazione del browser che resta sull'ultimo fotogramma; torna quando è finita (o è stata fermata)
function va(cosa, fotogrammi, durata, curva = 'ease-in-out', ritardo = 0, lista = vive) {
  const a = cosa.animate(fotogrammi, { duration: durata, delay: ritardo, easing: curva, fill: 'both' }); lista.push(a);
  return a.finished.catch(() => {});
}
function spegni() { for (const a of vive.concat(scie)) a.cancel(); if (giro) giro.cancel(); vive = []; scie = []; giro = null; avanti = null; el('.pScintille').textContent = ''; }
// una pausa che un tocco può far finire prima
const pausa = (ms) => new Promise((si) => { const fine = () => { if (avanti === fine) avanti = null; si(); }; avanti = fine; setTimeout(fine, ms); });
// aspetta che le immagini dentro `dove` siano pronte da disegnare, ma non più di PREMIO.attesa
const pronte = (dove) => Promise.race([Promise.all([...dove.querySelectorAll('img')].map((i) => i.decode().catch(() => {}))), new Promise((si) => { setTimeout(si, PREMIO.attesa); })]);

// le scintille: partono dal centro in tutte le direzioni, rallentano, ricadono un poco e si spengono
function scintille(quante) {
  const S = PREMIO.scintilla, dove = el('.pScintille'), tra = ([a, b]) => a + Math.random() * (b - a), alto = window.innerHeight;
  for (let i = 0; i < quante; i++) {
    const s = document.createElement('i'), verso = Math.random() * Math.PI * 2, lontano = tra(S.lancio) * alto, x = Math.cos(verso) * lontano, y = Math.sin(verso) * lontano, grande = tra(S.grande);
    if (i % 3 === 0) s.className = 'rombo';
    s.style.width = s.style.height = `${grande.toFixed(1)}px`; dove.appendChild(s);
    va(s, [{ opacity: 0, transform: 'translate(0,0) scale(.4)' }, { opacity: 1, transform: `translate(${x * .3}px,${y * .3}px) scale(1)`, offset: .12 }, { opacity: 1, transform: `translate(${x * .88}px,${y * .88}px) scale(1)`, offset: .6 }, { opacity: 0, transform: `translate(${x}px,${y + S.cade * alto}px) scale(.3)` }], tra(S.dura), 'ease-out', 0, scie);
  }
}
// un premio che sale: parte da sotto, piccolo, supera un poco il suo posto e ci torna; poi il riflesso lo attraversa
function sale(cosa, durata, ritardo = 0) {
  va(cosa, [{ opacity: 0, transform: 'translateY(45%) scale(.55)' }, { opacity: 1, transform: 'translateY(-6%) scale(1.07)', offset: .68 }, { opacity: 1, transform: 'translateY(0) scale(1)' }], durata, 'ease-out', ritardo);
  va(cosa.querySelector('.pRifl b'), [{ transform: 'translateX(-130%) skewX(-18deg)' }, { transform: 'translateX(270%) skewX(-18deg)' }], PREMIO.riflesso, 'ease-in-out', ritardo + durata * .6);
}

// la busta: entra, vibra con la luce che cresce, si strappa col lampo e le scintille, sparisce
async function busta(mia, T) {
  const b = el('.pBusta'), alone = el('.pAlone'), n = T.onde.length, piena = 1 + T.cresce; let prima = 0;
  await pronte(b); if (mia !== corsa) return;
  await va(b, [{ opacity: 0, transform: 'translateY(75%) scale(.6)' }, { opacity: 1, transform: 'translateY(-7%) scale(1.06)', offset: .5 }, { opacity: 1, transform: 'translateY(3%) scale(.97)', offset: .76 }, { opacity: 1, transform: 'translateY(0) scale(1)' }], T.entra, 'ease-out'); if (mia !== corsa) return;
  for (let i = 0; i < n; i++) {
    const [ms, gradi] = T.onde[i], a0 = i / n, a1 = (i + 1) / n;
    va(alone, [{ opacity: a0 * T.alone, transform: `scale(${.5 + a0 * .5})` }, { opacity: a1 * T.alone, transform: `scale(${.5 + a1 * .5})` }], ms, 'linear');
    await va(b, [{ transform: `rotate(${prima}deg) scale(${1 + a0 * T.cresce})` }, { transform: `rotate(${gradi}deg) scale(${1 + a1 * T.cresce})` }], ms); if (mia !== corsa) return; prima = gradi;
  }
  if (T.pausa) { await va(b, [{ transform: `rotate(${prima}deg) scale(${piena})` }, { transform: `rotate(0deg) scale(${piena})` }], T.pausa); if (mia !== corsa) return; }
  va(el('.pStrappo'), [{ opacity: 1, transform: 'translate(0,0) rotate(0deg)' }, { opacity: 0, transform: 'translate(55%,-280%) rotate(38deg)' }], T.strappo, 'ease-out');
  va(el('.pLampo'), [{ opacity: 0, transform: 'scale(.3)' }, { opacity: 1, transform: 'scale(1)', offset: .35 }, { opacity: 0, transform: 'scale(1.5)' }], T.lampo, 'ease-out', T.strappo * .4, scie);
  scintille(T.scintille);
  va(alone, [{ opacity: T.alone, transform: 'scale(1)' }, { opacity: PREMIO.riposo, transform: 'scale(1)' }], T.strappo + T.via, 'ease-out');
  await va(b, [{ opacity: 1, transform: `translateY(0) scale(${piena})` }, { opacity: 0, transform: `translateY(9%) scale(${piena * .92})` }], T.via, 'ease-in', T.strappo * .5);
}
// i premi uno alla volta, grandi al centro: ognuno sale col suo riflesso, resta, va via verso l'alto
async function unoAllaVolta(mia) {
  const U = PREMIO.lunga.uno, dove = el('.pUno');
  dove.classList.remove('nas');
  for (const p of elenco) {
    dove.innerHTML = premio(p, M.uno); await pronte(dove); if (mia !== corsa) return;
    sale(dove.firstChild, U.sale); await pausa(U.sale + U.resta); if (mia !== corsa) return;
    await va(dove.firstChild, [{ opacity: 1, transform: 'translateY(0) scale(1)' }, { opacity: 0, transform: 'translateY(-12%) scale(.9)' }], U.via, 'ease-in'); if (mia !== corsa) return;
  }
}

// si vede l'elenco dei premi: la busta non c'è più, resta la luce dorata e i premi salgono uno dopo l'altro
function mostra(conMoto) {
  avanti = null; dalle = performance.now(); el('.pBusta').classList.add('nas'); el('.pUno').classList.add('nas'); el('.pDentro').classList.remove('nas'); radice.classList.add('aperto');
  el('.pAlone').style.opacity = PREMIO.riposo;
  if (conMoto) [...el('#prL').children].forEach((p, i) => sale(p, PREMIO.sale, i * PREMIO.tra));
}
function chiudi() { corsa++; spegni(); radice.classList.add('nas'); const f = quando; quando = null; if (f) f(); }
radice.addEventListener('click', (e) => {
  // durante l'apertura un tocco la salta, o passa al premio dopo quando si vedono uno alla volta
  if (!radice.classList.contains('aperto')) { if (avanti) return avanti(); corsa++; spegni(); return mostra(true); }
  // a premio aperto si chiude dal pulsante; nella breve anche con un tocco qualsiasi, passato un momento
  if (e.target.closest('#prOk') || (radice.classList.contains('breve') && performance.now() - dalle > PREMIO.guardia)) chiudi();
});

/** L'elenco dei premi da mostrare, da un esito della carriera: monete, diamanti, allenatori di una rarità, contatti dell'agente, punti del percorso premi. */
export const premiDa = ({ monete = 0, gemme = 0, allenatori = 0, rarita = 'raro', contatti = 0, punti = 0 }) => [
  { figura: 'icona-monete', quanti: monete, nota: t('premio.monete', monete) }, { figura: 'icona-diamanti', quanti: gemme, nota: t('premio.diamanti', gemme) },
  { figura: `icona-allenatore-${rarita}`, quanti: allenatori, nota: t('premio.allenatore', rarita, allenatori) }, { figura: 'icona-contatto-agente', quanti: contatti, nota: t('premio.contatto', contatti) },
  { figura: 'icona-punti-percorso', quanti: punti, nota: t('premio.punti', punti) }];

/**
 * Apre un premio. titolo e sotto: le due scritte in cima all'elenco; premi: elenco di { figura, quanti, nota }, con
 * `figura` il nome di un'illustrazione e `nota` scritta sotto il numero (per esempio «allenatore raro»); busta:
 * 'giorno' (blu), 'percorso' (argento) o 'stagione' (oro, con l'apertura lunga); fatto: cosa fare quando si chiude.
 */
export function apriPremio({ titolo, sotto = '', premi, busta: quale = 'giorno', fatto = null }) {
  const mia = ++corsa, lungo = quale === 'stagione', largo = M.busta * FORMA[0] / FORMA[1]; spegni(); quando = fatto;
  elenco = premi.filter((p) => p && p.quanti > 0);
  el('#prT').textContent = titolo; el('#prS').textContent = sotto; el('#prS').classList.toggle('nas', !sotto);
  el('#prL').innerHTML = elenco.map((p) => premio(p, M.premio)).join('');
  // la busta è la stessa immagine due volte: il corpo, e il bordo in alto che si strappa
  el('.pBusta').innerHTML = figura(`busta-${quale}`, largo, 'pCorpo') + figura(`busta-${quale}`, largo, 'pStrappo');
  radice.classList.remove('nas', 'aperto'); radice.classList.toggle('breve', !lungo); radice.classList.toggle('raggi', lungo);
  el('.pBusta').classList.remove('nas'); el('.pDentro').classList.add('nas'); el('.pUno').classList.add('nas'); el('.pAlone').style.opacity = '';
  // senza movimento (chi lo ha chiesto al telefono, o le prove automatiche) si vede subito il premio
  if (window.__fermo || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return mostra(false);
  if (lungo) giro = el('.pRaggi').animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { duration: PREMIO.raggi, iterations: Infinity });
  busta(mia, lungo ? PREMIO.lunga : PREMIO.breve).then(() => (mia === corsa && lungo && elenco.length > 1 ? unoAllaVolta(mia) : null)).then(() => { if (mia === corsa) mostra(true); });
}
