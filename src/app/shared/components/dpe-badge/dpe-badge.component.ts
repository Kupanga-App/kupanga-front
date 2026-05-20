import { Component, Input } from '@angular/core';

interface DpeStyle { bg: string; color: string; }

const DPE_MAP: Record<string, DpeStyle> = {
  A: { bg: '#3a7d44', color: '#e8fce8' },
  B: { bg: '#5a9e3a', color: '#edfce6' },
  C: { bg: '#a0c940', color: '#1a2b00' },
  D: { bg: '#f0c040', color: '#2b1f00' },
  E: { bg: '#e08020', color: '#fff0e0' },
  F: { bg: '#d04020', color: '#ffe8e0' },
  G: { bg: '#b01010', color: '#ffe0e0' },
};

@Component({
  selector: 'kp-dpe-badge',
  standalone: true,
  template: `
    <span
      class="dpe"
      [style.background]="style.bg"
      [style.color]="style.color"
      [attr.aria-label]="'Classe énergie ' + classe"
      [title]="'DPE ' + classe"
    >{{ classe }}</span>
  `,
  styles: [`
    .dpe {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      border-radius: 4px;
      font-family: var(--kp-font-mono);
      font-size: 9.5px;
      font-weight: 600;
      flex-shrink: 0;
      line-height: 1;
    }
  `],
})
export class DpeBadgeComponent {
  @Input({ required: true }) classe!: string;
  get style(): DpeStyle { return DPE_MAP[this.classe] ?? { bg: '#555', color: '#fff' }; }
}
