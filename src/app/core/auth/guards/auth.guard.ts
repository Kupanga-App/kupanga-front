import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Pour une vérification simple, on regarde juste la présence du token.
  // Pour une approche plus robuste, on pourrait vérifier la validité du token
  // ou l'état de l'utilisateur dans le service.
  if (authService.getAccessToken()) {
    return true; // L'utilisateur est authentifié, accès autorisé
  }

  // L'utilisateur n'est pas authentifié, redirection vers la page de login
  router.navigate(['/auth/login']);
  return false;
};
