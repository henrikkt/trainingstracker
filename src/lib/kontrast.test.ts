import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { kontrast } from './kontrast.ts';

/** Liest die Tokens direkt aus index.css, damit Test und Design nicht auseinanderlaufen. */
const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8');
function token(name: string): string {
  const m = new RegExp(`--color-${name}:\\s*(#[0-9a-f]{6})`, 'i').exec(css);
  if (!m?.[1]) throw new Error(`Token --color-${name} fehlt`);
  return m[1];
}

const AA = 4.5;

describe('Farbkontraste (WCAG AA)', () => {
  it('berechnet bekannte Werte korrekt', () => {
    expect(kontrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(kontrast('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
  });

  const paare: [vordergrund: string, hintergrund: string][] = [
    ['text', 'grund'],
    ['text', 'flaeche'],
    ['text', 'flaeche-hoch'],
    ['text-leise', 'grund'],
    ['text-leise', 'flaeche'],
    ['text-leise', 'flaeche-hoch'],
    ['akzent', 'grund'],
    ['akzent', 'flaeche'],
    ['akzent-text', 'akzent'],
    ['rekord', 'grund'],
    ['rekord', 'flaeche'],
    ['fehler', 'grund'],
    ['fehler', 'flaeche'],
  ];

  it.each(paare)('%s auf %s erreicht mindestens 4,5 : 1', (vg, hg) => {
    expect(kontrast(token(vg), token(hg))).toBeGreaterThanOrEqual(AA);
  });
});
