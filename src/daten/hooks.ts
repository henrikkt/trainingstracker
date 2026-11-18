import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { STANDARD_PROFIL } from '../domain/einstellungen.ts';
import { findeUebung, KATALOG } from '../domain/katalog.ts';
import type { KoerpergewichtEintrag, ProfilEinstellungen, Training, Uebung, UebungsEinstellung, Vorlage } from '../domain/typen.ts';
import { db } from './db.ts';
import { alleTrainings, istAktiv, leseProfil, ohneMeta } from './repo.ts';

/** Reaktive Lesezugriffe: Komponenten aktualisieren sich automatisch bei jeder Änderung in IndexedDB. */

const sortiereNachName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name, 'de', { numeric: true });

export function useVorlagen(): Vorlage[] | undefined {
  return useLiveQuery(async () => (await db.vorlagen.toArray()).filter(istAktiv).map((v) => ohneMeta<Vorlage>(v)).sort(sortiereNachName));
}

/** undefined = lädt noch, null = gibt es nicht (mehr) */
export function useVorlage(id: string | undefined): Vorlage | null | undefined {
  return useLiveQuery(async () => {
    const v = id ? await db.vorlagen.get(id) : undefined;
    return v && istAktiv(v) ? ohneMeta<Vorlage>(v) : null;
  }, [id]);
}

export function useEigeneUebungen(): Uebung[] | undefined {
  return useLiveQuery(async () => (await db.eigeneUebungen.toArray()).filter(istAktiv).map((u) => ohneMeta<Uebung>(u)));
}

/** Katalog + eigene Übungen, alphabetisch. Solange die eigenen laden: nur Katalog. */
export function useAlleUebungen(): Uebung[] {
  const eigene = useEigeneUebungen() ?? [];
  return [...KATALOG, ...eigene].sort(sortiereNachName);
}

export function useUebungsEinstellung(uebungId: string | undefined): UebungsEinstellung | undefined {
  return useLiveQuery(async () => {
    const e = uebungId ? await db.uebungsEinstellungen.get(uebungId) : undefined;
    return e && istAktiv(e) ? ohneMeta<UebungsEinstellung>(e) : undefined;
  }, [uebungId]);
}

export function useAlleUebungsEinstellungen(): Map<string, UebungsEinstellung> {
  const liste = useLiveQuery(async () => (await db.uebungsEinstellungen.toArray()).filter(istAktiv).map((e) => ohneMeta<UebungsEinstellung>(e)));
  return new Map((liste ?? []).map((e) => [e.uebungId, e]));
}

/** Alle nicht gelöschten Trainings (inkl. laufendem), neueste zuerst. undefined = lädt noch. */
export function useTrainings(): Training[] | undefined {
  return useLiveQuery(async () => (await alleTrainings()).sort((a, b) => b.start.localeCompare(a.start)));
}

/** undefined = lädt noch, null = gibt es nicht (mehr) */
export function useTraining(id: string | undefined): Training | null | undefined {
  return useLiveQuery(async () => {
    const t = id ? await db.trainings.get(id) : undefined;
    return t && istAktiv(t) ? ohneMeta<Training>(t) : null;
  }, [id]);
}

/**
 * Nachschlagen von Übungen für Anzeige und Statistik – inklusive gelöschter eigener Übungen,
 * damit alte Trainings ihre Übungsnamen behalten.
 */
export function useUebungsNachschlag(): (id: string) => Uebung | undefined {
  const alleEigenen = useLiveQuery(async () => (await db.eigeneUebungen.toArray()).map((u) => ohneMeta<Uebung>(u)));
  return useMemo(() => (id: string) => findeUebung(id, alleEigenen ?? []), [alleEigenen]);
}

/** Körpergewicht-Einträge (unsortiert). undefined = lädt noch. */
export function useKoerpergewicht(): KoerpergewichtEintrag[] | undefined {
  return useLiveQuery(async () => (await db.koerpergewicht.toArray()).filter(istAktiv).map((e) => ohneMeta<KoerpergewichtEintrag>(e)));
}

export function useProfil(): ProfilEinstellungen {
  return useLiveQuery(leseProfil) ?? STANDARD_PROFIL;
}
