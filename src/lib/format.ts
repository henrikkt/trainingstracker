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

/** Rundet auf 2 Nachkommastellen, um Gleitkomma-Reste (z. B. 0.1 + 0.2) zu vermeiden. */
export function runde2(wert: number): number {
  return Math.round(wert * 100) / 100;
}
