import { Component, forwardRef, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { IconComponent } from '../../../shared/components/icon/icon.component';

type Role = 'ROLE_PROPRIETAIRE' | 'ROLE_LOCATAIRE';

const ROLES: { valeur: Role; titre: string; texte: string; icone: string }[] = [
  { valeur: 'ROLE_PROPRIETAIRE', titre: 'Propriétaire', texte: 'Je mets un bien en location et je gère mes locataires.', icone: 'building-2' },
  { valeur: 'ROLE_LOCATAIRE', titre: 'Locataire', texte: 'Je cherche un logement ou je loue déjà.', icone: 'key' },
];

/** Choix du rôle à l'inscription (champ de formulaire). */
@Component({
  selector: 'kp-choix-role',
  standalone: true,
  imports: [IconComponent],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => ChoixRoleComponent), multi: true }],
  template: `
    <div class="roles" role="radiogroup" aria-label="Vous êtes">
      @for (r of roles; track r.valeur) {
        <button type="button" class="role" role="radio" [attr.aria-checked]="valeur() === r.valeur" (click)="choisir(r.valeur)">
          <span class="icone"><kp-icon [name]="r.icone" [size]="24" /></span>
          <span class="texte">
            <span class="titre">{{ r.titre }}</span>
            <span class="kp-small kp-muted">{{ r.texte }}</span>
          </span>
          <span class="coche" aria-hidden="true"></span>
        </button>
      }
    </div>
  `,
  styles: [`
    .roles { display: flex; flex-direction: column; gap: 12px; }
    .role {
      display: flex; align-items: center; gap: 16px; min-height: 80px; padding: 16px;
      border: 1px solid var(--kp-border-strong); border-radius: var(--kp-radius); background: var(--kp-surface);
      color: var(--kp-text-1); text-align: left;
    }
    .role[aria-checked='true'] { border: 2px solid var(--kp-primary); padding: 15px; background: var(--kp-primary-subtle); }
    .icone {
      display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; width: 44px; height: 44px;
      border-radius: var(--kp-radius-sm); background: var(--kp-surface-2); color: var(--kp-text-2);
    }
    .texte { display: flex; flex-direction: column; flex: 1; gap: 2px; }
    .titre { font-weight: 700; }
    .coche { flex-shrink: 0; width: 22px; height: 22px; border: 2px solid var(--kp-border-strong); border-radius: 50%; }
    .role[aria-checked='true'] .coche { border: 7px solid var(--kp-primary); }
  `],
})
export class ChoixRoleComponent implements ControlValueAccessor {
  readonly roles = ROLES;
  readonly valeur = signal<Role | null>(null);
  private onChange: (v: Role) => void = () => undefined;
  private onTouched: () => void = () => undefined;

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
