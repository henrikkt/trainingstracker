import type { Satz, Training, TrainingsUebung } from './typen.ts';

/** Kurzschreibweise für Tests: s(80, 8) = erledigter Satz 80 kg × 8. */
export function s(gewicht: number, wdh: number, erledigt = true): Satz {
  return { gewicht, wdh, erledigt };
}

let zaehler = 0;

/** Training an einem Datum (YYYY-MM-DD, 18:00 lokale Zeit) mit Übungen. */
export function training(datum: string, uebungen: Record<string, Satz[]>, id = `t${++zaehler}`): Training {
  const [j, m, t] = datum.split('-').map(Number) as [number, number, number];
  const start = new Date(j, m - 1, t, 18, 0);
  const ende = new Date(start.getTime() + 60 * 60_000);
  const liste: TrainingsUebung[] = Object.entries(uebungen).map(([uebungId, saetze]) => ({ uebungId, saetze }));
  return { id, start: start.toISOString(), ende: ende.toISOString(), uebungen: liste };
}
