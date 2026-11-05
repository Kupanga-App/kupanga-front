export type NotificationType =
  | 'INVITATION_SIGNATURE_CONTRAT'
  | 'CONTRAT_SIGNE'
  | 'QUITTANCE_DISPONIBLE'
  | 'INVITATION_SIGNATURE_EDL'
  | 'EDL_SIGNE'
  | 'BIEN_ASSIGNE'
  | 'BIEN_ASSIGNATION_CONFIRMEE'
  | 'DEMANDE_LOCATION'
  | 'DEMANDE_LOCATION_ACCEPTEE'
  | 'DEMANDE_LOCATION_REFUSEE'
  | 'DEMANDE_LOCATION_ANNULEE'
  /** Réservation (2026-11-05) : désistement du candidat (au propriétaire, referenceId = bien). */
  | 'RESERVATION_DESISTEE'
  /** Réservation retirée par le propriétaire (au candidat, referenceId = location). */
  | 'RESERVATION_ANNULEE'
  /** 14 jours sans bail signé, au propriétaire (referenceId = bien). */
  | 'RESERVATION_EXPIREE'
  /** 14 jours sans bail signé, au candidat (referenceId = location). */
  | 'RESERVATION_EXPIREE_CANDIDAT'
  /** Fin de bail : congé donné ou retiré par le locataire (au propriétaire, referenceId = bien). */
  | 'CONGE_POUR_PROPRIETAIRE'
  /** Fin de bail : congé donné ou retiré par le propriétaire (au locataire, referenceId = bien). */
  | 'CONGE_POUR_LOCATAIRE'
  /** Fin du bail enregistrée (au locataire, referenceId = location). */
  | 'LOCATION_TERMINEE';

export interface AppNotification {
  id: number;
  type: NotificationType;
  titre: string;
  message: string;
  lue: boolean;
  lien: string | null;
  referenceId: number | null;
  createdAt: string;
}
