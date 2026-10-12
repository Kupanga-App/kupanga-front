import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { MarquerPayeeDTO, QuittanceCreateDTO, QuittanceDTO, QuittancePageDTO, QuittanceSearchDTO } from '../models/quittance.model';

@Injectable({ providedIn: 'root' })
export class QuittanceService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/quittances`;

  getByBien(bienId: number): Observable<QuittanceDTO[]> {
    return this.http.get<QuittanceDTO[]>(`${this.apiUrl}/bien/${bienId}`);
  }

  getMesQuittances(): Observable<QuittanceDTO[]> {
    return this.http.get<QuittanceDTO[]>(`${this.apiUrl}/mes-quittances`);
  }

  search(dto: QuittanceSearchDTO): Observable<QuittancePageDTO> {
    return this.http.post<QuittancePageDTO>(`${this.apiUrl}/search`, dto);
  }

  create(dto: QuittanceCreateDTO): Observable<QuittanceDTO> {
    return this.http.post<QuittanceDTO>(this.apiUrl, dto);
  }

  /** C8-bis : 204 sans corps (recharger la quittance ensuite). */
  marquerPayee(id: number, dto: MarquerPayeeDTO): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/marquer-payee`, dto);
  }

  /** C8-bis : joint ou remplace la photo du reçu (quittance payée). */
  ajouterRecu(id: number, photo: File): Observable<QuittanceDTO> {
    const form = new FormData();
    form.append('recu', photo);
    return this.http.post<QuittanceDTO>(`${this.apiUrl}/${id}/recu`, form);
  }
}
