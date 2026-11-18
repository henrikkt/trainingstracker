import { readdirSync, readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

/**
 * Postgres im Prozess (PGlite) mit einem nachgebauten Minimal-Supabase:
 * Schema auth mit users + auth.uid(), Rollen anon/authenticated/service_role und die
 * Standard-Rechte, die Supabase im Schema public vergibt. Danach werden alle Migrationen eingespielt.
 * So lassen sich die RLS-Regeln lokal ohne Docker testen; die CI prüft zusätzlich gegen echtes Supabase.
 */
export async function starteTestDatenbank(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;

    create schema auth;
    create table auth.users (id uuid primary key, email text);
    -- wie bei Supabase: die Nutzer-ID kommt aus dem JWT (hier: aus einer Sitzungsvariable)
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    grant usage on schema auth to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;

    -- Supabase vergibt im Schema public standardmäßig alle Rechte an diese Rollen
    grant usage on schema public to anon, authenticated, service_role;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  `);

  const ordner = new URL('../migrations/', import.meta.url);
  for (const datei of readdirSync(ordner).filter((d) => d.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(new URL(datei, ordner), 'utf8'));
  }
  return db;
}

/** Führt `arbeit` als angemeldete Person (oder anonym) aus und setzt danach zurück. */
export async function als<T>(db: PGlite, nutzer: string | 'anon', arbeit: () => Promise<T>): Promise<T> {
  await db.exec(nutzer === 'anon' ? `set role anon; select set_config('request.jwt.claim.sub', '', false);` : `set role authenticated; select set_config('request.jwt.claim.sub', '${nutzer}', false);`);
  try {
    return await arbeit();
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`);
  }
}
