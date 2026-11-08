import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IconComponent } from '../../shared/components/icon/icon.component';

/**
 * « Une location en cinq étapes » (maquette `O1v2-Landing`) : pour chaque étape, le texte et une illustration
 * d'écran (décorative, `aria-hidden`). Contenu fixe, sans donnée.
 */
@Component({
  selector: 'kp-landing-etapes',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './landing-etapes.component.html',
  styleUrl: './landing-etapes.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingEtapesComponent {}
