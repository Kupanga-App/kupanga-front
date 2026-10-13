import { EtatElement, TypeCompteur, TypeElement } from './edl.model';

/** Libellés des compteurs (C13 : Cash Power et groupe électrogène en RDC), éléments et états d'un état des lieux. */
export const COMPTEURS: { valeur: TypeCompteur; libelle: string; unite: string }[] = [
  { valeur: 'ELECTRICITE', libelle: 'Électricité', unite: 'kWh' },
  { valeur: 'ELECTRICITE_HP', libelle: 'Électricité heures pleines', unite: 'kWh' },
  { valeur: 'ELECTRICITE_HC', libelle: 'Électricité heures creuses', unite: 'kWh' },
  // C13 : compteur prépayé SNEL (crédit restant) et compteur d'heures du groupe électrogène
  { valeur: 'CASH_POWER', libelle: 'Cash Power (prépayé)', unite: 'kWh' },
  { valeur: 'GROUPE_ELECTROGENE', libelle: 'Groupe électrogène', unite: 'h' },
  { valeur: 'EAU_FROIDE', libelle: 'Eau froide', unite: 'm³' },
  { valeur: 'EAU_CHAUDE', libelle: 'Eau chaude', unite: 'm³' },
  { valeur: 'GAZ', libelle: 'Gaz', unite: 'm³' },
];

export const ELEMENTS: { valeur: TypeElement; libelle: string }[] = [
  { valeur: 'MUR', libelle: 'Murs' },
  { valeur: 'SOL', libelle: 'Sol' },
  { valeur: 'PLAFOND', libelle: 'Plafond' },
  { valeur: 'PORTE', libelle: 'Porte' },
  { valeur: 'FENETRE', libelle: 'Fenêtre' },
  { valeur: 'VOLET', libelle: 'Volet' },
  { valeur: 'PRISE', libelle: 'Prises électriques' },
  { valeur: 'LUMINAIRE', libelle: 'Luminaire' },
  { valeur: 'RADIATEUR', libelle: 'Radiateur' },
  { valeur: 'EQUIPEMENT', libelle: 'Équipement' },
  { valeur: 'AUTRE', libelle: 'Autre' },
];

export const ETATS: { valeur: EtatElement; libelle: string }[] = [
  { valeur: 'BON', libelle: 'Bon' },
  { valeur: 'USAGE_NORMAL', libelle: 'Usé' },
  { valeur: 'MAUVAIS', libelle: 'Mauvais' },
  { valeur: 'HORS_SERVICE', libelle: 'Hors service' },
];
