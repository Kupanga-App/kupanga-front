import { Component, OnInit, inject } from '@angular/core';
import { AppNotificationService } from './services/app-notification.service';
import { AppNotification, NotificationType } from './models/app-notification.model';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { VideComponent } from '../../shared/ui/vide.component';
import { TirerPourActualiserDirective } from '../../shared/ui/tirer-pour-actualiser.directive';
import { IconComponent } from '../../shared/components/icon/icon.component';

const ICONES: Record<NotificationType, string> = {
  INVITATION_SIGNATURE_CONTRAT: 'pen-line',
  INVITATION_SIGNATURE_EDL: 'pen-line',
  CONTRAT_SIGNE: 'file-check',
  EDL_SIGNE: 'clipboard-check',
  QUITTANCE_DISPONIBLE: 'receipt',
  BIEN_ASSIGNE: 'house',
  BIEN_ASSIGNATION_CONFIRMEE: 'user-plus',
};

/** Notifications non lues (l'API ne renvoie que celles-ci) ; toucher une notification ouvre l'écran concerné. */
@Component({
  selector: 'kp-notifications',
  standalone: true,
  imports: [PageHeaderComponent, VideComponent, TirerPourActualiserDirective, IconComponent],
  template: `
    <div class="kp-page kp-page--etroite" kpTirerPourActualiser (actualiser)="service.loadUnread()">
      <kp-page-header titre="Notifications">
        @if (service.unreadCount()) {
          <button actions type="button" class="kp-btn kp-btn--ghost kp-btn--sm" (click)="service.markAllRead()">Tout marquer comme lu</button>
        }
      </kp-page-header>

      @if (!service.notifications().length) {
        <kp-vide icone="bell" titre="Aucune nouvelle notification"
                 texte="Invitations à signer, documents signés et quittances apparaissent ici." />
      } @else {
        <ul class="kp-list">
          @for (n of service.notifications(); track n.id) {
            <li>
              <button type="button" class="kp-list__item notif" [class.notif--lue]="n.lue" (click)="service.handleClick(n)">
                <span class="kp-list__icon"><kp-icon [name]="icone(n)" /></span>
                <span class="kp-list__body">
                  <span class="kp-list__title">{{ n.titre }}</span>
                  <span class="kp-list__sub">{{ n.message }}</span>
                  <span class="kp-xs kp-muted">{{ service.formatTime(n.createdAt) }}</span>
                </span>
              </button>
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: [`
    ul { list-style: none; }
    li { border-bottom: 1px solid var(--kp-border); }
    li:last-child { border-bottom: 0; }
    .notif { border-bottom: 0; align-items: flex-start; }
    .notif--lue { opacity: 0.6; }
  `],
})
export class NotificationsComponent implements OnInit {
  protected readonly service = inject(AppNotificationService);

  ngOnInit(): void {
    this.service.loadUnread();
  }

  icone(n: AppNotification): string {
    return ICONES[n.type] ?? 'bell';
  }
}
