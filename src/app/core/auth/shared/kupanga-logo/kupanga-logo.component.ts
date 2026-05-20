import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Home } from 'lucide-angular';

@Component({
  selector: 'kp-auth-logo',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './kupanga-logo.component.html',
  styleUrls: ['./kupanga-logo.component.scss']
})
export class KupangaLogoComponent {
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() showSub = true;

  readonly Home = Home;
}
