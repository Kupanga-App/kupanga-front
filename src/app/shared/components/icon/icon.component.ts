import { Component, input } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'kp-icon',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <lucide-icon
      [name]="name()"
      [size]="size()"
      [strokeWidth]="strokeWidth()"
      [color]="color()"
    />
  `,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
  `],
})
export class IconComponent {
  name = input.required<string>();
  size = input<number>(18);
  strokeWidth = input<number>(1.5);
  color = input<string>('currentColor');
}
