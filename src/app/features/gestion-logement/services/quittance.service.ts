import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { QuittanceCreateDTO, QuittanceDTO, QuittancePageDTO, QuittanceSearchDTO } from '../models/quittance.model';

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

  marquerPayee(id: number, signatureBase64: string): Observable<QuittanceDTO> {
    return this.http.post<QuittanceDTO>(
      `${this.apiUrl}/${id}/marquer-payee`,
      { signatureBase64 }
    );
  }
}
