import { Component, input, output } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { IconComponent } from '../../../../../shared/components/icon/icon.component';

@Component({
  selector: 'kp-next-rent',
  standalone: true,
  imports: [IconComponent, DatePipe, DecimalPipe],
  templateUrl: './next-rent.component.html',
  styleUrl: './next-rent.component.scss',
})
export class NextRentComponent {
  montant = input.required<number>();
  dateEcheance = input.required<Date>();
  payerMaintenant = output<void>();
  programmerAuto = output<void>();
}
