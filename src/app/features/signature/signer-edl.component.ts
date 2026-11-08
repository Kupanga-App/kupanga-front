import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EdlService } from '../gestion-logement/services/edl.service';
import { EtatDesLieuxDTO } from '../gestion-logement/models/edl.model';
import { AuthService } from '../../core/auth/services/auth.service';
import { CodeLienSignature, codeLienSignature, messageLienSignature } from '../../core/http/api-error';
import { LienInvalideComponent } from './lien-invalide.component';
import { DateLonguePipe, dateLongue } from '../../shared/format';
import { SignatureLayoutComponent } from './signature-layout.component';
import { FenetreSignatureComponent } from './fenetre-signature.component';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { COMPTEURS, ELEMENTS, ETATS } from '../gestion-logement/models/edl-libelles';
import { nomCourt } from '../locataire/nom-court';
import { ouvrirPdfFrais } from './pdf-frais';

/**
 * Signature de l'état des lieux par le locataire depuis le lien reçu (page publique ; 404, 410, 409 : B7).
 * Même parcours que le bail (`Signer-Bail`, `Signer-Mobile`) : aperçu avec les données déjà affichées (compteurs,
 * clés, pièces et éléments), case « J'ai lu… » côté écran seulement, PDF relu au clic, signature dans une fenêtre.
 */
@Component({
  selector: 'kp-signer-edl',
  standalone: true,
  imports: [RouterLink, DateLonguePipe, SignatureLayoutComponent, FenetreSignatureComponent, IconComponent, LienInvalideComponent],
  template: `
    @if (signe()) {
      <kp-signature-layout titre="État des lieux signé"
                           [sousTitre]="'Votre signature est enregistrée. ' + proprietaireCourt() + ' est prévenu ; le document signé est disponible dans vos documents.'">
        <span illustration class="illustration illustration--ok"><kp-icon name="file-check" [size]="32" [strokeWidth]="1.5" /></span>
        <div class="fin">
          <span class="kp-statut kp-statut--ok kp-statut--point">Signé par les deux parties</span>
          <a [routerLink]="connecte() ? '/documents' : '/auth/login'" class="kp-btn kp-btn--primary kp-btn--block">
            {{ connecte() ? 'Mes documents' : 'Se connecter' }}
          </a>
        </div>
      </kp-signature-layout>
    } @else if (chargement()) {
      <kp-signature-layout titre="Signature de l’état des lieux">
        <div class="kp-stack" aria-busy="true">
          <span class="kp-skeleton kp-skeleton--carte"></span>
          <span class="kp-skeleton kp-skeleton--carte"></span>
        </div>
      </kp-signature-layout>
    } @else if (!edl()) {
      <kp-lien-invalide [code]="codeErreur()" [message]="erreur()" [connecte]="connecte()" document="l’état des lieux" (reessayer)="charger()" />
    } @else {
      @if (edl(); as e) {
        <kp-signature-layout [contexte]="'État des lieux à signer · envoyé par ' + proprietaireCourt()">
          <div page class="signer">
            <p class="intro">
              Lisez l’état des lieux en entier avant de signer.@if (e.dateSignatureProprietaire) { Le bailleur, {{ proprietaireCourt() }}, l’a déjà signé.}
            </p>

            <!-- Téléphone, étape 1 « Relire » : résumé au-dessus de l'aperçu -->
            <section class="resume" aria-label="Résumé de l’état des lieux">
              <span class="resume__titre">{{ e.adresseBien }}</span>
              <span class="petit">
                {{ type() }} · réalisé le {{ e.dateRealisation | dateLongue: true }} · {{ e.pieces.length }} pièce{{ e.pieces.length > 1 ? 's' : '' }}
              </span>
            </section>

            <!-- Aperçu : les données de l'état des lieux -->
            <article class="document" aria-labelledby="titre-document">
              <header class="document__entete">
                <h2 id="titre-document">État des lieux {{ type() === 'Entrée' ? 'd’entrée' : 'de sortie' }}</h2>
                <p>Réalisé le {{ e.dateRealisation | dateLongue }}@if (heure()) { à {{ heure() }}} · le document complet figure dans le PDF</p>
              </header>
              <section>
                <h3>Parties</h3>
                <p>{{ e.nomProprietaire }}, bailleur, et {{ e.nomLocataire }}, locataire. Logement : {{ e.adresseBien }}.</p>
              </section>

              @if (e.compteurs.length) {
                <section>
                  <h3>Compteurs</h3>
                  <dl class="lignes">
                    @for (c of e.compteurs; track $index) {
                      <div>
                        <dt>{{ libelleCompteur(c.typeCompteur) }}@if (c.numeroCompteur) { <span class="petit">n° {{ c.numeroCompteur }}</span>}</dt>
                        <dd class="kp-tabulaire">{{ c.index }} {{ c.unite }}</dd>
                      </div>
                    }
                  </dl>
                </section>
              }

              @if (e.cles.length) {
                <section>
                  <h3>Clés remises</h3>
                  <dl class="lignes">
                    @for (c of e.cles; track $index) {
                      <div><dt>{{ c.typeCle }}</dt><dd class="kp-tabulaire">{{ c.quantite }}</dd></div>
                    }
                  </dl>
                </section>
              }

              @for (p of e.pieces; track $index) {
                <section>
                  <h3>{{ p.nomPiece }}</h3>
                  <ul class="elements">
                    @for (el of p.elements; track $index) {
                      <li>
                        <span>{{ libelleElement(el.typeElement) }}</span>
                        <span [class]="'kp-statut kp-statut--' + tonEtat(el.etatElement)">{{ libelleEtat(el.etatElement) }}</span>
                        @if (el.observation) {
                          <span class="petit obs">{{ el.observation }}</span>
                        }
                      </li>
                    }
                  </ul>
                  @if (p.observations) {
                    <p class="petit">{{ p.observations }}</p>
                  }
                </section>
              }

              @if (e.observations) {
                <section>
                  <h3>Observations</h3>
                  <p>{{ e.observations }}</p>
                </section>
              }

              <div class="signatures">
                <div class="signataire">
                  <span class="signataire__qui">Le bailleur</span>
                  @if (e.dateSignatureProprietaire) {
                    <span class="cadre cadre--signe"><kp-icon name="check" [size]="18" /> Signé</span>
                    <span class="petit">Signé par {{ e.nomProprietaire }} le {{ e.dateSignatureProprietaire | dateLongue }}</span>
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
                <span class="petit">État des lieux envoyé par {{ proprietaireCourt() }}</span>
                <h1 id="titre-carte">{{ e.adresseBien }}</h1>
                <dl class="tuiles">
                  <div class="tuile"><dt>Type</dt><dd>{{ type() }}</dd></div>
                  <div class="tuile"><dt>Réalisé le</dt><dd>{{ e.dateRealisation | dateLongue: true }}</dd></div>
                  <div class="tuile"><dt>Pièces</dt><dd class="kp-tabulaire">{{ e.pieces.length }}</dd></div>
                  <div class="tuile"><dt>À noter</dt><dd class="kp-tabulaire">{{ aNoter() }} élément{{ aNoter() > 1 ? 's' : '' }}</dd></div>
                </dl>
                @if (e.dateSignatureProprietaire) {
                  <span class="kp-statut kp-statut--ok kp-statut--point badge">Signé par le bailleur</span>
                }

                <div class="action">
                  <label class="case">
                    <input type="checkbox" [checked]="lu()" (change)="lu.set($any($event.target).checked)" />
                    <span>J’ai lu l’état des lieux en entier et j’accepte de le signer</span>
                  </label>
                  <button type="button" class="kp-btn kp-btn--primary kp-btn--block" [disabled]="!lu() || envoi()" (click)="fenetre.set(true)">
                    <kp-icon name="signature" [size]="18" /> Signer l’état des lieux
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
                Une remarque sur l’état des lieux ? Écrivez à {{ proprietaireCourt() }} depuis votre espace Kupanga avant de signer.
              </p>
            </div>
          </div>
        </kp-signature-layout>

        <kp-fenetre-signature [(ouvert)]="fenetre" [mention]="mention()" [enCours]="envoi()" [erreur]="erreur()" (valider)="signer($event)" />
      }
    }
  `,
  styleUrl: './signer.scss',
  styles: [`
    .lignes { margin: 0; }
    .lignes > div { display: flex; justify-content: space-between; gap: 12px; padding: 6px 0; border-top: 1px solid var(--kp-border); font-size: 14px; }
    .lignes > div:first-child { border-top: 0; }
    .lignes dt { display: flex; flex-wrap: wrap; gap: 0 8px; }
    .lignes dd { margin: 0; font-weight: 500; }
    .elements { display: flex; flex-direction: column; margin: 0; padding: 0; list-style: none; font-size: 14px; }
    .elements li {
      display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 2px 12px;
      padding: 6px 0; border-top: 1px solid var(--kp-border);
    }
    .elements li:first-child { border-top: 0; }
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
  /** Lien refusé : 404, 410 ou 409 (illustration et titre de l'écran dédié). */
  readonly codeErreur = signal<CodeLienSignature | null>(null);
  readonly connecte = computed(() => !!this.auth.currentUser());

  /** Case « J'ai lu… » : côté écran seulement, rien n'est envoyé à l'API. */
  readonly lu = signal(false);
  readonly fenetre = signal(false);
  readonly pdfEnCours = signal(false);
  readonly pdfErreur = signal<string | null>(null);
  readonly pdfLien = signal<string | null>(null);

  readonly type = computed(() => (this.edl()?.type === 'SORTIE' ? 'Sortie' : 'Entrée'));
  readonly heure = computed(() => this.edl()?.heureRealisation?.slice(0, 5).replace(':', ' h ') ?? null);
  readonly proprietaireCourt = computed(() => nomCourt(this.edl()?.nomProprietaire) || 'votre propriétaire');
  /** Éléments qui ne sont pas en bon état. */
  readonly aNoter = computed(() =>
    (this.edl()?.pieces ?? []).reduce((n, p) => n + p.elements.filter(e => e.etatElement !== 'BON').length, 0));
  readonly mention = computed(() => `${this.edl()?.nomLocataire ?? ''} · ${dateLongue(new Date())}`);

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    this.chargement.set(true);
    this.erreur.set(null);
    this.codeErreur.set(null);
    this.edlService.getByToken(this.token()).subscribe({
      next: e => {
        this.edl.set(e);
        this.chargement.set(false);
      },
      error: err => {
        this.erreur.set(messageLienSignature(err, 'Le lien n’a pas pu être vérifié. Vérifiez votre connexion, puis réessayez.'));
        this.codeErreur.set(codeLienSignature(err));
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

  tonEtat(etat: string): 'ok' | 'attention' | 'danger' | 'info' {
    switch (etat) {
      case 'BON': return 'ok';
      case 'USAGE_NORMAL': return 'info';
      case 'MAUVAIS': return 'attention';
      default: return 'danger';
    }
  }

  /** Relit l'état des lieux (même `GET` par le jeton) et ouvre son PDF frais : l'adresse signée expire vite. */
  telechargerPdf(): void {
    this.pdfEnCours.set(true);
    this.pdfErreur.set(null);
    this.pdfLien.set(null);
    ouvrirPdfFrais(this.edlService.getByToken(this.token())).subscribe({
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
    this.edlService.signerByToken(this.token(), signature).subscribe({
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
