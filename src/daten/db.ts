import Dexie, { type EntityTable } from 'dexie';
import type { KoerpergewichtEintrag, ProfilEinstellungen, Training, Uebung, UebungsEinstellung, Vorlage } from '../domain/typen.ts';

/**
 * Sync-Metadaten an jedem lokalen Datensatz (Grundlage für E7):
 *  - aktualisiertUm: letzte Änderung auf diesem Gerät (→ client_updated_at, Last-Write-Wins)
 *  - geloeschtUm:    weiches Löschen, damit die Löschung synchronisiert werden kann (→ deleted_at)
 *  - ausstehend:     1 = noch nicht zum Server übertragen (IndexedDB kann keine Booleans indizieren)
 */
export interface SyncMeta {
  aktualisiertUm: string;
  geloeschtUm: string | null;
  ausstehend: 0 | 1;
}

export type MitMeta<T> = T & SyncMeta;

export type TrainingDS = MitMeta<Training>;
export type VorlageDS = MitMeta<Vorlage>;
export type EigeneUebungDS = MitMeta<Uebung>;
export type UebungsEinstellungDS = MitMeta<UebungsEinstellung>;
export type KoerpergewichtDS = MitMeta<KoerpergewichtEintrag>;
export const PROFIL_ID = 'ich';
export type ProfilDS = MitMeta<ProfilEinstellungen & { id: typeof PROFIL_ID }>;

export class StemmDB extends Dexie {
  trainings!: EntityTable<TrainingDS, 'id'>;
  vorlagen!: EntityTable<VorlageDS, 'id'>;
  eigeneUebungen!: EntityTable<EigeneUebungDS, 'id'>;
  uebungsEinstellungen!: EntityTable<UebungsEinstellungDS, 'uebungId'>;
  koerpergewicht!: EntityTable<KoerpergewichtDS, 'id'>;
  profil!: EntityTable<ProfilDS, 'id'>;

  constructor(name = 'stemm') {
    super(name);
    // Schema-Änderungen nur über neue Versionen (this.version(2)…) – nie Version 1 ändern.
    this.version(1).stores({
      trainings: 'id, start, ausstehend',
      vorlagen: 'id, ausstehend',
      eigeneUebungen: 'id, ausstehend',
      uebungsEinstellungen: 'uebungId, ausstehend',
      koerpergewicht: 'id, datum, ausstehend',
      profil: 'id, ausstehend',
    });
  }
}

export const db = new StemmDB();
