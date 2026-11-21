-- =====================================================================
-- La Partita — monete e diamanti sul server
--
-- STATO: APPROVATA DA ALEX CON CONDIZIONI, NON ANCORA APPLICATA.
-- Condizioni di Alex (21/11): sapere prima su quale progetto va; se è
-- quello dell'app pubblicata non toccare nessuna tabella esistente,
-- lavorare in uno schema separato, fare prima un backup.
--  - Il progetto è «fantasyfootball» (nskgzpbcssnpfuxmbepa): è quello
--    dell'app pubblicata.
--  - Questo file non tocca nessuna tabella e nessuna funzione esistenti:
--    crea solo cose nuove. Tabelle e funzioni interne stanno nello schema
--    separato «lapartita», che l'app e il telefono non possono raggiungere.
--    In «public» ci sono soltanto le sette funzioni che il gioco chiama
--    (lapartita_stato e le altre): il collegamento dell'app guarda solo lì,
--    e aprirgli un altro schema vorrebbe dire cambiare un'impostazione
--    dell'app pubblicata.
--  - Usa public.current_user_id(), che c'è già (la usa lapartita_carriere).
--  - Il backup lo fa Alex prima dell'applicazione (il piano gratuito di
--    Supabase non ne fa da solo): vedi docs/stato-lavori.md.
--  - Si riparte da zero (Alex, 21/11): nessun saldo viene importato dalle
--    carriere di prova. Ognuno comincia coi premi d'inizio del listino.
-- Si può rieseguire. Provata su un Postgres locale con
-- supabase/prove/002-economia-prova.sql.
--
-- PERCHÉ (Alex, 21/11: «Saldo e storico di ogni entrata e uscita salvati
-- lato server e validati dal server, così non si possono falsificare dal
-- telefono»). Oggi il telefono salva la carriera intera, monete comprese.
-- Con questo file:
--  - il saldo e lo storico stanno qui e li cambia solo il server;
--  - il telefono non dice mai «dammi 300 monete»: dice «ho finito questa
--    partita 2-1» o «compro lo stadio», e il server decide quanto vale
--    leggendo il listino (lapartita.listino);
--  - nessuna tabella si legge o si scrive direttamente: si passa solo
--    dalle funzioni, come già per lapartita_carriere.
--
-- LIMITI DA SAPERE (prima versione):
--  - un gioco nel browser non può dimostrare che la partita è stata giocata
--    davvero. Il server rende inutile barare: importi decisi da lui, una
--    partita alla volta, almeno 150 secondi veri tra inizio e fine, al
--    massimo 12 gol e 60 partite al giorno;
--  - per sfide e percorso premi il server controlla l'importo (dal listino)
--    e che lo stesso premio non venga preso due volte; che la sfida sia
--    davvero completa lo controlla ancora il gioco. Portare qui anche i
--    contatori delle sfide è il passo dopo;
--  - al mercato il server calcola il prezzo dalle valutazioni che il gioco
--    gli manda (tra 55 e 99): non ha ancora l'elenco dei giocatori. Lo
--    stesso per il negozio: il prezzo lo decide il tipo di oggetto che il
--    gioco dichiara (sono cose da vedere, non aiutano in partita).
--
-- Niente pagamenti: monete e diamanti si guadagnano solo giocando.
-- =====================================================================

-- ---------------------------------------------------------------- schema
-- Tutto quello che il gioco salva sta qui, lontano dalle tabelle dell'app.
-- Nessuno ci entra da fuori: né chi non ha fatto l'accesso né chi l'ha fatto.
create schema if not exists lapartita;
revoke all on schema lapartita from public, anon, authenticated;

-- ---------------------------------------------------------------- tabelle
-- Il listino: quanto dà ogni fonte e quanto costa ogni cosa. Cambiare un
-- prezzo è cambiare una riga. Gli stessi numeri stanno in src/config.js e
-- src/carriera.js (per mostrarli anche senza rete): devono restare uguali.
create table if not exists lapartita.listino (
  codice  text not null,
  valuta  text not null check (valuta in ('monete', 'diamanti', 'numero')),
  importo integer not null,
  primary key (codice, valuta)
);

create table if not exists lapartita.portafogli (
  user_id       text primary key,
  monete        integer not null default 0 check (monete >= 0),
  diamanti      integer not null default 0 check (diamanti >= 0),
  aggiornato_at timestamptz not null default now()
);

-- Ogni entrata e ogni uscita. «chiave» serve ai premi che si prendono una
-- volta sola (una sfida di un certo giorno, un livello del percorso).
create table if not exists lapartita.movimenti (
  id         bigserial primary key,
  user_id    text not null,
  quando     timestamptz not null default now(),
  valuta     text not null check (valuta in ('monete', 'diamanti')),
  importo    integer not null check (importo <> 0),
  causale    text not null,
  dettagli   jsonb not null default '{}'::jsonb,
  saldo_dopo integer not null,
  chiave     text
);
create index if not exists lapartita_movimenti_utente on lapartita.movimenti (user_id, id desc);
create unique index if not exists lapartita_movimenti_chiave on lapartita.movimenti (user_id, chiave, valuta) where chiave is not null;

create table if not exists lapartita.partite (
  id           uuid primary key default gen_random_uuid(),
  user_id      text not null,
  competizione text not null check (competizione in ('campionato', 'coppa', 'castelli')),
  in_casa      boolean not null default false,
  iniziata_at  timestamptz not null default now(),
  finita_at    timestamptz,
  gol_fatti    integer,
  gol_subiti   integer,
  stato        text not null default 'aperta' check (stato in ('aperta', 'chiusa', 'annullata')),
  premio       integer not null default 0
);
create index if not exists lapartita_partite_utente on lapartita.partite (user_id, iniziata_at desc);

-- I miglioramenti del club che costano: servono al server per sapere quanto
-- rende lo stadio e quanto costa il livello dopo.
create table if not exists lapartita.club (
  user_id     text primary key,
  stadio      integer not null default 1 check (stadio between 1 and 5),
  allenatore  integer not null default 1 check (allenatore between 1 and 5),
  allenamenti jsonb not null default '{}'::jsonb,
  oggetti     jsonb not null default '{}'::jsonb
);
alter table lapartita.club add column if not exists oggetti jsonb not null default '{}'::jsonb;

alter table lapartita.listino    enable row level security;
alter table lapartita.portafogli enable row level security;
alter table lapartita.movimenti  enable row level security;
alter table lapartita.partite    enable row level security;
alter table lapartita.club       enable row level security;
revoke all on table lapartita.listino, lapartita.portafogli, lapartita.movimenti, lapartita.partite, lapartita.club from public, anon, authenticated;

-- ---------------------------------------------------------------- listino
-- Premi (positivi) e costi (negativi). «numero» sono regole, non importi.
insert into lapartita.listino (codice, valuta, importo) values
  ('inizio', 'monete', 500), ('inizio', 'diamanti', 20),
  ('vittoria', 'monete', 300), ('pareggio', 'monete', 120), ('sconfitta', 'monete', 50), ('gol', 'monete', 20),
  ('casa_1', 'monete', 0), ('casa_2', 'monete', 60), ('casa_3', 'monete', 130), ('casa_4', 'monete', 220), ('casa_5', 'monete', 350),
  ('turno', 'monete', 150), ('campionato', 'monete', 3000), ('coppa', 'monete', 2000), ('castelli', 'monete', 1500),
  -- sfide di oggi, della settimana, di stagione, di carriera, e i premi «tutte fatte»
  ('sfida_d1', 'monete', 100), ('sfida_d2', 'monete', 150), ('sfida_d3', 'monete', 120), ('sfida_d4', 'monete', 150), ('sfida_d5', 'monete', 100), ('sfida_d_tutte', 'diamanti', 5),
  ('sfida_w1', 'monete', 600), ('sfida_w2', 'monete', 500), ('sfida_w3', 'monete', 400), ('sfida_w4', 'monete', 300), ('sfida_w5', 'monete', 300), ('sfida_w_tutte', 'diamanti', 15),
  ('sfida_s1', 'monete', 400), ('sfida_s2', 'monete', 800), ('sfida_s3', 'diamanti', 10), ('sfida_s4', 'monete', 600), ('sfida_s5', 'monete', 400), ('sfida_s6', 'monete', 400), ('sfida_s7', 'monete', 400), ('sfida_s8', 'diamanti', 10),
  ('sfida_c1', 'diamanti', 50), ('sfida_c2', 'diamanti', 30), ('sfida_c3', 'diamanti', 30), ('sfida_c4', 'diamanti', 20),
  -- percorso premi della stagione: 20 livelli
  ('percorso_1', 'monete', 200), ('percorso_2', 'diamanti', 3), ('percorso_3', 'monete', 200), ('percorso_4', 'diamanti', 3), ('percorso_5', 'monete', 200),
  ('percorso_6', 'diamanti', 3), ('percorso_7', 'monete', 200), ('percorso_8', 'diamanti', 3), ('percorso_9', 'monete', 200), ('percorso_10', 'diamanti', 10),
  ('percorso_11', 'monete', 200), ('percorso_12', 'diamanti', 3), ('percorso_13', 'monete', 200), ('percorso_14', 'diamanti', 3), ('percorso_15', 'monete', 400),
  ('percorso_16', 'diamanti', 3), ('percorso_17', 'monete', 200), ('percorso_18', 'diamanti', 3), ('percorso_19', 'monete', 400), ('percorso_20', 'diamanti', 20),
  -- costi: stadio e allenatore per livello
  ('stadio_2', 'monete', -1500), ('stadio_3', 'monete', -4000), ('stadio_3', 'diamanti', -10), ('stadio_4', 'monete', -9000), ('stadio_4', 'diamanti', -25), ('stadio_5', 'monete', -18000), ('stadio_5', 'diamanti', -50),
  ('allenatore_2', 'monete', -2000), ('allenatore_3', 'monete', -5000), ('allenatore_4', 'monete', -10000), ('allenatore_4', 'diamanti', -15), ('allenatore_5', 'monete', -20000), ('allenatore_5', 'diamanti', -30),
  -- negozio: aspetto e comodità (avatar, cornici, scarpini, pallone, disegni e terza maglia, pezzi dello stemma, rinnovo dei consigliati)
  ('negozio_avatar', 'diamanti', -10), ('negozio_cornice', 'diamanti', -10), ('negozio_scarpini', 'diamanti', -10), ('negozio_pallone', 'diamanti', -10),
  ('negozio_disegno', 'diamanti', -20), ('negozio_terza', 'diamanti', -30), ('negozio_rinnovo', 'diamanti', -5), ('negozio_stemma', 'monete', -300), ('negozio_stemma_raro', 'diamanti', -5),
  -- regole: allenamento (base, passo, sedute di base, sconto per livello dell'allenatore in centesimi),
  -- mercato (coefficiente del prezzo in centesimi, valutazione da cui parte il prezzo, quota di cessione in centesimi), limiti delle partite
  ('allenamento_base', 'numero', 200), ('allenamento_passo', 'numero', 150), ('allenamento_sedute', 'numero', 6), ('allenatore_sconto', 'numero', 5),
  ('mercato_coefficiente', 'numero', 40), ('mercato_base', 'numero', 45), ('mercato_cessione', 'numero', 70),
  ('partita_secondi_minimi', 'numero', 150), ('partita_gol_massimi', 'numero', 12), ('partite_al_giorno', 'numero', 60)
on conflict (codice, valuta) do update set importo = excluded.importo;

-- ---------------------------------------------------------------- funzioni interne (non si chiamano da fuori)
create or replace function lapartita.regola(p_codice text)
returns integer language sql stable security definer set search_path = '' as $$
  select importo from lapartita.listino where codice = p_codice and valuta = 'numero';
$$;

-- Crea il portafoglio alla prima volta, coi premi d'inizio scritti nello storico.
create or replace function lapartita.apri(p_user text)
returns void language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  insert into lapartita.portafogli (user_id) values (p_user) on conflict (user_id) do nothing;
  if not found then return; end if;
  insert into lapartita.club (user_id) values (p_user) on conflict (user_id) do nothing;
  for r in select valuta, importo from lapartita.listino where codice = 'inizio' and valuta in ('monete', 'diamanti') loop
    perform lapartita.muovi(p_user, r.valuta, r.importo, 'inizio', '{}'::jsonb, 'inizio');
  end loop;
end $$;

-- L'unico punto che cambia un saldo: scrive il movimento e aggiorna il
-- portafoglio insieme. Rifiuta se il saldo andrebbe sotto zero o se un
-- premio con la stessa chiave è già stato preso.
create or replace function lapartita.muovi(p_user text, p_valuta text, p_importo integer, p_causale text, p_dettagli jsonb, p_chiave text default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare nuovo integer;
begin
  if p_importo = 0 then
    select case when p_valuta = 'monete' then monete else diamanti end into nuovo from lapartita.portafogli where user_id = p_user;
    return nuovo;
  end if;
  if p_chiave is not null and exists (select 1 from lapartita.movimenti where user_id = p_user and chiave = p_chiave and valuta = p_valuta) then
    raise exception 'gia_preso' using errcode = 'P0001';
  end if;
  if p_valuta = 'monete' then
    update lapartita.portafogli set monete = monete + p_importo, aggiornato_at = now() where user_id = p_user and monete + p_importo >= 0 returning monete into nuovo;
  else
    update lapartita.portafogli set diamanti = diamanti + p_importo, aggiornato_at = now() where user_id = p_user and diamanti + p_importo >= 0 returning diamanti into nuovo;
  end if;
  if nuovo is null then raise exception 'saldo_insufficiente' using errcode = 'P0001'; end if;
  insert into lapartita.movimenti (user_id, valuta, importo, causale, dettagli, saldo_dopo, chiave) values (p_user, p_valuta, p_importo, p_causale, coalesce(p_dettagli, '{}'::jsonb), nuovo, p_chiave);
  return nuovo;
end $$;

-- Applica tutte le righe del listino con quel codice (monete e diamanti).
create or replace function lapartita.applica(p_user text, p_codice text, p_causale text, p_dettagli jsonb, p_chiave text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare r record; quante integer := 0;
begin
  -- prima le uscite più difficili da coprire non contano: se una riga fallisce, l'eccezione annulla tutto
  for r in select valuta, importo from lapartita.listino where codice = p_codice and valuta in ('monete', 'diamanti') order by valuta loop
    perform lapartita.muovi(p_user, r.valuta, r.importo, p_causale, p_dettagli, p_chiave); quante := quante + 1;
  end loop;
  if quante = 0 then raise exception 'codice_sconosciuto' using errcode = 'P0001'; end if;
end $$;

-- ---------------------------------------------------------------- funzioni per il gioco
-- Saldo, livelli del club e listino: quello che serve alla home.
create or replace function public.lapartita_stato()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare chi text := public.current_user_id(); p lapartita.portafogli; c lapartita.club;
begin
  if chi is null then return null; end if;
  perform lapartita.apri(chi);
  select * into p from lapartita.portafogli where user_id = chi;
  select * into c from lapartita.club where user_id = chi;
  return jsonb_build_object('monete', p.monete, 'diamanti', p.diamanti, 'stadio', c.stadio, 'allenatore', c.allenatore, 'allenamenti', c.allenamenti, 'oggetti', c.oggetti,
    'listino', (select jsonb_agg(jsonb_build_object('codice', codice, 'valuta', valuta, 'importo', importo)) from lapartita.listino));
end $$;

-- Apre una partita. Quelle rimaste aperte (gioco chiuso a metà) si annullano.
create or replace function public.lapartita_partita_inizia(p_competizione text, p_in_casa boolean default false)
returns uuid language plpgsql security definer set search_path = '' as $$
declare chi text := public.current_user_id(); nuova uuid;
begin
  if chi is null or p_competizione not in ('campionato', 'coppa', 'castelli') then return null; end if;
  perform lapartita.apri(chi);
  if (select count(*) from lapartita.partite where user_id = chi and iniziata_at > now() - interval '24 hours') >= lapartita.regola('partite_al_giorno') then return null; end if;
  update lapartita.partite set stato = 'annullata', finita_at = now() where user_id = chi and stato = 'aperta';
  insert into lapartita.partite (user_id, competizione, in_casa) values (chi, p_competizione, coalesce(p_in_casa, false)) returning id into nuova;
  return nuova;
end $$;

-- Chiude la partita e paga il premio: risultato, gol, incasso dello stadio
-- se era in casa. p_extra: 'turno' (turno di coppa superato), 'campionato',
-- 'coppa', 'castelli' (trofeo vinto con questa partita), oppure null.
create or replace function public.lapartita_partita_chiudi(p_partita uuid, p_gol_fatti integer, p_gol_subiti integer, p_extra text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  chi text := public.current_user_id(); m lapartita.partite; c lapartita.club;
  esito text; tot integer := 0; gol_max integer := lapartita.regola('partita_gol_massimi'); det jsonb; saldo integer;
begin
  if chi is null then return jsonb_build_object('ok', false, 'motivo', 'accesso'); end if;
  select * into m from lapartita.partite where id = p_partita and user_id = chi for update;
  if m.id is null or m.stato <> 'aperta' then return jsonb_build_object('ok', false, 'motivo', 'partita'); end if;
  if now() - m.iniziata_at < make_interval(secs => lapartita.regola('partita_secondi_minimi')) then return jsonb_build_object('ok', false, 'motivo', 'troppo_presto'); end if;
  if p_gol_fatti is null or p_gol_subiti is null or p_gol_fatti < 0 or p_gol_subiti < 0 or p_gol_fatti > gol_max or p_gol_subiti > gol_max then return jsonb_build_object('ok', false, 'motivo', 'gol'); end if;
  if p_extra is not null and p_extra not in ('turno', 'campionato', 'coppa', 'castelli') then return jsonb_build_object('ok', false, 'motivo', 'extra'); end if;
  -- un trofeo si vince con una partita della sua competizione
  if p_extra in ('campionato', 'coppa', 'castelli') and p_extra <> m.competizione then return jsonb_build_object('ok', false, 'motivo', 'extra'); end if;
  if p_extra = 'turno' and (m.competizione = 'campionato' or p_gol_fatti < p_gol_subiti) then return jsonb_build_object('ok', false, 'motivo', 'extra'); end if;
  select * into c from lapartita.club where user_id = chi;
  esito := case when p_gol_fatti > p_gol_subiti then 'vittoria' when p_gol_fatti < p_gol_subiti then 'sconfitta' else 'pareggio' end;
  det := jsonb_build_object('partita', m.id, 'competizione', m.competizione, 'risultato', p_gol_fatti || '-' || p_gol_subiti);
  tot := (select importo from lapartita.listino where codice = esito and valuta = 'monete') + p_gol_fatti * (select importo from lapartita.listino where codice = 'gol' and valuta = 'monete');
  saldo := lapartita.muovi(chi, 'monete', tot, 'partita', det, 'partita:' || m.id);
  if m.in_casa and m.competizione <> 'coppa' then
    declare b integer := (select importo from lapartita.listino where codice = 'casa_' || c.stadio and valuta = 'monete');
    begin if b > 0 then saldo := lapartita.muovi(chi, 'monete', b, 'incasso', det, 'incasso:' || m.id); tot := tot + b; end if; end;
  end if;
  if p_extra is not null then
    declare x integer := (select importo from lapartita.listino where codice = p_extra and valuta = 'monete');
    begin saldo := lapartita.muovi(chi, 'monete', x, case when p_extra = 'turno' then 'turno' else 'trofeo' end, det, p_extra || ':' || m.id); tot := tot + x; end;
  end if;
  update lapartita.partite set stato = 'chiusa', finita_at = now(), gol_fatti = p_gol_fatti, gol_subiti = p_gol_subiti, premio = tot where id = m.id;
  return jsonb_build_object('ok', true, 'premio', tot, 'monete', saldo);
end $$;

-- Premio di una sfida o di un livello del percorso. p_codice è una riga del
-- listino che comincia per «sfida_» o «percorso_»; p_periodo dice a quale
-- giorno, settimana o stagione si riferisce (per esempio '2026-11-21',
-- '2026-W47', 'stagione-2'): lo stesso premio dello stesso periodo si prende
-- una volta sola.
create or replace function public.lapartita_riscuoti(p_codice text, p_periodo text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare chi text := public.current_user_id(); p lapartita.portafogli;
begin
  if chi is null then return jsonb_build_object('ok', false, 'motivo', 'accesso'); end if;
  if p_codice is null or p_periodo is null or length(p_periodo) > 40 or not (p_codice like 'sfida\_%' or p_codice like 'percorso\_%') then return jsonb_build_object('ok', false, 'motivo', 'codice'); end if;
  perform lapartita.apri(chi);
  begin
    perform lapartita.applica(chi, p_codice, case when p_codice like 'sfida\_%' then 'sfida' else 'percorso' end, jsonb_build_object('codice', p_codice, 'periodo', p_periodo), p_codice || ':' || p_periodo);
  exception when sqlstate 'P0001' then return jsonb_build_object('ok', false, 'motivo', sqlerrm);
  end;
  select * into p from lapartita.portafogli where user_id = chi;
  return jsonb_build_object('ok', true, 'monete', p.monete, 'diamanti', p.diamanti);
end $$;

-- Compra il livello dopo di stadio o allenatore, una seduta di allenamento
-- per un giocatore (p_cosa = 'allenamento', p_nome = il giocatore), un
-- oggetto del negozio (p_cosa = il tipo, p_nome = quale) o il rinnovo del
-- giocatore consigliato (p_cosa = 'rinnovo').
create or replace function public.lapartita_compra(p_cosa text, p_nome text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare chi text := public.current_user_id(); c lapartita.club; p lapartita.portafogli; liv integer; fatte integer; costo integer;
begin
  if chi is null then return jsonb_build_object('ok', false, 'motivo', 'accesso'); end if;
  perform lapartita.apri(chi);
  select * into c from lapartita.club where user_id = chi for update;
  begin
    if p_cosa in ('stadio', 'allenatore') then
      liv := case when p_cosa = 'stadio' then c.stadio else c.allenatore end;
      if liv >= 5 then return jsonb_build_object('ok', false, 'motivo', 'massimo'); end if;
      perform lapartita.applica(chi, p_cosa || '_' || (liv + 1), p_cosa, jsonb_build_object('livello', liv + 1));
      if p_cosa = 'stadio' then update lapartita.club set stadio = liv + 1 where user_id = chi; else update lapartita.club set allenatore = liv + 1 where user_id = chi; end if;
    elsif p_cosa = 'allenamento' and p_nome is not null and length(p_nome) between 1 and 40 then
      fatte := coalesce((c.allenamenti ->> p_nome)::integer, 0);
      if fatte >= lapartita.regola('allenamento_sedute') + (c.allenatore - 1) then return jsonb_build_object('ok', false, 'motivo', 'massimo'); end if;
      costo := (round((lapartita.regola('allenamento_base') + lapartita.regola('allenamento_passo') * fatte) * (1 - (c.allenatore - 1) * lapartita.regola('allenatore_sconto') / 100.0) / 10.0) * 10)::integer;
      perform lapartita.muovi(chi, 'monete', -costo, 'allenamento', jsonb_build_object('giocatore', p_nome, 'seduta', fatte + 1));
      update lapartita.club set allenamenti = allenamenti || jsonb_build_object(p_nome, fatte + 1) where user_id = chi;
    elsif p_cosa = 'rinnovo' then
      perform lapartita.applica(chi, 'negozio_rinnovo', 'negozio', jsonb_build_object('cosa', 'rinnovo'));
    elsif p_cosa in ('avatar', 'cornice', 'scarpini', 'pallone', 'disegno', 'terza', 'stemma', 'stemma_raro') and p_nome is not null and length(p_nome) between 1 and 40 then
      -- un oggetto del negozio: si paga una volta sola e resta scritto tra gli oggetti del club
      if coalesce(c.oggetti -> p_cosa, '[]'::jsonb) ? p_nome then return jsonb_build_object('ok', false, 'motivo', 'presa'); end if;
      perform lapartita.applica(chi, 'negozio_' || p_cosa, 'negozio', jsonb_build_object('cosa', p_cosa, 'nome', p_nome));
      update lapartita.club set oggetti = oggetti || jsonb_build_object(p_cosa, coalesce(oggetti -> p_cosa, '[]'::jsonb) || to_jsonb(p_nome)) where user_id = chi;
    else
      return jsonb_build_object('ok', false, 'motivo', 'cosa');
    end if;
  exception when sqlstate 'P0001' then return jsonb_build_object('ok', false, 'motivo', sqlerrm);
  end;
  select * into p from lapartita.portafogli where user_id = chi;
  select * into c from lapartita.club where user_id = chi;
  return jsonb_build_object('ok', true, 'monete', p.monete, 'diamanti', p.diamanti, 'stadio', c.stadio, 'allenatore', c.allenatore);
end $$;

-- Scambio di mercato: si paga il prezzo di chi entra meno la quota di
-- cessione di chi esce (può anche far incassare). Prezzo = (valutazione
-- meno 50) al quadrato per il coefficiente, arrotondato alle decine.
create or replace function public.lapartita_scambia(p_entra integer, p_esce integer, p_dettagli jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare chi text := public.current_user_id(); k numeric := lapartita.regola('mercato_coefficiente') / 100.0; b numeric := lapartita.regola('mercato_base'); q numeric := lapartita.regola('mercato_cessione') / 100.0; costo integer; saldo integer;
begin
  if chi is null then return jsonb_build_object('ok', false, 'motivo', 'accesso'); end if;
  if p_entra is null or p_esce is null or p_entra not between 55 and 99 or p_esce not between 55 and 99 then return jsonb_build_object('ok', false, 'motivo', 'valutazione'); end if;
  perform lapartita.apri(chi);
  costo := (round(power(p_entra - b, 2) * k) * 10)::integer - (round(round(power(p_esce - b, 2) * k) * 10 * q / 10.0) * 10)::integer;
  begin
    saldo := lapartita.muovi(chi, 'monete', -costo, 'mercato', coalesce(p_dettagli, '{}'::jsonb) || jsonb_build_object('entra', p_entra, 'esce', p_esce));
  exception when sqlstate 'P0001' then return jsonb_build_object('ok', false, 'motivo', sqlerrm, 'costo', costo);
  end;
  return jsonb_build_object('ok', true, 'costo', costo, 'monete', saldo);
end $$;

-- Lo storico, dal più recente, a pagine.
create or replace function public.lapartita_movimenti(p_quanti integer default 40, p_prima_di bigint default null)
returns table (id bigint, quando timestamptz, valuta text, importo integer, causale text, dettagli jsonb, saldo_dopo integer)
language sql stable security definer set search_path = '' as $$
  select m.id, m.quando, m.valuta, m.importo, m.causale, m.dettagli, m.saldo_dopo
    from lapartita.movimenti m
   where m.user_id = public.current_user_id() and (p_prima_di is null or m.id < p_prima_di)
   order by m.id desc limit least(greatest(coalesce(p_quanti, 40), 1), 200);
$$;

-- ---------------------------------------------------------------- permessi
-- Le funzioni interne non si chiamano da fuori; le altre solo dopo l'accesso.
revoke all on function lapartita.regola(text), lapartita.apri(text), lapartita.muovi(text, text, integer, text, jsonb, text), lapartita.applica(text, text, text, jsonb, text) from public, anon, authenticated;
revoke all on function public.lapartita_stato(), public.lapartita_partita_inizia(text, boolean), public.lapartita_partita_chiudi(uuid, integer, integer, text), public.lapartita_riscuoti(text, text), public.lapartita_compra(text, text), public.lapartita_scambia(integer, integer, jsonb), public.lapartita_movimenti(integer, bigint) from public, anon;
grant execute on function public.lapartita_stato(), public.lapartita_partita_inizia(text, boolean), public.lapartita_partita_chiudi(uuid, integer, integer, text), public.lapartita_riscuoti(text, text), public.lapartita_compra(text, text), public.lapartita_scambia(integer, integer, jsonb), public.lapartita_movimenti(integer, bigint) to authenticated;
