import { Component, ElementRef, EventEmitter, Input, Output, ViewChild, inject, signal } from '@angular/core';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { ChatWebSocketService } from '../../services/chat-websocket.service';
import { MessageDTO, MessagePayload } from '../../models/chat.models';
import { IconComponent } from '../../../../shared/components/icon/icon.component';

/** Zone de saisie collée au bas de la conversation (au-dessus du clavier et de la barre de geste). */
@Component({
  selector: 'kp-message-input',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './message-input.component.html',
  styleUrl: './message-input.component.scss',
})
export class MessageInputComponent {
  @Input({ required: true }) emailDestinataire!: string;
  @Input({ required: true }) bienId!: number;
  @Input() interlocuteurNom = '';
  @Output() messageSent = new EventEmitter<MessageDTO>();

  @ViewChild('champ') champ?: ElementRef<HTMLTextAreaElement>;

  private authService = inject(AuthService);
  private ws = inject(ChatWebSocketService);

  readonly texte = signal('');

  get isSelf(): boolean {
    return !!this.emailDestinataire && this.emailDestinataire === this.authService.currentUser()?.email;
  }

  /** Envoi possible même déconnecté : le message attend dans la file et part à la reconnexion (W13). */
  get canSend(): boolean {
    return !this.isSelf && !!this.texte().trim();
  }

  saisir(valeur: string): void {
    this.texte.set(valeur);
    this.ajusterHauteur();
  }

  /** Entrée envoie sur ordinateur ; sur téléphone, la touche Entrée va à la ligne (bouton d'envoi dédié). */
  onKeydown(event: KeyboardEvent): void {
    const tactile = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
    if (event.key === 'Enter' && !event.shiftKey && !tactile) {
      event.preventDefault();
      this.send();
    }
  }

  send(): void {
    const contenu = this.texte().trim();
    if (!contenu || !this.canSend) return;

    const user = this.authService.currentUser();
    if (!user) return;

    const payload: MessagePayload = {
      contenu,
      emailDestinataire: this.emailDestinataire || undefined,
      bienId: this.bienId,
    };

    const idClient = this.ws.envoyer(payload);

    // Ajout local immédiat « en attente », remplacé par l'écho du serveur (même idClient)
    const localMsg: MessageDTO = {
      id: -Date.now(),
      contenu,
      lu: false,
      createdAt: new Date().toISOString(),
      expediteurId: user.id,
      expediteurNom: `${user.firstName} ${user.lastName}`,
      expediteurEmail: user.email,
      destinataireId: 0,
      destinataireNom: '',
      destinataireEmail: this.emailDestinataire,
      bienId: this.bienId,
      bienAdresse: '',
      idClient,
      statut: 'en_attente',
    };

    this.messageSent.emit(localMsg);
    this.texte.set('');
    if (this.champ) {
      this.champ.nativeElement.value = '';
      this.ajusterHauteur();
      this.champ.nativeElement.focus();
    }
  }

  private ajusterHauteur(): void {
    const el = this.champ?.nativeElement;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`;
  }
}
