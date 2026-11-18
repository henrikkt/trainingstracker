import { ClipboardList, Dumbbell, TrendingUp, UserRound, type LucideIcon } from 'lucide-react';

export interface NavZiel {
  pfad: string;
  titel: string;
  icon: LucideIcon;
}

/** Hauptnavigation – Reihenfolge = Reihenfolge in der Tab-Leiste. */
export const NAV_ZIELE: readonly NavZiel[] = [
  { pfad: '/training', titel: 'Training', icon: Dumbbell },
  { pfad: '/plaene', titel: 'Pläne', icon: ClipboardList },
  { pfad: '/fortschritt', titel: 'Fortschritt', icon: TrendingUp },
  { pfad: '/profil', titel: 'Profil', icon: UserRound },
];
