import { Component, computed, input, signal } from '@angular/core';

/** Photo de profil, ou initiales sur surface en retrait si absente ou illisible (32 px en barre, 40 px en liste). */
@Component({
  selector: 'kp-avatar',
  standalone: true,
  template: `
    @if (photo() && !erreur()) {
      <img [src]="photo()" alt="" [style.width.px]="taille()" [style.height.px]="taille()" (error)="erreur.set(true)" loading="lazy" />
    } @else {
      <span class="initiales" [style.width.px]="taille()" [style.height.px]="taille()"
            [style.font-size.px]="taille() * 0.38" aria-hidden="true">{{ initiales() }}</span>
    }
  `,
  styles: [`
    :host { display: inline-flex; flex-shrink: 0; }
    img { border-radius: 50%; object-fit: cover; background: var(--kp-surface-sunken); }
    .initiales {
      display: inline-flex; align-items: center; justify-content: center; border-radius: 50%;
      background: var(--kp-surface-sunken); color: var(--kp-text); font-weight: 500; letter-spacing: 0.01em;
    }
  `],
})
export class AvatarComponent {
  readonly photo = input<string | null | undefined>(null);
  readonly nom = input<string | null | undefined>('');
  readonly taille = input(40);
  readonly erreur = signal(false);

  readonly initiales = computed(() =>
    (this.nom() ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(m => m[0]?.toUpperCase() ?? '')
      .join('') || '?',
  );
}
