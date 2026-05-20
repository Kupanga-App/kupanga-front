export type EdlType = 'ENTREE' | 'SORTIE';

export type EdlStatut =
  | 'BROUILLON'
  | 'EN_ATTENTE_SIGNATURE_PROPRIO'
  | 'EN_ATTENTE_SIGNATURE_LOCATAIRE'
  | 'SIGNE'
  | 'EXPIRE';

export type EtatElement = 'BON' | 'USAGE_NORMAL' | 'MAUVAIS' | 'HORS_SERVICE';

export type TypeElement =
  | 'MUR' | 'PLAFOND' | 'SOL' | 'FENETRE' | 'PORTE' | 'VOLET'
  | 'PRISE' | 'LUMINAIRE' | 'RADIATEUR' | 'EQUIPEMENT' | 'AUTRE';

export type TypeCompteur =
  | 'EAU_FROIDE' | 'EAU_CHAUDE' | 'ELECTRICITE_HP' | 'ELECTRICITE_HC' | 'GAZ';

export interface CompteurFormDTO {
  typeCompteur: TypeCompteur;
  numeroCompteur: string;
  index: number;
  unite: string;
}

export interface CleFormDTO {
  typeCle: string;
  quantite: number;
}

export interface ElementEdlFormDTO {
  typeElement: TypeElement;
  etatElement: EtatElement;
  description?: string;
  observation?: string;
}

export interface PieceEdlFormDTO {
  nomPiece: string;
  ordre: number;
  observations?: string;
  elements: ElementEdlFormDTO[];
}

export interface EtatDesLieuxFormDTO {
  bienId: number;
  emailLocataire: string;
  type: EdlType;
  dateRealisation: string;
  heureRealisation?: string;
  observations?: string;
  compteurs: CompteurFormDTO[];
  cles: CleFormDTO[];
  pieces: PieceEdlFormDTO[];
}

export interface EdlSearchDTO {
  type?: EdlType;
  statut?: EdlStatut;
  annee?: number;
  mois?: number;
  bienId?: number;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: 'ASC' | 'DESC';
}

// ── DTOs de lecture (réponse API) ────────────────────────────────────────────

export interface CompteurDTO {
  id?: number;
  typeCompteur: TypeCompteur;
  numeroCompteur: string;
  index: number;
  unite: string;
}

export interface CleDTO {
  id?: number;
  typeCle: string;
  quantite: number;
}

export interface ElementEdlDTO {
  id?: number;
  typeElement: TypeElement;
  etatElement: EtatElement;
  description?: string;
  observation?: string;
}

export interface PieceEdlDTO {
  id?: number;
  nomPiece: string;
  ordre: number;
  observations?: string;
  elements: ElementEdlDTO[];
}

export interface EtatDesLieuxDTO {
  id: number;
  type: EdlType;
  statut: EdlStatut;
  dateRealisation: string;
  heureRealisation?: string;
  observations?: string;
  urlPdf?: string;
  signatureProprietaire?: string;
  dateSignatureProprietaire?: string;
  signatureLocataire?: string;
  dateSignatureLocataire?: string;
  nomProprietaire?: string;
  emailProprietaire?: string;
  nomLocataire?: string;
  emailLocataire?: string;
  adresseBien?: string;
  typeBien?: string;
  compteurs: CompteurDTO[];
  cles: CleDTO[];
  pieces: PieceEdlDTO[];
}

export interface EdlPageDTO {
  contenu: EtatDesLieuxDTO[];
  pageActuelle: number;
  totalPages: number;
  totalElements: number;
  dernierePage: boolean;
  premierePage: boolean;
}
