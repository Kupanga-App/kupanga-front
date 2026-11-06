/**
 * Pages légales servies par l'application (routes publiques, sans compte).
 * En production, déclarer les mêmes adresses (https://<domaine du front>/confidentialite et /conditions)
 * dans Google Auth Platform (Branding).
 */
export const LIENS_LEGAUX = {
  confidentialite: '/confidentialite',
  conditions: '/conditions',
} as const;

/** Date affichée en tête des deux pages : à changer à chaque modification du texte. */
export const DATE_MISE_A_JOUR_LEGALE = '6 novembre 2026';

/**
 * Informations sur l'éditeur, reprises dans les deux pages : remplacer chaque valeur entre crochets.
 * Tant qu'une valeur commence par « [ », elle est surlignée dans la page.
 */
export const EDITEUR = {
  nom: '[NOM OU RAISON SOCIALE À COMPLÉTER]',
  adresse: '[ADRESSE À COMPLÉTER]',
  contact: '[ADRESSE E-MAIL DE CONTACT À COMPLÉTER]',
  hebergeur: '[À COMPLÉTER : nom et pays de l’hébergeur]',
  droitApplicable: '[DROIT APPLICABLE ET TRIBUNAUX COMPÉTENTS À FAIRE VALIDER]',
} as const;

export function aCompleter(valeur: string): boolean {
  return valeur.startsWith('[');
}
