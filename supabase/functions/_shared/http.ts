// Gemeinsame Helfer der Edge Functions (Deno). Nicht im Frontend importieren.
import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2.119.1';
import { corsHerkunft } from './regeln.ts';

export function corsKoepfe(req: Request): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': corsHerkunft(req.headers.get('origin')),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

export function antwort(req: Request, status: number, daten: unknown): Response {
  return new Response(JSON.stringify(daten), { status, headers: { ...corsKoepfe(req), 'Content-Type': 'application/json; charset=utf-8' } });
}

/**
 * Secret Key des Projekts – bleibt immer serverseitig. Neue Projekte: SUPABASE_SECRET_KEYS (JSON, Eintrag "default");
 * ältere/lokale Stacks: SUPABASE_SERVICE_ROLE_KEY.
 */
function secretKey(): string {
  try {
    const neu = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}') as Record<string, string>;
    if (neu['default']) return neu['default'];
  } catch {
    // ignorieren, Fallback unten
  }
  const alt = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!alt) throw new Error('Kein Secret Key in der Umgebung');
  return alt;
}

export function adminClient(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, secretKey(), { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Wer ruft auf? Prüft das mitgeschickte Nutzer-JWT bei Supabase Auth (verify_jwt ist aus, wir prüfen selbst). */
export async function aufrufer(req: Request, admin: SupabaseClient): Promise<User | null> {
  const jwt = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!jwt) return null;
  const { data, error } = await admin.auth.getUser(jwt);
  return error ? null : data.user;
}

/** Gemeinsamer Rahmen: OPTIONS (CORS), nur POST, Fehler abfangen ohne interne Details preiszugeben. */
export function bediene(verarbeite: (req: Request) => Promise<Response>): void {
  Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsKoepfe(req) });
    if (req.method !== 'POST') return antwort(req, 405, { fehler: 'Nur POST erlaubt.' });
    try {
      return await verarbeite(req);
    } catch (e) {
      console.error(e);
      return antwort(req, 500, { fehler: 'Interner Fehler. Bitte später erneut versuchen.' });
    }
  });
}
