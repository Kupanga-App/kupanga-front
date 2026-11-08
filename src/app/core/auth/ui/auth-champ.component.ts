import { Component, ElementRef, afterRenderEffect, computed, inject, input } from '@angular/core';

/**
 * Champ des écrans d'authentification : libellé au-dessus (`<label for>`), lien facultatif à droite du libellé
 * (`[lien]`), contrôle projeté, puis erreur ou aide. Relie le contrôle à son aide et à son erreur
 * (`aria-describedby`, `aria-invalid`) ; `decritPar` ajoute d'autres identifiants (liste de critères…).
 *
 * `<kp-auth-champ libelle="E-mail" pour="email" [erreur]="…"><input id="email" class="kp-input" …></kp-auth-champ>`
 */
@Component({
  selector: 'kp-auth-champ',
  standalone: true,
  host: { '[class.invalide]': 'invalide()' },
  template: `
    <div class="entete">
      <label class="kp-label" [attr.for]="pour()">
        {{ libelle() }}
        @if (optionnel()) {
          <span class="kp-optionnel">(facultatif)</span>
        }
      </label>
      <ng-content select="[lien]" />
    </div>
    <ng-content />
    @if (erreur()) {
      <p class="erreur" [id]="pour() + '-erreur'"><span class="point" aria-hidden="true"></span>{{ erreur() }}</p>
    } @else if (aide()) {
      <p class="kp-aide aide" [id]="pour() + '-aide'">{{ aide() }}</p>
    }
    <ng-content select="[apres]" />
  `,
  styles: [`
    :host { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
    .entete { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
    .entete ::ng-deep a { font-size: var(--kp-fs-secondary); font-weight: 500; }
    .aide, .erreur { margin: 0; }
    .erreur {
      display: flex; align-items: baseline; gap: 8px;
      font-size: var(--kp-fs-secondary); color: var(--kp-state-danger-text);
    }
    .point { flex-shrink: 0; width: 6px; height: 6px; border-radius: 50%; background: var(--kp-state-danger); transform: translateY(-1px); }
    :host(.invalide) ::ng-deep .kp-input,
    :host(.invalide) ::ng-deep .kp-auth-telephone { border-color: var(--kp-state-danger); }
    :host(.invalide) ::ng-deep .kp-input:focus,
    :host(.invalide) ::ng-deep .kp-auth-telephone:focus-within { box-shadow: 0 0 0 1px var(--kp-state-danger); }
    :host(.invalide) ::ng-deep .kp-auth-telephone .kp-input:focus { box-shadow: none; }
  `],
})
export class AuthChampComponent {
  readonly libelle = input.required<string>();
  /** Identifiant du contrôle projeté. */
  readonly pour = input.required<string>();
  readonly aide = input<string | null>(null);
  readonly erreur = input<string | null>(null);
  /** Contour rouge sans message propre (erreur dite par une bannière). */
  readonly enErreur = input(false);
  readonly optionnel = input(false);
  readonly decritPar = input<string | null>(null);

  readonly invalide = computed(() => !!this.erreur() || this.enErreur());

  private readonly hote = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    afterRenderEffect(() => {
      const id = this.pour();
      const controle = this.hote.nativeElement.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
      if (!controle) return;
      const ids = [
        this.erreur() ? `${id}-erreur` : this.aide() ? `${id}-aide` : null,
        this.decritPar(),
      ].filter(Boolean);
      if (ids.length) controle.setAttribute('aria-describedby', ids.join(' '));
      else controle.removeAttribute('aria-describedby');
      if (this.invalide()) controle.setAttribute('aria-invalid', 'true');
      else controle.removeAttribute('aria-invalid');
    });
  }
}
