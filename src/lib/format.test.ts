import { describe, expect, it } from 'vitest';
import { formatiereDatum, formatiereDauer, formatiereGewicht, formatiereUhr, formatiereVolumen, formatiereZahl, parseZahl, runde2 } from './format.ts';

describe('formatiereGewicht', () => {
  it('nutzt das deutsche Dezimalkomma', () => {
    expect(formatiereGewicht(82.5)).toBe('82,5 kg');
    expect(formatiereGewicht(1.25)).toBe('1,25 kg');
  });

  it('lässt ganze Zahlen ohne Nachkommastellen', () => {
    expect(formatiereGewicht(80)).toBe('80 kg');
    expect(formatiereZahl(1000)).toBe('1.000');
  });
});

describe('parseZahl', () => {
  it('akzeptiert Komma und Punkt', () => {
    expect(parseZahl('82,5')).toBe(82.5);
    expect(parseZahl('82.5')).toBe(82.5);
    expect(parseZahl(' 80 ')).toBe(80);
    expect(parseZahl(',5')).toBe(0.5);
  });

  it('lehnt Ungültiges ab', () => {
    expect(parseZahl('')).toBeNull();
    expect(parseZahl('abc')).toBeNull();
    expect(parseZahl('1,2,3')).toBeNull();
    expect(parseZahl('80kg')).toBeNull();
  });
});

describe('Datum, Dauer, Uhr, Volumen', () => {
  it('formatiert Datum mit Wochentag in lokaler Zeit', () => {
    expect(formatiereDatum(new Date(2026, 10, 18, 18, 30).toISOString())).toBe('Mi., 18.11.2026');
  });
  it('formatiert Dauer', () => {
    expect(formatiereDauer(52)).toBe('52 min');
    expect(formatiereDauer(65)).toBe('1:05 h');
  });
  it('formatiert Stoppuhr', () => {
    expect(formatiereUhr(5)).toBe('0:05');
    expect(formatiereUhr(245)).toBe('4:05');
    expect(formatiereUhr(3723)).toBe('1:02:03');
    expect(formatiereUhr(-3)).toBe('0:00');
  });
  it('formatiert Volumen gerundet mit Tausenderpunkt', () => {
    expect(formatiereVolumen(4320.5)).toBe('4.321 kg');
  });
});

describe('runde2', () => {
  it('entfernt Gleitkomma-Reste', () => {
    expect(runde2(0.1 + 0.2)).toBe(0.3);
    expect(runde2(80 + 1.25 + 1.25)).toBe(82.5);
  });
});
