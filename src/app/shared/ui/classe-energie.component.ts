import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type Classe = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
const CLASSES: Classe[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

/**
 * Classe énergie (DPE) ou émissions (GES), maquettes `Annonce-France` et `O1v2-Explorer` :
 * - `forme="echelle"` : les sept classes A à G, la classe du bien mise en avant ;
 * - `forme="pastille"` : la lettre seule, sur sa couleur.
 * Couleurs : jetons `--kp-classe-*` (échelle réglementaire, identique dans les deux thèmes).
 */
@Component({
  selector: 'kp-classe-energie',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'img', '[attr.aria-label]': 'description()', '[class.pastille]': "forme() === 'pastille'" },
  template: `
    @if (forme() === 'pastille') {
      <span class="lettre active" [style.background]="couleur(classe())" aria-hidden="true">{{ classe() }}</span>
    } @else {
      @for (c of classes; track c) {
        <span class="lettre" [class.active]="c === classe()" [style.background]="couleur(c)" aria-hidden="true">{{ c }}</span>
      }
    }
  `,
  styles: [`
    :host { display: inline-flex; align-items: center; gap: 4px; }
    .lettre {
      display: grid; place-items: center; width: 20px; height: 20px; border-radius: 6px;
      color: var(--kp-classe-texte); font-size: 11px; font-weight: 600; line-height: 1; opacity: 0.35;
    }
    .lettre.active { opacity: 1; }
    :host(:not(.pastille)) .lettre.active { width: 28px; height: 28px; font-size: 13px; }
  `],
})
export class ClasseEnergieComponent {
  readonly classe = input.required<Classe>();
  readonly forme = input<'echelle' | 'pastille'>('echelle');
  /** « DPE » ou « GES », pour le libellé lu par les lecteurs d'écran. */
  readonly nom = input('DPE');

  protected readonly classes = CLASSES;
  protected readonly description = computed(() => `${this.nom()} : classe ${this.classe()}`);

  protected couleur(c: Classe): string {
    return `var(--kp-classe-${c.toLowerCase()})`;
  }
}
