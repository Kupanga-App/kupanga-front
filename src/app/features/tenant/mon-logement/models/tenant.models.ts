// ─── Backend API DTOs ─────────────────────────────────────────────────────────

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
  dateEcheance: string;
  datePaiement: string | null;
  statut: 'EN_ATTENTE' | 'PAYEE' | 'EN_RETARD' | 'IMPAYEE';
  urlPdf: string | null;
  nomProprietaire: string;
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

// ─── DTO principal interne ────────────────────────────────────────────────────

export interface MonLogementData {
  locataire: { prenom: string; nom: string; initiales: string };
  bien: {
    adresse: string;
    surface: number;
    nbPieces: number;
    type: string;
    nomProprietaire: string;
    photos: string[];
    colocation: boolean;
  };
  contrat: ContratDetails;
  statuts: StatutItem[];
  kpis: KpiItem[];
  prochainLoyer: { montant: number; dateEcheance: Date };
  quittances: Quittance[];
  documents: BienDocument[];
  compteurs: CompteurReleve[];
  proprietaire: ProprietaireInfo;
}

// ─── Interfaces internes ──────────────────────────────────────────────────────

export interface ContratDetails {
  type: string;
  dateDebut: Date;
  dateFin: Date;
  moisEcoules: number;
  dureeTotale: number;
  loyerMensuel: number;
  charges: number;
  depotGarantie: number;
  irlIndex?: string;
  irlProchainDate?: Date;
  moisPreavis?: number;
  statut: 'active' | 'draft' | 'terminated';
}

export interface StatutItem {
  label: string;
  statut: 'ok' | 'warning' | 'critical';
}

export interface KpiItem {
  label: string;
  icon: string;
  valeur: string;
  unite?: string;
  note: string;
  noteColor?: 'olive' | 'amber' | 'red';
}

export interface Quittance {
  moisAbr: string;
  annee: number;
  libelle: string;
  meta: string;
  montant: number;
  urlPdf: string;
}

export interface BienDocument {
  nom: string;
  date: Date;
  taille: string;
  type: 'pdf' | 'image';
  note?: string;
  url: string;
}

export interface CompteurReleve {
  type: string;
  libelle: string;
  valeur: number;
  unite: string;
}

export interface ProprietaireInfo {
  nom: string;
  initiales: string;
  role: string;
  verifie: boolean;
  urlPhoto?: string;
  telephone?: string;
}

export interface QuickAction {
  label: string;
  sousTitre: string;
  icon: string;
  danger?: boolean;
  route?: string;
}
