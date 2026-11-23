// La navigazione a livelli (docs/navigazione.md): la Home è il livello 0, ogni schermata aperta si aggiunge in cima a una
// pila e «Indietro» torna sempre a quella da cui si è arrivati. Ogni schermata è una «rotta»: un nome e la funzione che
// la disegna. Ridisegnare una schermata già aperta (cambiare scheda, riscuotere un premio) non la aggiunge di nuovo.
const ROTTE = {};
const dopo = [];
let pila = [];

/** Registra una schermata: `disegna` la mostra coi parametri con cui è stata aperta. */
export const rotta = (nome, disegna) => { ROTTE[nome] = disegna; };
/** Chi vuole sapere quando si è cambiata schermata (la barra in alto). */
export const quandoCambia = (fn) => { dopo.push(fn); };
const avvisa = () => { for (const f of dopo) f(); };
const cimaDi = () => pila[pila.length - 1];

/** Apre una schermata. La Home svuota la pila; riaprire quella che è già in cima cambia solo i parametri. */
export function apri(nome, ...par) {
  if (!ROTTE[nome]) return;
  if (nome === 'home') pila = [];
  const c = cimaDi();
  if (c && c.nome === nome) c.par = par; else pila.push({ nome, par });
  ROTTE[nome](...par); avvisa();
}
/** Apre una schermata al posto di quella in cima: le schede di una stessa sezione che sono schermate diverse. */
export function sostituisci(nome, ...par) { if (pila.length > 1) pila.pop(); apri(nome, ...par); }
/** Ridisegna la schermata in cima (la Home, se la pila è vuota). */
export function ridisegna() {
  if (!pila.length) pila.push({ nome: 'home', par: [] });
  const c = cimaDi(); ROTTE[c.nome](...c.par); avvisa();
}
/** Torna alla schermata da cui si è arrivati. */
export function indietro() { if (pila.length > 1) pila.pop(); ridisegna(); }
/** Toglie dalla cima le schermate con questi nomi (dopo la partita: la Sfida non serve più) e ridisegna. */
export function tornaSotto(...nomi) { while (pila.length > 1 && nomi.includes(cimaDi().nome)) pila.pop(); ridisegna(); }
/** Dimentica la strada fatta: carriera nuova o cancellata. */
export const azzera = () => { pila = []; };
/** Il nome della schermata in cima e a che livello è (0 = Home). */
export const cima = () => (pila.length ? cimaDi().nome : 'home');
export const livello = () => Math.max(0, pila.length - 1);
