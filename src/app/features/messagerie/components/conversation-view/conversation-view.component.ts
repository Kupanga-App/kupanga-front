import {
  AfterViewChecked,
  Component,
  computed,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  signal,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { ChatService } from '../../services/chat.service';
import { ChatStoreService } from '../../services/chat-store.service';
import { ChatWebSocketService } from '../../services/chat-websocket.service';
import { MessageDTO } from '../../models/chat.models';
import { MessageInputComponent } from '../message-input/message-input.component';
import { AvatarComponent } from '../../../../shared/ui/avatar.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { dateLongue, joursAvant } from '../../../../shared/format';

export interface MessageGroup {
  label: string;
  messages: MessageDTO[];
}

@Component({
  selector: 'kp-conversation-view',
  standalone: true,
  imports: [RouterLink, MessageInputComponent, AvatarComponent, IconComponent],
  templateUrl: './conversation-view.component.html',
  styleUrl: './conversation-view.component.scss',
})
export class ConversationViewComponent implements OnInit, OnChanges, OnDestroy, AfterViewChecked {
  @Input({ required: true }) bienId!: number;
  @Input({ required: true }) emailInterlocuteur!: string;
  @Input() nom = '';
  @Input() titre = '';
  @Input() photoUrl = '';
  @Input() lienBien: unknown[] | null = null;
  @Output() backRequested = new EventEmitter<void>();
  @Output() sent = new EventEmitter<MessageDTO>();
  /**
   * Premier contact depuis une annonce (emailInterlocuteur vide) : l'adresse du propriétaire est connue
   * à l'écho du premier message envoyé (W13) ; la vue bascule alors sur la conversation créée.
   */
  @Output() interlocuteurConnu = new EventEmitter<string>();

  @ViewChild('messagesEl') messagesEl!: ElementRef<HTMLElement>;

  private authService = inject(AuthService);
  private chatService = inject(ChatService);
  protected store = inject(ChatStoreService);
  private ws = inject(ChatWebSocketService);

  messages = signal<MessageDTO[]>([]);
  loading = signal(false);
  loadError = signal(false);
  wsConnected = signal(false);
  interlocuteurNom = signal<string>('');

  private needsScroll = false;
  private subs = new Subscription();
  private markAsReadTimer: ReturnType<typeof setTimeout> | null = null;

  get myEmail(): string {
    return this.authService.currentUser()?.email ?? '';
  }

  get displayNom(): string {
    return this.interlocuteurNom() || this.nom || (this.emailInterlocuteur ? this.emailInterlocuteur.split('@')[0] : 'Propriétaire');
  }

  dayGroups = computed<MessageGroup[]>(() => {
    const result: MessageGroup[] = [];
    for (const msg of this.messages()) {
      const label = this.libelleJour(msg.createdAt);
      const dernier = result[result.length - 1];
      if (dernier?.label === label) {
        dernier.messages.push(msg);
      } else {
        result.push({ label, messages: [msg] });
      }
    }
    return result;
  });

  private libelleJour(iso: string): string {
    const j = joursAvant(iso);
    if (j === 0) return 'Aujourd’hui';
    if (j === -1) return 'Hier';
    return dateLongue(iso, true);
  }

  heure(iso: string): string {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  ngOnInit(): void {
    this.store.setActiveConv(this.emailInterlocuteur);
    this.loadHistorique();

    this.subs.add(this.ws.connected$.subscribe(connected => this.wsConnected.set(connected)));
    this.wsConnected.set(this.ws.isConnected);

    this.subs.add(
      this.ws.messages$.subscribe(msg => {
        if (this.belongsToCurrentConv(msg)) {
          this.addMessageIfNew(msg);
          if (!this.emailInterlocuteur && msg.destinataireEmail) {
            this.interlocuteurConnu.emit(msg.destinataireEmail);
          } else if (msg.expediteurEmail === this.emailInterlocuteur) {
            this.scheduleMarquerLus();
          }
        }
      }),
    );

    // W13 : statut des messages envoyés (en attente, échec)
    this.subs.add(
      this.ws.statutsEnvoi$.subscribe(({ idClient, statut, erreur }) => {
        this.messages.update(list => list.map(m => (m.idClient === idClient && m.statut ? { ...m, statut, erreur } : m)));
      }),
    );

    // W11 : rattrapage des messages reçus pendant la coupure
    this.subs.add(this.ws.reconnected$.subscribe(() => this.rattraperHistorique()));
  }

  ngOnChanges(changes: SimpleChanges): void {
    const bienIdChanged = changes['bienId'] && !changes['bienId'].firstChange;
    const emailChanged = changes['emailInterlocuteur'] && !changes['emailInterlocuteur'].firstChange;
    if (bienIdChanged || emailChanged) {
      this.store.setActiveConv(this.emailInterlocuteur);
      this.interlocuteurNom.set('');
      this.loadHistorique();
    }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    if (this.markAsReadTimer) clearTimeout(this.markAsReadTimer);
    this.store.setActiveConv(null);
  }

  ngAfterViewChecked(): void {
    if (this.needsScroll) {
      this.scrollToBottom();
      this.needsScroll = false;
    }
  }

  reloadHistorique(): void {
    this.loadHistorique();
  }

  private loadHistorique(): void {
    if (!this.bienId || !this.emailInterlocuteur) return;
    this.loading.set(true);
    this.loadError.set(false);
    this.messages.set([]);

    this.chatService.getHistorique(this.bienId, this.emailInterlocuteur).subscribe({
      next: msgs => {
        this.messages.set(msgs ?? []);
        this.loading.set(false);
        this.needsScroll = true;
        this.marquerLus();

        // Nom de l'interlocuteur : comme expéditeur en priorité, sinon comme destinataire d'un de mes messages
        const nom =
          msgs?.find(m => m.expediteurEmail === this.emailInterlocuteur)?.expediteurNom ||
          msgs?.find(m => m.destinataireEmail === this.emailInterlocuteur)?.destinataireNom;
        if (nom) {
          this.interlocuteurNom.set(nom);
          this.store.setResolvedName(this.emailInterlocuteur, nom);
        }
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set(true);
      },
    });
  }

  /**
   * Recharge l'historique sans vider l'écran et garde les messages locaux pas encore confirmés.
   * Un message en échec retrouvé dans l'historique (enregistré, mais accusé perdu pendant la coupure)
   * n'est plus suivi : on garde la version du serveur.
   */
  private rattraperHistorique(): void {
    if (!this.bienId || !this.emailInterlocuteur) return;
    const bienId = this.bienId;
    const email = this.emailInterlocuteur;

    this.chatService.getHistorique(bienId, email).subscribe({
      next: msgs => {
        if (bienId !== this.bienId || email !== this.emailInterlocuteur) return;
        const serveur = msgs ?? [];
        const dejaAffiches = new Set(this.messages().map(m => m.id));
        const nouveauxDeMoi = serveur.filter(m => !dejaAffiches.has(m.id) && m.expediteurEmail === this.myEmail);
        const locaux = this.messages()
          .filter(m => m.statut && m.idClient)
          .filter(local => {
            const i = nouveauxDeMoi.findIndex(m => m.contenu === local.contenu);
            if (i === -1) return true;
            nouveauxDeMoi.splice(i, 1);
            this.ws.oublier(local.idClient!);
            return false;
          });
        this.messages.set([...serveur, ...locaux]);
        this.needsScroll = true;
        this.marquerLus();
      },
      error: () => undefined,
    });
  }

  /** Renvoie un message en échec (W13). */
  renvoyer(msg: MessageDTO): void {
    if (msg.idClient) this.ws.renvoyer(msg.idClient);
  }

  private marquerLus(): void {
    const conv = this.store.conversations().find(
      c => c.bienId === this.bienId && (c.emailExpediteur === this.emailInterlocuteur || c.emailDestinataire === this.emailInterlocuteur),
    );
    const nonLuCount = conv?.nonLuCount ?? 0;

    this.chatService.marquerLus(this.bienId, this.emailInterlocuteur).subscribe({
      next: () => {
        this.store.markConversationAsRead(this.bienId, this.emailInterlocuteur);
        if (nonLuCount > 0) {
          this.store.decrementUnread(nonLuCount);
        }
      },
      error: () => undefined,
    });
  }

  private scheduleMarquerLus(): void {
    if (this.markAsReadTimer) clearTimeout(this.markAsReadTimer);
    this.markAsReadTimer = setTimeout(() => this.marquerLus(), 400);
  }

  private belongsToCurrentConv(msg: MessageDTO): boolean {
    if (msg.bienId != null && msg.bienId !== this.bienId) return false;
    const myEmail = this.myEmail;
    if (!this.emailInterlocuteur) {
      // Premier contact : seul l'écho de mon propre message (même idClient) concerne cette vue
      return msg.expediteurEmail === myEmail && !!msg.idClient;
    }
    return (
      (msg.expediteurEmail === myEmail && msg.destinataireEmail === this.emailInterlocuteur) ||
      (msg.expediteurEmail === this.emailInterlocuteur && msg.destinataireEmail === myEmail)
    );
  }

  private addMessageIfNew(msg: MessageDTO): void {
    const current = this.messages();
    // Écho du serveur : remplace le message local « en attente » de même idClient (W13)
    const local = msg.idClient ? current.findIndex(m => m.statut && m.idClient === msg.idClient) : -1;
    if (local !== -1) {
      const suivants = current.filter((m, i) => i !== local && m.id !== msg.id);
      suivants.splice(local, 0, msg);
      this.messages.set(suivants);
      return;
    }
    if (!current.some(m => m.id === msg.id)) {
      this.messages.set([...current, msg]);
      this.needsScroll = true;
    }
  }

  onMessageSent(msg: MessageDTO): void {
    this.addMessageIfNew(msg);
    this.sent.emit(msg);
  }

  isMine(msg: MessageDTO): boolean {
    return msg.expediteurEmail === this.myEmail;
  }

  private scrollToBottom(): void {
    const el = this.messagesEl?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }
}
