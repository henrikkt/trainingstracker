import { Check, ChevronDown, Lightbulb, MessageSquare, Pencil, Plus, SlidersHorizontal, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { fasseSaetzeZusammen } from '../../domain/letztesMal.ts';
import type { UebungsPlan } from '../../domain/training.ts';
import type { Intensitaet, ProfilEinstellungen, Satz, TrainingsUebung, Uebung } from '../../domain/typen.ts';
import { formatiereGewicht, formatiereKurzDatum, formatiereZahl } from '../../lib/format.ts';
import { bereinigeNotiz, NOTIZ_MAX } from '../../domain/foto.ts';
import { scrollZiel } from '../../lib/scrollen.ts';
import { Chip, TextFeld } from '../Auswahl.tsx';
import { FotoKnopf } from '../Foto.tsx';
import { Stepper } from '../Stepper.tsx';
import { IconKnopf, Karte, Knopf } from '../ui.tsx';

const RIR_WERTE = [0, 1, 2, 3, 4, 5] as const;
const RPE_WERTE = [6, 7, 7.5, 8, 8.5, 9, 9.5, 10] as const;

interface Props {
  ue: TrainingsUebung;
  uebung: Uebung | undefined;
  plan: UebungsPlan | undefined;
  profil: ProfilEinstellungen;
  /** Index des aufgeklappten Satzes in dieser Übung (oder null) */
  aktiverSatz: number | null;
  onAktivieren: (satz: number | null) => void;
  onSatzAendern: (satz: number, aenderung: Partial<Satz>) => void;
  onAbhaken: (satz: number) => void;
  onSatzHinzufuegen: () => void;
  onSatzEntfernen: (satz: number) => void;
  onUebungEntfernen: () => void;
  /** Foto der Maschine (eigenes oder aus dem Katalog) */
  foto?: string;
  /** Einstellungsnotiz der Übung, z. B. „Sitz Stufe 4“ */
  notiz?: string;
  onNotizAendern: (notiz: string | undefined) => void;
  /** Position der Übung im Training (für den Sprung aus der Leiste „Jetzt dran“) */
  index: number;
}

function satzText(s: Satz, intensitaet: Intensitaet): string {
  const basis = s.gewicht > 0 ? `${formatiereGewicht(s.gewicht)} × ${s.wdh}` : `${s.wdh} Wdh.`;
  const zusatz = intensitaet === 'rir' && s.rir !== undefined ? ` · RIR ${s.rir}` : intensitaet === 'rpe' && s.rpe !== undefined ? ` · RPE ${formatiereZahl(s.rpe)}` : '';
  return basis + zusatz;
}

/** Eine Übung im laufenden Training: „Letztes Mal“, Vorschlag, Sätze. */
export function UebungImTraining({ ue, uebung, plan, profil, aktiverSatz, onAktivieren, onSatzAendern, onAbhaken, onSatzHinzufuegen, onSatzEntfernen, onUebungEntfernen, foto, notiz, onNotizAendern, index }: Props) {
  const [notizOffen, setNotizOffen] = useState(false);
  const name = uebung?.name ?? 'Unbekannte Übung';
  const erledigt = ue.saetze.filter((s) => s.erledigt).length;
  const v = plan?.vorschlag;

  return (
    <Karte className="flex flex-col gap-3 p-4!" data-uebungskarte={index}>
      <div className="flex items-start gap-2">
        {foto && <FotoKnopf src={foto} name={name} />}
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-2xl leading-tight font-bold">{name}</h2>
          <p className="text-sm text-text-leise tabular-nums">
            {erledigt}/{ue.saetze.length} Sätze
            {ue.ziel && ` · Ziel ${ue.ziel.saetze} × ${ue.ziel.wdh.min}–${ue.ziel.wdh.max}`}
          </p>
        </div>
        {!notiz && !notizOffen && <IconKnopf icon={SlidersHorizontal} label={`Einstellung für ${name} notieren`} onClick={() => setNotizOffen(true)} />}
        <IconKnopf icon={Trash2} label={`${name} aus dem Training entfernen`} onClick={onUebungEntfernen} />
      </div>

      {notizOffen ? (
        <NotizEditor
          start={notiz}
          onFertig={(n) => {
            onNotizAendern(n);
            setNotizOffen(false);
          }}
        />
      ) : (
        notiz && (
          <button
            type="button"
            onClick={() => setNotizOffen(true)}
            aria-label={`Einstellung: ${notiz} – bearbeiten`}
            className="flex min-h-12 items-center gap-2 rounded-2xl border border-linie px-3 text-left text-sm"
          >
            <SlidersHorizontal aria-hidden size={16} className="shrink-0 text-akzent" />
            <span className="min-w-0 flex-1 font-semibold">{notiz}</span>
            <Pencil aria-hidden size={16} className="shrink-0 text-text-leise" />
          </button>
        )
      )}

      {plan && (
        <div className="flex flex-col gap-1 rounded-2xl bg-grund p-3 text-sm">
          {plan.frueher.length === 0 ? (
            <p>
              <span className="text-text-leise">Letztes Mal: </span>
              <span className="font-semibold">noch nie gemacht</span>
            </p>
          ) : (
            <div>
              <p className="text-text-leise">{plan.frueher.length === 1 ? 'Letztes Mal:' : `Letzte ${plan.frueher.length} Male:`}</p>
              <ul aria-label={`Frühere Trainings ${name}`} className="flex flex-col">
                {plan.frueher.map((e) => (
                  <li key={e.start} className="flex gap-2 tabular-nums">
                    <span className="w-12 shrink-0 text-text-leise">{formatiereKurzDatum(e.start)}</span>
                    <span className="font-semibold">{fasseSaetzeZusammen(e.saetze)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {v && v.regel !== 'erstes-mal' && (
            <p className="flex items-start gap-1.5">
              <Lightbulb aria-hidden size={16} className="mt-0.5 shrink-0 text-akzent" />
              <span>
                <span className="font-semibold text-akzent tabular-nums">
                  Heute: {v.gewicht !== null && v.gewicht > 0 ? `${formatiereGewicht(v.gewicht)} × ` : ''}
                  {[...new Set(v.wdh)].length === 1 ? v.wdh[0] : v.wdh.join('/')} Wdh.
                </span>{' '}
                <span className="text-text-leise">{v.begruendung}</span>
              </span>
            </p>
          )}
          {v?.regel === 'erstes-mal' && <p className="text-text-leise">{v.begruendung}</p>}
        </div>
      )}

      <ol aria-label={`Sätze ${name}`} className="flex flex-col gap-2">
        {ue.saetze.map((s, i) =>
          i === aktiverSatz ? (
            <li key={i}>
              <SatzEditor
                nummer={i + 1}
                satz={s}
                profil={profil}
                onAendern={(a) => onSatzAendern(i, a)}
                onAbhaken={() => onAbhaken(i)}
                onEntfernen={() => onSatzEntfernen(i)}
                onZuklappen={() => onAktivieren(null)}
              />
            </li>
          ) : (
            <li key={i} className={`flex items-center gap-2 rounded-2xl ${s.erledigt ? 'bg-flaeche-hoch' : 'bg-grund'}`}>
              <button type="button" onClick={() => onAktivieren(i)} className="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-2xl pl-3 text-left">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-flaeche text-sm font-bold text-text-leise">{i + 1}</span>
                <span className={`truncate font-semibold tabular-nums ${s.erledigt ? '' : 'text-text-leise'}`}>{satzText(s, profil.intensitaet)}</span>
                {s.notiz && <MessageSquare aria-label="mit Notiz" size={16} className="shrink-0 text-text-leise" />}
                <span className="sr-only">bearbeiten</span>
              </button>
              <button
                type="button"
                aria-label={s.erledigt ? `Satz ${i + 1} nicht erledigt` : `Satz ${i + 1} abhaken`}
                aria-pressed={s.erledigt}
                onClick={() => onAbhaken(i)}
                className={`mr-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 transition-colors ${
                  s.erledigt ? 'border-akzent bg-akzent text-akzent-text' : 'border-linie text-text-leise hover:border-akzent'
                }`}
              >
                <Check aria-hidden size={24} strokeWidth={3} />
              </button>
            </li>
          ),
        )}
      </ol>

      <Knopf variante="sekundaer" icon={Plus} onClick={onSatzHinzufuegen}>
        Satz hinzufügen
      </Knopf>
    </Karte>
  );
}

/** Aufgeklappter Satz: große Stepper, Anstrengung, Notiz, Abhaken. */
function SatzEditor({
  nummer,
  satz,
  profil,
  onAendern,
  onAbhaken,
  onEntfernen,
  onZuklappen,
}: {
  nummer: number;
  satz: Satz;
  profil: ProfilEinstellungen;
  onAendern: (a: Partial<Satz>) => void;
  onAbhaken: () => void;
  onEntfernen: () => void;
  onZuklappen: () => void;
}) {
  const [notizOffen, setNotizOffen] = useState(Boolean(satz.notiz));
  const ref = useRef<HTMLElement>(null);
  const rir = profil.intensitaet === 'rir';
  const werte: readonly number[] = rir ? RIR_WERTE : RPE_WERTE;
  const aktuell = rir ? satz.rir : satz.rpe;

  // Beim Aufklappen (z. B. automatisch nach dem Abhaken) in den sichtbaren Bereich holen –
  // die Scroll-Ränder halten Abstand zur Kopfzeile oben und zu Pausenleiste/Navigation unten.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Erster Satz einer Übung: möglichst die ganze Karte zeigen (Name, Foto, Einstellung)
    const karte = el.closest('[data-uebungskarte]');
    if (nummer === 1 && karte) {
      const kopf = document.querySelector('[data-kopfleiste]')?.getBoundingClientRect().bottom ?? 0;
      const frei = { oben: kopf + 12, unten: window.innerHeight - (parseFloat(getComputedStyle(el).scrollMarginBottom) || 0) };
      const karteOben = karte.getBoundingClientRect().top;
      if (scrollZiel(true, karteOben, el.getBoundingClientRect().bottom, frei) === 'karte') {
        window.scrollBy({ top: karteOben - frei.oben, behavior: 'smooth' });
        return;
      }
    }
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, []);

  return (
    <section
      ref={ref}
      aria-label={`Satz ${nummer} bearbeiten`}
      className={`flex scroll-mt-52 scroll-mb-44 flex-col gap-3 rounded-2xl border-2 p-3 md:scroll-mb-28 ${satz.erledigt ? 'border-linie' : 'border-akzent'} bg-grund`}
    >
      <div className="-my-1 flex items-center gap-1">
        <span className="flex-1 font-display text-xl font-bold">Satz {nummer}</span>
        <IconKnopf icon={Trash2} label={`Satz ${nummer} löschen`} onClick={onEntfernen} />
        <IconKnopf icon={ChevronDown} label="Zuklappen" onClick={onZuklappen} />
      </div>
      <Stepper label="Gewicht" labelSichtbar={false} einheit="kg" gross wert={satz.gewicht} schritt={profil.gewichtsSchritt} min={0} max={1000} onChange={(gewicht) => onAendern({ gewicht })} />
      <Stepper label="Wiederholungen" labelSichtbar={false} einheit="Wdh." gross wert={satz.wdh} min={0} max={200} onChange={(wdh) => onAendern({ wdh: Math.round(wdh) })} />

      <div role="group" aria-label={rir ? 'RIR (Wiederholungen im Tank), optional' : 'RPE (Anstrengung 1–10), optional'} className="flex items-center gap-2">
        <span className="shrink-0 text-sm font-semibold text-text-leise">{rir ? 'RIR' : 'RPE'}</span>
        <div className="-my-1 flex gap-1.5 overflow-x-auto py-1">
          {werte.map((w) => (
            <Chip key={w} aktiv={aktuell === w} onClick={() => onAendern(rir ? { rir: aktuell === w ? undefined : w } : { rpe: aktuell === w ? undefined : w })}>
              {rir && w === 5 ? '5+' : formatiereZahl(w)}
            </Chip>
          ))}
        </div>
      </div>

      {notizOffen && (
        <div className="flex gap-2">
          <label className="min-w-0 flex-1">
            <span className="sr-only">Notiz</span>
            <input
              value={satz.notiz ?? ''}
              onChange={(e) => onAendern({ notiz: e.target.value })}
              maxLength={200}
              placeholder="Notiz, z. B. Sitz Stufe 4"
              autoFocus={!satz.notiz}
              className="min-h-12 w-full rounded-2xl border border-linie bg-flaeche px-4 outline-none placeholder:text-text-leise focus:border-akzent"
            />
          </label>
          <IconKnopf
            icon={X}
            label="Notiz entfernen"
            onClick={() => {
              onAendern({ notiz: undefined });
              setNotizOffen(false);
            }}
          />
        </div>
      )}

      <div className="flex gap-2">
        {!notizOffen && <IconKnopf icon={MessageSquare} label="Notiz hinzufügen" onClick={() => setNotizOffen(true)} />}
        <Knopf gross icon={Check} variante={satz.erledigt ? 'sekundaer' : 'primaer'} onClick={onAbhaken} className="flex-1">
          {satz.erledigt ? 'Haken entfernen' : 'Satz abhaken'}
        </Knopf>
      </div>
    </section>
  );
}

/** Einstellungsnotiz direkt im Training bearbeiten (gespeichert wird mit „Fertig“). */
function NotizEditor({ start, onFertig }: { start: string | undefined; onFertig: (notiz: string | undefined) => void }) {
  const [text, setText] = useState(start ?? '');
  return (
    <form
      className="flex items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onFertig(bereinigeNotiz(text));
      }}
    >
      <div className="min-w-0 flex-1">
        <TextFeld label="Einstellung an der Maschine" wert={text} onChange={setText} maxLaenge={NOTIZ_MAX} platzhalter="z. B. Sitz Stufe 4" autoFocus />
      </div>
      <Knopf type="submit">Fertig</Knopf>
    </form>
  );
}
