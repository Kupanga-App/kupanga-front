import { Component, computed, input } from '@angular/core';
import { Statut, classeStatut } from '../format';

/** Puce de statut colorée : `<kp-statut [statut]="statutQuittance(q.statut)" />`. */
@Component({
  selector: 'kp-statut',
  standalone: true,
  template: `<span [class]="classe()">{{ statut().libelle }}</span>`,
  styles: [`:host { display: inline-flex; }`],
})
export class StatutComponent {
  readonly statut = input.required<Statut>();
  readonly classe = computed(() => classeStatut(this.statut()));
}
