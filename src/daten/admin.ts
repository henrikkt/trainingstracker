import { FunctionsHttpError } from '@supabase/supabase-js';
import type { AdminAnfrage, LinkAntwort, NutzerEintrag } from '../../supabase/functions/_shared/regeln.ts';
import { abmelden } from './sitzung.ts';
import { loescheLokaleDaten } from './repo.ts';
import { supabase } from './supabase.ts';

export type { LinkAntwort, NutzerEintrag };

/** Ruft eine Edge Function auf und liefert deren Fehlermeldung (deutsch) als Error. */
async function rufe<T>(name: 'admin-users' | 'delete-account', body: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new Error('Kein Server konfiguriert.');
  const { data, error } = await supabase.functions.invoke<T>(name, { body });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const inhalt = (await error.context.json().catch(() => null)) as { fehler?: string } | null;
      throw new Error(inhalt?.fehler ?? 'Das hat nicht geklappt.');
    }
    throw new Error('Keine Verbindung zum Server. Bitte mit Internet erneut versuchen.');
  }
  return data as T;
}

const verwaltung = <T>(anfrage: AdminAnfrage) => rufe<T>('admin-users', anfrage);

export const ladeNutzer = async () => (await verwaltung<{ nutzer: NutzerEintrag[] }>({ aktion: 'liste' })).nutzer;
export const ladeEin = (email: string) => verwaltung<LinkAntwort>({ aktion: 'einladen', email });
export const resetLink = (nutzerId: string) => verwaltung<LinkAntwort>({ aktion: 'reset', nutzerId });
export const sperre = (nutzerId: string, gesperrt: boolean) => verwaltung<{ ok: true }>({ aktion: gesperrt ? 'sperren' : 'entsperren', nutzerId });
export const loescheNutzer = (nutzerId: string) => verwaltung<{ ok: true }>({ aktion: 'loeschen', nutzerId });

/** Vollständiger Link, den der Admin z. B. per Messenger verschickt. */
export function linkAdresse(antwort: LinkAntwort, basis = `${window.location.origin}${window.location.pathname}`): string {
  return `${basis}#/einladung?token=${encodeURIComponent(antwort.token)}&typ=${antwort.typ}`;
}

/** Eigenes Konto inkl. aller Server-Daten löschen, danach lokale Daten entfernen und abmelden. */
export async function eigenesKontoLoeschen(): Promise<void> {
  await rufe<{ ok: true }>('delete-account', {});
  await loescheLokaleDaten();
  await abmelden();
}
