import { Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CodeLienSignature } from '../../core/http/api-error';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { SignatureLayoutComponent } from './signature-layout.component';

interface Cas {
  icone: string;
  titre: string;
  /** Précision sous le message de l'API (maquette `Signer-Lien-Invalide`). */
  aide: string | null;
}

/**
 * Lien de signature refusé (maquette `Signer-Lien-Invalide`) : illustration, titre et explication propres à chaque
 * cas, choisis par le code (404, 410, 409) et non par le texte. Le message vient de `messageLienSignature`.
 * Action : « Mes documents » si le compte est connecté, sinon « Se connecter » ; autre erreur : « Réessayer ».
 */
@Component({
  selector: 'kp-lien-invalide',
  standalone: true,
  imports: [RouterLink, IconComponent, SignatureLayoutComponent],
  template: `
    <kp-signature-layout [titre]="cas().titre" [sousTitre]="message()">
      <span illustration class="illustration" [class]="'illustration illustration--' + (code() ?? 'reseau')" aria-hidden="true">
        <kp-icon [name]="cas().icone" [size]="32" [strokeWidth]="1.5" />
      </span>
      <div class="suite">
        @if (cas().aide) {
          <p class="aide">{{ cas().aide }}</p>
        }
        @if (code() === null) {
          <button type="button" class="kp-btn kp-btn--primary" (click)="reessayer.emit()">Réessayer</button>
        }
        <a [routerLink]="connecte() ? '/documents' : '/auth/login'" class="kp-btn kp-btn--secondary">
          {{ connecte() ? 'Mes documents' : 'Se connecter' }}
        </a>
      </div>
    </kp-signature-layout>
  `,
  styles: [`
    .illustration {
      display: grid; place-items: center; width: 72px; height: 72px; margin-bottom: 8px; border-radius: 50%;
      background: var(--kp-accent-soft); color: var(--kp-accent);
    }
    .illustration--410 { background: var(--kp-state-warning-bg); color: var(--kp-state-warning-text); }
    .illustration--409 { background: var(--kp-state-success-bg); color: var(--kp-state-success-text); }
    .illustration--reseau { background: var(--kp-surface-sunken); color: var(--kp-text-muted); }
    .suite { display: flex; flex-direction: column; align-items: center; gap: 12px; text-align: center; }
    .aide { color: var(--kp-text-subtle); font-size: var(--kp-fs-secondary); }
  `],
})
export class LienInvalideComponent {
  /** 404, 410, 409 ; null pour une autre erreur (réseau, serveur). */
  readonly code = input<CodeLienSignature | null>(null);
  /** Texte de `messageLienSignature`. */
  readonly message = input<string | null>(null);
  readonly connecte = input(false);
  /** « le bail » ou « l’état des lieux » */
  readonly document = input('le document');
  readonly reessayer = output<void>();

  readonly cas = computed<Cas>(() => {
    switch (this.code()) {
      case 404:
        return {
          icone: 'link-2-off', titre: 'Ce lien n’est pas valide',
          aide: 'Vérifiez que le lien est complet : il a pu être coupé en le copiant depuis l’e-mail. Un lien déjà utilisé pour signer ne sert plus.',
        };
      case 410:
        return { icone: 'hourglass', titre: 'Ce lien a expiré', aide: null };
      case 409:
        return {
          icone: 'file-check', titre: `${capitale(this.document())} n’attend plus votre signature`,
          aide: 'S’il est déjà signé, vous le retrouvez dans vos documents.',
        };
      default:
        return { icone: 'wifi-off', titre: 'Lien indisponible pour l’instant', aide: null };
    }
  });
}

function capitale(texte: string): string {
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}
