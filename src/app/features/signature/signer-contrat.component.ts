import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContratService } from '../gestion-logement/services/contrat.service';
import { ContratDTO } from '../gestion-logement/models/contrat.model';
import { AuthService } from '../../core/auth/services/auth.service';
import { MontantPipe } from '../../core/money/montant';
import { messageLienSignature } from '../../core/http/api-error';
import { DateLonguePipe } from '../../shared/format';
import { AuthLayoutComponent } from '../../core/auth/ui/auth-layout.component';
import { SignatureComponent } from '../../shared/ui/signature.component';
import { IconComponent } from '../../shared/components/icon/icon.component';

/**
 * Signature du bail par le locataire depuis le lien reçu (page publique, le jeton sert d'autorisation).
 * 404 lien inconnu, 410 lien expiré, 409 déjà signé (B7).
 */
@Component({
  selector: 'kp-signer-contrat',
  standalone: true,
  imports: [RouterLink, MontantPipe, DateLonguePipe, AuthLayoutComponent, SignatureComponent, IconComponent],
  template: `
    @if (signe()) {
      <kp-auth-layout titre="Bail signé">
        <div class="kp-stack">
          <p>Merci. Votre propriétaire est prévenu ; le bail signé est disponible dans vos documents.</p>
          <a [routerLink]="connecte() ? '/mon-logement' : '/auth/login'" class="kp-btn kp-btn--primary kp-btn--block">
            {{ connecte() ? 'Voir mon logement' : 'Se connecter' }}
          </a>
        </div>
      </kp-auth-layout>
    } @else if (chargement()) {
      <kp-auth-layout titre="Signature du bail">
        <div class="kp-stack" aria-busy="true">
          <span class="kp-skeleton kp-skeleton--carte"></span>
          <span class="kp-skeleton kp-skeleton--carte"></span>
        </div>
      </kp-auth-layout>
    } @else if (!contrat()) {
      <kp-auth-layout titre="Lien de signature" [sousTitre]="erreur()">
        <a [routerLink]="connecte() ? '/documents' : '/auth/login'" class="kp-btn kp-btn--secondary kp-btn--block">
          {{ connecte() ? 'Mes documents' : 'Se connecter' }}
        </a>
      </kp-auth-layout>
    } @else {
      <kp-auth-layout titre="Signez votre bail" [sousTitre]="contrat()!.adresseBien ?? null">
        @if (contrat(); as c) {
          <div class="kp-stack kp-stack--lg">
            <dl class="kp-details">
              <div><dt>Propriétaire</dt><dd>{{ c.proprietaire?.firstName }} {{ c.proprietaire?.lastName }}</dd></div>
              <div><dt>Début</dt><dd>{{ c.dateDebut | dateLongue }}</dd></div>
              <div><dt>Durée</dt><dd>{{ c.dureeBailMois }} mois</dd></div>
              <div><dt>Loyer</dt><dd>{{ c.loyerMensuel | montant: c.devise }}</dd></div>
              <div><dt>Charges</dt><dd>{{ c.chargesMensuelles | montant: c.devise }}</dd></div>
              @if (c.garantieMois != null) {
                <div><dt>Garantie</dt><dd>{{ c.garantieMois }} mois ({{ c.depotGarantie | montant: c.devise }})</dd></div>
              } @else if (c.depotGarantie != null) {
                <div><dt>Dépôt de garantie</dt><dd>{{ c.depotGarantie | montant: c.devise }}</dd></div>
              }
              @if (c.avanceMois != null) { <div><dt>Loyers d’avance</dt><dd>{{ c.avanceMois }} mois</dd></div> }
            </dl>
            @if (c.urlPdf) {
              <a class="kp-btn kp-btn--secondary" [href]="c.urlPdf" target="_blank" rel="noopener">
                <kp-icon name="file-text" [size]="18" /> Lire le bail complet
              </a>
            }
            <div class="kp-field">
              <span class="kp-label">Votre signature</span>
              <kp-signature (signature)="signature.set($event)" />
              <span class="kp-aide">En signant, vous acceptez les conditions du bail.</span>
            </div>
            @if (erreur()) {
              <p class="kp-bandeau kp-bandeau--danger" role="alert">{{ erreur() }}</p>
            }
            <button type="button" class="kp-btn kp-btn--primary kp-btn--block" [disabled]="!signature() || envoi()" (click)="signer()">
              @if (envoi()) {
                <span class="kp-spinner"></span>
              }
              Signer le bail
            </button>
          </div>
        }
      </kp-auth-layout>
    }
  `,
})
export class SignerContratComponent implements OnInit {
  readonly token = input.required<string>();

  private contratService = inject(ContratService);
  private auth = inject(AuthService);

  readonly contrat = signal<ContratDTO | null>(null);
  readonly chargement = signal(true);
  readonly envoi = signal(false);
  readonly signe = signal(false);
  readonly erreur = signal<string | null>(null);
  readonly signature = signal('');
  readonly connecte = computed(() => !!this.auth.currentUser());

  ngOnInit(): void {
    this.contratService.getByToken(this.token()).subscribe({
      next: c => {
        this.contrat.set(c);
        this.chargement.set(false);
      },
      error: err => {
        this.erreur.set(messageLienSignature(err, 'Ce lien de signature n’est plus valable.'));
        this.chargement.set(false);
      },
    });
  }

  signer(): void {
    if (!this.signature()) return;
    this.envoi.set(true);
    this.erreur.set(null);
    this.contratService.signerByToken(this.token(), this.signature()).subscribe({
      next: () => {
        this.envoi.set(false);
        this.signe.set(true);
      },
      error: err => {
        this.envoi.set(false);
        this.erreur.set(messageLienSignature(err, 'La signature n’a pas été enregistrée. Réessayez.'));
      },
    });
  }
}
