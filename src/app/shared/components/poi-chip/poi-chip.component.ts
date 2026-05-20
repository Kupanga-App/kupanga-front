import { Component, Input } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

interface PoiDef { icon: string; cls: string; }

const POI_DEF: Record<string, PoiDef> = {
  'École':              { icon: 'school',        cls: 'poi-school' },
  'Hôpital':           { icon: 'cross',          cls: 'poi-hospital' },
  'Pharmacie':          { icon: 'pill',           cls: 'poi-pharmacy' },
  "Garderie d'enfants": { icon: 'baby',           cls: 'poi-nursery' },
  'Transports':         { icon: 'bus',            cls: 'poi-transport' },
  'Commerces':          { icon: 'shopping-cart',  cls: 'poi-commerce' },
};

@Component({
  selector: 'kp-poi-chip',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <span [class]="'poi-chip ' + def.cls">
      <lucide-icon [name]="def.icon" [size]="10" [strokeWidth]="1.8" />
      {{ poi }}
    </span>
  `,
  styles: [`
    :host { display: contents; }

    .poi-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      border: 1px solid var(--kp-border-strong);
      border-radius: 5px;
      padding: 2px 7px;
      font-family: var(--kp-font-mono);
      font-size: 9.5px;
      line-height: 1.4;
      white-space: nowrap;
      color: var(--kp-text-2);
      background: transparent;
    }

    /* ── Couleurs par type ────────────────────────── */
    .poi-school {
      border-color: rgba(91, 155, 213, 0.40);
      background:   rgba(91, 155, 213, 0.10);
      color: #5B9BD5;
    }
    .poi-hospital {
      border-color: rgba(217, 83, 79, 0.40);
      background:   rgba(217, 83, 79, 0.10);
      color: #D95353;
    }
    .poi-pharmacy {
      border-color: rgba(78, 173, 130, 0.40);
      background:   rgba(78, 173, 130, 0.10);
      color: #3EA882;
    }
    .poi-nursery {
      border-color: rgba(232, 162, 86, 0.40);
      background:   rgba(232, 162, 86, 0.10);
      color: #C88844;
    }
    .poi-transport {
      border-color: rgba(155, 114, 207, 0.40);
      background:   rgba(155, 114, 207, 0.10);
      color: #9B72CF;
    }
    .poi-commerce {
      border-color: rgba(201, 162, 39, 0.40);
      background:   rgba(201, 162, 39, 0.10);
      color: #B8962B;
    }
  `],
})
export class PoiChipComponent {
  @Input({ required: true }) poi!: string;

  get def(): PoiDef {
    return POI_DEF[this.poi] ?? { icon: 'map-pin', cls: '' };
  }
}
