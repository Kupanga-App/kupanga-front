import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'kp-steps',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './steps.component.html',
  styleUrls: ['./steps.component.scss']
})
export class StepsComponent {
  @Input() current = 1;
  @Input() total = 2;
  @Input() labels: string[] = [];

  get dots(): number[] {
    return Array.from({ length: this.total }, (_, i) => i + 1);
  }

  get currentLabel(): string {
    return this.labels[this.current - 1] ?? '';
  }

  padded(n: number): string {
    return String(n).padStart(2, '0');
  }
}
