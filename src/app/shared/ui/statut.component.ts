import { Component, computed, input } from '@angular/core';
import { Statut, classeStatut } from '../format';

/**
 * Badge d'état : point + texte, jamais la couleur seule.
 * `<kp-statut [statut]="statutQuittance(q.statut)" />` (badge, tableaux et listes)
 * `<kp-statut [statut]="…" forme="point" />` (dans le texte courant d'une carte)
 */
@Component({
  selector: 'kp-statut',
  standalone: true,
  template: `<span [class]="classe()">{{ statut().libelle }}</span>`,
  styles: [`:host { display: inline-flex; }`],
})
export class StatutComponent {
  readonly statut = input.required<Statut>();
  readonly forme = input<'badge' | 'point'>('badge');
  readonly classe = computed(() => classeStatut(this.statut()) + (this.forme() === 'point' ? ' kp-statut--point' : ''));
}
