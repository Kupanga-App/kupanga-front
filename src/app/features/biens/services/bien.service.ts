import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { BienCreateRequest, BienDTO, BienFormDTO, BienPageDTO, BienSearchDTO, LocatairePageDTO, LocataireSearchDTO, UserDTO } from '../models/bien.model';

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

  /**
   * Vue publique d'une annonce (P0-6) : sans locataire ni documents ; propriétaire réduit au prénom,
   * à l'initiale du nom et à la photo. 404 si le bien est archivé (B12).
   */
  getPublic(id: number): Observable<BienDTO> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map(bien => ({
        ...bien,
        proprietaire: {
          firstName: bien.proprietaire?.firstName ?? '',
          lastName: bien.proprietaire?.initialeNom ? `${bien.proprietaire.initialeNom}.` : '',
          urlProfile: bien.proprietaire?.urlProfile,
        } as UserDTO,
        contrats: null,
        quittances: null,
        documents: null,
      }) as BienDTO)
    );
  }

  /** Vue privée (propriétaire ou locataire du bien) : parties avec e-mail, documents, statut d'archivage. 403 sinon. */
  getPrive(id: number): Observable<BienDTO> {
    return this.http.get<BienDTO>(`${environment.apiUrl}/users/biens/${id}`);
  }

  update(id: number, dto: Partial<BienFormDTO>): Observable<BienDTO> {
    return this.http.patch<BienDTO>(`${this.apiUrl}/${id}`, dto);
  }

  getMesBiens(): Observable<BienDTO[]> {
    return this.http.get<BienDTO[]>(`${environment.apiUrl}/users/biens`);
  }

  rechercheLocataire(bienId: number, dto: LocataireSearchDTO): Observable<LocatairePageDTO> {
    return this.http.post<LocatairePageDTO>(
      `${environment.apiUrl}/users/${bienId}/recherche-locataire`,
      dto
    );
  }

  assignerLocataire(bienId: number, userId: number): Observable<void> {
    return this.http.post<void>(
      `${this.apiUrl}/${bienId}/assigne-locataire/${userId}`,
      {}
    );
  }
}
