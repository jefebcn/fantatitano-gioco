// L'apertura di un premio: una busta coi colori di Fantatitano che si apre e mostra cosa c'è dentro. Due versioni: breve
// (meno di un secondo: la busta ondeggia, la linguetta si strappa) per il premio del giorno e i premi riscossi; lunga
// (circa tre secondi: ondeggia sempre più forte e più in fretta, si accende, scoppia) per i premi di fine stagione.
// Un tocco durante l'apertura la salta. Chi ha chiesto al telefono meno movimento vede subito il premio.
// È scritta da noi con le animazioni del browser, senza librerie; anima solo posizione, rotazione, grandezza e
// trasparenza, che non pesano sul telefono. Il ritmo delle due aperture è ispirato a card-pack-animations (docs/crediti.md).
import { PREMIO } from '../config.js';
import { icona } from './icone.js';
import { t } from './testi.js';

// il disegno sulla busta: il monte e le tre torri
const TORRI = '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M2 60 14 40l8 6 10-20 10 20 8-6 12 20z" opacity=".55"/><path d="M10 40V26h2v-3h2v3h2v-3h2v3h2v14zM27 30V10h2V7h2v3h2V7h2v3h2v20zM44 40V26h2v-3h2v3h2v-3h2v3h2v14z"/></svg>';
document.getElementById('vs').insertAdjacentHTML('beforebegin', `<div id="premio" class="nas" role="dialog" aria-modal="true">
  <div class="pScena"><i class="pAlone"></i><span class="pBusta"><i class="pLinguetta"></i><span class="pCorpo">${TORRI}</span></span><i class="pLampo"></i></div>
  <div class="pDentro nas"><h3 id="prT"></h3><p id="prS"></p><div class="pLista" id="prL"></div><button class="bottone" id="prOk">${t('dopo.continua')}</button></div></div>`);
const radice = document.getElementById('premio'), el = (s) => radice.querySelector(s);
// corsa: cambia a ogni apertura e a ogni salto, così un'apertura interrotta smette di andare avanti. vive: le animazioni
// in corso. quando: cosa fare alla chiusura
let corsa = 0, vive = [], quando = null;
const ICONE = { monete: 'moneta', diamanti: 'diamante', allenatore: 'allenatore', contatto: 'mercato' };
const numero = (n) => n.toLocaleString('it-IT');

// un'animazione del browser che resta sull'ultimo fotogramma; torna quando è finita (o è stata fermata)
function va(cosa, fotogrammi, durata, curva = 'ease-in-out', ritardo = 0) {
  const a = cosa.animate(fotogrammi, { duration: durata, delay: ritardo, easing: curva, fill: 'both' }); vive.push(a);
  return a.finished.catch(() => {});
}
const ferma = () => { for (const a of vive) a.cancel(); vive = []; };

// la busta breve: ondeggia, la linguetta si ritira da sinistra, un lampo, la busta scende e sparisce
async function breve(mia) {
  const B = PREMIO.breve, busta = el('.pBusta'); let prima = 0;
  for (const [ms, gradi] of B.onde) { await va(busta, [{ transform: `rotate(${prima}deg)` }, { transform: `rotate(${gradi}deg)` }], ms); if (mia !== corsa) return; prima = gradi; }
  await va(el('.pLinguetta'), [{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], B.strappo, 'cubic-bezier(.55,.055,.675,.19)'); if (mia !== corsa) return;
  va(el('.pLampo'), [{ opacity: 0, transform: 'scale(.4)' }, { opacity: .9, transform: 'scale(1)', offset: .5 }, { opacity: 0, transform: 'scale(1.4)' }], B.lampo, 'ease-out');
  await va(busta, [{ opacity: 1, transform: `rotate(${prima}deg) translateY(0) scale(1)` }, { opacity: 0, transform: 'rotate(0deg) translateY(12px) scale(.9)' }], B.via, 'ease-in');
}
// la busta lunga: ogni ondata è più ampia e più corta della precedente e l'alone dietro cresce; poi una pausa, lo scoppio
async function lunga(mia) {
  const L = PREMIO.lunga, busta = el('.pBusta'), alone = el('.pAlone'), n = L.onde.length; let prima = 0;
  for (let i = 0; i < n; i++) {
    const [ms, gradi] = L.onde[i], a0 = i / n, a1 = (i + 1) / n;
    va(alone, [{ opacity: a0 * L.alone, transform: `scale(${.6 + a0 * .7})` }, { opacity: a1 * L.alone, transform: `scale(${.6 + a1 * .7})` }], ms, 'linear');
    await va(busta, [{ transform: `rotate(${prima}deg) scale(${1 + a0 * .12})` }, { transform: `rotate(${gradi}deg) scale(${1 + a1 * .12})` }], ms); if (mia !== corsa) return; prima = gradi;
  }
  await va(busta, [{ transform: `rotate(${prima}deg) scale(1.12)` }, { transform: 'rotate(0deg) scale(1.16)' }], L.pausa); if (mia !== corsa) return;
  va(busta, [{ opacity: 1 }, { opacity: 0 }], L.scoppio[0], 'ease-in'); va(alone, [{ opacity: L.alone }, { opacity: 0 }], L.scoppio[0] + L.scoppio[1], 'ease-out');
  await va(el('.pLampo'), [{ opacity: 0, transform: 'scale(.3)' }, { opacity: 1, transform: 'scale(1.6)', offset: .4 }, { opacity: 0, transform: 'scale(2.4)' }], L.scoppio[0] + L.scoppio[1], 'ease-out');
}

// si vede il premio: la busta sparisce e i premi escono uno dopo l'altro
function mostra(conMoto) {
  ferma(); el('.pScena').classList.add('nas'); el('.pDentro').classList.remove('nas'); radice.classList.add('aperto');
  if (conMoto) [...radice.querySelectorAll('.pPremio')].forEach((p, i) => va(p, [{ opacity: 0, transform: 'scale(.5)' }, { opacity: 1, transform: 'scale(1.08)', offset: .7 }, { opacity: 1, transform: 'scale(1)' }], PREMIO.esce, 'ease-out', i * PREMIO.tra));
}
function chiudi() { corsa++; ferma(); radice.classList.add('nas'); const f = quando; quando = null; if (f) f(); }
radice.addEventListener('click', (e) => {
  // durante l'apertura un tocco la salta; a premio aperto si chiude dal pulsante, o con un tocco qualsiasi se è breve
  if (!radice.classList.contains('aperto')) { corsa++; return mostra(true); }
  if (e.target.closest('#prOk') || radice.classList.contains('breve')) chiudi();
});

/** L'elenco dei premi da mostrare, da un esito della carriera: monete, diamanti, allenatori di una rarità, contatti. */
export const premiDa = ({ monete = 0, gemme = 0, allenatori = 0, rarita = 'raro', contatti = 0 }) => [
  { tipo: 'monete', quanti: monete, nota: t('premio.monete', monete) }, { tipo: 'diamanti', quanti: gemme, nota: t('premio.diamanti', gemme) },
  { tipo: 'allenatore', quanti: allenatori, nota: t('premio.allenatore', rarita, allenatori) }, { tipo: 'contatto', quanti: contatti, nota: t('premio.contatto', contatti) }];

/**
 * Apre un premio. titolo e sotto: le due scritte in cima; premi: elenco di { tipo, quanti, nota }, con tipo tra
 * 'monete', 'diamanti', 'allenatore' e 'contatto' e `nota` scritta sotto il numero (per esempio «allenatore raro»);
 * lungo: l'apertura da fine stagione; fatto: cosa fare quando si chiude.
 */
export function apriPremio({ titolo, sotto = '', premi, lungo = false, fatto = null }) {
  const mia = ++corsa; ferma(); quando = fatto;
  el('#prT').textContent = titolo; el('#prS').textContent = sotto; el('#prS').classList.toggle('nas', !sotto);
  el('#prL').innerHTML = premi.filter((p) => p && p.quanti > 0).map((p) => `<span class="pPremio p-${p.tipo}">${icona(ICONE[p.tipo] || 'premi')}<b>+${numero(p.quanti)}</b><i>${p.nota}</i></span>`).join('');
  radice.classList.remove('nas', 'aperto'); radice.classList.toggle('breve', !lungo); el('.pScena').classList.remove('nas'); el('.pDentro').classList.add('nas');
  // senza movimento (chi lo ha chiesto al telefono, o le prove automatiche) si vede subito il premio
  if (window.__fermo || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return mostra(false);
  (lungo ? lunga(mia) : breve(mia)).then(() => { if (mia === corsa) mostra(true); });
}
