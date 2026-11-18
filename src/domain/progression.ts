import { formatiereGewicht } from '../lib/format.ts';
import { zaehlendeSaetze } from './kennzahlen.ts';
import type { Satz, Steigerung, UebungsZiel } from './typen.ts';

/**
 * Progressive Overload – Vorschlag fürs nächste Training einer Übung.
 *
 * Betrachtet werden die Arbeitssätze mit dem höchsten Gewicht des letzten Trainings („Arbeitsgewicht“).
 * Regeln, der Reihe nach:
 *  1. Kein Verlauf → Zielwerte aus der Vorlage, Gewicht leer („erstes-mal“).
 *  2. Gewichts-Übung: Mindestens so viele Sätze wie geplant mit dem Arbeitsgewicht und alle am oberen Ende
 *     des Wiederholungsbereichs → Gewicht + Steigerung, Ziel = unteres Ende („steigern“).
 *  3. Gewichts-Übung: In den letzten zwei Trainings mit demselben Arbeitsgewicht hat kein Satz das untere Ende
 *     erreicht → Deload um 10 %, abgerundet auf die Schrittweite („deload“).
 *  4. Sonst: Gewicht halten, pro Satz +1 Wdh. (mindestens unteres, höchstens oberes Ende) („wdh-steigern“).
 *  Körpergewicht-Übungen (Steigerung in Wiederholungen): immer +n Wdh. pro Satz, auch über das obere Ende hinaus;
 *  ist es erreicht, wird Zusatzgewicht empfohlen („wdh-steigern“).
 */

export type VorschlagsRegel = 'erstes-mal' | 'steigern' | 'deload' | 'wdh-steigern';

export interface Vorschlag {
  /** null = kein Vorschlag fürs Gewicht (erstes Mal) */
  gewicht: number | null;
  /** Ziel-Wiederholungen pro Satz (Länge = geplante Sätze) */
  wdh: number[];
  regel: VorschlagsRegel;
  /** Nachvollziehbare Begründung für die Anzeige */
  begruendung: string;
}

export interface ProgressionsEingabe {
  /** Sätze der Übung aus den bisherigen Trainings, neuestes Training zuerst. Nicht erledigte Sätze werden ignoriert. */
  verlauf: readonly (readonly Satz[])[];
  ziel: UebungsZiel;
  steigerung: Steigerung;
}

export const DELOAD_FAKTOR = 0.9;

/** Rundet auf ein Vielfaches der Schrittweite ab (kleinste sinnvolle Abstufung höchstens 2,5 kg). */
export function rundeAb(kg: number, schritt: number): number {
  const s = Math.min(schritt, 2.5);
  if (s <= 0) return kg;
  return Math.round(Math.floor(kg / s + 1e-9) * s * 100) / 100;
}

interface ArbeitsSaetze {
  gewicht: number;
  wdh: number[];
}

/** Arbeitssätze = erledigte Sätze mit dem höchsten Gewicht des Trainings. */
function arbeitsSaetze(saetze: readonly Satz[]): ArbeitsSaetze | undefined {
  const erledigt = zaehlendeSaetze(saetze);
  if (erledigt.length === 0) return undefined;
  const gewicht = Math.max(...erledigt.map((s) => s.gewicht));
  return { gewicht, wdh: erledigt.filter((s) => s.gewicht === gewicht).map((s) => s.wdh) };
}

const wdhText = (n: number) => `${n} Wdh.`;

export function vorschlagFuerNaechstesMal({ verlauf, ziel, steigerung }: ProgressionsEingabe): Vorschlag {
  const { min, max } = ziel.wdh;
  const trainings = verlauf.map(arbeitsSaetze).filter((x): x is ArbeitsSaetze => x !== undefined);
  const letztes = trainings[0];

  if (!letztes) {
    return {
      gewicht: null,
      wdh: Array<number>(ziel.saetze).fill(min),
      regel: 'erstes-mal',
      begruendung: `Erstes Mal: Wähle ein Gewicht, das du sauber ${min}–${max}-mal schaffst.`,
    };
  }

  const plusEins = (anzahl: number, obergrenze: number | null) =>
    Array.from({ length: ziel.saetze }, (_, i) => {
      const vorher = letztes.wdh[i];
      if (vorher === undefined) return min;
      const neu = Math.max(vorher + anzahl, min);
      return obergrenze === null ? neu : Math.min(neu, obergrenze);
    });

  if (steigerung.art === 'wdh') {
    const amOberenEnde = letztes.wdh.length >= ziel.saetze && letztes.wdh.every((w) => w >= max);
    return {
      gewicht: letztes.gewicht,
      wdh: plusEins(steigerung.anzahl, null),
      regel: 'wdh-steigern',
      begruendung: amOberenEnde
        ? `Alle Sätze mit ${wdhText(max)} oder mehr geschafft → weiter +${steigerung.anzahl} Wdh. pro Satz oder Zusatzgewicht nehmen.`
        : `+${steigerung.anzahl} Wdh. pro Satz gegenüber dem letzten Mal.`,
    };
  }

  const anzahl = letztes.wdh.length;
  if (anzahl >= ziel.saetze && letztes.wdh.every((w) => w >= max)) {
    const neu = Math.round((letztes.gewicht + steigerung.kg) * 100) / 100;
    return {
      gewicht: neu,
      wdh: Array<number>(ziel.saetze).fill(min),
      regel: 'steigern',
      begruendung: `Alle ${anzahl} Sätze mit ${wdhText(max)} bei ${formatiereGewicht(letztes.gewicht)} geschafft → +${formatiereGewicht(steigerung.kg)}, Ziel wieder ${wdhText(min)}`,
    };
  }

  const vorletztes = trainings[1];
  const unterGrenze = (t: ArbeitsSaetze) => t.wdh.every((w) => w < min);
  if (vorletztes && vorletztes.gewicht === letztes.gewicht && unterGrenze(letztes) && unterGrenze(vorletztes) && letztes.gewicht > 0) {
    const neu = rundeAb(letztes.gewicht * DELOAD_FAKTOR, steigerung.kg);
    return {
      gewicht: neu,
      wdh: Array<number>(ziel.saetze).fill(min),
      regel: 'deload',
      begruendung: `Zweimal in Folge unter ${wdhText(min)} bei ${formatiereGewicht(letztes.gewicht)} → Deload auf ${formatiereGewicht(neu)} (−10 %), Ziel ${wdhText(min)}`,
    };
  }

  const fehlend = anzahl < ziel.saetze ? ` (zuletzt nur ${anzahl} von ${ziel.saetze} Sätzen)` : '';
  return {
    gewicht: letztes.gewicht,
    wdh: plusEins(1, max),
    regel: 'wdh-steigern',
    begruendung: `Noch nicht alle Sätze bei ${wdhText(max)}${fehlend} → ${formatiereGewicht(letztes.gewicht)} halten, +1 Wdh. pro Satz.`,
  };
}
