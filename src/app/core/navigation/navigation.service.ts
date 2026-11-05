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
  compteur?: 'messages';
  /**
   * Faux : barre latérale seulement (la barre du bas d'un téléphone n'a de place que pour 5 onglets) ;
   * l'écran reste joignable depuis l'accueil et le compte.
   */
  mobile?: boolean;
}

/** Nombre maximal d'onglets dans la barre du bas d'un téléphone. */
export const ONGLETS_MOBILE_MAX = 5;

const EXPLORER: Onglet = { libelle: 'Explorer', icone: 'compass', lien: '/explorer' };
const MESSAGES: Onglet = { libelle: 'Messages', icone: 'message-circle', lien: '/messages', compteur: 'messages' };
const COMPTE: Onglet = { libelle: 'Compte', icone: 'user', lien: '/compte' };
const DOCUMENTS: Onglet = { libelle: 'Documents', icone: 'file-text', lien: '/documents' };
const ACCUEIL: Onglet = { libelle: 'Accueil', icone: 'house', lien: '/accueil' };
const BIENS: Onglet = { libelle: 'Mes biens', icone: 'building-2', lien: '/biens', mobile: false };
const MON_LOGEMENT: Onglet = { libelle: 'Mon logement', icone: 'key', lien: '/mon-logement', mobile: false };
const QUITTANCES: Onglet = { libelle: 'Quittances', icone: 'receipt', lien: '/quittances', mobile: false };

/**
 * Navigation (AUDIT.md §6.2) : barre d'onglets du bas sur téléphone, barre latérale ailleurs.
 * Explorer est proposé à tout le monde : propriétaires et locataires peuvent toujours chercher un autre logement.
 * La cloche des notifications est dans l'en-tête des écrans (`kp-cloche`) et dans la barre latérale.
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

  /**
   * Lot 3 : mêmes onglets pour tous les comptes ; « Biens » apparaît quand le compte possède un bien,
   * « Mon logement » et « Quittances » quand il loue un logement (barre latérale ; sur téléphone, depuis l'accueil).
   */
  readonly onglets = computed<Onglet[]>(() => {
    const user = this.auth.currentUser();
    if (!user) {
      return [EXPLORER, { libelle: 'Se connecter', icone: 'log-in', lien: '/auth/login' }];
    }
    const onglets: Onglet[] = [ACCUEIL];
    if (this.logement.aDesBiens()) {
      onglets.push(BIENS);
    }
    if (this.logement.hasLogement()) {
      onglets.push(MON_LOGEMENT, QUITTANCES);
    }
    onglets.push(EXPLORER, MESSAGES);
    if (this.aDesDocuments()) {
      onglets.push(DOCUMENTS);
    }
    onglets.push(COMPTE);
    return onglets;
  });

  /** Le compte possède au moins un bien / loue un logement. */
  readonly aDesBiens = computed(() => this.logement.aDesBiens());
  readonly aUnLogement = computed(() => this.logement.hasLogement());

  /** Onglets de la barre du bas (téléphone). */
  readonly ongletsMobile = computed(() => this.onglets().filter(o => o.mobile !== false));

  /** Accès aux documents (bail, états des lieux, quittances) : le compte possède un bien ou loue un logement. */
  readonly aDesDocuments = computed(() =>
    !!this.auth.currentUser() && (this.logement.aDesBiens() || this.logement.hasLogement()));

  constructor() {
    // Lot 3 : espaces (biens possédés, logement loué) relus à la connexion d'un compte
    effect(() => {
      const user = this.auth.currentUser();
      if (user?.role) {
        untracked(() => this.logement.charger(user.id).subscribe());
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
