import {
  Component,
  computed,
  effect,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { MessageDTO } from '../../models/chat.models';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { ChatStoreService } from '../../services/chat-store.service';
import { ConversationDTO } from '../../models/chat.models';
import { ConversationListComponent } from '../../components/conversation-list/conversation-list.component';
import { ConversationViewComponent } from '../../components/conversation-view/conversation-view.component';

@Component({
  selector: 'kp-chat-layout',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    ConversationListComponent,
    ConversationViewComponent,
  ],
  templateUrl: './chat-layout.component.html',
  styleUrls: ['./chat-layout.component.scss'],
})
export class ChatLayoutComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  protected store = inject(ChatStoreService);

  selectedConv = signal<ConversationDTO | null>(null);
  directBienId = signal<number | null>(null);
  directInterlocuteur = signal<string | null>(null);

  /** Email en attente de sélection automatique (toast sans bienId). */
  private pendingEmail = signal<string | null>(null);

  private subs = new Subscription();

  constructor() {
    // Auto-sélectionne la conversation quand les conversations sont chargées
    // et qu'un email en attente est présent (navigation depuis toast).
    effect(() => {
      const pending = this.pendingEmail();
      const convs = this.store.conversations();
      if (pending && convs.length > 0 && !this.showView()) {
        const conv = convs.find(
          (c) => c.emailExpediteur === pending || c.emailDestinataire === pending
        );
        if (conv) {
          this.pendingEmail.set(null);
          this.onConversationSelected(conv);
        }
      }
    });
  }

  viewBienId = computed(() => {
    const conv = this.selectedConv();
    return conv ? conv.bienId : (this.directBienId() ?? 0);
  });

  viewInterlocuteur = computed(() => {
    const conv = this.selectedConv();
    if (conv) {
      const myEmail = this.authService.currentUser()?.email ?? '';
      return conv.emailExpediteur === myEmail ? conv.emailDestinataire : conv.emailExpediteur;
    }
    return this.directInterlocuteur() ?? '';
  });

  viewTitre = computed(() => this.selectedConv()?.bienTitre ?? '');

  showView = computed(() => this.viewBienId() > 0 && !!this.viewInterlocuteur());

  selectedConvId = computed(() => this.selectedConv()?.id ?? null);

  ngOnInit(): void {
    this.subs.add(
      this.route.queryParamMap.subscribe((params) => {
        const bienIdParam = params.get('bienId');
        const interlocuteur = params.get('interlocuteur');

        if (!interlocuteur) return;

        const bienId = bienIdParam ? Number(bienIdParam) : null;

        if (bienId && !isNaN(bienId)) {
          // Navigation directe avec bienId + email (bouton "Contacter")
          this.selectedConv.set(null);
          this.directBienId.set(bienId);
          this.directInterlocuteur.set(interlocuteur);
          this.pendingEmail.set(null);
        } else {
          // Navigation sans bienId (clic sur toast) : cherche dans la liste chargée
          this.selectedConv.set(null);
          this.directBienId.set(null);
          this.directInterlocuteur.set(null);

          const existing = this.store.conversations().find(
            (c) => c.emailExpediteur === interlocuteur || c.emailDestinataire === interlocuteur
          );
          if (existing) {
            this.onConversationSelected(existing);
          } else {
            // Sera sélectionné automatiquement quand les conversations chargeront
            this.pendingEmail.set(interlocuteur);
          }
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  onConversationSelected(conv: ConversationDTO): void {
    this.selectedConv.set(conv);
    this.directBienId.set(null);
    this.directInterlocuteur.set(null);
    this.pendingEmail.set(null);
  }

  onBackToList(): void {
    this.selectedConv.set(null);
    this.directBienId.set(null);
    this.directInterlocuteur.set(null);
  }

  onMessageSentInConv(msg: MessageDTO): void {
    const conv = this.selectedConv();
    if (conv) {
      this.store.updateConversationLastMessage(conv.id, msg.contenu, msg.createdAt);
    }
  }
}
