import { describe, expect, it } from 'vitest';
import { findeUebung } from './katalog.ts';
import { s, training } from './testhilfen.ts';
import {
  abschliessen,
  aendereGewicht,
  aendereSatz,
  naechsterOffenerSatz,
  neueTrainingsUebung,
  offeneSaetze,
  planeUebung,
  satzEntfernen,
  satzHinzufuegen,
  setzeErledigt,
  uebungEntfernen,
  verlaufSaetze,
  zusammenfassen,
} from './training.ts';
import type { Training } from './typen.ts';

const kniebeuge = findeUebung('kniebeuge')!;

describe('Verlauf und Plan einer Übung', () => {
  const alt = training('2026-11-02', { kniebeuge: [s(100, 6), s(100, 5)] }, 'alt');
  const neu = training('2026-11-05', { kniebeuge: [s(100, 8), s(100, 8), s(100, 8), s(120, 1, false)] }, 'neu');
  const laufend: Training = { ...training('2026-11-09', { kniebeuge: [s(200, 1)] }, 'lauf'), ende: undefined };

  it('nimmt nur abgeschlossene Trainings, neuestes zuerst, nur erledigte Sätze', () => {
    expect(verlaufSaetze([alt, laufend, neu], 'kniebeuge')).toEqual([[s(100, 8), s(100, 8), s(100, 8)], [s(100, 6), s(100, 5)]]);
    expect(verlaufSaetze([alt, neu], 'kniebeuge', 'neu')).toHaveLength(1);
    expect(verlaufSaetze([alt, neu], 'bankdruecken-lh')).toEqual([]);
  });

  it('plant mit Standard-Ziel (3 Sätze, Wdh.-Bereich der Übung) und Vorschlag', () => {
    const plan = planeUebung(kniebeuge, { trainings: [alt, neu, laufend] });
    expect(plan.ziel).toEqual({ saetze: 3, wdh: { min: 5, max: 8 } });
    expect(plan.letztes).toEqual([s(100, 8), s(100, 8), s(100, 8)]);
    expect(plan.vorschlag).toMatchObject({ gewicht: 105, wdh: [5, 5, 5], regel: 'steigern' });
    expect(plan.pauseSek).toBe(120);
  });

  it('nutzt Vorlagen-Ziel, persönliche Steigerung und Pause', () => {
    const plan = planeUebung(kniebeuge, {
      trainings: [neu],
      ziel: { saetze: 3, wdh: { min: 6, max: 8 } },
      einstellung: { uebungId: 'kniebeuge', steigerung: { art: 'gewicht', kg: 2.5 }, pauseSek: 180 },
    });
    expect(plan.vorschlag).toMatchObject({ gewicht: 102.5, wdh: [6, 6, 6] });
    expect(plan.pauseSek).toBe(180);
    // 4 geplante Sätze, zuletzt nur 3 geschafft → noch nicht steigern
    const vier = planeUebung(kniebeuge, { trainings: [neu], ziel: { saetze: 4, wdh: { min: 6, max: 8 } } });
    expect(vier.vorschlag).toMatchObject({ gewicht: 100, wdh: [8, 8, 8, 6], regel: 'wdh-steigern' });
  });

  it('belegt Sätze mit dem Vorschlag vor (erstes Mal: 0 kg)', () => {
    const mitVerlauf = neueTrainingsUebung('kniebeuge', planeUebung(kniebeuge, { trainings: [neu] }));
    expect(mitVerlauf.saetze).toEqual([
      { gewicht: 105, wdh: 5, erledigt: false },
      { gewicht: 105, wdh: 5, erledigt: false },
      { gewicht: 105, wdh: 5, erledigt: false },
    ]);
    const erstesMal = neueTrainingsUebung('kniebeuge', planeUebung(kniebeuge, { trainings: [] }));
    expect(erstesMal.saetze.every((x) => x.gewicht === 0 && x.wdh === 5)).toBe(true);
  });
});

describe('Sätze bearbeiten', () => {
  const ue = { uebungId: 'kniebeuge', ziel: { saetze: 3, wdh: { min: 5, max: 8 } }, saetze: [s(100, 5, false)] };

  it('neuer Satz übernimmt die Werte des letzten', () => {
    expect(satzHinzufuegen(ue).saetze[1]).toEqual({ gewicht: 100, wdh: 5, erledigt: false });
    expect(satzHinzufuegen({ ...ue, saetze: [] }).saetze[0]).toEqual({ gewicht: 0, wdh: 5, erledigt: false });
  });

  it('ändern, abhaken (mit Zeit), Haken entfernen, löschen', () => {
    const geaendert = aendereSatz(ue, 0, { gewicht: 102.5, rir: 2 });
    expect(geaendert.saetze[0]).toEqual({ gewicht: 102.5, wdh: 5, rir: 2, erledigt: false });
    const erledigt = setzeErledigt(geaendert, 0, true, '2026-11-18T18:00:00.000Z');
    expect(erledigt.saetze[0]).toMatchObject({ erledigt: true, erledigtUm: '2026-11-18T18:00:00.000Z' });
    expect(setzeErledigt(erledigt, 0, false, 'x').saetze[0]).not.toHaveProperty('erledigtUm');
    expect(satzEntfernen(erledigt, 0).saetze).toEqual([]);
    expect(ue.saetze[0]!.gewicht).toBe(100); // keine Mutation
  });

  it('Gewicht ändern übernimmt es in folgende offene Sätze mit gleichem Gewicht', () => {
    const x = { ...ue, saetze: [s(0, 5, false), s(0, 5, true), s(0, 5, false), s(60, 5, false)] };
    const neu = aendereGewicht(x, 0, 100);
    expect(neu.saetze.map((y) => y.gewicht)).toEqual([100, 0, 100, 60]);
    // frühere Sätze bleiben unverändert
    expect(aendereGewicht(neu, 2, 105).saetze.map((y) => y.gewicht)).toEqual([100, 0, 105, 60]);
  });

  it('entfernt leere Notizen und undefinierte Felder', () => {
    const x = aendereSatz(ue, 0, { notiz: '   ', rir: undefined });
    expect(x.saetze[0]).toEqual({ gewicht: 100, wdh: 5, erledigt: false });
  });
});

describe('Nächster offener Satz', () => {
  const t = training('2026-11-18', {
    kniebeuge: [s(100, 5), s(100, 5, false), s(100, 5, false)],
    'bankdruecken-lh': [s(80, 8, false)],
  });

  it('ohne Startpunkt: erster offener Satz', () => {
    expect(naechsterOffenerSatz(t)).toEqual({ uebung: 0, satz: 1 });
  });
  it('nach einem Satz: weiter in derselben Übung, dann nächste Übung, dann von vorne', () => {
    expect(naechsterOffenerSatz(t, { uebung: 0, satz: 1 })).toEqual({ uebung: 0, satz: 2 });
    expect(naechsterOffenerSatz(t, { uebung: 0, satz: 2 })).toEqual({ uebung: 1, satz: 0 });
    expect(naechsterOffenerSatz(t, { uebung: 1, satz: 0 })).toEqual({ uebung: 0, satz: 1 });
  });
  it('null, wenn alles erledigt ist', () => {
    expect(naechsterOffenerSatz(training('2026-11-18', { kniebeuge: [s(100, 5)] }))).toBeNull();
  });
});

describe('Abschließen und Zusammenfassung', () => {
  it('entfernt offene Sätze und leere Übungen, setzt Endzeit', () => {
    const t = { ...training('2026-11-18', { kniebeuge: [s(100, 5), s(100, 5, false)], 'bankdruecken-lh': [s(80, 8, false)] }), ende: undefined };
    expect(offeneSaetze(t)).toBe(2);
    const fertig = abschliessen(t, '2026-11-18T19:00:00.000Z');
    expect(fertig.ende).toBe('2026-11-18T19:00:00.000Z');
    expect(fertig.uebungen).toEqual([{ uebungId: 'kniebeuge', saetze: [s(100, 5)] }]);
    expect(uebungEntfernen(t, 0).uebungen.map((u) => u.uebungId)).toEqual(['bankdruecken-lh']);
  });

  it('berechnet Dauer, Volumen, Sätze und neue Rekorde', () => {
    const alt = training('2026-11-02', { kniebeuge: [s(100, 5)] }, 'a');
    const heute = training('2026-11-18', { kniebeuge: [s(105, 5), s(105, 5)], 'bankdruecken-lh': [s(80, 8)] }, 'b');
    const z = zusammenfassen(heute, [alt, heute]);
    expect(z).toMatchObject({ dauerMin: 60, volumen: 1050 + 640, saetze: 3, uebungen: 2 });
    expect(z.neueRekorde.map((r) => r.rekord.art).sort()).toEqual(['e1rm', 'gewicht', 'satzVolumen']);
  });
});
