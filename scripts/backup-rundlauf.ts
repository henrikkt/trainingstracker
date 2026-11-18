// Automatischer Wiederherstellungstest (CI-Job „Datenbank und Zugriffsregeln“, lokaler Supabase-Stack):
// Konto + Daten anlegen → backup/dump.sh (Wegwerf-Schlüssel) → Datenbank komplett zurücksetzen →
// mit scripts/backup-wiederherstellen.ts einspielen → Login mit altem Passwort + Daten prüfen.
// Braucht SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY, SUPABASE_DB_URL (scripts/supabase-env.mjs),
// pg_dump 17 und age im PATH (bzw. PG_DUMP).
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { createClient } from '@supabase/supabase-js';
import { generateIdentity, identityToRecipient } from 'age-encryption';
import pg from 'pg';
import { entschluessele, spieleEin, zaehleZeilen } from './backup-wiederherstellen.ts';

const { SUPABASE_URL: url, SUPABASE_PUBLISHABLE_KEY: publishable, SUPABASE_SECRET_KEY: secret, SUPABASE_DB_URL: dbUrl } = process.env;
if (!url || !publishable || !secret || !dbUrl) throw new Error('Supabase-Umgebung fehlt (scripts/supabase-env.mjs)');
const optionen = { auth: { persistSession: false, autoRefreshToken: false } };

function pruefe(bedingung: unknown, text: string): void {
  if (!bedingung) throw new Error(`Rundlauf fehlgeschlagen: ${text}`);
  console.log(`✓ ${text}`);
}

// 1. Daten anlegen
const admin = createClient(url, secret, optionen);
const email = `rundlauf-${crypto.randomUUID()}@example.org`;
const passwort = 'Rundlauf-Passwort-1';
const { data: neu, error } = await admin.auth.admin.createUser({ email, password: passwort, email_confirm: true });
if (error) throw error;
const nutzer = createClient(url, publishable, optionen);
await nutzer.auth.signInWithPassword({ email, password: passwort });
const training = { id: 't1', titel: 'Beine', start: '2026-11-19T17:00:00.000Z', uebungen: [{ uebungId: 'kniebeuge', saetze: [{ gewicht: 100, wdh: 5, erledigt: true }] }] };
const eingefuegt = await nutzer.from('workouts').insert({ user_id: neu.user.id, id: 't1', data: training, client_updated_at: new Date().toISOString() });
if (eingefuegt.error) throw eingefuegt.error;

// 2. Backup mit Wegwerf-Schlüssel
const identitaet = await generateIdentity();
const ordner = mkdtempSync(join(tmpdir(), 'stemm-rundlauf-'));
const datei = join(ordner, 'test.sql.gz.age');
execFileSync('bash', ['backup/dump.sh', datei], { stdio: 'inherit', env: { ...process.env, DB_URL: dbUrl, AGE_RECIPIENT: await identityToRecipient(identitaet) } });

// 3. Totalverlust simulieren: Datenbank zurücksetzen (nur Migrationen, keine Daten, keine Konten)
execFileSync('npx', ['supabase', 'db', 'reset'], { stdio: 'inherit' });
const leer = await createClient(url, publishable, optionen).auth.signInWithPassword({ email, password: passwort });
pruefe(leer.error, 'nach dem Zurücksetzen ist das Konto weg');

// 4. Wiederherstellen
const sql = await entschluessele(readFileSync(datei), identitaet);
const zeilen = zaehleZeilen(sql);
pruefe(zeilen['auth.users']! >= 1 && zeilen['public.workouts']! >= 1, `Backup enthält Konten (${zeilen['auth.users']}) und Trainings (${zeilen['public.workouts']})`);
const client = new pg.Client({ connectionString: dbUrl });
await client.connect();
await spieleEin(sql, client);
await client.end();

// 5. Prüfen: Anmelden mit dem ALTEN Passwort, Training mit identischen Daten
const danach = createClient(url, publishable, optionen);
const login = await danach.auth.signInWithPassword({ email, password: passwort });
pruefe(!login.error, 'Anmeldung mit dem bisherigen Passwort funktioniert wieder');
const { data: trainings } = await danach.from('workouts').select('id, data');
// inhaltlich vergleichen – jsonb speichert Objektschlüssel in eigener Reihenfolge
pruefe(isDeepStrictEqual(trainings, [{ id: 't1', data: training }]), 'Training ist vollständig wiederhergestellt');
console.log('Wiederherstellungs-Rundlauf erfolgreich.');
