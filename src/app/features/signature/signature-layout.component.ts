import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { LogoComponent } from '../../shared/ui/logo.component';
import { LIENS_LEGAUX } from '../../core/legal/liens-legaux';

/**
 * Gabarit des pages publiques de signature (`/contrats/signer/:token`, `/edl/signer/:token`, maquettes `Signer-*`) :
 * barre blanche avec le logo et « Lien personnel, sans compte » (cadenas), puis le contenu.
 * Avec `titre`, le contenu est une carte centrée (chargement, confirmation) ; sans titre, la page est libre
 * (aperçu et carte de signature). Aucun guard : la page fonctionne sans compte.
 */
@Component({
  selector: 'kp-signature-layout',
  standalone: true,
  imports: [RouterLink, IconComponent, LogoComponent],
  template: `
    <header class="barre">
      <div class="barre__ligne">
        <a routerLink="/explorer" class="logo" aria-label="Kupanga, voir les annonces">
          <kp-logo [hauteur]="28" aria-hidden="true" />
        </a>
        <span class="cadenas">
          <kp-icon name="lock" [size]="16" [strokeWidth]="1.5" />
          <span class="cadenas__texte">Lien personnel, sans compte</span>
        </span>
      </div>
      @if (contexte()) {
        <p class="barre__contexte">{{ contexte() }}</p>
      }
    </header>

    <main class="page" [class.page--carte]="!!titre()">
      @if (titre()) {
        <div class="carte">
          <ng-content select="[illustration]" />
          <h1>{{ titre() }}</h1>
          @if (sousTitre()) {
            <p class="sous-titre">{{ sousTitre() }}</p>
          }
          <div class="contenu"><ng-content /></div>
        </div>
      } @else {
        <ng-content select="[page]" />
      }
    </main>

    <nav class="legal" aria-label="Informations légales">
      <a [routerLink]="liens.confidentialite" target="_blank">Confidentialité</a>
      <span aria-hidden="true">·</span>
      <a [routerLink]="liens.conditions" target="_blank">Conditions d'utilisation</a>
    </nav>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; min-height: 100dvh; background: var(--kp-bg); }
    .barre {
      position: sticky; top: 0; z-index: 50;
      padding: var(--kp-safe-top) calc(16px + var(--kp-safe-right)) 0 calc(16px + var(--kp-safe-left));
      background: var(--kp-surface); border-bottom: 1px solid var(--kp-border);
    }
    .barre__ligne {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      max-width: 1200px; min-height: 64px; margin: 0 auto;
    }
    .logo {
      display: inline-flex; align-items: center; min-height: var(--kp-tap); padding: 0 4px; margin-left: -4px;
      border-radius: var(--kp-radius-sm); text-decoration: none;
    }
    .cadenas { display: inline-flex; align-items: center; gap: 8px; color: var(--kp-text-muted); font-size: var(--kp-fs-secondary); }
    .barre__contexte { max-width: 1200px; margin: -12px auto 0; padding-bottom: 12px; color: var(--kp-text-muted); font-size: var(--kp-fs-secondary); }

    .page { flex: 1; width: 100%; max-width: 1232px; margin: 0 auto; padding: 24px 16px 32px; }
    .page--carte { display: flex; align-items: flex-start; justify-content: center; }
    .carte {
      display: flex; flex-direction: column; align-items: center; gap: 8px; width: 100%; max-width: 560px;
      padding: 32px 24px; border-radius: var(--kp-radius-lg); background: var(--kp-surface); box-shadow: var(--kp-elev-0);
      text-align: center;
    }
    h1 { font-size: var(--kp-fs-subtitle); font-weight: 500; }
    .sous-titre { color: var(--kp-text-muted); }
    .contenu { width: 100%; margin-top: 16px; text-align: left; }

    .legal {
      display: flex; flex-wrap: wrap; justify-content: center; gap: 8px;
      padding: 16px 16px calc(16px + var(--kp-safe-bottom)); font-size: var(--kp-fs-secondary); color: var(--kp-text-subtle);
    }
    .legal a { color: inherit; }

    @media (max-width: 767px) {
      .cadenas__texte { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
      .page { padding: 12px 12px 24px; }
      .page--carte { padding-top: 24px; }
    }
    @media (min-width: 768px) {
      .barre__contexte { display: none; }
      .page--carte { padding-top: 48px; }
    }
  `],
})
export class SignatureLayoutComponent {
  /** Carte centrée : titre (chargement, confirmation, lien invalide). Sans titre : page libre (`<… page>`). */
  readonly titre = input<string | null>(null);
  readonly sousTitre = input<string | null>(null);
  /** Ligne sous la barre, sur téléphone (« Bail à signer · envoyé par Claire M. »). */
  readonly contexte = input<string | null>(null);
  protected readonly liens = LIENS_LEGAUX;
}
