import { lazy, Suspense } from 'react';
import type { DiagrammPunkt } from './LinienDiagramm.tsx';

const LinienDiagramm = lazy(() => import('./LinienDiagramm.tsx'));

export type { DiagrammPunkt };

/** Verlaufsdiagramm mit Platzhalter, solange Recharts nachgeladen wird. Ab 2 Punkten sinnvoll. */
export function Verlauf({ punkte, einheit, beschreibung }: { punkte: DiagrammPunkt[]; einheit: string; beschreibung: string }) {
  if (punkte.length < 2) {
    return <p className="flex h-24 items-center justify-center text-center text-sm text-text-leise">Ab zwei Einträgen erscheint hier ein Diagramm.</p>;
  }
  return (
    <Suspense fallback={<div className="h-56 w-full animate-pulse rounded-2xl bg-grund" aria-hidden />}>
      <LinienDiagramm punkte={punkte} einheit={einheit} beschreibung={beschreibung} />
    </Suspense>
  );
}

/** "2026-11-16T18:00:00Z" → "16.11." (lokale Zeit) */
export function kurzDatum(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.`;
}
