import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'kp-opt-card',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './opt-card.component.html',
  styleUrls: ['./opt-card.component.scss'],
})
export class OptCardComponent {
  icon = input.required<string>();
  title = input.required<string>();
  subtitle = input<string>('');
  selected = input<boolean>(false);
  select = output<void>();
}
