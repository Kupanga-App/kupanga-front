import {
  AfterViewChecked,
  Component,
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
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { ChatService } from '../../services/chat.service';
import { ChatStoreService } from '../../services/chat-store.service';
import { ChatWebSocketService } from '../../services/chat-websocket.service';
import { MessageDTO } from '../../models/chat.models';
import { MessageInputComponent } from '../message-input/message-input.component';

@Component({
  selector: 'kp-conversation-view',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    MatIconModule,
    MatButtonModule,
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
  @Output() backRequested = new EventEmitter<void>();
  @Output() sent = new EventEmitter<MessageDTO>();

  @ViewChild('messagesEl') messagesEl!: ElementRef<HTMLElement>;

  private authService = inject(AuthService);
  private chatService = inject(ChatService);
  protected store = inject(ChatStoreService);
  private ws = inject(ChatWebSocketService);

  messages = signal<MessageDTO[]>([]);
  loading = signal(false);
  loadError = signal(false);
  wsConnected = signal(false);

  private needsScroll = false;
  private subs = new Subscription();

  get myEmail(): string {
    return this.authService.currentUser()?.email ?? '';
  }

  get interlocuteurInitiale(): string {
    return this.emailInterlocuteur.charAt(0).toUpperCase();
  }

  ngOnInit(): void {
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
        }
      })
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    const bienIdChanged = changes['bienId'] && !changes['bienId'].firstChange;
    const emailChanged = changes['emailInterlocuteur'] && !changes['emailInterlocuteur'].firstChange;
    if (bienIdChanged || emailChanged) {
      this.loadHistorique();
    }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
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
    console.log('[Chat] loadHistorique called', { bienId: this.bienId, emailInterlocuteur: this.emailInterlocuteur });
    if (!this.bienId || !this.emailInterlocuteur) {
      console.warn('[Chat] loadHistorique: early return — params invalides');
      return;
    }
    this.loading.set(true);
    this.loadError.set(false);
    this.messages.set([]);

    this.chatService.getHistorique(this.bienId, this.emailInterlocuteur).subscribe({
      next: (msgs) => {
        console.log('[Chat] historique reçu:', msgs);
        this.messages.set(msgs ?? []);
        this.loading.set(false);
        this.needsScroll = true;
        this.marquerLus();
      },
      error: (err) => {
        console.error('[Chat] historique erreur:', err);
        this.loading.set(false);
        this.loadError.set(true);
      },
    });
  }

  private marquerLus(): void {
    this.chatService.marquerLus(this.emailInterlocuteur).subscribe({
      next: () => {
        this.store.loadUnreadCount();
      },
      error: () => {},
    });
  }

  private belongsToCurrentConv(msg: MessageDTO): boolean {
    if (msg.bienId !== this.bienId) return false;
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
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    } catch {
      // ignore
    }
  }
}
