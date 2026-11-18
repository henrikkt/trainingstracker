import { describe, expect, it } from 'vitest';
import { alsNutzerEintrag, corsHerkunft, istAdmin, leseAdminAnfrage, verbotenAufSichSelbst } from './regeln.ts';

const ID = '11111111-1111-4111-8111-111111111111';

describe('Admin-Anfragen prüfen', () => {
  it('akzeptiert gültige Aktionen und normalisiert E-Mails', () => {
    expect(leseAdminAnfrage({ aktion: 'liste' })).toEqual({ aktion: 'liste' });
    expect(leseAdminAnfrage({ aktion: 'einladen', email: '  Ben@Example.org ' })).toEqual({ aktion: 'einladen', email: 'ben@example.org' });
    expect(leseAdminAnfrage({ aktion: 'sperren', nutzerId: ID })).toEqual({ aktion: 'sperren', nutzerId: ID });
  });

  it('lehnt Ungültiges mit deutscher Meldung ab', () => {
    expect(leseAdminAnfrage(null)).toBe('Ungültige Anfrage.');
    expect(leseAdminAnfrage({ aktion: 'alles-loeschen' })).toBe('Unbekannte Aktion.');
    expect(leseAdminAnfrage({ aktion: 'einladen', email: 'kein-at' })).toMatch(/E-Mail/);
    expect(leseAdminAnfrage({ aktion: 'loeschen', nutzerId: "1' or 1=1" })).toBe('Ungültige Nutzer-ID.');
  });
});

describe('Rechte', () => {
  it('Admin nur über app_metadata.role', () => {
    expect(istAdmin({ role: 'admin' })).toBe(true);
    expect(istAdmin({ role: 'user' })).toBe(false);
    expect(istAdmin(undefined)).toBe(false);
  });

  it('niemand sperrt oder löscht sich selbst – Reset-Link für sich selbst ist erlaubt', () => {
    expect(verbotenAufSichSelbst({ aktion: 'loeschen', nutzerId: ID }, ID)).toBe(true);
    expect(verbotenAufSichSelbst({ aktion: 'sperren', nutzerId: ID }, ID)).toBe(true);
    expect(verbotenAufSichSelbst({ aktion: 'reset', nutzerId: ID }, ID)).toBe(false);
    expect(verbotenAufSichSelbst({ aktion: 'loeschen', nutzerId: ID }, 'andere')).toBe(false);
    expect(verbotenAufSichSelbst({ aktion: 'liste' }, ID)).toBe(false);
  });

  it('CORS nur für bekannte Herkünfte', () => {
    expect(corsHerkunft('http://localhost:5174')).toBe('http://localhost:5174');
    expect(corsHerkunft('https://boese.example')).toBe('https://henrikkt.github.io');
    expect(corsHerkunft(null)).toBe('https://henrikkt.github.io');
  });
});

describe('Nutzerliste', () => {
  const basis = { id: ID, email: 'a@b.de', created_at: '2026-11-01T00:00:00Z' };
  const jetzt = new Date('2026-11-18T12:00:00Z');

  it('zeigt Sperre, offene Einladung und Admin', () => {
    expect(alsNutzerEintrag({ ...basis, banned_until: '2126-01-01T00:00:00Z', app_metadata: { role: 'admin' } }, jetzt)).toMatchObject({ gesperrt: true, admin: true });
    expect(alsNutzerEintrag({ ...basis, banned_until: '2026-11-01T00:00:00Z' }, jetzt).gesperrt).toBe(false);
    expect(alsNutzerEintrag({ ...basis, invited_at: '2026-11-17T00:00:00Z', email_confirmed_at: null }, jetzt).einladungOffen).toBe(true);
    expect(alsNutzerEintrag({ ...basis, invited_at: '2026-11-17T00:00:00Z', email_confirmed_at: '2026-11-17T01:00:00Z' }, jetzt).einladungOffen).toBe(false);
  });

  it('enthält keine Trainingsdaten, nur Verwaltungsfelder', () => {
    expect(Object.keys(alsNutzerEintrag(basis, jetzt)).sort()).toEqual(['admin', 'einladungOffen', 'email', 'erstelltAm', 'gesperrt', 'id', 'letzteAnmeldung']);
  });
});
