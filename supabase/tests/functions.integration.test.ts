import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * Edge Functions gegen den lokalen Supabase-Stack (CI-Job „Datenbank und Zugriffsregeln“).
 * Ruft die Functions direkt per HTTP auf – so, wie es auch ein Angreifer könnte.
 */
const url = process.env.SUPABASE_URL;
const publishable = process.env.SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_SECRET_KEY;
const aktiv = Boolean(url && publishable && secret);
if (process.env.STEMM_INTEGRATION && !aktiv) throw new Error('STEMM_INTEGRATION gesetzt, aber Supabase-Zugangsdaten fehlen');

const optionen = { auth: { persistSession: false, autoRefreshToken: false } };
const PASSWORT = 'Test-Passwort-123!';

describe.skipIf(!aktiv)('Edge Functions', () => {
  let admin: SupabaseClient;
  const angelegt: string[] = [];
  let chef: { id: string; token: string };
  let nutzerin: { id: string; token: string; email: string };

  async function konto(name: string, istAdmin = false) {
    const email = `${name}-${crypto.randomUUID()}@example.org`;
    const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORT, email_confirm: true, app_metadata: istAdmin ? { role: 'admin' } : {} });
    if (error) throw error;
    angelegt.push(data.user.id);
    const client = createClient(url!, publishable!, optionen);
    const login = await client.auth.signInWithPassword({ email, password: PASSWORT });
    if (login.error) throw login.error;
    return { id: data.user.id, token: login.data.session.access_token, email, client };
  }

  async function rufe(name: string, body: unknown, token?: string): Promise<{ status: number; daten: Record<string, unknown> }> {
    const antwort = await fetch(`${url}/functions/v1/${name}`, {
      method: 'POST',
      headers: { apikey: publishable!, 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    });
    return { status: antwort.status, daten: (await antwort.json().catch(() => ({}))) as Record<string, unknown> };
  }

  beforeAll(async () => {
    admin = createClient(url!, secret!, optionen);
    chef = await konto('admin', true);
    nutzerin = await konto('nutzerin');
  }, 60_000);

  afterAll(async () => {
    for (const id of angelegt) await admin.auth.admin.deleteUser(id).catch(() => undefined);
  });

  it('ohne Anmeldung: 401', async () => {
    expect((await rufe('admin-users', { aktion: 'liste' })).status).toBe(401);
    expect((await rufe('delete-account', {})).status).toBe(401);
    expect((await rufe('admin-users', { aktion: 'liste' }, 'kein-gueltiges-jwt')).status).toBe(401);
  });

  it('normale Nutzerin: kein Zugriff auf die Verwaltung (403)', async () => {
    const r = await rufe('admin-users', { aktion: 'liste' }, nutzerin.token);
    expect(r.status).toBe(403);
    expect(r.daten['fehler']).toBe('Nur für Admins.');
  });

  it('Admin: Liste mit Verwaltungsdaten, aber ohne Trainingsdaten', async () => {
    const r = await rufe('admin-users', { aktion: 'liste' }, chef.token);
    expect(r.status).toBe(200);
    const liste = r.daten['nutzer'] as { email: string; admin: boolean }[];
    expect(liste.find((n) => n.email === nutzerin.email)).toMatchObject({ admin: false, gesperrt: false });
    expect(JSON.stringify(r.daten)).not.toMatch(/workouts|templates|data/);
  });

  it('Admin: Einladung erzeugt einen einlösbaren Token; bestehende E-Mail → 409', async () => {
    const email = `neu-${crypto.randomUUID()}@example.org`;
    const r = await rufe('admin-users', { aktion: 'einladen', email }, chef.token);
    expect(r.status).toBe(200);
    expect(r.daten).toMatchObject({ typ: 'invite', email });
    const app = createClient(url!, publishable!, optionen);
    const login = await app.auth.verifyOtp({ token_hash: r.daten['token'] as string, type: 'invite' });
    expect(login.error).toBeNull();
    angelegt.push(login.data.user!.id);

    expect((await rufe('admin-users', { aktion: 'einladen', email: nutzerin.email }, chef.token)).status).toBe(409);
  });

  it('Admin: Reset-Link für eine Nutzerin', async () => {
    const r = await rufe('admin-users', { aktion: 'reset', nutzerId: nutzerin.id }, chef.token);
    expect(r.status).toBe(200);
    expect(r.daten).toMatchObject({ typ: 'recovery', email: nutzerin.email });
  });

  it('Admin: sperren verhindert die Anmeldung, entsperren erlaubt sie wieder', async () => {
    expect((await rufe('admin-users', { aktion: 'sperren', nutzerId: nutzerin.id }, chef.token)).status).toBe(200);
    const gesperrt = await createClient(url!, publishable!, optionen).auth.signInWithPassword({ email: nutzerin.email, password: PASSWORT });
    expect(gesperrt.error?.code).toBe('user_banned');
    expect((await rufe('admin-users', { aktion: 'entsperren', nutzerId: nutzerin.id }, chef.token)).status).toBe(200);
    const wieder = await createClient(url!, publishable!, optionen).auth.signInWithPassword({ email: nutzerin.email, password: PASSWORT });
    expect(wieder.error).toBeNull();
  });

  it('Admin kann sich nicht selbst sperren oder löschen', async () => {
    expect((await rufe('admin-users', { aktion: 'loeschen', nutzerId: chef.id }, chef.token)).status).toBe(400);
    expect((await rufe('admin-users', { aktion: 'sperren', nutzerId: chef.id }, chef.token)).status).toBe(400);
  });

  it('ungültige Anfragen: 400', async () => {
    expect((await rufe('admin-users', { aktion: 'loeschen', nutzerId: 'x' }, chef.token)).status).toBe(400);
    expect((await rufe('admin-users', { aktion: 'gibts-nicht' }, chef.token)).status).toBe(400);
  });

  it('Admin: Konto löschen', async () => {
    const weg = await konto('weg');
    expect((await rufe('admin-users', { aktion: 'loeschen', nutzerId: weg.id }, chef.token)).status).toBe(200);
    expect((await admin.auth.admin.getUserById(weg.id)).error).not.toBeNull();
  });

  it('delete-account: löscht nur das eigene Konto samt Daten', async () => {
    const ich = await konto('selbst');
    await ich.client.from('workouts').insert({ user_id: ich.id, id: 'w1', data: { titel: 'x' }, client_updated_at: new Date().toISOString() });
    // Ein mitgeschickter fremder nutzerId-Wert wird ignoriert
    const r = await rufe('delete-account', { nutzerId: nutzerin.id }, ich.token);
    expect(r.status).toBe(200);
    expect((await admin.auth.admin.getUserById(ich.id)).error).not.toBeNull();
    expect((await admin.auth.admin.getUserById(nutzerin.id)).error).toBeNull();
    expect((await admin.from('workouts').select('id').eq('user_id', ich.id)).data).toEqual([]);
  });
});
