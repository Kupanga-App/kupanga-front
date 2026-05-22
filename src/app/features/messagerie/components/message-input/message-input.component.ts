import {
  Component,
  EventEmitter,
  inject,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { ChatWebSocketService } from '../../services/chat-websocket.service';
import { MessageDTO, MessagePayload } from '../../models/chat.models';

@Component({
  selector: 'kp-message-input',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
  ],
  templateUrl: './message-input.component.html',
  styleUrls: ['./message-input.component.scss'],
})
export class MessageInputComponent {
  @Input({ required: true }) emailDestinataire!: string;
  @Input({ required: true }) bienId!: number;
  @Input() wsConnected = false;
  @Input() interlocuteurNom = '';
  @Output() messageSent = new EventEmitter<MessageDTO>();

  private authService = inject(AuthService);
  private ws = inject(ChatWebSocketService);

  control = new FormControl('');

  get isSelf(): boolean {
    return this.emailDestinataire === this.authService.currentUser()?.email;
  }

  get canSend(): boolean {
    return this.wsConnected && !this.isSelf && !!this.control.value?.trim();
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  send(): void {
    const contenu = this.control.value?.trim();
    if (!contenu || !this.canSend) return;

    const user = this.authService.currentUser();
    if (!user) return;

    const payload: MessagePayload = {
      contenu,
      emailDestinataire: this.emailDestinataire,
      bienId: this.bienId,
    };

    // Ajout local immédiat (l'expéditeur ne reçoit pas son propre message via WS)
    const localMsg: MessageDTO = {
      id: Date.now(),
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
    };

    this.messageSent.emit(localMsg);
    this.ws.sendMessage(payload);
    this.control.reset();
  }
}
