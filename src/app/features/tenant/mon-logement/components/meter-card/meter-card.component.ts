import { Component, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { CompteurReleve } from '../../models/tenant.models';

@Component({
  selector: 'kp-meter-card',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './meter-card.component.html',
  styleUrl: './meter-card.component.scss',
})
export class MeterCardComponent {
  compteurs = input.required<CompteurReleve[]>();
}
