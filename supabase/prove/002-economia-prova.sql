-- Prova di supabase/002-lapartita-economia.sql su un Postgres locale vuoto (mai sul database dell'app).
-- Uso: psql -v ON_ERROR_STOP=1 -d <database di prova> -f supabase/prove/002-economia-prova.sql
-- Crea i ruoli e la funzione current_user_id() che su Supabase ci sono già, carica il file e controlla i casi che contano.
\set ON_ERROR_STOP 1
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
end $$;
-- al posto dell'accesso vero: l'utente è quello scritto in prova.utente
create or replace function public.current_user_id() returns text language sql stable as $$ select nullif(current_setting('prova.utente', true), '') $$;
\i supabase/002-lapartita-economia.sql
\i supabase/002-lapartita-economia.sql

create or replace function pg_temp.vero(cond boolean, cosa text) returns void language plpgsql as $$ begin if cond is not true then raise exception 'PROVA FALLITA: %', cosa; end if; end $$;

set prova.utente = 'u1';
do $$
declare s jsonb; r jsonb; m uuid; m2 uuid; n integer;
begin
  -- senza accesso non succede niente
  perform set_config('prova.utente', '', false);
  perform pg_temp.vero(public.lapartita_stato() is null, 'stato senza accesso');
  perform pg_temp.vero(public.lapartita_partita_inizia('campionato', true) is null, 'partita senza accesso');
  perform set_config('prova.utente', 'u1', false);

  -- primo stato: 500 monete e 20 diamanti, scritti nello storico; rifarlo non raddoppia
  s := public.lapartita_stato(); s := public.lapartita_stato();
  perform pg_temp.vero((s->>'monete')::int = 500 and (s->>'diamanti')::int = 20 and (s->>'stadio')::int = 1, 'saldo iniziale');
  perform pg_temp.vero((select count(*) from public.lapartita_movimenti where user_id = 'u1') = 2, 'due movimenti iniziali');

  -- partita: troppo presto, poi valida (2-1 in casa, stadio 1: 300 + 40), poi non si chiude due volte
  m := public.lapartita_partita_inizia('campionato', true);
  r := public.lapartita_partita_chiudi(m, 2, 1); perform pg_temp.vero(r->>'motivo' = 'troppo_presto', 'partita troppo corta');
  update public.lapartita_partite set iniziata_at = now() - interval '200 seconds' where id = m;
  r := public.lapartita_partita_chiudi(m, 13, 0); perform pg_temp.vero(r->>'motivo' = 'gol', 'troppi gol');
  r := public.lapartita_partita_chiudi(m, 2, 1, 'coppa'); perform pg_temp.vero(r->>'motivo' = 'extra', 'trofeo di un''altra competizione');
  r := public.lapartita_partita_chiudi(m, 2, 1); perform pg_temp.vero((r->>'ok')::boolean and (r->>'premio')::int = 340 and (r->>'monete')::int = 840, 'premio della partita: ' || r::text);
  r := public.lapartita_partita_chiudi(m, 2, 1); perform pg_temp.vero(r->>'motivo' = 'partita', 'partita chiusa due volte');
  -- la partita di un altro non si chiude
  perform set_config('prova.utente', 'u2', false); r := public.lapartita_partita_chiudi(m, 9, 0); perform pg_temp.vero(r->>'motivo' = 'partita', 'partita di un altro');
  perform pg_temp.vero((public.lapartita_stato()->>'monete')::int = 500, 'il secondo utente ha il suo saldo');
  perform set_config('prova.utente', 'u1', false);
  -- aprirne una nuova annulla quella rimasta aperta
  m := public.lapartita_partita_inizia('coppa', false); m2 := public.lapartita_partita_inizia('coppa', false);
  perform pg_temp.vero((select stato from public.lapartita_partite where id = m) = 'annullata', 'la partita lasciata a metà si annulla');
  update public.lapartita_partite set iniziata_at = now() - interval '200 seconds' where id = m2;
  r := public.lapartita_partita_chiudi(m2, 1, 0, 'turno'); perform pg_temp.vero((r->>'premio')::int = 300 + 20 + 150, 'coppa: turno superato ' || r::text);

  -- sfide e percorso: importo dal listino, una volta sola per periodo; codici che non sono premi rifiutati
  r := public.lapartita_riscuoti('sfida_d1', '2026-11-21'); perform pg_temp.vero((r->>'ok')::boolean and (r->>'monete')::int = 840 + 470 + 100, 'sfida riscossa ' || r::text);
  r := public.lapartita_riscuoti('sfida_d1', '2026-11-21'); perform pg_temp.vero(r->>'motivo' = 'gia_preso', 'sfida riscossa due volte');
  r := public.lapartita_riscuoti('sfida_d1', '2026-11-22'); perform pg_temp.vero((r->>'ok')::boolean, 'la stessa sfida il giorno dopo');
  r := public.lapartita_riscuoti('vittoria', 'x'); perform pg_temp.vero(r->>'motivo' = 'codice', 'un premio di partita non si riscuote');
  r := public.lapartita_riscuoti('sfida_zz', 'x'); perform pg_temp.vero(r->>'motivo' = 'codice_sconosciuto', 'sfida che non esiste');
  r := public.lapartita_riscuoti('percorso_2', 'stagione-1'); perform pg_temp.vero((r->>'diamanti')::int = 23, 'livello del percorso in diamanti');

  -- acquisti: senza soldi no e non cambia niente; coi soldi sì; lo stadio poi rende in casa
  r := public.lapartita_compra('stadio'); r := public.lapartita_compra('stadio'); perform pg_temp.vero(r->>'motivo' = 'saldo_insufficiente', 'secondo stadio senza soldi: ' || r::text);
  perform pg_temp.vero((public.lapartita_stato()->>'stadio')::int = 2, 'stadio al livello 2');
  -- il livello 3 costa monete e diamanti: se mancano i diamanti non si tolgono nemmeno le monete
  update public.lapartita_portafogli set monete = 50000, diamanti = 5 where user_id = 'u1';
  r := public.lapartita_compra('stadio'); perform pg_temp.vero(r->>'motivo' = 'saldo_insufficiente' and (public.lapartita_stato()->>'monete')::int = 50000, 'acquisto a metà annullato');
  update public.lapartita_portafogli set diamanti = 500 where user_id = 'u1';
  r := public.lapartita_compra('stadio'); perform pg_temp.vero((r->>'stadio')::int = 3 and (r->>'monete')::int = 46000 and (r->>'diamanti')::int = 490, 'stadio 3: ' || r::text);
  m := public.lapartita_partita_inizia('campionato', true); update public.lapartita_partite set iniziata_at = now() - interval '200 seconds' where id = m;
  r := public.lapartita_partita_chiudi(m, 0, 0); perform pg_temp.vero((r->>'premio')::int = 120 + 130, 'pareggio in casa con lo stadio 3');
  for n in 1..4 loop r := public.lapartita_compra('stadio'); end loop; perform pg_temp.vero(r->>'motivo' = 'massimo', 'stadio al massimo');
  r := public.lapartita_compra('pizza'); perform pg_temp.vero(r->>'motivo' = 'cosa', 'acquisto che non esiste');

  -- allenamento: 200, poi 350; con l'allenatore al livello 2 lo sconto del 5% e una seduta in più
  update public.lapartita_portafogli set monete = 100000, diamanti = 500 where user_id = 'u1';
  r := public.lapartita_compra('allenamento', 'Rossi'); perform pg_temp.vero((r->>'monete')::int = 99800, 'prima seduta');
  r := public.lapartita_compra('allenamento', 'Rossi'); perform pg_temp.vero((r->>'monete')::int = 99450, 'seconda seduta');
  r := public.lapartita_compra('allenatore'); perform pg_temp.vero((r->>'allenatore')::int = 2 and (r->>'monete')::int = 97450, 'allenatore 2');
  r := public.lapartita_compra('allenamento', 'Rossi'); perform pg_temp.vero((r->>'monete')::int = 97450 - 480, 'terza seduta scontata: ' || r::text);
  for n in 1..4 loop r := public.lapartita_compra('allenamento', 'Rossi'); end loop; perform pg_temp.vero((r->>'ok')::boolean, 'settima seduta con l''allenatore 2');
  r := public.lapartita_compra('allenamento', 'Rossi'); perform pg_temp.vero(r->>'motivo' = 'massimo', 'ottava seduta rifiutata');

  -- mercato: 85 per 65 costa 4.900 meno 630; valutazioni fuori scala rifiutate; cedere uno forte per uno debole fa incassare
  update public.lapartita_portafogli set monete = 5000 where user_id = 'u1';
  r := public.lapartita_scambia(85, 65); perform pg_temp.vero((r->>'costo')::int = 4270 and (r->>'monete')::int = 730, 'scambio: ' || r::text);
  r := public.lapartita_scambia(85, 65); perform pg_temp.vero(r->>'motivo' = 'saldo_insufficiente' and (r->>'costo')::int = 4270, 'scambio senza soldi');
  r := public.lapartita_scambia(120, 65); perform pg_temp.vero(r->>'motivo' = 'valutazione', 'valutazione fuori scala');
  r := public.lapartita_scambia(60, 80); perform pg_temp.vero((r->>'costo')::int = 400 - 2520 and (r->>'monete')::int = 730 + 2120, 'scambio che fa incassare: ' || r::text);

  -- lo storico torna col saldo: l'ultima riga di ogni valuta dice il saldo vero
  perform pg_temp.vero((select saldo_dopo from public.lapartita_movimenti where user_id = 'u1' and valuta = 'monete' order by id desc limit 1) = (select monete from public.lapartita_portafogli where user_id = 'u1'), 'storico e saldo in monete');
  perform pg_temp.vero((select count(*) from public.lapartita_movimenti(5)) = 5 and (select count(*) from public.lapartita_movimenti(500)) <= 200, 'storico a pagine');

  -- tetto alle partite al giorno
  update public.lapartita_listino set importo = (select count(*) from public.lapartita_partite where user_id = 'u1') where codice = 'partite_al_giorno';
  perform pg_temp.vero(public.lapartita_partita_inizia('campionato', true) is null, 'tetto alle partite al giorno');
  update public.lapartita_listino set importo = 60 where codice = 'partite_al_giorno';
end $$;

-- permessi: chi ha fatto l'accesso non legge le tabelle e non chiama le funzioni interne, ma chiama quelle del gioco
set role authenticated;
do $$ begin
  begin perform 1 from public.lapartita_portafogli; raise exception 'PROVA FALLITA: tabella leggibile'; exception when insufficient_privilege then null; end;
  begin perform public.lapartita__muovi('u1', 'monete', 999999, 'furto', '{}'::jsonb); raise exception 'PROVA FALLITA: funzione interna chiamabile'; exception when insufficient_privilege then null; end;
  perform pg_temp.vero((public.lapartita_stato()->>'monete') is not null, 'stato dal ruolo del gioco');
end $$;
reset role;
set role anon;
do $$ begin
  begin perform public.lapartita_stato(); raise exception 'PROVA FALLITA: anonimo ammesso'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'Economia sul server: tutte le prove passate' as esito;
