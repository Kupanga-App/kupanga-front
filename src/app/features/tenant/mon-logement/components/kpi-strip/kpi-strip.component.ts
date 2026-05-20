import { Component, input } from '@angular/core';
import { IconComponent } from '../../../../../shared/components/icon/icon.component';
import { KpiItem } from '../../models/tenant.models';

@Component({
  selector: 'kp-kpi-strip',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './kpi-strip.component.html',
  styleUrl: './kpi-strip.component.scss',
})
export class KpiStripComponent {
  kpis = input.required<KpiItem[]>();
}
