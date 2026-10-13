import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, finalize, switchMap, of, map } from 'rxjs';
import { Router } from '@angular/router';
import { AuthResponse } from '../models/auth-response.model';
import { User } from '../models/user.model';
import { environment } from '../../../../environments/environment';
import { LogementContextService } from '../../services/logement-context.service';
import { viderDonneesHorsLigne } from '../../pwa/hors-ligne.service';
import { normaliserTelephone } from '../../telephone/telephone';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private logementContext = inject(LogementContextService);
  private apiUrl = `${environment.apiUrl}/auth`;

  currentUser = signal<User | null>(null);

  constructor() {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const raw = JSON.parse(storedUser);
      this.currentUser.set(this.normalizeUser(raw));
    }
  }

  login(credentials: { email: string; password: string }): Observable<User> {
    // R2 : données hors ligne d'un compte précédent effacées avant toute nouvelle connexion
    void viderDonneesHorsLigne();
    this.logementContext.clear();
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => this.handleAuthSuccess(response)),
      switchMap(() => this.fetchCurrentUser())
    );
  }

  loginWithGoogle(idToken: string): Observable<AuthResponse> {
    // R2 : données hors ligne d'un compte précédent effacées avant toute nouvelle connexion
    void viderDonneesHorsLigne();
    this.logementContext.clear();
    return this.http.post<AuthResponse>(`${this.apiUrl}/google`, { idToken }, { withCredentials: true }).pipe(
      tap(response => {
        localStorage.setItem('accessToken', response.accessToken);
      })
    );
  }

  completeGoogleProfile(role: 'ROLE_PROPRIETAIRE' | 'ROLE_LOCATAIRE'): Observable<User> {
    return this.http.patch<AuthResponse>(
      `${this.apiUrl}/complete-profile`,
      { role },
      { withCredentials: true }
    ).pipe(
      tap(response => this.handleAuthSuccess(response)),
      switchMap(() => this.fetchCurrentUser())
    );
  }

  loadCurrentUser(): Observable<User> {
    return this.fetchCurrentUser();
  }

  /**
   * Connexion avec le jeton Google : `null` si le compte doit encore choisir son rôle (nouveau compte,
   * ou compte non confirmé repris, A14), sinon l'utilisateur connecté.
   */
  connecterAvecGoogle(idToken: string): Observable<User | null> {
    return this.loginWithGoogle(idToken).pipe(
      switchMap(reponse => (reponse.requiresRoleSelection ? of(null) : this.fetchCurrentUser())),
    );
  }

  /**
   * Inscription (A14) : l'API répond 201 avec un message, sans jeton ni cookie. Le compte ne peut se connecter
   * qu'après avoir ouvert le lien de confirmation reçu par e-mail. Même réponse si l'adresse est déjà inscrite.
   */
  register(userData: { firstName: string; lastName: string; email: string; password: string; role: string; telephone?: string | null }, profilePictureFile?: File): Observable<string> {
    const formData = new FormData();

    const userFormDTO = {
      firstName: userData.firstName,
      lastName: userData.lastName,
      mail: userData.email,
      password: userData.password,
      role: userData.role,
      // B5 : l'API n'accepte qu'une adresse de son propre stockage ; la photo part en fichier
      urlAvatar: null,
      // C6 : facultatif, envoyé au format international (l'API le revérifie)
      telephone: normaliserTelephone(userData.telephone),
    };

    formData.append('userFormDTO', new Blob([JSON.stringify(userFormDTO)], {
      type: 'application/json'
    }));

    if (profilePictureFile) {
      formData.append('imageProfil', profilePictureFile);
    }

    return this.http.post(`${this.apiUrl}/register`, formData, { responseType: 'text' });
  }

  /** A14 : confirme l'adresse e-mail avec le jeton du lien (400 si invalide ou expiré). */
  verifierEmail(token: string): Observable<string> {
    return this.http.post(`${this.apiUrl}/verifier-email`, { token }, { responseType: 'text' });
  }

  /** A14 : renvoie un lien de confirmation (réponse identique que le compte existe ou non ; 429 possible). */
  renvoyerVerification(email: string): Observable<string> {
    return this.http.post(`${this.apiUrl}/renvoyer-verification`, { email }, { responseType: 'text' });
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

  // P0-2 : e-mail et jeton dans le corps JSON (jamais dans l'URL : journaux, historique, Referer)
  forgotPassword(email: string): Observable<string> {
    return this.http.post(`${this.apiUrl}/forgot-password`, { email }, { responseType: 'text' });
  }

  resetPassword(token: string, newPassword: string): Observable<string> {
    return this.http.post(`${this.apiUrl}/reset-password`, { token, newPassword }, { responseType: 'text' });
  }

  private handleAuthSuccess(response: AuthResponse): void {
    localStorage.setItem('accessToken', response.accessToken);
  }

  private fetchCurrentUser(): Observable<User> {
    return this.http.get<any>(`${this.apiUrl}/me`).pipe(
      map(raw => this.normalizeUser(raw)),
      tap(user => {
        this.currentUser.set(user);
        localStorage.setItem('user', JSON.stringify(user));
      })
    );
  }

  private normalizeUser(raw: any): User {
    return {
      id: raw.id,
      email: raw.email ?? raw.mail ?? '',
      firstName: raw.firstName,
      lastName: raw.lastName,
      role: raw.role,
      urlProfile: raw.urlProfile,
      telephone: raw.telephone ?? null,
    };
  }

  /**
   * C6 : enregistre (ou efface avec `null`) le numéro de contact du compte connecté.
   * L'API répond 400 si le numéro n'est pas au format international.
   */
  modifierTelephone(telephone: string | null): Observable<User> {
    return this.http.patch<any>(`${environment.apiUrl}/users/me/telephone`, { telephone }).pipe(
      map(raw => {
        const courant = this.currentUser();
        const user: User = courant
          ? { ...courant, telephone: raw?.telephone ?? null }
          : this.normalizeUser(raw);
        this.currentUser.set(user);
        localStorage.setItem('user', JSON.stringify(user));
        return user;
      })
    );
  }

  clearClientState(): void {
    // R2 : aucune donnée de ce compte ne reste disponible hors ligne sur l'appareil
    void viderDonneesHorsLigne();
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    this.currentUser.set(null);
    this.logementContext.clear();
    this.router.navigate(['/']);
  }
}
