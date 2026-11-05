import { TestBed } from '@angular/core/testing';
import { Component, computed, signal } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from '../../core/auth/services/auth.service';
import { User } from '../../core/auth/models/user.model';
import { AppNotificationService } from '../../features/notifications/services/app-notification.service';
import { ClocheComponent } from './cloche.component';

@Component({ standalone: true, template: '' })
class EcranVide {}

describe('ClocheComponent', () => {
  const utilisateur = signal<User | null>(null);
  const nonLues = signal(0);

  beforeEach(() => {
    utilisateur.set(null);
    nonLues.set(0);
    TestBed.configureTestingModule({
      imports: [ClocheComponent],
      providers: [
        provideRouter([
          { path: 'explorer', component: EcranVide },
          { path: 'notifications', component: EcranVide },
        ]),
        { provide: AuthService, useValue: { currentUser: utilisateur } },
        { provide: AppNotificationService, useValue: { unreadCount: computed(() => nonLues()) } },
      ],
    });
  });

  const rendre = () => {
    const fixture = TestBed.createComponent(ClocheComponent);
    fixture.detectChanges();
    return fixture;
  };
  const lien = (f: ReturnType<typeof rendre>) =>
    f.nativeElement.querySelector('a[href="/notifications"]') as HTMLAnchorElement | null;

  it('absente pour un visiteur', () => {
    expect(lien(rendre())).toBeNull();
  });

  it('présente avec le nombre de non lues une fois connecté', () => {
    utilisateur.set({ id: 1, role: 'ROLE_PROPRIETAIRE' } as User);
    nonLues.set(3);
    const f = rendre();
    expect(lien(f)).not.toBeNull();
    expect(f.nativeElement.querySelector('.kp-pastille')?.textContent?.trim()).toBe('3');
    expect(lien(f)!.getAttribute('aria-label')).toBe('Notifications, 3 non lues');
  });

  it('masquée sur l’écran des notifications', async () => {
    utilisateur.set({ id: 1, role: 'ROLE_LOCATAIRE' } as User);
    const f = rendre();
    await TestBed.inject(Router).navigateByUrl('/notifications');
    f.detectChanges();
    expect(lien(f)).toBeNull();
    await TestBed.inject(Router).navigateByUrl('/explorer');
    f.detectChanges();
    expect(lien(f)).not.toBeNull();
  });
});
