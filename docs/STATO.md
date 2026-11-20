# Stato — Fantatitano, La Partita (gioco)
20/11/2026 · tema: verso un gioco fluido "tipo Dream League" (meccaniche sì, grafica/file/codice DLS no)

## Dove siamo
- Produzione: https://fantatitano-gioco.vercel.app (non pubblico, noindex).
- Rete di sicurezza: `npm run partite` (partite riproducibili + obiettivi), `scripts/prove/rigori.cjs`,
  `scripts/prove/fluidita.cjs`, CI `.github/workflows/prove.yml` a ogni PR.
- IA: TENUTA (regola GameplayFootball), PRESSING a due, CALCI (angoli dal gioco, fuorigioco), PASSA.
- Animazioni GameplayFootball: esultanze, rimessa con le mani, testa, scivolata/caduta + rialzarsi, cartellino,
  e ora i movimenti senza palla (partenze col perno, inversioni, frenata dallo scatto: `movimento`/`MOVI`).
- Piedi piantati (src/grafica/piedi.js, IK a due ossa), si spegne a qualità ≥2.

## Piano "fluido come DLS" (deciso con Alex il 20/11, una PR per punto)
1. Animazioni di passaggio senza palla — FATTO (questa PR).
2. Portiere completo: tuffi in 6 zone, prese a 4 altezze, rinvio corto/lungo con mano e piede
   (clip già convertite e non usate: `tiene_palla`, `cammina_palla`).
3. Impostazioni grafiche Bassa/Media/Alta/Molto alta, 30/60 fps, preset iniziale dal telefono.
4. Difficoltà continua: parametri da 0 a 1 per difficoltà e valore del giocatore.
5. Ruoli in campo: rigori, punizioni, angoli (oltre al capitano).
6. Hub: riquadri con stato vivo, avvisi prima di GIOCA, al massimo un popup.
7. Stadio come requisito di promozione.
Fuori: pubblicità, acquisti in-app, online P2P (gioco non pubblico).

## Decisioni recenti di Alex ancora valide
- "Merge fallo sempre tu": PR → controlli verdi + anteprima Vercel → squash merge → verifica produzione.
- Il gioco non è pubblico finché non lo dice lui (PR #114 dell'app non va unita).
- Somiglianza a Dream League solo nelle meccaniche. Alex ha fatto da sé un'analisi del pacchetto DLS e ha passato due
  documenti: si usano solo come lista di idee generiche; niente nomi, valori, file o altro reverse engineering da parte nostra.
  Non metterli nel repository.

## Attenzione
- `public/anim-gf.js` è a 737 KB (precaricato dal service worker): crescere con giudizio.
- Le modifiche solo grafiche cambiano comunque le partite a parità di seme (la posa delle mani entra nel gioco):
  confrontare medie su 16+ partite. Contrasti vinti oscillano tra 3 e 5 a gruppo di 8.
