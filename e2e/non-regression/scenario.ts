import type { Compte } from '../outils/comptes';

/**
 * Écrans comparés, par compte (routes de src/app/app.routes.ts) : chaque page est chargée seule, le réseau se
 * calme, puis ses appels à l'API sont relevés. Aucun clic : le scénario ne dépend pas de l'interface.
 */
export const ECRANS: { compte: Compte | null; route: string }[] = [
  // Visiteur
  { compte: null, route: '/' },
  { compte: null, route: '/explorer' },
  { compte: null, route: '/annonces/2' },
  { compte: null, route: '/annonces/142' },
  // Propriétaire (France)
  { compte: 'claire', route: '/accueil' },
  { compte: 'claire', route: '/biens' },
  { compte: 'claire', route: '/biens/1' },
  { compte: 'claire', route: '/biens/2' },
  { compte: 'claire', route: '/biens/1/bail' },
  { compte: 'claire', route: '/biens/1/etats-des-lieux' },
  { compte: 'claire', route: '/biens/1/quittances' },
  { compte: 'claire', route: '/documents' },
  { compte: 'claire', route: '/messages' },
  { compte: 'claire', route: '/notifications' },
  { compte: 'claire', route: '/compte' },
  { compte: 'claire', route: '/explorer' },
  { compte: 'claire', route: '/annonces/2' },
  // Propriétaire (RDC)
  { compte: 'patrick', route: '/accueil' },
  { compte: 'patrick', route: '/biens/141' },
  { compte: 'patrick', route: '/biens/141/bail' },
  { compte: 'patrick', route: '/biens/141/quittances' },
  // Locataires
  { compte: 'lucas', route: '/mon-logement' },
  { compte: 'lucas', route: '/quittances' },
  { compte: 'lucas', route: '/documents' },
  { compte: 'lucas', route: '/messages' },
  { compte: 'lucas', route: '/notifications' },
  { compte: 'lucas', route: '/compte' },
  { compte: 'grace', route: '/mon-logement' },
  { compte: 'grace', route: '/quittances' },
  // Candidate
  { compte: 'ines', route: '/accueil' },
  { compte: 'ines', route: '/demandes-location' },
  { compte: 'ines', route: '/explorer' },
  { compte: 'ines', route: '/annonces/2' },
];

export const cleEcran = (e: { compte: Compte | null; route: string }) => `${e.compte ?? 'visiteur'} ${e.route}`;
