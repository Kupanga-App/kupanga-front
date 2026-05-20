import { Component, input, output } from '@angular/core';
import { IconComponent } from '../../../../../shared/components/icon/icon.component';

@Component({
  selector: 'kp-home-hero',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './home-hero.component.html',
  styleUrl: './home-hero.component.scss',
})
export class HomeHeroComponent {
  photos = input<string[]>([]);
  totalCount = input<number>(0);
  openGallery = output<void>();

  readonly placeholders = [1, 2, 3, 4, 5];
}
