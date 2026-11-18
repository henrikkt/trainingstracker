import { describe, expect, it } from 'vitest';
import { restSekunden } from './pause.ts';

describe('Pausentimer', () => {
  const p = { ende: 100_000, dauer: 90, gemeldet: false };

  it('rundet die Restzeit auf ganze Sekunden auf', () => {
    expect(restSekunden(p, 10_000)).toBe(90);
    expect(restSekunden(p, 99_001)).toBe(1);
    expect(restSekunden(p, 100_000)).toBe(0);
  });

  it('wird nie negativ (z. B. nach langer Zeit im Hintergrund)', () => {
    expect(restSekunden(p, 500_000)).toBe(0);
  });
});
