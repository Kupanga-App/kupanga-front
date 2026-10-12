import { ModePaiement } from '../../gestion-logement/models/quittance.model';
import { Devise } from '../../../core/money/montant';
import { BienType, Equipement, Pays } from './bien.model';

/**
 * J6 : configuration du formulaire de bien pour un pays (`GET /juridictions/{pays}`).
 * Le formulaire s'adapte au pays choisi ; l'API revalide toujours (un champ masqué envoyé est refusé en 400).
 */
export interface JuridictionConfig {
  pays: Pays;
  libelle: string;
  /** Devises acceptées, la première proposée étant `deviseDefaut`. */
  devises: Devise[];
  deviseDefaut: Devise;
  /** Champs du formulaire obligatoires dans ce pays (noms de `BienFormDTO`). */
  champsObligatoires: string[];
  /** Champs sans objet dans ce pays : ni affichés, ni envoyés. */
  champsMasques: string[];
  typesBien: BienType[];
  /** C7-C16 : `WHATSAPP_LIEN` → boutons « Envoyer par WhatsApp » sur les documents des biens de ce pays. */
  canauxNotification: CanalNotification[];
  /** C8-bis : modes de paiement que le propriétaire peut déclarer dans ce pays. */
  modesPaiement: ModePaiement[];
  /** C11 : équipements proposés pour un bien. */
  equipements: Equipement[];
  /** C13 : compteurs proposés dans un état des lieux. */
  compteursEdl: string[];
}

export type CanalNotification = 'EMAIL' | 'WHATSAPP_LIEN';

/** Les liens WhatsApp sont-ils proposés pour les biens de ce pays ? */
export function whatsappPropose(config: JuridictionConfig | null | undefined): boolean {
  return !!config?.canauxNotification?.includes('WHATSAPP_LIEN');
}

/** Pays dans lesquels un bien peut être créé (`GET /juridictions`). */
export interface PaysPrisEnCharge {
  pays: Pays;
  libelle: string;
}

/** Le champ s'applique-t-il aux biens de ce pays ? (tout est affiché tant que la configuration n'est pas chargée) */
export function champVisible(config: JuridictionConfig | null | undefined, champ: string): boolean {
  return !config?.champsMasques.includes(champ);
}

/** Le champ est-il obligatoire pour un bien de ce pays ? */
export function champObligatoire(config: JuridictionConfig | null | undefined, champ: string): boolean {
  return !!config?.champsObligatoires.includes(champ);
}
