import { Component, effect, input, model, output, signal, viewChild } from '@angular/core';
import { SheetComponent } from '../../shared/ui/sheet.component';
import { SignatureComponent } from '../../shared/ui/signature.component';

/**
 * Fenêtre « Votre signature » des pages de signature par lien (maquettes `Signer-Bail`, `Signer-Mobile` étape 2) :
 * fenêtre centrée sur ordinateur, panneau qui monte sur téléphone. Nom et date sous le trait, « Effacer » et
 * « Valider ma signature » (désactivé pendant l'envoi : pas de double envoi). Le cadre reste blanc à l'encre nuit
 * dans les deux thèmes : c'est l'image envoyée à l'API. Défilement neutralisé dans le cadre (`touch-action: none`).
 */
@Component({
  selector: 'kp-fenetre-signature',
  standalone: true,
  imports: [SheetComponent, SignatureComponent],
  template: `
    <kp-sheet [(ouvert)]="ouvert" titre="Votre signature">
      <div class="corps">
        <p class="consigne">Signez à la souris ou au doigt dans le cadre.<span class="tel"> Tournez le téléphone pour plus de place.</span></p>
        @if (ouvert()) {
          <kp-signature [mention]="mention()" [outils]="false" (signature)="signature.set($event)" />
        }
        @if (erreur()) {
          <p class="kp-bandeau kp-bandeau--danger erreur" role="alert">{{ erreur() }}</p>
        }
      </div>
      <div pied class="boutons">
        <button type="button" class="kp-btn kp-btn--secondary" [disabled]="!signature() || enCours()" (click)="effacer()">Effacer</button>
        <button type="button" class="kp-btn kp-btn--primary" [disabled]="!signature() || enCours()" (click)="valider.emit(signature())">
          @if (enCours()) {
            <span class="kp-spinner"></span>
          }
          {{ libelle() }}
        </button>
      </div>
    </kp-sheet>
  `,
  styles: [`
    .consigne { margin-bottom: 16px; color: var(--kp-text-muted); font-size: 14px; }
    .erreur { margin-top: 12px; }
    .boutons { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 2fr); gap: 8px; width: 100%; }
    @media (min-width: 768px) { .tel { display: none; } }
  `],
})
export class FenetreSignatureComponent {
  readonly ouvert = model(false);
  /** Texte sous le trait : « Grâce Mukendi · 7 novembre 2026 ». */
  readonly mention = input<string | null>(null);
  readonly libelle = input('Valider ma signature');
  readonly enCours = input(false);
  readonly erreur = input<string | null>(null);
  readonly valider = output<string>();

  readonly signature = signal('');
  private readonly zone = viewChild(SignatureComponent);

  constructor() {
    // Fenêtre refermée : la prochaine ouverture repart d'un cadre vide
    effect(() => {
      if (!this.ouvert()) this.signature.set('');
    });
  }

  effacer(): void {
    this.zone()?.effacer();
  }
}
