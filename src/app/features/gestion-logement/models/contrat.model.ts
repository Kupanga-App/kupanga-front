import { Pays, UserDTO } from '../../biens/models/bien.model';
import { Devise } from '../../../core/money/montant';

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
  /** C12 (RDC) : garantie en mois (montant dans depotGarantie) et loyers payés d'avance, figés sur le bail. */
  garantieMois?: number;
  avanceMois?: number;
  /** J3 : juridiction figée sur le bail à sa création. */
  pays?: Pays;
  devise?: Devise;
  modeleVersion?: string;
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
  /** C12 : France ; en RDC la garantie est en mois (montant calculé par l'API). */
  depotGarantie?: number;
  garantieMois?: number;
  avanceMois?: number;
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
