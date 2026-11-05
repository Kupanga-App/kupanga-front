import { Injectable, inject, signal, computed, effect, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth/services/auth.service';
import { ChatWebSocketService } from '../../messagerie/services/chat-websocket.service';
import { LogementContextService } from '../../../core/services/logement-context.service';
import { AppNotification, NotificationType } from '../models/app-notification.model';

@Injectable({ providedIn: 'root' })
export class AppNotificationService implements OnDestroy {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private ws = inject(ChatWebSocketService);
  private router = inject(Router);
  private logement = inject(LogementContextService);
  private api = environment.apiUrl;

  private subs = new Subscription();

  readonly notifications = signal<AppNotification[]>([]);
  readonly unreadCount = computed(() => this.notifications().filter(n => !n.lue).length);

  constructor() {
    this.subs.add(
      this.ws.appNotifications$.subscribe(notif => {
        this.notifications.update(list => [notif, ...list]);
        // Bail signé : le logement apparaît (onglets « Mon logement », accueil)
        if (notif.type === 'BIEN_ASSIGNE') {
          this.logement.invalider();
          this.logement.charger(this.authService.currentUser()?.id).subscribe();
        }
      })
    );
    // W11 : notifications poussées pendant la coupure
    this.subs.add(this.ws.reconnected$.subscribe(() => this.loadUnread()));

    effect(() => {
      if (this.authService.currentUser()) {
        this.loadUnread();
      } else {
        this.notifications.set([]);
      }
    });
  }

  loadUnread(): void {
    this.http.get<AppNotification[]>(`${this.api}/notifications`).subscribe({
      next: (list) => this.notifications.set(list),
      error: () => {},
    });
  }

  markRead(id: number): void {
    this.http.patch(`${this.api}/notifications/${id}/lire`, {}).subscribe({
      next: () =>
        this.notifications.update(list =>
          list.map(n => n.id === id ? { ...n, lue: true } : n)
        ),
      error: () => {},
    });
  }

  markAllRead(): void {
    this.http.patch(`${this.api}/notifications/lire-toutes`, {}).subscribe({
      next: () =>
        this.notifications.update(list => list.map(n => ({ ...n, lue: true }))),
      error: () => {},
    });
  }

  /** Ouvre l'écran concerné par la notification (et la marque comme lue). */
  handleClick(notif: AppNotification): void {
    this.markRead(notif.id);
    switch (notif.type) {
      case 'INVITATION_SIGNATURE_CONTRAT':
        void this.router.navigate(notif.lien ? ['/contrats/signer', notif.lien] : ['/documents']);
        break;
      case 'INVITATION_SIGNATURE_EDL':
        void this.router.navigate(notif.lien ? ['/edl/signer', notif.lien] : ['/documents']);
        break;
      case 'QUITTANCE_DISPONIBLE':
        // Envoyée au locataire de la quittance
        void this.router.navigate(['/quittances']);
        break;
      case 'BIEN_ASSIGNE':
        this.logement.invalider();
        void this.router.navigate(['/']);
        break;
      case 'BIEN_ASSIGNATION_CONFIRMEE':
        void this.router.navigate(['/biens']);
        break;
      case 'DEMANDE_LOCATION':
      case 'DEMANDE_LOCATION_ANNULEE':
        void this.router.navigate(['/demandes-location']);
        break;
      case 'DEMANDE_LOCATION_ACCEPTEE':
        // referenceId = id du bien, désormais réservé : préparer le bail
        void this.router.navigate(notif.referenceId ? ['/biens', notif.referenceId, 'bail'] : ['/biens']);
        break;
      case 'RESERVATION_DESISTEE':
        // Bien de nouveau libre : le proposer à quelqu'un d'autre
        void this.router.navigate(notif.referenceId ? ['/biens', notif.referenceId, 'locataire'] : ['/biens']);
        break;
      case 'RESERVATION_ANNULEE':
        void this.router.navigate(['/demandes-location']);
        break;
      case 'RESERVATION_EXPIREE':
        // Au propriétaire (referenceId = son bien) : le proposer à quelqu'un d'autre
        void this.router.navigate(notif.referenceId ? ['/biens', notif.referenceId, 'locataire'] : ['/biens']);
        break;
      case 'RESERVATION_EXPIREE_CANDIDAT':
        void this.router.navigate(['/explorer']);
        break;
      case 'CONGE_POUR_PROPRIETAIRE':
        void this.router.navigate(notif.referenceId ? ['/biens', notif.referenceId] : ['/biens']);
        break;
      case 'CONGE_POUR_LOCATAIRE':
        void this.router.navigate(['/mon-logement'], { queryParams: notif.referenceId ? { bien: notif.referenceId } : {} });
        break;
      case 'LOCATION_TERMINEE':
        // Le logement n'est plus loué : onglets et accueil relus
        this.logement.invalider();
        this.logement.charger(this.authService.currentUser()?.id).subscribe();
        void this.router.navigate(['/documents']);
        break;
      case 'DEMANDE_LOCATION_REFUSEE':
        void this.router.navigate(notif.referenceId ? ['/biens', notif.referenceId, 'locataire'] : ['/biens']);
        break;
      default:
        void this.router.navigate(['/documents']);
    }
  }

  iconColor(type: NotificationType): string {
    switch (type) {
      case 'INVITATION_SIGNATURE_CONTRAT':
      case 'INVITATION_SIGNATURE_EDL':
        return 'warning';
      case 'CONTRAT_SIGNE':
      case 'EDL_SIGNE':
        return 'success';
      case 'QUITTANCE_DISPONIBLE':
        return 'info';
      case 'BIEN_ASSIGNE':
      case 'BIEN_ASSIGNATION_CONFIRMEE':
        return 'primary';
      case 'DEMANDE_LOCATION':
        return 'warning';
      case 'DEMANDE_LOCATION_ACCEPTEE':
        return 'success';
      case 'DEMANDE_LOCATION_REFUSEE':
      case 'DEMANDE_LOCATION_ANNULEE':
      case 'RESERVATION_DESISTEE':
      case 'RESERVATION_ANNULEE':
      case 'RESERVATION_EXPIREE':
      case 'RESERVATION_EXPIREE_CANDIDAT':
      case 'CONGE_POUR_PROPRIETAIRE':
      case 'CONGE_POUR_LOCATAIRE':
      case 'LOCATION_TERMINEE':
        return 'info';
    }
  }

  formatTime(createdAt: string): string {
    const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
    if (diff < 1) return "À l'instant";
    if (diff < 60) return `il y a ${diff} min`;
    const h = Math.floor(diff / 60);
    if (h < 24) return `il y a ${h} h`;
    const d = Math.floor(h / 24);
    if (d < 7) return `il y a ${d} j`;
    return new Date(createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }
}
