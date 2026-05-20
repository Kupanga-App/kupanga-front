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
  dateEcheance: string;
  datePaiement?: string;
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
