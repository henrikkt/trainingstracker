import { ChevronRight, ClipboardList, Plus, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { Karte, Knopf, LeererZustand, Reiter, SeitenKopf } from '../components/ui.tsx';
import { useEigeneUebungen, useVorlagen } from '../daten/hooks.ts';
import { neueVorlage, uebernimmBeispielVorlage } from '../daten/repo.ts';
import { BEISPIEL_VORLAGEN } from '../domain/beispielVorlagen.ts';
import { findeUebung } from '../domain/katalog.ts';

export const PLAENE_REITER = [
  { pfad: '/plaene', text: 'Vorlagen', ende: true },
  { pfad: '/plaene/uebungen', text: 'Übungen' },
] as const;

export function PlaeneSeite() {
  const vorlagen = useVorlagen();
  const eigene = useEigeneUebungen() ?? [];
  const navigate = useNavigate();

  const anlegen = async () => navigate(`/plaene/vorlagen/${await neueVorlage()}`);
  const uebernehmen = async (schluessel: string) => navigate(`/plaene/vorlagen/${await uebernimmBeispielVorlage(schluessel)}`);

  return (
    <>
      <SeitenKopf titel="Pläne" unterzeile="Vorlagen mit Übungen, Sätzen und Wiederholungen." />
      <Reiter ziele={PLAENE_REITER} />

      <div className="flex flex-col gap-3">
        {vorlagen?.length === 0 && (
          <LeererZustand icon={ClipboardList} titel="Noch keine Vorlagen" text="Leg eine eigene Vorlage an oder übernimm unten ein Beispiel." />
        )}
        {vorlagen?.map((v) => (
          <Link key={v.id} to={`/plaene/vorlagen/${v.id}`} className="flex items-center gap-3 rounded-3xl bg-flaeche p-5 transition-colors hover:bg-flaeche-hoch">
            <span className="min-w-0 flex-1">
              <span className="block font-display text-2xl font-bold">{v.name || 'Ohne Namen'}</span>
              <span className="block truncate text-sm text-text-leise">
                {v.uebungen.length === 0
                  ? 'Noch keine Übungen'
                  : `${v.uebungen.length} ${v.uebungen.length === 1 ? 'Übung' : 'Übungen'} · ${v.uebungen
                      .map((u) => findeUebung(u.uebungId, eigene)?.name ?? '?')
                      .join(', ')}`}
              </span>
            </span>
            <ChevronRight aria-hidden className="shrink-0 text-text-leise" />
          </Link>
        ))}
        <Knopf gross icon={Plus} onClick={() => void anlegen()}>
          Neue Vorlage
        </Knopf>
      </div>

      <section className="mt-8 mb-6">
        <h2 className="mb-3 flex items-center gap-2 font-display text-2xl font-bold">
          <Sparkles aria-hidden size={20} className="text-akzent" /> Beispielvorlagen
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {BEISPIEL_VORLAGEN.map((b) => (
            <Karte key={b.schluessel} className="flex items-center gap-3 p-4!">
              <span className="min-w-0 flex-1">
                <span className="block font-bold">{b.name}</span>
                <span className="block text-sm text-text-leise">{b.beschreibung}</span>
              </span>
              <Knopf variante="sekundaer" onClick={() => void uebernehmen(b.schluessel)} aria-label={`Beispiel ${b.name} übernehmen`}>
                Übernehmen
              </Knopf>
            </Karte>
          ))}
        </div>
      </section>
    </>
  );
}
