import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, finalize, switchMap, of } from 'rxjs';
import { Router } from '@angular/router';
import { AuthResponse } from '../models/auth-response.model';
import { User } from '../models/user.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = `${environment.apiUrl}/auth`;

  currentUser = signal<User | null>(null);

  // Liste statique des avatars disponibles dans les assets
  private readonly LOCAL_AVATARS = [
    'assets/avatars_profil/Femme1.jpg',
    'assets/avatars_profil/femme2.jpg',
    'assets/avatars_profil/femme3.jpg',
    'assets/avatars_profil/femme4.jpg',
    'assets/avatars_profil/femme5.jpg',
    'assets/avatars_profil/femme6.jpg',
    'assets/avatars_profil/femme8.jpg',
    'assets/avatars_profil/femme9.jpg',
    'assets/avatars_profil/femme10.jpg',
    'assets/avatars_profil/homme30.jpg',
    'assets/avatars_profil/homme31.jpg',
    'assets/avatars_profil/imageH4.jpg',
    'assets/avatars_profil/imageJeuneHomme1.jpg',
    'assets/avatars_profil/imageJeuneHomme2.jpg',
    'assets/avatars_profil/imageJeuneHomme3.jpg',
    'assets/avatars_profil/avatar_homme_grand1.avif',
    'assets/avatars_profil/avatar_homme_grand2.avif',
    'assets/avatars_profil/avatar_homme_grand3.avif'
  ];

  constructor() {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      this.currentUser.set(JSON.parse(storedUser));
    }
  }

  login(credentials: any): Observable<User> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => this.handleAuthSuccess(response)),
      switchMap(() => this.fetchCurrentUser())
    );
  }

  register(userData: any, profilePictureFile?: File): Observable<User> {
    const formData = new FormData();

    // Construction de l'objet UserFormDTO
    const userFormDTO = {
      firstName: userData.firstName,
      lastName: userData.lastName,
      mail: userData.email, // Attention: le backend attend 'mail' mais le form utilise 'email'
      password: userData.password,
      role: userData.role,
      urlAvatar: userData.avatar || null // null si pas d'avatar sélectionné (cas upload ou rien)
    };

    // Ajout du JSON sous forme de Blob/String
    formData.append('userFormDTO', new Blob([JSON.stringify(userFormDTO)], {
      type: 'application/json'
    }));

    // Ajout du fichier image si présent
    if (profilePictureFile) {
      formData.append('imageProfil', profilePictureFile);
    }

    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, formData).pipe(
      tap(response => this.handleAuthSuccess(response)),
      switchMap(() => this.fetchCurrentUser())
    );
  }

  // Retourne la liste des avatars locaux
  getAvatars(): Observable<string[]> {
    return of(this.LOCAL_AVATARS);
  }

  refreshToken(): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/refresh`, {}, { withCredentials: true }).pipe(
      tap(response => {
        localStorage.setItem('accessToken', response.accessToken);
      })
    );
  }

  logout(): Observable<any> {
    return this.http.post(`${this.apiUrl}/logout`, {}, { withCredentials: true }).pipe(
      finalize(() => {
        this.clearClientState();
      })
    );
  }

  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  forgotPassword(email: string): Observable<string> {
    return this.http.post(`${this.apiUrl}/forgot-password`, null, {
      params: { email },
      responseType: 'text'
    });
  }

  resetPassword(token: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/reset-password`, null, {
      params: {
        token: token,
        newPassword: newPassword
      },
      responseType: 'text' // Ajout de responseType: 'text' car le backend renvoie probablement une chaîne simple
    });
  }

  private handleAuthSuccess(response: AuthResponse): void {
    localStorage.setItem('accessToken', response.accessToken);
  }

  private fetchCurrentUser(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/me`).pipe(
      tap(user => {
        this.currentUser.set(user);
        localStorage.setItem('user', JSON.stringify(user));
      })
    );
  }

  private clearClientState(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    this.currentUser.set(null);
    this.router.navigate(['/auth/login']);
  }
}
