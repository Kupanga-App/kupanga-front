import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { VideComponent } from '../../shared/ui/vide.component';

@Component({
  selector: 'kp-page-introuvable',
  standalone: true,
  imports: [RouterLink, VideComponent],
  template: `
    <div class="kp-page kp-page--etroite page">
      <kp-vide icone="compass" titre="Page introuvable" texte="Cette adresse n’existe pas ou n’existe plus.">
        <a routerLink="/" class="kp-btn kp-btn--primary">Retour à l’accueil</a>
      </kp-vide>
    </div>
  `,
  styles: [`.page { padding-top: calc(48px + var(--kp-safe-top)); }`],
})
export class PageIntrouvableComponent {}
