import { KATALOG } from './katalog.ts';
import type { ProfilEinstellungen, Uebung } from './typen.ts';

/**
 * Studios mit ihren verfügbaren Katalog-Übungen. Eigene Übungen tragen ihre Studios selbst (`Uebung.studios`).
 * Studio-IDs sind dauerhaft (stehen in Profilen und eigenen Übungen) – nie ändern.
 */
export interface Studio {
  id: string;
  name: string;
  /** IDs von Katalog-Übungen, die es dort gibt */
  uebungen: ReadonlySet<string>;
}

/**
 * Kraftkultur Mönchengladbach.
 * Vorläufig: alle freien Übungen (Hanteln, Kabel, Körpergewicht). Maschinen kommen hinzu,
 * sobald feststeht, welche es dort gibt.
 */
const KRAFTKULTUR_VORLAEUFIG = KATALOG.filter((u) => u.geraet !== 'maschine').map((u) => u.id);

export const STUDIOS: readonly Studio[] = [{ id: 'kraftkultur', name: 'Kraftkultur', uebungen: new Set(KRAFTKULTUR_VORLAEUFIG) }];

export const STANDARD_STUDIO_ID = 'kraftkultur';

export function findeStudio(id: string | null | undefined): Studio | undefined {
  return id ? STUDIOS.find((s) => s.id === id) : undefined;
}

/** Studio aus dem Profil: nicht gesetzt → Standard-Studio, null oder unbekannt → keins. */
export function meinStudio(profil: Pick<ProfilEinstellungen, 'studio'>): Studio | undefined {
  return findeStudio(profil.studio === undefined ? STANDARD_STUDIO_ID : profil.studio);
}

export function gibtEsImStudio(uebung: Uebung, studio: Studio): boolean {
  return uebung.eigene ? (uebung.studios ?? []).includes(studio.id) : studio.uebungen.has(uebung.id);
}

/** Setzt oder entfernt ein Studio in der Liste einer eigenen Übung (andere Studios bleiben erhalten). */
export function setzeStudio(studios: readonly string[] | undefined, studioId: string, vorhanden: boolean): string[] {
  const ohne = (studios ?? []).filter((s) => s !== studioId);
  return vorhanden ? [...ohne, studioId] : ohne;
}
