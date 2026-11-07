const JOUR = 24 * 60 * 60 * 1000;

export interface CompteARebours {
  /** Jours entiers restants avant `dateExpiration` (0 le dernier jour ou après). */
  joursRestants: number;
  /** Part écoulée de la réservation, de 0 à 1 (barre de progression). */
  progression: number;
}

/**
 * Compte à rebours d'une réservation, calculé à l'écran à partir des dates renvoyées par l'API (la durée n'est pas
 * recalculée : elle se lit entre `dateReservation` et `dateExpiration`).
 */
export function compteARebours(dateReservation: string | null | undefined, dateExpiration: string | null | undefined,
  maintenant: Date = new Date()): CompteARebours | null {
  const fin = dateExpiration ? new Date(dateExpiration).getTime() : NaN;
  if (isNaN(fin)) return null;
  const debut = dateReservation ? new Date(dateReservation).getTime() : NaN;
  const reste = fin - maintenant.getTime();
  const joursRestants = Math.max(0, Math.ceil(reste / JOUR));
  const duree = fin - debut;
  const progression = isNaN(debut) || duree <= 0 ? 0 : Math.min(1, Math.max(0, 1 - reste / duree));
  return { joursRestants, progression };
}
