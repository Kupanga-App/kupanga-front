import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, switchMap, filter, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { AuthResponse } from '../models/auth-response.model';

/**
 * Routes publiques : jamais de jeton (un jeton périmé resté dans le stockage ferait répondre 401 à l'API),
 * et un 401 n'y signifie pas « session expirée » (ni refresh, ni déconnexion).
 */
const ROUTES_PUBLIQUES = [
  '/auth/login', '/auth/google', '/auth/register', '/auth/forgot-password', '/auth/reset-password',
  '/auth/verifier-email', '/auth/renvoyer-verification',
  '/contrats/signer/', '/etats-des-lieux/signer/',
  '/juridictions', // J6 : configuration publique du formulaire de bien
];

let isRefreshing = false;
let refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const authService = inject(AuthService);

  if (req.url.includes('/auth/refresh')) {
    return next(req.clone({ withCredentials: true }));
  }

  if (ROUTES_PUBLIQUES.some(route => req.url.includes(route))) {
    // login et google posent le cookie de refresh
    const avecCookie = req.url.includes('/auth/login') || req.url.includes('/auth/google');
    return next(avecCookie ? req.clone({ withCredentials: true }) : req);
  }

  const accessToken = authService.getAccessToken();
  if (accessToken) {
    req = addTokenToRequest(req, accessToken);
  }

  if (req.url.includes('/auth/logout')) {
    return next(req.clone({ withCredentials: true }));
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        return handle401Error(req, next, authService);
      }
      return throwError(() => error);
    })
  );
};

function addTokenToRequest(request: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });
}

function handle401Error(
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authService: AuthService
): Observable<HttpEvent<unknown>> {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    return authService.refreshToken().pipe(
      switchMap((authResponse: AuthResponse) => {
        isRefreshing = false;
        refreshTokenSubject.next(authResponse.accessToken);
        return next(addTokenToRequest(request, authResponse.accessToken));
      }),
      catchError((err) => {
        isRefreshing = false;
        refreshTokenSubject.error(err);
        refreshTokenSubject = new BehaviorSubject<string | null>(null);
        authService.clearClientState();
        return throwError(() => err);
      })
    );
  } else {
    return refreshTokenSubject.pipe(
      filter((token): token is string => token !== null),
      take(1),
      switchMap(token => next(addTokenToRequest(request, token))),
      catchError(err => {
        authService.clearClientState();
        return throwError(() => err);
      })
    );
  }
}
