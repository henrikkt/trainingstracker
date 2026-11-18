import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

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

/** Seitenkopf mit großer, schmaler Überschrift. */
export function SeitenKopf({ titel, unterzeile }: { titel: string; unterzeile?: string }) {
  return (
    <header className="pt-sicher pb-5 md:pt-10">
      <h1 className="font-display text-4xl font-extrabold tracking-tight uppercase">{titel}</h1>
      {unterzeile && <p className="mt-1 text-text-leise">{unterzeile}</p>}
    </header>
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
