import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../shared/components/icon/icon.component';

/**
 * Mise en page des écrans de connexion et d'inscription : une colonne (logo, titre court, contenu).
 * `retour` affiche un chevron (vers les annonces par défaut).
 */
@Component({
  selector: 'kp-auth-layout',
  standalone: true,
  imports: [RouterLink, IconComponent],
  template: `
    <div class="haut">
      @if (retour(); as url) {
        <a class="kp-icon-btn" [routerLink]="url" aria-label="Retour"><kp-icon name="chevron-left" [size]="24" /></a>
      }
      <a routerLink="/explorer" class="logo" aria-label="Kupanga, voir les annonces">
        <span class="logo__k" aria-hidden="true">K</span>
        <span class="logo__nom">Kupanga</span>
      </a>
    </div>
    <main class="carte">
      <h1>{{ titre() }}</h1>
      @if (sousTitre()) {
        <p class="sous-titre">{{ sousTitre() }}</p>
      }
      <div class="contenu"><ng-content /></div>
    </main>
    <footer class="pied"><ng-content select="[pied]" /></footer>
  `,
  styles: [`
    :host {
      display: flex; flex-direction: column; align-items: center; min-height: 100dvh;
      padding: var(--kp-safe-top) 16px calc(24px + var(--kp-safe-bottom));
    }
    .haut { display: flex; align-items: center; gap: 4px; width: 100%; max-width: 440px; min-height: 64px; }
    .logo { display: inline-flex; align-items: center; gap: 10px; margin-left: 4px; color: var(--kp-text-1); text-decoration: none; }
    .logo__k {
      display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px;
      border-radius: 10px; background: var(--kp-nav-bg); color: #effbdb; font-family: var(--kp-font-display); font-size: 22px;
    }
    .logo__nom { font-family: var(--kp-font-display); font-size: var(--kp-fs-lg); }
    .carte { width: 100%; max-width: 440px; padding-top: 16px; }
    .sous-titre { margin-top: 8px; color: var(--kp-text-3); }
    .contenu { margin-top: 24px; }
    .pied { width: 100%; max-width: 440px; margin-top: 24px; text-align: center; color: var(--kp-text-3); }
    .pied:empty { display: none; }
    @media (min-width: 768px) {
      :host { justify-content: center; }
      .carte {
        padding: 32px; border: 1px solid var(--kp-border); border-radius: var(--kp-radius-lg); background: var(--kp-surface);
      }
    }
  `],
})
export class AuthLayoutComponent {
  readonly titre = input.required<string>();
  readonly sousTitre = input<string | null>(null);
  readonly retour = input<string | null>(null);
}
