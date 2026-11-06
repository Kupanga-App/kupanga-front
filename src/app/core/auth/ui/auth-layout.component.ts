import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { LIENS_LEGAUX } from '../../legal/liens-legaux';
import { LogoComponent } from '../../../shared/ui/logo.component';

/**
 * Mise en page des écrans de connexion et d'inscription : une colonne (logo, titre court, contenu).
 * `retour` affiche un chevron (vers les annonces par défaut).
 */
@Component({
  selector: 'kp-auth-layout',
  standalone: true,
  imports: [RouterLink, IconComponent, LogoComponent],
  template: `
    <div class="haut">
      @if (retour(); as url) {
        <a class="kp-icon-btn" [routerLink]="url" aria-label="Retour"><kp-icon name="chevron-left" [size]="24" /></a>
      }
      <a routerLink="/explorer" class="logo" aria-label="Kupanga, voir les annonces">
        <kp-logo [hauteur]="28" aria-hidden="true" />
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
    <nav class="legal" aria-label="Informations légales">
      <a [routerLink]="liens.confidentialite" target="_blank">Confidentialité</a>
      <span aria-hidden="true">·</span>
      <a [routerLink]="liens.conditions" target="_blank">Conditions d'utilisation</a>
    </nav>
  `,
  styles: [`
    :host {
      display: flex; flex-direction: column; align-items: center; min-height: 100dvh;
      padding: var(--kp-safe-top) 16px calc(24px + var(--kp-safe-bottom));
    }
    .haut { display: flex; align-items: center; gap: 4px; width: 100%; max-width: 440px; min-height: 64px; }
    .logo {
      display: inline-flex; align-items: center; min-height: var(--kp-tap); margin-left: 4px; padding: 0 4px;
      border-radius: var(--kp-radius-sm); text-decoration: none;
    }
    .carte { width: 100%; max-width: 440px; padding-top: 16px; }
    .sous-titre { margin-top: 8px; color: var(--kp-text-muted); }
    .contenu { margin-top: 24px; }
    .pied { width: 100%; max-width: 440px; margin-top: 24px; text-align: center; color: var(--kp-text-3); }
    .pied:empty { display: none; }
    .legal {
      display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-top: auto; padding-top: 24px;
      font-size: var(--kp-fs-sm); color: var(--kp-text-3);
    }
    .legal a { color: inherit; }
    @media (min-width: 768px) {
      :host { justify-content: center; }
      .carte {
        padding: 32px; border-radius: var(--kp-radius-lg); background: var(--kp-surface); box-shadow: var(--kp-elev-0);
      }
    }
  `],
})
export class AuthLayoutComponent {
  readonly titre = input.required<string>();
  readonly sousTitre = input<string | null>(null);
  readonly retour = input<string | null>(null);
  protected readonly liens = LIENS_LEGAUX;
}
