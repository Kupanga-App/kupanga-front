import { Injectable, inject, OnDestroy, effect } from '@angular/core';
import { Subject, Observable, firstValueFrom } from 'rxjs';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { AuthService } from '../../../core/auth/services/auth.service';
import { environment } from '../../../../environments/environment';
import {
  MessageDTO,
  NotificationDTO,
  MessagePayload,
  ErreurEnvoiDTO,
  StatutEnvoiEvent,
} from '../models/chat.models';
import { AppNotification } from '../../notifications/models/app-notification.model';

/** Délai d'attente de l'accusé du serveur (écho du message) avant de passer l'envoi en « échec ». */
const DELAI_ACCUSE_MS = 15000;

/** En-tête STOMP lu par l'API pour renvoyer l'accusé ou l'erreur de cet envoi (W13). */
const EN_TETE_ID_CLIENT = 'id-client';

interface EnvoiEnCours {
  payload: MessagePayload;
  /** Publié sur le socket et en attente de l'accusé (sinon : en file, ou en échec). */
  publie: boolean;
  echec: boolean;
  timer: ReturnType<typeof setTimeout> | null;
}

@Injectable({ providedIn: 'root' })
export class ChatWebSocketService implements OnDestroy {
  private authService = inject(AuthService);
  private stompClient: Client | null = null;
  private seenIds = new Set<number>();
  private dejaConnecte = false;

  /** File d'envoi locale (W13) : idClient → envoi pas encore confirmé par le serveur. */
  private envois = new Map<string, EnvoiEnCours>();

  private messagesSubject = new Subject<MessageDTO>();
  private notificationsSubject = new Subject<NotificationDTO>();
  private appNotificationsSubject = new Subject<AppNotification>();
  private connectedSubject = new Subject<boolean>();
  private reconnectedSubject = new Subject<void>();
  private statutsEnvoiSubject = new Subject<StatutEnvoiEvent>();

  readonly messages$: Observable<MessageDTO> = this.messagesSubject.asObservable();
  readonly notifications$: Observable<NotificationDTO> = this.notificationsSubject.asObservable();
  readonly appNotifications$: Observable<AppNotification> = this.appNotificationsSubject.asObservable();
  readonly connected$: Observable<boolean> = this.connectedSubject.asObservable();
  /** Reconnexion après une coupure (W11) : les écrans rechargent ce qu'ils ont pu manquer. */
  readonly reconnected$: Observable<void> = this.reconnectedSubject.asObservable();
  /** Changement de statut d'un envoi (W13) : en attente, échec. La confirmation arrive par messages$. */
  readonly statutsEnvoi$: Observable<StatutEnvoiEvent> = this.statutsEnvoiSubject.asObservable();

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
  }

  connect(): void {
    if (this.stompClient?.active) return;

    const token = this.authService.getAccessToken();
    if (!token) return;

    this.stompClient = new Client({
      webSocketFactory: () => new SockJS(`${environment.apiUrl}/ws`) as WebSocket,
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      // W4 : le serveur propose {5000, 10000} ; intervalle négocié = 10 s dans les deux sens
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
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
        if (this.dejaConnecte) {
          this.reconnectedSubject.next();
        }
        this.dejaConnecte = true;
        this.publierFile();
      },
      // Coupure réseau (onWebSocketClose) ou fermeture propre : stompjs se reconnecte seul
      onWebSocketClose: () => this.marquerDeconnecte(),
      onDisconnect: () => this.marquerDeconnecte(),
      onStompError: () => this.marquerDeconnecte(),
    });

    this.stompClient.activate();
  }

  private marquerDeconnecte(): void {
    if (!this.isConnected) return;
    this.isConnected = false;
    this.connectedSubject.next(false);
  }

  private subscribeToQueues(): void {
    if (!this.stompClient) return;

    // W3/W12 : seules les files privées /user/queue/** sont acceptées par l'API
    this.stompClient.subscribe('/user/queue/messages', (msg: IMessage) => {
      const dto = JSON.parse(msg.body) as MessageDTO;
      if (dto.idClient) {
        this.oublier(dto.idClient); // accusé reçu
      }
      if (!this.seenIds.has(dto.id)) {
        if (this.seenIds.size > 1000) this.seenIds.clear();
        this.seenIds.add(dto.id);
        this.messagesSubject.next(dto);
      }
    });
    this.stompClient.subscribe('/user/queue/notifications', (msg: IMessage) => {
      this.notificationsSubject.next(JSON.parse(msg.body) as NotificationDTO);
    });
    this.stompClient.subscribe('/user/queue/app-notifications', (msg: IMessage) => {
      this.appNotificationsSubject.next(JSON.parse(msg.body) as AppNotification);
    });
    this.stompClient.subscribe('/user/queue/errors', (msg: IMessage) => {
      const erreur = JSON.parse(msg.body) as ErreurEnvoiDTO;
      if (erreur.idClient) {
        this.echouer(erreur.idClient, erreur.message);
      }
    });
  }

  /**
   * Met le message dans la file d'envoi et le publie si le socket est connecté (sinon à la reconnexion).
   * Retourne l'idClient qui suit l'envoi : confirmé par l'écho du serveur sur messages$, ou passé en échec.
   */
  envoyer(payload: MessagePayload): string {
    const idClient = nouvelIdClient();
    this.envois.set(idClient, { payload, publie: false, echec: false, timer: null });
    this.publier(idClient);
    return idClient;
  }

  /** Renvoie un message en échec (action de l'utilisateur). */
  renvoyer(idClient: string): void {
    const envoi = this.envois.get(idClient);
    if (!envoi) return;
    envoi.echec = false;
    this.publier(idClient);
  }

  /** Abandonne le suivi d'un envoi (accusé reçu, ou message retrouvé dans l'historique). */
  oublier(idClient: string): void {
    const envoi = this.envois.get(idClient);
    if (envoi?.timer) clearTimeout(envoi.timer);
    this.envois.delete(idClient);
  }

  private publier(idClient: string): void {
    const envoi = this.envois.get(idClient);
    if (!envoi) return;
    this.statutsEnvoiSubject.next({ idClient, statut: 'en_attente' });

    if (!this.stompClient?.connected) {
      return; // reste en file : publié par publierFile() à la reconnexion
    }
    try {
      this.stompClient.publish({
        destination: '/app/chat.send',
        body: JSON.stringify(envoi.payload),
        headers: { [EN_TETE_ID_CLIENT]: idClient },
      });
    } catch {
      return; // connexion perdue entre le test et l'envoi : reste en file
    }
    envoi.publie = true;
    if (envoi.timer) clearTimeout(envoi.timer);
    envoi.timer = setTimeout(
      () => this.echouer(idClient, "Le message n'a pas été confirmé par le serveur."),
      DELAI_ACCUSE_MS
    );
  }

  /** Publie les messages restés en file pendant la coupure (jamais envoyés : pas de doublon possible). */
  private publierFile(): void {
    for (const [idClient, envoi] of this.envois) {
      if (!envoi.publie && !envoi.echec) {
        this.publier(idClient);
      }
    }
  }

  private echouer(idClient: string, erreur: string): void {
    const envoi = this.envois.get(idClient);
    if (!envoi) return;
    if (envoi.timer) clearTimeout(envoi.timer);
    envoi.timer = null;
    // Publié sans accusé : le serveur l'a peut-être enregistré → pas de renvoi automatique (doublon)
    envoi.publie = false;
    envoi.echec = true;
    this.statutsEnvoiSubject.next({ idClient, statut: 'echec', erreur });
  }

  disconnect(): void {
    this.stompClient?.deactivate();
    this.stompClient = null;
    this.isConnected = false;
    this.dejaConnecte = false;
    this.seenIds.clear();
    for (const idClient of [...this.envois.keys()]) {
      this.oublier(idClient);
    }
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}

function nouvelIdClient(): string {
  // randomUUID n'existe qu'en contexte sécurisé (HTTPS ou localhost)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
