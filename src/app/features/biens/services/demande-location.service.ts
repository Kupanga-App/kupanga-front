import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { DemandeLocation } from '../models/demande-location.model';

/** Le bien n'est assigné qu'à l'acceptation de la demande par le locataire. */
@Injectable({ providedIn: 'root' })
export class DemandeLocationService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  /** Propriétaire : propose le bien à un candidat (409 si bien loué ou demande déjà en attente). */
  envoyer(bienId: number, locataireId: number): Observable<DemandeLocation> {
    return this.http.post<DemandeLocation>(`${this.api}/biens/${bienId}/demandes-location/${locataireId}`, null);
  }

  /** Propriétaire : demandes envoyées pour ce bien, les plus récentes d'abord. */
  duBien(bienId: number): Observable<DemandeLocation[]> {
    return this.http.get<DemandeLocation[]>(`${this.api}/biens/${bienId}/demandes-location`);
  }

  /** Propriétaire : retire une demande en attente. */
  annuler(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/demandes-location/${id}`);
  }

  /** Locataire : demandes en attente reçues. */
  recues(): Observable<DemandeLocation[]> {
    return this.http.get<DemandeLocation[]>(`${this.api}/demandes-location/recues`);
  }

  /** Locataire : accepte, le bien lui est assigné (410 si expirée, 409 si le logement n'est plus libre). */
  accepter(id: number): Observable<DemandeLocation> {
    return this.http.post<DemandeLocation>(`${this.api}/demandes-location/${id}/accepter`, null);
  }

  refuser(id: number): Observable<DemandeLocation> {
    return this.http.post<DemandeLocation>(`${this.api}/demandes-location/${id}/refuser`, null);
  }
}
