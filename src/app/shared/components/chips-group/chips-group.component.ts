import { Component, input, output, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ChipOption {
  value: string;
  label: string;
}

@Component({
  selector: 'kp-chips-group',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chips-group.component.html',
  styleUrls: ['./chips-group.component.scss'],
})
export class ChipsGroupComponent {
  options = input.required<ChipOption[]>();
  value = input<string | null>(null);
  multi = input<boolean>(false);
  multiValue = input<string[]>([]);

  change = output<string>();
  multiChange = output<string[]>();

  isSelected(val: string): boolean {
    if (this.multi()) {
      return this.multiValue().includes(val);
    }
    return this.value() === val;
  }

  toggle(val: string): void {
    if (this.multi()) {
      const current = [...this.multiValue()];
      const idx = current.indexOf(val);
      if (idx >= 0) current.splice(idx, 1);
      else current.push(val);
      this.multiChange.emit(current);
    } else {
      this.change.emit(val);
    }
  }
}
