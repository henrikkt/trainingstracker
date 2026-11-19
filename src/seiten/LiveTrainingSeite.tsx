import { Flag, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { SyncPunkt } from '../components/SyncAnzeige.tsx';
import { PausenLeiste } from '../components/training/PausenLeiste.tsx';
import { UebungImTraining } from '../components/training/UebungImTraining.tsx';
import { Knopf } from '../components/ui.tsx';
import { UebungsAuswahl } from '../components/UebungsAuswahl.tsx';
import { useAlleUebungsEinstellungen, useProfil, useTrainings, useUebungsNachschlag } from '../daten/hooks.ts';
import { jetzt, loescheTraining, speichereTraining } from '../daten/repo.ts';
import {
  abschliessen,
  aendereGewicht,
  aendereSatz,
  ersetzeUebung,
  naechsterOffenerSatz,
  neueTrainingsUebung,
  offeneSaetze,
  planeUebung,
  satzEntfernen,
  satzHinzufuegen,
  setzeErledigt,
  uebungEntfernen,
  type SatzPosition,
} from '../domain/training.ts';
import type { Training } from '../domain/typen.ts';
import { entsperreTon, useJetzt, useWakeLock } from '../lib/geraet.ts';
import { formatiereUhr } from '../lib/format.ts';
import { beendePause, startePause } from '../lib/pause.ts';

/**
 * Laufendes Training. Jede Eingabe wird sofort in IndexedDB gespeichert – Neuladen, App schließen
 * oder leerer Akku verlieren nichts; beim nächsten Öffnen geht es an derselben Stelle weiter.
 */
export function LiveTrainingSeite() {
  const trainings = useTrainings();
  const nachschlag = useUebungsNachschlag();
  const einstellungen = useAlleUebungsEinstellungen();
  const profil = useProfil();
  const navigate = useNavigate();
  const uhr = useJetzt(1000);

  const laufend = trainings?.find((t) => !t.ende);
  const [entwurf, setEntwurf] = useState<Training | null>(null);
  const [aktiv, setAktiv] = useState<SatzPosition | null>(null);
  const [auswahlOffen, setAuswahlOffen] = useState(false);

  // Entwurf einmalig aus der Datenbank übernehmen; danach führt der Entwurf (schnelle Eingaben gehen nicht verloren)
  useEffect(() => {
    if (laufend && entwurf?.id !== laufend.id) {
      setEntwurf(laufend);
      setAktiv(naechsterOffenerSatz(laufend));
    }
  }, [laufend, entwurf?.id]);

  useWakeLock(Boolean(entwurf));

  if (trainings === undefined) return null;
  if (!entwurf) return laufend ? null : <Navigate to="/training" replace />;

  const aendern = (t: Training) => {
    setEntwurf(t);
    void speichereTraining(t);
  };
  const planFuer = (index: number) => {
    const ue = entwurf.uebungen[index]!;
    const uebung = nachschlag(ue.uebungId);
    return uebung ? planeUebung(uebung, { trainings, profil, einstellung: einstellungen.get(uebung.id), ziel: ue.ziel, ausserTrainingId: entwurf.id }) : undefined;
  };

  const abhaken = (u: number, s: number) => {
    entsperreTon(); // Nutzer-Geste: erlaubt den Ton am Pausenende
    const ue = entwurf.uebungen[u]!;
    const warErledigt = ue.saetze[s]!.erledigt;
    const neu = ersetzeUebung(entwurf, u, setzeErledigt(ue, s, !warErledigt, jetzt()));
    aendern(neu);
    if (!warErledigt) {
      startePause(planFuer(u)?.pauseSek ?? profil.pauseSek);
      setAktiv(naechsterOffenerSatz(neu, { uebung: u, satz: s }));
    }
  };

  const beenden = async () => {
    const erledigt = entwurf.uebungen.reduce((n, ue) => n + ue.saetze.filter((s) => s.erledigt).length, 0);
    if (erledigt === 0) {
      if (!window.confirm('Noch kein Satz abgehakt. Training verwerfen?')) return;
      await loescheTraining(entwurf.id);
      beendePause();
      navigate('/training', { replace: true });
      return;
    }
    const offen = offeneSaetze(entwurf);
    if (offen > 0 && !window.confirm(`${offen} ${offen === 1 ? 'Satz ist' : 'Sätze sind'} nicht abgehakt und ${offen === 1 ? 'wird' : 'werden'} nicht gespeichert. Training beenden?`)) return;
    const fertig = abschliessen(entwurf, jetzt());
    await speichereTraining(fertig);
    beendePause();
    navigate(`/training/${fertig.id}?neu=1`, { replace: true });
  };

  const verwerfen = async () => {
    if (!window.confirm('Training wirklich verwerfen? Alle Eingaben gehen verloren.')) return;
    await loescheTraining(entwurf.id);
    beendePause();
    navigate('/training', { replace: true });
  };

  const dauerSek = (uhr - Date.parse(entwurf.start)) / 1000;

  return (
    <>
      <header className="pt-sicher sticky top-0 z-20 -mx-4 flex items-center gap-3 border-b border-linie bg-grund px-4 pb-3 md:-mx-8 md:px-8 md:pt-6">
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-3xl font-extrabold uppercase">{entwurf.titel ?? 'Training'}</h1>
          <p className="text-sm text-text-leise tabular-nums" aria-label="Trainingsdauer">
            {formatiereUhr(dauerSek)}
          </p>
        </div>
        <SyncPunkt />
        <Knopf icon={Flag} onClick={() => void beenden()}>
          Beenden
        </Knopf>
      </header>

      <div className="flex flex-col gap-4 pt-4 pb-28">
        {entwurf.uebungen.length === 0 && <p className="py-6 text-center text-text-leise">Füg deine erste Übung hinzu.</p>}
        {entwurf.uebungen.map((ue, u) => (
          <UebungImTraining
            key={`${ue.uebungId}-${u}`}
            ue={ue}
            uebung={nachschlag(ue.uebungId)}
            plan={planFuer(u)}
            profil={profil}
            aktiverSatz={aktiv?.uebung === u ? aktiv.satz : null}
            onAktivieren={(satz) => setAktiv(satz === null ? null : { uebung: u, satz })}
            onSatzAendern={(s, a) => {
              const { gewicht, ...rest } = a;
              let neu = gewicht !== undefined ? aendereGewicht(ue, s, gewicht) : ue;
              if (Object.keys(rest).length > 0) neu = aendereSatz(neu, s, rest);
              aendern(ersetzeUebung(entwurf, u, neu));
            }}
            onAbhaken={(s) => abhaken(u, s)}
            onSatzHinzufuegen={() => {
              aendern(ersetzeUebung(entwurf, u, satzHinzufuegen(ue)));
              setAktiv({ uebung: u, satz: ue.saetze.length });
            }}
            onSatzEntfernen={(s) => {
              aendern(ersetzeUebung(entwurf, u, satzEntfernen(ue, s)));
              setAktiv(null);
            }}
            onUebungEntfernen={() => {
              const erledigt = ue.saetze.some((s) => s.erledigt);
              if (erledigt && !window.confirm(`${nachschlag(ue.uebungId)?.name ?? 'Übung'} mit abgehakten Sätzen entfernen?`)) return;
              aendern(uebungEntfernen(entwurf, u));
              setAktiv(null);
            }}
          />
        ))}

        <Knopf gross variante="sekundaer" icon={Plus} onClick={() => setAuswahlOffen(true)}>
          Übung hinzufügen
        </Knopf>
        <Knopf variante="leise" icon={Trash2} className="text-fehler!" onClick={() => void verwerfen()}>
          Training verwerfen
        </Knopf>
      </div>

      <PausenLeiste />

      {auswahlOffen && (
        <UebungsAuswahl
          onSchliessen={() => setAuswahlOffen(false)}
          onFertig={(ids) => {
            const neue = ids.flatMap((id) => {
              const uebung = nachschlag(id);
              if (!uebung) return [];
              const plan = planeUebung(uebung, { trainings, profil, einstellung: einstellungen.get(id), ausserTrainingId: entwurf.id });
              return [neueTrainingsUebung(id, plan)];
            });
            const neu = { ...entwurf, uebungen: [...entwurf.uebungen, ...neue] };
            aendern(neu);
            setAktiv(neue.length > 0 ? { uebung: entwurf.uebungen.length, satz: 0 } : aktiv);
            setAuswahlOffen(false);
          }}
        />
      )}
    </>
  );
}
