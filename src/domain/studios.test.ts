import { describe, expect, it } from 'vitest';
import { findeUebung } from './katalog.ts';
import { findeStudio, gibtEsImStudio, meinStudio, setzeStudio, STANDARD_STUDIO_ID } from './studios.ts';
import type { Uebung } from './typen.ts';

const kraftkultur = findeStudio('kraftkultur')!;
const eigene = (studios?: string[]): Uebung => ({ id: 'x', name: 'Landmine Press', muskel: 'schultern', nebenMuskeln: [], geraet: 'langhantel', eigene: true, studios });

describe('meinStudio', () => {
  it('ohne Angabe im Profil: Standard-Studio', () => {
    expect(meinStudio({})?.id).toBe(STANDARD_STUDIO_ID);
  });
  it('null = kein Studio, unbekannte ID = kein Studio', () => {
    expect(meinStudio({ studio: null })).toBeUndefined();
    expect(meinStudio({ studio: 'gibts-nicht' })).toBeUndefined();
  });
});

describe('gibtEsImStudio', () => {
  it('Katalog-Übungen laut Studio-Liste', () => {
    expect(gibtEsImStudio(findeUebung('kniebeuge')!, kraftkultur)).toBe(true);
    expect(gibtEsImStudio(findeUebung('brustpresse')!, kraftkultur)).toBe(false);
  });
  it('eigene Übungen laut eigener Studio-Angabe', () => {
    expect(gibtEsImStudio(eigene(['kraftkultur']), kraftkultur)).toBe(true);
    expect(gibtEsImStudio(eigene(), kraftkultur)).toBe(false);
  });
});

describe('setzeStudio', () => {
  it('fügt hinzu bzw. entfernt, ohne andere Studios anzufassen und ohne Doppelte', () => {
    expect(setzeStudio(undefined, 'kraftkultur', true)).toEqual(['kraftkultur']);
    expect(setzeStudio(['anderes', 'kraftkultur'], 'kraftkultur', true)).toEqual(['anderes', 'kraftkultur']);
    expect(setzeStudio(['anderes', 'kraftkultur'], 'kraftkultur', false)).toEqual(['anderes']);
  });
});
