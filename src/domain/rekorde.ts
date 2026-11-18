import { e1rm, satzVolumen, zaehlendeSaetze } from './kennzahlen.ts';
import type { Training } from './typen.ts';

export type RekordArt = 'gewicht' | 'e1rm' | 'satzVolumen' | 'wdh';

export const REKORD_NAMEN: Record<RekordArt, string> = {
  gewicht: 'Schwerstes Gewicht',
  e1rm: 'Bestes geschätztes 1RM',
  satzVolumen: 'Bester Satz (kg × Wdh.)',
  wdh: 'Meiste Wiederholungen',
};

export interface Rekord {
  art: RekordArt;
  wert: number;
  gewicht: number;
  wdh: number;
  datum: string;
  trainingId: string;
}

export type Rekorde = Partial<Record<RekordArt, Rekord>>;

function wertFuer(art: RekordArt, gewicht: number, wdh: number): number {
  switch (art) {
    case 'gewicht':
      return gewicht;
    case 'e1rm':
      return e1rm(gewicht, wdh);
    case 'satzVolumen':
      return satzVolumen({ gewicht, wdh });
    case 'wdh':
      return wdh;
  }
}

/**
 * Persönliche Rekorde einer Übung. Bei Gleichstand zählt der frühere Satz (der Rekord wurde dort aufgestellt).
 * „Meiste Wiederholungen“ gilt nur für Sätze ohne Gewicht (Körpergewicht); sonst wäre es bei leichten Sätzen bedeutungslos.
 */
export function rekordeFuerUebung(trainings: readonly Training[], uebungId: string): Rekorde {
  const rekorde: Rekorde = {};
  const chronologisch = [...trainings].sort((a, b) => a.start.localeCompare(b.start));
  for (const t of chronologisch) {
    for (const ue of t.uebungen) {
      if (ue.uebungId !== uebungId) continue;
      for (const s of zaehlendeSaetze(ue.saetze)) {
        const arten: RekordArt[] = s.gewicht > 0 ? ['gewicht', 'e1rm', 'satzVolumen'] : ['wdh'];
        for (const art of arten) {
          const wert = wertFuer(art, s.gewicht, s.wdh);
          const bisher = rekorde[art];
          if (!bisher || wert > bisher.wert) {
            rekorde[art] = { art, wert, gewicht: s.gewicht, wdh: s.wdh, datum: t.start, trainingId: t.id };
          }
        }
      }
    }
  }
  return rekorde;
}

export interface NeuerRekord {
  uebungId: string;
  rekord: Rekord;
  vorher: Rekord;
}

/**
 * Neue Rekorde eines Trainings im Vergleich zu allen früheren Trainings.
 * Übungen, die zum ersten Mal gemacht werden, zählen nicht – sonst wäre jedes erste Training voller „Rekorde“.
 */
export function neueRekorde(training: Training, frueher: readonly Training[]): NeuerRekord[] {
  const vorherige = frueher.filter((t) => t.id !== training.id && t.start < training.start);
  const ergebnis: NeuerRekord[] = [];
  const uebungIds = [...new Set(training.uebungen.map((ue) => ue.uebungId))];
  for (const id of uebungIds) {
    const alt = rekordeFuerUebung(vorherige, id);
    const neu = rekordeFuerUebung([...vorherige, training], id);
    for (const art of Object.keys(neu) as RekordArt[]) {
      const n = neu[art];
      const a = alt[art];
      if (n && a && n.trainingId === training.id && n.wert > a.wert) ergebnis.push({ uebungId: id, rekord: n, vorher: a });
    }
  }
  return ergebnis;
}
