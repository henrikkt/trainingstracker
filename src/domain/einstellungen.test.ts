import { describe, expect, it } from 'vitest';
import { BEISPIEL_VORLAGEN, standardZiel, vorlageAusBeispiel } from './beispielVorlagen.ts';
import { effektiveEinstellungen, formatierePause, normalisiereWdhBereich, STANDARD_PROFIL } from './einstellungen.ts';
import { findeUebung } from './katalog.ts';

describe('effektive Einstellungen einer Übung', () => {
  const kniebeuge = findeUebung('kniebeuge')!;

  it('nutzt Standardwerte von Übung und Profil', () => {
    expect(effektiveEinstellungen(kniebeuge, undefined)).toEqual({
      steigerung: { art: 'gewicht', kg: 5 },
      pauseSek: STANDARD_PROFIL.pauseSek,
      wdhBereich: { min: 5, max: 8 },
      angepasst: false,
    });
    expect(effektiveEinstellungen(kniebeuge, undefined, { ...STANDARD_PROFIL, pauseSek: 90 }).pauseSek).toBe(90);
  });

  it('persönliche Einstellungen haben Vorrang, einzeln', () => {
    const e = effektiveEinstellungen(kniebeuge, { uebungId: 'kniebeuge', steigerung: { art: 'gewicht', kg: 2.5 }, pauseSek: 180 });
    expect(e.steigerung).toEqual({ art: 'gewicht', kg: 2.5 });
    expect(e.pauseSek).toBe(180);
    expect(e.wdhBereich).toEqual({ min: 5, max: 8 });
    expect(e.angepasst).toBe(true);
  });
});

describe('Hilfsfunktionen', () => {
  it('formatiert Pausen', () => {
    expect(formatierePause(45)).toBe('45 s');
    expect(formatierePause(90)).toBe('1:30 min');
    expect(formatierePause(180)).toBe('3:00 min');
  });

  it('normalisiert Wiederholungsbereiche', () => {
    expect(normalisiereWdhBereich({ min: 12, max: 8 })).toEqual({ min: 12, max: 12 });
    expect(normalisiereWdhBereich({ min: 0, max: 500 })).toEqual({ min: 1, max: 100 });
  });
});

describe('Beispielvorlagen', () => {
  it('verweisen nur auf existierende Katalog-Übungen', () => {
    for (const b of BEISPIEL_VORLAGEN) {
      expect(b.uebungen.length).toBeGreaterThan(0);
      for (const id of b.uebungen) expect(findeUebung(id), `${b.name}: ${id}`).toBeDefined();
    }
  });

  it('übernehmen den Wdh.-Bereich der Übung mit 3 Sätzen', () => {
    expect(standardZiel('kniebeuge').ziel).toEqual({ saetze: 3, wdh: { min: 5, max: 8 } });
    const v = vorlageAusBeispiel(BEISPIEL_VORLAGEN[0]!, 'neu-1');
    expect(v).toMatchObject({ id: 'neu-1', name: 'Push' });
    expect(v.uebungen).toHaveLength(5);
  });
});
