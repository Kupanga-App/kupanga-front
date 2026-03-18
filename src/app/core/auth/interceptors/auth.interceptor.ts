import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, switchMap, filter, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { AuthResponse } from '../models/auth-response.model';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const authService = inject(AuthService);

  // /auth/refresh exclu complètement : évite la boucle infinie si le refresh
  // retourne 401 (l'intercepteur ne doit pas tenter un re-refresh).
  if (req.url.includes('/auth/refresh')) {
    return next(req);
  }

  const accessToken = authService.getAccessToken();
  if (accessToken && !req.url.endsWith('/register')) {
    req = addTokenToRequest(req, accessToken);
  }

  // /auth/login et /auth/logout exclus du retry 401 :
  // le token est bien attaché ci-dessus si présent, mais
  // une réponse 401 sur ces routes ne doit pas déclencher un refresh.
  if (req.url.includes('/auth/login') || req.url.includes('/auth/logout')) {
    return next(req);
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
      catchError((err: HttpErrorResponse) => {
        isRefreshing = false;
        // Refresh échoué : nettoyer l'état local sans appel HTTP supplémentaire
        authService.clearClientState();
        return throwError(() => err);
      })
    );
  } else {
    // Refresh déjà en cours : attendre le nouveau token
    return refreshTokenSubject.pipe(
      filter((token): token is string => token !== null),
      take(1),
      switchMap(token => next(addTokenToRequest(request, token)))
    );
  }
}
