import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type StatusMiniVariant = 'olive' | 'amber' | 'red' | 'mint';

@Component({
  selector: 'kp-status-mini',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="status-mini" [class]="'status-mini--' + variant()">
      <span class="status-dot"></span>
      <ng-content />
    </span>
  `,
  styleUrl: './status-mini.component.scss',
})
export class StatusMiniComponent {
  variant = input<StatusMiniVariant>('olive');
}
