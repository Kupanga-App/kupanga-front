import { Component, computed, input } from '@angular/core';

/**
 * Avancement d'un parcours en plusieurs étapes : « Étape N sur 3 » et une barre à segments.
 * `forme="barre"` : segments seuls (en-tête du téléphone), masqués des lecteurs d'écran car le texte le dit déjà.
 */
@Component({
  selector: 'kp-auth-etapes',
  standalone: true,
  template: `
    @if (forme() !== 'barre') {
      <p class="texte">Étape {{ etape() }} sur {{ total() }}</p>
    }
    @if (forme() !== 'texte') {
      <span class="barre" aria-hidden="true">
        @for (i of segments(); track i) {
          <span class="segment" [class.fait]="i <= etape()"></span>
        }
      </span>
    }
  `,
  styles: [`
    :host { display: flex; flex-direction: column; gap: 8px; }
    .texte { margin: 0; font-size: var(--kp-fs-secondary); font-weight: 500; color: var(--kp-text-muted); }
    .barre { display: flex; gap: 6px; }
    .segment {
      flex: 1; height: 4px; border-radius: var(--kp-radius-pill); background: var(--kp-segment-bg);
      transition: background-color var(--kp-duree) var(--kp-ease);
    }
    .segment.fait { background: var(--kp-accent); }
  `],
})
export class AuthEtapesComponent {
  /** Étape en cours, à partir de 1. */
  readonly etape = input.required<number>();
  readonly total = input(3);
  readonly forme = input<'complete' | 'texte' | 'barre'>('complete');

  readonly segments = computed(() => Array.from({ length: this.total() }, (_, i) => i + 1));
}
