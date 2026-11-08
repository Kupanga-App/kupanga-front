/**
 * Écarts justifiés entre la branche d'origine et la refonte. Chaque entrée renvoie à une décision écrite dans
 * docs/refonte-front/00-vue-ensemble.md : un écran peut réutiliser une méthode de service déjà appelée ailleurs
 * dans le front (règle 2). Tout autre écart fait échouer la comparaison.
 *
 * `appel` : « MÉTHODE /chemin/normalisé » ; `ecrans` : « compte /route » (préfixe accepté : « claire /biens/ »).
 */
export interface Exception {
  appel: string;
  ecrans: string[];
  sens: 'en plus' | 'en moins' | 'réponse différente';
  raison: string;
}

export const EXCEPTIONS: Exception[] = [
  {
    appel: 'POST /conversations/search',
    ecrans: ['claire /accueil', 'patrick /accueil'],
    sens: 'en plus',
    raison: 'Phase 5 : « N conversations en cours » et « N personnes vous ont écrit » sur l’accueil propriétaire '
      + '(ChatService.searchConversations, déjà appelé par la messagerie ; décision du 7 novembre 2026).',
  },
  {
    appel: 'POST /conversations/search',
    ecrans: ['ines /accueil'],
    sens: 'en plus',
    raison: 'Phase 4 : conversations en cours sur l’accueil candidat (ChatService.searchConversations).',
  },
  {
    appel: 'POST /conversations/search',
    ecrans: ['claire /biens/2'],
    sens: 'en plus',
    raison: 'Phase 3 : fiche d’un bien vacant, « la dernière personne qui a écrit » (ChatService.searchConversations).',
  },
  {
    appel: 'POST /contrats/search',
    ecrans: ['lucas /mon-logement', 'grace /mon-logement'],
    sens: 'en plus',
    raison: 'Phase 4 : ContratService.getByBien sur Mon logement ; le tableau de bord ne renvoie que le bail signé, '
      + 'le bail en attente du locataire n’apparaissait jamais dans « À signer ».',
  },
  {
    appel: 'GET /users/biens/:id',
    ecrans: ['lucas /quittances', 'grace /quittances'],
    sens: 'en plus',
    raison: 'Phase 4 : BienService.getPrive pour l’en-tête de Mon logement (titre, adresse, propriétaire) sur /quittances.',
  },
  {
    appel: 'GET /juridictions/FR',
    ecrans: ['visiteur /annonces/2', 'claire /annonces/2', 'ines /annonces/2'],
    sens: 'en plus',
    raison: 'Phase 5 : JuridictionService.configuration(pays) sur l’annonce (champs selon le pays ; déjà lu par le '
      + 'formulaire du bien).',
  },
  {
    appel: 'GET /juridictions/CD',
    ecrans: ['visiteur /annonces/142'],
    sens: 'en plus',
    raison: 'Phase 5 : JuridictionService.configuration(pays) sur l’annonce.',
  },
  {
    appel: 'GET /users/biens/:id',
    ecrans: ['claire /annonces/2'],
    sens: 'en plus',
    raison: 'Phase 5 : annonce vue par son propriétaire (Annonce-Proprio) : BienService.getPrive pour un compte qui '
      + 'possède des biens (décision du 7 novembre 2026).',
  },
  {
    appel: 'GET /quittances/:id/lien-whatsapp',
    ecrans: ['patrick /biens/141/quittances'],
    sens: 'en moins',
    raison: 'Phase 3 : le bouton « Rappel par WhatsApp » est passé dans la feuille « Actions sur la quittance… » ; '
      + 'le même GET part à son ouverture (vérifié par proprietaire.spec.ts).',
  },
];

export function exceptionsPour(ecran: string): { enPlus: string[]; enMoins: string[]; reponsesDifferentes: string[] } {
  const concernees = EXCEPTIONS.filter(e => e.ecrans.some(p => ecran === p || (p.endsWith('/') && ecran.startsWith(p))));
  return {
    enPlus: concernees.filter(e => e.sens === 'en plus').map(e => e.appel),
    enMoins: concernees.filter(e => e.sens === 'en moins').map(e => e.appel),
    reponsesDifferentes: concernees.filter(e => e.sens === 'réponse différente').map(e => e.appel),
  };
}
