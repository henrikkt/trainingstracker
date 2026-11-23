import { RotateCcw, Trash2, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Segment, TextFeld } from '../components/Auswahl.tsx';
import { FotoBearbeiten } from '../components/Foto.tsx';
import { EigeneUebungFormular } from '../components/EigeneUebungFormular.tsx';
import { Stepper } from '../components/Stepper.tsx';
import { Karte, Knopf, SeitenKopf } from '../components/ui.tsx';
import { useEigeneUebungen, useMeinStudio, useProfil, useUebungsEinstellung } from '../daten/hooks.ts';
import { aktualisiereUebungsEinstellung, loescheEigeneUebung, speichereEigeneUebung } from '../daten/repo.ts';
import { bereinigeNotiz, effektivesFoto, NOTIZ_MAX } from '../domain/foto.ts';
import { effektiveEinstellungen, formatierePause, normalisiereWdhBereich, PAUSE_GRENZEN } from '../domain/einstellungen.ts';
import { findeUebung } from '../domain/katalog.ts';
import { standardSteigerung } from '../domain/steigerung.ts';
import { GERAETE_NAMEN, MUSKELGRUPPEN_NAMEN, type Steigerung, type UebungsEinstellung } from '../domain/typen.ts';
import { formatiereGewicht } from '../lib/format.ts';

const steigerungText = (s: Steigerung) => (s.art === 'gewicht' ? `+${formatiereGewicht(s.kg)}` : `+${s.anzahl} Wdh.`);

/** Details einer Übung mit persönlichen Einstellungen (Steigerung, Wdh.-Bereich, Pause). */
export function UebungSeite() {
  const { id } = useParams();
  const eigene = useEigeneUebungen();
  const einstellung = useUebungsEinstellung(id);
  const profil = useProfil();
  const navigate = useNavigate();
  const studio = useMeinStudio();

  const uebung = id ? findeUebung(id, eigene ?? []) : undefined;
  if (!uebung) {
    if (eigene === undefined) return null; // eigene Übungen laden noch
    return (
      <>
        <SeitenKopf titel="Nicht gefunden" zurueck="/plaene/uebungen" />
        <p className="text-text-leise">Diese Übung gibt es nicht (mehr).</p>
      </>
    );
  }

  const eff = effektiveEinstellungen(uebung, einstellung, profil);
  const standard = effektiveEinstellungen(uebung, undefined, profil);
  const setze = (aenderung: Partial<Omit<UebungsEinstellung, 'uebungId'>>) => void aktualisiereUebungsEinstellung(uebung.id, aenderung);

  const unterzeile = [
    `${MUSKELGRUPPEN_NAMEN[uebung.muskel]} · ${GERAETE_NAMEN[uebung.geraet]}`,
    uebung.nebenMuskeln.length > 0 ? `außerdem ${uebung.nebenMuskeln.map((m) => MUSKELGRUPPEN_NAMEN[m]).join(', ')}` : '',
  ]
    .filter(Boolean)
    .join(' – ');

  return (
    <>
      <SeitenKopf titel={uebung.name} zurueck="/plaene/uebungen" unterzeile={unterzeile} />
      <Link to={`/fortschritt/uebungen/${uebung.id}`} className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-xl text-sm font-semibold text-akzent hover:underline">
        <TrendingUp aria-hidden size={18} /> Verlauf und Rekorde ansehen
      </Link>
      <div className="flex flex-col gap-4 pb-6">
        <Karte className="flex flex-col gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold">Foto und Notiz</h2>
            <p className="text-sm text-text-leise">Gilt dauerhaft für diese Übung (z. B. Einstellung, Ladeposition, Hinweise) und wird in jedem Training angezeigt.</p>
          </div>
          <NotizFeld key={uebung.id} notiz={einstellung?.notiz} onAendern={(notiz) => setze({ notiz })} />
          <FotoBearbeiten
            name={uebung.name}
            foto={effektivesFoto(uebung, einstellung, import.meta.env.BASE_URL)}
            eigenesFoto={Boolean(einstellung?.foto)}
            onFoto={(foto) => setze({ foto })}
          />
        </Karte>

        <Karte className="flex flex-col gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold">Steigerung fürs nächste Mal</h2>
            <p className="text-sm text-text-leise">Standard für diese Übung: {steigerungText(standardSteigerung(uebung))}</p>
          </div>
          <Segment
            label="Steigern über"
            wert={eff.steigerung.art}
            optionen={[
              { wert: 'gewicht', text: 'Gewicht' },
              { wert: 'wdh', text: 'Wiederholungen' },
            ]}
            onChange={(art) => setze({ steigerung: art === 'gewicht' ? { art, kg: 2.5 } : { art, anzahl: 1 } })}
          />
          {eff.steigerung.art === 'gewicht' ? (
            <Stepper label="Steigerung" einheit="kg" wert={eff.steigerung.kg} schritt={0.5} min={0.5} max={50} onChange={(kg) => setze({ steigerung: { art: 'gewicht', kg } })} />
          ) : (
            <Stepper label="Steigerung" einheit="Wdh." wert={eff.steigerung.anzahl} min={1} max={10} onChange={(anzahl) => setze({ steigerung: { art: 'wdh', anzahl } })} />
          )}
        </Karte>

        <Karte className="flex flex-col gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold">Wiederholungsbereich</h2>
            <p className="text-sm text-text-leise">
              Standard: {standard.wdhBereich.min}–{standard.wdhBereich.max}. Gilt für freie Trainings; Vorlagen haben eigene Ziele.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Stepper label="Von" wert={eff.wdhBereich.min} min={1} max={100} onChange={(min) => setze({ wdhBereich: normalisiereWdhBereich({ min, max: Math.max(min, eff.wdhBereich.max) }) })} />
            <Stepper label="Bis" wert={eff.wdhBereich.max} min={1} max={100} onChange={(max) => setze({ wdhBereich: normalisiereWdhBereich({ min: Math.min(eff.wdhBereich.min, max), max }) })} />
          </div>
        </Karte>

        <Karte className="flex flex-col gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold">Pause</h2>
            <p className="text-sm text-text-leise">
              {formatierePause(eff.pauseSek)} · Standard aus dem Profil: {formatierePause(profil.pauseSek)}
            </p>
          </div>
          <Stepper label="Pause in Sekunden" einheit="s" wert={eff.pauseSek} schritt={PAUSE_GRENZEN.schritt} min={PAUSE_GRENZEN.min} max={PAUSE_GRENZEN.max} onChange={(pauseSek) => setze({ pauseSek })} />
        </Karte>

        {eff.angepasst && (
          <Knopf variante="sekundaer" icon={RotateCcw} onClick={() => setze({ steigerung: undefined, pauseSek: undefined, wdhBereich: undefined })}>
            Auf Standard zurücksetzen
          </Knopf>
        )}

        {uebung.eigene && (
          <Karte className="flex flex-col gap-4">
            <h2 className="font-display text-2xl font-bold">Eigene Übung bearbeiten</h2>
            <EigeneUebungFormular key={uebung.id} start={uebung} studio={studio} knopfText="Änderungen speichern" onSpeichern={(daten) => void speichereEigeneUebung({ ...uebung, ...daten })} />
            <Knopf
              variante="leise"
              icon={Trash2}
              className="text-fehler!"
              onClick={async () => {
                if (!window.confirm(`Übung „${uebung.name}“ löschen? Bisherige Trainings bleiben erhalten.`)) return;
                await loescheEigeneUebung(uebung.id);
                navigate('/plaene/uebungen', { replace: true });
              }}
            >
              Übung löschen
            </Knopf>
          </Karte>
        )}
      </div>
    </>
  );
}

/**
 * Notiz zur Übung („Sitz Stufe 4, Ablage Loch 7“). Eigener Zustand, damit verzögerte DB-Updates das Tippen nicht stören;
 * gespeichert wird bei jeder Änderung (bereinigt).
 */
function NotizFeld({ notiz, onAendern }: { notiz: string | undefined; onAendern: (notiz: string | undefined) => void }) {
  const [text, setText] = useState(notiz ?? '');
  const [bearbeitet, setBearbeitet] = useState(false);
  // Änderung von einem anderen Gerät übernehmen, solange hier nicht getippt wird
  useEffect(() => {
    if (!bearbeitet) setText(notiz ?? '');
  }, [notiz, bearbeitet]);
  return (
    <div onBlur={() => setBearbeitet(false)}>
      <TextFeld
        label="Notiz zur Übung"
        wert={text}
        maxLaenge={NOTIZ_MAX}
        platzhalter="z. B. Sitz Stufe 4, Ablage Loch 7"
        onChange={(t) => {
          setBearbeitet(true);
          setText(t);
          onAendern(bereinigeNotiz(t));
        }}
      />
    </div>
  );
}
