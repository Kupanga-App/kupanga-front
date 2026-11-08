import { Component, inject } from '@angular/core';
import { ToastService } from '../../core/ui/toast.service';
import { IconComponent } from '../components/icon/icon.component';

/**
 * Affiche les messages de `ToastService` (un seul hôte, à la racine de l'application).
 * Bas droite sur ordinateur, bas centre sur téléphone (au-dessus des onglets), 3 empilés au plus, niveau 1.
 * Action facultative (« Annuler »), sinon bouton de fermeture.
 */
@Component({
  selector: 'kp-toasts',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div class="pile" aria-live="polite">
      @for (t of service.toasts(); track t.id) {
        <div class="toast" [class.toast--erreur]="t.ton === 'erreur'" [attr.role]="t.ton === 'erreur' ? 'alert' : 'status'">
          @if (t.ton === 'ok') {
            <kp-icon name="check" [size]="18" [strokeWidth]="1.5" class="icone-ok" />
          }
          @if (t.ton === 'erreur') {
            <kp-icon name="circle-alert" [size]="18" [strokeWidth]="1.5" />
          }
          <span class="texte">{{ t.texte }}</span>
          @if (t.action; as a) {
            <button type="button" class="action" (click)="a.executer(); service.fermer(t.id)">{{ a.libelle }}</button>
          } @else {
            <button type="button" class="fermer" (click)="service.fermer(t.id)" aria-label="Fermer le message">
              <kp-icon name="x" [size]="16" [strokeWidth]="1.5" />
            </button>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .pile {
      position: fixed; z-index: 950; left: 50%; transform: translateX(-50%);
      bottom: calc(var(--kp-bottom-offset) + 12px);
      display: flex; flex-direction: column; align-items: stretch; gap: 8px; width: min(420px, calc(100vw - 32px));
      pointer-events: none;
    }
    @media (min-width: 768px) {
      .pile { left: auto; right: calc(24px + var(--kp-safe-right)); bottom: calc(24px + var(--kp-safe-bottom)); transform: none; width: 380px; }
    }
    /* Toast « inversé » : nuit plein en clair, menthe pleine en sombre */
    .toast {
      display: flex; align-items: center; gap: 12px; min-height: 48px; padding: 8px 8px 8px 16px;
      border-radius: 16px; background: var(--kp-text); color: var(--kp-text-on-accent); box-shadow: var(--kp-elev-1);
      font-size: 14px; line-height: 1.4; pointer-events: auto; animation: kp-toast var(--kp-duree-lente) var(--kp-ease);
    }
    .toast--erreur { background: var(--kp-state-danger); }
    .icone-ok { color: color-mix(in srgb, var(--kp-state-success) 55%, var(--kp-text-on-accent)); }
    .texte { flex: 1; overflow-wrap: anywhere; }
    .action {
      min-height: 36px; padding: 0 10px; border: 0; border-radius: var(--kp-radius-pill);
      background: transparent; color: inherit; font-size: 14px; font-weight: 500;
      text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 3px;
    }
    .fermer {
      display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; width: 36px; height: 36px;
      border: 0; border-radius: var(--kp-radius-pill); background: transparent; color: inherit; opacity: 0.72;
    }
    .action:hover, .fermer:hover { background: color-mix(in srgb, currentColor 12%, transparent); opacity: 1; }
    .action:focus-visible, .fermer:focus-visible { border-radius: var(--kp-radius-pill); }
    @keyframes kp-toast { from { opacity: 0; transform: translateY(8px); } }
  `],
})
export class ToastsComponent {
  protected readonly service = inject(ToastService);
}
