/**
 * Fachliche Grundtypen. Werden von UI, lokaler Datenbank (Dexie) und Sync gemeinsam genutzt.
 * Zeitpunkte als ISO-8601-Strings (JSON-freundlich, gleich in IndexedDB und Postgres-JSONB).
 */

export const MUSKELGRUPPEN = [
  'brust',
  'ruecken',
  'schultern',
  'bizeps',
  'trizeps',
  'unterarme',
  'quadrizeps',
  'beinbeuger',
  'gesaess',
  'adduktoren',
  'waden',
  'bauch',
] as const;
export type Muskelgruppe = (typeof MUSKELGRUPPEN)[number];

export const MUSKELGRUPPEN_NAMEN: Record<Muskelgruppe, string> = {
  brust: 'Brust',
  ruecken: 'Rücken',
  schultern: 'Schultern',
  bizeps: 'Bizeps',
  trizeps: 'Trizeps',
  unterarme: 'Unterarme',
  quadrizeps: 'Quadrizeps',
  beinbeuger: 'Beinbeuger',
  gesaess: 'Gesäß',
  adduktoren: 'Adduktoren',
  waden: 'Waden',
  bauch: 'Bauch',
};

export const GERAETE = ['langhantel', 'sz-stange', 'kurzhantel', 'kettlebell', 'maschine', 'kabel', 'koerpergewicht'] as const;
export type Geraet = (typeof GERAETE)[number];

export const GERAETE_NAMEN: Record<Geraet, string> = {
  langhantel: 'Langhantel',
  'sz-stange': 'SZ-Stange',
  kurzhantel: 'Kurzhantel',
  kettlebell: 'Kettlebell',
  maschine: 'Maschine',
  kabel: 'Kabel',
  koerpergewicht: 'Körpergewicht',
};

/** Wiederholungsbereich, z. B. 8–12. */
export interface WdhBereich {
  min: number;
  max: number;
}

export interface Uebung {
  /** Stabile ID: Slug für Katalog-Übungen, UUID für eigene Übungen. Niemals ändern – Trainings verweisen darauf. */
  id: string;
  name: string;
  muskel: Muskelgruppe;
  nebenMuskeln: readonly Muskelgruppe[];
  geraet: Geraet;
  /** Schwere Grundübung des Unterkörpers (Kniebeuge, Kreuzheben, Beinpresse …) → größere Standard-Steigerung. */
  grosseSteigerung?: boolean;
  /** Abweichender Standard-Wiederholungsbereich (sonst 8–12). */
  wdhBereich?: WdhBereich;
  eigene?: boolean;
  /** Nur eigene Übungen: in welchen Studios es sie gibt (IDs aus studios.ts). Katalog-Übungen stehen in der Studio-Liste. */
  studios?: readonly string[];
  /** Nur Katalog: Foto der Maschine, Pfad relativ zur App (z. B. "uebungen/kk-beinpresse.jpg") */
  foto?: string;
}

/** Wie eine Übung fürs nächste Mal gesteigert wird. */
export type Steigerung = { art: 'gewicht'; kg: number } | { art: 'wdh'; anzahl: number };

export interface Satz {
  /** kg; bei Körpergewicht-Übungen das Zusatzgewicht (0 = ohne). Bei Kurzhanteln: Gewicht pro Hantel. */
  gewicht: number;
  wdh: number;
  rir?: number;
  rpe?: number;
  notiz?: string;
  /** Nur abgehakte Sätze zählen für Statistik, Rekorde und Vorschläge. */
  erledigt: boolean;
  erledigtUm?: string;
}

/** Ziel einer Übung in einer Vorlage bzw. im laufenden Training. */
export interface UebungsZiel {
  saetze: number;
  wdh: WdhBereich;
}

export interface TrainingsUebung {
  uebungId: string;
  ziel?: UebungsZiel;
  saetze: Satz[];
}

export interface VorlagenUebung {
  uebungId: string;
  ziel: UebungsZiel;
}

/** Trainingsplan-Vorlage, z. B. „Push“ oder „Ganzkörper A“. */
export interface Vorlage {
  id: string;
  name: string;
  uebungen: VorlagenUebung[];
}

/** Persönliche Einstellungen pro Übung; nicht gesetzte Felder → Standardwerte. */
export interface UebungsEinstellung {
  uebungId: string;
  steigerung?: Steigerung;
  pauseSek?: number;
  wdhBereich?: WdhBereich;
  /** Einstellung an der Maschine, z. B. „Sitz Stufe 4, Polster Loch 6“ */
  notiz?: string;
  /** Eigenes Foto als JPEG-Data-URL (stark verkleinert, siehe domain/foto.ts) */
  foto?: string;
}

export type Intensitaet = 'rir' | 'rpe';

/** Allgemeine Einstellungen der Person. */
export interface ProfilEinstellungen {
  /** Standard-Pausendauer in Sekunden */
  pauseSek: number;
  /** RIR (Reps in Reserve) oder RPE (Rate of Perceived Exertion) erfassen */
  intensitaet: Intensitaet;
  /** Schrittweite der +/–-Knöpfe beim Gewicht */
  gewichtsSchritt: number;
  /** Studio, in dem man meistens trainiert (ID aus studios.ts); null = keins; fehlt = Standard-Studio */
  studio?: string | null;
}

export interface KoerpergewichtEintrag {
  id: string;
  /** Kalendertag YYYY-MM-DD */
  datum: string;
  kg: number;
}

export interface Training {
  id: string;
  /** Startzeitpunkt (ISO). */
  start: string;
  /** Endzeitpunkt (ISO); fehlt, solange das Training läuft. */
  ende?: string;
  vorlageId?: string;
  /** Anzeigename, z. B. Name der Vorlage beim Start oder „Freies Training“ */
  titel?: string;
  notiz?: string;
  uebungen: TrainingsUebung[];
}
