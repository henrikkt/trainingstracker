import { Minus, Plus } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { begrenze } from '../domain/einstellungen.ts';
import { formatiereZahl, parseZahl, runde2 } from '../lib/format.ts';

interface StepperProps {
  label: string;
  wert: number;
  onChange: (wert: number) => void;
  schritt?: number;
  min?: number;
  max?: number;
  /** Einheit hinter dem Wert, z. B. "kg" */
  einheit?: string;
  /** Beschriftung sichtbar (sonst nur für Screenreader) */
  labelSichtbar?: boolean;
  gross?: boolean;
}

/**
 * Zahleneingabe mit großen –/+-Knöpfen (einhändig bedienbar). Der Wert in der Mitte ist zusätzlich
 * direkt editierbar (Dezimalkomma erlaubt); übernommen wird beim Verlassen des Feldes oder mit Enter.
 */
export function Stepper({ label, wert, onChange, schritt = 1, min = 0, max = 9999, einheit, labelSichtbar = true, gross = false }: StepperProps) {
  const id = useId();
  const [text, setText] = useState(formatiereZahl(wert));
  useEffect(() => setText(formatiereZahl(wert)), [wert]);

  const setze = (neu: number) => onChange(runde2(begrenze(neu, min, max)));
  const uebernehmen = () => {
    const n = parseZahl(text);
    if (n === null) setText(formatiereZahl(wert));
    else setze(n);
  };

  const knopf = gross ? 'h-14 w-14' : 'h-12 w-12';
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className={labelSichtbar ? 'text-sm font-semibold text-text-leise' : 'sr-only'}>
        {label}
      </label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`${label} verringern`}
          disabled={wert <= min}
          onClick={() => setze(wert - schritt)}
          className={`${knopf} flex shrink-0 items-center justify-center rounded-2xl bg-flaeche-hoch text-text active:scale-95 disabled:opacity-40`}
        >
          <Minus aria-hidden size={22} strokeWidth={2.5} />
        </button>
        <div className="relative min-w-0 flex-1">
          <input
            id={id}
            inputMode="decimal"
            enterKeyHint="done"
            autoComplete="off"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={uebernehmen}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
            }}
            onFocus={(e) => e.currentTarget.select()}
            className={`w-full rounded-2xl border border-linie bg-grund text-center font-display font-bold tabular-nums outline-none focus:border-akzent ${
              gross ? 'h-14 text-3xl' : 'h-12 text-2xl'
            } ${einheit ? 'pr-8' : ''}`}
          />
          {einheit && <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-text-leise">{einheit}</span>}
        </div>
        <button
          type="button"
          aria-label={`${label} erhöhen`}
          disabled={wert >= max}
          onClick={() => setze(wert + schritt)}
          className={`${knopf} flex shrink-0 items-center justify-center rounded-2xl bg-flaeche-hoch text-text active:scale-95 disabled:opacity-40`}
        >
          <Plus aria-hidden size={22} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
