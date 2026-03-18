import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { BienCreateRequest, BienDTO, BienPageDTO, BienSearchDTO } from '../models/bien.model';

@Injectable({ providedIn: 'root' })
export class BienService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/biens`;

  create(request: BienCreateRequest): Observable<void> {
    const formData = new FormData();
    formData.append(
      'bienFormDTO',
      new Blob([JSON.stringify(request.bienFormDTO)], { type: 'application/json' })
    );
    request.files.forEach(file => formData.append('files', file));
    return this.http.post<void>(this.apiUrl, formData);
  }

  search(dto: BienSearchDTO): Observable<BienPageDTO> {
    return this.http.post<BienPageDTO>(`${this.apiUrl}/search`, dto);
  }

  getById(id: number): Observable<BienDTO> {
    return this.http.get<BienDTO>(`${this.apiUrl}/${id}`);
  }
}
