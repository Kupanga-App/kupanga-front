import { Component, input } from '@angular/core';
import { IconComponent } from '../components/icon/icon.component';

/**
 * État vide d'une liste ou d'un écran : illustration au trait 1,5 centrée sur un aplat olive clair, une phrase,
 * une première action (contenu projeté, en général un `.kp-btn--primary.kp-btn--sm`).
 */
@Component({
  selector: 'kp-vide',
  standalone: true,
  imports: [IconComponent],
  template: `
    <span class="illustration" aria-hidden="true">
      <span class="aplat"></span>
      <kp-icon [name]="icone()" [size]="48" [strokeWidth]="1.5" />
    </span>
    <h2>{{ titre() }}</h2>
    @if (texte()) {
      <p>{{ texte() }}</p>
    }
    <div class="actions"><ng-content /></div>
  `,
  styles: [`
    :host {
      display: flex; flex-direction: column; align-items: center; gap: 12px;
      padding: 24px var(--kp-card-pad) 28px; text-align: center;
      border-radius: var(--kp-radius-lg); background: var(--kp-surface); box-shadow: var(--kp-elev-0);
    }
    .illustration { position: relative; display: grid; place-items: center; width: 120px; height: 88px; color: var(--kp-text); }
    /* Aplat centré sous l'icône */
    .aplat {
      position: absolute; left: 50%; top: 50%; width: 72px; height: 72px; transform: translate(-50%, -50%);
      border-radius: 18px; background: var(--kp-accent-soft);
    }
    .illustration kp-icon { position: relative; }
    h2 { font-size: var(--kp-fs-card-title); font-weight: 500; }
    p { max-width: 320px; margin-top: -4px; color: var(--kp-text-muted); font-size: 14px; }
    .actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; }
    .actions:empty { display: none; }
  `],
})
export class VideComponent {
  readonly icone = input('inbox');
  readonly titre = input.required<string>();
  readonly texte = input<string | null>(null);
}
