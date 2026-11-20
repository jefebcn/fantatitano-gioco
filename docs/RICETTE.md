# Ricette (lavori ripetibili)

COSA | comando o script | trappole | la prossima volta
--- | --- | --- | ---
Controllo completo prima di una PR | `npm run build && npm run controlla && npm run prova && npm run partite` (+ `SEME=20 … 8 difficile`, `SEME=40 … 8 facile`, `node scripts/prove/rigori.cjs`) | un solo Chromium alla volta (due insieme: memoria finita, worker riavviato); oltre 10 min va in background | confrontare prima/dopo con `RAPPORTO=f.json` sugli stessi semi
Riprodurre un'anomalia della prova | rigiocare le partite 0..K-1 con gli stessi semi, poi tracciare la K-esima | nella pagina: fermare `requestAnimationFrame`, `G.t = 0`, numeri casuali separati per `draw`; argomenti 0 con `??` non `\|\|` | la storia degli ultimi 25 fotogrammi del giocatore dice quasi sempre la causa
Taratura IA (equilibrio difficoltà) | `node scripts/simula.cjs 10` (solo step, senza disegno) | 10 partite sono rumorose (±0,3 gol) | per decisioni vere 24+ partite
Nuove clip GameplayFootball | copiare `.anim` da google-research/football in `modelli/gfootball`, voce in `ELENCO` di `scripts/gfootball.mjs`, `node scripts/gfootball.mjs` | `:specchio` per il sinistro, `:giro` toglie l'imbardata; le clip a terra vanno in `A_TERRA_GF` e `RIALZA` | controllare a occhio con `G.dbgFx = { name, t }` e un foglio di fotogrammi
Fluidità dei movimenti | `node scripts/prove/fluidita.cjs 90` (`PIEDI=0` per confronto) | lo scivolamento si misura sulla caviglia; i gesti contano a parte | scatti >1 per mille fotogrammi = qualcosa si stacca di colpo
Verifica produzione dopo il merge | `sw.js` VERSIONE uguale a quella locale, poi prova di gioco in produzione | dopo lo squash: `git fetch origin main && git merge origin/main`, mai force push | —
