export type BienType = 'APPARTEMENT' | 'MAISON' | 'STUDIO';

export interface BienFormDTO {
  titre: string;
  typeBien: BienType;
  description?: string;
  adresse: string;
  ville: string;
  codePostal: string;
  pays: string;
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
  adresse: string;
  ville: string;
  codePostal: string;
  pays: string;
  typeBien: BienType;
  description?: string;
  createdAt: string;
  updatedAt: string;
  proprietaire: UserDTO;
  locataire?: UserDTO;
  contrats: string[];
  quittances: string[];
  documents: string[];
  images: string[];
}

export interface BienSearchDTO {
  titre?: string;
  villes?: string[];
  typesBien?: BienType[];
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: 'ASC' | 'DESC';
}

export interface BienPageDTO {
  contenu: BienDTO[];
  pageActuelle: number;
  totalPages: number;
  totalElements: number;
  dernierePage: boolean;
  premierePage: boolean;
}
