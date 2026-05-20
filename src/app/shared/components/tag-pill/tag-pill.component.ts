import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type TagPillVariant = 'olive' | 'amber' | 'red' | 'mint' | 'ghost';

@Component({
  selector: 'kp-tag-pill',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="tag-pill" [class]="'tag-pill--' + variant()">
      <span class="tag-dot"></span>
      <ng-content />
    </span>
  `,
  styleUrl: './tag-pill.component.scss',
})
export class TagPillComponent {
  variant = input<TagPillVariant>('olive');
}
