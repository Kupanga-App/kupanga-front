import path from 'node:path';

/** Comptes de la base de démo (../kupanga-Api/GUIDE-DEMARRAGE.md). Mot de passe commun. */
export const MOT_DE_PASSE = 'Kupanga-Dev-2026';

export const COMPTES = {
  claire: { email: 'claire.martin@kupanga.dev', nom: 'Claire Martin' },
  patrick: { email: 'patrick.mbuyi@kupanga.dev', nom: 'Patrick Mbuyi' },
  lucas: { email: 'lucas.bernard@kupanga.dev', nom: 'Lucas Bernard' },
  grace: { email: 'grace.mukendi@kupanga.dev', nom: 'Grâce Mukendi' },
  ines: { email: 'ines.moreau@kupanga.dev', nom: 'Inès Moreau' },
} as const;

export type Compte = keyof typeof COMPTES;

/** Fichier d'état de session (cookies et localStorage) écrit par connexion.setup.ts, ignoré par git. */
export function fichierSession(compte: Compte): string {
  return path.join(__dirname, '..', '.auth', `${compte}.json`);
}

/** Données de démo utilisées par les tests (vérifiées le 7 novembre 2026). */
export const DEMO = {
  /** Bien de Claire loué à Lucas : bail n° 1 signé, état des lieux d'entrée n° 1, trois quittances. */
  bienLoueClaire: 1,
  /** Bien vacant de Claire (« Appartement T3 avec parking, Brotteaux »). */
  bienVacantClaire: 2,
  /** Bien de Patrick loué à Grâce (RDC, USD) : bail n° 2 et état des lieux n° 2 à signer par Grâce. */
  bienLouePatrick: 141,
  /** Annonce RDC. */
  annonceRdc: 142,
} as const;
