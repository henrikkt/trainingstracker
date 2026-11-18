import { e1rm, zaehlendeSaetze } from './kennzahlen.ts';
import type { KoerpergewichtEintrag, Training } from './typen.ts';

/** Lokaler Kalendertag als "YYYY-MM-DD" (nicht UTC – ein Training um 23:30 gehört zum selben Abend). */
export function tagesSchluessel(datum: Date): string {
  return `${datum.getFullYear()}-${String(datum.getMonth() + 1).padStart(2, '0')}-${String(datum.getDate()).padStart(2, '0')}`;
}

/** Abgeschlossene Trainings gruppiert nach lokalem Kalendertag. */
export function trainingsNachTag(trainings: readonly Training[]): Map<string, Training[]> {
  const tage = new Map<string, Training[]>();
  for (const t of trainings) {
    if (!t.ende) continue;
    const tag = tagesSchluessel(new Date(t.start));
    tage.set(tag, [...(tage.get(tag) ?? []), t]);
  }
  return tage;
}

/**
 * Wochen eines Monats für die Kalenderansicht (Montag zuerst), inklusive der angrenzenden Tage
 * aus Vor- und Folgemonat, damit jede Woche 7 Tage hat. `monat` ist 0-basiert (0 = Januar).
 */
export function kalenderWochen(jahr: number, monat: number): Date[][] {
  const erster = new Date(jahr, monat, 1);
  const start = new Date(jahr, monat, 1 - ((erster.getDay() + 6) % 7));
  const letzter = new Date(jahr, monat + 1, 0);
  const wochen: Date[][] = [];
  for (let tag = start; tag <= letzter || wochen.at(-1)?.length !== 7; ) {
    if (!wochen.length || wochen.at(-1)!.length === 7) wochen.push([]);
    wochen.at(-1)!.push(tag);
    tag = new Date(tag.getFullYear(), tag.getMonth(), tag.getDate() + 1);
  }
  return wochen;
}

/** Montag 00:00 (lokal) der Woche, in der `datum` liegt. */
export function wochenStart(datum: Date): Date {
  return new Date(datum.getFullYear(), datum.getMonth(), datum.getDate() - ((datum.getDay() + 6) % 7));
}

export interface UebungsStatistik {
  uebungId: string;
  /** Anzahl Trainings mit dieser Übung */
  einheiten: number;
  /** Start des letzten Trainings (ISO) */
  zuletzt: string;
  bestesE1rm: number;
}

/** Alle Übungen mit Verlauf, zuletzt trainierte zuerst. */
export function uebungsUebersicht(trainings: readonly Training[]): UebungsStatistik[] {
  const stats = new Map<string, UebungsStatistik>();
  for (const t of trainings) {
    if (!t.ende) continue;
    const gesehen = new Set<string>();
    for (const ue of t.uebungen) {
      const saetze = zaehlendeSaetze(ue.saetze);
      if (saetze.length === 0) continue;
      const s = stats.get(ue.uebungId) ?? { uebungId: ue.uebungId, einheiten: 0, zuletzt: t.start, bestesE1rm: 0 };
      if (!gesehen.has(ue.uebungId)) s.einheiten++;
      gesehen.add(ue.uebungId);
      if (t.start > s.zuletzt) s.zuletzt = t.start;
      s.bestesE1rm = Math.max(s.bestesE1rm, ...saetze.map((x) => e1rm(x.gewicht, x.wdh)));
      stats.set(ue.uebungId, s);
    }
  }
  return [...stats.values()].sort((a, b) => b.zuletzt.localeCompare(a.zuletzt));
}

/** Körpergewicht chronologisch mit Veränderung zum vorherigen Eintrag. */
export function koerpergewichtVerlauf(eintraege: readonly KoerpergewichtEintrag[]): (KoerpergewichtEintrag & { differenz: number | null })[] {
  const sortiert = [...eintraege].sort((a, b) => a.datum.localeCompare(b.datum));
  return sortiert.map((e, i) => ({ ...e, differenz: i === 0 ? null : Math.round((e.kg - sortiert[i - 1]!.kg) * 10) / 10 }));
}
