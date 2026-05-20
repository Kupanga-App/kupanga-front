import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import {
  ContratDTO,
  ContratFormDTO,
  ContratPageDTO,
  ContratSearchDTO,
} from '../models/contrat.model';

@Injectable({ providedIn: 'root' })
export class ContratService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/contrats`;

  search(dto: ContratSearchDTO): Observable<ContratPageDTO> {
    return this.http.post<ContratPageDTO>(`${this.apiUrl}/search`, dto);
  }

  getByBien(bienId: number): Observable<ContratDTO[]> {
    return this.search({ bienId, size: 50 }).pipe(map((p) => p.contenu));
  }

  create(dto: ContratFormDTO): Observable<void> {
    return this.http.post<void>(this.apiUrl, dto);
  }

  signerProprio(id: number, signatureBase64: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/signer-proprio`, { signatureBase64 });
  }

  getByToken(token: string): Observable<ContratDTO> {
    return this.http.get<ContratDTO>(`${this.apiUrl}/signer/${token}`);
  }

  signerByToken(token: string, signatureBase64: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/signer/${token}`, { signatureBase64 });
  }
}
