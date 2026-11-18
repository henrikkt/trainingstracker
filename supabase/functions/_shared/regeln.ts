/**
 * Reine Logik der Edge Functions (ohne Deno-APIs) – wird von den Functions importiert
 * und mit Vitest getestet. Die Typen nutzt auch das Frontend.
 */

export type AdminAnfrage =
  | { aktion: 'liste' }
  | { aktion: 'einladen'; email: string }
  | { aktion: 'reset' | 'sperren' | 'entsperren' | 'loeschen'; nutzerId: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Bewusst einfach: genau ein @, kein Leerzeichen, Punkt in der Domain. Die eigentliche Prüfung macht Supabase Auth.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Prüft den Request-Body. Liefert die Anfrage oder eine deutsche Fehlermeldung. */
export function leseAdminAnfrage(body: unknown): AdminAnfrage | string {
  if (!body || typeof body !== 'object') return 'Ungültige Anfrage.';
  const { aktion, email, nutzerId } = body as Record<string, unknown>;
  switch (aktion) {
    case 'liste':
      return { aktion };
    case 'einladen': {
      const sauber = typeof email === 'string' ? email.trim().toLowerCase() : '';
      if (!EMAIL.test(sauber) || sauber.length > 254) return 'Bitte eine gültige E-Mail-Adresse angeben.';
      return { aktion, email: sauber };
    }
    case 'reset':
    case 'sperren':
    case 'entsperren':
    case 'loeschen':
      if (typeof nutzerId !== 'string' || !UUID.test(nutzerId)) return 'Ungültige Nutzer-ID.';
      return { aktion, nutzerId };
    default:
      return 'Unbekannte Aktion.';
  }
}

/** Admin ist, wer in app_metadata die Rolle „admin“ hat (nur per SQL/Service setzbar, nicht vom Nutzer selbst). */
export function istAdmin(appMetadata: Record<string, unknown> | undefined | null): boolean {
  return appMetadata?.['role'] === 'admin';
}

/** Aktionen, die man nicht auf sich selbst anwenden darf (sonst sperrt man sich aus). */
export function verbotenAufSichSelbst(anfrage: AdminAnfrage, eigeneId: string): boolean {
  return 'nutzerId' in anfrage && anfrage.nutzerId === eigeneId && anfrage.aktion !== 'reset';
}

export interface NutzerEintrag {
  id: string;
  email: string;
  admin: boolean;
  erstelltAm: string;
  letzteAnmeldung: string | null;
  gesperrt: boolean;
  /** Eingeladen, aber Link noch nicht eingelöst */
  einladungOffen: boolean;
}

/** Ausschnitt eines Supabase-Users – nur Verwaltungsdaten, keine Trainingsdaten. */
export interface AuthNutzer {
  id: string;
  email?: string;
  app_metadata?: Record<string, unknown>;
  created_at: string;
  last_sign_in_at?: string | null;
  banned_until?: string | null;
  invited_at?: string | null;
  email_confirmed_at?: string | null;
}

export function alsNutzerEintrag(u: AuthNutzer, jetzt: Date = new Date()): NutzerEintrag {
  return {
    id: u.id,
    email: u.email ?? '',
    admin: istAdmin(u.app_metadata),
    erstelltAm: u.created_at,
    letzteAnmeldung: u.last_sign_in_at ?? null,
    gesperrt: Boolean(u.banned_until && Date.parse(u.banned_until) > jetzt.getTime()),
    einladungOffen: Boolean(u.invited_at && !u.email_confirmed_at),
  };
}

/** Antwort auf „einladen“ bzw. „reset“: Token für den Link #/einladung?token=…&typ=… */
export interface LinkAntwort {
  token: string;
  typ: 'invite' | 'recovery';
  email: string;
}

/** Erlaubte Herkünfte für CORS (GitHub Pages + lokale Entwicklung/Tests). */
export const ERLAUBTE_HERKUENFTE = ['https://henrikkt.github.io', 'http://localhost:5174', 'http://localhost:4174', 'http://127.0.0.1:4174'];

export function corsHerkunft(origin: string | null): string {
  return origin && ERLAUBTE_HERKUENFTE.includes(origin) ? origin : ERLAUBTE_HERKUENFTE[0]!;
}

/** Sperre „für immer“ (Supabase erwartet eine Dauer). */
export const SPERRDAUER = '876000h';
