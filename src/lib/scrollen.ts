/**
 * Wohin beim Aufklappen eines Satzes gescrollt wird. Beim ersten Satz einer Übung soll möglichst die ganze
 * Karte (Name, Foto, Einstellung) sichtbar sein – aber nur, wenn der Satz-Editor dann noch komplett ins Bild passt
 * (sonst würde „Satz abhaken“ unter Pausenleiste/Navigation verschwinden).
 *
 * Alle Werte in px relativ zum Fenster: `karteOben` = Oberkante der Übungskarte, `satzUnten` = Unterkante des Editors,
 * `frei` = sichtbarer Bereich zwischen Kopfleiste (oben) und Pausenleiste/Navigation (unten).
 */
export function scrollZiel(erster: boolean, karteOben: number, satzUnten: number, frei: { oben: number; unten: number }): 'karte' | 'satz' {
  if (!erster) return 'satz';
  return satzUnten - karteOben <= frei.unten - frei.oben ? 'karte' : 'satz';
}
