import { ArrowDown, ArrowUp, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { TextFeld } from '../components/Auswahl.tsx';
import { Stepper } from '../components/Stepper.tsx';
import { IconKnopf, Karte, Knopf, SeitenKopf } from '../components/ui.tsx';
import { UebungsAuswahl } from '../components/UebungsAuswahl.tsx';
import { useEigeneUebungen, useVorlage } from '../daten/hooks.ts';
import { loescheVorlage, speichereVorlage } from '../daten/repo.ts';
import { standardZiel } from '../domain/beispielVorlagen.ts';
import { normalisiereWdhBereich } from '../domain/einstellungen.ts';
import { findeUebung } from '../domain/katalog.ts';
import { GERAETE_NAMEN, MUSKELGRUPPEN_NAMEN, type Vorlage, type VorlagenUebung } from '../domain/typen.ts';

/** Vorlage bearbeiten. Jede Änderung wird sofort lokal gespeichert (kein „Speichern“-Knopf nötig). */
export function VorlageSeite() {
  const { id } = useParams();
  const gespeichert = useVorlage(id);
  const eigene = useEigeneUebungen() ?? [];
  const navigate = useNavigate();
  const [entwurf, setEntwurf] = useState<Vorlage | null>(null);
  const [auswahlOffen, setAuswahlOffen] = useState(false);

  // Entwurf einmalig (bzw. bei anderer ID) aus der Datenbank übernehmen – danach führt der Entwurf,
  // damit schnelles Tippen nicht von verzögerten Datenbank-Updates überschrieben wird.
  useEffect(() => {
    if (gespeichert && entwurf?.id !== gespeichert.id) setEntwurf(gespeichert);
  }, [gespeichert, entwurf?.id]);

  if (gespeichert === undefined || (gespeichert && !entwurf)) return null;
  if (gespeichert === null || !entwurf) {
    return (
      <>
        <SeitenKopf titel="Nicht gefunden" zurueck="/plaene" />
        <p className="text-text-leise">Diese Vorlage gibt es nicht (mehr).</p>
      </>
    );
  }

  const aendern = (v: Vorlage) => {
    setEntwurf(v);
    void speichereVorlage(v);
  };
  const aendereUebung = (index: number, neu: VorlagenUebung) => aendern({ ...entwurf, uebungen: entwurf.uebungen.map((u, i) => (i === index ? neu : u)) });
  const verschiebe = (index: number, richtung: -1 | 1) => {
    const liste = [...entwurf.uebungen];
    const ziel = index + richtung;
    [liste[index], liste[ziel]] = [liste[ziel]!, liste[index]!];
    aendern({ ...entwurf, uebungen: liste });
  };
  const entfernen = (index: number) => aendern({ ...entwurf, uebungen: entwurf.uebungen.filter((_, i) => i !== index) });

  const loeschen = async () => {
    if (!window.confirm(`Vorlage „${entwurf.name}“ löschen?`)) return;
    await loescheVorlage(entwurf.id);
    navigate('/plaene', { replace: true });
  };

  return (
    <>
      <SeitenKopf titel={entwurf.name || 'Vorlage'} zurueck="/plaene" />
      <div className="flex flex-col gap-4 pb-6">
        <TextFeld label="Name der Vorlage" wert={entwurf.name} onChange={(name) => aendern({ ...entwurf, name })} platzhalter="z. B. Push" />

        {entwurf.uebungen.length === 0 && <p className="py-4 text-center text-text-leise">Noch keine Übungen – füg welche hinzu.</p>}

        <ol aria-label="Übungen der Vorlage" className="flex flex-col gap-3">
          {entwurf.uebungen.map((vu, i) => {
            const uebung = findeUebung(vu.uebungId, eigene);
            const name = uebung?.name ?? 'Unbekannte Übung';
            return (
              <li key={`${vu.uebungId}-${i}`}>
                <Karte className="flex flex-col gap-3 p-4!">
                  <div className="flex items-start gap-1">
                    <div className="min-w-0 flex-1 pt-1">
                      <h2 className="font-bold">
                        <span className="mr-2 text-text-leise tabular-nums">{i + 1}.</span>
                        {name}
                      </h2>
                      {uebung && (
                        <p className="text-sm text-text-leise">
                          {MUSKELGRUPPEN_NAMEN[uebung.muskel]} · {GERAETE_NAMEN[uebung.geraet]}
                        </p>
                      )}
                    </div>
                    <IconKnopf icon={ArrowUp} label={`${name} nach oben`} disabled={i === 0} onClick={() => verschiebe(i, -1)} />
                    <IconKnopf icon={ArrowDown} label={`${name} nach unten`} disabled={i === entwurf.uebungen.length - 1} onClick={() => verschiebe(i, 1)} />
                    <IconKnopf icon={X} label={`${name} entfernen`} gefahr onClick={() => entfernen(i)} />
                  </div>
                  <Stepper label="Sätze" wert={vu.ziel.saetze} min={1} max={10} onChange={(saetze) => aendereUebung(i, { ...vu, ziel: { ...vu.ziel, saetze } })} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Stepper
                      label="Wdh. von"
                      wert={vu.ziel.wdh.min}
                      min={1}
                      max={100}
                      onChange={(min) => aendereUebung(i, { ...vu, ziel: { ...vu.ziel, wdh: normalisiereWdhBereich({ min, max: Math.max(min, vu.ziel.wdh.max) }) } })}
                    />
                    <Stepper
                      label="Wdh. bis"
                      wert={vu.ziel.wdh.max}
                      min={1}
                      max={100}
                      onChange={(max) => aendereUebung(i, { ...vu, ziel: { ...vu.ziel, wdh: normalisiereWdhBereich({ min: Math.min(vu.ziel.wdh.min, max), max }) } })}
                    />
                  </div>
                </Karte>
              </li>
            );
          })}
        </ol>

        <Knopf gross variante="sekundaer" icon={Plus} onClick={() => setAuswahlOffen(true)}>
          Übungen hinzufügen
        </Knopf>
        <Knopf variante="leise" icon={Trash2} className="text-fehler!" onClick={() => void loeschen()}>
          Vorlage löschen
        </Knopf>
      </div>

      {auswahlOffen && (
        <UebungsAuswahl
          onSchliessen={() => setAuswahlOffen(false)}
          onFertig={(ids) => {
            aendern({ ...entwurf, uebungen: [...entwurf.uebungen, ...ids.map(standardZiel)] });
            setAuswahlOffen(false);
          }}
        />
      )}
    </>
  );
}
