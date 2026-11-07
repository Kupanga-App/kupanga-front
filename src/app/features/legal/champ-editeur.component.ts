import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { aCompleter } from '../../core/legal/liens-legaux';

/**
 * Ce qui reste à compléter dans une valeur entre crochets : « [ADRESSE À COMPLÉTER] » → « adresse »,
 * « [À COMPLÉTER : nom et pays de l’hébergeur] » → « nom et pays de l’hébergeur ».
 */
export function libelleACompleter(valeur: string): string {
  const texte = valeur.replace(/^\[|\]$/g, '').replace(/\s*À COMPLÉTER\s*:?\s*/i, ' ').trim();
  return texte === texte.toLocaleUpperCase('fr') ? texte.toLocaleLowerCase('fr') : texte;
}

/** Valeur de `EDITEUR` : badge « À compléter : … » tant qu'elle n'est pas renseignée, lien `mailto:` pour une adresse e-mail. */
@Component({
  selector: 'kp-champ-editeur',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (manquant()) {
      <mark class="kp-legal__a-completer">À compléter : {{ libelle() }}</mark>
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
  protected readonly libelle = computed(() => libelleACompleter(this.valeur()));
}
