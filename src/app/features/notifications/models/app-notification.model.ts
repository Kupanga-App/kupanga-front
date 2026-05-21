export type NotificationType =
  | 'INVITATION_SIGNATURE_CONTRAT'
  | 'CONTRAT_SIGNE'
  | 'QUITTANCE_DISPONIBLE'
  | 'INVITATION_SIGNATURE_EDL'
  | 'EDL_SIGNE'
  | 'BIEN_ASSIGNE'
  | 'BIEN_ASSIGNATION_CONFIRMEE';

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
