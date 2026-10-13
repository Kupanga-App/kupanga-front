import { Component, DestroyRef, OnInit, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY } from 'rxjs';
import { catchError, filter, switchMap } from 'rxjs/operators';

import { Pays } from '../../../biens/models/bien.model';
import { whatsappPropose } from '../../../biens/models/juridiction.model';
import { JuridictionService } from '../../../biens/services/juridiction.service';
import { DocumentWhatsApp, LienWhatsApp, WhatsappService } from '../../services/whatsapp.service';
import { IconComponent } from '../../../../shared/components/icon/icon.component';

/**
 * C7-C16 : bouton « Envoyer par WhatsApp » (propriétaire). Affiché seulement si le pays du bien propose le canal
 * `WHATSAPP_LIEN` et que l'API accepte de préparer le message. Le lien est chargé à l'avance et rendu en `<a>` :
 * un `window.open` après une requête serait bloqué par les navigateurs mobiles.
 */
@Component({
  selector: 'kp-bouton-whatsapp',
  standalone: true,
  imports: [IconComponent],
  template: `
    @if (lien(); as l) {
      <div class="kp-whatsapp">
        <a class="kp-btn kp-btn--whatsapp kp-btn--block" [href]="l.url" target="_blank" rel="noopener noreferrer">
          <kp-icon name="smartphone" [size]="18" /> {{ libelle() }}
        </a>
        @if (!l.numeroConnu) {
          <span class="kp-aide">Numéro du locataire inconnu : choisissez le contact dans WhatsApp.</span>
        }
      </div>
    }
  `,
  styles: [`
    .kp-whatsapp { display: flex; flex-direction: column; gap: 4px; }
  `],
})
export class BoutonWhatsappComponent implements OnInit {
  private juridictions = inject(JuridictionService);
  private whatsapp = inject(WhatsappService);
  private destroyRef = inject(DestroyRef);

  readonly type = input.required<DocumentWhatsApp>();
  readonly documentId = input.required<number>();
  readonly pays = input.required<Pays>();
  readonly libelle = input('Envoyer par WhatsApp');

  readonly lien = signal<LienWhatsApp | null>(null);

  ngOnInit(): void {
    this.juridictions.configuration(this.pays()).pipe(
      filter(whatsappPropose),
      switchMap(() => this.whatsapp.lien(this.type(), this.documentId())),
      // Pays sans WhatsApp, document qui n'attend plus rien (409)… : pas de bouton
      catchError(() => EMPTY),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((lien) => this.lien.set(lien));
  }
}
