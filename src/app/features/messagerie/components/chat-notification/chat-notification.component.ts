import { Component, effect, inject, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { ToastService } from '../../../../core/ui/toast.service';
import { ChatWebSocketService } from '../../services/chat-websocket.service';
import { ChatStoreService } from '../../services/chat-store.service';

/** Messages reçus en temps réel : compteur de non-lus et message éphémère hors de l'écran Messages. */
@Component({
  selector: 'kp-chat-notification',
  standalone: true,
  template: '',
})
export class ChatNotificationComponent implements OnInit, OnDestroy {
  private ws = inject(ChatWebSocketService);
  private store = inject(ChatStoreService);
  private toasts = inject(ToastService);
  private router = inject(Router);
  private authService = inject(AuthService);
  private subs = new Subscription();

  constructor() {
    // Connexion pendant la session (page publique puis connexion sans rechargement)
    effect(() => {
      if (this.authService.currentUser()) {
        this.store.loadUnreadCount();
      }
    });
  }

  ngOnInit(): void {
    // W11 : messages reçus pendant la coupure
    this.subs.add(this.ws.reconnected$.subscribe(() => this.store.loadUnreadCount()));

    this.subs.add(
      this.ws.notifications$.subscribe(notif => {
        const surMessages = this.router.url.startsWith('/messages');
        if (!(surMessages && this.store.activeConvEmail() === notif.expediteurEmail)) {
          this.store.incrementUnread(1);
        }
        if (!surMessages) {
          this.toasts.afficher(`${notif.expediteurNom} : ${notif.contenuPreview}`, {
            action: {
              libelle: 'Voir',
              executer: () => void this.router.navigate(['/messages'], { queryParams: { interlocuteur: notif.expediteurEmail } }),
            },
          });
        }
      }),
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }
}
