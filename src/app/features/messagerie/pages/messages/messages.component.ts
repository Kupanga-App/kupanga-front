import { Component, OnDestroy, OnInit, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, catchError } from 'rxjs';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { NavigationService } from '../../../../core/navigation/navigation.service';
import { ChatStoreService } from '../../services/chat-store.service';
import { ConversationDTO, MessageDTO } from '../../models/chat.models';
import { ConversationListComponent } from '../../components/conversation-list/conversation-list.component';
import { ConversationViewComponent } from '../../components/conversation-view/conversation-view.component';
import { BienService } from '../../../biens/services/bien.service';
import { BienDTO } from '../../../biens/models/bien.model';
import { VideComponent } from '../../../../shared/ui/vide.component';

/**
 * Messages : liste des conversations, conversation plein écran sur téléphone, maître-détail ailleurs.
 *
 * Paramètres d'URL : `?bienId=` seul = premier contact depuis une annonce (l'e-mail du propriétaire n'est pas public,
 * P0-6) ; `?bienId=&interlocuteur=` = conversation précise ; `?interlocuteur=` = conversation avec ce compte.
 */
@Component({
  selector: 'kp-messages',
  standalone: true,
  imports: [ConversationListComponent, ConversationViewComponent, VideComponent],
  templateUrl: './messages.component.html',
  styleUrl: './messages.component.scss',
})
export class MessagesComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private bienService = inject(BienService);
  private nav = inject(NavigationService);
  protected store = inject(ChatStoreService);

  selectedConv = signal<ConversationDTO | null>(null);
  directBienId = signal<number | null>(null);
  directInterlocuteur = signal<string | null>(null);
  bienContext = signal<BienDTO | null>(null);

  private pendingEmail = signal<string | null>(null);
  /** Premier contact depuis une annonce : le propriétaire du bien, dont l'e-mail n'est pas public (P0-6). */
  nouveauContact = signal(false);
  private pendingBienId = signal<number | null>(null);
  private subs = new Subscription();

  viewBienId = computed(() => this.selectedConv()?.bienId ?? this.directBienId() ?? 0);

  viewInterlocuteur = computed(() => {
    const conv = this.selectedConv();
    if (conv) {
      const moi = this.authService.currentUser()?.email ?? '';
      return conv.emailExpediteur === moi ? conv.emailDestinataire : conv.emailExpediteur;
    }
    return this.directInterlocuteur() ?? '';
  });

  viewTitre = computed(() => this.selectedConv()?.bienTitre ?? this.bienContext()?.titre ?? '');

  viewPhotoUrl = computed(() => {
    const conv = this.selectedConv();
    if (!conv) return '';
    const moi = this.authService.currentUser()?.email ?? '';
    return conv.emailExpediteur === moi ? conv.destinatairePhotoUrl : conv.expediteurPhotoUrl;
  });

  viewNom = computed(() => {
    const conv = this.selectedConv();
    if (!conv) return '';
    const moi = this.authService.currentUser()?.email ?? '';
    return conv.emailExpediteur === moi ? conv.destinataireName : conv.expediteurName;
  });

  showView = computed(() => this.viewBienId() > 0 && (!!this.viewInterlocuteur() || this.nouveauContact()));

  selectedConvId = computed(() => this.selectedConv()?.id ?? null);

  /** Lien vers le bien depuis l'en-tête de la conversation : fiche privée si on y a accès, annonce sinon. */
  lienBien = computed(() => {
    const bien = this.bienContext();
    if (!bien) return null;
    const user = this.authService.currentUser();
    if (user && bien.proprietaire?.id === user.id) return ['/biens', bien.id];
    if (user && bien.locataire?.id === user.id) return ['/mon-logement'];
    return ['/annonces', bien.id];
  });

  constructor() {
    // Conversation déjà ouverte sur ce bien (côté candidat, l'autre participant est toujours le propriétaire, W1)
    effect(() => {
      const bienId = this.pendingBienId();
      const conv = bienId ? this.store.conversations().find(c => c.bienId === bienId) : undefined;
      if (conv) {
        this.pendingBienId.set(null);
        this.onConversationSelected(conv);
      }
    });

    effect(() => {
      const pending = this.pendingEmail();
      const convs = this.store.conversations();
      if (pending && convs.length > 0 && !this.showView()) {
        const conv = convs.find(c => c.emailExpediteur === pending || c.emailDestinataire === pending);
        if (conv) {
          this.pendingEmail.set(null);
          this.onConversationSelected(conv);
        }
      }
    });

    // Conversation ouverte sur téléphone : plein écran, sans barre d'onglets
    effect(() => this.nav.pleinEcranDemande.set(this.showView()));
  }

  ngOnInit(): void {
    this.subs.add(
      this.route.queryParamMap.subscribe(params => {
        const bienIdParam = params.get('bienId');
        const interlocuteur = params.get('interlocuteur');
        const bienId = bienIdParam ? Number(bienIdParam) : null;

        if (!interlocuteur) {
          if (bienId && !isNaN(bienId)) this.ouvrirContactProprietaire(bienId);
          return;
        }

        if (bienId && !isNaN(bienId)) {
          this.selectedConv.set(null);
          this.directBienId.set(bienId);
          this.directInterlocuteur.set(interlocuteur);
          this.pendingEmail.set(null);
          this.loadBienContext(bienId);
        } else {
          this.reinitialiser();
          const existante = this.store.conversations().find(
            c => c.emailExpediteur === interlocuteur || c.emailDestinataire === interlocuteur,
          );
          if (existante) {
            this.onConversationSelected(existante);
          } else {
            this.pendingEmail.set(interlocuteur);
          }
        }
      }),
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.nav.pleinEcranDemande.set(false);
  }

  /** Écrire au propriétaire d'un bien depuis son annonce, sans connaître son e-mail. */
  private ouvrirContactProprietaire(bienId: number): void {
    this.selectedConv.set(null);
    this.pendingEmail.set(null);
    const existante = this.store.conversations().find(c => c.bienId === bienId);
    if (existante) {
      this.onConversationSelected(existante);
      return;
    }
    this.directBienId.set(bienId);
    this.directInterlocuteur.set(null);
    this.nouveauContact.set(true);
    this.pendingBienId.set(bienId);
    this.loadBienContext(bienId);
  }

  /** Écho du premier message : l'API a créé la conversation avec le propriétaire. */
  onInterlocuteurConnu(email: string): void {
    this.pendingBienId.set(null);
    this.nouveauContact.set(false);
    this.directInterlocuteur.set(email);
  }

  onConversationSelected(conv: ConversationDTO): void {
    this.nouveauContact.set(false);
    this.pendingBienId.set(null);
    this.selectedConv.set(conv);
    this.directBienId.set(null);
    this.directInterlocuteur.set(null);
    this.pendingEmail.set(null);
    this.loadBienContext(conv.bienId);
  }

  onBackToList(): void {
    this.reinitialiser();
    // Retire les paramètres d'URL : « retour » ne rouvre pas la conversation
    if (this.route.snapshot.queryParamMap.keys.length) {
      void this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
    }
  }

  onMessageSentInConv(msg: MessageDTO): void {
    const conv = this.selectedConv();
    if (conv) {
      this.store.updateConversationLastMessage(conv.id, msg.contenu, msg.createdAt);
    }
  }

  private reinitialiser(): void {
    this.nouveauContact.set(false);
    this.pendingBienId.set(null);
    this.selectedConv.set(null);
    this.directBienId.set(null);
    this.directInterlocuteur.set(null);
    this.bienContext.set(null);
  }

  private loadBienContext(bienId: number): void {
    if (!bienId) {
      this.bienContext.set(null);
      return;
    }
    this.subs.add(
      // Vue privée si l'on est propriétaire ou locataire du bien, sinon annonce publique (candidat)
      this.bienService.getPrive(bienId).pipe(catchError(() => this.bienService.getPublic(bienId))).subscribe({
        next: bien => this.bienContext.set(bien),
        error: () => this.bienContext.set(null),
      }),
    );
  }
}
