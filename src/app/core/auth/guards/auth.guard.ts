import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { Observable, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { User } from '../models/user.model';
import { LogementContextService } from '../../services/logement-context.service';

export type Role = User['role'];

/** Écran d'accueil d'un compte : à faire du propriétaire, logement du locataire (annonces s'il n'en a pas). */
export function accueilPour(user: User | null, aUnLogement: boolean): string {
  if (!user) return '/explorer';
  if (!user.role) return '/auth/google-role';
  if (user.role === 'ROLE_PROPRIETAIRE') return '/accueil';
  return aUnLogement ? '/mon-logement' : '/explorer';
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

/** Écran réservé à un rôle : un autre compte est renvoyé vers son accueil (au lieu d'un 403 à l'envoi). */
export function roleGuard(role: Role): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const user = auth.currentUser();
    if (user?.role === role) return true;
    return router.createUrlTree([accueilPour(user, inject(LogementContextService).hasLogement())]);
  };
}

/** Racine `/` : vers l'accueil du rôle (le logement du locataire est relu une fois par session). */
export const accueilGuard: CanActivateFn = (): Observable<UrlTree> => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const logement = inject(LogementContextService);
  const user = auth.getAccessToken() ? auth.currentUser() : null;
  if (user?.role === 'ROLE_LOCATAIRE') {
    return logement.charger().pipe(map(id => router.createUrlTree([accueilPour(user, id !== null)])));
  }
  return of(router.createUrlTree([accueilPour(user, false)]));
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
