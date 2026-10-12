import { Devise } from '../../../core/money/montant';

/** J1 : code ISO 3166 du pays du bien (l'API refuse toute autre valeur). */
export type Pays = 'FR' | 'BE' | 'CD' | 'CG';

export const PAYS_OPTIONS: { value: Pays; label: string }[] = [
  { value: 'FR', label: 'France' },
  { value: 'BE', label: 'Belgique' },
  { value: 'CD', label: 'République démocratique du Congo' },
  { value: 'CG', label: 'République du Congo' },
];

/** Nom du pays à afficher (le code sinon). */
export function libellePays(code: string | null | undefined): string {
  return PAYS_OPTIONS.find(p => p.value === code)?.label ?? code ?? '';
}

/** J4 : adresse sur une ligne, sans champ vide (« N° 12, avenue Kasa-Vubu, quartier Matonge, commune de Kalamu, Kinshasa »). */
export function adresseLisible(b: Pick<BienDTO, 'adresse' | 'ville' | 'codePostal' | 'commune' | 'quartier' | 'avenue' | 'numeroParcelle'>): string {
  const prefixe = (p: string, v?: string | null) => (v && v.trim() ? p + v.trim() : '');
  return [
    b.adresse,
    prefixe('avenue ', b.avenue),
    prefixe('parcelle n° ', b.numeroParcelle),
    prefixe('quartier ', b.quartier),
    prefixe('commune de ', b.commune),
    [b.codePostal, b.ville].filter(v => v && v.trim()).join(' '),
  ].filter(v => v && v.trim()).join(', ');
}

/** Types de bien de l'API ; ceux proposés dépendent du pays (`GET /juridictions/{pays}`). C10 : types de la RDC. */
export type BienType =
  'APPARTEMENT' | 'MAISON' | 'STUDIO' |
  'VILLA' | 'ANNEXE' | 'CHAMBRE' | 'LOCAL_COMMERCIAL' | 'ENTREPOT' | 'PARCELLE' | 'TERRAIN';

/** Libellé et icône de chaque type (création, modification, cartes, filtres). */
export const TYPES_BIEN: { value: BienType; label: string; icon: string }[] = [
  { value: 'APPARTEMENT',      label: 'Appartement',      icon: 'apartment' },
  { value: 'MAISON',           label: 'Maison',           icon: 'house' },
  { value: 'STUDIO',           label: 'Studio',           icon: 'single_bed' },
  { value: 'VILLA',            label: 'Villa',            icon: 'villa' },
  { value: 'ANNEXE',           label: 'Annexe',           icon: 'cottage' },
  { value: 'CHAMBRE',          label: 'Chambre',          icon: 'bed' },
  { value: 'LOCAL_COMMERCIAL', label: 'Local commercial', icon: 'storefront' },
  { value: 'ENTREPOT',         label: 'Entrepôt',         icon: 'warehouse' },
  { value: 'PARCELLE',         label: 'Parcelle',         icon: 'fence' },
  { value: 'TERRAIN',          label: 'Terrain',          icon: 'landscape' },
];

export function libelleTypeBien(type: string | null | undefined): string {
  return TYPES_BIEN.find(t => t.value === type)?.label ?? (type ?? '');
}

/** C10 : sans logement, surface habitable et nombre de pièces ne sont pas exigés. */
export function typeSansLogement(type: BienType | null | undefined): boolean {
  return type === 'PARCELLE' || type === 'TERRAIN';
}

/** C11 : équipements ; ceux proposés dépendent du pays. */
export type Equipement =
  'EAU_REGIDESO' | 'FORAGE' | 'CITERNE' | 'ELECTRICITE_SNEL' | 'GROUPE_ELECTROGENE' | 'PANNEAUX_SOLAIRES' |
  'CLOTURE' | 'GARDIENNAGE' | 'PARKING' | 'CLIMATISATION';

export const LIBELLES_EQUIPEMENT: Record<Equipement, string> = {
  EAU_REGIDESO: 'Eau courante (REGIDESO)',
  FORAGE: 'Forage',
  CITERNE: 'Citerne',
  ELECTRICITE_SNEL: 'Électricité (SNEL)',
  GROUPE_ELECTROGENE: 'Groupe électrogène',
  PANNEAUX_SOLAIRES: 'Panneaux solaires',
  CLOTURE: 'Clôture / mur',
  GARDIENNAGE: 'Gardiennage',
  PARKING: 'Parking',
  CLIMATISATION: 'Climatisation',
};

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
  /** J4 : obligatoire en France, à ne pas envoyer en RDC. */
  codePostal?: string;
  pays: Pays;
  /** J4 : adresse congolaise (commune et quartier obligatoires en RDC, à ne pas envoyer en France). */
  commune?: string;
  quartier?: string;
  avenue?: string;
  numeroParcelle?: string;
  pointDeRepere?: string;
  /** C2 : repère sur la carte ou GPS (les deux ensemble, facultatifs) ; sinon géocodage de l'adresse. */
  latitude?: number;
  longitude?: number;
  /** J3 : facultative, devise par défaut du pays sinon. */
  devise?: Devise;
  /** C10 : facultatifs pour une parcelle ou un terrain. */
  surfaceHabitable?: number;
  nombrePieces?: number;
  loyerMensuel: number;
  chargesMensuelles: number;
  /** C12 : France (montant) ; masqué en RDC (garantie en mois). */
  depotGarantie?: number;
  /** C12 (RDC) : garantie en mois de loyer et loyers payés d'avance. */
  garantieMois?: number;
  avanceMois?: number;
  /** C11 */
  equipements?: Equipement[];
  heuresElectriciteParJour?: number;
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
  /** C6 : numéro de l'autre partie du bien (vue privée seulement : propriétaire ↔ locataire actuel). */
  telephone?: string | null;
}

export interface BienDTO {
  id: number;
  titre: string;
  typeBien: BienType;
  description?: string;
  adresse: string;
  ville: string;
  codePostal?: string;
  pays: Pays;
  /** J4 : adresse congolaise (absente hors RDC). */
  commune?: string;
  quartier?: string;
  avenue?: string;
  numeroParcelle?: string;
  pointDeRepere?: string;
  latitude?: number;
  longitude?: number;
  /** C2 : origine de la position ; QUARTIER, COMMUNE, VILLE = approximative ; AUCUNE = pas sur la carte. */
  precisionLocalisation?: PrecisionLocalisation;
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
  /** C12 (RDC) */
  garantieMois?: number;
  avanceMois?: number;
  /** C11 */
  equipements?: Equipement[];
  heuresElectriciteParJour?: number;
  /** J3 : devise des montants du bien. */
  devise?: Devise;
  meuble?: boolean;
  colocation?: boolean;
  disponibleDe?: string;
  /** B12 : bien archivé par l'administration (lecture seule). Absent de la vue publique. */
  archive?: boolean;
  /**
   * Vue privée : propriétaire complet. Vue publique (P0-6) : prénom, initiale du nom et photo seulement
   * (ni id, ni e-mail) — cf. BienService.getPublic.
   */
  proprietaire: UserDTO;
  locataire?: UserDTO;
  contrats: string[] | null;
  quittances: string[] | null;
  documents: string[] | null;
  images: string[] | null;
  /** R1 : vignettes de 400 px, dans le même ordre que `images` (listes, cartes). */
  vignettes?: string[] | null;
  pois: string[] | null;
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

export interface LocataireSearchDTO {
  firstName?: string;
  lastName?: string;
  mail?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: 'ASC' | 'DESC';
}

export interface LocatairePageDTO {
  contenu: UserDTO[];
  pageActuelle: number;
  totalPages: number;
  totalElements: number;
  dernierePage: boolean;
  premierePage: boolean;
}

export interface BienPageDTO {
  contenu: BienDTO[];
  pageActuelle: number;
  totalPages: number;
  totalElements: number;
  dernierePage: boolean;
  premierePage: boolean;
}

export interface BienFilters {
  q?: string;
  typeBien?: string;
  ville?: string;
  codePostal?: string;
  loyerMax?: number;
  surfaceMin?: number;
  nbPiecesMin?: number;
  nbChambresMin?: number;
  classeEnergieMax?: string;
  pois?: string[];
  meuble?: boolean;
  colocation?: boolean;
  ascenseur?: boolean;
  sortBy?: 'date_desc' | 'date_asc' | 'prix_asc' | 'prix_desc' | 'surface_desc';
}

/** C2 : origine de la position d'un bien. */
/** R1 : vignette de 400 px de la i-ème photo (la photo elle-même si elle date d'avant R1), ou null. */
export function vignette(b: Pick<BienDTO, 'images' | 'vignettes'>, i: number): string | null {
  return b.vignettes?.[i] ?? b.images?.[i] ?? null;
}

export type PrecisionLocalisation = 'REPERE' | 'ADRESSE' | 'QUARTIER' | 'COMMUNE' | 'VILLE' | 'AUCUNE';

/** C2 : message à afficher quand la position n'est pas exacte (null si exacte ou inconnue). */
export function positionApproximative(precision: PrecisionLocalisation | undefined | null): string | null {
  switch (precision) {
    case 'QUARTIER': return 'Position approximative (centre du quartier)';
    case 'COMMUNE':  return 'Position approximative (centre de la commune)';
    case 'VILLE':    return 'Position approximative (centre de la ville)';
    case 'AUCUNE':   return 'Position inconnue : le logement n\'apparaît pas sur la carte';
    default:         return null;
  }
}
