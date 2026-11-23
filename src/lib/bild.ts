import { FOTO_MAX_ZEICHEN, FOTO_QUALITAETEN, zielGroesse } from '../domain/foto.ts';

/** Lädt eine Bilddatei als <img> (berücksichtigt die Ausrichtung aus der Kamera). */
function ladeBild(datei: Blob): Promise<HTMLImageElement> {
  return new Promise((ok, fehler) => {
    const url = URL.createObjectURL(datei);
    const bild = new Image();
    bild.onload = () => {
      URL.revokeObjectURL(url);
      ok(bild);
    };
    bild.onerror = () => {
      URL.revokeObjectURL(url);
      fehler(new Error('Das Bild konnte nicht gelesen werden.'));
    };
    bild.src = url;
  });
}

/**
 * Verkleinert ein Handyfoto auf höchstens 480 px und wenige zehn KB (JPEG-Data-URL).
 * Probiert absteigende Qualitäten, bis das Ergebnis unter der Obergrenze liegt.
 */
export async function verkleinereFoto(datei: Blob): Promise<string> {
  const bild = await ladeBild(datei);
  let { breite, hoehe } = zielGroesse(bild.naturalWidth, bild.naturalHeight);
  for (let versuch = 0; versuch < 3; versuch++) {
    const canvas = document.createElement('canvas');
    canvas.width = breite;
    canvas.height = hoehe;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Das Bild konnte nicht verarbeitet werden.');
    ctx.drawImage(bild, 0, 0, breite, hoehe);
    for (const q of FOTO_QUALITAETEN) {
      const url = canvas.toDataURL('image/jpeg', q);
      if (url.startsWith('data:image/jpeg') && url.length <= FOTO_MAX_ZEICHEN) return url;
    }
    // Immer noch zu groß (sehr detailreiches Bild): kleiner rechnen und erneut versuchen
    breite = Math.round(breite * 0.75);
    hoehe = Math.round(hoehe * 0.75);
  }
  throw new Error('Das Foto ist zu groß.');
}
