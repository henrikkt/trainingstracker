import { describe, expect, it } from 'vitest';
import { scrollZiel } from './scrollen.ts';

const frei = { oben: 80, unten: 844 - 176 };

describe('scrollZiel', () => {
  it('ab dem zweiten Satz immer nur den Satz', () => {
    expect(scrollZiel(false, 0, 100, frei)).toBe('satz');
  });
  it('erster Satz: ganze Karte, wenn Karte bis Editor-Ende in den freien Bereich passt', () => {
    expect(scrollZiel(true, 900, 900 + 580, frei)).toBe('karte');
  });
  it('erster Satz: nur der Satz, wenn die Karte zu hoch ist (kleines Handy)', () => {
    expect(scrollZiel(true, 900, 900 + 600, { oben: 80, unten: 667 - 176 })).toBe('satz');
  });
});
