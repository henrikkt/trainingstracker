import { useSyncExternalStore } from 'react';

/**
 * Pausentimer. Gespeichert wird der Endzeitpunkt (nicht die Restzeit) – so läuft der Timer nach Neuladen,
 * App-Wechsel oder gesperrtem Bildschirm korrekt weiter. Liegt in localStorage (geräteabhängig, wird nicht synchronisiert).
 */
export interface Pause {
  /** Endzeitpunkt in ms seit 1970 */
  ende: number;
  /** Gesamtdauer in Sekunden (für den Fortschrittsbalken) */
  dauer: number;
  /** Ende wurde bereits per Vibration/Ton gemeldet */
  gemeldet: boolean;
}

const SCHLUESSEL = 'stemm.pause';
const hoerer = new Set<() => void>();

function lesen(): Pause | null {
  try {
    const text = localStorage.getItem(SCHLUESSEL);
    return text ? (JSON.parse(text) as Pause) : null;
  } catch {
    return null;
  }
}

let aktuell: Pause | null = lesen();

function setzen(p: Pause | null): void {
  aktuell = p;
  try {
    if (p) localStorage.setItem(SCHLUESSEL, JSON.stringify(p));
    else localStorage.removeItem(SCHLUESSEL);
  } catch {
    // Privater Modus o. Ä.: Timer funktioniert trotzdem, nur nicht über Neuladen hinweg
  }
  hoerer.forEach((h) => h());
}

/** Restzeit in ganzen Sekunden (aufgerundet, nie negativ). */
export function restSekunden(p: Pause, jetzt: number): number {
  return Math.max(0, Math.ceil((p.ende - jetzt) / 1000));
}

export function startePause(sekunden: number, jetzt = Date.now()): void {
  setzen({ ende: jetzt + sekunden * 1000, dauer: sekunden, gemeldet: false });
}

/** Pause verlängern/verkürzen (z. B. ±15 s). Läuft sie dadurch ab, endet sie. */
export function verschiebePause(deltaSek: number, jetzt = Date.now()): void {
  if (!aktuell) return;
  const ende = aktuell.ende + deltaSek * 1000;
  if (ende <= jetzt) return setzen(null);
  setzen({ ende, dauer: Math.max(1, aktuell.dauer + deltaSek), gemeldet: false });
}

export function markierePauseGemeldet(): void {
  if (aktuell && !aktuell.gemeldet) setzen({ ...aktuell, gemeldet: true });
}

export function beendePause(): void {
  setzen(null);
}

export function usePause(): Pause | null {
  return useSyncExternalStore(
    (h) => {
      hoerer.add(h);
      return () => hoerer.delete(h);
    },
    () => aktuell,
    () => null,
  );
}
