import { Component, input } from '@angular/core';

/**
 * Lieux proches du bien (école, pharmacie…), calculés par l'API autour d'une position exacte
 * (rayon de 5 km, `Constant.RAYON_DEFAUT`). Rien n'est affiché si la liste est vide :
 * calcul encore en cours, position approximative ou aucun lieu trouvé.
 */
@Component({
  selector: 'kp-lieux-proches',
  standalone: true,
  template: `
    @if (pois()?.length) {
      <div class="lieux" role="group" aria-label="Lieux à proximité">
        <span class="titre">À moins de 5 km</span>
        <div class="liste">
          @for (p of pois(); track p) {
            <span class="kp-tag">{{ p }}</span>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    :host:empty { display: none; }
    .lieux { display: flex; flex-direction: column; gap: 8px; }
    .titre { font-size: var(--kp-fs-mention); color: var(--kp-text-subtle); }
    .liste { display: flex; flex-wrap: wrap; gap: 6px; }
    .kp-tag {
      display: inline-flex; align-items: center; height: 28px; padding: 0 10px; border-radius: var(--kp-radius-pill);
      background: transparent; box-shadow: inset 0 0 0 1px var(--kp-border-strong); color: var(--kp-text-muted); font-size: var(--kp-fs-secondary);
    }
  `],
})
export class LieuxProchesComponent {
  readonly pois = input<string[] | null | undefined>([]);
}
