import { Component, input } from '@angular/core';

/** Illustrations des écrans d'e-mail : trait de 1,5 et aplat olive clair, décoratives (masquées des lecteurs d'écran). */
@Component({
  selector: 'kp-auth-illustration',
  standalone: true,
  host: { 'aria-hidden': 'true' },
  template: `
    <svg viewBox="0 0 96 96" width="96" height="96" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      @switch (sujet()) {
        @case ('enveloppe') {
          <rect class="aplat" x="14" y="26" width="68" height="46" rx="6" />
          <path d="M16 30l32 22 32-22" />
          <path d="M16 70l22-19M80 70L58 51" />
          <circle class="aplat-fort" cx="76" cy="26" r="9" />
          <path d="M72.5 26l2.5 2.5 4.5-5" />
        }
        @case ('maison') {
          <path class="aplat" d="M18 44L48 20l30 24v30a4 4 0 0 1-4 4H22a4 4 0 0 1-4-4z" />
          <path d="M40 78V58h16v20" />
          <circle class="aplat-fort" cx="72" cy="30" r="12" />
          <path d="M66.5 30l4 4 7-7.5" />
        }
        @case ('lien') {
          <circle class="aplat" cx="48" cy="48" r="32" />
          <path d="M41 55l-5 5a7 7 0 0 1-10-10l5-5" />
          <path d="M55 41l5-5a7 7 0 0 1 10 10l-5 5" />
          <path d="M38 30v6M30 38h6M58 66v-6M66 58h-6" />
        }
      }
    </svg>
  `,
  styles: [`
    :host { display: inline-flex; color: var(--kp-accent); }
    svg { stroke: currentColor; }
    .aplat { fill: var(--kp-accent-soft); }
    .aplat-fort { fill: var(--kp-surface); }
  `],
})
export class AuthIllustrationComponent {
  readonly sujet = input<'enveloppe' | 'maison' | 'lien'>('enveloppe');
}
