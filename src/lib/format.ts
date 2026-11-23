const zahlFormat = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 });

/** 82.5 → "82,5", 80 → "80" */
export function formatiereZahl(wert: number): string {
  return zahlFormat.format(wert);
}

/** 82.5 → "82,5 kg", 80 → "80 kg", 1.25 → "1,25 kg" */
export function formatiereGewicht(kg: number): string {
  return `${formatiereZahl(kg)} kg`;
}

/** Liest eine Zahl mit Komma oder Punkt ("82,5", "82.5", " 80 "). Ungültig → null. */
export function parseZahl(text: string): number | null {
  const bereinigt = text.trim().replace(/\s/g, '').replace(',', '.');
  if (!/^-?\d+(\.\d+)?$|^-?\.\d+$/.test(bereinigt)) return null;
  const n = Number(bereinigt);
  return Number.isFinite(n) ? n : null;
}

/** Volumen: 4320.5 → "4.321 kg" */
export function formatiereVolumen(kg: number): string {
  return `${formatiereZahl(Math.round(kg))} kg`;
}

const datumFormat = new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });

/** ISO-Zeitpunkt → "Mi., 18.11.2026" (lokale Zeit) */
export function formatiereDatum(iso: string): string {
  return datumFormat.format(new Date(iso));
}

const kurzDatumFormat = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit" });

/** ISO-Zeitpunkt → "18.11." (lokale Zeit, kompakt fürs Training) */
export function formatiereKurzDatum(iso: string): string {
  return kurzDatumFormat.format(new Date(iso));
}

/** Minuten → "52 min" bzw. "1:05 h" */
export function formatiereDauer(minuten: number): string {
  if (minuten < 60) return `${minuten} min`;
  return `${Math.floor(minuten / 60)}:${String(minuten % 60).padStart(2, '0')} h`;
}

/** Sekunden → Stoppuhr "4:05" bzw. "1:02:03" */
export function formatiereUhr(sekunden: number): string {
  const s = Math.max(0, Math.floor(sekunden));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rest = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${rest}` : `${m}:${rest}`;
}

/** Rundet auf 2 Nachkommastellen, um Gleitkomma-Reste (z. B. 0.1 + 0.2) zu vermeiden. */
export function runde2(wert: number): number {
  return Math.round(wert * 100) / 100;
}
