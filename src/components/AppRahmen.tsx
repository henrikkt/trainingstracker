import { NavLink, Outlet } from 'react-router';
import { NAV_ZIELE } from './navigation.ts';
import { UpdateHinweis } from './UpdateHinweis.tsx';
import { VerbindungsStatus } from './VerbindungsStatus.tsx';

/**
 * Grundlayout: Handy = Inhalt + Tab-Leiste unten (Daumenreichweite),
 * ab md = schmale Seitenleiste links, Inhalt mittig.
 */
export function AppRahmen() {
  return (
    <div className="min-h-dvh md:flex">
      <nav
        aria-label="Hauptnavigation"
        className="pb-sicher fixed inset-x-0 bottom-0 z-20 border-t border-linie bg-grund/95 backdrop-blur md:sticky md:top-0 md:h-dvh md:w-28 md:shrink-0 md:border-t-0 md:border-r md:pb-0"
      >
        <div className="hidden px-3 pt-6 pb-8 md:block">
          <span className="font-display text-3xl font-extrabold tracking-tight">
            Stemm<span className="text-akzent">.</span>
          </span>
        </div>
        <ul className="mx-auto grid max-w-lg grid-cols-4 md:flex md:flex-col md:gap-2 md:px-2">
          {NAV_ZIELE.map(({ pfad, titel, icon: Icon }) => (
            <li key={pfad}>
              <NavLink
                to={pfad}
                className={({ isActive }) =>
                  [
                    'group flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-semibold transition-colors',
                    'md:rounded-2xl md:py-3',
                    isActive ? 'text-akzent' : 'text-text-leise hover:text-text',
                  ].join(' ')
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={[
                        'flex h-8 w-14 items-center justify-center rounded-full transition-colors',
                        isActive ? 'bg-akzent text-akzent-text' : 'group-hover:bg-flaeche-hoch',
                      ].join(' ')}
                    >
                      <Icon aria-hidden size={22} strokeWidth={isActive ? 2.5 : 2} />
                    </span>
                    {titel}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex min-w-0 flex-1 flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
        <VerbindungsStatus />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 md:px-8">
          <Outlet />
        </main>
      </div>

      <UpdateHinweis />
    </div>
  );
}
