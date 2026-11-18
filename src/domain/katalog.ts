import type { Geraet, Muskelgruppe, Uebung, WdhBereich } from './typen.ts';

/**
 * Vordefinierter Übungskatalog (Deutsch). Die IDs sind dauerhaft – Trainings und Vorlagen verweisen darauf.
 * Neue Übungen dürfen ergänzt, bestehende IDs aber nie geändert oder wiederverwendet werden.
 */

function u(
  id: string,
  name: string,
  geraet: Geraet,
  muskel: Muskelgruppe,
  nebenMuskeln: Muskelgruppe[] = [],
  extra: { grosseSteigerung?: boolean; wdhBereich?: WdhBereich } = {},
): Uebung {
  return { id, name, geraet, muskel, nebenMuskeln, ...extra };
}

const SCHWER = { grosseSteigerung: true, wdhBereich: { min: 5, max: 8 } };
const HOCH = { wdhBereich: { min: 10, max: 15 } };
const BAUCH = { wdhBereich: { min: 10, max: 20 } };

export const KATALOG: readonly Uebung[] = [
  // Brust
  u('bankdruecken-lh', 'Bankdrücken (Langhantel)', 'langhantel', 'brust', ['trizeps', 'schultern'], { wdhBereich: { min: 5, max: 8 } }),
  u('schraegbankdruecken-lh', 'Schrägbankdrücken (Langhantel)', 'langhantel', 'brust', ['schultern', 'trizeps']),
  u('bankdruecken-kh', 'Bankdrücken (Kurzhantel)', 'kurzhantel', 'brust', ['trizeps', 'schultern']),
  u('schraegbankdruecken-kh', 'Schrägbankdrücken (Kurzhantel)', 'kurzhantel', 'brust', ['schultern', 'trizeps']),
  u('brustpresse', 'Brustpresse (Maschine)', 'maschine', 'brust', ['trizeps', 'schultern']),
  u('butterfly', 'Butterfly (Maschine)', 'maschine', 'brust', [], HOCH),
  u('kabel-flys', 'Cable Crossover (Kabel)', 'kabel', 'brust', [], HOCH),
  u('fliegende-kh', 'Fliegende (Kurzhantel)', 'kurzhantel', 'brust', [], HOCH),
  u('dips', 'Dips', 'koerpergewicht', 'brust', ['trizeps', 'schultern']),
  u('liegestuetze', 'Liegestütze', 'koerpergewicht', 'brust', ['trizeps', 'schultern'], HOCH),

  // Rücken
  u('kreuzheben', 'Kreuzheben (Langhantel)', 'langhantel', 'ruecken', ['gesaess', 'beinbeuger', 'unterarme'], SCHWER),
  u('klimmzuege', 'Klimmzüge', 'koerpergewicht', 'ruecken', ['bizeps'], { wdhBereich: { min: 5, max: 10 } }),
  u('latzug', 'Latzug (Kabel)', 'kabel', 'ruecken', ['bizeps']),
  u('latzug-eng', 'Latzug eng (Kabel)', 'kabel', 'ruecken', ['bizeps']),
  u('rudern-lh', 'Langhantelrudern', 'langhantel', 'ruecken', ['bizeps', 'schultern']),
  u('rudern-kh', 'Kurzhantelrudern (einarmig)', 'kurzhantel', 'ruecken', ['bizeps']),
  u('rudern-kabel', 'Rudern am Kabel (sitzend)', 'kabel', 'ruecken', ['bizeps']),
  u('rudermaschine', 'Rudern an der Maschine', 'maschine', 'ruecken', ['bizeps']),
  u('t-bar-rudern', 'T-Bar-Rudern', 'langhantel', 'ruecken', ['bizeps']),
  u('ueberzuege-kabel', 'Überzüge am Kabel', 'kabel', 'ruecken', [], HOCH),
  u('hyperextensions', 'Hyperextensions', 'koerpergewicht', 'ruecken', ['gesaess', 'beinbeuger'], HOCH),
  u('shrugs-kh', 'Shrugs (Kurzhantel)', 'kurzhantel', 'ruecken', ['unterarme'], HOCH),

  // Schultern
  u('schulterdruecken-lh', 'Schulterdrücken (Langhantel)', 'langhantel', 'schultern', ['trizeps'], { wdhBereich: { min: 5, max: 8 } }),
  u('schulterdruecken-kh', 'Schulterdrücken (Kurzhantel)', 'kurzhantel', 'schultern', ['trizeps']),
  u('schulterpresse', 'Schulterpresse (Maschine)', 'maschine', 'schultern', ['trizeps']),
  u('seitheben-kh', 'Seitheben (Kurzhantel)', 'kurzhantel', 'schultern', [], HOCH),
  u('seitheben-kabel', 'Seitheben am Kabel', 'kabel', 'schultern', [], HOCH),
  u('frontheben-kh', 'Frontheben (Kurzhantel)', 'kurzhantel', 'schultern', [], HOCH),
  u('face-pulls', 'Face Pulls (Kabel)', 'kabel', 'schultern', ['ruecken'], HOCH),
  u('reverse-butterfly', 'Reverse Butterfly (Maschine)', 'maschine', 'schultern', ['ruecken'], HOCH),

  // Bizeps
  u('curls-lh', 'Langhantel-Curls', 'langhantel', 'bizeps', ['unterarme']),
  u('curls-sz', 'SZ-Curls', 'sz-stange', 'bizeps', ['unterarme']),
  u('curls-kh', 'Kurzhantel-Curls', 'kurzhantel', 'bizeps', ['unterarme']),
  u('hammercurls', 'Hammercurls (Kurzhantel)', 'kurzhantel', 'bizeps', ['unterarme']),
  u('curls-kabel', 'Curls am Kabel', 'kabel', 'bizeps', [], HOCH),
  u('scottcurls', 'Scottcurls (Maschine)', 'maschine', 'bizeps'),

  // Trizeps
  u('trizepsdruecken-kabel', 'Trizepsdrücken am Kabel', 'kabel', 'trizeps', [], HOCH),
  u('trizepsdruecken-seil', 'Trizepsdrücken am Seil', 'kabel', 'trizeps', [], HOCH),
  u('trizeps-ueberkopf-kabel', 'Trizeps-Überkopfstrecken am Kabel', 'kabel', 'trizeps'),
  u('french-press', 'French Press (SZ-Stange)', 'sz-stange', 'trizeps'),
  u('enges-bankdruecken', 'Enges Bankdrücken (Langhantel)', 'langhantel', 'trizeps', ['brust', 'schultern']),
  u('dips-maschine', 'Dips an der Maschine', 'maschine', 'trizeps', ['brust']),

  // Quadrizeps
  u('kniebeuge', 'Kniebeuge (Langhantel)', 'langhantel', 'quadrizeps', ['gesaess', 'adduktoren'], SCHWER),
  u('frontkniebeuge', 'Frontkniebeuge (Langhantel)', 'langhantel', 'quadrizeps', ['gesaess'], SCHWER),
  u('beinpresse', 'Beinpresse (Maschine)', 'maschine', 'quadrizeps', ['gesaess', 'adduktoren'], { grosseSteigerung: true }),
  u('hackenschmidt', 'Hackenschmidt-Kniebeuge (Maschine)', 'maschine', 'quadrizeps', ['gesaess'], { grosseSteigerung: true }),
  u('beinstrecker', 'Beinstrecker (Maschine)', 'maschine', 'quadrizeps', [], HOCH),
  u('ausfallschritte-kh', 'Ausfallschritte (Kurzhantel)', 'kurzhantel', 'quadrizeps', ['gesaess']),
  u('bulgarian-split-squat', 'Bulgarische Split-Kniebeuge (Kurzhantel)', 'kurzhantel', 'quadrizeps', ['gesaess']),
  u('goblet-squat', 'Goblet Squat (Kurzhantel)', 'kurzhantel', 'quadrizeps', ['gesaess']),

  // Beinbeuger
  u('rumaenisches-kreuzheben-lh', 'Rumänisches Kreuzheben (Langhantel)', 'langhantel', 'beinbeuger', ['gesaess', 'ruecken'], { grosseSteigerung: true }),
  u('rumaenisches-kreuzheben-kh', 'Rumänisches Kreuzheben (Kurzhantel)', 'kurzhantel', 'beinbeuger', ['gesaess', 'ruecken']),
  u('beinbeuger-liegend', 'Beinbeuger liegend (Maschine)', 'maschine', 'beinbeuger'),
  u('beinbeuger-sitzend', 'Beinbeuger sitzend (Maschine)', 'maschine', 'beinbeuger'),

  // Gesäß und Adduktoren
  u('hip-thrust-lh', 'Hip Thrust (Langhantel)', 'langhantel', 'gesaess', ['beinbeuger'], { grosseSteigerung: true }),
  u('hip-thrust-maschine', 'Hip Thrust (Maschine)', 'maschine', 'gesaess', ['beinbeuger']),
  u('abduktoren', 'Abduktoren (Maschine)', 'maschine', 'gesaess', [], HOCH),
  u('kickbacks-kabel', 'Gesäß-Kickbacks am Kabel', 'kabel', 'gesaess', [], HOCH),
  u('kettlebell-swings', 'Kettlebell Swings', 'kettlebell', 'gesaess', ['beinbeuger', 'ruecken'], HOCH),
  u('adduktoren', 'Adduktoren (Maschine)', 'maschine', 'adduktoren', [], HOCH),

  // Waden
  u('wadenheben-stehend', 'Wadenheben stehend (Maschine)', 'maschine', 'waden', [], HOCH),
  u('wadenheben-sitzend', 'Wadenheben sitzend (Maschine)', 'maschine', 'waden', [], HOCH),
  u('wadenheben-beinpresse', 'Wadenheben an der Beinpresse', 'maschine', 'waden', [], HOCH),

  // Bauch
  u('crunches', 'Crunches', 'koerpergewicht', 'bauch', [], BAUCH),
  u('crunch-maschine', 'Bauchmaschine (Crunch)', 'maschine', 'bauch', [], BAUCH),
  u('kabel-crunch', 'Kabel-Crunch (kniend)', 'kabel', 'bauch', [], BAUCH),
  u('beinheben-haengend', 'Beinheben hängend', 'koerpergewicht', 'bauch', [], BAUCH),
  u('beinheben-liegend', 'Beinheben liegend', 'koerpergewicht', 'bauch', [], BAUCH),
  u('ab-roller', 'Ab-Roller', 'koerpergewicht', 'bauch', [], BAUCH),

  // Unterarme
  u('unterarm-curls', 'Unterarm-Curls (SZ-Stange)', 'sz-stange', 'unterarme', [], HOCH),
];

const NACH_ID = new Map(KATALOG.map((x) => [x.id, x]));

/** Sucht eine Übung im Katalog und (optional) in den eigenen Übungen. */
export function findeUebung(id: string, eigene: readonly Uebung[] = []): Uebung | undefined {
  return NACH_ID.get(id) ?? eigene.find((x) => x.id === id);
}

export const STANDARD_WDH_BEREICH: WdhBereich = { min: 8, max: 12 };

export function wdhBereichFuer(uebung: Uebung): WdhBereich {
  return uebung.wdhBereich ?? STANDARD_WDH_BEREICH;
}

/** Normalisiert Text für die Suche: klein, ohne Umlaute/Akzente/Sonderzeichen. */
export function suchText(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Findet Übungen, deren Name alle Suchwörter enthält (z. B. „bank kurz“ → Bankdrücken (Kurzhantel)). */
export function sucheUebungen(uebungen: readonly Uebung[], anfrage: string): Uebung[] {
  const woerter = suchText(anfrage).split(' ').filter(Boolean);
  if (woerter.length === 0) return [...uebungen];
  return uebungen.filter((x) => {
    const name = suchText(x.name);
    return woerter.every((w) => name.includes(w));
  });
}
