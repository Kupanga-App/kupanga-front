import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { aCompleter } from '../../core/legal/liens-legaux';

/** Valeur de `EDITEUR` : surlignée tant qu'elle n'est pas complétée, lien `mailto:` pour une adresse e-mail. */
@Component({
  selector: 'kp-champ-editeur',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (manquant()) {
      <mark class="kp-legal__a-completer">{{ valeur() }}</mark>
    } @else if (email()) {
      <a [href]="'mailto:' + valeur()">{{ valeur() }}</a>
    } @else {
      {{ valeur() }}
    }
  `,
})
export class ChampEditeurComponent {
  readonly valeur = input.required<string>();
  readonly email = input(false);
  protected readonly manquant = computed(() => aCompleter(this.valeur()));
}
