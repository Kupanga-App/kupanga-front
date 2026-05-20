import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ConversationPageDTO,
  ConversationSearchDTO,
  MessageDTO,
} from '../models/chat.models';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  searchConversations(dto: ConversationSearchDTO): Observable<ConversationPageDTO> {
    return this.http.post<ConversationPageDTO>(`${this.api}/conversations/search`, dto);
  }

  getHistorique(bienId: number, emailInterlocuteur: string): Observable<MessageDTO[]> {
    const url = `${this.api}/historique?bienId=${bienId}&emailInterlocuteur=${encodeURIComponent(emailInterlocuteur)}`;
    return this.http.get<MessageDTO[]>(url);
  }

  marquerLus(emailExpediteur: string): Observable<void> {
    return this.http.post<void>(
      `${this.api}/messages/conversation/${encodeURIComponent(emailExpediteur)}/lire`,
      {}
    );
  }

  getNonLusCount(): Observable<number> {
    return this.http.get<number>(`${this.api}/messages/non-lus`);
  }
}
