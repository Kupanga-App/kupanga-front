import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../auth/services/auth.service';
import { User } from '../auth/models/user.model';
import { LogementContextService } from '../services/logement-context.service';
import { NavigationService, ONGLETS_MOBILE_MAX } from './navigation.service';

describe('NavigationService (lot 3 : espaces déduits des données, plus du rôle)', () => {
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
    expect(liens(nav.ongletsMobile())).toEqual(['/explorer', '/auth/login']);
  });

  it('compte sans bien ni logement : accueil, annonces, messages, compte (quel que soit le profil choisi)', () => {
    for (const role of ['ROLE_PROPRIETAIRE', 'ROLE_LOCATAIRE'] as const) {
      connecter(role);
      expect(liens(nav.ongletsMobile())).toEqual(['/accueil', '/explorer', '/messages', '/compte']);
      expect(nav.aDesDocuments()).toBeFalse();
    }
  });

  it('propriétaire qui loue aussi un logement : Mes biens, Mon logement et Quittances dans la barre latérale', () => {
    connecter('ROLE_LOCATAIRE');
    aDesBiens.set(true);
    logementBienId.set(7);
    expect(liens(nav.onglets())).toEqual(
      ['/accueil', '/biens', '/mon-logement', '/quittances', '/explorer', '/messages', '/documents', '/compte']);
    expect(liens(nav.ongletsMobile())).toEqual(['/accueil', '/explorer', '/messages', '/documents', '/compte']);
  });

  it('ne dépasse jamais 5 onglets en bas sur téléphone, Explorer toujours présent', () => {
    for (const biens of [false, true]) {
      for (const logement of [null, 3]) {
        connecter();
        aDesBiens.set(biens);
        logementBienId.set(logement);
        expect(nav.ongletsMobile().length).toBeLessThanOrEqual(ONGLETS_MOBILE_MAX);
        expect(liens(nav.ongletsMobile())).toContain('/explorer');
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

  it('relit les espaces du compte à la connexion', () => {
    connecter();
    TestBed.flushEffects();
    expect(charger).toHaveBeenCalledWith(1);
  });
});
