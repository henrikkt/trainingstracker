import type { SyncMeta, SyncTabelle } from '../daten/db.ts';

/**
 * Abbildung lokale Dexie-Tabelle ↔ Supabase-Tabelle. Alle Server-Tabellen haben dieselbe Form
 * (user_id, id, data, client_updated_at, updated_at, deleted_at) – siehe supabase/migrations.
 */
export const TABELLEN: Record<SyncTabelle, { server: string; schluessel: string }> = {
  trainings: { server: 'workouts', schluessel: 'id' },
  vorlagen: { server: 'templates', schluessel: 'id' },
  eigeneUebungen: { server: 'custom_exercises', schluessel: 'id' },
  uebungsEinstellungen: { server: 'exercise_prefs', schluessel: 'uebungId' },
  koerpergewicht: { server: 'body_weights', schluessel: 'id' },
  profil: { server: 'profiles', schluessel: 'id' },
};

/** Zeile, wie sie zum Server geschickt wird (updated_at setzt der Server selbst). */
export interface ServerZeileHoch {
  user_id: string;
  id: string;
  data: Record<string, unknown>;
  client_updated_at: string;
  deleted_at: string | null;
}

/** Zeile, wie sie vom Server kommt. */
export interface ServerZeile {
  id: string;
  data: Record<string, unknown>;
  client_updated_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type LokalerDatensatz = Record<string, unknown> & SyncMeta;

export function zuServer(tabelle: SyncTabelle, ds: LokalerDatensatz, nutzerId: string): ServerZeileHoch {
  const { aktualisiertUm, geloeschtUm, ausstehend: _ausstehend, ...daten } = ds;
  return {
    user_id: nutzerId,
    id: String(ds[TABELLEN[tabelle].schluessel]),
    data: daten,
    client_updated_at: aktualisiertUm,
    deleted_at: geloeschtUm,
  };
}

/** Server-Zeile → lokaler Datensatz (gilt als synchronisiert). Zeitstempel normalisiert auf ISO mit „Z“. */
export function vonServer(tabelle: SyncTabelle, z: ServerZeile): LokalerDatensatz {
  return {
    ...z.data,
    [TABELLEN[tabelle].schluessel]: z.id,
    aktualisiertUm: new Date(z.client_updated_at).toISOString(),
    geloeschtUm: z.deleted_at ? new Date(z.deleted_at).toISOString() : null,
    ausstehend: 0,
  };
}

/**
 * Last-Write-Wins beim Pull:
 *  - lokal unbekannt oder lokal bereits synchronisiert → Server-Stand übernehmen
 *  - lokal noch nicht hochgeladen → der jüngere Stand (Änderungszeitpunkt auf dem Gerät) gewinnt;
 *    bei Gleichstand bleibt der lokale (er wird gleich hochgeladen)
 */
export function entscheide(lokal: Pick<SyncMeta, 'aktualisiertUm' | 'ausstehend'> | undefined, server: Pick<ServerZeile, 'client_updated_at'>): 'uebernehmen' | 'behalten' {
  if (!lokal || lokal.ausstehend === 0) return 'uebernehmen';
  return Date.parse(server.client_updated_at) > Date.parse(lokal.aktualisiertUm) ? 'uebernehmen' : 'behalten';
}

/** Überlappung beim Pull, damit Zeilen aus gerade laufenden Server-Transaktionen nicht verloren gehen. */
export const UEBERLAPPUNG_MS = 2 * 60_000;

export function pullAb(cursor: string | undefined): string | null {
  return cursor ? new Date(Date.parse(cursor) - UEBERLAPPUNG_MS).toISOString() : null;
}
