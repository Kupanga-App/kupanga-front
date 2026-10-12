import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../auth/services/auth.service';
import { environment } from '../../../environments/environment';

/**
 * Lectures de l'API gardées pour le mode hors ligne (`ngsw-config.json`, groupe `donnees-hors-ligne`).
 * Chemins exacts : une nouvelle route n'est jamais mise en cache sans être ajoutée ici et dans `ngsw-config.json`.
 */
const CHEMINS_HORS_LIGNE = [
  /^\/locataire\/dashboard\/\d+$/,
  /^\/quittances\/mes-quittances$/,
  /^\/quittances\/bien\/\d+$/,
  /^\/users\/biens(\/\d+)?$/,
  /^\/historique$/,
  /^\/notifications$/,
];

/** Paramètre ajouté aux lectures mises en cache ; l'API l'ignore. */
export const PARAM_COMPTE = 'c';

export function estDonneeHorsLigne(url: string): boolean {
  if (!url.startsWith(`${environment.apiUrl}/`)) return false;
  const chemin = new URL(url).pathname;
  return CHEMINS_HORS_LIGNE.some(motif => motif.test(chemin));
}

/**
 * R2 (revue) : le service worker indexe son cache par l'URL seule (ni jeton, ni cookie). Sans ce paramètre,
 * une réponse lente du compte A, écrite dans le cache après la déconnexion et le vidage, pourrait être servie
 * au compte B sur le même appareil. Avec l'identifiant du compte dans l'URL, chaque compte a ses propres
 * entrées ; `ngsw-config.json` n'accepte que les URL qui portent ce paramètre (sans compte connu : pas de cache).
 */
export const compteCacheInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.method !== 'GET' || !estDonneeHorsLigne(req.url)) {
    return next(req);
  }
  const id = inject(AuthService).currentUser()?.id;
  return id == null ? next(req) : next(req.clone({ setParams: { [PARAM_COMPTE]: String(id) } }));
};
