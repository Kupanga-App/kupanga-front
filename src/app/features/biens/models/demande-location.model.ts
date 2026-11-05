import { Pays } from './bien.model';
import { Statut } from '../../../shared/format';

/** Demande de location : le propriétaire propose son bien, le locataire accepte ou refuse (72 h). */
export type StatutDemandeLocation = 'EN_ATTENTE' | 'ACCEPTEE' | 'REFUSEE' | 'ANNULEE' | 'EXPIREE';

export interface DemandeLocation {
  id: number;
  bienId: number;
  titreBien: string;
  adresseBien: string;
  pays: Pays;
  locataireId: number;
  nomLocataire: string;
  nomProprietaire: string;
  /** Déjà `EXPIREE` si le délai est dépassé, même sans réponse. */
  statut: StatutDemandeLocation;
  dateCreation: string;
  dateExpiration: string;
  dateReponse: string | null;
}

const STATUTS: Record<StatutDemandeLocation, Statut> = {
  EN_ATTENTE: { libelle: 'En attente de réponse', ton: 'attention' },
  ACCEPTEE: { libelle: 'Acceptée', ton: 'ok' },
  REFUSEE: { libelle: 'Refusée', ton: 'danger' },
  ANNULEE: { libelle: 'Retirée', ton: 'neutre' },
  EXPIREE: { libelle: 'Expirée', ton: 'neutre' },
};

export function statutDemande(statut: StatutDemandeLocation): Statut {
  return STATUTS[statut] ?? { libelle: statut, ton: 'neutre' };
}

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre',
  'novembre', 'décembre'];

/** « 6 novembre à 10 h 00 » (date et heure locales renvoyées par l'API). */
export function echeance(valeur: string | null | undefined): string {
  if (!valeur) return '';
  const d = new Date(valeur);
  if (isNaN(d.getTime())) return '';
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${MOIS[d.getMonth()]} à ${d.getHours()} h ${minutes}`;
}
