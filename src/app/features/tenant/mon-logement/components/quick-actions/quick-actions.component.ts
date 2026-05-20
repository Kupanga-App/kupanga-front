import { Component, input, output } from '@angular/core';
import { RouterModule } from '@angular/router';
import { IconComponent } from '../../../../../shared/components/icon/icon.component';
import { QuickAction } from '../../models/tenant.models';

@Component({
  selector: 'kp-quick-actions',
  standalone: true,
  imports: [IconComponent, RouterModule],
  templateUrl: './quick-actions.component.html',
  styleUrl: './quick-actions.component.scss',
})
export class QuickActionsComponent {
  actions = input.required<QuickAction[]>();
  actionCliquee = output<QuickAction>();
}
