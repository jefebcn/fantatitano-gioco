// Quando il gioco gira dentro Fantatitano (fantatitano.site/gioco/, anche nell'app per iPhone, che carica il sito)
// non c'è la barra del browser per tornare indietro: in alto a sinistra della schermata iniziale compare
// «‹ Fantatitano», che riporta all'app nella stessa finestra. Sul deploy di prova (fantatitano-gioco.vercel.app) non c'è.
(() => {
  if (!/^\/gioco(\/|$)/.test(location.pathname)) return;
  const home = document.getElementById('home'); if (!home) return;
  const a = document.createElement('a'); a.id = 'torna'; a.className = 'indietro'; a.href = '/'; a.textContent = '‹ Fantatitano';
  a.style.cssText = 'color:#fff;text-decoration:none;z-index:2';
  home.appendChild(a);
})();
