import { Component, computed, input } from '@angular/core';
import { IconComponent } from '../../../shared/components/icon/icon.component';

/**
 * Bannière des écrans d'authentification, au-dessus des champs. Une erreur ne disparaît jamais seule :
 * c'est la page qui la retire (nouvel envoi).
 */
@Component({
  selector: 'kp-auth-banniere',
  standalone: true,
  imports: [IconComponent],
  host: { '[attr.role]': 'role()', '[class]': '"ton-" + ton()' },
  template: `
    <kp-icon [name]="icone()" [size]="20" [strokeWidth]="1.5" />
    <div class="corps"><ng-content /></div>
  `,
  styles: [`
    :host {
      display: flex; align-items: flex-start; gap: 12px; padding: 12px 16px;
      border-radius: var(--kp-radius-md); font-size: 14px; line-height: 1.45;
      animation: kp-banniere-entree var(--kp-duree) var(--kp-ease);
    }
    :host(.ton-danger) { background: var(--kp-state-danger-bg); color: var(--kp-state-danger-text); }
    :host(.ton-attention) { background: var(--kp-state-warning-bg); color: var(--kp-state-warning-text); }
    :host(.ton-info) { background: var(--kp-state-neutral-bg); color: var(--kp-text); }
    :host(.ton-ok) { background: var(--kp-state-success-bg); color: var(--kp-state-success-text); }
    kp-icon { margin-top: 1px; }
    .corps { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
    .corps ::ng-deep p { margin: 0; color: inherit; }
    .corps ::ng-deep a { color: inherit; font-weight: 500; }
    @keyframes kp-banniere-entree { from { opacity: 0; transform: translateY(-4px); } }
    @media (prefers-reduced-motion: reduce) { :host { animation: none; } }
  `],
})
export class AuthBanniereComponent {
  readonly ton = input<'danger' | 'attention' | 'info' | 'ok'>('danger');

  readonly role = computed(() => (this.ton() === 'danger' ? 'alert' : 'status'));
  readonly icone = computed(() => {
    switch (this.ton()) {
      case 'ok': return 'circle-check';
      case 'attention': return 'mail';
      default: return 'circle-alert';
    }
  });
}
