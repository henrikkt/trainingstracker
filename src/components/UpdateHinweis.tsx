import { useRegisterSW } from 'virtual:pwa-register/react';
import { Knopf } from './ui.tsx';

/** Meldet eine neue App-Version. Aktualisiert wird nur auf Wunsch – nie automatisch mitten im Training. */
export function UpdateHinweis() {
  const {
    needRefresh: [updateDa, setUpdateDa],
    updateServiceWorker,
  } = useRegisterSW();

  if (!updateDa) return null;
  return (
    <div
      role="alert"
      className="fixed inset-x-4 bottom-[calc(5rem+var(--sicher-unten))] z-30 mx-auto flex max-w-lg items-center gap-3 rounded-2xl border border-linie bg-flaeche-hoch p-3 shadow-2xl md:bottom-6"
    >
      <p className="flex-1 pl-1 text-sm">Neue Version verfügbar.</p>
      <Knopf variante="leise" onClick={() => setUpdateDa(false)}>
        Später
      </Knopf>
      <Knopf onClick={() => void updateServiceWorker(true)}>Aktualisieren</Knopf>
    </div>
  );
}
