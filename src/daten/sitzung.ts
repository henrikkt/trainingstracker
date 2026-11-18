import type { AuthError, Session, User } from '@supabase/supabase-js';
import { useSyncExternalStore } from 'react';
import { entscheideBesitzer } from './besitzer.ts';
import { anzahlAusstehend, leseMeta, loescheLokaleDaten, setzeMeta } from './repo.ts';
import { supabase } from './supabase.ts';

/**
 * Anmeldestatus der App.
 *  - lokal:       kein Backend konfiguriert → kein Login, alles nur auf dem Gerät
 *  - laedt:       gespeicherte Sitzung wird gelesen (kurz beim Start)
 *  - abgemeldet:  Login-Seite zeigen
 *  - angemeldet:  App nutzen (auch offline – die Sitzung bleibt lokal gespeichert)
 */
export interface Nutzer {
  id: string;
  email: string;
  admin: boolean;
}
export type Sitzung = { status: 'lokal' } | { status: 'laedt' } | { status: 'abgemeldet' } | { status: 'angemeldet'; nutzer: Nutzer };

const BESITZER = 'besitzer';
const hoerer = new Set<() => void>();
let zustand: Sitzung = supabase ? { status: 'laedt' } : { status: 'lokal' };

function setze(neu: Sitzung): void {
  zustand = neu;
  hoerer.forEach((h) => h());
}

function alsNutzer(u: User): Nutzer {
  return { id: u.id, email: u.email ?? '', admin: u.app_metadata?.['role'] === 'admin' };
}

// Während einer Anmeldung wird der neue Status zurückgehalten, bis geklärt ist, ob die lokalen Daten
// zu diesem Konto gehören – sonst wären kurz die Daten eines anderen Kontos sichtbar.
let geraetPruefungLaeuft = false;
let letzteSitzung: Session | null = null;

function uebernehme(sitzung: Session | null): void {
  setze(sitzung ? { status: 'angemeldet', nutzer: alsNutzer(sitzung.user) } : { status: 'abgemeldet' });
}

// Liefert sofort die gespeicherte Sitzung (INITIAL_SESSION) und danach jede Änderung.
// Wichtig: im Callback keine weiteren Supabase-Aufrufe abwarten (Deadlock-Gefahr laut Supabase-Doku).
supabase?.auth.onAuthStateChange((_ereignis, sitzung) => {
  letzteSitzung = sitzung;
  if (!geraetPruefungLaeuft) uebernehme(sitzung);
});

async function mitGeraetePruefung(anmeldung: () => Promise<{ nutzerId?: string; fehler?: string }>): Promise<string | null> {
  geraetPruefungLaeuft = true;
  try {
    const { nutzerId, fehler } = await anmeldung();
    if (fehler || !nutzerId) return fehler ?? 'Anmeldung fehlgeschlagen.';
    return await pruefeGeraet(nutzerId);
  } finally {
    geraetPruefungLaeuft = false;
    uebernehme(letzteSitzung);
  }
}

/** Für Nicht-React-Code (Sync-Dienst): aktueller Status und Änderungen beobachten. */
export const aktuelleSitzung = (): Sitzung => zustand;
export function abonniereSitzung(h: () => void): () => void {
  hoerer.add(h);
  return () => hoerer.delete(h);
}

export function useSitzung(): Sitzung {
  return useSyncExternalStore(
    (h) => {
      hoerer.add(h);
      return () => hoerer.delete(h);
    },
    () => zustand,
    () => zustand,
  );
}

/** Deutsche Fehlermeldungen für die häufigsten Auth-Fehler. */
export function fehlerText(fehler: AuthError | Error | null | undefined): string {
  if (!fehler) return '';
  const code = 'code' in fehler ? fehler.code : undefined;
  const text = fehler.message ?? '';
  if (code === 'invalid_credentials' || /invalid login credentials/i.test(text)) return 'E-Mail oder Passwort stimmt nicht.';
  if (code === 'otp_expired' || /expired|invalid.*(token|otp)/i.test(text)) return 'Der Link ist ungültig oder abgelaufen. Bitte den Admin um einen neuen Link.';
  if (code === 'weak_password' || /password should|weak password/i.test(text)) return 'Das Passwort ist zu schwach: mindestens 10 Zeichen.';
  if (code === 'same_password') return 'Das neue Passwort muss sich vom alten unterscheiden.';
  if (code === 'user_banned') return 'Dieser Zugang ist gesperrt.';
  if (code === 'over_request_rate_limit' || /rate limit/i.test(text)) return 'Zu viele Versuche. Bitte kurz warten.';
  if (/fetch|network/i.test(text)) return 'Keine Verbindung zum Server. Bitte später erneut versuchen.';
  return `Das hat nicht geklappt (${text}).`;
}

/**
 * Nach erfolgreicher Anmeldung: Gehören die lokalen Daten zu diesem Konto?
 * Bei anderem Konto mit noch nicht synchronisierten Daten wird die Anmeldung zurückgenommen.
 */
async function pruefeGeraet(nutzerId: string): Promise<string | null> {
  const entscheidung = entscheideBesitzer(await leseMeta<string>(BESITZER), nutzerId, await anzahlAusstehend());
  if (entscheidung === 'blockiert') {
    await supabase?.auth.signOut({ scope: 'local' });
    return 'Auf diesem Gerät liegen noch nicht synchronisierte Daten eines anderen Kontos. Bitte zuerst mit jenem Konto anmelden, damit nichts verloren geht.';
  }
  if (entscheidung === 'wechseln') await loescheLokaleDaten();
  if (entscheidung !== 'gleich') await setzeMeta(BESITZER, nutzerId);
  return null;
}

/** Anmelden mit E-Mail und Passwort. Liefert eine Fehlermeldung oder null. */
export async function anmelden(email: string, passwort: string): Promise<string | null> {
  if (!supabase) return 'Kein Server konfiguriert.';
  const client = supabase;
  return mitGeraetePruefung(async () => {
    const { data, error } = await client.auth.signInWithPassword({ email: email.trim(), password: passwort });
    return error ? { fehler: fehlerText(error) } : { nutzerId: data.user.id };
  });
}

/** Einladungs- oder Reset-Link einlösen (Token aus der Route). Danach ist die Person angemeldet. */
export async function linkEinloesen(token: string, typ: 'invite' | 'recovery'): Promise<string | null> {
  if (!supabase) return 'Kein Server konfiguriert.';
  const client = supabase;
  return mitGeraetePruefung(async () => {
    const { data, error } = await client.auth.verifyOtp({ token_hash: token, type: typ });
    return error || !data.user ? { fehler: fehlerText(error ?? new Error('invalid token')) } : { nutzerId: data.user.id };
  });
}

export const MIN_PASSWORT_LAENGE = 10;

export async function passwortSetzen(passwort: string): Promise<string | null> {
  if (!supabase) return 'Kein Server konfiguriert.';
  if (passwort.length < MIN_PASSWORT_LAENGE) return `Mindestens ${MIN_PASSWORT_LAENGE} Zeichen.`;
  const { error } = await supabase.auth.updateUser({ password: passwort });
  return error ? fehlerText(error) : null;
}

/** Abmelden nur auf diesem Gerät. Lokale Daten bleiben (gehören weiter diesem Konto). */
export async function abmelden(): Promise<void> {
  await supabase?.auth.signOut({ scope: 'local' });
}
