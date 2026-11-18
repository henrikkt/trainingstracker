import { describe, expect, it } from 'vitest';
import { neueRekorde, rekordeFuerUebung } from './rekorde.ts';
import { s, training } from './testhilfen.ts';

describe('Persönliche Rekorde', () => {
  const t1 = training('2026-11-02', { kniebeuge: [s(100, 5), s(100, 5)] }, 'a');
  const t2 = training('2026-11-05', { kniebeuge: [s(110, 2), s(90, 10)] }, 'b');
  const t3 = training('2026-11-09', { kniebeuge: [s(100, 5), s(120, 1, false)] }, 'c');

  it('ermittelt schwerstes Gewicht, bestes e1RM und besten Satz mit Datum', () => {
    const r = rekordeFuerUebung([t3, t1, t2], 'kniebeuge');
    expect(r.gewicht).toMatchObject({ wert: 110, wdh: 2, trainingId: 'b', datum: t2.start });
    expect(r.e1rm).toMatchObject({ gewicht: 90, wdh: 10, trainingId: 'b' });
    expect(r.satzVolumen).toMatchObject({ wert: 900, trainingId: 'b' });
    expect(r.wdh).toBeUndefined();
  });

  it('bei Gleichstand gilt der frühere Satz', () => {
    const r = rekordeFuerUebung([t1, t3], 'kniebeuge');
    expect(r.gewicht?.trainingId).toBe('a');
  });

  it('meiste Wiederholungen nur bei Körpergewicht-Sätzen', () => {
    const r = rekordeFuerUebung([training('2026-11-02', { klimmzuege: [s(0, 12), s(0, 9), s(10, 6)] })], 'klimmzuege');
    expect(r.wdh?.wert).toBe(12);
    expect(r.gewicht?.wert).toBe(10);
  });
});

describe('Neue Rekorde eines Trainings', () => {
  it('meldet Verbesserungen gegenüber früheren Trainings mit Vorher-Wert', () => {
    const alt = training('2026-11-02', { kniebeuge: [s(100, 5)], 'bankdruecken-lh': [s(80, 8)] }, 'alt');
    const neu = training('2026-11-05', { kniebeuge: [s(105, 5)], 'bankdruecken-lh': [s(80, 6)], klimmzuege: [s(0, 10)] }, 'neu');
    const r = neueRekorde(neu, [alt, neu]);
    expect(r.map((x) => `${x.uebungId}:${x.rekord.art}`).sort()).toEqual(['kniebeuge:e1rm', 'kniebeuge:gewicht', 'kniebeuge:satzVolumen']);
    expect(r.find((x) => x.rekord.art === 'gewicht')?.vorher.wert).toBe(100);
  });

  it('ignoriert Übungen, die zum ersten Mal gemacht werden, und spätere Trainings', () => {
    const erstes = training('2026-11-02', { kniebeuge: [s(100, 5)] }, 'x');
    const spaeter = training('2026-11-09', { kniebeuge: [s(50, 5)] }, 'y');
    expect(neueRekorde(erstes, [spaeter])).toEqual([]);
  });
});
