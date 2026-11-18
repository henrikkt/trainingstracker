/** Bietet Text als Datei zum Herunterladen an (funktioniert offline, ohne Server). */
export function ladeHerunter(inhalt: string, dateiname: string, typ: string): void {
  const url = URL.createObjectURL(new Blob([inhalt], { type: typ }));
  const a = document.createElement('a');
  a.href = url;
  a.download = dateiname;
  document.body.append(a);
  a.click();
  a.remove();
  // Etwas warten, damit Safari den Download sicher gestartet hat
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
