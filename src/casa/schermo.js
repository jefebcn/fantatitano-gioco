// La misura vera dello schermo per le schermate della home. Su iPhone, girando il telefono, l'evento «resize» arriva
// quando le misure sono ancora quelle di prima e poi non ne arriva un altro: chi prende le misure in quel momento resta
// con quelle sbagliate (le carte della Home alte come un riquadro in verticale, fuori dal loro posto; la barra stretta).
// La partita rimette a posto la grandezza della pagina al fotogramma dopo, guardando la tela: qui si osserva la pagina
// e si avvisa chi si è iscritto solo quando la sua grandezza cambia davvero.
const iscritti = [];
let ultima = '';

/** Larghezza e altezza della pagina com'è adesso, in punti. */
export function schermo() { const b = document.body; return [b.clientWidth || innerWidth, b.clientHeight || innerHeight]; }

/** Chiama `fn` ogni volta che la pagina cambia grandezza: le schermate ci rifanno le loro misure. */
export function quandoCambiaMisura(fn) { iscritti.push(fn); }

function cambiata() {
  const m = schermo().join('x'); if (m === ultima) return;
  ultima = m; for (const fn of iscritti) fn();
}
// dove l'osservatore manca resta l'evento, come prima
if (window.ResizeObserver) new ResizeObserver(cambiata).observe(document.body);
else addEventListener('resize', () => { ultima = ''; cambiata(); });
