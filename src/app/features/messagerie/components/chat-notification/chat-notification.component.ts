import { Component, effect, inject, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { ChatWebSocketService } from '../../services/chat-websocket.service';
import { ChatStoreService } from '../../services/chat-store.service';

@Component({
  selector: 'kp-chat-notification',
  standalone: true,
  imports: [],
  template: '',
})
export class ChatNotificationComponent implements OnInit, OnDestroy {
  private ws = inject(ChatWebSocketService);
  private store = inject(ChatStoreService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private authService = inject(AuthService);

  private subs = new Subscription();

  constructor() {
    // Charge le compteur dès que l'utilisateur est connecté (y compris après login)
    effect(() => {
      if (this.authService.currentUser()) {
        this.store.loadUnreadCount();
      }
    });
  }

  ngOnInit(): void {

    this.subs.add(
      this.ws.notifications$.subscribe((notif) => {
        const isOnMessagingPage =
          this.router.url.includes('/messagerie');

        this.store.incrementUnread(1);

        if (!isOnMessagingPage) {
          const role = this.authService.currentUser()?.role;
          const basePath =
            role === 'ROLE_PROPRIETAIRE' ? '/pro/messagerie' : '/loc/messagerie';

          const ref = this.snackBar.open(
            `${notif.expediteurNom} : ${notif.contenuPreview}`,
            'Voir',
            {
              duration: 5000,
              panelClass: ['kp-toast'],
              horizontalPosition: 'right',
              verticalPosition: 'bottom',
            }
          );

          ref.onAction().subscribe(() => {
            void this.router.navigate([basePath], {
              queryParams: {
                interlocuteur: notif.expediteurEmail,
              },
            });
          });
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }
}
