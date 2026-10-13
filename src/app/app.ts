import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HorsLigneService } from './core/pwa/hors-ligne.service';
import { InstallationService } from './core/pwa/installation.service';
import { IconComponent } from './shared/components/icon/icon.component';
import { ThemeService } from './core/services/theme.service';
import { ToastsComponent } from './shared/ui/toasts.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastsComponent, IconComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  /** R2 : bandeaux « hors ligne » et « nouvelle version ». */
  protected readonly horsLigne = inject(HorsLigneService);

  /** Bandeau « Installer l’application » (téléphone et ordinateur). */
  protected readonly installation = inject(InstallationService);

  constructor() {
    // Applique le thème choisi dans le compte dès le démarrage
    inject(ThemeService);
  }
}
