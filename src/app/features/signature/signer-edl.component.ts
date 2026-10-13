import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EdlService } from '../gestion-logement/services/edl.service';
import { EtatDesLieuxDTO } from '../gestion-logement/models/edl.model';
import { AuthService } from '../../core/auth/services/auth.service';
import { messageLienSignature } from '../../core/http/api-error';
import { DateLonguePipe } from '../../shared/format';
import { AuthLayoutComponent } from '../../core/auth/ui/auth-layout.component';
import { SignatureComponent } from '../../shared/ui/signature.component';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { COMPTEURS, ELEMENTS, ETATS } from '../gestion-logement/models/edl-libelles';

/** Signature de l'état des lieux par le locataire depuis le lien reçu (page publique ; 404, 410, 409 : B7). */
@Component({
  selector: 'kp-signer-edl',
  standalone: true,
  imports: [RouterLink, DateLonguePipe, AuthLayoutComponent, SignatureComponent, IconComponent],
  template: `
    @if (signe()) {
      <kp-auth-layout titre="État des lieux signé">
        <div class="kp-stack">
          <p>Merci. Votre propriétaire est prévenu ; le document signé est disponible dans vos documents.</p>
          <a [routerLink]="connecte() ? '/documents' : '/auth/login'" class="kp-btn kp-btn--primary kp-btn--block">
            {{ connecte() ? 'Mes documents' : 'Se connecter' }}
          </a>
        </div>
      </kp-auth-layout>
    } @else if (chargement()) {
      <kp-auth-layout titre="Signature de l’état des lieux">
        <div class="kp-stack" aria-busy="true">
          <span class="kp-skeleton kp-skeleton--carte"></span>
          <span class="kp-skeleton kp-skeleton--carte"></span>
        </div>
      </kp-auth-layout>
    } @else if (!edl()) {
      <kp-auth-layout titre="Lien de signature" [sousTitre]="erreur()">
        <a [routerLink]="connecte() ? '/documents' : '/auth/login'" class="kp-btn kp-btn--secondary kp-btn--block">
          {{ connecte() ? 'Mes documents' : 'Se connecter' }}
        </a>
      </kp-auth-layout>
    } @else {
      <kp-auth-layout [titre]="'Signez l’état des lieux ' + (edl()!.type === 'ENTREE' ? 'd’entrée' : 'de sortie')" [sousTitre]="edl()!.adresseBien ?? null">
        @if (edl(); as e) {
          <div class="kp-stack kp-stack--lg">
            <dl class="kp-details">
              <div><dt>Propriétaire</dt><dd>{{ e.nomProprietaire }}</dd></div>
              <div><dt>Réalisé le</dt><dd>{{ e.dateRealisation | dateLongue }}</dd></div>
            </dl>

            @if (e.compteurs.length) {
              <section class="kp-section">
                <h2 class="kp-section-title">Compteurs</h2>
                <dl class="kp-details">
                  @for (c of e.compteurs; track $index) {
                    <div><dt>{{ libelleCompteur(c.typeCompteur) }}</dt><dd>{{ c.index }} {{ c.unite }}</dd></div>
                  }
                </dl>
              </section>
            }

            @if (e.cles.length) {
              <section class="kp-section">
                <h2 class="kp-section-title">Clés remises</h2>
                <dl class="kp-details">
                  @for (c of e.cles; track $index) {
                    <div><dt>{{ c.typeCle }}</dt><dd>{{ c.quantite }}</dd></div>
                  }
                </dl>
              </section>
            }

            <section class="kp-section">
              <h2 class="kp-section-title">Pièces</h2>
              @for (p of e.pieces; track $index) {
                <details class="kp-card piece">
                  <summary><span class="kp-strong">{{ p.nomPiece }}</span><kp-icon name="chevron-down" [size]="18" /></summary>
                  <ul class="elements">
                    @for (el of p.elements; track $index) {
                      <li>
                        <span>{{ libelleElement(el.typeElement) }}</span>
                        <span class="kp-strong">{{ libelleEtat(el.etatElement) }}</span>
                        @if (el.observation) {
                          <span class="kp-small kp-muted obs">{{ el.observation }}</span>
                        }
                      </li>
                    }
                  </ul>
                  @if (p.observations) {
                    <p class="kp-small kp-muted">{{ p.observations }}</p>
                  }
                </details>
              }
            </section>

            @if (e.observations) {
              <p class="kp-bandeau">{{ e.observations }}</p>
            }
            @if (e.urlPdf) {
              <a class="kp-btn kp-btn--secondary" [href]="e.urlPdf" target="_blank" rel="noopener"><kp-icon name="file-text" [size]="18" /> Lire le document complet</a>
            }

            <div class="kp-field">
              <span class="kp-label">Votre signature</span>
              <kp-signature (signature)="signature.set($event)" />
              <span class="kp-aide">En signant, vous confirmez l’état du logement décrit ci-dessus.</span>
            </div>
            @if (erreur()) {
              <p class="kp-bandeau kp-bandeau--danger" role="alert">{{ erreur() }}</p>
            }
            <button type="button" class="kp-btn kp-btn--primary kp-btn--block" [disabled]="!signature() || envoi()" (click)="signer()">
              @if (envoi()) {
                <span class="kp-spinner"></span>
              }
              Signer l’état des lieux
            </button>
          </div>
        }
      </kp-auth-layout>
    }
  `,
  styles: [`
    .piece summary { display: flex; align-items: center; justify-content: space-between; min-height: 44px; cursor: pointer; list-style: none; }
    .piece summary::-webkit-details-marker { display: none; }
    .elements { display: flex; flex-direction: column; gap: 8px; margin: 8px 0 0; padding: 0; list-style: none; }
    .elements li { display: grid; grid-template-columns: 1fr auto; gap: 2px 12px; }
    .obs { grid-column: 1 / -1; }
  `],
})
export class SignerEdlComponent implements OnInit {
  readonly token = input.required<string>();

  private edlService = inject(EdlService);
  private auth = inject(AuthService);

  readonly edl = signal<EtatDesLieuxDTO | null>(null);
  readonly chargement = signal(true);
  readonly envoi = signal(false);
  readonly signe = signal(false);
  readonly erreur = signal<string | null>(null);
  readonly signature = signal('');
  readonly connecte = computed(() => !!this.auth.currentUser());

  ngOnInit(): void {
    this.edlService.getByToken(this.token()).subscribe({
      next: e => {
        this.edl.set(e);
        this.chargement.set(false);
      },
      error: err => {
        this.erreur.set(messageLienSignature(err, 'Ce lien de signature n’est plus valable.'));
        this.chargement.set(false);
      },
    });
  }

  libelleCompteur(type: string): string {
    return COMPTEURS.find(c => c.valeur === type)?.libelle ?? type;
  }

  libelleElement(type: string): string {
    return ELEMENTS.find(e => e.valeur === type)?.libelle ?? type;
  }

  libelleEtat(etat: string): string {
    return ETATS.find(e => e.valeur === etat)?.libelle ?? etat;
  }

  signer(): void {
    if (!this.signature()) return;
    this.envoi.set(true);
    this.erreur.set(null);
    this.edlService.signerByToken(this.token(), this.signature()).subscribe({
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
