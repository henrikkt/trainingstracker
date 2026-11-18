import { findeUebung } from './katalog.ts';
import { MUSKELGRUPPEN, type Muskelgruppe, type Satz, type Training, type Uebung } from './typen.ts';

/** Geschätztes 1-Wiederholungs-Maximum nach Epley: Gewicht × (1 + Wdh/30); bei 1 Wdh. = Gewicht. */
export function e1rm(gewicht: number, wdh: number): number {
  if (gewicht <= 0 || wdh <= 0) return 0;
  if (wdh === 1) return gewicht;
  return gewicht * (1 + wdh / 30);
}

export function satzVolumen(satz: Pick<Satz, 'gewicht' | 'wdh'>): number {
  return Math.max(0, satz.gewicht) * Math.max(0, satz.wdh);
}

/** Nur abgehakte Sätze mit mindestens einer Wiederholung zählen. */
export function zaehlendeSaetze(saetze: readonly Satz[]): Satz[] {
  return saetze.filter((s) => s.erledigt && s.wdh > 0);
}

/** Gesamtvolumen (kg × Wdh.) eines Trainings. */
export function trainingsVolumen(training: Training): number {
  return training.uebungen.reduce((summe, ue) => summe + zaehlendeSaetze(ue.saetze).reduce((s, x) => s + satzVolumen(x), 0), 0);
}

export function anzahlErledigterSaetze(training: Training): number {
  return training.uebungen.reduce((n, ue) => n + zaehlendeSaetze(ue.saetze).length, 0);
}

/** Dauer in ganzen Minuten (laufendes Training: bis `jetzt`). */
export function trainingsDauerMinuten(training: Training, jetzt: Date = new Date()): number {
  const start = Date.parse(training.start);
  const ende = training.ende ? Date.parse(training.ende) : jetzt.getTime();
  return Math.max(0, Math.round((ende - start) / 60_000));
}

/** Bester Satz nach e1RM (bei Gleichstand: schwereres Gewicht). */
export function topSatz(saetze: readonly Satz[]): Satz | undefined {
  let bester: Satz | undefined;
  for (const s of zaehlendeSaetze(saetze)) {
    if (!bester) {
      bester = s;
      continue;
    }
    const a = e1rm(s.gewicht, s.wdh);
    const b = e1rm(bester.gewicht, bester.wdh);
    if (a > b || (a === b && s.gewicht > bester.gewicht) || (a === b && s.gewicht === bester.gewicht && s.wdh > bester.wdh)) bester = s;
  }
  return bester;
}

export interface VerlaufsPunkt {
  trainingId: string;
  datum: string;
  /** Bestes geschätztes 1RM des Tages */
  e1rm: number;
  topSatz: { gewicht: number; wdh: number };
  volumen: number;
  saetze: number;
}

/** Verlauf einer Übung über alle Trainings (chronologisch aufsteigend) – Grundlage für die Diagramme. */
export function verlaufFuerUebung(trainings: readonly Training[], uebungId: string): VerlaufsPunkt[] {
  const punkte: VerlaufsPunkt[] = [];
  for (const t of trainings) {
    const saetze = t.uebungen.filter((ue) => ue.uebungId === uebungId).flatMap((ue) => zaehlendeSaetze(ue.saetze));
    const top = topSatz(saetze);
    if (!top) continue;
    punkte.push({
      trainingId: t.id,
      datum: t.start,
      e1rm: Math.max(...saetze.map((s) => e1rm(s.gewicht, s.wdh))),
      topSatz: { gewicht: top.gewicht, wdh: top.wdh },
      volumen: saetze.reduce((s, x) => s + satzVolumen(x), 0),
      saetze: saetze.length,
    });
  }
  return punkte.sort((a, b) => a.datum.localeCompare(b.datum));
}

/** ISO-Kalenderwoche (Montag–Sonntag) in lokaler Zeit, z. B. "2026-W47". */
export function isoWoche(datum: Date): string {
  const d = new Date(datum.getFullYear(), datum.getMonth(), datum.getDate());
  const wochentag = (d.getDay() + 6) % 7; // Mo = 0 … So = 6
  d.setDate(d.getDate() - wochentag + 3); // Donnerstag derselben Woche bestimmt das Jahr
  const jahr = d.getFullYear();
  const ersterDonnerstag = new Date(jahr, 0, 4);
  const woche = 1 + Math.round(((d.getTime() - ersterDonnerstag.getTime()) / 86_400_000 - 3 + ((ersterDonnerstag.getDay() + 6) % 7)) / 7);
  return `${jahr}-W${String(woche).padStart(2, '0')}`;
}

export interface MuskelWoche {
  /** Arbeitssätze: Hauptmuskel zählt 1, Nebenmuskeln je 0,5 */
  saetze: number;
  /** kg × Wdh., nur dem Hauptmuskel zugerechnet */
  volumen: number;
}

/**
 * Wochen-Volumen pro Muskelgruppe: Woche → Muskelgruppe → {Sätze, Volumen}.
 * Unbekannte Übungen (z. B. gelöschte eigene) werden übersprungen.
 */
export function wochenVolumenProMuskelgruppe(
  trainings: readonly Training[],
  eigeneUebungen: readonly Uebung[] = [],
): Map<string, Record<Muskelgruppe, MuskelWoche>> {
  const ergebnis = new Map<string, Record<Muskelgruppe, MuskelWoche>>();
  for (const t of trainings) {
    const woche = isoWoche(new Date(t.start));
    let eintrag = ergebnis.get(woche);
    if (!eintrag) {
      eintrag = Object.fromEntries(MUSKELGRUPPEN.map((m) => [m, { saetze: 0, volumen: 0 }])) as Record<Muskelgruppe, MuskelWoche>;
      ergebnis.set(woche, eintrag);
    }
    for (const ue of t.uebungen) {
      const uebung = findeUebung(ue.uebungId, eigeneUebungen);
      if (!uebung) continue;
      const saetze = zaehlendeSaetze(ue.saetze);
      eintrag[uebung.muskel].saetze += saetze.length;
      eintrag[uebung.muskel].volumen += saetze.reduce((s, x) => s + satzVolumen(x), 0);
      for (const neben of uebung.nebenMuskeln) eintrag[neben].saetze += saetze.length * 0.5;
    }
  }
  return ergebnis;
}
