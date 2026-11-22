// Il set di icone del gioco: uno stile solo (tratto 1,8 su una griglia di 24, estremi tondi, colore del testo).
// Moneta e diamante hanno i loro colori e sono identici in tutte le schermate. Le cornici delle carte dei giocatori
// hanno una forma sola (scudo) in tre colori: bronzo, argento-azzurro, oro.
// Scrive un file per icona in public/img/icone/, il foglio unico public/img/icone.svg (un <symbol> per icona, col nome
// preceduto da «i-» perché nella pagina non si confonda con gli id delle schermate) e, con
// «prova» come argomento, la pagina di controllo docs/icone.html.
// Uso: node scripts/icone.mjs [prova]
import { writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';

const pieno = 'fill="currentColor" stroke="none"';
const scudo = 'M12 3 4.5 5.5V11c0 5 3.2 8.3 7.5 10 4.3-1.7 7.5-5 7.5-10V5.5z';
const stella = 'M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-3-5.4 3 1.1-6L3.2 9.6l6.1-.8z';
const maglia = 'M8.5 3.5 3 6.5l1.8 4 2.2-1V20.5h10V9.5l2.2 1 1.8-4-5.5-3c-.6 1.4-1.9 2.2-3.5 2.2S9.1 4.9 8.5 3.5z';
const nuvola = (y) => `<path d="M7 ${y}a4.5 4.5 0 0 1-.5-9 5.5 5.5 0 0 1 10.6 1.2A3.9 3.9 0 0 1 17 ${y}z"/>`;

// icone a tratto: il disegno dentro la griglia di 24
const TRATTO = {
  // barra e comandi
  home: '<path d="M3 11.2 12 4l9 7.2"/><path d="M5.5 9.8V20h13V9.8"/><path d="M10 20v-5.5h4V20"/>',
  indietro: '<path d="M19 12H5"/><path d="m11 6-6 6 6 6"/>',
  avanti: '<path d="m5 6 6 6-6 6"/><path d="m13 6 6 6-6 6"/>',
  impostazioni: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="6.8"/><path d="M12 2.4v2.8M12 18.8v2.8M2.4 12h2.8M18.8 12h2.8M5.2 5.2l2 2M16.8 16.8l2 2M5.2 18.8l2-2M16.8 7.2l2-2"/>',
  info: `<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><circle cx="12" cy="7.6" r="1" ${pieno}/>`,
  piu: '<path d="M12 5v14M5 12h14"/>',
  chiudi: '<path d="m6 6 12 12M18 6 6 18"/>',
  spunta: '<path d="m4.5 12.5 5 5L19.5 7"/>',
  avviso: `<path d="M12 3.5 2.8 19.5h18.4z"/><path d="M12 10v4.5"/><circle cx="12" cy="17" r="1" ${pieno}/>`,
  lucchetto: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/><path d="M12 14.5v2"/>',
  orologio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
  stella: `<path d="${stella}" fill="currentColor"/>`,
  'stella-vuota': `<path d="${stella}"/>`,
  manager: '<circle cx="12" cy="8" r="4"/><path d="M4 20.5c.8-4 4-6 8-6s7.2 2 8 6"/>',
  // sezioni e competizioni
  campionato: `<path d="${scudo}"/><path d="m12 8 1.2 2.5 2.7.3-2 1.9.5 2.7-2.4-1.3-2.4 1.3.5-2.7-2-1.9 2.7-.3z" ${pieno}/>`,
  coppa: '<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 5.5H4.2c0 3 1.2 4.6 3.2 5M17 5.5h2.8c0 3-1.2 4.6-3.2 5"/><path d="M12 14v3.5M9.5 17.5h5v3h-5zM7.5 20.5h9"/>',
  castelli: '<path d="M3 20.5h18"/><path d="M4.5 20.5v-9h1v1.2h2V11.5h1v9M10 20.5V6.5h1v1.2h2V6.5h1v14M15.5 20.5v-9h1v1.2h2V11.5h1v9"/>',
  scenario: '<circle cx="12" cy="13.5" r="7.5"/><path d="M10 2.5h4M12 2.5V6"/><path d="M12.8 9.5 9.8 14h4.4l-3 4.5"/>',
  premi: '<rect x="3.5" y="8.5" width="17" height="4" rx="1"/><path d="M5 12.5v8h14v-8M12 8.5v12"/><path d="M12 8.5c-2 0-4.5-.9-4.5-2.9 0-1.2.9-2.1 2.1-2.1 1.6 0 2.4 2 2.4 5 0-3 .8-5 2.4-5 1.2 0 2.1.9 2.1 2.1 0 2-2.5 2.9-4.5 2.9z"/>',
  pallone: '<circle cx="12" cy="12" r="9"/><path d="m12 7.5 4.3 3.1-1.6 5H9.3l-1.6-5z"/><path d="M12 3v4.5M3.4 9.6l4.3 1M20.6 9.6l-4.3 1M6.7 19.3l2.6-3.7M17.3 19.3l-2.6-3.7"/>',
  sfide: `<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4" ${pieno}/>`,
  squadra: `<path d="${maglia}"/>`,
  mercato: '<path d="M4 8h14M14.5 4.5 18 8l-3.5 3.5"/><path d="M20 16H6M9.5 12.5 6 16l3.5 3.5"/>',
  club: `<path d="${scudo}"/><path d="M4.8 9.5h14.4"/>`,
  stadio: '<ellipse cx="12" cy="13.5" rx="9.5" ry="6"/><ellipse cx="12" cy="13.5" rx="5" ry="2.6"/><path d="M2.5 13.5V9M21.5 13.5V9M6.5 8.4V4.5M17.5 8.4V4.5"/>',
  personalizza: '<path d="M14.5 4.5l5 5L10 19H5v-5z"/><path d="m12.5 6.5 5 5"/>',
  allenamento: '<path d="M12 3.5 6 19.5h12z"/><path d="M4 19.5h16M9.4 10.5h5.2M7.9 14.5h8.2"/>',
  negozio: '<path d="M5 8h14l-1 12.5H6z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
  // squadra
  modulo: `<rect x="3" y="3.5" width="18" height="17" rx="2"/><g ${pieno}><circle cx="12" cy="17" r="1.2"/><circle cx="7.5" cy="12.5" r="1.2"/><circle cx="12" cy="12.5" r="1.2"/><circle cx="16.5" cy="12.5" r="1.2"/><circle cx="9" cy="7.8" r="1.2"/><circle cx="15" cy="7.8" r="1.2"/></g>`,
  riserve: '<path d="M3.5 13.5h17M5 13.5v-6h14v6M5.5 13.5v5.5M18.5 13.5v5.5"/>',
  fisioterapista: '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M12 8v8M8 12h8"/>',
  allenatore: '<rect x="5" y="4.5" width="14" height="16" rx="2"/><path d="M9 4.5v-1h6v1"/><path d="m8.5 9.5 2.4 2.4M10.9 9.5l-2.4 2.4"/><circle cx="15" cy="16" r="1.5"/><path d="M11.5 12.8c1.2.3 2 1 2.6 2"/>',
  capitano: '<circle cx="12" cy="12" r="9"/><path d="M15.2 9.2a4.2 4.2 0 1 0 0 5.6"/>',
  rigore: `<path d="M3.5 18.5v-12h17v12"/><circle cx="12" cy="17" r="1.8" ${pieno}/>`,
  punizione: '<circle cx="6.5" cy="17.5" r="2.5"/><path d="M10 15c2-5 5.5-7.5 10-8"/><path d="M16.5 4.8 20 7l-2.2 3.4"/>',
  corner: '<path d="M6 20.5v-17"/><path d="m6 4.5 9 3-9 3"/><path d="M6 20.5h14.5M6 14.5a6 6 0 0 1 6 6"/>',
  energia: '<path d="M13.5 2.5 5 13.5h6l-1 8L19 10h-6z"/>',
  scarpino: '<path d="M5 5.5h5V12l8.5 2.8c1.2.4 2 1.4 2 2.7H3.5V9z"/><path d="M7 20v-2.5M11 20v-2.5M15 20v-2.5M18.5 20v-2.5"/>',
  altezza: '<path d="M12 3.5v17M8.5 7 12 3.5 15.5 7M8.5 17l3.5 3.5 3.5-3.5"/>',
  scambia: '<path d="M4.5 12a7.5 7.5 0 0 1 13-5.1M19.5 12a7.5 7.5 0 0 1-13 5.1"/><path d="M17.5 3v4h-4M6.5 21v-4h4"/>',
  vendi: '<path d="M3.5 12.5v-8h8l9 9-8 8z"/><circle cx="8" cy="9" r="1.3"/>',
  // mercato e strutture
  osservatore: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/>',
  mistero: `<rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M9.6 9.3a2.5 2.5 0 1 1 3.7 2.2c-.8.5-1.3 1-1.3 2"/><circle cx="12" cy="16.8" r="1" ${pieno}/>`,
  foresteria: '<path d="M3 18.5v-11M3 15.5h18v3M21 15.5v-3a3 3 0 0 0-3-3h-7v6"/><circle cx="7" cy="12" r="1.8"/>',
  ufficio: '<rect x="3" y="7.5" width="18" height="12" rx="2"/><path d="M9 7.5v-2A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.500v2M3 13h18"/>',
  curva: '<path d="M4 10v4h3l8 4.500v-13L7 10z"/><path d="M18 9.5a4 4 0 0 1 0 5"/><path d="M7 14v4.500h3v-2.8"/>',
  esultanza: '<circle cx="12" cy="6" r="2.3"/><path d="M5 4.500l4.5 6h5l4.5-6M9.5 10.500V15L8 20.500M14.5 10.500V15l1.5 5.500M9.5 15h5"/>',
  // sfide e tempo
  calendario: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  medaglia: '<circle cx="12" cy="15" r="5.5"/><path d="M8 3.5h8M8 3.5l2.4 6.2M16 3.5l-2.4 6.2"/><path d="M12 12.8v4.4"/>',
  sole: '<circle cx="12" cy="12" r="4"/><path d="M12 2.500V5M12 19v2.500M2.5 12H5M19 12h2.500M5.3 5.3 7 7M17 17l1.7 1.700M5.3 18.7 7 17M17 7l1.7-1.7"/>',
  luna: '<path d="M19.5 14.500a8 8 0 0 1-10-10 8 8 0 1 0 10 10z"/>',
  nuvola: nuvola(18.5),
  pioggia: `${nuvola(15.5)}<path d="m8.5 18.5-1 2.500M12.5 18.500l-1 2.500M16.5 18.500l-1 2.5"/>`,
};
// la stessa icona con un altro nome: così ogni schermata chiede l'icona per quello che è, e il disegno resta uno
const ALIAS = { carriera: 'campionato', amichevole: 'pallone', 'percorso-premi': 'premi', divisa: 'squadra', stemma: 'club', 'centro-allenamento': 'allenamento', infermeria: 'fisioterapista', osservatori: 'osservatore', 'fuori-ruolo': 'avviso', timer: 'orologio' };

// moneta e diamante: disegno e colori fissi
const COLORI = {
  moneta: '<defs><linearGradient id="mo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE08A"/><stop offset=".55" stop-color="#E8B64C"/><stop offset="1" stop-color="#B9831F"/></linearGradient></defs>'
    + '<circle cx="12" cy="12" r="9.6" fill="url(#mo)" stroke="#7A5210" stroke-width="1"/><circle cx="12" cy="12" r="6.9" fill="none" stroke="#FFF3C4" stroke-opacity=".75" stroke-width="1"/>'
    + '<path d="M8.6 16.200v-6.400h1.300v1.100h1.200v-1.100h1.800v1.100h1.200v-1.100h1.300v6.400z" fill="#7A5210"/>',
  diamante: '<defs><linearGradient id="di" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B8F0FF"/><stop offset=".5" stop-color="#3FC6FF"/><stop offset="1" stop-color="#1273C9"/></linearGradient></defs>'
    + '<path d="M6.5 3.500h11l4.5 6L12 21.5 2 9.500z" fill="url(#di)" stroke="#0B4E8F" stroke-width="1" stroke-linejoin="round"/>'
    + '<path d="M2 9.500h20M6.5 3.5 9 9.500l3 12M17.5 3.5 15 9.500l-3 12M9 9.500l3-6 3 6" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width=".8" stroke-linejoin="round"/>',
};

// Cornice della carta del giocatore. La forma ha le proporzioni della foto di riferimento di Alex (docs/carte-giocatori.md):
// scudo con il lato alto appena ad arco, le spalle tonde al 9% dell'altezza, i fianchi dritti e in basso una punta che
// prende l'ultimo 16%. Il disegno è nostro: bordo scuro, corpo sfumato con due riflessi in diagonale, una riga chiara
// dentro. Tre fasce di valutazione. Disegno 100 × 136 che si adatta alla forma del suo posto (la carta piccola dei campi
// è più bassa). Per ogni fascia: chiaro, medio, scuro, bordo, riga interna. `sagomaCarta(d)` è il contorno rientrato di d.
const FASCE = { bronzo: ['#D9995F', '#B06E38', '#7E4520', '#4E2A12', '#F0C9A0'], argento: ['#F6F9FC', '#CBD6E3', '#A2B3C6', '#73859B', '#FFFFFF'], oro: ['#FCE99C', '#EBC552', '#CFA02C', '#94701A', '#FFF7CC'] };
const sagomaCarta = (d) => {
  const n = (v) => +v.toFixed(2), sx = n(2 + d), dx = n(98 - d), spalla = n(12.5 + d * .7), fianco = n(111 - d * .4), gomito = n(115.5 - d * .6), piega = n(117.2 - d * .7);
  return `M${sx} 21Q${sx} ${spalla} ${n(9.5 + d)} ${n(10.8 + d)}Q30 ${n(3.6 + d)} 50 ${n(2 + d)}Q70 ${n(3.6 + d)} ${n(90.5 - d)} ${n(10.8 + d)}Q${dx} ${spalla} ${dx} 21V${fianco}Q${dx} ${gomito} ${n(94 - d)} ${piega}L50 ${n(134 - d * 1.2)}L${n(6 + d)} ${piega}Q${sx} ${gomito} ${sx} ${fianco}Z`;
};
const carta = ([chiaro, medio, scuro, bordo, riga], id) => `<defs><linearGradient id="c${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${chiaro}"/><stop offset=".55" stop-color="${medio}"/><stop offset="1" stop-color="${scuro}"/></linearGradient>`
  + `<clipPath id="k${id}"><path d="${sagomaCarta(2.3)}"/></clipPath></defs>`
  + `<path d="${sagomaCarta(0)}" fill="${bordo}"/>`
  + `<path d="${sagomaCarta(2.3)}" fill="url(#c${id})"/>`
  + `<g clip-path="url(#k${id})"><path d="M44 0h56v70z" fill="#fff" fill-opacity=".16"/><path d="M0 60 60 0H30L0 30z" fill="#fff" fill-opacity=".1"/><path d="M0 90l50 24 50-24v46H0z" fill="#000" fill-opacity=".12"/></g>`
  + `<path d="${sagomaCarta(4.6)}" fill="none" stroke="${riga}" stroke-opacity=".6" stroke-width="1"/>`;

// segnaposto puliti per i ritratti che ancora non ci sono (giocatore e manager): busto di tre quarti, senza volto
const busto = (extra) => `<rect width="120" height="120" rx="14" fill="#0E1C3D"/><circle cx="60" cy="44" r="20" fill="#27407A"/><path d="M18 120c2-28 18-42 42-42s40 14 42 42z" fill="#27407A"/>${extra}`;
const GRANDI = {
  'segnaposto-giocatore': ['0 0 120 120', busto('<path d="M48 80l12 10 12-10" fill="none" stroke="#3FC6FF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>')],
  // la sagoma senza fondo, per le carte: prende il colore del testo
  sagoma: ['0 0 120 120', '<circle cx="60" cy="46" r="22" fill="currentColor"/><path d="M14 120c2-30 20-44 46-44s44 14 46 44z" fill="currentColor"/>'],
  'segnaposto-manager': ['0 0 120 120', busto('<path d="M52 80l8 12 8-12M60 92v28" fill="none" stroke="#E8B64C" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>')],
};
for (const [n, col] of Object.entries(FASCE)) GRANDI[`carta-${n}`] = ['0 0 100 136', carta(col, n[0]), ' preserveAspectRatio="none"'];

const TR = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
const icone = {};
for (const [n, d] of Object.entries(TRATTO)) icone[n] = ['0 0 24 24', `<g ${TR}>${d}</g>`];
for (const [n, d] of Object.entries(COLORI)) icone[n] = ['0 0 24 24', d];
for (const [n, da] of Object.entries(ALIAS)) icone[n] = icone[da];
Object.assign(icone, GRANDI);

const dir = 'public/img/icone';
mkdirSync(dir, { recursive: true });
for (const f of readdirSync(dir)) if (f.endsWith('.svg')) unlinkSync(`${dir}/${f}`);
// il terzo valore di un'icona, quando c'è, sono attributi in più: le cornici delle carte si adattano alla forma del posto
for (const [n, [vb, d, piu = '']] of Object.entries(icone)) writeFileSync(`${dir}/${n}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}"${piu}>${d}</svg>\n`);
writeFileSync('public/img/icone.svg', `<svg xmlns="http://www.w3.org/2000/svg">\n${Object.entries(icone).map(([n, [vb, d, piu = '']]) => `<symbol id="i-${n}" viewBox="${vb}"${piu}>${d}</symbol>`).join('\n')}\n</svg>\n`);
console.log(`icone: ${Object.keys(icone).length} (${Object.keys(ALIAS).length} sono lo stesso disegno con un altro nome)`);

// pagina di controllo: tutte le icone col nome, su blu notte, in oro, bianco e azzurro
if (process.argv[2] === 'prova') {
  const nomi = Object.keys(icone).filter((n) => !ALIAS[n]), sv = (n) => `<svg viewBox="${icone[n][0]}">${icone[n][1]}</svg>`;
  const piccole = nomi.filter((n) => icone[n][0] === '0 0 24 24'), grandi = nomi.filter((n) => icone[n][0] !== '0 0 24 24');
  writeFileSync(process.argv[3] || 'icone.html', `<!doctype html><meta charset="utf8"><style>body{margin:0;padding:18px;background:#0B1530;color:#fff;font:600 11px system-ui}h1{font-size:16px;color:#E8B64C;margin:0 0 12px}
.g{display:grid;grid-template-columns:repeat(10,1fr);gap:10px}.g div{background:#12224A;border:1px solid #27407A;border-radius:10px;padding:10px 4px 6px;text-align:center}.g svg{width:36px;height:36px;display:block;margin:0 auto 6px}
.oro{color:#E8B64C}.az{color:#3FC6FF}.big svg{width:auto;height:110px}.riga{display:flex;gap:18px;align-items:center;margin:14px 0;font-size:14px}.riga svg{width:14px;height:14px}.riga .m svg{width:20px;height:20px}.riga .l svg{width:32px;height:32px}</style>
<h1>Icone (${piccole.length} disegni, griglia 24, tratto 1,8)</h1><div class="g">${piccole.map((n, i) => `<div class="${['', 'oro', 'az'][i % 3]}">${sv(n)}${n}</div>`).join('')}</div>
<div class="riga"><span>Moneta e diamante a 14, 20 e 32 px:</span><span>${sv('moneta')} ${sv('diamante')}</span><span class="m">${sv('moneta')} ${sv('diamante')}</span><span class="l">${sv('moneta')} ${sv('diamante')}</span><span class="oro">Stelle: ${sv('stella').repeat(3)}${sv('stella-vuota').repeat(2)}</span></div>
<h1>Cornici delle carte e segnaposto dei ritratti</h1><div class="g big" style="grid-template-columns:repeat(5,1fr)">${grandi.map((n) => `<div>${sv(n)}${n}</div>`).join('')}</div>`);
}
