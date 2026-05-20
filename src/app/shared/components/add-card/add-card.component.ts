import { Component, input, output } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'kp-add-card',
  standalone: true,
  imports: [IconComponent],
  template: `
    <button type="button" class="add-card" (click)="add.emit()">
      <kp-icon name="plus" [size]="16" />
      {{ label() }}
    </button>
  `,
  styleUrls: ['./add-card.component.scss'],
})
export class AddCardComponent {
  label = input.required<string>();
  add = output<void>();
}
