import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthService } from '../../core/auth/services/auth.service';
import { AppNotificationService } from '../../features/notifications/services/app-notification.service';
import { IconComponent } from '../components/icon/icon.component';

/**
 * Cloche des notifications, avec le nombre de non lues.
 * Affichée dans l'en-tête de chaque écran (`kp-page-header`) quand l'utilisateur est connecté, sur téléphone
 * seulement : sur tablette et ordinateur, la barre latérale a déjà la sienne. Masquée sur l'écran des notifications.
 */
@Component({
  selector: 'kp-cloche',
  standalone: true,
  imports: [RouterLink, IconComponent],
  template: `
    @if (visible()) {
      <a routerLink="/notifications" class="kp-icon-btn cloche"
         [attr.aria-label]="nonLues() ? 'Notifications, ' + nonLues() + ' non lues' : 'Notifications'">
        <kp-icon name="bell" />
        @if (nonLues(); as n) {
          <span class="kp-pastille" aria-hidden="true">{{ n > 99 ? '99+' : n }}</span>
        }
      </a>
    }
  `,
  styles: [`
    :host { display: contents; }
    .cloche { position: relative; }
    @media (min-width: 768px) { .cloche { display: none; } }
  `],
})
export class ClocheComponent {
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
