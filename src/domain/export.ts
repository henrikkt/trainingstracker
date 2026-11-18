import { tagesSchluessel } from './fortschritt.ts';
import { satzVolumen } from './kennzahlen.ts';
import { MUSKELGRUPPEN_NAMEN, type Training, type Uebung } from './typen.ts';

/**
 * CSV-Export: ein erledigter Satz pro Zeile. Für deutsches Excel: Semikolon als Trenner,
 * Dezimalkomma, UTF-8 mit BOM (sonst zeigt Excel Umlaute falsch an).
 */
export const CSV_SPALTEN = [
  'Datum',
  'Uhrzeit',
  'Training',
  'Übung',
  'Übungs-ID',
  'Muskelgruppe',
  'Satz',
  'Gewicht (kg)',
  'Wiederholungen',
  'RIR',
  'RPE',
  'Volumen (kg)',
  'Notiz',
] as const;

function zelle(wert: string | number | undefined): string {
  if (wert === undefined) return '';
  const text = typeof wert === 'number' ? String(wert).replace('.', ',') : wert;
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function trainingsAlsCsv(trainings: readonly Training[], nachschlag: (id: string) => Uebung | undefined): string {
  const zeilen = [CSV_SPALTEN.join(';')];
  const sortiert = [...trainings].filter((t) => t.ende).sort((a, b) => a.start.localeCompare(b.start));
  for (const t of sortiert) {
    const start = new Date(t.start);
    const uhrzeit = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
    for (const ue of t.uebungen) {
      const uebung = nachschlag(ue.uebungId);
      ue.saetze
        .filter((s) => s.erledigt)
        .forEach((s, i) => {
          zeilen.push(
            [
              tagesSchluessel(start),
              uhrzeit,
              t.titel ?? '',
              uebung?.name ?? ue.uebungId,
              ue.uebungId,
              uebung ? MUSKELGRUPPEN_NAMEN[uebung.muskel] : '',
              i + 1,
              s.gewicht,
              s.wdh,
              s.rir,
              s.rpe,
              satzVolumen(s),
              s.notiz,
            ]
              .map(zelle)
              .join(';'),
          );
        });
    }
  }
  return '﻿' + zeilen.join('\r\n') + '\r\n';
}

export const EXPORT_FORMAT_VERSION = 1;
