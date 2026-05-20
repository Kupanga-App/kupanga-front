import { UserDTO } from '../../biens/models/bien.model';

export type ContratStatut =
  | 'BROUILLON'
  | 'EN_ATTENTE_SIGNATURE_PROPRIO'
  | 'EN_ATTENTE_SIGNATURE_LOCATAIRE'
  | 'SIGNE'
  | 'EXPIRE'
  | 'ANNULE';

export interface ContratDTO {
  id: number;
  bienId: number;
  adresseBien?: string;
  proprietaire?: UserDTO;
  locataire?: UserDTO;
  loyerMensuel: number;
  chargesMensuelles: number;
  depotGarantie: number;
  dateDebut: string;
  dateFin?: string;
  dureeBailMois: number;
  proprietaireASigné?: boolean;
  locataireASigné?: boolean;
  dateSignatureProprietaire?: string;
  dateSignatureLocataire?: string;
  urlPdf?: string;
  statut: ContratStatut;
  createdAt?: string;
  updatedAt?: string;
}

export interface ContratFormDTO {
  bienId: number;
  emailLocataire: string;
  dateDebut: string;
  dateFin?: string;
  dureeBailMois: number;
  loyerMensuel: number;
  chargesMensuelles: number;
  depotGarantie: number;
}

export interface ContratSearchDTO {
  bienId?: number;
  dureeBailMoisMin?: number;
  dureeBailMoisMax?: number;
  loyerMin?: number;
  loyerMax?: number;
  dateDebutApres?: string;
  dateDebutAvant?: string;
  statut?: ContratStatut;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: 'ASC' | 'DESC';
}

export interface ContratPageDTO {
  contenu: ContratDTO[];
  pageActuelle: number;
  totalPages: number;
  totalElements: number;
  dernierePage: boolean;
  premierePage: boolean;
}
