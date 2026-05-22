import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BienDTO } from '../../../biens/models/bien.model';

@Component({
  selector: 'kp-chat-context-rail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chat-context-rail.component.html',
  styleUrls: ['./chat-context-rail.component.scss'],
})
export class ChatContextRailComponent {
  @Input() bien: BienDTO | null = null;
  @Input() interlocuteurNom = '';

  get bienSousTitre(): string {
    if (!this.bien) return '';
    const pieces = this.bien.nombrePieces ? `T${this.bien.nombrePieces}` : '';
    const surface = this.bien.surfaceHabitable ? `${this.bien.surfaceHabitable} m²` : '';
    const etage = this.bien.etage ? `${this.bien.etage}ᵉ étage` : '';
    return [pieces, surface, etage].filter(Boolean).join(' · ');
  }

  get bienVille(): string {
    if (!this.bien) return '';
    return [this.bien.codePostal, this.bien.ville].filter(Boolean).join(' ');
  }

  get loyerFormatted(): string {
    if (!this.bien?.loyerMensuel) return '—';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(this.bien.loyerMensuel);
  }

  get bienRef(): string {
    if (!this.bien) return '';
    const year = this.bien.createdAt?.substring(0, 4) ?? String(new Date().getFullYear());
    return `KP-BIEN-${year}-${String(this.bien.id).padStart(4, '0')}`;
  }

  get locataireName(): string {
    if (!this.bien?.locataire) return '';
    return `${this.bien.locataire.firstName} ${this.bien.locataire.lastName}`;
  }

  get locataireInitiales(): string {
    if (!this.bien?.locataire) return '?';
    return `${this.bien.locataire.firstName[0] ?? ''}${this.bien.locataire.lastName[0] ?? ''}`.toUpperCase();
  }

  get locataireEmail(): string {
    return this.bien?.locataire?.mail ?? '';
  }
}
