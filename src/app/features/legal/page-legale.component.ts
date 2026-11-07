import { ChangeDetectionStrategy, Component, ViewEncapsulation, inject, input } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { DATE_MISE_A_JOUR_LEGALE, LIENS_LEGAUX } from '../../core/legal/liens-legaux';
import { LogoComponent } from '../../shared/ui/logo.component';

/**
 * Mise en page commune des pages légales (publiques, sans compte) : logo, retour, texte en colonne de lecture,
 * lien vers l'autre page. Styles non encapsulés mais limités à `.kp-legal` (le texte est projeté).
 */
@Component({
  selector: 'kp-page-legale',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IconComponent, LogoComponent],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="kp-legal">
      <header class="kp-legal__haut">
        <button type="button" class="kp-icon-btn" (click)="retour()" aria-label="Retour">
          <kp-icon name="chevron-left" [size]="24" />
        </button>
        <a routerLink="/" class="kp-legal__logo" aria-label="Kupanga, accueil">
          <kp-logo [hauteur]="28" aria-hidden="true" />
        </a>
      </header>

      <main class="kp-legal__texte">
        <h1>{{ titre() }}</h1>
        <p class="kp-legal__date">Dernière mise à jour : {{ date }}</p>
        <ng-content />
      </main>

      <nav class="kp-legal__pied" aria-label="Informations légales">
        <a [routerLink]="liens.confidentialite" routerLinkActive="actif" ariaCurrentWhenActive="page">Confidentialité</a>
        <span aria-hidden="true">·</span>
        <a [routerLink]="liens.conditions" routerLinkActive="actif" ariaCurrentWhenActive="page">Conditions d'utilisation</a>
      </nav>
    </div>
  `,
  styles: [`
    .kp-legal {
      min-height: 100dvh; background: var(--kp-bg); color: var(--kp-text);
      padding: var(--kp-safe-top) 16px calc(32px + var(--kp-safe-bottom));
    }
    .kp-legal__haut { display: flex; align-items: center; gap: 4px; max-width: 720px; margin: 0 auto; min-height: 64px; }
    .kp-legal__logo {
      display: inline-flex; align-items: center; min-height: var(--kp-tap); margin-left: 4px; padding: 0 4px;
      border-radius: var(--kp-radius-sm); text-decoration: none;
    }
    .kp-legal__texte { max-width: 720px; margin: 16px auto 0; line-height: 1.6; overflow-wrap: anywhere; }
    .kp-legal__texte h1 { font-size: var(--kp-fs-page-title); font-weight: 500; line-height: 1.15; letter-spacing: -0.01em; }
    .kp-legal__date { margin-top: 8px; color: var(--kp-text-subtle); font-size: var(--kp-fs-secondary); }
    .kp-legal__texte h2 { margin-top: 32px; font-size: var(--kp-fs-subtitle); font-weight: 500; }
    .kp-legal__texte p, .kp-legal__texte ul, .kp-legal__texte .kp-legal__tableau { margin-top: 12px; }
    .kp-legal__texte ul { padding-left: 20px; }
    .kp-legal__texte ul ul { margin-top: 4px; }
    .kp-legal__texte li + li { margin-top: 4px; }
    .kp-legal__texte a { color: var(--kp-accent); }
    .kp-legal__texte code { font-family: ui-monospace, 'Cascadia Mono', Consolas, monospace; font-size: 0.9em; }
    .kp-legal__tableau { overflow-x: auto; border: 1px solid var(--kp-border); border-radius: var(--kp-radius-lg); }
    .kp-legal__tableau table { width: 100%; border-collapse: collapse; font-size: var(--kp-fs-secondary); }
    .kp-legal__tableau th, .kp-legal__tableau td { padding: 10px 12px; text-align: left; vertical-align: top; }
    .kp-legal__tableau th { background: var(--kp-surface-sunken); font-weight: 500; }
    .kp-legal__tableau tr + tr td, .kp-legal__tableau tbody tr:first-child td { border-top: 1px solid var(--kp-border); }
    .kp-legal__a-completer { background: var(--kp-state-warning-bg); color: var(--kp-state-warning-text); padding: 0 4px; border-radius: 4px; }
    .kp-legal__pied {
      display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; max-width: 720px; margin: 40px auto 0;
      padding-top: 16px; border-top: 1px solid var(--kp-border); font-size: var(--kp-fs-secondary); color: var(--kp-text-subtle);
    }
    .kp-legal__pied a { color: inherit; }
    .kp-legal__pied a.actif { color: var(--kp-text); font-weight: 500; text-decoration: none; }
  `],
})
export class PageLegaleComponent {
  private readonly router = inject(Router);
  readonly titre = input.required<string>();
  protected readonly liens = LIENS_LEGAUX;
  protected readonly date = DATE_MISE_A_JOUR_LEGALE;

  /** Page précédente si elle existe (navigation dans l'application), sinon l'accueil (onglet ouvert depuis un lien). */
  retour(): void {
    if (this.router.lastSuccessfulNavigation?.previousNavigation) history.back();
    else this.router.navigateByUrl('/');
  }
}
