import { Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthService } from '../../core/auth/services/auth.service';
import { AppNotificationService } from '../../features/notifications/services/app-notification.service';
import { IconComponent } from '../components/icon/icon.component';

/**
 * Cloche des notifications, avec le nombre de non lues. Placée dans les barres de navigation (`app-shell`) :
 * carte du compte de la barre latérale (`carte`, 32 px), barre du haut (`barre`, 44 px), en-tête du téléphone
 * (`entete`, 44 px). Absente pour un visiteur et sur l'écran des notifications.
 */
@Component({
  selector: 'kp-cloche',
  standalone: true,
  imports: [RouterLink, IconComponent],
  template: `
    @if (visible()) {
      <a routerLink="/notifications" class="cloche" [class]="'cloche--' + variante()"
         [attr.aria-label]="nonLues() ? 'Notifications, ' + nonLues() + ' non lues' : 'Notifications'">
        <kp-icon name="bell" [size]="variante() === 'carte' ? 16 : 20" [strokeWidth]="1.75" />
        @if (nonLues(); as n) {
          <span class="kp-pastille" aria-hidden="true">{{ n > 99 ? '99+' : n }}</span>
        }
      </a>
    }
  `,
  styles: [`
    :host { display: contents; }
    .cloche {
      position: relative; display: inline-grid; place-items: center; flex-shrink: 0;
      width: 44px; height: 44px; border-radius: 50%;
      color: var(--kp-text-muted); text-decoration: none;
      transition: background-color var(--kp-duree) var(--kp-ease), color var(--kp-duree) var(--kp-ease);
    }
    .cloche:hover { color: var(--kp-text); }
    .cloche--barre { background: var(--kp-bg); }
    .cloche--barre:hover { background: var(--kp-surface-sunken); }
    .cloche--entete, .cloche--carte { background: var(--kp-surface); box-shadow: var(--kp-elev-0); }
    .cloche--carte { width: 32px; height: 32px; }
    .cloche--carte::after { content: ''; position: absolute; inset: -6px; }
    .kp-pastille { top: -2px; right: -4px; }
    .cloche--carte .kp-pastille { top: -6px; right: -8px; }
  `],
})
export class ClocheComponent {
  readonly variante = input<'barre' | 'carte' | 'entete'>('barre');

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notifications = inject(AppNotificationService);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(e => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  protected readonly nonLues = this.notifications.unreadCount;
  protected readonly visible = computed(
    () => !!this.auth.currentUser() && !this.url().startsWith('/notifications'),
  );
}
