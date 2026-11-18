import { BEISPIEL_VORLAGEN, vorlageAusBeispiel } from '../domain/beispielVorlagen.ts';
import { STANDARD_PROFIL } from '../domain/einstellungen.ts';
import type { ProfilEinstellungen, Uebung, UebungsEinstellung, Vorlage } from '../domain/typen.ts';
import { db, PROFIL_ID, type MitMeta, type SyncMeta } from './db.ts';

/**
 * Alle Schreibzugriffe laufen über diese Funktionen: Sie setzen die Sync-Metadaten
 * (geändert, ausstehend) automatisch. Die UI schreibt nie direkt in die Tabellen.
 */

export const jetzt = (): string => new Date().toISOString();
export const neueId = (): string => crypto.randomUUID();

/** Entfernt Sync-Metadaten (z. B. für Export oder Weitergabe an die Fachlogik). */
export function ohneMeta<T extends object>(ds: T & Partial<SyncMeta>): T {
  const { aktualisiertUm: _a, geloeschtUm: _g, ausstehend: _s, ...rest } = ds;
  return rest as T;
}

export const istAktiv = (ds: SyncMeta): boolean => ds.geloeschtUm === null;

/** Schlanke Sicht auf eine Dexie-Tabelle (deren generische Typen sind für Hilfsfunktionen zu streng). */
interface SchreibTabelle<T, K> {
  put(datensatz: MitMeta<T>): Promise<unknown>;
  update(schluessel: K, aenderungen: Partial<SyncMeta>): Promise<number>;
}

async function speichere<T extends object, K>(tabelle: SchreibTabelle<T, K>, datensatz: T, zeit: string): Promise<void> {
  await tabelle.put({ ...ohneMeta(datensatz), aktualisiertUm: zeit, geloeschtUm: null, ausstehend: 1 } as MitMeta<T>);
}

async function loesche<T, K>(tabelle: SchreibTabelle<T, K>, schluessel: K, zeit: string): Promise<void> {
  await tabelle.update(schluessel, { geloeschtUm: zeit, aktualisiertUm: zeit, ausstehend: 1 });
}

// Vorlagen
export const speichereVorlage = (v: Vorlage, zeit = jetzt()) => speichere(db.vorlagen, v, zeit);
export const loescheVorlage = (id: string, zeit = jetzt()) => loesche(db.vorlagen, id, zeit);

export async function neueVorlage(name = 'Neue Vorlage'): Promise<string> {
  const id = neueId();
  await speichereVorlage({ id, name, uebungen: [] });
  return id;
}

export async function uebernimmBeispielVorlage(schluessel: string): Promise<string> {
  const beispiel = BEISPIEL_VORLAGEN.find((b) => b.schluessel === schluessel);
  if (!beispiel) throw new Error(`Unbekannte Beispielvorlage: ${schluessel}`);
  const id = neueId();
  await speichereVorlage(vorlageAusBeispiel(beispiel, id));
  return id;
}

// Eigene Übungen
export const speichereEigeneUebung = (u: Uebung, zeit = jetzt()) => speichere(db.eigeneUebungen, { ...u, eigene: true }, zeit);
export const loescheEigeneUebung = (id: string, zeit = jetzt()) => loesche(db.eigeneUebungen, id, zeit);

// Übungseinstellungen
export const speichereUebungsEinstellung = (e: UebungsEinstellung, zeit = jetzt()) => speichere(db.uebungsEinstellungen, e, zeit);

// Profil
export const speichereProfil = (p: ProfilEinstellungen, zeit = jetzt()) =>
  speichere<ProfilEinstellungen & { id: typeof PROFIL_ID }, typeof PROFIL_ID>(db.profil, { ...p, id: PROFIL_ID }, zeit);

export async function leseProfil(): Promise<ProfilEinstellungen> {
  const ds = await db.profil.get(PROFIL_ID);
  if (!ds) return STANDARD_PROFIL;
  const { id: _id, ...p } = ohneMeta(ds);
  return { ...STANDARD_PROFIL, ...p };
}
