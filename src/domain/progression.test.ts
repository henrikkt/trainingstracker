import { describe, expect, it } from 'vitest';
import { rundeAb, vorschlagFuerNaechstesMal, type ProgressionsEingabe } from './progression.ts';
import { s } from './testhilfen.ts';
import type { Satz } from './typen.ts';

const ziel = { saetze: 3, wdh: { min: 8, max: 12 } };
const gewicht = (kg: number) => ({ art: 'gewicht' as const, kg });

function vorschlag(verlauf: Satz[][], extra: Partial<ProgressionsEingabe> = {}) {
  return vorschlagFuerNaechstesMal({ verlauf, ziel, steigerung: gewicht(2.5), ...extra });
}

describe('Regel 1: erstes Mal', () => {
  it('ohne Verlauf: kein Gewicht, unteres Ende als Ziel', () => {
    const v = vorschlag([]);
    expect(v).toMatchObject({ gewicht: null, wdh: [8, 8, 8], regel: 'erstes-mal' });
    expect(v.begruendung).toContain('8–12');
  });

  it('nur nicht erledigte Sätze zählen nicht als Verlauf', () => {
    expect(vorschlag([[s(80, 10, false)]]).regel).toBe('erstes-mal');
  });
});

describe('Regel 2: Gewicht steigern', () => {
  it('alle Sätze am oberen Ende → +Steigerung, Ziel unteres Ende', () => {
    const v = vorschlag([[s(80, 12), s(80, 12), s(80, 12)]]);
    expect(v).toMatchObject({ gewicht: 82.5, wdh: [8, 8, 8], regel: 'steigern' });
    expect(v.begruendung).toBe('Alle 3 Sätze mit 12 Wdh. bei 80 kg geschafft → +2,5 kg, Ziel wieder 8 Wdh.');
  });

  it('nutzt die übungsspezifische Steigerung', () => {
    expect(vorschlag([[s(100, 12), s(100, 13), s(100, 12)]], { steigerung: gewicht(5) }).gewicht).toBe(105);
    expect(vorschlag([[s(20, 12), s(20, 12), s(20, 12)]], { steigerung: gewicht(2) }).gewicht).toBe(22);
  });

  it('nicht, wenn weniger Sätze als geplant geschafft wurden', () => {
    const v = vorschlag([[s(80, 12), s(80, 12)]]);
    expect(v.regel).toBe('wdh-steigern');
    expect(v.begruendung).toContain('zuletzt nur 2 von 3 Sätzen');
  });

  it('bewertet nur die Sätze mit dem Arbeitsgewicht (Aufwärmsätze egal)', () => {
    const v = vorschlag([[s(40, 5), s(60, 3), s(80, 12), s(80, 12), s(80, 12)]]);
    expect(v).toMatchObject({ gewicht: 82.5, regel: 'steigern' });
  });
});

describe('Regel 3: Deload', () => {
  it('zweimal in Folge unter dem unteren Ende beim selben Gewicht → −10 %, abgerundet', () => {
    const v = vorschlag([
      [s(100, 7), s(100, 6), s(100, 5)],
      [s(100, 7), s(100, 7), s(100, 6)],
    ]);
    expect(v).toMatchObject({ gewicht: 90, wdh: [8, 8, 8], regel: 'deload' });
    expect(v.begruendung).toContain('Deload auf 90 kg');
  });

  it('rundet auf die Schrittweite ab', () => {
    const v = vorschlag(
      [
        [s(85, 5), s(85, 5), s(85, 4)],
        [s(85, 6), s(85, 5), s(85, 5)],
      ],
      { steigerung: gewicht(5) },
    );
    expect(v.gewicht).toBe(75); // 76,5 → 75 (Schritt 2,5)
  });

  it('nicht nach nur einem schlechten Training oder bei anderem Gewicht', () => {
    expect(vorschlag([[s(100, 6), s(100, 6), s(100, 6)]]).regel).toBe('wdh-steigern');
    expect(
      vorschlag([
        [s(100, 6), s(100, 6), s(100, 6)],
        [s(97.5, 6), s(97.5, 6), s(97.5, 6)],
      ]).regel,
    ).toBe('wdh-steigern');
  });

  it('nicht, wenn ein Satz das untere Ende erreicht hat', () => {
    expect(
      vorschlag([
        [s(100, 8), s(100, 6), s(100, 5)],
        [s(100, 7), s(100, 6), s(100, 6)],
      ]).regel,
    ).toBe('wdh-steigern');
  });
});

describe('Regel 4: Wiederholungen steigern', () => {
  it('Gewicht halten, +1 Wdh. pro Satz, begrenzt auf den Bereich', () => {
    const v = vorschlag([[s(80, 12), s(80, 10), s(80, 6)]]);
    expect(v).toMatchObject({ gewicht: 80, wdh: [12, 11, 8], regel: 'wdh-steigern' });
    expect(v.begruendung).toBe('Noch nicht alle Sätze bei 12 Wdh. → 80 kg halten, +1 Wdh. pro Satz.');
  });

  it('fehlende Sätze bekommen das untere Ende', () => {
    expect(vorschlag([[s(80, 9)]]).wdh).toEqual([10, 8, 8]);
  });
});

describe('Körpergewicht-Übungen', () => {
  const wdh = { art: 'wdh' as const, anzahl: 1 };

  it('+1 Wdh. pro Satz, Gewicht (Zusatzgewicht) bleibt', () => {
    const v = vorschlag([[s(0, 8), s(0, 7), s(0, 6)]], { steigerung: wdh });
    expect(v).toMatchObject({ gewicht: 0, wdh: [9, 8, 8], regel: 'wdh-steigern' });
  });

  it('über das obere Ende hinaus, mit Hinweis auf Zusatzgewicht', () => {
    const v = vorschlag([[s(0, 12), s(0, 12), s(0, 13)]], { steigerung: wdh });
    expect(v.wdh).toEqual([13, 13, 14]);
    expect(v.begruendung).toContain('Zusatzgewicht');
  });
});

describe('rundeAb', () => {
  it('rundet auf Vielfache der Schrittweite (max. 2,5) ab', () => {
    expect(rundeAb(76.5, 5)).toBe(75);
    expect(rundeAb(18.9, 2)).toBe(18);
    expect(rundeAb(22.5, 2.5)).toBe(22.5);
    expect(rundeAb(31.4, 1.25)).toBe(31.25);
    expect(rundeAb(30.9, 1.25)).toBe(30);
  });
});
