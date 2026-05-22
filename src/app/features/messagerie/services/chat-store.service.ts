import { Injectable, inject, signal } from '@angular/core';
import { ConversationDTO, MessageDTO } from '../models/chat.models';
import { ChatService } from './chat.service';

@Injectable({ providedIn: 'root' })
export class ChatStoreService {
  private chatService = inject(ChatService);

  conversations = signal<ConversationDTO[]>([]);
  activeConversation = signal<ConversationDTO | null>(null);
  messages = signal<MessageDTO[]>([]);
  unreadTotal = signal<number>(0);
  isLoadingMessages = signal<boolean>(false);
  isLoadingConversations = signal<boolean>(false);
  currentPage = signal<number>(0);
  hasMorePages = signal<boolean>(false);

  /** Email de l'interlocuteur actuellement affiché dans la vue conversation. */
  activeConvEmail = signal<string | null>(null);

  /** Noms résolus depuis l'historique des messages : email → nom complet. */
  resolvedNames = signal<Map<string, string>>(new Map());

  loadUnreadCount(): void {
    console.log('[ChatStore] loadUnreadCount() appelé');
    this.chatService.getNonLusCount().subscribe({
      next: (count) => {
        console.log('[ChatStore] getNonLusCount réponse API =', count, '| type =', typeof count);
        this.unreadTotal.set(count);
        console.log('[ChatStore] unreadTotal mis à jour =', this.unreadTotal());
      },
      error: (err) => {
        console.error('[ChatStore] getNonLusCount ERREUR =', err);
      },
    });
  }

  setActiveConversation(conv: ConversationDTO | null): void {
    this.activeConversation.set(conv);
  }

  /** Enregistre l'interlocuteur de la conversation en cours de lecture. */
  setActiveConv(email: string | null): void {
    this.activeConvEmail.set(email);
  }

  /**
   * Réinitialise nonLuCount à 0 pour la conversation correspondant à bienId + email,
   * sans recharger depuis le serveur.
   */
  markConversationAsRead(bienId: number, interlocuteurEmail: string): void {
    this.conversations.update((list) =>
      list.map((c) => {
        if (
          c.bienId === bienId &&
          (c.emailExpediteur === interlocuteurEmail || c.emailDestinataire === interlocuteurEmail)
        ) {
          return { ...c, nonLuCount: 0 };
        }
        return c;
      })
    );
  }

  addMessage(msg: MessageDTO): void {
    const current = this.messages();
    if (!current.some((m) => m.id === msg.id)) {
      this.messages.set([...current, msg]);
    }
  }

  setConversations(convs: ConversationDTO[]): void {
    console.log('[ChatStore] setConversations — nb =', convs.length,
      '| nonLuCounts =', convs.map(c => ({ bienTitre: c.bienTitre, nonLuCount: c.nonLuCount })));
    this.conversations.set(convs);
  }

  appendConversations(convs: ConversationDTO[]): void {
    this.conversations.update((list) => [...list, ...convs]);
  }

  updateConversationUnread(convId: number, delta: number): void {
    this.conversations.update((list) =>
      list.map((c) => (c.id === convId ? { ...c, nonLuCount: Math.max(0, c.nonLuCount + delta) } : c))
    );
  }

  updateConversationLastMessage(convId: number, lastMessage: string, lastMessageAt: string): void {
    this.conversations.update((list) =>
      list.map((c) => (c.id === convId ? { ...c, lastMessage, lastMessageAt } : c))
    );
  }

  incrementUnread(amount = 1): void {
    this.unreadTotal.update((n) => n + amount);
  }

  decrementUnread(amount: number): void {
    this.unreadTotal.update((n) => Math.max(0, n - amount));
  }

  resetMessages(): void {
    this.messages.set([]);
  }

  setResolvedName(email: string, nom: string): void {
    if (!email || !nom) return;
    this.resolvedNames.update((m) => new Map(m).set(email, nom));
  }
}
