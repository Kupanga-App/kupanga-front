import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { GROUPE_DONNEES_HORS_LIGNE, HorsLigneService, viderDonneesHorsLigne } from './hors-ligne.service';
import { AuthService } from '../auth/services/auth.service';

/** Noms des caches tels que les crée le service worker d'Angular. */
const CACHE_DONNEES = `ngsw:/:v-test:data:${GROUPE_DONNEES_HORS_LIGNE}:cache`;
const TABLE_AGE = `ngsw:/:db:v-test:data:${GROUPE_DONNEES_HORS_LIGNE}:age`;
const CACHE_APPLICATION = 'ngsw:/:v-test:assets:app:cache';

async function remplir(nom: string, url: string): Promise<void> {
  const cache = await caches.open(nom);
  await cache.put(url, new Response('{"quittances":[]}'));
}

async function nombreEntrees(nom: string): Promise<number> {
  return (await (await caches.open(nom)).keys()).length;
}

async function attendreVidage(): Promise<void> {
  for (let i = 0; i < 50 && await nombreEntrees(CACHE_DONNEES) > 0; i++) {
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}

describe('Mode hors ligne (R2)', () => {
  beforeEach(async () => {
    await remplir(CACHE_DONNEES, 'https://api.test/quittances/mes-quittances');
    await remplir(TABLE_AGE, 'https://api.test/quittances/mes-quittances');
    await remplir(CACHE_APPLICATION, 'https://front.test/main.js');
  });

  afterEach(async () => {
    await Promise.all([CACHE_DONNEES, TABLE_AGE, CACHE_APPLICATION].map(nom => caches.delete(nom)));
    localStorage.clear();
  });

  it('vide les données de l’API gardées hors ligne, sans toucher aux fichiers de l’application', async () => {
    await viderDonneesHorsLigne();

    expect(await nombreEntrees(CACHE_DONNEES)).toBe(0);
    expect(await nombreEntrees(TABLE_AGE)).toBe(0);
    expect(await nombreEntrees(CACHE_APPLICATION)).toBe(1);
  });

  describe('avec AuthService', () => {
    let auth: AuthService;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
      });
      auth = TestBed.inject(AuthService);
    });

    it('déconnexion ou session expirée : plus aucune donnée du compte hors ligne (appareil partagé)', async () => {
      auth.clearClientState();
      await attendreVidage();

      expect(await nombreEntrees(CACHE_DONNEES)).toBe(0);
    });

    it('nouvelle connexion : les données d’un compte précédent sont effacées avant tout', async () => {
      auth.login({ mail: 'b@b.fr', password: 'x' }).subscribe({ error: () => undefined });
      await attendreVidage();

      expect(await nombreEntrees(CACHE_DONNEES)).toBe(0);
    });
  });

  it('suit l’état du réseau', () => {
    TestBed.configureTestingModule({});
    const service = TestBed.inject(HorsLigneService);
    const enLigne = spyOnProperty(navigator, 'onLine').and.returnValue(false);

    window.dispatchEvent(new Event('offline'));
    expect(service.enLigne()).toBeFalse();

    enLigne.and.returnValue(true);
    window.dispatchEvent(new Event('online'));
    expect(service.enLigne()).toBeTrue();
    expect(service.nouvelleVersion()).toBeFalse();
  });
});
