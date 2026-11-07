import { Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { IconComponent } from '../../../shared/components/icon/icon.component';

export type Role = 'ROLE_PROPRIETAIRE' | 'ROLE_LOCATAIRE';

const ROLES: { valeur: Role; titre: string; texte: string; icone: string }[] = [
  { valeur: 'ROLE_LOCATAIRE', titre: 'Trouver un logement', texte: 'Je cherche un logement, ou je loue déjà.', icone: 'key' },
  { valeur: 'ROLE_PROPRIETAIRE', titre: 'Mettre un bien en location', texte: 'Je publie mes biens et je gère mes locataires.', icone: 'house' },
];

/**
 * Ce que la personne veut faire en premier (champ de formulaire de l'inscription). Lot 3 (2026-11-05) : ce choix
 * ne limite rien ; le même compte peut louer un logement et mettre ses biens en location.
 * Vrais boutons radio dans un fieldset ; la carte entière est le libellé.
 */
@Component({
  selector: 'kp-choix-role',
  standalone: true,
  imports: [IconComponent],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => ChoixRoleComponent), multi: true }],
  template: `
    <fieldset>
      <legend class="kp-sr-only">{{ legende() }}</legend>
      @for (r of roles; track r.valeur) {
        <label class="role" [class.choisi]="valeur() === r.valeur">
          <input type="radio" name="kp-role" [value]="r.valeur" [checked]="valeur() === r.valeur"
                 (change)="choisir(r.valeur)" (blur)="onTouched()" />
          <span class="icone"><kp-icon [name]="r.icone" [size]="22" [strokeWidth]="1.5" /></span>
          <span class="texte">
            <span class="titre">{{ r.titre }}</span>
            <span class="detail">{{ r.texte }}</span>
          </span>
        </label>
      }
    </fieldset>
  `,
  styles: [`
    fieldset { display: flex; flex-direction: column; gap: 12px; margin: 0; padding: 0; border: 0; min-width: 0; }
    .role {
      position: relative; display: flex; align-items: center; gap: 16px; min-height: 84px; padding: 16px;
      border: 1px solid var(--kp-border-strong); border-radius: var(--kp-radius-lg); background: var(--kp-surface);
      color: var(--kp-text); cursor: pointer;
      transition: border-color var(--kp-duree) var(--kp-ease), background-color var(--kp-duree) var(--kp-ease);
    }
    .role:hover { border-color: color-mix(in srgb, var(--kp-text) 30%, transparent); }
    .role.choisi { border: 2px solid var(--kp-accent); padding: 15px; }
    .role:has(input:focus-visible) { box-shadow: var(--kp-focus); }
    input {
      order: 3; flex-shrink: 0; width: 22px; height: 22px; margin: 0;
      border: 1.5px solid var(--kp-border-strong); border-radius: 50%; appearance: none; background: var(--kp-surface);
      cursor: pointer; transition: border-width var(--kp-duree) var(--kp-ease), border-color var(--kp-duree) var(--kp-ease);
    }
    input:checked { border: 7px solid var(--kp-accent); }
    input:focus-visible { outline: none; box-shadow: none; }
    .icone {
      display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; width: 44px; height: 44px;
      border-radius: 50%; background: var(--kp-accent-soft); color: var(--kp-accent);
    }
    .texte { display: flex; flex-direction: column; flex: 1; gap: 2px; min-width: 0; }
    .titre { font-weight: 500; }
    .detail { font-size: var(--kp-fs-secondary); color: var(--kp-text-muted); }
  `],
})
export class ChoixRoleComponent implements ControlValueAccessor {
  readonly legende = input('Vous souhaitez d’abord');
  readonly roles = ROLES;
  readonly valeur = signal<Role | null>(null);
  private onChange: (v: Role) => void = () => undefined;
  protected onTouched: () => void = () => undefined;

  choisir(role: Role): void {
    this.valeur.set(role);
    this.onChange(role);
    this.onTouched();
  }

  writeValue(v: Role | null): void {
    this.valeur.set(v);
  }

  registerOnChange(fn: (v: Role) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
}
