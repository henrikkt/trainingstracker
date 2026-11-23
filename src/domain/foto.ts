import type { Uebung, UebungsEinstellung } from './typen.ts';

/**
 * Fotos von Maschinen: bewusst klein (die Person soll die Maschine nur wiedererkennen).
 * Eigene Fotos liegen als JPEG-Data-URL in der Übungseinstellung und laufen über den normalen Sync.
 */

/** Längste Bildseite in Pixeln */
export const FOTO_MAX_SEITE = 480;
/** Obergrenze der Data-URL in Zeichen (≈ 45 KB Bild). Server-Grenze für exercise_prefs: 128 KB. */
export const FOTO_MAX_ZEICHEN = 60_000;
/** JPEG-Qualitäten, die nacheinander probiert werden, bis das Foto klein genug ist */
export const FOTO_QUALITAETEN = [0.6, 0.45, 0.3, 0.2] as const;

/** Zielgröße beim Verkleinern: Seitenverhältnis bleibt, nie vergrößern. */
export function zielGroesse(breite: number, hoehe: number, maxSeite = FOTO_MAX_SEITE): { breite: number; hoehe: number } {
  const faktor = Math.min(1, maxSeite / Math.max(breite, hoehe, 1));
  return { breite: Math.max(1, Math.round(breite * faktor)), hoehe: Math.max(1, Math.round(hoehe * faktor)) };
}

export function istGueltigesFoto(dataUrl: string): boolean {
  return dataUrl.startsWith('data:image/jpeg;base64,') && dataUrl.length <= FOTO_MAX_ZEICHEN;
}

/**
 * Welches Foto angezeigt wird: das eigene vor dem aus dem Katalog.
 * `basis` ist der Pfad der App (import.meta.env.BASE_URL), damit Katalog-Fotos auch unter /trainingstracker/ funktionieren.
 */
export function effektivesFoto(uebung: Pick<Uebung, 'foto'> | undefined, einstellung: Pick<UebungsEinstellung, 'foto'> | undefined, basis = '/'): string | undefined {
  if (einstellung?.foto) return einstellung.foto;
  if (uebung?.foto) return `${basis.endsWith('/') ? basis : `${basis}/`}${uebung.foto.replace(/^\//, '')}`;
  return undefined;
}

/** Notiz zur Übung aufräumen: Leerzeichen kürzen, höchstens NOTIZ_MAX Zeichen; leer → undefined (= löschen). */
export const NOTIZ_MAX = 300;
export function bereinigeNotiz(text: string): string | undefined {
  const t = text.replace(/\s+/g, ' ').trim().slice(0, NOTIZ_MAX);
  return t || undefined;
}

/**
 * Alte Notiz an einem einzelnen Satz in die Notiz zur Übung übernehmen (früher gab es Notizen pro Satz).
 * Hängt sie mit „ · “ an; ist der Text schon enthalten, bleibt die Übungsnotiz unverändert.
 */
export function uebernimmSatzNotiz(uebungsNotiz: string | undefined, satzNotiz: string): string | undefined {
  const neu = bereinigeNotiz(satzNotiz);
  if (!neu) return uebungsNotiz;
  if (!uebungsNotiz) return neu;
  if (uebungsNotiz.includes(neu)) return uebungsNotiz;
  return bereinigeNotiz(`${uebungsNotiz} · ${neu}`);
}
