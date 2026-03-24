export type BienType =
  'APPARTEMENT' | 'MAISON' | 'STUDIO' |
  'VILLA' | 'BUREAU' | 'COMMERCE';

export type ModeChauffage =
  'ELECTRIQUE' | 'GAZ' | 'FIOUL' | 'BOIS' |
  'POMPE_A_CHALEUR' | 'POELE' | 'COLLECTIF' |
  'SANS_CHAUFFAGE';

export type ClasseEnergie = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
export type ClasseGes = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';

export interface BienFormDTO {
  // Obligatoires
  titre: string;
  typeBien: BienType;
  adresse: string;
  ville: string;
  codePostal: string;
  pays: string;
  surfaceHabitable: number;
  nombrePieces: number;
  loyerMensuel: number;
  chargesMensuelles: number;
  depotGarantie: number;
  meuble: boolean;
  colocation: boolean;
  disponibleDe: string; // format ISO YYYY-MM-DD
  // Optionnels
  description?: string;
  nombreChambres?: number;
  etage?: number;
  ascenseur?: boolean;
  anneeConstruction?: number;
  modeChauffage?: ModeChauffage;
  classeEnergie?: ClasseEnergie;
  classeGes?: ClasseGes;
}

export interface BienCreateRequest {
  bienFormDTO: BienFormDTO;
  files: File[];
}

export interface UserDTO {
  id: number;
  firstName: string;
  lastName: string;
  mail: string;
  role: 'ROLE_PROPRIETAIRE' | 'ROLE_LOCATAIRE' | 'ROLE_ADMIN';
  urlProfile?: string;
  hasCompleteProfil: boolean;
}

export interface BienDTO {
  id: number;
  titre: string;
  typeBien: BienType;
  description?: string;
  adresse: string;
  ville: string;
  codePostal: string;
  pays: string;
  latitude?: number;
  longitude?: number;
  surfaceHabitable?: number;
  nombrePieces?: number;
  nombreChambres?: number;
  etage?: number;
  ascenseur?: boolean;
  anneeConstruction?: number;
  modeChauffage?: ModeChauffage;
  classeEnergie?: ClasseEnergie;
  classeGes?: ClasseGes;
  loyerMensuel?: number;
  chargesMensuelles?: number;
  depotGarantie?: number;
  meuble?: boolean;
  colocation?: boolean;
  disponibleDe?: string;
  proprietaire: UserDTO;
  locataire?: UserDTO;
  contrats: string[];
  quittances: string[];
  documents: string[];
  images: string[];
  pois: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BienSearchDTO {
  titre?: string;
  villes?: string[];
  typesBien?: BienType[];
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: 'ASC' | 'DESC';
  loyerMin?: number;
  loyerMax?: number;
  meuble?: boolean;
  colocation?: boolean;
  disponibleAvant?: string;
  surfaceMin?: number;
  surfaceMax?: number;
  piecesMin?: number;
  ascenseur?: boolean;
  etageMin?: number;
  etageMax?: number;
  classesEnergie?: ClasseEnergie[];
  classesGes?: ClasseGes[];
  modesChauffage?: ModeChauffage[];
}

export interface BienPageDTO {
  contenu: BienDTO[];
  pageActuelle: number;
  totalPages: number;
  totalElements: number;
  dernierePage: boolean;
  premierePage: boolean;
}
