import { useSyncExternalStore } from 'react';
import { anzahlAusstehend, beiLokalerAenderung } from '../daten/repo.ts';
import { abonniereSitzung, aktuelleSitzung } from '../daten/sitzung.ts';
import { supabase } from '../daten/supabase.ts';
import { AnmeldeFehler, NetzwerkFehler, synchronisiere, type SyncServer } from './motor.ts';
import { supabaseServer } from './supabaseServer.ts';

/**
 * Sync-Dienst: entscheidet, WANN synchronisiert wird, und hält den sichtbaren Status.
 * Auslöser: Anmeldung/Start, wieder online, App wieder sichtbar, kurz nach lokalen Änderungen, alle 60 s.
 * Es läuft nie mehr als ein Sync gleichzeitig; Anfragen währenddessen führen zu genau einem weiteren Lauf.
 */
export type SyncZustand = 'aus' | 'offline' | 'laeuft' | 'synchronisiert' | 'fehler';

export interface SyncStatus {
  zustand: SyncZustand;
  ausstehend: number;
  letzterSync: string | null;
  meldung: string | null;
}

const NACH_AENDERUNG_MS = 1500;
const INTERVALL_MS = 60_000;
const WIEDERHOLUNG_MS = [5_000, 15_000, 60_000];

const hoerer = new Set<() => void>();
let status: SyncStatus = { zustand: 'aus', ausstehend: 0, letzterSync: null, meldung: null };

function setze(aenderung: Partial<SyncStatus>): void {
  status = { ...status, ...aenderung };
  hoerer.forEach((h) => h());
}

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    (h) => {
      hoerer.add(h);
      return () => hoerer.delete(h);
    },
    () => status,
    () => status,
  );
}

let server: SyncServer | null = null;
let laeuft = false;
let nochmal = false;
let geplant: number | undefined;
let fehlversuche = 0;

async function aktualisiereAusstehend(): Promise<void> {
  setze({ ausstehend: await anzahlAusstehend() });
}

/** Sync in `ms` Millisekunden einplanen (spätere Anfragen ersetzen frühere). */
export function planeSync(ms = 0): void {
  window.clearTimeout(geplant);
  geplant = window.setTimeout(() => void jetztSynchronisieren(), ms);
}

export async function jetztSynchronisieren(): Promise<void> {
  const sitzung = aktuelleSitzung();
  if (!server || sitzung.status !== 'angemeldet') return setze({ zustand: 'aus' });
  await aktualisiereAusstehend();
  if (!navigator.onLine) return setze({ zustand: 'offline', meldung: null });
  if (laeuft) {
    nochmal = true;
    return;
  }
  laeuft = true;
  setze({ zustand: 'laeuft' });
  try {
    const ergebnis = await synchronisiere(server, sitzung.nutzer.id);
    fehlversuche = 0;
    setze(
      ergebnis.abgelehnt.length > 0
        ? { zustand: 'fehler', meldung: `${ergebnis.abgelehnt.length} Datensatz/Datensätze vom Server abgelehnt.`, letzterSync: new Date().toISOString() }
        : { zustand: 'synchronisiert', meldung: null, letzterSync: new Date().toISOString() },
    );
    if (ergebnis.abgelehnt.length) console.warn('Sync: abgelehnt', ergebnis.abgelehnt);
  } catch (e) {
    if (e instanceof NetzwerkFehler) {
      setze({ zustand: navigator.onLine ? 'fehler' : 'offline', meldung: navigator.onLine ? 'Server nicht erreichbar – neuer Versuch folgt.' : null });
      planeSync(WIEDERHOLUNG_MS[Math.min(fehlversuche++, WIEDERHOLUNG_MS.length - 1)]);
    } else if (e instanceof AnmeldeFehler) {
      setze({ zustand: 'fehler', meldung: 'Sitzung abgelaufen – bitte ab- und wieder anmelden.' });
    } else {
      console.error('Sync fehlgeschlagen', e);
      setze({ zustand: 'fehler', meldung: 'Synchronisieren fehlgeschlagen – neuer Versuch folgt.' });
      planeSync(WIEDERHOLUNG_MS[Math.min(fehlversuche++, WIEDERHOLUNG_MS.length - 1)]);
    }
  } finally {
    laeuft = false;
    await aktualisiereAusstehend();
    if (nochmal) {
      nochmal = false;
      planeSync(0);
    }
  }
}

/** Startet den Dienst einmalig (nur mit Backend). */
export function starteSync(): void {
  if (!supabase || server) return;
  server = supabaseServer(supabase);

  abonniereSitzung(() => {
    if (aktuelleSitzung().status === 'angemeldet') planeSync(0);
    else setze({ zustand: 'aus', letzterSync: null, meldung: null });
  });
  beiLokalerAenderung(() => {
    // Sofort als „ausstehend“ anzeigen – nicht erst, wenn der verzögerte Sync startet
    if (status.ausstehend === 0) setze({ ausstehend: 1 });
    void aktualisiereAusstehend();
    planeSync(NACH_AENDERUNG_MS);
  });
  window.addEventListener('online', () => planeSync(0));
  window.addEventListener('offline', () => setze({ zustand: 'offline', meldung: null }));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') planeSync(0);
  });
  window.setInterval(() => {
    if (document.visibilityState === 'visible') planeSync(0);
  }, INTERVALL_MS);
  planeSync(0);
}
