/** Texte de la carte posée sur la photo des écrans d'authentification (ordinateur seulement). */
export interface PanneauAuth {
  titre: string;
  promesses: { icone: string; texte: string }[];
}

export const PANNEAU_CONNEXION: PanneauAuth = {
  titre: 'Votre location, du premier message à la dernière quittance.',
  promesses: [
    { icone: 'banknote', texte: 'Aucun argent ne transite par l’application' },
    { icone: 'lock', texte: 'Votre e-mail et votre numéro restent privés' },
    { icone: 'globe', texte: 'En France et en RDC, en €, $US ou CDF' },
  ],
};

export const PANNEAU_LOCATAIRE: PanneauAuth = {
  titre: 'Trouvez un logement et échangez directement avec le propriétaire.',
  promesses: [
    { icone: 'search', texte: 'Annonces de particuliers, en France et en RDC' },
    { icone: 'eye-off', texte: 'Votre e-mail n’est jamais montré au propriétaire' },
    { icone: 'file-text', texte: 'Vos documents de location au même endroit' },
  ],
};

export const PANNEAU_PROPRIETAIRE: PanneauAuth = {
  titre: 'Publiez votre bien, signez le bail, suivez les quittances.',
  promesses: [
    { icone: 'credit-card', texte: 'Gratuit, sans carte bancaire' },
    { icone: 'signature', texte: 'Bail et état des lieux signés à l’écran' },
    { icone: 'smartphone', texte: 'Loyers encaissés hors application, Mobile Money compris' },
  ],
};
