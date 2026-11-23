import { describe, expect, it } from 'vitest';
import { bereinigeNotiz, effektivesFoto, FOTO_MAX_ZEICHEN, istGueltigesFoto, NOTIZ_MAX, zielGroesse } from './foto.ts';

describe('zielGroesse', () => {
  it('verkleinert auf die längste Seite und behält das Seitenverhältnis', () => {
    expect(zielGroesse(4032, 3024)).toEqual({ breite: 480, hoehe: 360 });
    expect(zielGroesse(3024, 4032)).toEqual({ breite: 360, hoehe: 480 });
  });
  it('vergrößert kleine Bilder nicht', () => {
    expect(zielGroesse(200, 100)).toEqual({ breite: 200, hoehe: 100 });
  });
});

describe('effektivesFoto', () => {
  const eigenes = 'data:image/jpeg;base64,AAA';
  it('eigenes Foto vor Katalog-Foto', () => {
    expect(effektivesFoto({ foto: 'uebungen/a.jpg' }, { foto: eigenes })).toBe(eigenes);
  });
  it('Katalog-Foto mit Basis-Pfad der App', () => {
    expect(effektivesFoto({ foto: 'uebungen/a.jpg' }, undefined, '/trainingstracker/')).toBe('/trainingstracker/uebungen/a.jpg');
    expect(effektivesFoto({ foto: '/uebungen/a.jpg' }, {}, '/trainingstracker')).toBe('/trainingstracker/uebungen/a.jpg');
  });
  it('ohne Foto: undefined', () => {
    expect(effektivesFoto({}, {})).toBeUndefined();
    expect(effektivesFoto(undefined, undefined)).toBeUndefined();
  });
});

describe('istGueltigesFoto', () => {
  it('nur JPEG-Data-URLs bis zur Obergrenze', () => {
    expect(istGueltigesFoto('data:image/jpeg;base64,AAAA')).toBe(true);
    expect(istGueltigesFoto('data:image/png;base64,AAAA')).toBe(false);
    expect(istGueltigesFoto(`data:image/jpeg;base64,${'A'.repeat(FOTO_MAX_ZEICHEN)}`)).toBe(false);
  });
});

describe('bereinigeNotiz', () => {
  it('kürzt Leerraum und begrenzt die Länge; leer = löschen', () => {
    expect(bereinigeNotiz('  Sitz   Stufe 4 \n Polster 6 ')).toBe('Sitz Stufe 4 Polster 6');
    expect(bereinigeNotiz('   ')).toBeUndefined();
    expect(bereinigeNotiz('x'.repeat(300))).toHaveLength(NOTIZ_MAX);
  });
});
