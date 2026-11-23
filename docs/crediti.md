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

## Solo studiato: idee, nessun codice e nessun file

- **openfootmanager** (GPL v3), https://github.com/openfootmanager/openfootmanager — come un gestionale modella
  divisioni, promozioni e finanze. Ne viene l'idea del premio di fine campionato a scala per posizione
  (`ECONOMIA.premi.piazzamento`, numeri nostri). Essendo GPL, non ne abbiamo copiato né adattato codice.
- **card-pack-animations** (MIT), Brian Kim, https://github.com/briamkin/card-pack-animations — il ritmo di
  un'apertura breve (strappo, meno di un secondo) e di una lunga (oscillazioni sempre più strette e ampie, circa tre
  secondi). Il pacchetto non è usato: richiede altre librerie ed è pesante per un telefono.
- **EliFUT/android** (Apache 2.0) — guardato e scartato: niente ripreso. Dati e grafiche delle carte vengono da un
  gioco commerciale e la licenza del codice non li copre.
