import { Component, input, model } from '@angular/core';

export interface OptionSegment<T extends string = string> {
  valeur: T;
  libelle: string;
  /** Nombre affiché à côté du libellé (éléments à traiter). */
  nombre?: number | null;
}

/** Contrôle segmenté (Baux / États des lieux / Quittances ; Loués / Vacants). */
@Component({
  selector: 'kp-segmented',
  standalone: true,
  template: `
    <div class="segments" role="group" [attr.aria-label]="libelle()">
      @for (o of options(); track o.valeur) {
        <button type="button" class="segment" [attr.aria-pressed]="valeur() === o.valeur" (click)="valeur.set(o.valeur)">
          {{ o.libelle }}
          @if (o.nombre) {
            <span class="nombre">{{ o.nombre }}</span>
          }
        </button>
      }
    </div>
  `,
  styles: [`
    .segments {
      display: flex; gap: 4px; padding: 4px; overflow-x: auto; scrollbar-width: none;
      border-radius: var(--kp-radius); background: var(--kp-surface-2);
    }
    .segments::-webkit-scrollbar { display: none; }
    .segment {
      flex: 1 0 auto; display: inline-flex; align-items: center; justify-content: center; gap: 6px;
      min-height: 40px; padding: 0 14px; border: 0; border-radius: var(--kp-radius-sm);
      background: transparent; color: var(--kp-text-2); font-size: var(--kp-fs-sm); font-weight: 600; white-space: nowrap;
    }
    .segment[aria-pressed='true'] { background: var(--kp-surface); color: var(--kp-text-1); box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12); }
    .nombre {
      min-width: 20px; height: 20px; padding: 0 6px; border-radius: 10px;
      background: var(--kp-primary); color: var(--kp-primary-on); font-size: 12px; line-height: 20px;
    }
  `],
})
export class SegmentedComponent<T extends string = string> {
  readonly options = input.required<OptionSegment<T>[]>();
  readonly valeur = model.required<T>();
  readonly libelle = input('');
}
