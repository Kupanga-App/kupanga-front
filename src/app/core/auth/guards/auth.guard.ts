import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { Observable, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { User } from '../models/user.model';
import { LogementContextService } from '../../services/logement-context.service';

/**
 * Écran d'accueil : le même pour tous les comptes (lot 3, plus de rôle) ; il montre les biens possédés, les
 * logements loués, les demandes et réservations. Visiteur : les annonces. Compte Google sans profil d'accueil :
 * choix « louer / mettre en location ».
 */
export function accueilPour(user: User | null): string {
  if (!user) return '/explorer';
  if (!user.role) return '/auth/google-role';
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

/** Racine `/` : vers l'accueil (les espaces du compte sont relus une fois par session). */
export const accueilGuard: CanActivateFn = (): Observable<UrlTree> => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const logement = inject(LogementContextService);
  const user = auth.getAccessToken() ? auth.currentUser() : null;
  if (user?.role) {
    return logement.charger(user.id).pipe(map(() => router.createUrlTree([accueilPour(user)])));
  }
  return of(router.createUrlTree([accueilPour(user)]));
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
