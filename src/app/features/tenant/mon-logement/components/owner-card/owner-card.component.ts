import { Component, input, output } from '@angular/core';
import { IconComponent } from '../../../../../shared/components/icon/icon.component';
import { ProprietaireInfo } from '../../models/tenant.models';

@Component({
  selector: 'kp-owner-card',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './owner-card.component.html',
  styleUrl: './owner-card.component.scss',
})
export class OwnerCardComponent {
  proprietaire = input.required<ProprietaireInfo>();
  envoyerMessage = output<void>();
  appelerUrgence = output<void>();
}
