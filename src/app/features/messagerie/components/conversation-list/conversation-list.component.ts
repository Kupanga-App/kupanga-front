import { Component, OnDestroy, OnInit, inject, input, output, signal } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ChatService } from '../../services/chat.service';
import { ChatStoreService } from '../../services/chat-store.service';
import { ChatWebSocketService } from '../../services/chat-websocket.service';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { ConversationDTO } from '../../models/chat.models';
import { PageHeaderComponent } from '../../../../shared/ui/page-header.component';
import { SegmentedComponent, OptionSegment } from '../../../../shared/ui/segmented.component';
import { AvatarComponent } from '../../../../shared/ui/avatar.component';
import { VideComponent } from '../../../../shared/ui/vide.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { TirerPourActualiserDirective } from '../../../../shared/ui/tirer-pour-actualiser.directive';
import { heureMessage } from '../../../../shared/format';

type Filtre = 'toutes' | 'non-lues';

@Component({
  selector: 'kp-conversation-list',
  standalone: true,
  imports: [PageHeaderComponent, SegmentedComponent, AvatarComponent, VideComponent, IconComponent, TirerPourActualiserDirective],
  templateUrl: './conversation-list.component.html',
  styleUrl: './conversation-list.component.scss',
})
export class ConversationListComponent implements OnInit, OnDestroy {
  readonly selectedConvId = input<number | null>(null);
  readonly conversationSelected = output<ConversationDTO>();

  private chatService = inject(ChatService);
  protected store = inject(ChatStoreService);
  private ws = inject(ChatWebSocketService);
  private auth = inject(AuthService);

  readonly recherche = signal('');
  readonly filtre = signal<Filtre>('toutes');
  readonly erreur = signal(false);
  readonly heure = heureMessage;

  readonly options: OptionSegment<Filtre>[] = [
    { valeur: 'toutes', libelle: 'Toutes' },
    { valeur: 'non-lues', libelle: 'Non lues' },
  ];

  private saisie = new Subject<string>();
  private subs = new Subscription();

  private get myEmail(): string {
    return this.auth.currentUser()?.email ?? '';
  }

  ngOnInit(): void {
    this.store.loadUnreadCount();
    this.charger(0);

    this.subs.add(
      this.saisie.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => this.charger(0)),
    );

    this.subs.add(
      this.ws.notifications$.subscribe(notif => {
        const existe = this.store.conversations().some(c => c.id === notif.conversationId);
        if (existe) {
          if (this.store.activeConvEmail() !== notif.expediteurEmail) {
            this.store.updateConversationUnread(notif.conversationId, 1);
          }
          this.store.updateConversationLastMessage(notif.conversationId, notif.contenuPreview, notif.createdAt);
        } else {
          this.charger(0);
        }
      }),
    );

    // W11 : messages reçus pendant la coupure (le compteur global est rechargé par kp-chat-notification)
    this.subs.add(this.ws.reconnected$.subscribe(() => this.charger(0)));
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  rechercher(valeur: string): void {
    this.recherche.set(valeur);
    this.saisie.next(valeur.trim());
  }

  changerFiltre(f: Filtre): void {
    this.filtre.set(f);
    this.charger(0);
  }

  actualiser(): void {
    this.store.loadUnreadCount();
    this.charger(0);
  }

  charger(page: number): void {
    if (page === 0) {
      this.store.isLoadingConversations.set(true);
    }
    this.erreur.set(false);
    this.chatService
      .searchConversations({
        nomDuBien: this.recherche().trim() || undefined,
        lu: this.filtre() === 'non-lues' ? false : null,
        page,
        size: 20,
        sortBy: 'lastMessageAt',
        sortDirection: 'DESC',
      })
      .subscribe({
        next: result => {
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
          this.erreur.set(true);
        },
      });
  }

  suite(): void {
    this.charger(this.store.currentPage() + 1);
  }

  interlocuteurEmail(conv: ConversationDTO): string {
    return conv.emailExpediteur === this.myEmail ? conv.emailDestinataire : conv.emailExpediteur;
  }

  interlocuteurNom(conv: ConversationDTO): string {
    const nom = conv.emailExpediteur === this.myEmail ? conv.destinataireName : conv.expediteurName;
    if (nom) return nom;
    const email = this.interlocuteurEmail(conv);
    return this.store.resolvedNames().get(email) ?? email.split('@')[0];
  }

  interlocuteurPhoto(conv: ConversationDTO): string {
    return conv.emailExpediteur === this.myEmail ? conv.destinatairePhotoUrl : conv.expediteurPhotoUrl;
  }
}
