import { Devise } from '../../core/money/montant';

/** Tableau de bord du locataire (`GET /locataire/dashboard/{bienId}`). */
export interface LocataireDashboardDTO {
  locataire: LocataireBackendDTO;
  bien: BienResumeDTO;
  contrat: ContratResumeDTO;
  statuts: StatutsBackendDTO;
  quittances: QuittanceBackendDTO[];
  etatsDesLieux: EtatDesLieuxBackendDTO[];
}

export interface LocataireBackendDTO {
  prenom: string;
  nom: string;
  initiales: string;
}

export interface BienResumeDTO {
  id: number;
  adresse: string;
  surface: number;
  nbPieces: number;
  type: string;
  nomProprietaire: string;
  photos: string[];
  colocation: boolean;
}

export interface ContratResumeDTO {
  id: number;
  type: string;
  dateDebut: string;
  dateFin: string;
  moisEcoules: number;
  dureeTotale: number;
  loyerMensuel: number;
  charges: number;
  depotGarantie: number;
  /** J3 : devise figée sur le bail. */
  devise?: Devise;
  statut: string;
}

export interface StatutsBackendDTO {
  derniereQuittance: string | null;
  dateFinContrat: string | null;
}

export interface QuittanceBackendDTO {
  id: number;
  mois: string;
  annee: number;
  moisLabel: string;
  loyerMensuel: number;
  chargesMensuelles: number;
  montantTotal: number;
  /** J3 : devise figée sur la quittance. */
  devise?: Devise;
  dateEcheance: string;
  datePaiement: string | null;
  statut: 'EN_ATTENTE' | 'PAYEE' | 'EN_RETARD' | 'IMPAYEE';
  urlPdf: string | null;
  nomProprietaire: string;
  emailProprietaire?: string;
  adresseBien: string;
}

export interface CompteurReleveBackendDTO {
  id: number;
  typeCompteur: string;
  numeroCompteur: string;
  index: number;
  unite: string;
}

export interface EtatDesLieuxBackendDTO {
  id: number;
  type: 'ENTREE' | 'SORTIE';
  statut: string;
  dateRealisation: string;
  urlPdf: string | null;
  compteurs?: CompteurReleveBackendDTO[];
}
