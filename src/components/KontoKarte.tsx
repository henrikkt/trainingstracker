import { useLiveQuery } from 'dexie-react-hooks';
import { CloudOff, LogOut, ShieldCheck, UserRound } from 'lucide-react';
import { anzahlAusstehend } from '../daten/repo.ts';
import { abmelden, useSitzung } from '../daten/sitzung.ts';
import { Karte, Knopf } from './ui.tsx';

/** Konto im Profil: angemeldet als … / Abmelden – bzw. Hinweis auf den lokalen Modus. */
export function KontoKarte() {
  const sitzung = useSitzung();
  const ausstehend = useLiveQuery(anzahlAusstehend) ?? 0;

  if (sitzung.status === 'lokal') {
    return (
      <Karte className="flex items-start gap-4">
        <CloudOff aria-hidden className="mt-0.5 shrink-0 text-text-leise" />
        <div>
          <h2 className="font-display text-xl font-bold">Lokaler Modus</h2>
          <p className="mt-1 text-sm text-text-leise">Kein Konto verbunden – alle Daten liegen nur auf diesem Gerät.</p>
        </div>
      </Karte>
    );
  }
  if (sitzung.status !== 'angemeldet') return null;

  const abmeldenMitRueckfrage = async () => {
    const hinweis =
      ausstehend > 0
        ? `${ausstehend} Änderung(en) sind noch nicht mit dem Server synchronisiert. Sie bleiben auf diesem Gerät und werden beim nächsten Anmelden übertragen.\n\nTrotzdem abmelden?`
        : 'Auf diesem Gerät abmelden?';
    if (window.confirm(hinweis)) await abmelden();
  };

  return (
    <Karte className="flex flex-col gap-4">
      <div className="flex items-start gap-4">
        <UserRound aria-hidden className="mt-0.5 shrink-0 text-akzent" />
        <div className="min-w-0">
          <h2 className="font-display text-xl font-bold">Konto</h2>
          <p className="mt-1 truncate text-sm text-text-leise">
            Angemeldet als <span className="font-semibold text-text">{sitzung.nutzer.email}</span>
          </p>
          {sitzung.nutzer.admin && (
            <p className="mt-1 inline-flex items-center gap-1 text-sm text-text-leise">
              <ShieldCheck aria-hidden size={16} className="text-akzent" /> Admin
            </p>
          )}
        </div>
      </div>
      <Knopf variante="sekundaer" icon={LogOut} onClick={() => void abmeldenMitRueckfrage()}>
        Abmelden
      </Knopf>
    </Karte>
  );
}
