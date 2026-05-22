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
import { CommonModule, DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { ChatService } from '../../services/chat.service';
import { ChatStoreService } from '../../services/chat-store.service';
import { ChatWebSocketService } from '../../services/chat-websocket.service';
import { MessageDTO } from '../../models/chat.models';
import { MessageInputComponent } from '../message-input/message-input.component';

export interface MessageGroup {
  label: string;
  messages: MessageDTO[];
}

@Component({
  selector: 'kp-conversation-view',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    MatIconModule,
    MatProgressSpinnerModule,
    MessageInputComponent,
  ],
  templateUrl: './conversation-view.component.html',
  styleUrls: ['./conversation-view.component.scss'],
})
export class ConversationViewComponent implements OnInit, OnChanges, OnDestroy, AfterViewChecked {
  @Input({ required: true }) bienId!: number;
  @Input({ required: true }) emailInterlocuteur!: string;
  @Input() titre = '';
  @Input() photoUrl = '';
  @Output() backRequested = new EventEmitter<void>();
  @Output() sent = new EventEmitter<MessageDTO>();
  @Output() nameResolved = new EventEmitter<string>();

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

  private readonly TONES = [
    'tone-olive', 'tone-clay', 'tone-sand',
    'tone-slate', 'tone-mint', 'tone-night',
  ] as const;

  get myEmail(): string {
    return this.authService.currentUser()?.email ?? '';
  }

  get headerInitiales(): string {
    const local = this.emailInterlocuteur.split('@')[0];
    const parts = local.split(/[._-]/);
    if (parts.length >= 2) {
      return ((parts[0][0] ?? '') + (parts[1][0] ?? '')).toUpperCase();
    }
    return local.substring(0, 2).toUpperCase();
  }

  get headerToneClass(): string {
    const email = this.emailInterlocuteur;
    const hash = email.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return this.TONES[hash % this.TONES.length];
  }

  get displayNom(): string {
    const nom = this.interlocuteurNom();
    if (nom) return nom;
    const local = this.emailInterlocuteur.split('@')[0];
    return local
      .split(/[._-]/)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ');
  }

  dayGroups = computed<MessageGroup[]>(() => {
    const msgs = this.messages();
    if (!msgs.length) return [];

    const result: MessageGroup[] = [];
    let currentLabel = '';
    let currentMsgs: MessageDTO[] = [];

    for (const msg of msgs) {
      const label = this.getDayLabel(msg.createdAt);
      if (label !== currentLabel) {
        if (currentMsgs.length) result.push({ label: currentLabel, messages: currentMsgs });
        currentLabel = label;
        currentMsgs = [msg];
      } else {
        currentMsgs.push(msg);
      }
    }
    if (currentMsgs.length) result.push({ label: currentLabel, messages: currentMsgs });
    return result;
  });

  private getDayLabel(isoDate: string): string {
    const today = new Date();
    const todayStr = today.toISOString().substring(0, 10);
    const dStr = isoDate.substring(0, 10);

    if (dStr === todayStr) return "AUJOURD'HUI";

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (dStr === yesterday.toISOString().substring(0, 10)) return 'HIER';

    const d = new Date(dStr + 'T12:00:00');
    return d
      .toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
      .toUpperCase();
  }

  ngOnInit(): void {
    this.store.setActiveConv(this.emailInterlocuteur);
    this.loadHistorique();

    this.subs.add(
      this.ws.connected$.subscribe((connected) => {
        this.wsConnected.set(connected);
      })
    );
    this.wsConnected.set(this.ws.isConnected);

    this.subs.add(
      this.ws.messages$.subscribe((msg) => {
        if (this.belongsToCurrentConv(msg)) {
          this.addMessageIfNew(msg);
          if (msg.expediteurEmail === this.emailInterlocuteur) {
            this.scheduleMarquerLus();
          }
        }
      })
    );
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
      next: (msgs) => {
        this.messages.set(msgs ?? []);
        this.loading.set(false);
        this.needsScroll = true;
        this.marquerLus();

        // Résolution du nom : interlocuteur comme expéditeur en priorité,
        // sinon comme destinataire dans un de mes messages.
        const sentByThem = msgs?.find((m) => m.expediteurEmail === this.emailInterlocuteur);
        const nom =
          sentByThem?.expediteurNom ||
          msgs?.find((m) => m.destinataireEmail === this.emailInterlocuteur)?.destinataireNom;

        if (nom) {
          this.interlocuteurNom.set(nom);
          this.nameResolved.emit(nom);
          this.store.setResolvedName(this.emailInterlocuteur, nom);
        }
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set(true);
      },
    });
  }

  private marquerLus(): void {
    const conv = this.store.conversations().find(
      (c) =>
        c.bienId === this.bienId &&
        (c.emailExpediteur === this.emailInterlocuteur ||
          c.emailDestinataire === this.emailInterlocuteur)
    );
    const nonLuCount = conv?.nonLuCount ?? 0;

    this.chatService.marquerLus(this.emailInterlocuteur).subscribe({
      next: () => {
        this.store.markConversationAsRead(this.bienId, this.emailInterlocuteur);
        if (nonLuCount > 0) {
          this.store.decrementUnread(nonLuCount);
        }
      },
      error: () => {},
    });
  }

  private scheduleMarquerLus(): void {
    if (this.markAsReadTimer) clearTimeout(this.markAsReadTimer);
    this.markAsReadTimer = setTimeout(() => this.marquerLus(), 400);
  }

  private belongsToCurrentConv(msg: MessageDTO): boolean {
    if (msg.bienId != null && msg.bienId !== this.bienId) return false;
    const myEmail = this.myEmail;
    return (
      (msg.expediteurEmail === myEmail && msg.destinataireEmail === this.emailInterlocuteur) ||
      (msg.expediteurEmail === this.emailInterlocuteur && msg.destinataireEmail === myEmail)
    );
  }

  private addMessageIfNew(msg: MessageDTO): void {
    const current = this.messages();
    if (!current.some((m) => m.id === msg.id)) {
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
    try {
      const el = this.messagesEl?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {
      // ignore
    }
  }
}
