import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContratService } from '../gestion-logement/services/contrat.service';
import { ContratDTO } from '../gestion-logement/models/contrat.model';
import { AuthService } from '../../core/auth/services/auth.service';
import { MontantPipe } from '../../core/money/montant';
import { messageLienSignature } from '../../core/http/api-error';
import { DateLonguePipe, dateLongue } from '../../shared/format';
import { SignatureLayoutComponent } from './signature-layout.component';
import { FenetreSignatureComponent } from './fenetre-signature.component';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { libelleDuree } from '../proprietaire/bail/duree';
import { nomCourt } from '../locataire/nom-court';
import { ouvrirPdfFrais } from './pdf-frais';

/**
 * Signature du bail par le locataire depuis le lien reçu (page publique, le jeton sert d'autorisation ;
 * maquette `Signer-Bail`). Aperçu construit avec les champs du contrat (le texte complet est dans le PDF, E2),
 * case « J'ai lu… » côté écran seulement, PDF relu au clic (adresse signée de quelques minutes).
 * 404 lien inconnu, 410 lien expiré, 409 déjà signé (B7).
 */
@Component({
  selector: 'kp-signer-contrat',
  standalone: true,
  imports: [RouterLink, MontantPipe, DateLonguePipe, SignatureLayoutComponent, FenetreSignatureComponent, IconComponent],
  template: `
    @if (signe()) {
      <kp-signature-layout titre="Bail signé"
                           [sousTitre]="'Votre signature est enregistrée. ' + proprietaireCourt() + ' est prévenu ; le bail signé par les deux parties est disponible dans votre espace.'">
        <span illustration class="illustration illustration--ok"><kp-icon name="file-check" [size]="32" [strokeWidth]="1.5" /></span>
        <div class="fin">
          <span class="kp-statut kp-statut--ok kp-statut--point">Signé par les deux parties</span>
          <a [routerLink]="connecte() ? '/mon-logement' : '/auth/login'" class="kp-btn kp-btn--primary kp-btn--block">
            {{ connecte() ? 'Voir mon logement' : 'Se connecter' }}
          </a>
        </div>
      </kp-signature-layout>
    } @else if (chargement()) {
      <kp-signature-layout titre="Signature du bail">
        <div class="kp-stack" aria-busy="true">
          <span class="kp-skeleton kp-skeleton--carte"></span>
          <span class="kp-skeleton kp-skeleton--carte"></span>
        </div>
      </kp-signature-layout>
    } @else if (!contrat()) {
      <kp-signature-layout titre="Lien de signature" [sousTitre]="erreur()">
        <a [routerLink]="connecte() ? '/documents' : '/auth/login'" class="kp-btn kp-btn--secondary kp-btn--block">
          {{ connecte() ? 'Mes documents' : 'Se connecter' }}
        </a>
      </kp-signature-layout>
    } @else {
      @if (contrat(); as c) {
      <kp-signature-layout [contexte]="'Bail à signer · envoyé par ' + proprietaireCourt()">
        <div page class="signer">
          <p class="intro">
            Lisez le bail en entier avant de signer.@if (proprioASigne()) { Le bailleur, {{ proprietaireCourt() }}, l’a déjà signé.}
          </p>

          <!-- Aperçu du bail, construit avec les champs du contrat -->
          <article class="document" aria-labelledby="titre-document">
            <header class="document__entete">
              <h2 id="titre-document">Contrat de location</h2>
              <p>Résumé des conditions · le texte complet figure dans le PDF</p>
            </header>
            <section>
              <h3>1. Parties</h3>
              <p>{{ nomProprietaire() }}, bailleur, et {{ nomLocataire() }}, locataire.</p>
            </section>
            <section>
              <h3>2. Logement</h3>
              <p>{{ c.adresseBien }}.</p>
            </section>
            <section>
              <h3>3. Durée</h3>
              <p>
                À compter du {{ c.dateDebut | dateLongue }}@if (duree()) {, pour une durée de {{ duree() }}}@if (c.dateFin) {, jusqu’au {{ c.dateFin | dateLongue }}}.
              </p>
            </section>
            <section>
              <h3>4. Loyer et charges</h3>
              <p>
                Loyer mensuel de {{ c.loyerMensuel | montant: c.devise }} hors charges@if (c.chargesMensuelles) {, et
                {{ c.chargesMensuelles | montant: c.devise }} de charges par mois, soit {{ total() | montant: c.devise }} par mois} @else {, sans charges}.
              </p>
            </section>
            @if (c.garantieMois != null || c.avanceMois != null) {
              <section>
                <h3>5. Garantie et loyers d’avance</h3>
                <p>
                  @if (c.garantieMois != null) {
                    Garantie de {{ c.garantieMois }} mois de loyer@if (c.depotGarantie) { ({{ c.depotGarantie | montant: c.devise }})}.
                  }
                  @if (c.avanceMois) {
                    {{ c.avanceMois }} mois de loyer payé{{ c.avanceMois > 1 ? 's' : '' }} d’avance.
                  }
                </p>
              </section>
            } @else {
              <section>
                <h3>5. Dépôt de garantie</h3>
                <p>{{ c.depotGarantie ? (c.depotGarantie | montant: c.devise) + '.' : 'Aucun.' }}</p>
              </section>
            }

            <div class="signatures">
              <div class="signataire">
                <span class="signataire__qui">Le bailleur</span>
                @if (proprioASigne()) {
                  <span class="cadre cadre--signe"><kp-icon name="check" [size]="18" /> Signé</span>
                  <span class="petit">Signé par {{ nomProprietaire() }}@if (c.dateSignatureProprietaire) { le {{ c.dateSignatureProprietaire | dateLongue }}}</span>
                } @else {
                  <span class="cadre">En attente</span>
                }
              </div>
              <div class="signataire">
                <span class="signataire__qui">Le locataire</span>
                <span class="cadre cadre--attente">Votre signature</span>
              </div>
            </div>
          </article>

          <!-- Carte de signature, collante sur ordinateur -->
          <div class="cote">
          <aside class="carte" aria-labelledby="titre-carte">
            <span class="petit">Bail envoyé par {{ proprietaireCourt() }}</span>
            <h1 id="titre-carte">{{ c.adresseBien }}</h1>
            <dl class="tuiles">
              <div class="tuile"><dt>Début</dt><dd>{{ c.dateDebut | dateLongue }}</dd></div>
              <div class="tuile"><dt>Durée</dt><dd>{{ duree() || '—' }}</dd></div>
              <div class="tuile"><dt>Loyer + charges</dt><dd class="kp-tabulaire">{{ total() | montant: c.devise : 0 }} par mois</dd></div>
              @if (c.garantieMois != null) {
                <div class="tuile"><dt>Garantie</dt><dd>{{ c.garantieMois }} mois</dd></div>
              } @else {
                <div class="tuile"><dt>Dépôt</dt><dd class="kp-tabulaire">{{ c.depotGarantie ? (c.depotGarantie | montant: c.devise : 0) : '—' }}</dd></div>
              }
              @if (c.avanceMois) {
                <div class="tuile"><dt>Loyers d’avance</dt><dd>{{ c.avanceMois }} mois</dd></div>
              }
            </dl>
            @if (proprioASigne()) {
              <span class="kp-statut kp-statut--ok kp-statut--point badge">Signé par le bailleur</span>
            }

            <div class="action">
              <label class="case">
                <input type="checkbox" [checked]="lu()" (change)="lu.set($any($event.target).checked)" />
                <span>J’ai lu le bail en entier et j’accepte de le signer</span>
              </label>
              <button type="button" class="kp-btn kp-btn--primary kp-btn--block" [disabled]="!lu() || envoi()" (click)="fenetre.set(true)">
                <kp-icon name="signature" [size]="18" /> Signer le bail
              </button>
            </div>

            <button type="button" class="lien-pdf" (click)="telechargerPdf()" [disabled]="pdfEnCours()" [attr.aria-busy]="pdfEnCours()">
              @if (pdfEnCours()) {
                <span class="kp-spinner" aria-hidden="true"></span>
              }
              Télécharger le PDF pour le relire
            </button>
            @if (pdfLien(); as url) {
              <p class="kp-bandeau"><a [href]="url" target="_blank" rel="noopener">Le PDF est prêt : ouvrez-le ici</a></p>
            }
            @if (pdfErreur()) {
              <p class="kp-bandeau kp-bandeau--danger" role="alert">{{ pdfErreur() }}</p>
            }
            @if (erreur()) {
              <p class="kp-bandeau kp-bandeau--danger" role="alert">{{ erreur() }}</p>
            }
          </aside>

          <p class="question">
            Une question sur le bail ? Écrivez à {{ proprietaireCourt() }} depuis votre espace Kupanga avant de signer.
          </p>
          </div>
        </div>
      </kp-signature-layout>

      <kp-fenetre-signature [(ouvert)]="fenetre" [mention]="mention()" [enCours]="envoi()" [erreur]="erreur()" (valider)="signer($event)" />
      }
    }
  `,
  styleUrl: './signer.scss',
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
  readonly connecte = computed(() => !!this.auth.currentUser());

  /** Case « J'ai lu… » : côté écran seulement, rien n'est envoyé à l'API. */
  readonly lu = signal(false);
  readonly fenetre = signal(false);
  readonly pdfEnCours = signal(false);
  readonly pdfErreur = signal<string | null>(null);
  /** Adresse fraîche du PDF quand l'onglet n'a pas pu s'ouvrir tout seul. */
  readonly pdfLien = signal<string | null>(null);

  readonly nomProprietaire = computed(() => nom(this.contrat()?.proprietaire) || 'Le bailleur');
  readonly proprietaireCourt = computed(() => {
    const p = this.contrat()?.proprietaire;
    return p ? nomCourt(p.firstName, p.lastName) : 'votre propriétaire';
  });
  readonly nomLocataire = computed(() => nom(this.contrat()?.locataire) || 'le locataire');
  readonly duree = computed(() => libelleDuree(this.contrat()?.dureeBailMois));
  /** Le gabarit ne lit pas « é » dans un nom de propriété. */
  readonly proprioASigne = computed(() => !!this.contrat()?.proprietaireASigné);
  readonly total = computed(() => (this.contrat()?.loyerMensuel ?? 0) + (this.contrat()?.chargesMensuelles ?? 0));
  /** Sous le trait de la signature : « Grâce Mukendi · 7 novembre 2026 ». */
  readonly mention = computed(() => `${this.nomLocataire()} · ${dateLongue(new Date())}`);

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

  /** Relit le contrat (même `GET` par le jeton) et ouvre son PDF frais : l'adresse signée expire vite. */
  telechargerPdf(): void {
    this.pdfEnCours.set(true);
    this.pdfErreur.set(null);
    this.pdfLien.set(null);
    ouvrirPdfFrais(this.contratService.getByToken(this.token())).subscribe({
      next: url => {
        this.pdfLien.set(url);
        this.pdfEnCours.set(false);
      },
      error: err => {
        this.pdfErreur.set(messageLienSignature(err, 'Le PDF n’a pas pu être chargé. Réessayez.'));
        this.pdfEnCours.set(false);
      },
    });
  }

  signer(signature: string): void {
    if (!signature || this.envoi()) return;
    this.envoi.set(true);
    this.erreur.set(null);
    this.contratService.signerByToken(this.token(), signature).subscribe({
      next: () => {
        this.envoi.set(false);
        this.fenetre.set(false);
        this.signe.set(true);
      },
      error: err => {
        this.envoi.set(false);
        this.erreur.set(messageLienSignature(err, 'La signature n’a pas été enregistrée. Réessayez.'));
      },
    });
  }
}

function nom(p: { firstName?: string; lastName?: string } | null | undefined): string {
  return p ? [p.firstName, p.lastName].filter(Boolean).join(' ') : '';
}
