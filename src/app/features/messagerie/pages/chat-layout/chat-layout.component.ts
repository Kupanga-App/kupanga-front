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
import { AuthService } from '../../../../core/auth/services/auth.service';
import { ChatStoreService } from '../../services/chat-store.service';
import { ConversationDTO } from '../../models/chat.models';
import { ConversationListComponent } from '../../components/conversation-list/conversation-list.component';
import { ConversationViewComponent } from '../../components/conversation-view/conversation-view.component';
import { ChatContextRailComponent } from '../../components/chat-context-rail/chat-context-rail.component';
import { BienService } from '../../../biens/services/bien.service';
import { BienDTO } from '../../../biens/models/bien.model';

@Component({
  selector: 'kp-chat-layout',
  standalone: true,
  imports: [
    CommonModule,
    ConversationListComponent,
    ConversationViewComponent,
    ChatContextRailComponent,
  ],
  templateUrl: './chat-layout.component.html',
  styleUrls: ['./chat-layout.component.scss'],
})
export class ChatLayoutComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private bienService = inject(BienService);
  protected store = inject(ChatStoreService);

  selectedConv = signal<ConversationDTO | null>(null);
  directBienId = signal<number | null>(null);
  directInterlocuteur = signal<string | null>(null);
  bienContext = signal<BienDTO | null>(null);
  interlocuteurNom = signal<string>('');

  private pendingEmail = signal<string | null>(null);
  private subs = new Subscription();

  constructor() {
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

  viewPhotoUrl = computed(() => {
    const conv = this.selectedConv();
    if (!conv) return '';
    const myEmail = this.authService.currentUser()?.email ?? '';
    return conv.emailExpediteur === myEmail
      ? conv.destinatairePhotoUrl
      : conv.expediteurPhotoUrl;
  });

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
          this.selectedConv.set(null);
          this.directBienId.set(bienId);
          this.directInterlocuteur.set(interlocuteur);
          this.pendingEmail.set(null);
          this.interlocuteurNom.set('');
          this.loadBienContext(bienId);
        } else {
          this.selectedConv.set(null);
          this.directBienId.set(null);
          this.directInterlocuteur.set(null);
          this.bienContext.set(null);
          this.interlocuteurNom.set('');

          const existing = this.store.conversations().find(
            (c) => c.emailExpediteur === interlocuteur || c.emailDestinataire === interlocuteur
          );
          if (existing) {
            this.onConversationSelected(existing);
          } else {
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
    this.interlocuteurNom.set('');
    this.loadBienContext(conv.bienId);
  }

  onBackToList(): void {
    this.selectedConv.set(null);
    this.directBienId.set(null);
    this.directInterlocuteur.set(null);
    this.bienContext.set(null);
    this.interlocuteurNom.set('');
  }

  onMessageSentInConv(msg: MessageDTO): void {
    const conv = this.selectedConv();
    if (conv) {
      this.store.updateConversationLastMessage(conv.id, msg.contenu, msg.createdAt);
    }
  }

  onNomResolved(nom: string): void {
    this.interlocuteurNom.set(nom);
  }

  private loadBienContext(bienId: number): void {
    if (!bienId) {
      this.bienContext.set(null);
      return;
    }
    this.subs.add(
      this.bienService.getById(bienId).subscribe({
        next: (bien) => this.bienContext.set(bien),
        error: () => this.bienContext.set(null),
      })
    );
  }
}
