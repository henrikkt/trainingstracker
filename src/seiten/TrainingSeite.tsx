import { CalendarDays, ChevronRight, ClipboardList, Play, Timer } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { Karte, Knopf, LeererZustand, SeitenKopf } from '../components/ui.tsx';
import { useTrainings, useVorlagen } from '../daten/hooks.ts';
import { starteTraining } from '../daten/repo.ts';
import { anzahlErledigterSaetze, trainingsDauerMinuten, trainingsVolumen } from '../domain/kennzahlen.ts';
import type { Vorlage } from '../domain/typen.ts';
import { useJetzt } from '../lib/geraet.ts';
import { formatiereDatum, formatiereDauer, formatiereUhr, formatiereVolumen } from '../lib/format.ts';

export function TrainingSeite() {
  const trainings = useTrainings();
  const vorlagen = useVorlagen();
  const navigate = useNavigate();
  const jetzt = useJetzt(1000);

  const laufend = trainings?.find((t) => !t.ende);
  const abgeschlossen = (trainings ?? []).filter((t) => t.ende).slice(0, 30);

  const starten = async (vorlage?: Vorlage) => {
    await starteTraining(vorlage);
    navigate('/training/laufend');
  };

  return (
    <>
      <SeitenKopf titel="Training" unterzeile={laufend ? 'Dein Training läuft.' : 'Bereit für die nächste Einheit?'} />
      <div className="flex flex-col gap-4 pb-6">
        {laufend ? (
          <Link to="/training/laufend" className="flex items-center gap-4 rounded-3xl border-2 border-akzent bg-flaeche p-5">
            <Timer aria-hidden size={32} className="shrink-0 text-akzent" />
            <span className="min-w-0 flex-1">
              <span className="block font-display text-2xl font-bold">{laufend.titel ?? 'Training'}</span>
              <span className="block text-sm text-text-leise tabular-nums">
                läuft seit {formatiereUhr((jetzt - Date.parse(laufend.start)) / 1000)} · {anzahlErledigterSaetze(laufend)} Sätze erledigt
              </span>
            </span>
            <span className="rounded-2xl bg-akzent px-4 py-3 font-bold text-akzent-text">Fortsetzen</span>
          </Link>
        ) : (
          <Karte className="flex flex-col gap-3">
            <Knopf gross icon={Play} onClick={() => void starten()}>
              Freies Training starten
            </Knopf>
            {vorlagen && vorlagen.length > 0 ? (
              <>
                <h2 className="mt-2 text-sm font-semibold text-text-leise">Aus Vorlage starten</h2>
                <div className="grid gap-2 sm:grid-cols-2">
                  {vorlagen.map((v) => (
                    <Knopf key={v.id} gross variante="sekundaer" icon={ClipboardList} className="justify-start" onClick={() => void starten(v)} aria-label={`Vorlage ${v.name} starten`}>
                      <span className="truncate">{v.name || 'Ohne Namen'}</span>
                    </Knopf>
                  ))}
                </div>
              </>
            ) : (
              <Link to="/plaene" className="text-center text-sm text-text-leise underline underline-offset-4 hover:text-text">
                Vorlage anlegen (Push, Pull, Beine …)
              </Link>
            )}
          </Karte>
        )}

        <h2 className="mt-2 font-display text-2xl font-bold">Letzte Trainings</h2>
        {trainings !== undefined && abgeschlossen.length === 0 ? (
          <LeererZustand icon={CalendarDays} titel="Noch keine Trainings" text="Hier erscheinen deine letzten Einheiten mit Dauer, Volumen und Sätzen." />
        ) : (
          <ul aria-label="Letzte Trainings" className="flex flex-col gap-2">
            {abgeschlossen.map((t) => (
              <li key={t.id}>
                <Link to={`/training/${t.id}`} className="flex items-center gap-3 rounded-2xl bg-flaeche p-4 transition-colors hover:bg-flaeche-hoch">
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold">{t.titel ?? 'Training'}</span>
                    <span className="block text-sm text-text-leise tabular-nums">
                      {formatiereDatum(t.start)} · {formatiereDauer(trainingsDauerMinuten(t))} · {formatiereVolumen(trainingsVolumen(t))} · {anzahlErledigterSaetze(t)} Sätze
                    </span>
                  </span>
                  <ChevronRight aria-hidden className="shrink-0 text-text-leise" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
