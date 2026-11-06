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
        <span class="kp-small kp-strong">À moins de 5 km</span>
        <div class="kp-row kp-row--wrap">
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
  `],
})
export class LieuxProchesComponent {
  readonly pois = input<string[] | null | undefined>([]);
}
