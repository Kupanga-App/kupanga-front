import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import {
  ConversationDTO,
  ConversationPageDTO,
  ConversationSearchDTO,
  MessageDTO,
} from '../models/chat.models';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  searchConversations(dto: ConversationSearchDTO): Observable<ConversationPageDTO> {
    return this.http.post<unknown>(`${this.api}/conversations/search`, dto).pipe(
      map((raw) => this.normalizeConversationPage(raw as Record<string, unknown>))
    );
  }

  /**
   * Normalise la réponse de l'API conversation/search.
   * Gère les deux conventions de nommage : anglais (nonLuCount, lastMessage…)
   * et français (nonLus, dernierMessage…).
   */
  private normalizeConversationPage(raw: Record<string, unknown>): ConversationPageDTO {
    const contenu = (raw['contenu'] as Record<string, unknown>[]) ?? [];
    console.log('[ChatService] normalizeConversationPage — raw sample[0] =', contenu[0]);
    return {
      contenu: contenu.map((c) => ({
        id: c['id'] as number,
        bienId: c['bienId'] as number,
        bienTitre: (c['bienTitre'] as string) ?? '',
        emailExpediteur: ((c['emailExpediteur'] ?? c['interlocuteurEmail'] ?? '') as string),
        emailDestinataire: ((c['emailDestinataire'] ?? c['interlocuteurEmail'] ?? '') as string),
        lastMessage: ((c['lastMessage'] ?? c['dernierMessage'] ?? '') as string),
        lastMessageAt: ((c['lastMessageAt'] ?? c['dernierMessageDate'] ?? '') as string),
        createdAt: ((c['createdAt'] ?? '') as string),
        nonLuCount: ((c['nonLuCount'] ?? c['nonLus'] ?? 0) as number),
      })),
      pageActuelle: (raw['pageActuelle'] as number) ?? 0,
      totalPages: (raw['totalPages'] as number) ?? 0,
      totalElements: (raw['totalElements'] as number) ?? 0,
      dernierepage: (raw['dernierePage'] ?? raw['dernierepage']) as boolean,
      premierepage: (raw['premierePage'] ?? raw['premierepage']) as boolean,
    };
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
