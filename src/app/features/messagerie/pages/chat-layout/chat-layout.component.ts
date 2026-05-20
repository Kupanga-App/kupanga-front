import {
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { MessageDTO } from '../../models/chat.models';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
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
export class ChatLayoutComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  protected store = inject(ChatStoreService);

  selectedConv = signal<ConversationDTO | null>(null);
  directBienId = signal<number | null>(null);
  directInterlocuteur = signal<string | null>(null);

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
    const params = this.route.snapshot.queryParamMap;
    const bienIdParam = params.get('bienId');
    const interlocuteur = params.get('interlocuteur');

    if (bienIdParam && interlocuteur) {
      const bienId = Number(bienIdParam);
      if (!isNaN(bienId)) {
        this.directBienId.set(bienId);
        this.directInterlocuteur.set(interlocuteur);
      }
    }
  }

  onConversationSelected(conv: ConversationDTO): void {
    this.selectedConv.set(conv);
    this.directBienId.set(null);
    this.directInterlocuteur.set(null);
    console.log('[Chat] conv sélectionnée', conv);
    console.log('[Chat] viewBienId=', this.viewBienId(), '| viewInterlocuteur=', this.viewInterlocuteur(), '| showView=', this.showView());
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
