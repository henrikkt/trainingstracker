import { describe, expect, it } from 'vitest';
import { entscheide, pullAb, vonServer, zuServer } from './abbildung.ts';

const ds = { id: 't1', start: '2026-11-18T17:00:00.000Z', uebungen: [], aktualisiertUm: '2026-11-18T18:00:00.000Z', geloeschtUm: null, ausstehend: 1 as const };

describe('Abbildung lokal ↔ Server', () => {
  it('zuServer: Metadaten werden zu Spalten, Daten ohne Metadaten', () => {
    expect(zuServer('trainings', ds, 'u1')).toEqual({
      user_id: 'u1',
      id: 't1',
      data: { id: 't1', start: '2026-11-18T17:00:00.000Z', uebungen: [] },
      client_updated_at: '2026-11-18T18:00:00.000Z',
      deleted_at: null,
    });
  });

  it('nutzt den richtigen Schlüssel je Tabelle', () => {
    const e = { uebungId: 'kniebeuge', pauseSek: 180, aktualisiertUm: 'x', geloeschtUm: null, ausstehend: 1 as const };
    expect(zuServer('uebungsEinstellungen', e, 'u1').id).toBe('kniebeuge');
  });

  it('vonServer: Datensatz gilt als synchronisiert, Zeitstempel normalisiert', () => {
    const lokal = vonServer('trainings', {
      id: 't1',
      data: { start: '2026-11-18T17:00:00.000Z', uebungen: [] },
      client_updated_at: '2026-11-18T18:00:00+00:00',
      updated_at: '2026-11-18T18:00:01.123456+00:00',
      deleted_at: '2026-11-18T19:00:00+00:00',
    });
    expect(lokal).toEqual({
      id: 't1',
      start: '2026-11-18T17:00:00.000Z',
      uebungen: [],
      aktualisiertUm: '2026-11-18T18:00:00.000Z',
      geloeschtUm: '2026-11-18T19:00:00.000Z',
      ausstehend: 0,
    });
  });

  it('hin und zurück ergibt denselben Datensatz', () => {
    const hoch = zuServer('trainings', ds, 'u1');
    const zurueck = vonServer('trainings', { ...hoch, updated_at: '2026-11-18T18:00:01Z' });
    expect(zurueck).toEqual({ ...ds, ausstehend: 0 });
  });
});

describe('Konflikte (Last-Write-Wins)', () => {
  const server = (zeit: string) => ({ client_updated_at: zeit });

  it('unbekannt oder synchronisiert → Server übernehmen', () => {
    expect(entscheide(undefined, server('2026-01-01T00:00:00Z'))).toBe('uebernehmen');
    expect(entscheide({ aktualisiertUm: '2030-01-01T00:00:00.000Z', ausstehend: 0 }, server('2026-01-01T00:00:00Z'))).toBe('uebernehmen');
  });

  it('lokal ausstehend: jüngerer Stand gewinnt, Gleichstand → lokal', () => {
    const lokal = { aktualisiertUm: '2026-11-18T18:00:00.000Z', ausstehend: 1 as const };
    expect(entscheide(lokal, server('2026-11-18T18:00:01+00:00'))).toBe('uebernehmen');
    expect(entscheide(lokal, server('2026-11-18T17:59:59+00:00'))).toBe('behalten');
    expect(entscheide(lokal, server('2026-11-18T18:00:00+00:00'))).toBe('behalten');
  });
});

describe('Pull-Cursor', () => {
  it('erster Pull holt alles, danach mit 2 Minuten Überlappung', () => {
    expect(pullAb(undefined)).toBeNull();
    expect(pullAb('2026-11-18T18:10:00.000Z')).toBe('2026-11-18T18:08:00.000Z');
  });
});
