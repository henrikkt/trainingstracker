import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Vollbild-Fenster (auf dem Handy wie eine eigene Seite, auf dem Desktop mittig).
 * Escape schließt; der Fokus springt beim Öffnen hinein.
 */
export function Vollbild({ titel, onSchliessen, children, fuss }: { titel: string; onSchliessen: () => void; children: ReactNode; fuss?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  // Aktuellen Callback merken, damit der Effekt nur beim Öffnen/Schließen läuft (nicht bei jedem Rendern)
  const schliessenRef = useRef(onSchliessen);
  useEffect(() => {
    schliessenRef.current = onSchliessen;
  });

  useEffect(() => {
    const vorher = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const taste = (e: KeyboardEvent) => {
      if (e.key === 'Escape') schliessenRef.current();
    };
    document.addEventListener('keydown', taste);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', taste);
      document.body.style.overflow = '';
      vorher?.focus();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-40 flex bg-grund/80 md:items-center md:justify-center md:p-6">
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={titel}
        className="flex h-dvh w-full flex-col bg-grund outline-none md:h-[min(90dvh,48rem)] md:max-w-xl md:rounded-3xl md:border md:border-linie"
      >
        <header className="pt-sicher flex items-center gap-2 border-b border-linie px-2 pb-2 md:pt-2">
          <button type="button" onClick={onSchliessen} aria-label="Schließen" className="flex h-12 w-12 items-center justify-center rounded-2xl hover:bg-flaeche-hoch">
            <X aria-hidden size={24} />
          </button>
          <h2 className="font-display text-2xl font-bold">{titel}</h2>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
        {fuss && <footer className="pb-sicher border-t border-linie p-3">{fuss}</footer>}
      </div>
    </div>
  );
}
