import { describe, expect, it } from 'vitest';
import { formatiereGewicht, formatiereZahl, parseZahl, runde2 } from './format.ts';

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

describe('runde2', () => {
  it('entfernt Gleitkomma-Reste', () => {
    expect(runde2(0.1 + 0.2)).toBe(0.3);
    expect(runde2(80 + 1.25 + 1.25)).toBe(82.5);
  });
});
