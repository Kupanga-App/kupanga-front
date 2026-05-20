import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'kp-password-strength',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './password-strength.component.html',
  styleUrls: ['./password-strength.component.scss']
})
export class PasswordStrengthComponent {
  private _password = signal('');

  @Input()
  set password(val: string) {
    this._password.set(val ?? '');
  }

  readonly strength = computed(() => this.score(this._password()));

  readonly segments = [1, 2, 3, 4];

  readonly labels = ['', 'Faible', 'Passable', 'Bonne', 'Excellente'];

  get criteriaCount(): number {
    const pw = this._password();
    let count = 0;
    if (pw.length >= 8)  count += 3;
    if (pw.length >= 12) count += 2;
    if (/[A-Z]/.test(pw)) count += 2;
    if (/[0-9]/.test(pw)) count += 2;
    if (/[^A-Za-z0-9]/.test(pw)) count += 3;
    return Math.min(count, 12);
  }

  private score(pw: string): 0 | 1 | 2 | 3 | 4 {
    if (!pw) return 0;
    let s = 0;
    if (pw.length >= 8)         s++;
    if (pw.length >= 12)        s++;
    if (/[A-Z]/.test(pw))      s++;
    if (/[0-9]/.test(pw))      s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    if (s <= 1) return 1;
    if (s === 2) return 2;
    if (s === 3) return 3;
    return 4;
  }
}
