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
    // Reactive: fires when user logs in during an active session
    // (e.g. user on public page, then logs in without full reload)
    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        this.store.loadUnreadCount();
      }
    });
  }

  ngOnInit(): void {
    // Safety net: the effect's first run is async (scheduled for next CD cycle).
    // If currentUser was already set before this component was created
    // (login flow, page refresh), call loadUnreadCount() immediately here.
    if (this.authService.currentUser()) {
      this.store.loadUnreadCount();
    }

    this.subs.add(
      this.ws.notifications$.subscribe((notif) => {
        const isOnMessagingPage = this.router.url.includes('/messagerie');
        const isViewingThisConv =
          isOnMessagingPage && this.store.activeConvEmail() === notif.expediteurEmail;

        if (!isViewingThisConv) {
          this.store.incrementUnread(1);
        }

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
