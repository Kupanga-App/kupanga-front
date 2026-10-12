import { Devise } from '../../../core/money/montant';

export type QuittanceStatut = 'EN_ATTENTE' | 'PAYEE' | 'EN_RETARD' | 'IMPAYEE';

export interface QuittanceDTO {
  id: number;
  bienId?: number;
  contratId?: number;
  emailLocataire: string;
  mois: number;
  annee: number;
  moisLabel: string;
  loyerMensuel: number;
  chargesMensuelles: number;
  montantTotal: number;
  /** J3 : devise figée sur la quittance à sa création. */
  devise?: Devise;
  dateEcheance: string;
  datePaiement?: string;
  /** C8-bis : déclaré par le propriétaire (aucun paiement via l'application). */
  modePaiement?: ModePaiement;
  referencePaiement?: string;
  /** C8-bis : photo du reçu, URL présignée de 5 minutes. */
  urlRecu?: string;
  statut: QuittanceStatut;
  urlPdf?: string;
}

export interface QuittanceSearchDTO {
  annee?: number | null;
  mois?: string | null;
  statut?: QuittanceStatut | null;
  bienId?: number | null;
  page?: number | null;
  size?: number | null;
  sortBy?: string | null;
  sortDirection?: 'ASC' | 'DESC' | null;
}

export interface QuittancePageDTO {
  contenu: QuittanceDTO[];
  pageActuelle: number;
  totalPages: number;
  totalElements: number;
  dernierePage: boolean;
  premierePage: boolean;
}

export interface QuittanceCreateDTO {
  bienId: number;
  emailLocataire: string;
  contratId?: number;
  mois: number;
  annee: number;
  dateEcheance: string;
  loyerMensuel?: number;
  chargesMensuelles?: number;
}

/** C8-bis : modes de paiement (ceux proposés dépendent du pays : `GET /juridictions/{pays}`). */
export type ModePaiement = 'ESPECES' | 'MOBILE_MONEY' | 'VIREMENT' | 'CHEQUE' | 'AUTRE';

export const LIBELLES_MODE_PAIEMENT: Record<ModePaiement, string> = {
  ESPECES: 'Espèces',
  MOBILE_MONEY: 'Mobile Money',
  VIREMENT: 'Virement',
  CHEQUE: 'Chèque',
  AUTRE: 'Autre',
};

/** C8-bis : loyer reçu hors application, déclaré par le propriétaire. */
export interface MarquerPayeeDTO {
  signatureBase64: string;
  modePaiement: ModePaiement;
  /** AAAA-MM-JJ ; aujourd'hui (fuseau du pays) si absente. */
  datePaiement?: string;
  referencePaiement?: string;
}
