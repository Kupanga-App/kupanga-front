import { Component, inject } from '@angular/core';
import { ToastService } from '../../core/ui/toast.service';
import { IconComponent } from '../components/icon/icon.component';

/** Affiche les messages de `ToastService` (un seul hôte, à la racine de l'application). */
@Component({
  selector: 'kp-toasts',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div class="pile" aria-live="polite">
      @for (t of service.toasts(); track t.id) {
        <div class="toast" [class.toast--erreur]="t.ton === 'erreur'" [attr.role]="t.ton === 'erreur' ? 'alert' : 'status'">
          @if (t.ton === 'ok') {
            <kp-icon name="circle-check" class="icone-ok" />
          }
          @if (t.ton === 'erreur') {
            <kp-icon name="circle-alert" />
          }
          <span class="texte">{{ t.texte }}</span>
          @if (t.action; as a) {
            <button type="button" class="action" (click)="a.executer(); service.fermer(t.id)">{{ a.libelle }}</button>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .pile {
      position: fixed; z-index: 950; left: 50%; transform: translateX(-50%);
      bottom: calc(var(--kp-bottom-offset) + 12px);
      display: flex; flex-direction: column; gap: 8px; width: min(480px, calc(100vw - 32px));
      pointer-events: none;
    }
    .toast {
      display: flex; align-items: center; gap: 12px; min-height: 48px; padding: 10px 12px 10px 16px;
      border-radius: var(--kp-radius); background: #10212b; color: #effbdb; box-shadow: var(--kp-shadow);
      font-size: var(--kp-fs-sm); pointer-events: auto; animation: kp-toast var(--kp-duree) ease-out;
      outline: 1px solid rgba(239, 251, 219, 0.12);
    }
    .toast--erreur { background: #8f2e1f; color: #ffffff; }
    .icone-ok { color: #8fa464; }
    .texte { flex: 1; overflow-wrap: anywhere; }
    .action {
      min-height: 36px; padding: 0 10px; border: 0; border-radius: var(--kp-radius-sm);
      background: transparent; color: #b5ca8d; font-weight: 700;
    }
    @keyframes kp-toast { from { opacity: 0; transform: translateY(8px); } }
  `],
})
export class ToastsComponent {
  protected readonly service = inject(ToastService);
}
