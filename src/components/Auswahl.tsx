import { useId, type ReactNode } from 'react';

interface SegmentProps<T extends string | number> {
  label: string;
  optionen: readonly { wert: T; text: string }[];
  wert: T;
  onChange: (wert: T) => void;
  /** Beschriftung nur für Screenreader (spart Platz, wenn der Zusammenhang klar ist) */
  labelVersteckt?: boolean;
}

/** Umschalter mit 2–4 Optionen (Radio-Gruppe). */
export function Segment<T extends string | number>({ label, optionen, wert, onChange, labelVersteckt }: SegmentProps<T>) {
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className={labelVersteckt ? "sr-only" : "mb-1 text-sm font-semibold text-text-leise"}>{label}</legend>
      <div role="radiogroup" aria-label={label} className="flex gap-1 rounded-2xl bg-grund p-1">
        {optionen.map((o) => {
          const aktiv = o.wert === wert;
          return (
            <button
              key={String(o.wert)}
              type="button"
              role="radio"
              aria-checked={aktiv}
              onClick={() => onChange(o.wert)}
              className={`min-h-11 flex-1 rounded-xl px-3 text-sm font-bold transition-colors ${
                aktiv ? 'bg-akzent text-akzent-text' : 'text-text-leise hover:text-text'
              }`}
            >
              {o.text}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Auswahl-Chip (Filter oder Mehrfachauswahl). */
export function Chip({ aktiv, onClick, children }: { aktiv: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={aktiv}
      onClick={onClick}
      className={`min-h-11 min-w-11 shrink-0 rounded-full border px-4 text-sm font-semibold whitespace-nowrap transition-colors ${
        aktiv ? 'border-akzent bg-akzent text-akzent-text' : 'border-linie bg-flaeche text-text-leise hover:text-text'
      }`}
    >
      {children}
    </button>
  );
}

/** Native Auswahlliste im App-Stil. */
export function AuswahlFeld<T extends string>({
  label,
  wert,
  optionen,
  onChange,
}: {
  label: string;
  wert: T;
  optionen: readonly { wert: T; text: string }[];
  onChange: (wert: T) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-semibold text-text-leise">
        {label}
      </label>
      <select
        id={id}
        value={wert}
        onChange={(e) => onChange(e.target.value as T)}
        className="min-h-12 rounded-2xl border border-linie bg-grund px-4 text-base text-text outline-none focus:border-akzent"
      >
        {optionen.map((o) => (
          <option key={o.wert} value={o.wert}>
            {o.text}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Einzeiliges Textfeld im App-Stil. */
export function TextFeld({
  label,
  wert,
  onChange,
  platzhalter,
  autoFocus,
  typ = 'text',
  autoComplete = 'off',
  maxLaenge = 80,
}: {
  label: string;
  wert: string;
  onChange: (wert: string) => void;
  platzhalter?: string;
  autoFocus?: boolean;
  typ?: 'text' | 'email' | 'password';
  /** z. B. "email", "current-password", "new-password" – hilft Passwortmanagern */
  autoComplete?: string;
  maxLaenge?: number;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-semibold text-text-leise">
        {label}
      </label>
      <input
        id={id}
        type={typ}
        value={wert}
        onChange={(e) => onChange(e.target.value)}
        placeholder={platzhalter}
        autoFocus={autoFocus}
        maxLength={maxLaenge}
        autoComplete={autoComplete}
        autoCapitalize={typ === 'text' ? undefined : 'none'}
        spellCheck={typ === 'text' ? undefined : false}
        className="min-h-12 rounded-2xl border border-linie bg-grund px-4 text-base text-text outline-none placeholder:text-text-leise focus:border-akzent"
      />
    </div>
  );
}
