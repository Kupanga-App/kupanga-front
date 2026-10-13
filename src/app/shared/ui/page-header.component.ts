import { AfterViewInit, Component, DestroyRef, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../components/icon/icon.component';

/**
 * En-tête d'écran : grand titre qui se replie dans la barre du haut au défilement (AUDIT.md §8.3),
 * chevron de retour vers l'écran parent, actions à droite (`<… actions>`).
 */
@Component({
  selector: 'kp-page-header',
  standalone: true,
  imports: [RouterLink, IconComponent],
  template: `
    <div class="barre" [class.barre--compacte]="compact()">
      @if (retour(); as url) {
        <a class="kp-icon-btn" [routerLink]="url" [queryParams]="retourParams()" aria-label="Retour">
          <kp-icon name="chevron-left" [size]="24" />
        </a>
      }
      <span class="barre__titre" aria-hidden="true">{{ titre() }}</span>
      <span class="actions"><ng-content select="[actions]" /></span>
    </div>
    <div class="grand" #grand>
      <h1>{{ titre() }}</h1>
      @if (sousTitre()) {
        <p class="sous-titre">{{ sousTitre() }}</p>
      }
      <ng-content />
    </div>
  `,
  styles: [`
    :host { display: block; }
    .barre {
      position: sticky; top: 0; z-index: 40;
      display: flex; align-items: center; gap: 4px;
      min-height: calc(56px + var(--kp-safe-top));
      margin: 0 calc(-1 * var(--kp-space-4));
      padding: var(--kp-safe-top) var(--kp-space-2) 0;
      background: var(--kp-bg);
      border-bottom: 1px solid transparent;
      transition: border-color var(--kp-duree);
    }
    @media (min-width: 768px) {
      .barre { margin: 0 calc(-1 * var(--kp-space-8)); padding-left: var(--kp-space-6); padding-right: var(--kp-space-6); }
    }
    .barre--compacte { border-bottom-color: var(--kp-border); }
    .barre__titre {
      flex: 1; min-width: 0; padding-left: 8px;
      font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      opacity: 0; transition: opacity var(--kp-duree);
    }
    .barre--compacte .barre__titre { opacity: 1; }
    .actions { display: flex; align-items: center; gap: 8px; }
    .actions:empty { display: none; }
    .grand { padding: 4px 0 var(--kp-space-5); }
    .sous-titre { margin-top: 4px; color: var(--kp-text-3); }
  `],
})
export class PageHeaderComponent implements AfterViewInit {
  readonly titre = input.required<string>();
  readonly sousTitre = input<string | null | undefined>(null);
  /** Écran parent ; sans valeur, pas de chevron (écran racine d'un onglet). */
  readonly retour = input<string | unknown[] | null | undefined>(null);
  readonly retourParams = input<Record<string, unknown> | null>(null);

  readonly compact = signal(false);
  private readonly grand = viewChild.required<ElementRef<HTMLElement>>('grand');
  private readonly destroyRef = inject(DestroyRef);

  ngAfterViewInit(): void {
    if (typeof IntersectionObserver === 'undefined') return;
    const titre = this.grand().nativeElement.querySelector('h1');
    if (!titre) return;
    // Le titre passe sous la barre du haut (56 px + zone sûre) : il apparaît dans la barre
    const observateur = new IntersectionObserver(
      ([entree]) => this.compact.set(!entree.isIntersecting),
      { rootMargin: '-64px 0px 0px 0px', threshold: 0 },
    );
    observateur.observe(titre);
    this.destroyRef.onDestroy(() => observateur.disconnect());
  }
}
