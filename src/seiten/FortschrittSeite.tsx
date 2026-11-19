import { ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Karte, LeererZustand, Reiter, SeitenKopf } from '../components/ui.tsx';
import { useTrainings, useUebungsNachschlag } from '../daten/hooks.ts';
import { kalenderWochen, tagesSchluessel, trainingsNachTag, wochenStart } from '../domain/fortschritt.ts';
import { anzahlErledigterSaetze, isoWoche, trainingsVolumen, wochenVolumenProMuskelgruppe } from '../domain/kennzahlen.ts';
import { MUSKELGRUPPEN, MUSKELGRUPPEN_NAMEN, type Uebung } from '../domain/typen.ts';
import { formatiereVolumen, formatiereZahl } from '../lib/format.ts';

export const FORTSCHRITT_REITER = [
  { pfad: '/fortschritt', text: 'Übersicht', ende: true },
  { pfad: '/fortschritt/uebungen', text: 'Übungen' },
  { pfad: '/fortschritt/koerpergewicht', text: 'Körper' },
] as const;

const WOCHENTAGE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const monatsName = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' });
const tagMonat = (d: Date) => `${d.getDate()}.${d.getMonth() + 1}.`;
const tagName = { format: (d: Date) => `${d.getDate()}. ${new Intl.DateTimeFormat('de-DE', { month: 'long' }).format(d)}, ${new Intl.DateTimeFormat('de-DE', { weekday: 'long' }).format(d)}` };

function NavKnopf({ richtung, label, onClick }: { richtung: 'zurueck' | 'vor'; label: string; onClick: () => void }) {
  const Icon = richtung === 'zurueck' ? ChevronLeft : ChevronRight;
  return (
    <button type="button" aria-label={label} onClick={onClick} className="flex h-12 w-12 items-center justify-center rounded-2xl text-text-leise hover:bg-flaeche-hoch hover:text-text">
      <Icon aria-hidden size={24} />
    </button>
  );
}

/** Übersicht: diese Woche, Trainingskalender, Wochen-Volumen pro Muskelgruppe. */
export function FortschrittSeite() {
  const trainings = useTrainings();
  const nachschlag = useUebungsNachschlag();
  const heute = new Date();
  const [monat, setMonat] = useState({ jahr: heute.getFullYear(), monat: heute.getMonth() });
  const [gewaehlterTag, setGewaehlterTag] = useState<string | null>(null);
  const [woche, setWoche] = useState(() => wochenStart(heute));

  const abgeschlossen = useMemo(() => (trainings ?? []).filter((t) => t.ende), [trainings]);
  const nachTag = useMemo(() => trainingsNachTag(abgeschlossen), [abgeschlossen]);
  // Eigene Übungen (auch gelöschte) mitgeben, damit ihre Sätze der richtigen Muskelgruppe zugerechnet werden
  const volumenNachWoche = useMemo(() => {
    const ids = new Set(abgeschlossen.flatMap((t) => t.uebungen.map((u) => u.uebungId)));
    const eigene = [...ids].map(nachschlag).filter((u): u is Uebung => Boolean(u?.eigene));
    return wochenVolumenProMuskelgruppe(abgeschlossen, eigene);
  }, [abgeschlossen, nachschlag]);

  if (trainings === undefined) return null;

  const dieseWoche = abgeschlossen.filter((t) => isoWoche(new Date(t.start)) === isoWoche(heute));
  const wochen = kalenderWochen(monat.jahr, monat.monat);
  const heuteSchluessel = tagesSchluessel(heute);
  const tagesTrainings = gewaehlterTag ? (nachTag.get(gewaehlterTag) ?? []) : [];

  const wochenEnde = new Date(woche.getFullYear(), woche.getMonth(), woche.getDate() + 6);
  const kw = isoWoche(woche);
  const muskeln = volumenNachWoche.get(kw);
  const zeilen = MUSKELGRUPPEN.map((m) => ({ m, ...(muskeln?.[m] ?? { saetze: 0, volumen: 0 }) }))
    .filter((z) => z.saetze > 0)
    .sort((a, b) => b.saetze - a.saetze);
  const maxSaetze = Math.max(1, ...zeilen.map((z) => z.saetze));

  const verschiebeMonat = (d: number) => {
    const neu = new Date(monat.jahr, monat.monat + d, 1);
    setMonat({ jahr: neu.getFullYear(), monat: neu.getMonth() });
    setGewaehlterTag(null);
  };

  return (
    <>
      <SeitenKopf titel="Fortschritt" unterzeile="Rekorde, Verlauf und Volumen pro Muskelgruppe." />
      <Reiter ziele={FORTSCHRITT_REITER} />

      {abgeschlossen.length === 0 ? (
        <LeererZustand icon={TrendingUp} titel="Noch nichts zu sehen" text="Nach deinen ersten Trainings findest du hier Kalender, Diagramme und persönliche Rekorde." />
      ) : (
        <div className="flex flex-col gap-4 pb-6">
          <section aria-label="Diese Woche" className="grid grid-cols-3 gap-2">
            {[
              { wert: String(dieseWoche.length), text: dieseWoche.length === 1 ? 'Training' : 'Trainings' },
              { wert: String(dieseWoche.reduce((n, t) => n + anzahlErledigterSaetze(t), 0)), text: 'Sätze' },
              { wert: formatiereVolumen(dieseWoche.reduce((n, t) => n + trainingsVolumen(t), 0)), text: 'Volumen' },
            ].map((k) => (
              <div key={k.text} className="flex flex-col items-center rounded-2xl bg-flaeche p-3 text-center">
                <span className="font-display text-2xl font-bold tabular-nums">{k.wert}</span>
                <span className="text-xs text-text-leise">{k.text} diese Woche</span>
              </div>
            ))}
          </section>

          <Karte className="flex flex-col gap-3 px-3! py-4! sm:px-4!">
            <div className="flex items-center">
              <NavKnopf richtung="zurueck" label="Voriger Monat" onClick={() => verschiebeMonat(-1)} />
              <h2 className="flex-1 text-center font-display text-2xl font-bold" aria-live="polite">
                {monatsName.format(new Date(monat.jahr, monat.monat, 1))}
              </h2>
              <NavKnopf richtung="vor" label="Nächster Monat" onClick={() => verschiebeMonat(1)} />
            </div>
            <div role="grid" aria-label="Trainingskalender" className="grid grid-cols-7 gap-y-1 text-center sm:gap-x-1">
              <div role="row" className="contents">
                {WOCHENTAGE.map((w) => (
                  <span key={w} role="columnheader" className="py-1 text-xs font-semibold text-text-leise">
                    {w}
                  </span>
                ))}
              </div>
              {wochen.map((w) => (
                <div role="row" key={tagesSchluessel(w[0]!)} className="contents">
                  {w.map((tag) => {
                    const schluessel = tagesSchluessel(tag);
                    const anzahl = nachTag.get(schluessel)?.length ?? 0;
                    const imMonat = tag.getMonth() === monat.monat;
                    const istHeute = schluessel === heuteSchluessel;
                    const gewaehlt = schluessel === gewaehlterTag;
                    // Name beginnt mit der sichtbaren Zahl (WCAG 2.5.3 „Label in Name“), z. B. „1. November, Sonntag, 1 Training“
                    const label = `${tagName.format(tag)}${anzahl > 0 ? `, ${anzahl} ${anzahl === 1 ? 'Training' : 'Trainings'}` : ''}`;
                    return (
                      <span role="gridcell" key={schluessel} className="flex justify-center">
                        <button
                          type="button"
                          aria-label={label}
                          aria-pressed={gewaehlt}
                          disabled={anzahl === 0}
                          onClick={() => setGewaehlterTag(gewaehlt ? null : schluessel)}
                          className={[
                            'flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold tabular-nums transition-colors',
                            anzahl > 0 ? 'bg-akzent text-akzent-text' : imMonat ? 'text-text' : 'text-text-leise opacity-50',
                            istHeute && anzahl === 0 ? 'ring-2 ring-text-leise' : '',
                            gewaehlt ? 'ring-2 ring-text ring-offset-2 ring-offset-flaeche' : '',
                          ].join(' ')}
                        >
                          {tag.getDate()}
                        </button>
                      </span>
                    );
                  })}
                </div>
              ))}
            </div>
            {tagesTrainings.length > 0 && (
              <ul aria-label="Trainings am gewählten Tag" className="flex flex-col gap-2">
                {tagesTrainings.map((t) => (
                  <li key={t.id}>
                    <Link to={`/training/${t.id}`} className="flex items-center justify-between rounded-2xl bg-grund px-4 py-3 hover:bg-flaeche-hoch">
                      <span className="font-semibold">{t.titel ?? 'Training'}</span>
                      <span className="text-sm text-text-leise tabular-nums">
                        {anzahlErledigterSaetze(t)} Sätze · {formatiereVolumen(trainingsVolumen(t))}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Karte>

          <Karte className="flex flex-col gap-3 p-4!">
            <div className="flex items-center">
              <NavKnopf richtung="zurueck" label="Vorige Woche" onClick={() => setWoche(new Date(woche.getFullYear(), woche.getMonth(), woche.getDate() - 7))} />
              <div className="flex-1 text-center">
                <h2 className="font-display text-2xl font-bold">Volumen pro Muskel</h2>
                <p className="text-sm text-text-leise" aria-live="polite">
                  KW {Number(kw.slice(-2))} · {tagMonat(woche)}–{tagMonat(wochenEnde)}
                </p>
              </div>
              <NavKnopf richtung="vor" label="Nächste Woche" onClick={() => setWoche(new Date(woche.getFullYear(), woche.getMonth(), woche.getDate() + 7))} />
            </div>
            {zeilen.length === 0 ? (
              <p className="py-4 text-center text-sm text-text-leise">Keine Trainings in dieser Woche.</p>
            ) : (
              <ul aria-label="Arbeitssätze pro Muskelgruppe" className="flex flex-col gap-2">
                {zeilen.map((z) => (
                  <li key={z.m} className="grid grid-cols-[6.5rem_1fr] items-center gap-3">
                    <span className="truncate text-sm font-semibold">{MUSKELGRUPPEN_NAMEN[z.m]}</span>
                    <span className="flex flex-col gap-0.5">
                      <span className="h-3 rounded-r bg-akzent" style={{ width: `${(z.saetze / maxSaetze) * 100}%` }} aria-hidden />
                      <span className="text-xs text-text-leise tabular-nums">
                        {formatiereZahl(z.saetze)} Sätze{z.volumen > 0 ? ` · ${formatiereVolumen(z.volumen)}` : ''}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-text-leise">Nebenmuskeln zählen mit einem halben Satz.</p>
          </Karte>
        </div>
      )}
    </>
  );
}
