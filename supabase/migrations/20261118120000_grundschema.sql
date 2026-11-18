-- Stemm – Grundschema
--
-- Alle sechs Tabellen haben dieselbe Form, damit der Sync (E7) sie einheitlich behandeln kann:
--   user_id            Besitzer (auth.users), wird beim Konto-Löschen mitgelöscht
--   id                 Schlüssel innerhalb des Nutzers (UUID, Übungs-ID oder 'ich' beim Profil)
--   data               der Datensatz als JSON (wie in der App/IndexedDB, ohne Sync-Metadaten)
--   client_updated_at  Zeitpunkt der Änderung auf dem Gerät → Last-Write-Wins
--   updated_at         Zeitpunkt der Änderung auf dem Server → Pull-Cursor (vom Trigger gesetzt)
--   deleted_at         weiches Löschen (wird mitsynchronisiert)
--
-- Zugriff: Row Level Security – jede Person sieht und ändert nur Zeilen mit user_id = auth.uid().
-- Es gibt bewusst KEINE Ausnahme für Admins. Hartes Löschen ist für Clients nicht erlaubt.

-- Trigger: Server-Zeitstempel setzen und ältere Änderungen verwerfen (Last-Write-Wins)
create function public.stemm_vor_schreiben() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    -- Besitzer und Schlüssel sind unveränderlich
    if new.user_id is distinct from old.user_id or new.id is distinct from old.id then
      raise exception 'user_id und id dürfen nicht geändert werden';
    end if;
    -- Eine ältere Änderung (z. B. von einem Gerät, das lange offline war) überschreibt keine neuere
    if new.client_updated_at < old.client_updated_at then
      return old;
    end if;
  end if;
  new.updated_at := clock_timestamp();
  return new;
end;
$$;

-- Erzeugt eine Tabelle in der gemeinsamen Form inkl. RLS, Trigger und Index.
-- max_bytes begrenzt die Größe des JSON-Datensatzes (Schutz vor Missbrauch/Fehlern).
create function public.stemm_lege_tabelle_an(name text, max_bytes integer) returns void
language plpgsql
set search_path = ''
as $$
begin
  execute format($f$
    create table public.%1$I (
      user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
      id text not null check (char_length(id) between 1 and 100),
      data jsonb not null check (jsonb_typeof(data) = 'object' and pg_column_size(data) <= %2$s),
      client_updated_at timestamptz not null,
      updated_at timestamptz not null default clock_timestamp(),
      deleted_at timestamptz,
      primary key (user_id, id)
    )$f$, name, max_bytes);

  execute format('create index %1$I on public.%2$I (user_id, updated_at)', name || '_pull_idx', name);

  execute format('alter table public.%I enable row level security', name);

  -- Nur angemeldete Nutzer, nur eigene Zeilen. Keine delete-Policy → Clients können nicht hart löschen.
  execute format($p$create policy "eigene lesen" on public.%I for select to authenticated using (user_id = (select auth.uid()))$p$, name);
  execute format($p$create policy "eigene anlegen" on public.%I for insert to authenticated with check (user_id = (select auth.uid()))$p$, name);
  execute format($p$create policy "eigene ändern" on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))$p$, name);

  -- Rechte: anon bekommt nichts, authenticated nur lesen/anlegen/ändern
  execute format('revoke all on table public.%I from anon, authenticated', name);
  execute format('grant select, insert, update on table public.%I to authenticated', name);

  execute format('create trigger vor_schreiben before insert or update on public.%I for each row execute function public.stemm_vor_schreiben()', name);
end;
$$;

select public.stemm_lege_tabelle_an('profiles', 16384);
select public.stemm_lege_tabelle_an('custom_exercises', 16384);
select public.stemm_lege_tabelle_an('exercise_prefs', 16384);
select public.stemm_lege_tabelle_an('templates', 65536);
select public.stemm_lege_tabelle_an('workouts', 262144);
select public.stemm_lege_tabelle_an('body_weights', 4096);

-- Die Hilfsfunktion wird nur bei der Migration gebraucht
drop function public.stemm_lege_tabelle_an(text, integer);
revoke all on function public.stemm_vor_schreiben() from public, anon, authenticated;
