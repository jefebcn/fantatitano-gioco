# Crediti

Cosa abbiamo ripreso da lavori di altri, con che licenza, e cosa abbiamo solo studiato. Regola del progetto: le
meccaniche di altri giochi si possono riprendere, grafica, file, marchi e codice no, se la licenza non lo permette.
Le fonti dei modelli e delle animazioni della partita sono nel README; quelle dei ritratti in `docs/ritratti.md`.

## Ripreso, con licenza che lo permette

### react-native-football-formation (MIT)
- Di chi: Arbab Rafiq, https://github.com/arbab-io/react-native-football-formation
- Cosa: l'elenco dei moduli e la loro disposizione di partenza, dalla tabella `FORMATION_COORDINATES_BY_PLACE`
  (`src/utils/formationCoordinates.ts`). Da lì vengono i sette moduli aggiunti il 23/11 in `FORMS` (`src/config.js`):
  4-5-1, 4-4-1-1, 3-4-1-2, 5-4-1, 4-3-2-1, 4-2-2-2, 3-4-2-1.
- Come: le posizioni non sono copiate. La tabella è in percentuali di un campo in verticale; le abbiamo riscritte in metri
  sulle linee dei nostri moduli (difesa, mediana, trequarti e punte agli stessi metri degli altri) e ricontrollate una per
  una. Nessun file, immagine o componente della libreria è nel gioco.
- Licenza MIT: «Copyright (c) 2025. Permission is hereby granted, free of charge, to any person obtaining a copy of this
  software and associated documentation files (the "Software"), to deal in the Software without restriction […]. The
  above copyright notice and this permission notice shall be included in all copies or substantial portions of the
  Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND […]». Testo intero nel repository citato.

### GameplayFootball (Unlicense): tre regole dell'IA della partita
- Di chi: Bastiaan Konings Schuiling, https://github.com/BazkieBumpercar/GameplayFootball (lo stesso motore di Google
  Research Football). Licenza Unlicense: pubblico dominio, si può copiare e adattare senza condizioni.
- Cosa, dal 23/11, riscritto nel nostro JavaScript (nessun file copiato):
  - **inserimento a condizione** (`teamAIcontroller.cpp`, righe 189-222): parte il compagno più vicino al punto 26 m
    davanti al portatore, se lì c'è spazio; formula del voto e numeri di partenza sono i suoi (`INSERIMENTO` in
    `src/config.js`, `runs` in `src/game.js`). Nostro: l'arrivo a 9 m dal fondo e il rispetto del fuorigioco;
  - **mira del tiro a tre bersagli** (`elizacontroller.cpp`, righe 796-960): palo, centro, palo, e vince quello dove gli
    avversari arrivano più tardi sulla traiettoria (`valoreTiro`, `TIRO_IA.bersagli`). Quando tirare resta deciso dalle
    nostre regole: la sua soglia, da noi, lasciava quasi solo colpi di testa;
  - **passaggio e smarcamento con lo stesso voto** (`elizacontroller.cpp`, righe 796-926 e 1008-1060): l'idea che chi è
    senza palla si muova per alzare il voto che gli dà chi passa (`votoPassaggio`, `puntoVoto`, `SMARCA`). Il voto è il
    nostro, di suo c'è l'idea e la distanza di 10,5 m tra compagni.
- Lo studio completo, con cosa è stato provato e scartato: `docs/studio-ia.md`.

## Musica

### «Rise Up (Fantatitano)», la musica della home
- Cosa: `public/audio/musica-home-rise-up.ogg` e `.mp3` (gli originali in `assets/arrivo/audio/`): pop-rock da stadio
  cantato in inglese, 3 minuti e 31. Gira in tutte le schermate della home (`src/audio.js`, elenco dei brani in
  `AUDIO.musica` di `src/config.js`).
- Da dove: generata con **Suno** (https://suno.com) dall'account di Alex, **piano Pro**: i brani generati con questo
  piano si possono usare a scopo commerciale (termini di Suno al momento della generazione). Scelta da Alex il 23
  novembre 2026.
- Testo: **originale, scritto per Fantatitano**. Nessun testo, melodia o registrazione di altri.
- Preparazione nostra: dissolvenza in entrata di 0,4 secondi e in uscita di 3, volume portato a −16 LUFS, salvata in OGG
  e in MP3 a 128 kbps.

Tutti gli altri suoni del gioco (calci, pali, rete, fischietto, pubblico) non vengono da file: li genera `src/audio.js`
al momento.

## Solo studiato: idee, nessun codice e nessun file

- **openfootmanager** (GPL v3), https://github.com/openfootmanager/openfootmanager — come un gestionale modella
  divisioni, promozioni e finanze. Ne viene l'idea del premio di fine campionato a scala per posizione
  (`ECONOMIA.premi.piazzamento`, numeri nostri). Essendo GPL, non ne abbiamo copiato né adattato codice.
- **card-pack-animations** (MIT), Brian Kim, https://github.com/briamkin/card-pack-animations — il ritmo di
  un'apertura breve (strappo, meno di un secondo) e di una lunga (oscillazioni sempre più strette e ampie, circa tre
  secondi). Il pacchetto non è usato: richiede altre librerie ed è pesante per un telefono.
- **EliFUT/android** (Apache 2.0) — guardato e scartato: niente ripreso. Dati e grafiche delle carte vengono da un
  gioco commerciale e la licenza del codice non li copre.
