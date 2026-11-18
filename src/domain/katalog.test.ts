import { describe, expect, it } from 'vitest';
import { findeUebung, KATALOG, sucheUebungen, suchText, wdhBereichFuer } from './katalog.ts';
import { standardSteigerung } from './steigerung.ts';
import { GERAETE, MUSKELGRUPPEN } from './typen.ts';

describe('Übungskatalog', () => {
  it('enthält rund 70 Übungen', () => {
    expect(KATALOG.length).toBeGreaterThanOrEqual(65);
    expect(KATALOG.length).toBeLessThanOrEqual(80);
  });

  it('hat eindeutige, stabile Slug-IDs und eindeutige Namen', () => {
    const ids = KATALOG.map((u) => u.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    const namen = KATALOG.map((u) => u.name.toLowerCase());
    expect(new Set(namen).size).toBe(namen.length);
  });

  it('nutzt nur bekannte Muskelgruppen und Geräte, ohne Hauptmuskel doppelt als Nebenmuskel', () => {
    for (const u of KATALOG) {
      expect(MUSKELGRUPPEN).toContain(u.muskel);
      expect(GERAETE).toContain(u.geraet);
      for (const n of u.nebenMuskeln) expect(MUSKELGRUPPEN).toContain(n);
      expect(u.nebenMuskeln).not.toContain(u.muskel);
    }
  });

  it('deckt jede Muskelgruppe und jedes Gerät ab', () => {
    for (const m of MUSKELGRUPPEN) expect(KATALOG.some((u) => u.muskel === m)).toBe(true);
    for (const g of GERAETE) expect(KATALOG.some((u) => u.geraet === g)).toBe(true);
  });

  it('hat gültige Wiederholungsbereiche', () => {
    for (const u of KATALOG) {
      const { min, max } = wdhBereichFuer(u);
      expect(min).toBeGreaterThan(0);
      expect(max).toBeGreaterThan(min);
    }
  });

  it('findet Übungen per ID – auch eigene', () => {
    expect(findeUebung('kniebeuge')?.name).toBe('Kniebeuge (Langhantel)');
    const eigene = { id: 'e1', name: 'Landmine Press', geraet: 'langhantel' as const, muskel: 'schultern' as const, nebenMuskeln: [], eigene: true };
    expect(findeUebung('e1', [eigene])).toBe(eigene);
    expect(findeUebung('gibt-es-nicht')).toBeUndefined();
  });
});

describe('Suche', () => {
  it('normalisiert Umlaute und Sonderzeichen', () => {
    expect(suchText('Schrägbankdrücken (Kurzhantel)')).toBe('schraegbankdruecken kurzhantel');
    expect(suchText('Gesäß')).toBe('gesaess');
  });

  it('findet mit mehreren Wortteilen und Umlaut-Varianten', () => {
    const treffer = sucheUebungen(KATALOG, 'bank kurz').map((u) => u.id);
    expect(treffer).toContain('bankdruecken-kh');
    expect(treffer).toContain('schraegbankdruecken-kh');
    expect(treffer).not.toContain('bankdruecken-lh');
    expect(sucheUebungen(KATALOG, 'klimmzüge').map((u) => u.id)).toEqual(['klimmzuege']);
    expect(sucheUebungen(KATALOG, 'klimmzuege').map((u) => u.id)).toEqual(['klimmzuege']);
  });

  it('liefert bei leerer Suche alles', () => {
    expect(sucheUebungen(KATALOG, '  ')).toHaveLength(KATALOG.length);
  });
});

describe('Standard-Steigerung', () => {
  const st = (id: string) => standardSteigerung(findeUebung(id)!);

  it('+5 kg bei schweren Unterkörper-Grundübungen', () => {
    for (const id of ['kniebeuge', 'kreuzheben', 'beinpresse', 'rumaenisches-kreuzheben-lh', 'hip-thrust-lh']) {
      expect(st(id)).toEqual({ art: 'gewicht', kg: 5 });
    }
  });

  it('+2,5 kg Langhantel/SZ/Maschine/Kabel, +2 kg Kurzhantel, +4 kg Kettlebell', () => {
    expect(st('bankdruecken-lh')).toEqual({ art: 'gewicht', kg: 2.5 });
    expect(st('curls-sz')).toEqual({ art: 'gewicht', kg: 2.5 });
    expect(st('brustpresse')).toEqual({ art: 'gewicht', kg: 2.5 });
    expect(st('latzug')).toEqual({ art: 'gewicht', kg: 2.5 });
    expect(st('curls-kh')).toEqual({ art: 'gewicht', kg: 2 });
    expect(st('kettlebell-swings')).toEqual({ art: 'gewicht', kg: 4 });
  });

  it('+1 Wdh. bei Körpergewicht', () => {
    expect(st('klimmzuege')).toEqual({ art: 'wdh', anzahl: 1 });
  });
});
