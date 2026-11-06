import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { Subject, of } from 'rxjs';
import { AuthService } from '../auth/services/auth.service';
import { User } from '../auth/models/user.model';
import { LogementContextService } from '../services/logement-context.service';
import { NavigationService, ONGLETS_MOBILE_MAX } from './navigation.service';

describe('NavigationService (profil de navigation déduit des biens et du logement)', () => {
  const utilisateur = signal<User | null>(null);
  const logementBienId = signal<number | null>(null);
  const aDesBiens = signal(false);
  const charger = jasmine.createSpy('charger').and.returnValue(of(null));
  let nav: NavigationService;

  const liens = (onglets: { lien: string }[]) => onglets.map(o => o.lien);
  const connecter = (role: User['role'] = 'ROLE_LOCATAIRE') => utilisateur.set({ id: 1, role } as User);

  beforeEach(() => {
    utilisateur.set(null);
    logementBienId.set(null);
    aDesBiens.set(false);
    charger.calls.reset();
    charger.and.returnValue(of(null));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { currentUser: utilisateur } },
        {
          provide: LogementContextService,
          useValue: { hasLogement: () => logementBienId() !== null, aDesBiens, charger },
        },
      ],
    });
    nav = TestBed.inject(NavigationService);
  });

  it('visiteur : annonces et connexion', () => {
    expect(nav.profil()).toBe('visiteur');
    expect(liens(nav.onglets())).toEqual(['/explorer', '/auth/login']);
    expect(liens(nav.ongletsMobile())).toEqual(['/explorer', '/auth/login']);
  });

  it('candidat (ni bien ni logement), quel que soit le profil choisi à l’inscription', () => {
    for (const role of ['ROLE_PROPRIETAIRE', 'ROLE_LOCATAIRE'] as const) {
      connecter(role);
      expect(nav.profil()).toBe('candidat');
      expect(liens(nav.onglets())).toEqual(['/accueil', '/explorer', '/messages']);
      expect(liens(nav.ongletsMobile())).toEqual(['/accueil', '/explorer', '/messages', '/compte']);
      expect(nav.aDesDocuments()).toBeFalse();
    }
  });

  it('locataire (un logement, aucun bien) : barre du haut Accueil · Mon logement · Explorer', () => {
    connecter();
    logementBienId.set(7);
    expect(nav.profil()).toBe('locataire');
    expect(liens(nav.onglets())).toEqual(['/accueil', '/mon-logement', '/explorer']);
    expect(liens(nav.ongletsMobile())).toEqual(['/accueil', '/mon-logement', '/messages', '/documents', '/compte']);
  });

  it('propriétaire : barre latérale Accueil · Mes biens · Messages · Documents', () => {
    connecter('ROLE_PROPRIETAIRE');
    aDesBiens.set(true);
    expect(nav.profil()).toBe('proprietaire');
    expect(liens(nav.onglets())).toEqual(['/accueil', '/biens', '/messages', '/documents']);
    expect(liens(nav.ongletsMobile())).toEqual(['/accueil', '/biens', '/messages', '/documents', '/compte']);
  });

  it('propriétaire qui loue aussi : reste propriétaire, avec Mon logement et Quittances dans la barre latérale', () => {
    connecter();
    aDesBiens.set(true);
    logementBienId.set(7);
    expect(nav.profil()).toBe('proprietaire');
    expect(liens(nav.onglets())).toEqual(
      ['/accueil', '/biens', '/mon-logement', '/quittances', '/messages', '/documents']);
    expect(liens(nav.ongletsMobile())).toEqual(['/accueil', '/biens', '/messages', '/documents', '/compte']);
  });

  it('jamais plus de 5 onglets en bas sur téléphone, Messages toujours présent pour un compte', () => {
    for (const biens of [false, true]) {
      for (const logement of [null, 3]) {
        connecter();
        aDesBiens.set(biens);
        logementBienId.set(logement);
        expect(nav.ongletsMobile().length).toBeLessThanOrEqual(ONGLETS_MOBILE_MAX);
        expect(liens(nav.ongletsMobile())).toContain('/messages');
      }
    }
  });

  it('documents : dès qu’un bien est possédé ou un logement loué', () => {
    connecter();
    aDesBiens.set(true);
    expect(nav.aDesDocuments()).toBeTrue();
    aDesBiens.set(false);
    logementBienId.set(4);
    expect(nav.aDesDocuments()).toBeTrue();
  });

  it('déconnexion : retour au profil visiteur', () => {
    connecter();
    aDesBiens.set(true);
    expect(nav.profil()).toBe('proprietaire');
    utilisateur.set(null);
    aDesBiens.set(false);
    expect(nav.profil()).toBe('visiteur');
  });

  it('relit les espaces du compte à la connexion', () => {
    connecter();
    TestBed.flushEffects();
    expect(charger).toHaveBeenCalledWith(1);
  });

  it('profil inconnu juste après la connexion, tant que l’API n’a pas répondu (pas de bascule de barre)', () => {
    const reponse = new Subject<number | null>();
    charger.and.returnValue(reponse);
    connecter();
    TestBed.flushEffects();
    expect(nav.profilConnu()).toBeFalse();
    reponse.next(null);
    expect(nav.profilConnu()).toBeTrue();
  });

  it('profil connu d’emblée avec les valeurs gardées de la session (hors ligne)', () => {
    charger.and.returnValue(new Subject<number | null>());
    aDesBiens.set(true);
    connecter();
    TestBed.flushEffects();
    expect(nav.profilConnu()).toBeTrue();
  });
});
