import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { Observable, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { User } from '../models/user.model';
import { LogementContextService } from '../../services/logement-context.service';

/** Espaces du compte, déjà relus par `LogementContextService.charger()`. */
export interface EspacesCompte {
  aDesBiens: boolean;
  aUnLogement: boolean;
}

/**
 * Écran d'arrivée d'un compte. Lot 3 : plus de rôle, l'accueil se déduit des espaces du compte :
 * un compte qui loue un logement et ne possède aucun bien arrive sur « Mon logement » ; tous les autres sur
 * l'accueil (qui montre les biens possédés, les logements loués, les demandes et réservations).
 * Visiteur : les annonces. Compte Google sans profil d'accueil : choix « louer / mettre en location ».
 */
export function accueilPour(user: User | null, espaces?: EspacesCompte): string {
  if (!user) return '/explorer';
  if (!user.role) return '/auth/google-role';
  if (espaces?.aUnLogement && !espaces.aDesBiens) return '/mon-logement';
  return '/accueil';
}

/** Adresse de retour acceptée après connexion : un chemin interne seulement (jamais `//autre-site` ni `https:`). */
export function retourSur(url: string | null | undefined): string | null {
  if (!url || !url.startsWith('/') || url.startsWith('//') || url.startsWith('/\\') || url.startsWith('/auth')) {
    return null;
  }
  return url;
}

/** Écran demandé réservé aux comptes connectés : sinon connexion, puis retour sur cet écran. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.getAccessToken() && auth.currentUser()) {
    if (!auth.currentUser()?.role) {
      return router.createUrlTree(['/auth/google-role']);
    }
    return true;
  }
  return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
};

/**
 * Racine `/` : vers l'écran d'arrivée du compte. Ses espaces (biens, logement) sont relus une fois par session
 * par `charger()`, sans autre appel ; hors ligne, les dernières valeurs gardées servent.
 */
export const accueilGuard: CanActivateFn = (): Observable<UrlTree> => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const logement = inject(LogementContextService);
  const user = auth.getAccessToken() ? auth.currentUser() : null;
  if (user?.role) {
    return logement.charger(user.id).pipe(map(() => router.createUrlTree([
      accueilPour(user, { aDesBiens: logement.aDesBiens(), aUnLogement: logement.hasLogement() }),
    ])));
  }
  return of(router.createUrlTree([accueilPour(user)]));
};

/** Racine `/` : la landing page pour un visiteur, l'accueil pour un compte connecté. */
export const landingGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  return auth.getAccessToken() && auth.currentUser() ? accueilGuard(route, state) : true;
};

/** Pages de connexion et d'inscription : un compte déjà connecté va à son accueil. */
export const invitesGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.getAccessToken() && auth.currentUser()?.role) {
    return router.createUrlTree(['/']);
  }
  return true;
};
