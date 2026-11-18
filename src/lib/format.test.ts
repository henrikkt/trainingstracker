import { describe, expect, it } from 'vitest';
import { formatiereGewicht } from './format.ts';

describe('formatiereGewicht', () => {
  it('nutzt das deutsche Dezimalkomma', () => {
    expect(formatiereGewicht(82.5)).toBe('82,5 kg');
    expect(formatiereGewicht(1.25)).toBe('1,25 kg');
  });

  it('lässt ganze Zahlen ohne Nachkommastellen', () => {
    expect(formatiereGewicht(80)).toBe('80 kg');
  });
});
