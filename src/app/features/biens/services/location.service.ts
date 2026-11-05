import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Location } from '../models/location.model';

/** Réservations et locations : le candidat devient locataire à la signature du bail. */
@Injectable({ providedIn: 'root' })
export class LocationService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  /** Propriétaire : réservation ou location en cours du bien ; `null` si le bien est libre (204). */
  duBien(bienId: number): Observable<Location | null> {
    return this.http.get<Location | null>(`${this.api}/biens/${bienId}/location`, { observe: 'response' })
      .pipe(map(r => (r.status === 204 ? null : r.body)));
  }

  /** Candidat : logements réservés en attente de la signature du bail. */
  mesReservations(): Observable<Location[]> {
    return this.http.get<Location[]>(`${this.api}/locations/reservations`);
  }

  /** Candidat : renonce au logement avant d'avoir signé le bail (409 si déjà signé ou expiré). */
  desister(id: number): Observable<Location> {
    return this.http.post<Location>(`${this.api}/locations/${id}/desister`, null);
  }

  /** Fin de bail : le propriétaire ou le locataire annonce la date de fin (`aaaa-mm-jj`). */
  donnerConge(id: number, dateFin: string): Observable<Location> {
    return this.http.post<Location>(`${this.api}/locations/${id}/conge`, { dateFin });
  }

  /** Celui qui a donné congé le retire. */
  retirerConge(id: number): Observable<Location> {
    return this.http.delete<Location>(`${this.api}/locations/${id}/conge`);
  }

  /** Propriétaire : fin du bail enregistrée avec le dépôt restitué (motif obligatoire en cas de retenue). */
  terminer(id: number, depotRestitue: number, motifRetenue: string | null): Observable<Location> {
    return this.http.post<Location>(`${this.api}/locations/${id}/terminer`, { depotRestitue, motifRetenue });
  }

  /** Propriétaire : retire la réservation avant la signature du bail. */
  annuler(id: number): Observable<Location> {
    return this.http.post<Location>(`${this.api}/locations/${id}/annuler`, null);
  }
}
