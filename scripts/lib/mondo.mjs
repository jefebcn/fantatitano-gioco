// Prepara, fuori dal browser, quello che la home prepara all'avvio: le squadre vere, le funzioni dei dati, le squadre
// inventate delle divisioni basse, e le registra nella carriera. Serve alle prove e alla simulazione dell'economia.
import { readFileSync } from 'node:fs';
import * as CAR from '../../src/carriera.js';
import { creaDati } from '../../src/dati/scala.js';
import { GIOCATORI } from '../../src/dati/giocatori.js';
import { creaDivisioni } from '../../src/dati/divisioni.js';

/** Torna { clubs, DATI, DIV, CAR, K }: in K va messa la carriera in corso, così le carte tengono conto degli allenatori usati. */
export function creaMondo(posto = 'academy') {
  const src = readFileSync(new URL('../../public/data.js', import.meta.url), 'utf8');
  const clubs = JSON.parse(src.slice(src.indexOf('['), src.lastIndexOf(']') + 1)), mondo = { clubs, K: null };
  const cresciuto = (x, clubId) => { const K = mondo.K, c = K && clubId === K.club && K.crescita ? K.crescita[x[0]] : null; return c ? c.stat : null; };
  const DATI = creaDati(clubs, GIOCATORI, cresciuto), DIV = creaDivisioni(DATI, clubs, posto);
  CAR.registra(DIV.inventate, { perDiv: DIV.perDiv, inizio: DIV.inizio, nuovoGiocatore: DIV.nuovoGiocatore, reali: DIV.reali, scheda: DATI.scheda });
  return Object.assign(mondo, { DATI, DIV, CAR, posto });
}
