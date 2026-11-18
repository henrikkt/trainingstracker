import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatiereZahl } from '../lib/format.ts';

/**
 * Einreihiges Liniendiagramm (Verlauf). Wird per React.lazy geladen, damit Recharts nur auf den
 * Fortschrittsseiten heruntergeladen wird. Gestaltung nach dataviz-Regeln: 2-px-Linie, Punkte ≥ 8 px,
 * zurückhaltendes Raster ohne senkrechte Linien, Tooltip mit Fadenkreuz, keine Legende (eine Reihe –
 * der Titel benennt sie), Zahlen in Textfarbe. Farben als Hex, weil SVG-Attribute keine CSS-Variablen garantieren.
 */
const FARBE = {
  linie: '#C6F432',
  flaeche: '#171A1F',
  raster: '#2C313A',
  textLeise: '#A3AAB5',
  text: '#F2F4F7',
  tooltip: '#20242B',
};

export interface DiagrammPunkt {
  /** Kurzes Achsen-Label, z. B. "16.11." */
  x: string;
  y: number;
  /** Ausführlicher Tooltip-Text, z. B. "Mi., 16.11.2026 · 100 kg × 5" */
  info: string;
}

export default function LinienDiagramm({ punkte, einheit, beschreibung }: { punkte: DiagrammPunkt[]; einheit: string; beschreibung: string }) {
  return (
    <figure aria-label={beschreibung} className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={punkte} margin={{ top: 12, right: 12, bottom: 4, left: 0 }}>
          <CartesianGrid vertical={false} stroke={FARBE.raster} strokeDasharray="0" />
          <XAxis dataKey="x" tick={{ fill: FARBE.textLeise, fontSize: 12 }} tickLine={false} axisLine={{ stroke: FARBE.raster }} minTickGap={16} />
          <YAxis
            domain={['auto', 'auto']}
            tick={{ fill: FARBE.textLeise, fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={44}
            tickFormatter={(w: number) => formatiereZahl(Math.round(w))}
          />
          <Tooltip
            cursor={{ stroke: FARBE.textLeise, strokeWidth: 1 }}
            isAnimationActive={false}
            content={({ active, payload }) => {
              const p = active ? (payload?.[0]?.payload as DiagrammPunkt | undefined) : undefined;
              if (!p) return null;
              return (
                <div className="rounded-xl border border-linie bg-flaeche-hoch px-3 py-2 text-sm shadow-xl">
                  <p className="text-text-leise">{p.info}</p>
                  <p className="font-bold text-text tabular-nums">
                    {formatiereZahl(Math.round(p.y * 10) / 10)} {einheit}
                  </p>
                </div>
              );
            }}
          />
          <Line
            type="linear"
            dataKey="y"
            stroke={FARBE.linie}
            strokeWidth={2}
            dot={{ r: 4, fill: FARBE.linie, stroke: FARBE.flaeche, strokeWidth: 2 }}
            activeDot={{ r: 6, fill: FARBE.linie, stroke: FARBE.flaeche, strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </figure>
  );
}
