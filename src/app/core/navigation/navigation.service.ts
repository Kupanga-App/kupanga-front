import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../auth/services/auth.service';
import { LogementContextService } from '../services/logement-context.service';

export interface Onglet {
  libelle: string;
  icone: string;
  lien: string;
  /** Pastille de non-lus. */
  /** `messages` : pastille des non-lus ; `biens` : nombre de biens possédés, discret. */
  compteur?: 'messages' | 'biens';
}

/**
 * Profil de navigation, déduit des données du compte (pas de rôle depuis le lot 3) :
 * un compte qui possède un bien est « propriétaire », même s'il loue aussi un logement.
 */
export type ProfilNavigation = 'visiteur' | 'candidat' | 'locataire' | 'proprietaire';

/** Nombre maximal d'onglets dans la barre du bas d'un téléphone. */
export const ONGLETS_MOBILE_MAX = 5;

const EXPLORER: Onglet = { libelle: 'Explorer', icone: 'compass', lien: '/explorer' };
const CONNEXION: Onglet = { libelle: 'Se connecter', icone: 'log-in', lien: '/auth/login' };
const MESSAGES: Onglet = { libelle: 'Messages', icone: 'message-circle', lien: '/messages', compteur: 'messages' };
const COMPTE: Onglet = { libelle: 'Compte', icone: 'user', lien: '/compte' };
const DOCUMENTS: Onglet = { libelle: 'Documents', icone: 'file-text', lien: '/documents' };
const ACCUEIL: Onglet = { libelle: 'Accueil', icone: 'house', lien: '/accueil' };
const BIENS: Onglet = { libelle: 'Mes biens', icone: 'building-2', lien: '/biens', compteur: 'biens' };
const MON_LOGEMENT: Onglet = { libelle: 'Mon logement', icone: 'key', lien: '/mon-logement' };
const QUITTANCES: Onglet = { libelle: 'Quittances', icone: 'receipt', lien: '/quittances' };

/**
 * Navigation par profil (docs/refonte-front/00-vue-ensemble.md, « Profils de navigation ») :
 * - ordinateur : barre latérale pour le propriétaire, barre du haut pour les autres ;
 * - téléphone : en-tête et onglets du bas, pour tous.
 * La cloche des notifications et le compte sont dans la barre (latérale, du haut ou en-tête du téléphone).
 */
@Injectable({ providedIn: 'root' })
export class NavigationService {
  private auth = inject(AuthService);
  private logement = inject(LogementContextService);
  private router = inject(Router);

  /**
   * Écran plein (assistant, signature, conversation ouverte sur téléphone) : sans barres.
   * `pleinEcran: true` dans les données de la route, ou `pleinEcranDemande` posé par un écran (et remis à faux
   * par lui à sa destruction).
   */
  private readonly pleinEcranRoute = signal(false);
  readonly pleinEcranDemande = signal(false);
  readonly pleinEcran = computed(() => this.pleinEcranRoute() || this.pleinEcranDemande());

  /** Les espaces du compte (biens, logement) ont été relus depuis l'API pendant cette session (ou hors ligne). */
  private readonly espacesLus = signal(false);

  /** Le compte possède au moins un bien / loue un logement. */
  readonly aDesBiens = computed(() => this.logement.aDesBiens());
  readonly aUnLogement = computed(() => this.logement.hasLogement());

  readonly profil = computed<ProfilNavigation>(() => {
    if (!this.auth.currentUser()) return 'visiteur';
    if (this.logement.aDesBiens()) return 'proprietaire';
    if (this.logement.hasLogement()) return 'locataire';
    return 'candidat';
  });

  /**
   * Profil sûr : faux tant qu'un compte connecté n'a ni valeur en cache ni réponse de l'API (juste après la
   * connexion). La mise en page attend alors pour ne pas montrer la barre du candidat puis basculer.
   */
  readonly profilConnu = computed(() => {
    const user = this.auth.currentUser();
    return !user?.role || this.espacesLus() || this.logement.aDesBiens() || this.logement.hasLogement();
  });

  /** Accès aux documents (bail, états des lieux, quittances) : le compte possède un bien ou loue un logement. */
  readonly aDesDocuments = computed(() =>
    !!this.auth.currentUser() && (this.logement.aDesBiens() || this.logement.hasLogement()));

  /** Entrées de la barre latérale (propriétaire) ou de la barre du haut (autres profils), sur ordinateur. */
  readonly onglets = computed<Onglet[]>(() => {
    switch (this.profil()) {
      case 'visiteur':
        return [EXPLORER, CONNEXION];
      case 'proprietaire': {
        const onglets = [ACCUEIL, BIENS];
        if (this.logement.hasLogement()) onglets.push(MON_LOGEMENT, QUITTANCES);
        onglets.push(MESSAGES);
        if (this.aDesDocuments()) onglets.push(DOCUMENTS);
        return onglets;
      }
      case 'locataire':
        return [ACCUEIL, MON_LOGEMENT, EXPLORER];
      case 'candidat':
        return [ACCUEIL, EXPLORER, MESSAGES];
    }
  });

  /** Onglets de la barre du bas (téléphone). */
  readonly ongletsMobile = computed<Onglet[]>(() => {
    const documents = this.aDesDocuments() ? [DOCUMENTS] : [];
    switch (this.profil()) {
      case 'visiteur':
        return [EXPLORER, CONNEXION];
      case 'proprietaire':
        return [ACCUEIL, BIENS, MESSAGES, ...documents, COMPTE];
      case 'locataire':
        return [ACCUEIL, MON_LOGEMENT, MESSAGES, ...documents, COMPTE];
      case 'candidat':
        return [ACCUEIL, EXPLORER, MESSAGES, COMPTE];
    }
  });

  constructor() {
    // Lot 3 : espaces (biens possédés, logement loué) relus à la connexion d'un compte
    effect(() => {
      const user = this.auth.currentUser();
      if (user?.role) {
        untracked(() => this.logement.charger(user.id).subscribe({
          next: () => this.espacesLus.set(true),
          error: () => this.espacesLus.set(true),
        }));
      } else {
        untracked(() => this.espacesLus.set(false));
      }
    });
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      let route: ActivatedRouteSnapshot | null = this.router.routerState.snapshot.root;
      let plein = false;
      while (route) {
        plein ||= !!route.data['pleinEcran'];
        route = route.firstChild;
      }
      this.pleinEcranRoute.set(plein);
    });
  }
}
