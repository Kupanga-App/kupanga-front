import { AfterViewInit, Component, ElementRef, NgZone, inject, output, signal, viewChild } from '@angular/core';
import { environment } from '../../../../environments/environment';

/**
 * Bouton officiel « Continuer avec Google » (Google Identity Services). Émet le jeton d'identité reçu.
 * Rien n'est affiché si le script de Google ne se charge pas (réseau, bloqueur).
 */
@Component({
  selector: 'kp-bouton-google',
  standalone: true,
  template: `<div #conteneur class="conteneur" [class.pret]="pret()"></div>`,
  styles: [`
    :host { display: block; }
    .conteneur { display: flex; justify-content: center; min-height: 0; }
    .conteneur.pret { min-height: 44px; }
  `],
})
export class BoutonGoogleComponent implements AfterViewInit {
  readonly jeton = output<string>();
  readonly pret = signal(false);

  private readonly conteneur = viewChild.required<ElementRef<HTMLElement>>('conteneur');
  private readonly zone = inject(NgZone);

  ngAfterViewInit(): void {
    if (typeof google !== 'undefined' && google.accounts?.id) {
      this.initialiser();
      return;
    }
    document.querySelector<HTMLScriptElement>('script[src*="gsi/client"]')?.addEventListener('load', () => this.initialiser());
  }

  private initialiser(): void {
    if (typeof google === 'undefined' || !google.accounts?.id) return;
    google.accounts.id.initialize({
      client_id: environment.googleClientId,
      callback: (reponse: google.accounts.id.CredentialResponse) => this.zone.run(() => this.jeton.emit(reponse.credential)),
    });
    const largeur = Math.min(400, Math.max(240, this.conteneur().nativeElement.clientWidth || 320));
    google.accounts.id.renderButton(this.conteneur().nativeElement, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      locale: 'fr',
      width: largeur,
    });
    this.zone.run(() => this.pret.set(true));
  }
}
