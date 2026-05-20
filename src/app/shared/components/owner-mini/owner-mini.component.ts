import { Component, Input } from '@angular/core';

export interface OwnerMiniData {
  firstName: string;
  lastName: string;
  urlProfile?: string | null;
}

@Component({
  selector: 'kp-owner-mini',
  standalone: true,
  templateUrl: './owner-mini.component.html',
  styleUrls: ['./owner-mini.component.scss'],
})
export class OwnerMiniComponent {
  @Input({ required: true }) owner!: OwnerMiniData;
  @Input() isVacant = true;

  get initials(): string {
    const f = this.owner?.firstName?.[0]?.toUpperCase() ?? '?';
    const l = this.owner?.lastName?.[0]?.toUpperCase() ?? '';
    return f + l;
  }
}
