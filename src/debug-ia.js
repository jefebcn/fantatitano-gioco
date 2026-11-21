// Vista di controllo dell'IA (solo per chi sviluppa): si accende con ?ia nell'indirizzo o col tasto O della tastiera.
// Disegna sopra il campo, su un foglio trasparente:
//  - la posizione base di ogni giocatore (cerchietto del colore della squadra) e dove sta andando adesso (linea sottile);
//  - le linee di passaggio che il portatore ha valutato all'ultima decisione, col punteggio (verde la migliore, rosso
//    le peggiori, tratteggiata se la linea è chiusa da un avversario);
//  - sopra ogni giocatore la decisione in corso (pressing, copertura, marcatura, smarcamento, inserimento...);
//  - la linea difensiva delle due squadre.
// Non tocca il gioco: legge soltanto. I numeri qui dentro sono misure del disegno, non valori di gioco.
import * as T from 'three';

/**
 * @param {{ cam: T.Camera, G: object, homeOf: (p: object) => number[], HW: number, attiva: boolean }} o
 * @returns {{ disegna: () => void, passaggio: Function, scelta: Function, alterna: () => boolean, attiva: () => boolean }}
 */
export function creaDebugIA({ cam, G, homeOf, HW, attiva }) {
  let on = !!attiva, tela = null, ctx = null; const v = new T.Vector3();
  // l'ultima valutazione dei passaggi: chi l'ha fatta, quando, e i candidati col punteggio
  const ultimo = { da: null, t: -9, cand: [] };
  const foglio = () => {
    if (tela) return; tela = document.createElement('canvas');
    tela.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:15'; document.body.appendChild(tela); ctx = tela.getContext('2d');
  };
  // dal campo (metri) allo schermo (punti); null se è dietro la telecamera
  const schermo = (x, y, z) => { v.set(x, y, z).project(cam); return v.z > 1 ? null : [(v.x * .5 + .5) * tela.width, (-v.y * .5 + .5) * tela.height]; };
  const linea = (a, b, colore, largo = 1.5, tratto = null) => {
    const p = schermo(a[0], .05, a[1]), q = schermo(b[0], .05, b[1]); if (!p || !q) return;
    ctx.strokeStyle = colore; ctx.lineWidth = largo; ctx.setLineDash(tratto || []); ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke(); ctx.setLineDash([]);
  };
  const cerchio = (x, z, r, colore) => {
    ctx.strokeStyle = colore; ctx.lineWidth = 1.5; ctx.beginPath(); let primo = true;
    for (let i = 0; i <= 16; i++) { const a = i / 16 * Math.PI * 2, p = schermo(x + Math.cos(a) * r, .05, z + Math.sin(a) * r); if (!p) return; if (primo) { ctx.moveTo(p[0], p[1]); primo = false; } else ctx.lineTo(p[0], p[1]); }
    ctx.stroke();
  };
  const scritta = (x, y, z, testo, colore, dy = 0) => {
    const p = schermo(x, y, z); if (!p) return; ctx.font = `600 ${Math.round(tela.height * .026)}px system-ui,sans-serif`; ctx.textAlign = 'center';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.75)'; ctx.strokeText(testo, p[0], p[1] + dy); ctx.fillStyle = colore; ctx.fillText(testo, p[0], p[1] + dy);
  };
  return {
    attiva: () => on,
    alterna: () => { on = !on; if (!on && ctx) ctx.clearRect(0, 0, tela.width, tela.height); return on; },
    /** bestPass chiama questa per ogni compagno valutato dall'IA: chi passa, a chi, punteggio, punto d'incontro, linea chiusa. */
    passaggio: (p, m, punti, x, z, chiusa) => {
      if (!on) return; if (ultimo.da !== p || ultimo.t !== G.t) { ultimo.da = p; ultimo.t = G.t; ultimo.cand = []; }
      ultimo.cand.push({ m, punti, x, z, chiusa });
    },
    /** La scelta del portatore (tira, crossa, passa a..., porta palla): resta scritta sopra di lui finché tiene il pallone. */
    scelta: (p, testo) => { if (on) { p.sceltaIA = testo; p.sceltaT = G.t; } },
    disegna: () => {
      if (!on || !G.ball || !G.teams || !G.teams.length) return; foglio();
      const w = innerWidth, h = innerHeight; if (tela.width !== w || tela.height !== h) { tela.width = w; tela.height = h; }
      ctx.clearRect(0, 0, w, h); if (G.state === 'menu' || G.state === 'full') return;
      const b = G.ball, own = b.owner;
      for (const t of G.teams) {
        const col = t.human ? 'rgba(120,220,255,.95)' : 'rgba(255,170,90,.95)';
        // la linea difensiva (dove scatta il fuorigioco per gli avversari)
        if (t.B) { const x = t.B.linea * t.side; linea([x, -HW], [x, HW], col.replace('.95', '.35'), 1, [6, 6]); }
        for (const p of t.players) {
          if (p.i !== 0) { const hm = homeOf(p); cerchio(hm[0], hm[1], .7, col); linea([p.x, p.z], [hm[0], hm[1]], col.replace('.95', '.25'), 1, [2, 4]); }
          if (Number.isFinite(p.tx) && Math.hypot(p.tx - p.x, p.tz - p.z) > .8) linea([p.x, p.z], [p.tx, p.tz], col, p.sprint ? 2.5 : 1.2);
          const testo = p === own ? (G.t - (p.sceltaT || -9) < 2.5 ? p.sceltaIA : 'porta palla') : p === G.ctrl && t.human && !G.auto ? 'TU' : p.i === 0 ? 'portiere' : p.stato || '';
          if (testo) scritta(p.x, 2.25, p.z, testo, col, -Math.round(h * .03));
        }
      }
      // i passaggi valutati all'ultima decisione del portatore, finché ha ancora lui il pallone (o per un secondo dopo)
      if (ultimo.da && ultimo.cand.length && (own === ultimo.da || G.t - ultimo.t < 1)) {
        const mx = Math.max(...ultimo.cand.map((c) => c.punti)), mn = Math.min(...ultimo.cand.map((c) => c.punti)), d = ultimo.da;
        for (const c of ultimo.cand) {
          const k = mx > mn ? (c.punti - mn) / (mx - mn) : 1, migliore = c.punti === mx, colore = `hsla(${Math.round(k * 120)},90%,55%,${migliore ? 1 : .7})`;
          linea([d.x, d.z], [c.x, c.z], colore, migliore ? 3.5 : 1.5, c.chiusa ? [5, 5] : null); cerchio(c.x, c.z, .45, colore);
          scritta((d.x + c.x) / 2, .05, (d.z + c.z) / 2, c.punti.toFixed(0), colore);
        }
      }
      ctx.font = `600 ${Math.round(h * .028)}px system-ui,sans-serif`; ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(255,255,255,.9)';
      ctx.fillText('IA: cerchi = posizione base · linee = dove vanno · numeri = punteggio dei passaggi (tasto O per spegnere)', 10, h - 8);
    },
  };
}
