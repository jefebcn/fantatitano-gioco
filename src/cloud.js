/* La carriera sull'account Fantatitano (progetto Supabase dell'app, tabella e funzioni in supabase/001-lapartita-carriere.sql).
   Dentro Fantatitano (fantatitano.site/gioco) la sessione è la stessa dell'app: chi ha fatto l'accesso lì è già dentro.
   Altrove (per esempio il deploy di prova) si accede con email e password dello stesso account.
   La copia sul telefono resta sempre: questa è in più, e serve a non perdere la carriera cambiando telefono o browser. */
import { createClient } from '@supabase/supabase-js';

// Valori pubblici, gli stessi di src/config.js dell'app: la sicurezza sta nelle funzioni del database, che leggono e scrivono
// solo la riga di chi ha fatto l'accesso.
const URL = 'https://nskgzpbcssnpfuxmbepa.supabase.co';
const KEY = 'sb_publishable_3ji0uoP5OW9LBzGhQ9QDSg_JoSJigHa';
const BASE = 'fantatitano-carriera-online'; // { utente, base }: per chi e fino a quando la copia online è nota a questo telefono

let sb = null, utente = null, nome = '', pronto = null, stato = 'spento';
const ascolta = new Set();
const avvisa = () => ascolta.forEach((f) => f(info()));
const leggiBase = () => { try { return JSON.parse(localStorage.getItem(BASE) || 'null'); } catch (e) { return null; } };
const scriviBase = (v) => { try { if (v) localStorage.setItem(BASE, JSON.stringify(v)); else localStorage.removeItem(BASE); } catch (e) { /* senza memoria si va avanti */ } };

export const info = () => ({ utente: utente ? { id: utente.id, email: utente.email || '', nome } : null, stato });
export function quandoCambia(fn) { ascolta.add(fn); return () => ascolta.delete(fn); }

async function leggiNome() {
  nome = (utente && utente.user_metadata && (utente.user_metadata.display_name || utente.user_metadata.full_name)) || '';
  try { const { data } = await sb.from('profiles').select('display_name').eq('id', utente.id).maybeSingle(); if (data && data.display_name) nome = data.display_name; } catch (e) { /* il nome è solo per mostrarlo */ }
  if (!nome && utente && utente.email) nome = utente.email.split('@')[0];
}

/** Si collega e ritrova la sessione, se c'è. Non blocca mai il gioco: senza rete resta spento. */
export function avvia() {
  if (pronto) return pronto;
  pronto = (async () => {
    try {
      sb = createClient(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
      const { data } = await Promise.race([sb.auth.getSession(), new Promise((_, no) => setTimeout(() => no(new Error('tempo')), 8000))]);
      utente = (data && data.session && data.session.user) || null; stato = utente ? 'pronto' : 'fuori';
      if (utente) await leggiNome();
      sb.auth.onAuthStateChange((evento, s) => { const prima = utente && utente.id; utente = (s && s.user) || null; stato = utente ? 'pronto' : 'fuori'; if ((utente && utente.id) !== prima) { if (utente) leggiNome().then(avvisa); avvisa(); } });
    } catch (e) { sb = null; stato = 'spento'; }
    avvisa(); return info();
  })();
  return pronto;
}

export async function accedi(email, password) {
  await avvia(); if (!sb) return { ok: false, errore: 'Collegamento non riuscito: controlla la rete e riprova.' };
  const { data, error } = await sb.auth.signInWithPassword({ email: String(email || '').trim(), password: String(password || '') });
  if (error) return { ok: false, errore: /invalid/i.test(error.message) ? 'Email o password sbagliate.' : /confirm/i.test(error.message) ? "Conferma prima l'email dal messaggio che ti è arrivato." : 'Accesso non riuscito: riprova.' };
  utente = data.user; stato = 'pronto'; await leggiNome(); avvisa();
  return { ok: true };
}
export async function esci() { if (sb) { try { await sb.auth.signOut(); } catch (e) { /* si esce comunque */ } } utente = null; stato = 'fuori'; scriviBase(null); avvisa(); }

/** La carriera salvata sull'account: { dati, aggiornato } oppure null. */
export async function carica() {
  await avvia(); if (!sb || !utente) return null;
  const { data, error } = await sb.rpc('lapartita_carica'); if (error) throw error;
  const r = Array.isArray(data) ? data[0] : data; if (!r || !r.dati) return null;
  scriviBase({ utente: utente.id, base: r.aggiornato_at });
  return { dati: r.dati, aggiornato: r.aggiornato_at };
}

/**
 * Salva sull'account. Se un altro dispositivo ha salvato dopo l'ultima copia nota a questo telefono, il database non sovrascrive
 * e qui si risponde { ok: false, conflitto: true }: chi chiama decide quale tenere (forza = true sovrascrive).
 */
export async function salva(dati, forza = false) {
  await avvia(); if (!sb || !utente) return { ok: false };
  stato = 'salvo'; avvisa();
  const b = leggiBase(), base = forza ? null : (b && b.utente === utente.id ? b.base : null);
  try {
    const { data, error } = await sb.rpc('lapartita_salva', { p_dati: dati, p_base: base }); if (error) throw error;
    const r = Array.isArray(data) ? data[0] : data;
    if (r && r.ok) { scriviBase({ utente: utente.id, base: r.aggiornato_at }); stato = 'salvato'; avvisa(); return { ok: true, aggiornato: r.aggiornato_at }; }
    stato = 'pronto'; avvisa(); return { ok: false, conflitto: !!(r && r.aggiornato_at) };
  } catch (e) { stato = 'errore'; avvisa(); return { ok: false, errore: true }; }
}
export async function cancella() { await avvia(); if (!sb || !utente) return; try { await sb.rpc('lapartita_cancella'); } catch (e) { /* si riprova al prossimo salvataggio */ } scriviBase(null); }

/**
 * Tra la copia sul telefono e quella sull'account, quale tenere. Stessa carriera: quella salvata più volte (rev).
 * Carriere diverse: lo decide chi gioca (si risponde 'chiedi'). Ne esiste una sola: quella.
 */
export function scegli(locale, online) {
  if (!online) return locale ? 'locale' : 'nessuna';
  if (!locale) return 'online';
  if (locale.id && online.id && locale.id !== online.id) return 'chiedi';
  return (online.rev || 0) > (locale.rev || 0) ? 'online' : (online.rev || 0) < (locale.rev || 0) ? 'locale' : 'uguali';
}
