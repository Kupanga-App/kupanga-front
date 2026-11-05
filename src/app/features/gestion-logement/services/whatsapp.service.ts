import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/** C7-C16 : lien `wa.me` prérempli renvoyé par l'API (rien n'est envoyé par l'API elle-même). */
export interface LienWhatsApp {
  url: string;
  texte: string;
  /** Faux si le locataire n'a pas de numéro : WhatsApp fera choisir le contact. */
  numeroConnu: boolean;
}

export type DocumentWhatsApp = 'contrat' | 'edl' | 'quittance' | 'demande';

const CHEMINS: Record<DocumentWhatsApp, string> = {
  contrat: 'contrats',
  edl: 'etats-des-lieux',
  quittance: 'quittances',
  demande: 'demandes-location',
};

@Injectable({ providedIn: 'root' })
export class WhatsappService {
  private http = inject(HttpClient);

  /** Invitation à signer (contrat, EDL), rappel de loyer (quittance) ou demande de location ; 409 si non proposé. */
  lien(type: DocumentWhatsApp, id: number): Observable<LienWhatsApp> {
    return this.http.get<LienWhatsApp>(`${environment.apiUrl}/${CHEMINS[type]}/${id}/lien-whatsapp`);
  }
}
