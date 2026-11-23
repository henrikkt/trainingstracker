import { effektiveEinstellungen } from './einstellungen.ts';
import { anzahlErledigterSaetze, trainingsDauerMinuten, trainingsVolumen, zaehlendeSaetze } from './kennzahlen.ts';
import { vorschlagFuerNaechstesMal, type Vorschlag } from './progression.ts';
import { neueRekorde, type NeuerRekord } from './rekorde.ts';
import type { ProfilEinstellungen, Satz, Training, TrainingsUebung, Uebung, UebungsEinstellung, UebungsZiel } from './typen.ts';

/**
 * Reine Funktionen rund um das Erfassen eines Trainings. Alle Änderungen liefern neue Objekte
 * (keine Mutation), damit React und die Datenbank-Schicht sauber vergleichen und speichern können.
 */

/** Sätze einer Übung aus abgeschlossenen Trainings, neuestes Training zuerst; Trainings ohne erledigte Sätze entfallen. */
export function verlaufSaetze(trainings: readonly Training[], uebungId: string, ausserTrainingId?: string): Satz[][] {
  return verlaufEinheiten(trainings, uebungId, ausserTrainingId).map((e) => e.saetze);
}

/** Frühere Einheit einer Übung: Startzeitpunkt des Trainings und die erledigten Sätze. */
export interface FruehereEinheit {
  start: string;
  saetze: Satz[];
}

/** Wie verlaufSaetze, aber mit Datum (für „Früher: 16.11. · 3 × 8 × 80 kg“). */
export function verlaufEinheiten(trainings: readonly Training[], uebungId: string, ausserTrainingId?: string): FruehereEinheit[] {
  return trainings
    .filter((t) => t.ende && t.id !== ausserTrainingId)
    .sort((a, b) => b.start.localeCompare(a.start))
    .map((t) => ({ start: t.start, saetze: t.uebungen.filter((ue) => ue.uebungId === uebungId).flatMap((ue) => zaehlendeSaetze(ue.saetze)) }))
    .filter((e) => e.saetze.length > 0);
}

/** So viele frühere Einheiten zeigt das Training pro Übung */
export const FRUEHERE_EINHEITEN = 3;

export interface UebungsPlan {
  ziel: UebungsZiel;
  vorschlag: Vorschlag;
  /** Erledigte Sätze des letzten Trainings dieser Übung */
  letztes?: Satz[];
  /** Die letzten (bis zu 3) Einheiten dieser Übung, neueste zuerst */
  frueher: FruehereEinheit[];
  pauseSek: number;
}

/** Ziel, Vorschlag, „Letztes Mal“ und Pause für eine Übung im Training. */
export function planeUebung(
  uebung: Uebung,
  kontext: {
    trainings: readonly Training[];
    einstellung?: UebungsEinstellung;
    profil?: ProfilEinstellungen;
    /** Ziel aus der Vorlage bzw. das beim Hinzufügen festgelegte Ziel */
    ziel?: UebungsZiel;
    ausserTrainingId?: string;
  },
): UebungsPlan {
  const eff = effektiveEinstellungen(uebung, kontext.einstellung, kontext.profil);
  const ziel = kontext.ziel ?? { saetze: 3, wdh: eff.wdhBereich };
  const einheiten = verlaufEinheiten(kontext.trainings, uebung.id, kontext.ausserTrainingId);
  const verlauf = einheiten.map((e) => e.saetze);
  return {
    ziel,
    vorschlag: vorschlagFuerNaechstesMal({ verlauf, ziel, steigerung: eff.steigerung }),
    letztes: verlauf[0],
    frueher: einheiten.slice(0, FRUEHERE_EINHEITEN),
    pauseSek: eff.pauseSek,
  };
}

/** Sätze mit dem Vorschlag vorbelegen (Gewicht leer beim ersten Mal → 0). */
export function vorbelegteSaetze(plan: UebungsPlan): Satz[] {
  const gewicht = plan.vorschlag.gewicht ?? 0;
  return plan.vorschlag.wdh.map((wdh) => ({ gewicht, wdh, erledigt: false }));
}

export function neueTrainingsUebung(uebungId: string, plan: UebungsPlan): TrainingsUebung {
  return { uebungId, ziel: plan.ziel, saetze: vorbelegteSaetze(plan) };
}

/** Neuer Satz mit den Werten des letzten Satzes (typisch: gleiches Gewicht, gleiche Wdh.). */
export function satzHinzufuegen(ue: TrainingsUebung): TrainingsUebung {
  const letzter = ue.saetze.at(-1);
  const neu: Satz = { gewicht: letzter?.gewicht ?? 0, wdh: letzter?.wdh ?? ue.ziel?.wdh.min ?? 8, erledigt: false };
  return { ...ue, saetze: [...ue.saetze, neu] };
}

export function satzEntfernen(ue: TrainingsUebung, index: number): TrainingsUebung {
  return { ...ue, saetze: ue.saetze.filter((_, i) => i !== index) };
}

export function aendereSatz(ue: TrainingsUebung, index: number, aenderung: Partial<Satz>): TrainingsUebung {
  return { ...ue, saetze: ue.saetze.map((s, i) => (i === index ? entferneLeere({ ...s, ...aenderung }) : s)) };
}

/**
 * Gewicht eines Satzes ändern und in die folgenden, noch offenen Sätze mit bisher gleichem Gewicht übernehmen
 * (z. B. beim ersten Mal 0 → 100 kg: alle weiteren Sätze stehen sofort auch auf 100 kg).
 */
export function aendereGewicht(ue: TrainingsUebung, index: number, gewicht: number): TrainingsUebung {
  const alt = ue.saetze[index]?.gewicht;
  return {
    ...ue,
    saetze: ue.saetze.map((s, i) => (i === index || (i > index && !s.erledigt && s.gewicht === alt) ? entferneLeere({ ...s, gewicht }) : s)),
  };
}

/** Abhaken bzw. Haken entfernen; merkt sich den Zeitpunkt. */
export function setzeErledigt(ue: TrainingsUebung, index: number, erledigt: boolean, zeit: string): TrainingsUebung {
  return aendereSatz(ue, index, { erledigt, erledigtUm: erledigt ? zeit : undefined });
}

/** Entfernt undefinierte/leere optionale Felder (sauberes JSON für Speicherung und Sync). */
function entferneLeere(s: Satz): Satz {
  const sauber: Satz = { gewicht: s.gewicht, wdh: s.wdh, erledigt: s.erledigt };
  if (s.rir !== undefined) sauber.rir = s.rir;
  if (s.rpe !== undefined) sauber.rpe = s.rpe;
  if (s.notiz?.trim()) sauber.notiz = s.notiz;
  if (s.erledigtUm) sauber.erledigtUm = s.erledigtUm;
  return sauber;
}

export function ersetzeUebung(t: Training, index: number, ue: TrainingsUebung): Training {
  return { ...t, uebungen: t.uebungen.map((x, i) => (i === index ? ue : x)) };
}

export function uebungEntfernen(t: Training, index: number): Training {
  return { ...t, uebungen: t.uebungen.filter((_, i) => i !== index) };
}

export interface SatzPosition {
  uebung: number;
  satz: number;
}

/**
 * Nächster nicht abgehakter Satz nach `ab` (ohne `ab` selbst): erst in derselben Übung, dann in den folgenden,
 * zuletzt von vorne. Ohne `ab`: der erste offene Satz. null, wenn alles erledigt ist.
 */
export function naechsterOffenerSatz(t: Training, ab?: SatzPosition): SatzPosition | null {
  const alle: SatzPosition[] = t.uebungen.flatMap((ue, u) => ue.saetze.map((_, s) => ({ uebung: u, satz: s })));
  const start = ab ? alle.findIndex((p) => p.uebung === ab.uebung && p.satz === ab.satz) + 1 : 0;
  const reihenfolge = [...alle.slice(start), ...alle.slice(0, start)];
  return reihenfolge.find((p) => !t.uebungen[p.uebung]!.saetze[p.satz]!.erledigt) ?? null;
}

/**
 * Der Satz, an dem man gerade dran ist (Leiste „Jetzt dran“): der aufgeklappte, solange er offen ist;
 * sonst der nächste offene danach bzw. ohne aufgeklappten Satz der erste offene. null = alles erledigt.
 */
export function aktuellerSatz(t: Training, aufgeklappt: SatzPosition | null): SatzPosition | null {
  const satz = aufgeklappt ? t.uebungen[aufgeklappt.uebung]?.saetze[aufgeklappt.satz] : undefined;
  if (aufgeklappt && satz && !satz.erledigt) return aufgeklappt;
  return naechsterOffenerSatz(t, satz ? aufgeklappt! : undefined);
}

/**
 * Rückfrage beim Abhaken: 0 kg bei einer Übung mit Gewicht (alles außer Körpergewicht) ist meist ein Versehen –
 * es würde Statistik und Vorschläge verfälschen (z. B. „Meiste Wdh.“ statt Gewichtsrekord).
 */
export function brauchtGewichtsRueckfrage(uebung: Pick<Uebung, 'geraet'> | undefined, satz: Pick<Satz, 'gewicht'>): boolean {
  return uebung !== undefined && uebung.geraet !== 'koerpergewicht' && satz.gewicht <= 0;
}

export function offeneSaetze(t: Training): number {
  return t.uebungen.reduce((n, ue) => n + ue.saetze.filter((s) => !s.erledigt).length, 0);
}

/** Beendet ein Training: nicht abgehakte Sätze und leere Übungen fallen weg, Endzeit wird gesetzt. */
export function abschliessen(t: Training, ende: string): Training {
  const uebungen = t.uebungen.map((ue) => ({ ...ue, saetze: zaehlendeSaetze(ue.saetze) })).filter((ue) => ue.saetze.length > 0);
  return { ...t, ende, uebungen };
}

export interface Zusammenfassung {
  dauerMin: number;
  volumen: number;
  saetze: number;
  uebungen: number;
  neueRekorde: NeuerRekord[];
}

export function zusammenfassen(t: Training, alleTrainings: readonly Training[], jetzt?: Date): Zusammenfassung {
  const frueher = alleTrainings.filter((x) => x.ende && x.id !== t.id);
  return {
    dauerMin: trainingsDauerMinuten(t, jetzt),
    volumen: trainingsVolumen(t),
    saetze: anzahlErledigterSaetze(t),
    uebungen: t.uebungen.filter((ue) => zaehlendeSaetze(ue.saetze).length > 0).length,
    neueRekorde: neueRekorde(t, frueher),
  };
}
