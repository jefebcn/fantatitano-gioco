# Fantatitano — La Partita (gioco 3D nel browser)

## Ripartenza
- Leggi `docs/STATO.md` e `git log --oneline -15`; i lavori ripetibili sono in `docs/RICETTE.md`. Il README spiega architettura e scelte.
- Rispondi ad Alex in italiano, semplice. Merge lo fa Claude: PR → CI «prove» verde + anteprima Vercel READY → squash merge → verifica produzione.

## Regole
- Meccaniche come Dream League sì; grafica, file, marchi e codice di First Touch Games mai. Fonti libere: GameplayFootball (Unlicense), Mixamo (non ridistribuire gli FBX), Poly Haven.
- Modalità partita: il gameplay deve somigliare il più possibile a Dream League (comandi, telecamera, ritmo, peso di passaggi e tiri, IA, portiere, flusso). Se non si sa come si comporta DLS si chiede ad Alex, non si inventa. Di Fantatitano restano grafica, interfaccia, animazioni, nomi.
- I valori di gioco stanno solo in `src/config.js` (niente numeri nuovi sparsi nel codice); piccoli passi, ognuno spiegato ad Alex con come provarlo.
- Ogni modifica a gioco o IA si misura con `npm run partite` sugli stessi semi, prima e dopo; un'anomalia blocca la PR.
- Commenti in italiano sopra il codice, non in coda alla riga: `npm run controlla` li verifica (frasi con «(...);» vengono scambiate per codice).
- Il gioco non è pubblico finché Alex non lo dice (noindex in `vercel.json` e `robots.txt`).

## Trappole già incontrate
- Stato letto prima di una callback ritardata (calci caricati): rileggerlo dopo, se no il passatore conduce il pallone appena calciato.
- Vettori temporanei riusati come bersaglio (IK in `src/grafica/piedi.js`): un vettore per ruolo.
- Spostare giocatori di colpo alle riprese si vede: aspettare che arrivino, sistemare solo chi è a pochi centimetri.
- Una clip che parte in mezzo alla corsa col piede sbagliato dà scatti; il suo ultimo fotogramma fermo sotto un corpo che corre fa strisciare i piedi: entrare col piede giusto, uscire svelti.
