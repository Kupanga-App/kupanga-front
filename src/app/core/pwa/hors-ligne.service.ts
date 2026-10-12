import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';

/**
 * Groupe de données de l'API mis en cache par le service worker (`ngsw-config.json`, `dataGroups`).
 * Le service worker nomme ses caches `ngsw:<portée>:<version>:data:<groupe>:cache` (et `…:lru`, `…:age`
 * pour ses métadonnées).
 */
export const GROUPE_DONNEES_HORS_LIGNE = 'donnees-hors-ligne';

/**
 * R2 : efface les réponses de l'API gardées pour le mode hors ligne (tableau de bord, quittances, biens,
 * historique des messages, notifications).
 *
 * Appelé à la déconnexion, à l'expiration de la session et avant chaque connexion : sur un appareil partagé
 * (cybercafé, téléphone familial), un autre compte ne doit jamais voir ces données, même hors ligne.
 * Les entrées sont supprimées une à une plutôt que le cache entier : le service worker garde une référence
 * ouverte sur son cache, une suppression du cache entier ne lui serait visible qu'à son redémarrage.
 */
export async function viderDonneesHorsLigne(): Promise<void> {
  if (typeof caches === 'undefined') {
    return;
  }
  try {
    const noms = (await caches.keys()).filter(nom => nom.includes(`:data:${GROUPE_DONNEES_HORS_LIGNE}:`));
    await Promise.all(noms.map(async nom => {
      const cache = await caches.open(nom);
      const requetes = await cache.keys();
      await Promise.all(requetes.map(requete => cache.delete(requete)));
    }));
  } catch {
    // Stockage indisponible (navigation privée, quota) : rien n'a pu être gardé
  }
}

/**
 * R2 : état du réseau et mises à jour de l'application installée (PWA).
 */
@Injectable({ providedIn: 'root' })
export class HorsLigneService {
  /** Absent hors build de production (service worker désactivé) et dans les tests. */
  private readonly swUpdate = inject(SwUpdate, { optional: true });

  /** Faux quand le navigateur se sait hors ligne : les écrans affichent alors les dernières données gardées. */
  readonly enLigne = signal(typeof navigator === 'undefined' ? true : navigator.onLine);

  /** Une nouvelle version de l'application est téléchargée et prête. */
  readonly nouvelleVersion = signal(false);

  constructor() {
    const majReseau = () => this.enLigne.set(navigator.onLine);
    window.addEventListener('online', majReseau);
    window.addEventListener('offline', majReseau);
    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('online', majReseau);
      window.removeEventListener('offline', majReseau);
    });

    const swUpdate = this.swUpdate;
    if (swUpdate?.isEnabled) {
      swUpdate.versionUpdates
        .pipe(filter((e): e is VersionReadyEvent => e.type === 'VERSION_READY'))
        .subscribe(() => this.nouvelleVersion.set(true));
      // Service worker dans un état irrécupérable (fichiers de la version introuvables) : repartir du serveur
      swUpdate.unrecoverable.subscribe(() => this.recharger());
      // Au retour du réseau, chercher une nouvelle version (front et API sont livrés ensemble)
      window.addEventListener('online', () => void swUpdate.checkForUpdate().catch(() => undefined));
    }
  }

  /** Recharge la page pour passer à la nouvelle version. */
  recharger(): void {
    document.location.reload();
  }
}
