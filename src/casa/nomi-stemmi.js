// Il nome dell'illustrazione dello stemma di una squadra inventata: «stemma-» e il nome della squadra in minuscolo,
// senza accenti e coi trattini al posto di spazi e apostrofi («Ca' Rigo» diventa «stemma-ca-rigo»). Sta in un file suo
// perché lo usano sia la home sia lo script che prepara l'elenco delle immagini, che gira fuori dal browser.
export const nomeStemma = (squadra) => 'stemma-' + squadra.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
