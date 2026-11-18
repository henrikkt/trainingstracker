import { beforeEach, describe, expect, it } from 'vitest';
import { STANDARD_PROFIL } from '../domain/einstellungen.ts';
import { db } from './db.ts';
import {
  aktualisiereProfil,
  aktualisiereUebungsEinstellung,
  alleTrainings,
  istAktiv,
  laufendesTraining,
  loescheTraining,
  speichereTraining,
  starteTraining,
  leseProfil,
  loescheEigeneUebung,
  loescheVorlage,
  neueVorlage,
  ohneMeta,
  speichereEigeneUebung,
  speichereProfil,
  speichereUebungsEinstellung,
  speichereVorlage,
  uebernimmBeispielVorlage,
} from './repo.ts';

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe('Speichern setzt Sync-Metadaten', () => {
  it('neue Vorlage ist ausstehend und nicht gelöscht', async () => {
    const id = await neueVorlage('Push');
    const ds = await db.vorlagen.get(id);
    expect(ds).toMatchObject({ id, name: 'Push', uebungen: [], ausstehend: 1, geloeschtUm: null });
    expect(Date.parse(ds!.aktualisiertUm)).not.toBeNaN();
  });

  it('erneutes Speichern aktualisiert den Zeitstempel und markiert wieder als ausstehend', async () => {
    await speichereVorlage({ id: 'v1', name: 'A', uebungen: [] }, '2026-11-01T10:00:00.000Z');
    await db.vorlagen.update('v1', { ausstehend: 0 }); // so tun, als wäre es synchronisiert
    await speichereVorlage({ id: 'v1', name: 'B', uebungen: [] }, '2026-11-02T10:00:00.000Z');
    expect(await db.vorlagen.get('v1')).toMatchObject({ name: 'B', aktualisiertUm: '2026-11-02T10:00:00.000Z', ausstehend: 1 });
  });

  it('übernimmt keine veralteten Metadaten aus dem übergebenen Objekt', async () => {
    const alt = { id: 'v2', name: 'X', uebungen: [], ausstehend: 0 as const, geloeschtUm: '2020-01-01T00:00:00.000Z', aktualisiertUm: '2020-01-01T00:00:00.000Z' };
    await speichereVorlage(alt, '2026-11-02T10:00:00.000Z');
    expect(await db.vorlagen.get('v2')).toMatchObject({ ausstehend: 1, geloeschtUm: null, aktualisiertUm: '2026-11-02T10:00:00.000Z' });
  });
});

describe('Weiches Löschen', () => {
  it('markiert Vorlage als gelöscht statt sie zu entfernen', async () => {
    await speichereVorlage({ id: 'v1', name: 'A', uebungen: [] });
    await db.vorlagen.update('v1', { ausstehend: 0 });
    await loescheVorlage('v1', '2026-11-03T10:00:00.000Z');
    const ds = await db.vorlagen.get('v1');
    expect(ds).toMatchObject({ geloeschtUm: '2026-11-03T10:00:00.000Z', ausstehend: 1 });
    expect(istAktiv(ds!)).toBe(false);
  });

  it('eigene Übung: speichern markiert als eigene, löschen weich', async () => {
    await speichereEigeneUebung({ id: 'e1', name: 'Landmine Press', geraet: 'langhantel', muskel: 'schultern', nebenMuskeln: [] });
    expect(await db.eigeneUebungen.get('e1')).toMatchObject({ eigene: true });
    await loescheEigeneUebung('e1');
    expect(istAktiv((await db.eigeneUebungen.get('e1'))!)).toBe(false);
  });
});

describe('Training starten', () => {
  it('aus Vorlage: Übungen mit Ziel, Sätze vorbelegt, Titel = Vorlagenname', async () => {
    const vid = await uebernimmBeispielVorlage('beine');
    const vorlage = ohneMeta((await db.vorlagen.get(vid))!);
    const id = await starteTraining(vorlage);
    const t = await laufendesTraining();
    expect(t).toMatchObject({ id, titel: 'Beine', vorlageId: vid });
    expect(t!.ende).toBeUndefined();
    expect(t!.uebungen).toHaveLength(5);
    expect(t!.uebungen[0]).toMatchObject({ uebungId: 'kniebeuge', ziel: { saetze: 3, wdh: { min: 5, max: 8 } } });
    expect(t!.uebungen[0]!.saetze).toHaveLength(3);
  });

  it('startet nie ein zweites laufendes Training', async () => {
    const a = await starteTraining();
    const b = await starteTraining();
    expect(b).toBe(a);
    expect(await alleTrainings()).toHaveLength(1);
  });

  it('belegt mit dem Vorschlag aus dem letzten abgeschlossenen Training vor', async () => {
    const satz = { gewicht: 100, wdh: 8, erledigt: true };
    await speichereTraining({ id: 'alt', start: '2026-11-01T17:00:00.000Z', ende: '2026-11-01T18:00:00.000Z', uebungen: [{ uebungId: 'kniebeuge', saetze: [satz, satz, satz] }] });
    await speichereVorlage({ id: 'v', name: 'Nur Kniebeugen', uebungen: [{ uebungId: 'kniebeuge', ziel: { saetze: 3, wdh: { min: 5, max: 8 } } }] });
    await starteTraining(ohneMeta((await db.vorlagen.get('v'))!));
    const t = await laufendesTraining();
    expect(t!.uebungen[0]!.saetze[0]).toEqual({ gewicht: 105, wdh: 5, erledigt: false });
    await loescheTraining(t!.id);
    expect(await laufendesTraining()).toBeUndefined();
  });
});

describe('Beispielvorlagen, Einstellungen, Profil', () => {
  it('übernimmt eine Beispielvorlage mit neuer ID', async () => {
    const id1 = await uebernimmBeispielVorlage('push');
    const id2 = await uebernimmBeispielVorlage('push');
    expect(id1).not.toBe(id2);
    expect((await db.vorlagen.get(id1))?.uebungen).toHaveLength(5);
    await expect(uebernimmBeispielVorlage('gibt-es-nicht')).rejects.toThrow();
  });

  it('speichert Übungseinstellungen pro Übung', async () => {
    await speichereUebungsEinstellung({ uebungId: 'kniebeuge', steigerung: { art: 'gewicht', kg: 2.5 } });
    expect(ohneMeta((await db.uebungsEinstellungen.get('kniebeuge'))!)).toEqual({ uebungId: 'kniebeuge', steigerung: { art: 'gewicht', kg: 2.5 } });
  });

  it('gleichzeitige Teil-Änderungen gehen nicht verloren (Profil und Übungseinstellung)', async () => {
    await Promise.all([aktualisiereProfil({ intensitaet: 'rpe' }), aktualisiereProfil({ gewichtsSchritt: 1.25 }), aktualisiereProfil({ pauseSek: 90 })]);
    expect(await leseProfil()).toEqual({ intensitaet: 'rpe', gewichtsSchritt: 1.25, pauseSek: 90 });

    await Promise.all([
      aktualisiereUebungsEinstellung('kniebeuge', { pauseSek: 180 }),
      aktualisiereUebungsEinstellung('kniebeuge', { steigerung: { art: 'gewicht', kg: 2.5 } }),
    ]);
    expect(ohneMeta((await db.uebungsEinstellungen.get('kniebeuge'))!)).toEqual({ uebungId: 'kniebeuge', pauseSek: 180, steigerung: { art: 'gewicht', kg: 2.5 } });
  });

  it('Profil: Standardwerte ohne Eintrag, sonst gespeicherte Werte', async () => {
    expect(await leseProfil()).toEqual(STANDARD_PROFIL);
    await speichereProfil({ ...STANDARD_PROFIL, pauseSek: 90, intensitaet: 'rpe' });
    expect(await leseProfil()).toEqual({ ...STANDARD_PROFIL, pauseSek: 90, intensitaet: 'rpe' });
  });
});
