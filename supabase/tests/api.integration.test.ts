import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * Integrationstest gegen einen echten Supabase-Stack (CI: `supabase start`, Codespaces ebenso).
 * Läuft nur, wenn SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY und SUPABASE_SECRET_KEY gesetzt sind
 * (siehe scripts/supabase-env.mjs) – lokal unter Windows ohne Docker wird er übersprungen.
 * Prüft die Regeln so, wie ein Angreifer sie sehen würde: direkt über die öffentliche REST-API.
 */
const url = process.env.SUPABASE_URL;
const publishable = process.env.SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_SECRET_KEY;
const aktiv = Boolean(url && publishable && secret);
// In der CI darf der Test nie still übersprungen werden
if (process.env.STEMM_INTEGRATION && !aktiv) throw new Error('STEMM_INTEGRATION gesetzt, aber Supabase-Zugangsdaten fehlen');

const optionen = { auth: { persistSession: false, autoRefreshToken: false } };
const PASSWORT = 'Test-Passwort-123!';

describe.skipIf(!aktiv)('Supabase-API (echter Stack)', () => {
  let admin: SupabaseClient;
  let anna: SupabaseClient;
  let ben: SupabaseClient;
  let annaId = '';
  let benId = '';
  const angelegt: string[] = [];

  async function nutzer(name: string): Promise<{ client: SupabaseClient; id: string }> {
    const email = `${name}-${crypto.randomUUID()}@example.org`;
    const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORT, email_confirm: true });
    if (error) throw error;
    angelegt.push(data.user.id);
    const client = createClient(url!, publishable!, optionen);
    const login = await client.auth.signInWithPassword({ email, password: PASSWORT });
    if (login.error) throw login.error;
    return { client, id: data.user.id };
  }

  beforeAll(async () => {
    admin = createClient(url!, secret!, optionen);
    ({ client: anna, id: annaId } = await nutzer('anna'));
    ({ client: ben, id: benId } = await nutzer('ben'));
    const { error } = await anna.from('workouts').insert({ user_id: annaId, id: 'w1', data: { titel: 'Push' }, client_updated_at: '2026-11-18T10:00:00Z' });
    if (error) throw error;
  }, 60_000);

  afterAll(async () => {
    for (const id of angelegt) await admin.auth.admin.deleteUser(id);
  });

  it('öffentliche Registrierung ist abgeschaltet', async () => {
    const fremd = createClient(url!, publishable!, optionen);
    const { error } = await fremd.auth.signUp({ email: `fremd-${crypto.randomUUID()}@example.org`, password: PASSWORT });
    expect(error?.message).toMatch(/signups not allowed|Signups not allowed/i);
  });

  it('ohne Anmeldung (nur öffentlicher Schlüssel) kein Zugriff', async () => {
    const fremd = createClient(url!, publishable!, optionen);
    const { data, error } = await fremd.from('workouts').select('*');
    expect(error ?? data).toBeTruthy();
    expect(data ?? []).toEqual([]);
  });

  it('Anna sieht ihre Daten, Ben nicht', async () => {
    expect((await anna.from('workouts').select('id')).data).toEqual([{ id: 'w1' }]);
    expect((await ben.from('workouts').select('id').eq('user_id', annaId)).data).toEqual([]);
  });

  it('Ben kann Annas Daten weder überschreiben noch für sie anlegen', async () => {
    const upsert = await ben.from('workouts').upsert({ user_id: annaId, id: 'w1', data: { titel: 'gehackt' }, client_updated_at: '2030-01-01T00:00:00Z' });
    expect(upsert.error).not.toBeNull();
    await ben.from('workouts').update({ data: { titel: 'gehackt' } }).eq('user_id', annaId);
    const r = await anna.from('workouts').select('data').eq('id', 'w1').single();
    expect(r.data?.data).toEqual({ titel: 'Push' });
  });

  it('hartes Löschen ist nicht erlaubt', async () => {
    const { error } = await anna.from('workouts').delete().eq('id', 'w1');
    expect(error).not.toBeNull();
    expect((await anna.from('workouts').select('id')).data).toHaveLength(1);
  });

  it('Last-Write-Wins über die API', async () => {
    const schreibe = (titel: string, zeit: string) =>
      ben.from('workouts').upsert({ user_id: benId, id: 'lww', data: { titel }, client_updated_at: zeit }, { onConflict: 'user_id,id' });
    expect((await schreibe('neu', '2026-11-18T12:00:00Z')).error).toBeNull();
    expect((await schreibe('alt', '2026-11-18T11:00:00Z')).error).toBeNull();
    const r = await ben.from('workouts').select('data').eq('id', 'lww').single();
    expect(r.data?.data).toEqual({ titel: 'neu' });
  });

  it('Einladung: generateLink liefert einen Token, mit dem die App die Person anmeldet (ohne E-Mail)', async () => {
    const email = `eingeladen-${crypto.randomUUID()}@example.org`;
    const { data, error } = await admin.auth.admin.generateLink({ type: 'invite', email });
    expect(error).toBeNull();
    angelegt.push(data.user!.id);
    const app = createClient(url!, publishable!, optionen);
    const login = await app.auth.verifyOtp({ token_hash: data.properties!.hashed_token, type: 'invite' });
    expect(login.error).toBeNull();
    expect(login.data.user?.email).toBe(email);
    // Passwort festlegen und damit später anmelden
    expect((await app.auth.updateUser({ password: PASSWORT })).error).toBeNull();
    const neu = createClient(url!, publishable!, optionen);
    expect((await neu.auth.signInWithPassword({ email, password: PASSWORT })).error).toBeNull();
    // Der Token ist nur einmal gültig
    const nochmal = await createClient(url!, publishable!, optionen).auth.verifyOtp({ token_hash: data.properties!.hashed_token, type: 'invite' });
    expect(nochmal.error).not.toBeNull();
  });

  it('Konto löschen entfernt alle Daten der Person', async () => {
    const { client, id } = await nutzer('weg');
    await client.from('templates').insert({ user_id: id, id: 't1', data: { name: 'x' }, client_updated_at: new Date().toISOString() });
    await admin.auth.admin.deleteUser(id);
    const rest = await admin.from('templates').select('id').eq('user_id', id);
    expect(rest.data).toEqual([]);
  });
});
