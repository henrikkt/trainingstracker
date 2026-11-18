import { db, SYNC_TABELLEN, type SyncTabelle } from '../daten/db.ts';
import { entscheide, pullAb, TABELLEN, vonServer, zuServer, type LokalerDatensatz, type ServerZeile, type ServerZeileHoch } from './abbildung.ts';

/**
 * Sync-Motor: Push (ausstehende lokale Änderungen hochladen) und Pull (neue Server-Stände holen).
 * Schreibt direkt in Dexie (nicht über repo.ts), damit Sync-Schreibvorgänge keinen neuen Sync auslösen.
 */

/** Schmale Server-Schnittstelle – in der App Supabase, in Tests ein nachgebauter Server. */
export interface SyncServer {
  hochladen(tabelle: string, zeilen: ServerZeileHoch[]): Promise<void>;
  /** Zeilen mit updated_at > ab (oder alle), aufsteigend nach updated_at, Bereich von..bis (inklusive). */
  holen(tabelle: string, ab: string | null, von: number, bis: number): Promise<ServerZeile[]>;
}

/** Keine Verbindung – Sync später erneut versuchen, nichts als fehlerhaft markieren. */
export class NetzwerkFehler extends Error {}
/** Sitzung ungültig/abgelaufen – erneut anmelden nötig. */
export class AnmeldeFehler extends Error {}
/** Server lehnt eine Zeile ab (z. B. Prüfregel verletzt). */
export class ServerFehler extends Error {}

export const BATCH = 100;
export const SEITE = 500;

export interface SyncErgebnis {
  hochgeladen: number;
  geholt: number;
  /** Datensätze, die der Server abgelehnt hat (bleiben lokal ausstehend) */
  abgelehnt: string[];
}

const cursorSchluessel = (t: SyncTabelle) => `sync.cursor.${t}`;
const tabelle = (t: SyncTabelle) => db.table<LokalerDatensatz, string>(t);

function stuecke<T>(liste: T[], groesse: number): T[][] {
  const ergebnis: T[][] = [];
  for (let i = 0; i < liste.length; i += groesse) ergebnis.push(liste.slice(i, i + groesse));
  return ergebnis;
}

/** Als synchronisiert markieren – aber nur, wenn der Datensatz seit dem Lesen nicht erneut geändert wurde. */
async function markiereErledigt(t: SyncTabelle, liste: LokalerDatensatz[]): Promise<void> {
  const schluessel = TABELLEN[t].schluessel;
  await db.transaction('rw', tabelle(t), async () => {
    for (const ds of liste) {
      const aktuell = await tabelle(t).get(String(ds[schluessel]));
      if (aktuell && aktuell.ausstehend === 1 && aktuell.aktualisiertUm === ds.aktualisiertUm) {
        await tabelle(t).update(String(ds[schluessel]), { ausstehend: 0 });
      }
    }
  });
}

export async function pushe(server: SyncServer, nutzerId: string): Promise<{ hochgeladen: number; abgelehnt: string[] }> {
  let hochgeladen = 0;
  const abgelehnt: string[] = [];
  for (const t of SYNC_TABELLEN) {
    const { server: serverTabelle, schluessel } = TABELLEN[t];
    const offen = await tabelle(t).where('ausstehend').equals(1).toArray();
    for (const stueck of stuecke(offen, BATCH)) {
      let erledigt: LokalerDatensatz[] = stueck;
      try {
        await server.hochladen(serverTabelle, stueck.map((ds) => zuServer(t, ds, nutzerId)));
      } catch (e) {
        if (!(e instanceof ServerFehler)) throw e; // Netz/Anmeldung: ganzen Sync abbrechen, später erneut
        // Eine Zeile ist fehlerhaft → einzeln versuchen, damit der Rest trotzdem ankommt
        erledigt = [];
        for (const ds of stueck) {
          try {
            await server.hochladen(serverTabelle, [zuServer(t, ds, nutzerId)]);
            erledigt.push(ds);
          } catch (einzeln) {
            if (!(einzeln instanceof ServerFehler)) throw einzeln;
            abgelehnt.push(`${t}/${String(ds[schluessel])}: ${einzeln.message}`);
          }
        }
      }
      await markiereErledigt(t, erledigt);
      hochgeladen += erledigt.length;
    }
  }
  return { hochgeladen, abgelehnt };
}

export async function pulle(server: SyncServer): Promise<number> {
  let geholt = 0;
  for (const t of SYNC_TABELLEN) {
    const cursor = (await db.meta.get(cursorSchluessel(t)))?.wert as string | undefined;
    const ab = pullAb(cursor);
    let neuerCursor = cursor;
    for (let von = 0; ; von += SEITE) {
      const zeilen = await server.holen(TABELLEN[t].server, ab, von, von + SEITE - 1);
      await db.transaction('rw', tabelle(t), async () => {
        for (const z of zeilen) {
          const lokal = await tabelle(t).get(z.id);
          if (entscheide(lokal, z) === 'uebernehmen') await tabelle(t).put(vonServer(t, z));
        }
      });
      for (const z of zeilen) {
        const zeit = new Date(z.updated_at).toISOString();
        if (!neuerCursor || zeit > neuerCursor) neuerCursor = zeit;
      }
      geholt += zeilen.length;
      if (zeilen.length < SEITE) break;
    }
    if (neuerCursor && neuerCursor !== cursor) await db.meta.put({ schluessel: cursorSchluessel(t), wert: neuerCursor });
  }
  return geholt;
}

/**
 * Ein kompletter Sync: erst hochladen (lokale Änderungen sichern), dann holen.
 * Ältere lokale Stände lehnt der Server ab (Last-Write-Wins im Trigger) – der Pull bringt dann den neueren.
 */
export async function synchronisiere(server: SyncServer, nutzerId: string): Promise<SyncErgebnis> {
  const { hochgeladen, abgelehnt } = await pushe(server, nutzerId);
  const geholt = await pulle(server);
  return { hochgeladen, geholt, abgelehnt };
}
