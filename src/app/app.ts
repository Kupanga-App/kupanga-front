import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HorsLigneService } from './core/pwa/hors-ligne.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('kupanga-front');
  /** R2 : bandeaux « hors ligne » et « nouvelle version ». */
  protected readonly horsLigne = inject(HorsLigneService);
}
