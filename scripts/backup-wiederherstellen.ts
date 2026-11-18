// Stemm – Backup entschlüsseln, prüfen und wiederherstellen.
//
// Nur prüfen (nichts wird geschrieben):
//   node scripts/backup-wiederherstellen.ts --datei stemm-2026-11-19.sql.gz.age --schluessel C:\pfad\stemm-backup.key
// Wiederherstellen in eine (leere, mit den Migrationen eingerichtete) Datenbank:
//   node scripts/backup-wiederherstellen.ts --datei … --schluessel … --ziel "postgresql://…"
//
// Der private Schlüssel und die entschlüsselten Daten bleiben auf diesem Rechner; nichts wird gespeichert.
// Das Einspielen läuft in EINER Transaktion – bei einem Fehler wird nichts geändert.
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { Decrypter } from 'age-encryption';
import pg from 'pg';

/** Ref des Produktionsprojekts – dorthin wird nur mit ausdrücklicher Freigabe wiederhergestellt. */
export const PRODUKTION = 'odyujozkghkstnileikb';
export const TABELLEN = ['auth.users', 'auth.identities', 'public.profiles', 'public.custom_exercises', 'public.exercise_prefs', 'public.templates', 'public.workouts', 'public.body_weights'];

/** Liest die AGE-SECRET-KEY-Zeile aus dem Inhalt der Schlüsseldatei (Kommentarzeilen werden ignoriert). */
export function privaterSchluessel(text: string): string {
  const zeile = text
    .split(/\r?\n/)
    .map((z) => z.trim())
    .find((z) => z.startsWith('AGE-SECRET-KEY-'));
  if (!zeile) throw new Error('Kein privater age-Schlüssel (Zeile „AGE-SECRET-KEY-…“) gefunden.');
  return zeile;
}

export async function entschluessele(verschluesselt: Uint8Array, schluessel: string): Promise<string> {
  const d = new Decrypter();
  d.addIdentity(privaterSchluessel(schluessel));
  let gz: Uint8Array;
  try {
    gz = await d.decrypt(verschluesselt);
  } catch {
    throw new Error('Entschlüsseln fehlgeschlagen – falscher Schlüssel oder beschädigte Datei.');
  }
  return gunzipSync(gz).toString('utf8');
}

/** Entfernt psql-Meta-Befehle (z. B. \restrict von pg_dump 17.6+), die kein reines SQL sind. */
export function bereinigeSql(sql: string): string {
  return sql
    .split('\n')
    .filter((z) => !z.startsWith('\\'))
    .join('\n');
}

/** Zeilen je Tabelle (pg_dump --column-inserts: ein INSERT pro Zeile). */
export function zaehleZeilen(sql: string): Record<string, number> {
  const anzahl = Object.fromEntries(TABELLEN.map((t) => [t, 0])) as Record<string, number>;
  for (const m of sql.matchAll(/^INSERT INTO ([a-z_]+)\.([a-z_]+) /gm)) {
    const name = `${m[1]}.${m[2]}`;
    if (name in anzahl) anzahl[name]!++;
  }
  return anzahl;
}

/** Prüft, ob der Dump plausibel ist (alle Stemm-Tabellen erwähnt). Liefert fehlende Tabellen. */
export function fehlendeTabellen(sql: string): string[] {
  return TABELLEN.filter((t) => !sql.includes(`Name: ${t.split('.')[1]}; Type: TABLE DATA; Schema: ${t.split('.')[0]}`));
}

export interface SqlAusfuehrer {
  query(sql: string): Promise<unknown>;
}

/** Spielt den Dump in einer Transaktion ein (alles oder nichts). */
export async function spieleEin(sql: string, db: SqlAusfuehrer): Promise<void> {
  await db.query('begin');
  try {
    await db.query(bereinigeSql(sql));
    await db.query('commit');
  } catch (e) {
    await db.query('rollback');
    throw e;
  }
}

function argument(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function hauptprogramm(): Promise<void> {
  const datei = argument('datei');
  const schluesselDatei = argument('schluessel');
  const ziel = argument('ziel');
  if (!datei || !schluesselDatei) {
    console.error('Aufruf: node scripts/backup-wiederherstellen.ts --datei <backup.sql.gz.age> --schluessel <stemm-backup.key> [--ziel <postgresql-URL>]');
    process.exit(2);
  }

  const sql = await entschluessele(readFileSync(datei), readFileSync(schluesselDatei, 'utf8'));
  const fehlend = fehlendeTabellen(sql);
  if (fehlend.length) throw new Error(`Dump unvollständig, es fehlen: ${fehlend.join(', ')}`);
  console.log('Backup entschlüsselt und geprüft. Zeilen je Tabelle:');
  console.table(zaehleZeilen(sql));

  if (!ziel) {
    console.log('Nur geprüft (kein --ziel angegeben) – es wurde nichts geschrieben.');
    return;
  }
  if (ziel.includes(PRODUKTION) && !process.argv.includes('--auch-produktion')) {
    throw new Error('Ziel ist die PRODUKTIONS-Datenbank. Nur mit zusätzlichem --auch-produktion (z. B. nach Totalverlust).');
  }

  const client = new pg.Client({ connectionString: ziel, ssl: ziel.includes('localhost') || ziel.includes('127.0.0.1') ? false : { rejectUnauthorized: false } });
  await client.connect();
  try {
    await spieleEin(sql, client);
    console.log('Wiederhergestellt. Zeilen jetzt in der Ziel-Datenbank:');
    const stand: Record<string, number> = {};
    for (const t of TABELLEN) stand[t] = Number((await client.query<{ n: string }>(`select count(*) as n from ${t}`)).rows[0]!.n);
    console.table(stand);
  } finally {
    await client.end();
  }
}

if (import.meta.main) {
  hauptprogramm().catch((e: unknown) => {
    console.error(`Fehler: ${(e as Error).message}`);
    process.exit(1);
  });
}
