import { describe, expect, it } from 'vitest';
import {
  anzahlErledigterSaetze,
  e1rm,
  isoWoche,
  topSatz,
  trainingsDauerMinuten,
  trainingsVolumen,
  verlaufFuerUebung,
  wochenVolumenProMuskelgruppe,
} from './kennzahlen.ts';
import { s, training } from './testhilfen.ts';

describe('e1RM (Epley)', () => {
  it('rechnet Gewicht × (1 + Wdh/30)', () => {
    expect(e1rm(100, 10)).toBeCloseTo(133.33, 2);
    expect(e1rm(80, 8)).toBeCloseTo(101.33, 2);
  });
  it('ist bei 1 Wdh. das Gewicht selbst', () => {
    expect(e1rm(140, 1)).toBe(140);
  });
  it('ist 0 ohne Gewicht oder Wiederholungen', () => {
    expect(e1rm(0, 12)).toBe(0);
    expect(e1rm(100, 0)).toBe(0);
  });
});

describe('Volumen und Dauer', () => {
  const t = training('2026-11-16', {
    kniebeuge: [s(100, 5), s(100, 5), s(100, 4), s(100, 5, false)],
    klimmzuege: [s(0, 10), s(0, 8)],
  });

  it('zählt nur erledigte Sätze', () => {
    expect(trainingsVolumen(t)).toBe(1400);
    expect(anzahlErledigterSaetze(t)).toBe(5);
  });

  it('berechnet die Dauer in Minuten, laufend bis jetzt', () => {
    expect(trainingsDauerMinuten(t)).toBe(60);
    const laufend = { ...t, ende: undefined };
    expect(trainingsDauerMinuten(laufend, new Date(Date.parse(t.start) + 25 * 60_000))).toBe(25);
  });
});

describe('Top-Satz', () => {
  it('wählt den Satz mit dem höchsten e1RM', () => {
    expect(topSatz([s(100, 5), s(90, 10), s(105, 1)])).toMatchObject({ gewicht: 90, wdh: 10 });
  });
  it('ignoriert nicht erledigte Sätze', () => {
    expect(topSatz([s(200, 5, false), s(100, 5)])).toMatchObject({ gewicht: 100 });
    expect(topSatz([s(200, 5, false)])).toBeUndefined();
  });
});

describe('Verlauf pro Übung', () => {
  it('liefert pro Training e1RM, Top-Satz und Volumen, chronologisch', () => {
    const verlauf = verlaufFuerUebung(
      [
        training('2026-11-12', { kniebeuge: [s(105, 5), s(105, 5)] }),
        training('2026-11-05', { kniebeuge: [s(100, 5), s(100, 5)] }),
        training('2026-11-08', { bankdruecken_lh: [s(80, 8)] }),
      ],
      'kniebeuge',
    );
    expect(verlauf).toHaveLength(2);
    expect(verlauf[0]).toMatchObject({ topSatz: { gewicht: 100, wdh: 5 }, volumen: 1000, saetze: 2 });
    expect(verlauf[1]!.e1rm).toBeCloseTo(122.5, 5);
  });
});

describe('ISO-Kalenderwoche', () => {
  it('berechnet Wochen inkl. Jahreswechsel', () => {
    expect(isoWoche(new Date(2026, 10, 18))).toBe('2026-W47');
    expect(isoWoche(new Date(2026, 0, 1))).toBe('2026-W01'); // Donnerstag
    expect(isoWoche(new Date(2027, 0, 1))).toBe('2026-W53'); // Freitag → noch KW 53
    expect(isoWoche(new Date(2024, 11, 30))).toBe('2025-W01'); // Montag → schon KW 1 von 2025
  });
  it('Montag und Sonntag liegen in derselben Woche', () => {
    expect(isoWoche(new Date(2026, 10, 16))).toBe(isoWoche(new Date(2026, 10, 22)));
    expect(isoWoche(new Date(2026, 10, 23))).toBe('2026-W48');
  });
});

describe('Wochen-Volumen pro Muskelgruppe', () => {
  it('zählt Hauptmuskel voll, Nebenmuskeln halb; Volumen nur beim Hauptmuskel', () => {
    const woche = wochenVolumenProMuskelgruppe([
      training('2026-11-16', { 'bankdruecken-lh': [s(80, 8), s(80, 8), s(80, 8)] }),
      training('2026-11-19', { 'enges-bankdruecken': [s(60, 10), s(60, 10)], unbekannt: [s(10, 10)] }),
      training('2026-11-24', { 'bankdruecken-lh': [s(80, 8)] }),
    ]);
    const w47 = woche.get('2026-W47')!;
    expect(w47.brust).toEqual({ saetze: 3 + 1, volumen: 1920 });
    expect(w47.trizeps).toEqual({ saetze: 1.5 + 2, volumen: 1200 });
    expect(w47.schultern.saetze).toBe(1.5 + 1);
    expect(woche.get('2026-W48')!.brust.saetze).toBe(1);
  });
});
