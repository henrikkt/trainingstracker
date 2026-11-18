import { describe, expect, it } from 'vitest';
import { fasseSaetzeZusammen } from './letztesMal.ts';
import { s } from './testhilfen.ts';

describe('Zusammenfassung „Letztes Mal“', () => {
  it('alle gleich: Sätze × Wdh. × Gewicht', () => {
    expect(fasseSaetzeZusammen([s(80, 8), s(80, 8), s(80, 8)])).toBe('3 × 8 × 80 kg');
  });
  it('gleiches Gewicht, unterschiedliche Wdh.', () => {
    expect(fasseSaetzeZusammen([s(82.5, 8), s(82.5, 8), s(82.5, 7)])).toBe('82,5 kg × 8/8/7');
  });
  it('unterschiedliche Gewichte', () => {
    expect(fasseSaetzeZusammen([s(60, 10), s(70, 8)])).toBe('60 kg × 10 · 70 kg × 8');
  });
  it('Körpergewicht ohne Zusatzgewicht', () => {
    expect(fasseSaetzeZusammen([s(0, 12), s(0, 12)])).toBe('2 × 12');
    expect(fasseSaetzeZusammen([s(0, 12), s(0, 10)])).toBe('12/10');
  });
  it('ignoriert nicht erledigte Sätze', () => {
    expect(fasseSaetzeZusammen([s(80, 8), s(80, 8, false)])).toBe('1 × 8 × 80 kg');
    expect(fasseSaetzeZusammen([])).toBe('–');
  });
});
