import { wdhBereichFuer } from './katalog.ts';
import { standardSteigerung } from './steigerung.ts';
import type { ProfilEinstellungen, Steigerung, Uebung, UebungsEinstellung, WdhBereich } from './typen.ts';

export const STANDARD_PROFIL: ProfilEinstellungen = {
  pauseSek: 120,
  intensitaet: 'rir',
  gewichtsSchritt: 2.5,
};

export const GEWICHTS_SCHRITTE = [0.5, 1.25, 2.5] as const;
export const PAUSE_GRENZEN = { min: 15, max: 600, schritt: 15 } as const;

export interface EffektiveEinstellungen {
  steigerung: Steigerung;
  pauseSek: number;
  wdhBereich: WdhBereich;
  /** true, wenn mindestens ein Wert von der Standardeinstellung abweicht */
  angepasst: boolean;
}

/** Führt Standardwerte (Übung, Profil) und persönliche Einstellungen der Übung zusammen. */
export function effektiveEinstellungen(
  uebung: Uebung,
  eigene: UebungsEinstellung | undefined,
  profil: ProfilEinstellungen = STANDARD_PROFIL,
): EffektiveEinstellungen {
  return {
    steigerung: eigene?.steigerung ?? standardSteigerung(uebung),
    pauseSek: eigene?.pauseSek ?? profil.pauseSek,
    wdhBereich: eigene?.wdhBereich ?? wdhBereichFuer(uebung),
    angepasst: Boolean(eigene?.steigerung || eigene?.pauseSek || eigene?.wdhBereich),
  };
}

/** Pausendauer lesbar: 90 → "1:30 min", 45 → "45 s". */
export function formatierePause(sek: number): string {
  if (sek < 60) return `${sek} s`;
  const m = Math.floor(sek / 60);
  const s = sek % 60;
  return `${m}:${String(s).padStart(2, '0')} min`;
}

/** Hält Werte in sinnvollen Grenzen (z. B. nach Eingabe per Stepper). */
export function begrenze(wert: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, wert));
}

/** Korrigiert einen Wiederholungsbereich: 1 ≤ min ≤ max ≤ 100. */
export function normalisiereWdhBereich(b: WdhBereich): WdhBereich {
  const min = begrenze(Math.round(b.min), 1, 100);
  const max = begrenze(Math.round(b.max), min, 100);
  return { min, max };
}
