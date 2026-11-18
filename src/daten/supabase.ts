import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase-Client – nur, wenn URL und Publishable Key beim Build gesetzt sind.
 * Ohne diese Werte läuft die App im „lokalen Modus“ (alles nur auf diesem Gerät, kein Login) –
 * so funktionieren Entwicklung und die meisten E2E-Tests ohne Backend.
 * Beide Werte sind öffentlich; geschützt werden die Daten durch Row Level Security.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const schluessel = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const supabase: SupabaseClient | null =
  url && schluessel
    ? createClient(url, schluessel, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          // Einladungs-/Reset-Tokens liest die App selbst aus der Route (#/einladung?token=…)
          detectSessionInUrl: false,
          storageKey: 'stemm.auth',
        },
      })
    : null;

export const istLokalerModus = supabase === null;
