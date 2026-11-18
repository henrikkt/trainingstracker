const kgFormat = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 });

/** 82.5 → "82,5 kg", 80 → "80 kg", 1.25 → "1,25 kg" */
export function formatiereGewicht(kg: number): string {
  return `${kgFormat.format(kg)} kg`;
}
