import { Pays } from './bien.model';
import { Statut } from '../../../shared/format';

/**
 * Location d'un bien (décision du 2026-11-05) : réservée quand le candidat accepte la demande, active quand il
 * signe le bail. Avant la signature, il peut se désister et le propriétaire retirer la réservation ;
 * sans bail signé, la réservation expire après 14 jours.
 */
export type StatutLocation = 'RESERVEE' | 'ACTIVE' | 'TERMINEE' | 'DESISTEE' | 'ANNULEE' | 'EXPIREE';

export interface Location {
  id: number;
  bienId: number;
  titreBien: string;
  adresseBien: string;
  pays: Pays;
  locataireId: number;
  nomLocataire: string;
  nomProprietaire: string;
  /** Déjà `EXPIREE` si l'échéance est passée. */
  statut: StatutLocation;
  dateReservation: string;
  /** Fin de la réservation si le bail n'est pas signé avant. */
  dateExpiration: string;
  dateDebut: string | null;
  dateFin: string | null;
  /** Fin de bail : date annoncée par le congé et qui l'a donné. */
  dateFinPrevue?: string | null;
  congeDonnePar?: 'PROPRIETAIRE' | 'LOCATAIRE' | null;
  depotRestitue?: number | null;
  motifRetenue?: string | null;
}

const STATUTS: Record<StatutLocation, Statut> = {
  RESERVEE: { libelle: 'Réservé', ton: 'attention' },
  ACTIVE: { libelle: 'Loué', ton: 'ok' },
  TERMINEE: { libelle: 'Terminée', ton: 'neutre' },
  DESISTEE: { libelle: 'Désistement', ton: 'neutre' },
  ANNULEE: { libelle: 'Réservation retirée', ton: 'neutre' },
  EXPIREE: { libelle: 'Réservation expirée', ton: 'neutre' },
};

export function statutLocation(statut: StatutLocation): Statut {
  return STATUTS[statut] ?? { libelle: statut, ton: 'neutre' };
}

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre',
  'novembre', 'décembre'];

/** « 19 novembre » : dernier jour de la réservation. */
export function finDeReservation(valeur: string | null | undefined): string {
  if (!valeur) return '';
  const d = new Date(valeur);
  if (isNaN(d.getTime())) return '';
  return `${d.getDate()} ${MOIS[d.getMonth()]}`;
}
