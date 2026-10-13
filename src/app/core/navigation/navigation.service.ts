import { Injectable, computed, inject, signal } from '@angular/core';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../auth/services/auth.service';
import { LogementContextService } from '../services/logement-context.service';

export interface Onglet {
  libelle: string;
  icone: string;
  lien: string;
  /** Pastille de non-lus. */
  compteur?: 'messages';
}

const EXPLORER: Onglet = { libelle: 'Explorer', icone: 'compass', lien: '/explorer' };
const MESSAGES: Onglet = { libelle: 'Messages', icone: 'message-circle', lien: '/messages', compteur: 'messages' };
const COMPTE: Onglet = { libelle: 'Compte', icone: 'user', lien: '/compte' };
const DOCUMENTS: Onglet = { libelle: 'Documents', icone: 'file-text', lien: '/documents' };

/**
 * Navigation fixe par rôle (AUDIT.md §6.2) : barre d'onglets du bas sur téléphone, barre latérale ailleurs.
 */
@Injectable({ providedIn: 'root' })
export class NavigationService {
  private auth = inject(AuthService);
  private logement = inject(LogementContextService);
  private router = inject(Router);

  /**
   * Écran plein (assistant, signature, conversation ouverte sur téléphone) : sans onglets.
   * `pleinEcran: true` dans les données de la route, ou `pleinEcranDemande` posé par un écran (et remis à faux
   * par lui à sa destruction).
   */
  private readonly pleinEcranRoute = signal(false);
  readonly pleinEcranDemande = signal(false);
  readonly pleinEcran = computed(() => this.pleinEcranRoute() || this.pleinEcranDemande());

  readonly onglets = computed<Onglet[]>(() => {
    const user = this.auth.currentUser();
    if (!user) {
      return [EXPLORER, { libelle: 'Se connecter', icone: 'log-in', lien: '/auth/login' }];
    }
    if (user.role === 'ROLE_PROPRIETAIRE') {
      return [
        { libelle: 'Accueil', icone: 'house', lien: '/accueil' },
        { libelle: 'Biens', icone: 'building-2', lien: '/biens' },
        DOCUMENTS,
        MESSAGES,
        COMPTE,
      ];
    }
    if (this.logement.hasLogement()) {
      return [
        { libelle: 'Mon logement', icone: 'house', lien: '/mon-logement' },
        { libelle: 'Quittances', icone: 'receipt', lien: '/quittances' },
        DOCUMENTS,
        MESSAGES,
        COMPTE,
      ];
    }
    return [EXPLORER, MESSAGES, COMPTE];
  });

  constructor() {
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
