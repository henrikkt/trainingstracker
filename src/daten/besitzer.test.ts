import { describe, expect, it } from 'vitest';
import { entscheideBesitzer } from './besitzer.ts';

describe('Besitzer der lokalen Daten', () => {
  it('gleiches Konto: nichts tun', () => {
    expect(entscheideBesitzer('a', 'a', 5)).toBe('gleich');
  });
  it('erstes Konto übernimmt die lokalen Daten (auch ausstehende)', () => {
    expect(entscheideBesitzer(undefined, 'a', 5)).toBe('uebernehmen');
  });
  it('anderes Konto: wechseln nur, wenn nichts mehr aussteht', () => {
    expect(entscheideBesitzer('a', 'b', 0)).toBe('wechseln');
    expect(entscheideBesitzer('a', 'b', 1)).toBe('blockiert');
  });
});
