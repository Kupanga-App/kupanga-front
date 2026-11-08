import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { Observable, firstValueFrom, of } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { User } from '../models/user.model';
import { LogementContextService } from '../../services/logement-context.service';
import { accueilGuard, accueilPour } from './auth.guard';

describe('accueilPour (écran d’arrivée, déduit des espaces du compte)', () => {
  const compte = { id: 1, role: 'ROLE_LOCATAIRE' } as User;

  it('visiteur : les annonces', () => {
    expect(accueilPour(null)).toBe('/explorer');
    expect(accueilPour(null, { aDesBiens: false, aUnLogement: true })).toBe('/explorer');
  });

  it('compte Google sans profil : choix du profil', () => {
    const sansProfil = { id: 2 } as User;
    expect(accueilPour(sansProfil)).toBe('/auth/google-role');
    expect(accueilPour(sansProfil, { aDesBiens: false, aUnLogement: true })).toBe('/auth/google-role');
  });

  it('locataire sans bien : Mon logement', () => {
    expect(accueilPour(compte, { aDesBiens: false, aUnLogement: true })).toBe('/mon-logement');
  });

  it('propriétaire, même s’il loue aussi : l’accueil', () => {
    expect(accueilPour(compte, { aDesBiens: true, aUnLogement: false })).toBe('/accueil');
    expect(accueilPour(compte, { aDesBiens: true, aUnLogement: true })).toBe('/accueil');
  });

  it('candidat (ni bien ni logement) ou espaces inconnus : l’accueil', () => {
    expect(accueilPour(compte, { aDesBiens: false, aUnLogement: false })).toBe('/accueil');
    expect(accueilPour(compte)).toBe('/accueil');
  });
});

describe('accueilGuard', () => {
  const utilisateur = signal<User | null>(null);
  const aDesBiens = signal(false);
  const logementBienId = signal<number | null>(null);
  const charger = jasmine.createSpy('charger');

  beforeEach(() => {
    localStorage.setItem('accessToken', 'jeton');
    utilisateur.set({ id: 1, role: 'ROLE_LOCATAIRE' } as User);
    aDesBiens.set(false);
    logementBienId.set(null);
    charger.calls.reset();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { currentUser: utilisateur, getAccessToken: () => localStorage.getItem('accessToken') } },
        {
          provide: LogementContextService,
          useValue: { aDesBiens, hasLogement: () => logementBienId() !== null, charger },
        },
      ],
    });
  });

  afterEach(() => localStorage.removeItem('accessToken'));

  const arrivee = async () => {
    const resultat = TestBed.runInInjectionContext(() =>
      accueilGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)) as Observable<UrlTree>;
    return TestBed.inject(Router).serializeUrl(await firstValueFrom(resultat));
  };

  it('décide après la relecture des espaces (un seul appel, celui de charger)', async () => {
    // Avant la réponse de l'API, le contexte ne sait rien ; charger() met à jour le logement loué
    charger.and.callFake(() => {
      logementBienId.set(7);
      return of(7);
    });
    expect(await arrivee()).toBe('/mon-logement');
    expect(charger).toHaveBeenCalledOnceWith(1);
  });

  it('propriétaire qui loue aussi : l’accueil', async () => {
    charger.and.callFake(() => {
      aDesBiens.set(true);
      logementBienId.set(7);
      return of(7);
    });
    expect(await arrivee()).toBe('/accueil');
  });

  it('visiteur : les annonces, sans appel', async () => {
    localStorage.removeItem('accessToken');
    expect(await arrivee()).toBe('/explorer');
    expect(charger).not.toHaveBeenCalled();
  });
});
