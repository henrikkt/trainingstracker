import { describe, expect, it } from 'vitest';
import { trainingsAlsCsv } from './export.ts';
import { kalenderWochen, koerpergewichtVerlauf, tagesSchluessel, trainingsNachTag, uebungsUebersicht, wochenStart } from './fortschritt.ts';
import { findeUebung } from './katalog.ts';
import { s, training } from './testhilfen.ts';

describe('Kalender', () => {
  it('Tagesschlüssel in lokaler Zeit', () => {
    expect(tagesSchluessel(new Date(2026, 10, 18, 23, 30))).toBe('2026-11-18');
    expect(tagesSchluessel(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('Wochen beginnen montags und sind vollständig', () => {
    const wochen = kalenderWochen(2026, 10); // November 2026: 1. ist ein Sonntag
    expect(wochen.every((w) => w.length === 7)).toBe(true);
    expect(tagesSchluessel(wochen[0]![0]!)).toBe('2026-10-26');
    expect(tagesSchluessel(wochen[0]![6]!)).toBe('2026-11-01');
    expect(tagesSchluessel(wochen.at(-1)!.at(-1)!)).toBe('2026-12-06');
    expect(wochen).toHaveLength(6);
  });

  it('Monat, der montags beginnt und sonntags endet, hat keine Fremdtage', () => {
    const wochen = kalenderWochen(2021, 1); // Februar 2021: Mo 1. bis So 28.
    expect(wochen).toHaveLength(4);
    expect(tagesSchluessel(wochen[0]![0]!)).toBe('2021-02-01');
  });

  it('Wochenstart ist Montag', () => {
    expect(tagesSchluessel(wochenStart(new Date(2026, 10, 22)))).toBe('2026-11-16'); // Sonntag
    expect(tagesSchluessel(wochenStart(new Date(2026, 10, 16)))).toBe('2026-11-16'); // Montag
  });

  it('gruppiert abgeschlossene Trainings nach Tag', () => {
    const a = training('2026-11-16', { kniebeuge: [s(100, 5)] });
    const b = training('2026-11-16', { 'bankdruecken-lh': [s(80, 8)] });
    const laufend = { ...training('2026-11-18', {}), ende: undefined };
    const tage = trainingsNachTag([a, b, laufend]);
    expect(tage.get('2026-11-16')).toHaveLength(2);
    expect(tage.has('2026-11-18')).toBe(false);
  });
});

describe('Übungsübersicht', () => {
  it('zählt Einheiten, letztes Datum und bestes e1RM; zuletzt trainierte zuerst', () => {
    const liste = uebungsUebersicht([
      training('2026-11-02', { kniebeuge: [s(100, 5)], 'bankdruecken-lh': [s(80, 8)] }),
      training('2026-11-09', { kniebeuge: [s(110, 1), s(0, 0)] }),
      training('2026-11-05', { 'bankdruecken-lh': [s(85, 5, false)] }), // nur offener Satz → zählt nicht
    ]);
    expect(liste.map((x) => x.uebungId)).toEqual(['kniebeuge', 'bankdruecken-lh']);
    expect(liste[0]).toMatchObject({ einheiten: 2, bestesE1rm: 116.66666666666667 });
    expect(liste[1]).toMatchObject({ einheiten: 1 });
  });
});

describe('Körpergewicht', () => {
  it('sortiert chronologisch und berechnet die Veränderung', () => {
    const v = koerpergewichtVerlauf([
      { id: 'b', datum: '2026-11-10', kg: 81.2 },
      { id: 'a', datum: '2026-11-01', kg: 82 },
    ]);
    expect(v.map((x) => x.id)).toEqual(['a', 'b']);
    expect(v[0]!.differenz).toBeNull();
    expect(v[1]!.differenz).toBe(-0.8);
  });
});

describe('CSV-Export', () => {
  it('ein erledigter Satz pro Zeile, Semikolon, Dezimalkomma, BOM, Escaping', () => {
    const t = training('2026-11-16', { 'bankdruecken-lh': [{ gewicht: 82.5, wdh: 8, rir: 2, erledigt: true, notiz: 'Griff "eng"; langsam' }, s(80, 8, false)] });
    const csv = trainingsAlsCsv([{ ...t, titel: 'Push' }], (id) => findeUebung(id));
    const zeilen = csv.split('\r\n');
    expect(csv.startsWith('﻿')).toBe(true);
    expect(zeilen[0]).toBe('﻿Datum;Uhrzeit;Training;Übung;Übungs-ID;Muskelgruppe;Satz;Gewicht (kg);Wiederholungen;RIR;RPE;Volumen (kg);Notiz');
    expect(zeilen[1]).toBe('2026-11-16;18:00;Push;Bankdrücken (Langhantel);bankdruecken-lh;Brust;1;82,5;8;2;;660;"Griff ""eng""; langsam"');
    expect(zeilen).toHaveLength(3); // Kopf, 1 Satz, leere Zeile am Ende
  });
});
