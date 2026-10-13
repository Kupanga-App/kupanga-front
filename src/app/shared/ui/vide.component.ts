import { Component, input } from '@angular/core';
import { IconComponent } from '../components/icon/icon.component';

/** État vide d'une liste ou d'un écran : icône, titre court, explication, action éventuelle (contenu projeté). */
@Component({
  selector: 'kp-vide',
  standalone: true,
  imports: [IconComponent],
  template: `
    <span class="icone"><kp-icon [name]="icone()" [size]="28" /></span>
    <h2>{{ titre() }}</h2>
    @if (texte()) {
      <p>{{ texte() }}</p>
    }
    <div class="actions"><ng-content /></div>
  `,
  styles: [`
    :host {
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      padding: 40px 16px; text-align: center;
      border: 1px dashed var(--kp-border-strong); border-radius: var(--kp-radius);
    }
    .icone {
      display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px;
      margin-bottom: 4px; border-radius: 50%; background: var(--kp-surface-2); color: var(--kp-text-3);
    }
    h2 { font-size: var(--kp-fs-md); }
    p { max-width: 420px; color: var(--kp-text-3); font-size: var(--kp-fs-sm); }
    .actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; margin-top: 8px; }
    .actions:empty { display: none; }
  `],
})
export class VideComponent {
  readonly icone = input('inbox');
  readonly titre = input.required<string>();
  readonly texte = input<string | null>(null);
}
