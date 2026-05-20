import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'kp-role-picker',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './role-picker.component.html',
  styleUrls: ['./role-picker.component.scss']
})
export class RolePickerComponent {
  @Input() control!: FormControl;

  get selected(): string {
    return this.control?.value ?? 'ROLE_PROPRIETAIRE';
  }

  select(value: string): void {
    this.control?.setValue(value);
  }
}
