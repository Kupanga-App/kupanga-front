import { Component, input, computed } from '@angular/core';
import { IconComponent } from '../../../../../shared/components/icon/icon.component';
import { StatusMiniComponent } from '../../../../../shared/components/status-mini/status-mini.component';
import { StatutItem } from '../../models/tenant.models';

@Component({
  selector: 'kp-health-check',
  standalone: true,
  imports: [IconComponent, StatusMiniComponent],
  templateUrl: './health-check.component.html',
  styleUrl: './health-check.component.scss',
})
export class HealthCheckComponent {
  statuts = input.required<StatutItem[]>();

  etatGlobal = computed<'ok' | 'warning' | 'critical'>(() => {
    const items = this.statuts();
    if (items.some(i => i.statut === 'critical')) return 'critical';
    if (items.some(i => i.statut === 'warning')) return 'warning';
    return 'ok';
  });

  iconName = computed(() => {
    switch (this.etatGlobal()) {
      case 'critical': return 'x-circle';
      case 'warning': return 'alert-triangle';
      default: return 'check';
    }
  });

  titre = computed(() => {
    switch (this.etatGlobal()) {
      case 'critical': return { prefix: 'Attention', em: 'requise' };
      case 'warning': return { prefix: '1 action', em: 'requise' };
      default: return { prefix: 'Tout est', em: 'à jour.' };
    }
  });

  varianteStatut(statut: StatutItem['statut']): 'olive' | 'amber' | 'red' {
    if (statut === 'critical') return 'red';
    if (statut === 'warning') return 'amber';
    return 'olive';
  }
}
