import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../daten/db.ts';
import { anzahlAusstehend, aktualisiereProfil, aktualisiereUebungsEinstellung, loescheVorlage, speichereKoerpergewicht, speichereTraining, speichereVorlage } from '../daten/repo.ts';
import { NetzwerkFehler, pulle, pushe, SEITE, stuecke, synchronisiere } from './motor.ts';
import { TestServer } from './testServer.ts';

const NUTZER = '11111111-1111-1111-1111-111111111111';
let server: TestServer;

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
  server = new TestServer(NUTZER);
});

const training = (id: string, titel = 'Push') => ({ id, start: '2026-11-18T17:00:00.000Z', ende: '2026-11-18T18:00:00.000Z', titel, uebungen: [] });

describe('Push', () => {
  it('lädt alle ausstehenden Datensätze aller Tabellen hoch und markiert sie als synchronisiert', async () => {
    await speichereTraining(training('t1'));
    await speichereVorlage({ id: 'v1', name: 'Beine', uebungen: [] });
    await speichereKoerpergewicht('2026-11-18', 82);
    await aktualisiereProfil({ pauseSek: 90 });
    expect(await anzahlAusstehend()).toBe(4);

    const r = await pushe(server, NUTZER);
    expect(r).toEqual({ hochgeladen: 4, abgelehnt: [] });
    expect(await anzahlAusstehend()).toBe(0);
    expect(server.zeile('workouts', 't1')?.data).toMatchObject({ titel: 'Push' });
    expect(server.zeile('profiles', 'ich')?.data).toMatchObject({ pauseSek: 90 });
  });

  it('eine während des Hochladens geänderte Zeile bleibt ausstehend', async () => {
    await speichereTraining(training('t1'), '2026-11-18T18:00:00.000Z');
    const original = server.hochladen.bind(server);
    server.hochladen = async (tabelle, zeilen) => {
      await original(tabelle, zeilen);
      await speichereTraining(training('t1', 'geändert'), '2026-11-18T18:05:00.000Z'); // Eingabe während des Sync
    };
    await pushe(server, NUTZER);
    expect((await db.trainings.get('t1'))?.ausstehend).toBe(1);
  });

  it('offline: bricht ab, nichts geht verloren', async () => {
    await speichereTraining(training('t1'));
    server.offline = true;
    await expect(pushe(server, NUTZER)).rejects.toBeInstanceOf(NetzwerkFehler);
    expect(await anzahlAusstehend()).toBe(1);
  });

  it('eine abgelehnte Zeile blockiert nicht die anderen', async () => {
    await speichereTraining(training('gut'));
    await speichereTraining(training('kaputt'));
    server.ablehnen.add('kaputt');
    const r = await pushe(server, NUTZER);
    expect(r.hochgeladen).toBe(1);
    expect(r.abgelehnt).toEqual(['trainings/kaputt: check constraint']);
    expect((await db.trainings.get('kaputt'))?.ausstehend).toBe(1);
    expect((await db.trainings.get('gut'))?.ausstehend).toBe(0);
  });

  it('weiches Löschen wird übertragen', async () => {
    await speichereVorlage({ id: 'v1', name: 'Alt', uebungen: [] });
    await pushe(server, NUTZER);
    await loescheVorlage('v1');
    await pushe(server, NUTZER);
    expect(server.zeile('templates', 'v1')?.deleted_at).not.toBeNull();
  });
});

describe('Pull', () => {
  it('holt Datensätze anderer Geräte, merkt sich den Cursor und holt danach nur Neues', async () => {
    server.aenderungVonAnderemGeraet('workouts', 't9', training('t9', 'Vom Handy'), '2026-11-18T18:00:00.000Z');
    expect(await pulle(server)).toBe(1);
    expect(await db.trainings.get('t9')).toMatchObject({ titel: 'Vom Handy', ausstehend: 0, geloeschtUm: null });
    expect((await db.meta.get('sync.cursor.trainings'))?.wert).toBeTruthy();

    // Zweiter Pull: nur noch die Überlappung, keine Änderung der lokalen Daten
    server.aenderungVonAnderemGeraet('workouts', 't10', training('t10'), '2026-11-18T18:10:00.000Z');
    await pulle(server);
    expect(await db.trainings.count()).toBe(2);
  });

  it('Löschung von einem anderen Gerät kommt an', async () => {
    server.aenderungVonAnderemGeraet('templates', 'v1', { id: 'v1', name: 'Weg', uebungen: [] }, '2026-11-18T18:00:00.000Z', '2026-11-18T18:00:00.000Z');
    await pulle(server);
    expect((await db.vorlagen.get('v1'))?.geloeschtUm).toBe('2026-11-18T18:00:00.000Z');
  });

  it('Konflikt: neuere lokale Änderung bleibt, ältere wird vom Server überschrieben', async () => {
    await speichereVorlage({ id: 'neu', name: 'Lokal neu', uebungen: [] }, '2026-11-18T19:00:00.000Z');
    await speichereVorlage({ id: 'alt', name: 'Lokal alt', uebungen: [] }, '2026-11-18T17:00:00.000Z');
    server.aenderungVonAnderemGeraet('templates', 'neu', { id: 'neu', name: 'Server alt', uebungen: [] }, '2026-11-18T18:00:00.000Z');
    server.aenderungVonAnderemGeraet('templates', 'alt', { id: 'alt', name: 'Server neu', uebungen: [] }, '2026-11-18T18:00:00.000Z');
    await pulle(server);
    expect(await db.vorlagen.get('neu')).toMatchObject({ name: 'Lokal neu', ausstehend: 1 });
    expect(await db.vorlagen.get('alt')).toMatchObject({ name: 'Server neu', ausstehend: 0 });
  });

  it('blättert bei vielen Zeilen seitenweise', async () => {
    for (let i = 0; i < SEITE + 5; i++) server.aenderungVonAnderemGeraet('body_weights', `k${i}`, { id: `k${i}`, datum: '2026-11-18', kg: 80 }, '2026-11-18T18:00:00.000Z');
    expect(await pulle(server)).toBe(SEITE + 5);
    expect(await db.koerpergewicht.count()).toBe(SEITE + 5);
  });
});

describe('Kompletter Sync zwischen zwei Geräten', () => {
  it('Gerät A schreibt offline, kommt online, Gerät B sieht es; Konflikt wird per Last-Write-Wins gelöst', async () => {
    // Gerät A (diese Datenbank) erfasst offline
    server.offline = true;
    await speichereTraining(training('t1', 'Offline erfasst'), '2026-11-18T18:00:00.000Z');
    await expect(synchronisiere(server, NUTZER)).rejects.toBeInstanceOf(NetzwerkFehler);
    server.offline = false;
    expect(await synchronisiere(server, NUTZER)).toMatchObject({ hochgeladen: 1, abgelehnt: [] });

    // Gerät B ändert später denselben Datensatz
    server.aenderungVonAnderemGeraet('workouts', 't1', training('t1', 'Auf Gerät B umbenannt'), '2026-11-18T19:00:00.000Z');
    // Gerät A hat eine noch ältere ausstehende Änderung
    await speichereTraining(training('t1', 'Alte Änderung A'), '2026-11-18T18:30:00.000Z');
    await synchronisiere(server, NUTZER);
    expect(server.zeile('workouts', 't1')?.data).toMatchObject({ titel: 'Auf Gerät B umbenannt' });
    expect(await db.trainings.get('t1')).toMatchObject({ titel: 'Auf Gerät B umbenannt', ausstehend: 0 });
  });
});

describe('Fotos in Übungseinstellungen', () => {
  it('Stücke beim Upload: höchstens n Einträge und begrenzte Größe, große Einträge einzeln', () => {
    expect(stuecke([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    const gross = 'x'.repeat(600);
    expect(stuecke(['a', gross, gross, 'b'], 100, 1000)).toEqual([['a', gross], [gross, 'b']]);
    expect(stuecke(['x'.repeat(2000)], 100, 1000)).toHaveLength(1);
  });

  it('Foto und Notiz kommen auf dem anderen Gerät an', async () => {
    const foto = `data:image/jpeg;base64,${'A'.repeat(50_000)}`;
    await aktualisiereUebungsEinstellung('kniebeuge', { notiz: 'Ablage Loch 7', foto });
    await synchronisiere(server, NUTZER);
    expect(server.zeile('exercise_prefs', 'kniebeuge')?.data).toMatchObject({ notiz: 'Ablage Loch 7', foto });

    // „Anderes Gerät“: lokale Daten weg, alles neu holen
    await Promise.all(db.tables.map((t) => t.clear()));
    await pulle(server);
    expect(await db.uebungsEinstellungen.get('kniebeuge')).toMatchObject({ notiz: 'Ablage Loch 7', foto });
  });
});
