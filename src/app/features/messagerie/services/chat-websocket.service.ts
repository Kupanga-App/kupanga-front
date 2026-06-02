import { Injectable, inject, OnDestroy, effect } from '@angular/core';
import { Subject, Observable, fromEvent, firstValueFrom } from 'rxjs';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { AuthService } from '../../../core/auth/services/auth.service';
import { environment } from '../../../../environments/environment';
import { MessageDTO, NotificationDTO, MessagePayload } from '../models/chat.models';
import { AppNotification } from '../../notifications/models/app-notification.model';

@Injectable({ providedIn: 'root' })
export class ChatWebSocketService implements OnDestroy {
  private authService = inject(AuthService);
  private stompClient: Client | null = null;
  private seenIds = new Set<number>();

  private messagesSubject = new Subject<MessageDTO>();
  private notificationsSubject = new Subject<NotificationDTO>();
  private appNotificationsSubject = new Subject<AppNotification>();
  private connectedSubject = new Subject<boolean>();

  readonly messages$: Observable<MessageDTO> = this.messagesSubject.asObservable();
  readonly notifications$: Observable<NotificationDTO> = this.notificationsSubject.asObservable();
  readonly appNotifications$: Observable<AppNotification> = this.appNotificationsSubject.asObservable();
  readonly connected$: Observable<boolean> = this.connectedSubject.asObservable();

  isConnected = false;

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        this.connect();
      } else {
        this.disconnect();
      }
    });

    // Libère la connexion WS lors d'une navigation pour autoriser le BFCache.
    fromEvent(window, 'pagehide').subscribe(() => this.disconnect());
    fromEvent<PageTransitionEvent>(window, 'pageshow').subscribe((e) => {
      if (e.persisted && this.authService.currentUser()) {
        this.connect();
      }
    });
  }

  connect(): void {
    if (this.stompClient?.active) return;

    const token = this.authService.getAccessToken();
    if (!token) return;

    this.stompClient = new Client({
      webSocketFactory: () => new SockJS(`${environment.apiUrl}/ws`) as WebSocket,
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      beforeConnect: async () => {
        try {
          await firstValueFrom(this.authService.refreshToken());
        } catch {
          // Refresh failed — STOMP will attempt with the current token
        }
        if (this.stompClient) {
          this.stompClient.connectHeaders = {
            Authorization: `Bearer ${this.authService.getAccessToken() ?? token}`,
          };
        }
      },
      onConnect: () => {
        this.isConnected = true;
        this.connectedSubject.next(true);
        this.subscribeToQueues();
      },
      onDisconnect: () => {
        this.isConnected = false;
        this.connectedSubject.next(false);
      },
      onStompError: () => {
        this.isConnected = false;
        this.connectedSubject.next(false);
      },
    });

    this.stompClient.activate();
  }

  private subscribeToQueues(): void {
    const email = this.authService.currentUser()?.email;
    if (!email || !this.stompClient) return;

    const handleMessage = (msg: IMessage) => {
      const dto: MessageDTO = JSON.parse(msg.body) as MessageDTO;
      if (!this.seenIds.has(dto.id)) {
        if (this.seenIds.size > 1000) this.seenIds.clear();
        this.seenIds.add(dto.id);
        this.messagesSubject.next(dto);
      }
    };

    const handleNotif = (msg: IMessage) => {
      const dto: NotificationDTO = JSON.parse(msg.body) as NotificationDTO;
      this.notificationsSubject.next(dto);
    };

    this.stompClient.subscribe(`/user/${email}/queue/messages`, handleMessage);
    this.stompClient.subscribe(`/user/queue/messages`, handleMessage);
    this.stompClient.subscribe(`/user/${email}/queue/notifications`, handleNotif);
    this.stompClient.subscribe(`/user/queue/notifications`, handleNotif);
    this.stompClient.subscribe(`/user/${email}/queue/app-notifications`, (msg: IMessage) => {
      this.appNotificationsSubject.next(JSON.parse(msg.body) as AppNotification);
    });
  }

  sendMessage(payload: MessagePayload): void {
    if (!this.stompClient?.active) return;
    this.stompClient.publish({
      destination: '/app/chat.send',
      body: JSON.stringify(payload),
    });
  }

  disconnect(): void {
    this.stompClient?.deactivate();
    this.stompClient = null;
    this.isConnected = false;
    this.seenIds.clear();
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
