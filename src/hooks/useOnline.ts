import { useSyncExternalStore } from 'react';

function abonnieren(benachrichtigen: () => void): () => void {
  window.addEventListener('online', benachrichtigen);
  window.addEventListener('offline', benachrichtigen);
  return () => {
    window.removeEventListener('online', benachrichtigen);
    window.removeEventListener('offline', benachrichtigen);
  };
}

/** true, solange der Browser eine Netzverbindung meldet (Hinweis, keine Garantie für Erreichbarkeit). */
export function useOnline(): boolean {
  return useSyncExternalStore(
    abonnieren,
    () => navigator.onLine,
    () => true,
  );
}
