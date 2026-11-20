# Stato — Fantatitano, La Partita (gioco)
20/11/2026 · tema: verso un gioco fluido "tipo Dream League" (meccaniche sì, grafica/file DLS no)

## Dove siamo
- Produzione: https://fantatitano-gioco.vercel.app (non pubblico, noindex). Ultima PR unita: #51.
- Rete di sicurezza: `npm run partite` (partite riproducibili + obiettivi), `scripts/prove/rigori.cjs`,
  `scripts/prove/fluidita.cjs`, CI `.github/workflows/prove.yml` a ogni PR.
- 8 partite a normale: tutte le misure dentro gli obiettivi (passaggi 73%, tenuta 1 s, angoli ~1, fuorigioco ~0,3).
- IA: TENUTA (regola GameplayFootball), PRESSING a due, CALCI (angoli dal gioco, fuorigioco), PASSA.
- Animazioni GameplayFootball: esultanze, rimessa con le mani, testa, scivolata/caduta + rialzarsi, cartellino.
- Piedi piantati (src/grafica/piedi.js, IK a due ossa), si spegne a qualità ≥2.

## Aperto / in corso
- Niente di aperto nel codice; branch `claude/great-darwin-8rov7s` allineato a main.
- Clip già convertite ma non usate: `tiene_palla`, `cammina_palla` (portiere col pallone in mano).

## Prossimo passo consigliato (Alex sceglie)
1. Portiere: cammina col pallone in mano e rinvio di piede al volo.
2. Tiri più vari (a giro, collo pieno) scelti per distanza e angolo.
3. Telecamera più vicina e dinamica.
Alex deve provarlo sul telefono: la sensazione dei comandi non si misura in simulazione.

## Decisioni recenti di Alex ancora valide
- "Merge fallo sempre tu": PR → controlli verdi + anteprima Vercel → squash merge → verifica produzione.
- Il gioco non è pubblico finché non lo dice lui (PR #114 dell'app non va unita).
- Somiglianza a Dream League solo nelle meccaniche, mai asset/codice/marchi di First Touch Games.

## Attenzione
- L'APK caricato il 20/11 era l'app Uptodown, non DLS: niente da analizzare.
- `public/anim-gf.js` è a 656 KB (precaricato dal service worker): attenzione a crescere ancora.
