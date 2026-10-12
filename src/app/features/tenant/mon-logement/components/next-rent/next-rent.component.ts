import { Component, input, output } from '@angular/core';
import { Devise, SymboleDevisePipe } from '../../../../../core/money/montant';
import { DatePipe, DecimalPipe } from '@angular/common';
import { IconComponent } from '../../../../../shared/components/icon/icon.component';

@Component({
  selector: 'kp-next-rent',
  standalone: true,
  imports: [IconComponent, DatePipe, DecimalPipe, SymboleDevisePipe],
  templateUrl: './next-rent.component.html',
  styleUrl: './next-rent.component.scss',
})
export class NextRentComponent {
  montant = input.required<number>();
  /** J3 : devise figée du bail ou de la quittance. */
  devise = input<Devise | undefined>();
  dateEcheance = input.required<Date>();
  payerMaintenant = output<void>();
  programmerAuto = output<void>();
}
