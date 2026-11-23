import type { PGlite } from '@electric-sql/pglite';
import { randomBytes } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { als, starteTestDatenbank } from './pglite.ts';

/**
 * Zugriffsregeln (Row Level Security) – lokal gegen PGlite.
 * Kernaussage: Jede Person sieht und ändert nur ihre eigenen Daten, auch bei direktem SQL/API-Zugriff.
 */
const ANNA = '11111111-1111-1111-1111-111111111111';
const BEN = '22222222-2222-2222-2222-222222222222';
const TABELLEN = ['profiles', 'custom_exercises', 'exercise_prefs', 'templates', 'workouts', 'body_weights'];

let db: PGlite;

async function fehlerVon(versuch: () => Promise<unknown>): Promise<string> {
  try {
    await versuch();
  } catch (e) {
    return (e as Error).message;
  }
  return '';
}

beforeAll(async () => {
  db = await starteTestDatenbank();
  await db.exec(`insert into auth.users (id, email) values ('${ANNA}', 'anna@example.org'), ('${BEN}', 'ben@example.org');`);
  for (const tabelle of TABELLEN) {
    await als(db, ANNA, () =>
      db.query(`insert into public.${tabelle} (user_id, id, data, client_updated_at) values ($1, 'a1', '{"von":"anna"}', '2026-11-18T10:00:00Z')`, [ANNA]),
    );
  }
}, 30_000);

describe.each(TABELLEN)('Tabelle %s', (tabelle) => {
  it('Besitzerin sieht ihre Zeile', async () => {
    const r = await als(db, ANNA, () => db.query(`select id from public.${tabelle}`));
    expect(r.rows).toEqual([{ id: 'a1' }]);
  });

  it('andere Person sieht nichts', async () => {
    const r = await als(db, BEN, () => db.query(`select * from public.${tabelle}`));
    expect(r.rows).toEqual([]);
  });

  it('anonym: kein Zugriff', async () => {
    expect(await als(db, 'anon', () => fehlerVon(() => db.query(`select * from public.${tabelle}`)))).toMatch(/permission denied/);
  });

  it('andere Person kann nicht fremde Zeilen anlegen', async () => {
    const fehler = await als(db, BEN, () =>
      fehlerVon(() => db.query(`insert into public.${tabelle} (user_id, id, data, client_updated_at) values ($1, 'b-fake', '{}', now())`, [ANNA])),
    );
    expect(fehler).toMatch(/row-level security/);
  });

  it('andere Person kann fremde Zeilen weder ändern noch per Upsert überschreiben', async () => {
    await als(db, BEN, () => db.query(`update public.${tabelle} set data = '{"von":"ben"}' where user_id = $1`, [ANNA]));
    const upsert = await als(db, BEN, () =>
      fehlerVon(() =>
        db.query(
          `insert into public.${tabelle} (user_id, id, data, client_updated_at) values ($1, 'a1', '{"von":"ben"}', now())
           on conflict (user_id, id) do update set data = excluded.data`,
          [ANNA],
        ),
      ),
    );
    expect(upsert).toMatch(/row-level security/);
    const r = await db.query<{ data: { von: string } }>(`select data from public.${tabelle} where user_id = $1 and id = 'a1'`, [ANNA]);
    expect(r.rows[0]!.data.von).toBe('anna');
  });

  it('Zeile kann nicht an eine andere Person „verschenkt“ werden', async () => {
    const fehler = await als(db, ANNA, () => fehlerVon(() => db.query(`update public.${tabelle} set user_id = $1 where id = 'a1'`, [BEN])));
    expect(fehler).not.toBe('');
  });

  it('hartes Löschen ist nicht erlaubt (nur weich über deleted_at)', async () => {
    expect(await als(db, ANNA, () => fehlerVon(() => db.query(`delete from public.${tabelle} where id = 'a1'`)))).toMatch(/permission denied/);
  });
});

describe('Gegenprobe des Test-Aufbaus', () => {
  it('ohne RLS wäre die fremde Zeile sichtbar – die Tests oben messen also wirklich RLS', async () => {
    await db.exec('begin');
    try {
      await db.exec('alter table public.workouts disable row level security');
      await db.exec(`set local role authenticated; select set_config('request.jwt.claim.sub', '${BEN}', true);`);
      const r = await db.query(`select id from public.workouts where user_id = $1`, [ANNA]);
      expect(r.rows).toEqual([{ id: 'a1' }]);
    } finally {
      await db.exec('rollback');
    }
    const danach = await als(db, BEN, () => db.query(`select id from public.workouts where user_id = $1`, [ANNA]));
    expect(danach.rows).toEqual([]);
  });
});

describe('Last-Write-Wins und Zeitstempel', () => {
  it('neuere Änderung gewinnt, ältere wird verworfen; updated_at setzt der Server', async () => {
    await als(db, BEN, () => db.query(`insert into public.workouts (user_id, id, data, client_updated_at, updated_at) values ($1, 'w1', '{"v":1}', '2026-11-18T10:00:00Z', '2000-01-01')`, [BEN]));
    const erst = await db.query<{ updated_at: Date }>(`select updated_at from public.workouts where id = 'w1'`);
    expect(erst.rows[0]!.updated_at.getFullYear()).toBeGreaterThan(2000); // vom Client gesetzter Wert wird überschrieben

    const upsert = (v: number, zeit: string) =>
      als(db, BEN, () =>
        db.query(
          `insert into public.workouts (user_id, id, data, client_updated_at) values ($1, 'w1', $2, $3)
           on conflict (user_id, id) do update set data = excluded.data, client_updated_at = excluded.client_updated_at, deleted_at = excluded.deleted_at`,
          [BEN, JSON.stringify({ v }), zeit],
        ),
      );
    await upsert(2, '2026-11-18T12:00:00Z');
    await upsert(3, '2026-11-18T11:00:00Z'); // älter → verworfen
    const r = await db.query<{ data: { v: number } }>(`select data from public.workouts where id = 'w1'`);
    expect(r.rows[0]!.data.v).toBe(2);
  });

  it('weiches Löschen über deleted_at funktioniert', async () => {
    await als(db, BEN, () => db.query(`update public.workouts set deleted_at = now(), client_updated_at = '2026-11-18T13:00:00Z' where id = 'w1'`));
    const r = await als(db, BEN, () => db.query<{ deleted_at: Date | null }>(`select deleted_at from public.workouts where id = 'w1'`));
    expect(r.rows[0]!.deleted_at).not.toBeNull();
  });
});

describe('Prüfungen und Konto-Löschung', () => {
  it('lehnt ungültige Daten ab (kein Objekt, zu groß, leere ID)', async () => {
    const versuch = (id: string, data: string, tabelle = 'body_weights') =>
      als(db, ANNA, () => fehlerVon(() => db.query(`insert into public.${tabelle} (user_id, id, data, client_updated_at) values ($1, $2, $3, now())`, [ANNA, id, data])));
    expect(await versuch('x1', '[1,2]')).toMatch(/check constraint/);
    expect(await versuch('', '{}')).toMatch(/check constraint/);
    expect(await versuch('x2', JSON.stringify({ text: 'x'.repeat(5000) }))).toMatch(/check constraint/);
    expect(await versuch('x3', JSON.stringify({ text: 'x'.repeat(5000) }), 'workouts')).toBe('');
  });

  it('Übungseinstellungen dürfen ein kleines Foto enthalten, aber nicht beliebig große Daten', async () => {
    const versuch = (id: string, zeichen: number) => {
      // Zufallsdaten: lassen sich (wie echte JPEGs) kaum komprimieren
      const foto = `data:image/jpeg;base64,${randomBytes(Math.ceil(zeichen * 0.75)).toString('base64').slice(0, zeichen)}`;
      return als(db, ANNA, () =>
        fehlerVon(() => db.query(`insert into public.exercise_prefs (user_id, id, data, client_updated_at) values ($1, $2, $3, now())`, [ANNA, id, JSON.stringify({ uebungId: id, foto })])),
      );
    };
    expect(await versuch('foto-ok', 60_000)).toBe('');
    expect(await versuch('foto-zu-gross', 140_000)).toMatch(/check constraint/);
  });

  it('Konto löschen entfernt alle Daten der Person (Kaskade), andere bleiben', async () => {
    await db.query(`delete from auth.users where id = $1`, [ANNA]);
    for (const tabelle of TABELLEN) {
      const r = await db.query<{ n: number }>(`select count(*)::int as n from public.${tabelle} where user_id = $1`, [ANNA]);
      expect(r.rows[0]!.n).toBe(0);
    }
    const ben = await db.query<{ n: number }>(`select count(*)::int as n from public.workouts where user_id = $1`, [BEN]);
    expect(ben.rows[0]!.n).toBe(1);
  });
});
