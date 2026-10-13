import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Component, computed, input } from '@angular/core';
import { IconComponent } from '../../../shared/components/icon/icon.component';

/** Même règle que l'API (UserFormDTO) : 8 caractères minimum, une minuscule, une majuscule, un chiffre. */
export const MOT_DE_PASSE_ROBUSTE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

/** Les deux mots de passe saisis sont identiques (`password` et `confirmPassword` du groupe). */
export const motsDePasseIdentiques: ValidatorFn = (groupe: AbstractControl): ValidationErrors | null => {
  const mdp = groupe.get('password')?.value ?? '';
  const confirmation = groupe.get('confirmPassword')?.value ?? '';
  return confirmation && mdp !== confirmation ? { differents: true } : null;
};

/** Règles du mot de passe cochées au fil de la saisie (au lieu d'un indicateur de « force »). */
@Component({
  selector: 'kp-regles-mot-de-passe',
  standalone: true,
  imports: [IconComponent],
  template: `
    <ul aria-label="Règles du mot de passe">
      @for (r of regles(); track r.libelle) {
        <li [class.ok]="r.ok">
          <kp-icon [name]="r.ok ? 'circle-check' : 'circle'" [size]="16" />
          {{ r.libelle }}<span class="kp-sr-only">{{ r.ok ? ' : respecté' : ' : manquant' }}</span>
        </li>
      }
    </ul>
  `,
  styles: [`
    ul { display: flex; flex-wrap: wrap; gap: 4px 16px; margin: 0; padding: 0; list-style: none; font-size: var(--kp-fs-sm); color: var(--kp-text-3); }
    li { display: inline-flex; align-items: center; gap: 6px; }
    li.ok { color: var(--kp-success); }
  `],
})
export class ReglesMotDePasseComponent {
  readonly valeur = input<string | null | undefined>('');

  readonly regles = computed(() => {
    const mdp = this.valeur() ?? '';
    return [
      { libelle: '8 caractères', ok: mdp.length >= 8 },
      { libelle: 'une majuscule et une minuscule', ok: /[a-z]/.test(mdp) && /[A-Z]/.test(mdp) },
      { libelle: 'un chiffre', ok: /\d/.test(mdp) },
    ];
  });
}
