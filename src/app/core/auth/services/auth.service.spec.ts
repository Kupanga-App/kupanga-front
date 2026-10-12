import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from './auth.service';
import { authInterceptor } from '../interceptors/auth.interceptor';
import { environment } from '../../../../environments/environment';

describe('AuthService — contrat d’API (P0-2, A14)', () => {
  let service: AuthService;
  let http: HttpTestingController;
  const api = `${environment.apiUrl}/auth`;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('P0-2 : mot de passe oublié envoie l’e-mail dans le corps JSON, jamais dans l’URL', () => {
    service.forgotPassword('a@b.fr').subscribe();
    const req = http.expectOne(`${api}/forgot-password`);
    expect(req.request.body).toEqual({ email: 'a@b.fr' });
    expect(req.request.params.keys()).toEqual([]);
    req.flush('ok');
  });

  it('P0-2 : réinitialisation envoie jeton et mot de passe dans le corps JSON', () => {
    service.resetPassword('jeton', 'Secret123').subscribe();
    const req = http.expectOne(`${api}/reset-password`);
    expect(req.request.body).toEqual({ token: 'jeton', newPassword: 'Secret123' });
    expect(req.request.urlWithParams).not.toContain('Secret123');
    req.flush('ok');
  });

  it('A14 : l’inscription ne connecte pas (aucun jeton enregistré, pas d’appel à /me)', () => {
    let reponse = '';
    service.register({ email: 'a@b.fr', password: 'Secret123', firstName: 'A', lastName: 'B', role: 'ROLE_LOCATAIRE' })
      .subscribe(r => (reponse = r));
    const req = http.expectOne(`${api}/register`);
    req.flush('Compte créé. Un lien de confirmation vient d’être envoyé', { status: 201, statusText: 'Created' });
    expect(reponse).toContain('Compte créé');
    expect(localStorage.getItem('accessToken')).toBeNull();
    http.expectNone(`${api}/me`);
  });

  it('A14 : confirmation et renvoi du lien en JSON', () => {
    service.verifierEmail('jeton').subscribe();
    expect(http.expectOne(`${api}/verifier-email`).request.body).toEqual({ token: 'jeton' });
    service.renvoyerVerification('a@b.fr').subscribe();
    expect(http.expectOne(`${api}/renvoyer-verification`).request.body).toEqual({ email: 'a@b.fr' });
    http.match(() => true).forEach(r => r.flush('ok'));
  });

  it('aucun jeton (même périmé) n’est envoyé aux routes publiques d’authentification et de signature', () => {
    localStorage.setItem('accessToken', 'perime');
    const client = TestBed.inject(HttpClient);
    const routes = [
      `${api}/login`, `${api}/forgot-password`, `${api}/reset-password`, `${api}/verifier-email`,
      `${environment.apiUrl}/contrats/signer/abc`, `${environment.apiUrl}/etats-des-lieux/signer/abc`,
    ];
    routes.forEach(url => client.post(url, {}).subscribe({ error: () => {} }));
    routes.forEach(url => {
      const req = http.expectOne(url);
      expect(req.request.headers.has('Authorization')).withContext(url).toBeFalse();
      req.flush({});
    });
  });

  it('une route protégée reçoit bien le jeton', () => {
    localStorage.setItem('accessToken', 'valide');
    TestBed.inject(HttpClient).get(`${environment.apiUrl}/users/biens`).subscribe();
    const req = http.expectOne(`${environment.apiUrl}/users/biens`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer valide');
    req.flush([]);
  });

  it('un 401 sur une route publique ne déclenche ni refresh ni déconnexion', () => {
    localStorage.setItem('accessToken', 'ancien');
    let statut = 0;
    TestBed.inject(HttpClient).post(`${api}/verifier-email`, { token: 'x' }).subscribe({
      error: e => (statut = e.status),
    });
    http.expectOne(`${api}/verifier-email`).flush({}, { status: 401, statusText: 'Unauthorized' });
    http.expectNone(`${api}/refresh`);
    expect(statut).toBe(401);
    expect(localStorage.getItem('accessToken')).toBe('ancien');
  });

  it('C6 : l’inscription envoie le téléphone au format international (null si vide)', async () => {
    service.register({ email: 'a@b.fr', password: 'Secret123', firstName: 'A', lastName: 'B',
      role: 'ROLE_LOCATAIRE', telephone: '+243 81 234 56 78' }).subscribe();
    const req = http.expectOne(`${api}/register`);
    const dto = JSON.parse(await ((req.request.body as FormData).get('userFormDTO') as Blob).text());
    expect(dto.telephone).toBe('+243812345678');
    req.flush('ok', { status: 201, statusText: 'Created' });

    service.register({ email: 'b@b.fr', password: 'Secret123', firstName: 'A', lastName: 'B',
      role: 'ROLE_LOCATAIRE', telephone: '' }).subscribe();
    const req2 = http.expectOne(`${api}/register`);
    expect(JSON.parse(await ((req2.request.body as FormData).get('userFormDTO') as Blob).text()).telephone).toBeNull();
    req2.flush('ok', { status: 201, statusText: 'Created' });
  });

  it('C6 : modifierTelephone appelle PATCH /users/me/telephone et met à jour le compte connecté', () => {
    service.currentUser.set({ id: 3, email: 'a@b.fr', firstName: 'A', lastName: 'B', role: 'ROLE_LOCATAIRE' });

    let telephone: string | null | undefined;
    service.modifierTelephone('+243812345678').subscribe(u => (telephone = u.telephone));
    const req = http.expectOne(`${environment.apiUrl}/users/me/telephone`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ telephone: '+243812345678' });
    req.flush({ id: 3, mail: 'a@b.fr', telephone: '+243812345678' });

    expect(telephone).toBe('+243812345678');
    expect(service.currentUser()?.telephone).toBe('+243812345678');
    expect(JSON.parse(localStorage.getItem('user')!).telephone).toBe('+243812345678');
  });
});
