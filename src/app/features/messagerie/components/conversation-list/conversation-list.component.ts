import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnDestroy,
  OnInit,
  Output,
  signal,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ChatService } from '../../services/chat.service';
import { ChatStoreService } from '../../services/chat-store.service';
import { ChatWebSocketService } from '../../services/chat-websocket.service';
import { ConversationDTO } from '../../models/chat.models';

@Component({
  selector: 'kp-conversation-list',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    ReactiveFormsModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatButtonModule,
  ],
  templateUrl: './conversation-list.component.html',
  styleUrls: ['./conversation-list.component.scss'],
})
export class ConversationListComponent implements OnInit, OnDestroy {
  @Input() selectedConvId: number | null = null;
  @Output() conversationSelected = new EventEmitter<ConversationDTO>();

  private chatService = inject(ChatService);
  protected store = inject(ChatStoreService);
  private ws = inject(ChatWebSocketService);

  searchControl = new FormControl('');
  filter = signal<'all' | 'unread'>('all');

  private searchSubject = new Subject<string>();
  private subs = new Subscription();

  ngOnInit(): void {
    this.store.loadUnreadCount();
    this.loadConversations(0);

    this.subs.add(
      this.searchControl.valueChanges
        .pipe(debounceTime(300), distinctUntilChanged())
        .subscribe((val) => {
          this.searchSubject.next(val ?? '');
          this.loadConversations(0, val ?? '');
        })
    );

    this.subs.add(
      this.ws.notifications$.subscribe((notif) => {
        const convs = this.store.conversations();
        const idx = convs.findIndex((c) => c.id === notif.conversationId);
        const isViewingThisConv = this.store.activeConvEmail() === notif.expediteurEmail;
        if (idx !== -1) {
          if (!isViewingThisConv) {
            this.store.updateConversationUnread(notif.conversationId, 1);
          }
        } else {
          this.loadConversations(0, this.searchControl.value ?? '');
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  loadConversations(page: number, nomDuBien = ''): void {
    if (page === 0) {
      this.store.isLoadingConversations.set(true);
    }

    const lu = this.filter() === 'unread' ? false : null;

    this.chatService
      .searchConversations({
        nomDuBien: nomDuBien || undefined,
        lu: lu,
        page,
        size: 20,
        sortBy: 'lastMessageAt',
        sortDirection: 'DESC',
      })
      .subscribe({
        next: (result) => {
          if (page === 0) {
            this.store.setConversations(result.contenu);
          } else {
            this.store.appendConversations(result.contenu);
          }
          this.store.currentPage.set(result.pageActuelle);
          this.store.hasMorePages.set(!result.dernierepage);
          this.store.isLoadingConversations.set(false);
        },
        error: () => {
          this.store.isLoadingConversations.set(false);
        },
      });
  }

  setFilter(f: 'all' | 'unread'): void {
    this.filter.set(f);
    this.loadConversations(0, this.searchControl.value ?? '');
  }

  loadMore(): void {
    const next = this.store.currentPage() + 1;
    this.loadConversations(next, this.searchControl.value ?? '');
  }

  select(conv: ConversationDTO): void {
    this.conversationSelected.emit(conv);
  }

  interlocuteurInitiale(conv: ConversationDTO): string {
    const email = conv.emailDestinataire || conv.emailExpediteur;
    return email.charAt(0).toUpperCase();
  }
}
