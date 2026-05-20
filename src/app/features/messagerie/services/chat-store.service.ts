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

  loadUnreadCount(): void {
    this.chatService.getNonLusCount().subscribe({
      next: (count) => this.unreadTotal.set(count),
      error: () => {},
    });
  }

  setActiveConversation(conv: ConversationDTO | null): void {
    this.activeConversation.set(conv);
  }

  addMessage(msg: MessageDTO): void {
    const current = this.messages();
    if (!current.some((m) => m.id === msg.id)) {
      this.messages.set([...current, msg]);
    }
  }

  setConversations(convs: ConversationDTO[]): void {
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
}
