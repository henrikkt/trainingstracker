import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { ChevronLeft, type LucideIcon } from 'lucide-react';
import { Link, NavLink } from 'react-router';

type KnopfVariante = 'primaer' | 'sekundaer' | 'leise';

const KNOPF_STIL: Record<KnopfVariante, string> = {
  primaer: 'bg-akzent text-akzent-text hover:brightness-110',
  sekundaer: 'bg-flaeche-hoch text-text border border-linie hover:border-text-leise',
  leise: 'text-text-leise hover:text-text',
};

interface KnopfProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: KnopfVariante;
  gross?: boolean;
  icon?: LucideIcon;
}

/** Button mit großen Touch-Zielen (≥ 48 px, groß = 56 px). */
export function Knopf({ variante = 'primaer', gross = false, icon: Icon, className = '', children, type = 'button', ...rest }: KnopfProps) {
  return (
    <button
      type={type}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-2xl px-5 font-bold transition active:scale-[0.98]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        gross ? 'min-h-14 text-lg' : 'min-h-12',
        KNOPF_STIL[variante],
        className,
      ].join(' ')}
      {...rest}
    >
      {Icon && <Icon aria-hidden size={gross ? 22 : 18} strokeWidth={2.5} />}
      {children}
    </button>
  );
}

export function Karte({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-3xl bg-flaeche p-5 ${className}`}>{children}</section>;
}

/** Seitenkopf mit großer, schmaler Überschrift; optional Zurück-Link und Aktion rechts. */
export function SeitenKopf({ titel, unterzeile, zurueck, aktion }: { titel: string; unterzeile?: string; zurueck?: string; aktion?: ReactNode }) {
  return (
    <header className="pt-sicher pb-5 md:pt-10">
      {zurueck && (
        <Link to={zurueck} className="-ml-2 mb-1 inline-flex min-h-11 items-center gap-1 rounded-xl pr-3 pl-1 text-sm font-semibold text-text-leise hover:text-text">
          <ChevronLeft aria-hidden size={20} /> Zurück
        </Link>
      )}
      <div className="flex items-end gap-3">
        <h1 className="min-w-0 flex-1 font-display text-4xl font-extrabold tracking-tight break-words uppercase">{titel}</h1>
        {aktion}
      </div>
      {unterzeile && <p className="mt-1 text-text-leise">{unterzeile}</p>}
    </header>
  );
}

/** Reiter innerhalb einer Seite (z. B. Vorlagen | Übungen). */
export function Reiter({ ziele }: { ziele: readonly { pfad: string; text: string; ende?: boolean }[] }) {
  return (
    <nav aria-label="Bereich" className="mb-4 flex gap-1 rounded-2xl bg-flaeche p-1">
      {ziele.map((z) => (
        <NavLink
          key={z.pfad}
          to={z.pfad}
          end={z.ende}
          className={({ isActive }) =>
            `flex min-h-11 flex-1 items-center justify-center rounded-xl text-sm font-bold transition-colors ${
              isActive ? 'bg-flaeche-hoch text-text' : 'text-text-leise hover:text-text'
            }`
          }
        >
          {z.text}
        </NavLink>
      ))}
    </nav>
  );
}

/** Runder Icon-Knopf (48 px) mit Pflicht-Beschriftung für Screenreader. */
export function IconKnopf({ icon: Icon, label, onClick, disabled, gefahr }: { icon: LucideIcon; label: string; onClick: () => void; disabled?: boolean; gefahr?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-colors hover:bg-flaeche-hoch disabled:opacity-30 ${
        gefahr ? 'text-fehler' : 'text-text-leise hover:text-text'
      }`}
    >
      <Icon aria-hidden size={22} />
    </button>
  );
}

/** Leerer Zustand mit Icon, Text und optionaler Aktion. */
export function LeererZustand({ icon: Icon, titel, text, children }: { icon: LucideIcon; titel: string; text: string; children?: ReactNode }) {
  return (
    <Karte className="flex flex-col items-center gap-3 py-10 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-flaeche-hoch text-akzent">
        <Icon aria-hidden size={28} />
      </span>
      <h2 className="font-display text-2xl font-bold">{titel}</h2>
      <p className="max-w-xs text-text-leise">{text}</p>
      {children}
    </Karte>
  );
}
