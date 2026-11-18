import { findeUebung, wdhBereichFuer } from './katalog.ts';
import type { Vorlage, VorlagenUebung } from './typen.ts';

/** Beispielvorlagen zum schnellen Start – werden beim Übernehmen mit neuer ID kopiert und sind frei änderbar. */
export interface BeispielVorlage {
  schluessel: string;
  name: string;
  beschreibung: string;
  uebungen: string[];
}

export const BEISPIEL_VORLAGEN: readonly BeispielVorlage[] = [
  {
    schluessel: 'push',
    name: 'Push',
    beschreibung: 'Brust, Schultern, Trizeps',
    uebungen: ['bankdruecken-lh', 'schraegbankdruecken-kh', 'schulterdruecken-kh', 'seitheben-kh', 'trizepsdruecken-seil'],
  },
  {
    schluessel: 'pull',
    name: 'Pull',
    beschreibung: 'Rücken, hintere Schulter, Bizeps',
    uebungen: ['klimmzuege', 'rudern-lh', 'latzug', 'face-pulls', 'curls-sz'],
  },
  {
    schluessel: 'beine',
    name: 'Beine',
    beschreibung: 'Quadrizeps, Beinbeuger, Gesäß, Waden',
    uebungen: ['kniebeuge', 'rumaenisches-kreuzheben-lh', 'beinpresse', 'beinbeuger-liegend', 'wadenheben-stehend'],
  },
  {
    schluessel: 'ganzkoerper-a',
    name: 'Ganzkörper A',
    beschreibung: 'Kniebeuge, Bankdrücken, Rudern',
    uebungen: ['kniebeuge', 'bankdruecken-lh', 'rudern-lh', 'seitheben-kh', 'crunches'],
  },
  {
    schluessel: 'ganzkoerper-b',
    name: 'Ganzkörper B',
    beschreibung: 'Kreuzheben, Schulterdrücken, Latzug',
    uebungen: ['kreuzheben', 'schulterdruecken-lh', 'latzug', 'beinpresse', 'hammercurls'],
  },
];

/** Standard-Ziel einer Übung in einer Vorlage: 3 Sätze im Wiederholungsbereich der Übung. */
export function standardZiel(uebungId: string): VorlagenUebung {
  const uebung = findeUebung(uebungId);
  return { uebungId, ziel: { saetze: 3, wdh: uebung ? { ...wdhBereichFuer(uebung) } : { min: 8, max: 12 } } };
}

export function vorlageAusBeispiel(beispiel: BeispielVorlage, id: string): Vorlage {
  return { id, name: beispiel.name, uebungen: beispiel.uebungen.map(standardZiel) };
}
