import { Component, input } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { provideIcones } from '../../../core/icones';

/** Icône Lucide (seule famille d'icônes de l'application) ; les noms disponibles sont dans `core/icones.ts`. */
@Component({
  selector: 'kp-icon',
  standalone: true,
  imports: [LucideAngularModule],
  // Déclarées ici : toute utilisation de <kp-icon> (application et tests) dispose des mêmes icônes
  providers: [provideIcones()],
  template: `<lucide-icon [name]="name()" [size]="size()" [strokeWidth]="strokeWidth()" [color]="color()" aria-hidden="true" />`,
  styles: [`:host { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }`],
})
export class IconComponent {
  name = input.required<string>();
  size = input<number>(20);
  strokeWidth = input<number>(2);
  color = input<string>('currentColor');
}
