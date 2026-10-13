import { ApplicationConfig, LOCALE_ID, isDevMode, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling, withRouterConfig, withViewTransitions } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth/interceptors/auth.interceptor';
import { compteCacheInterceptor } from './core/pwa/compte-cache.interceptor';

registerLocaleData(localeFr);

/** Transition de pile (glissement) entre deux écrans, sauf si l'utilisateur réduit les animations. */
function transitionAutorisee(): boolean {
  return typeof window !== 'undefined' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes,
      withRouterConfig({ paramsInheritanceStrategy: 'always' }),
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
      withViewTransitions({ skipInitialTransition: true, onViewTransitionCreated: ({ transition }) => {
        if (!transitionAutorisee()) transition.skipTransition();
      } }),
    ),
    // R2 : compteCacheInterceptor d'abord (la requête rejouée après un refresh garde la clé du compte)
    provideHttpClient(withInterceptors([compteCacheInterceptor, authInterceptor])),
    { provide: LOCALE_ID, useValue: 'fr-FR' },
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
