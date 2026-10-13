import { Component, effect, input, model, output, signal } from '@angular/core';
import { SheetComponent } from './sheet.component';
import { SignatureComponent } from './signature.component';

/** Feuille plein écran (téléphone) avec la zone de signature et le bouton de validation. */
@Component({
  selector: 'kp-feuille-signature',
  standalone: true,
  imports: [SheetComponent, SignatureComponent],
  template: `
    <kp-sheet [(ouvert)]="ouvert" [titre]="titre()" [plein]="true">
      @if (texte()) {
        <p class="texte">{{ texte() }}</p>
      }
      @if (ouvert()) {
        <kp-signature (signature)="signature.set($event)" />
      }
      @if (erreur()) {
        <p class="kp-erreur" role="alert">{{ erreur() }}</p>
      }
      <div pied>
        <button type="button" class="kp-btn kp-btn--primary" [disabled]="!signature() || enCours()" (click)="valider.emit(signature())">
          @if (enCours()) {
            <span class="kp-spinner"></span>
          }
          {{ libelle() }}
        </button>
      </div>
    </kp-sheet>
  `,
  styles: [`.texte { margin-bottom: 16px; color: var(--kp-text-2); } .kp-erreur { margin-top: 12px; }`],
})
export class FeuilleSignatureComponent {
  readonly ouvert = model(false);
  readonly titre = input('Signer');
  readonly texte = input<string | null>(null);
  readonly libelle = input('Signer');
  readonly enCours = input(false);
  readonly erreur = input<string | null>(null);
  readonly valider = output<string>();

  readonly signature = signal('');

  constructor() {
    // Feuille refermée : la prochaine ouverture repart d'une zone vide
    effect(() => {
      if (!this.ouvert()) this.signature.set('');
    });
  }
}
