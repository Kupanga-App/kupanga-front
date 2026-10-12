import { Component, input, output } from '@angular/core';
import { MontantPipe } from '../../../../../core/money/montant';
import { IconComponent } from '../../../../../shared/components/icon/icon.component';
import { Quittance } from '../../models/tenant.models';

@Component({
  selector: 'kp-receipt-list',
  standalone: true,
  imports: [IconComponent, MontantPipe],
  templateUrl: './receipt-list.component.html',
  styleUrl: './receipt-list.component.scss',
})
export class ReceiptListComponent {
  quittances = input.required<Quittance[]>();
  toutTelecharger = output<void>();
  demanderAttestation = output<void>();

  telecharger(q: Quittance): void {
    if (q.urlPdf && q.urlPdf !== '#') {
      window.open(q.urlPdf, '_blank');
    }
  }
}
