import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import {
  EtatDesLieuxDTO,
  EtatDesLieuxFormDTO,
  EdlPageDTO,
  EdlSearchDTO,
} from '../models/edl.model';

@Injectable({ providedIn: 'root' })
export class EdlService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/etats-des-lieux`;

  search(dto: EdlSearchDTO): Observable<EdlPageDTO> {
    return this.http.post<EdlPageDTO>(`${this.apiUrl}/search`, dto);
  }

  getByBien(bienId: number): Observable<EtatDesLieuxDTO[]> {
    return this.search({ bienId, size: 50 }).pipe(map((p) => p.contenu));
  }

  create(dto: EtatDesLieuxFormDTO): Observable<void> {
    return this.http.post<void>(this.apiUrl, dto);
  }

  signerProprietaire(id: number, signatureBase64: string): Observable<void> {
    return this.http.post<void>(
      `${this.apiUrl}/${id}/signer-proprietaire`,
      { signatureBase64 }
    );
  }

  getByToken(token: string): Observable<EtatDesLieuxDTO> {
    return this.http.get<EtatDesLieuxDTO>(`${this.apiUrl}/signer/${token}`);
  }

  signerByToken(token: string, signatureBase64: string): Observable<void> {
    return this.http.post<void>(
      `${this.apiUrl}/signer/${token}`,
      { signatureBase64 }
    );
  }
}
