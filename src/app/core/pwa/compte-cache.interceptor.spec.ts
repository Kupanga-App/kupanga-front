import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Generator } from '@angular/service-worker/config';
import ngswConfig from '../../../../ngsw-config.json';
import { environment as environnementProd } from '../../../environments/environment.prod';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/services/auth.service';
import { compteCacheInterceptor, estDonneeHorsLigne } from './compte-cache.interceptor';

const API_PROD = 'https://kupanga-api.onrender.com';

/** Motifs réellement produits par le générateur d'Angular (comme `ngsw.json`). */
async function motifsDuCache(): Promise<RegExp[]> {
  const fs = { list: async () => [], read: async () => '', hash: async () => '', write: async () => undefined };
  const manifeste = await new Generator(fs, '/').process(ngswConfig as never) as {
    dataGroups: { name: string; patterns: string[] }[];
  };
  const groupe = manifeste.dataGroups.find(g => g.name === 'donnees-hors-ligne')!;
  return groupe.patterns.map(p => new RegExp(p));
}

describe('Cache hors ligne par compte (R2)', () => {
  it('ngsw-config.json vise l’URL de l’API de production', () => {
    expect(environnementProd.apiUrl).toBe(API_PROD);
    for (const url of ngswConfig.dataGroups[0].urls) {
      expect(url.startsWith(`${API_PROD}/`)).withContext(url).toBeTrue();
    }
  });

  it('seules les lectures prévues, portant la clé du compte, sont mises en cache', async () => {
    const motifs = await motifsDuCache();
    const enCache = (chemin: string) => motifs.some(m => m.test(API_PROD + chemin));

    for (const chemin of [
      '/users/biens?c=7', '/users/biens/12?c=7', '/quittances/mes-quittances?c=7', '/quittances/bien/4?c=7',
      '/locataire/dashboard/4?c=7', '/notifications?c=7', '/historique?bienId=3&emailInterlocuteur=a%40b.fr&c=7',
    ]) {
      expect(enCache(chemin)).withContext(chemin).toBeTrue();
    }
    for (const chemin of [
      // sans clé de compte : jamais en cache (sinon partagé entre comptes)
      '/users/biens', '/quittances/mes-quittances', '/notifications', '/historique?bienId=3&emailInterlocuteur=x',
      // routes sensibles ou publiques
      '/auth/me', '/auth/refresh', '/contrats/signer/abc', '/etats-des-lieux/signer/abc', '/quittances/1',
      '/quittances/1/lien-whatsapp', '/biens/3', '/juridictions/CD',
    ]) {
      expect(enCache(chemin)).withContext(chemin).toBeFalse();
    }
  });

  it('estDonneeHorsLigne : chemins exacts de l’API seulement', () => {
    const api = environment.apiUrl;
    expect(estDonneeHorsLigne(`${api}/users/biens`)).toBeTrue();
    expect(estDonneeHorsLigne(`${api}/historique?bienId=1`)).toBeTrue();
    expect(estDonneeHorsLigne(`${api}/users/biens/3/autre`)).toBeFalse();
    expect(estDonneeHorsLigne(`${api}/notifications/5/lire`)).toBeFalse();
    expect(estDonneeHorsLigne('https://autre.example/users/biens')).toBeFalse();
  });

  describe('intercepteur', () => {
    let http: HttpClient;
    let controle: HttpTestingController;
    let auth: AuthService;
    const api = environment.apiUrl;

    beforeEach(() => {
      localStorage.clear();
      TestBed.configureTestingModule({
        providers: [
          provideRouter([]),
          provideHttpClient(withInterceptors([compteCacheInterceptor])),
          provideHttpClientTesting(),
        ],
      });
      http = TestBed.inject(HttpClient);
      controle = TestBed.inject(HttpTestingController);
      auth = TestBed.inject(AuthService);
    });

    afterEach(() => controle.verify());

    it('ajoute l’identifiant du compte connecté aux lectures mises en cache', () => {
      auth.currentUser.set({ id: 7, email: 'a@b.fr', firstName: 'A', lastName: 'B', role: 'ROLE_LOCATAIRE' });

      http.get(`${api}/historique?bienId=3&emailInterlocuteur=a%40b.fr`).subscribe();
      http.get(`${api}/quittances/mes-quittances`).subscribe();

      expect(controle.expectOne(r => r.url.includes('/historique')).request.urlWithParams)
        .toBe(`${api}/historique?bienId=3&emailInterlocuteur=a%40b.fr&c=7`);
      expect(controle.expectOne(r => r.url.includes('/mes-quittances')).request.params.get('c')).toBe('7');
    });

    it('rien sans compte connu, ni sur les autres routes ou les écritures', () => {
      http.get(`${api}/users/biens`).subscribe();
      auth.currentUser.set({ id: 7, email: 'a@b.fr', firstName: 'A', lastName: 'B', role: 'ROLE_LOCATAIRE' });
      http.get(`${api}/auth/me`).subscribe();
      http.post(`${api}/quittances/mes-quittances`, {}).subscribe();

      expect(controle.expectOne(`${api}/users/biens`).request.params.has('c')).toBeFalse();
      expect(controle.expectOne(`${api}/auth/me`).request.params.has('c')).toBeFalse();
      expect(controle.expectOne(r => r.method === 'POST').request.params.has('c')).toBeFalse();
    });
  });
});
