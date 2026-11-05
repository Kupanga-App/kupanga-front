import { Component, computed, inject, input, output, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BienDTO } from '../models/bien.model';
import { LocationService } from '../services/location.service';
import { messageErreurApi } from '../../../core/http/api-error';
import { ToastService } from '../../../core/ui/toast.service';
import { LogementContextService } from '../../../core/services/logement-context.service';
import { MontantPipe } from '../../../core/money/montant';
import { DateLonguePipe, joursAvant } from '../../../shared/format';
import { SheetComponent } from '../../../shared/ui/sheet.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';

/** Aujourd'hui au format `aaaa-mm-jj` (heure locale). */
function aujourdhui(decalageAnnees = 0): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + decalageAnnees);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const jj = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${jj}`;
}

/**
 * Fin du bail (2026-11-05), sur la fiche du bien (propriétaire) et dans « Mon logement » (locataire) :
 * donner ou retirer un congé, puis, pour le propriétaire à partir de la date annoncée, enregistrer la fin du bail
 * avec le dépôt de garantie restitué. Aucun préavis légal n'est calculé par l'application.
 */
@Component({
  selector: 'kp-fin-de-bail',
  standalone: true,
  imports: [RouterLink, FormsModule, MontantPipe, DateLonguePipe, SheetComponent, IconComponent],
  template: `
    @if (bien().location; as l) {
      @if (l.dateFinPrevue) {
        <div class="kp-bandeau kp-bandeau--attention fin">
          <kp-icon name="calendar" [size]="18" />
          <div>
            <p>
              <strong>Fin du bail le {{ l.dateFinPrevue | dateLongue }}</strong>
              ({{ l.congeDonnePar === moi() ? 'congé que vous avez donné' : 'congé donné par ' + (cote() === 'proprietaire' ? 'le locataire' : 'le propriétaire') }}).
            </p>
            @if (cote() === 'proprietaire') {
              <p class="kp-small">
                Faites l’état des lieux de sortie, puis enregistrez la fin du bail avec le dépôt de garantie restitué.
              </p>
            }
          </div>
        </div>
        <div class="actions">
          @if (cote() === 'proprietaire') {
            <a class="kp-btn kp-btn--secondary kp-btn--sm" [routerLink]="['/biens', bien().id, 'etats-des-lieux', 'nouveau']">
              <kp-icon name="clipboard-check" [size]="18" /> État des lieux de sortie
            </a>
            <button type="button" class="kp-btn kp-btn--primary kp-btn--sm" [disabled]="!dateAtteinte()" (click)="ouvrirFin()">
              Enregistrer la fin du bail
            </button>
          }
          @if (l.congeDonnePar === moi()) {
            <button type="button" class="kp-btn kp-btn--ghost kp-btn--sm" (click)="retirer()" [disabled]="envoi()">Retirer le congé</button>
          }
        </div>
        @if (cote() === 'proprietaire' && !dateAtteinte()) {
          <p class="kp-small kp-muted">Vous pourrez enregistrer la fin du bail à partir du {{ l.dateFinPrevue | dateLongue }}.</p>
        }
      } @else {
        <button type="button" class="kp-btn kp-btn--secondary kp-btn--sm" (click)="feuilleConge.set(true)">
          <kp-icon name="calendar" [size]="18" /> {{ cote() === 'proprietaire' ? 'Mettre fin au bail' : 'Donner congé' }}
        </button>
      }
    }

    <kp-sheet [(ouvert)]="feuilleConge" [titre]="cote() === 'proprietaire' ? 'Mettre fin au bail' : 'Donner congé'">
      <div class="kp-field">
        <label class="kp-label" for="date-fin">Dernier jour de la location</label>
        <input id="date-fin" class="kp-input" type="date" [min]="min" [max]="max" [(ngModel)]="dateFin" />
      </div>
      <p class="kp-aide">
        {{ cote() === 'proprietaire' ? 'Le locataire' : 'Le propriétaire' }} sera prévenu par notification et par
        e-mail. Respectez le préavis prévu par votre bail : l’application ne le calcule pas.
      </p>
      <div pied>
        <button type="button" class="kp-btn kp-btn--secondary" (click)="feuilleConge.set(false)">Annuler</button>
        <button type="button" class="kp-btn kp-btn--primary" (click)="donner()" [disabled]="!dateFin || envoi()">
          @if (envoi()) { <span class="kp-spinner"></span> }
          Confirmer
        </button>
      </div>
    </kp-sheet>

    <kp-sheet [(ouvert)]="feuilleFin" titre="Enregistrer la fin du bail">
      @if (bien().location?.depotGarantie != null) {
        <p>Dépôt de garantie du bail : <strong>{{ bien().location?.depotGarantie | montant: bien().devise }}</strong></p>
      }
      <div class="kp-field">
        <label class="kp-label" for="depot">Montant rendu au locataire</label>
        <input id="depot" class="kp-input" type="number" min="0" step="0.01" inputmode="decimal" [(ngModel)]="depotRestitue" />
      </div>
      @if (retenue()) {
        <div class="kp-field">
          <label class="kp-label" for="motif">Motif de la retenue</label>
          <textarea id="motif" class="kp-input" rows="3" maxlength="500" [(ngModel)]="motifRetenue"
                    placeholder="Ex. : remise en peinture de la chambre, loyer de mars impayé"></textarea>
        </div>
      }
      <p class="kp-aide">Le logement redeviendra disponible dans les annonces. Le locataire garde ses documents.</p>
      <div pied>
        <button type="button" class="kp-btn kp-btn--secondary" (click)="feuilleFin.set(false)">Annuler</button>
        <button type="button" class="kp-btn kp-btn--primary" (click)="terminer()" [disabled]="!finValide() || envoi()">
          @if (envoi()) { <span class="kp-spinner"></span> }
          Terminer le bail
        </button>
      </div>
    </kp-sheet>
  `,
  styles: [`
    :host { display: block; margin-top: 12px; }
    .fin { margin-bottom: 8px; }
    .fin p { margin: 0; }
    .actions { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 4px; }
  `],
})
export class FinDeBailComponent {
  readonly bien = input.required<BienDTO>();
  readonly cote = input.required<'proprietaire' | 'locataire'>();
  /** Émis après un congé, un retrait ou la fin du bail : l'écran relit le bien. */
  readonly modifie = output<void>();

  private locations = inject(LocationService);
  private toasts = inject(ToastService);
  private logement = inject(LogementContextService);

  readonly feuilleConge = signal(false);
  readonly feuilleFin = signal(false);
  readonly envoi = signal(false);
  readonly min = aujourdhui();
  readonly max = aujourdhui(2);
  dateFin = '';
  depotRestitue: number | null = null;
  motifRetenue = '';

  readonly moi = computed(() => (this.cote() === 'proprietaire' ? 'PROPRIETAIRE' : 'LOCATAIRE'));
  readonly dateAtteinte = computed(() => {
    const j = joursAvant(this.bien().location?.dateFinPrevue ?? null);
    return j !== null && j <= 0;
  });

  retenue(): boolean {
    const depot = this.bien().location?.depotGarantie;
    return depot == null || (this.depotRestitue ?? 0) < Number(depot);
  }

  finValide(): boolean {
    const depot = this.bien().location?.depotGarantie;
    const montant = this.depotRestitue;
    if (montant === null || montant === undefined || isNaN(Number(montant)) || Number(montant) < 0) return false;
    if (depot != null && Number(montant) > Number(depot)) return false;
    return !(depot != null && this.retenue() && !this.motifRetenue.trim());
  }

  ouvrirFin(): void {
    const depot = this.bien().location?.depotGarantie;
    this.depotRestitue = depot != null ? Number(depot) : null;
    this.motifRetenue = '';
    this.feuilleFin.set(true);
  }

  donner(): void {
    const l = this.bien().location;
    if (!l || !this.dateFin) return;
    this.envoi.set(true);
    this.locations.donnerConge(l.id, this.dateFin).subscribe({
      next: () => this.fini(this.feuilleConge, 'Congé enregistré. L’autre partie est prévenue.'),
      error: err => this.echec(err, 'Le congé n’a pas pu être enregistré.'),
    });
  }

  retirer(): void {
    const l = this.bien().location;
    if (!l) return;
    this.envoi.set(true);
    this.locations.retirerConge(l.id).subscribe({
      next: () => this.fini(null, 'Congé retiré : le bail continue.'),
      error: err => this.echec(err, 'Le congé n’a pas pu être retiré.'),
    });
  }

  terminer(): void {
    const l = this.bien().location;
    if (!l || !this.finValide()) return;
    this.envoi.set(true);
    const motif = this.retenue() ? this.motifRetenue.trim() || null : null;
    this.locations.terminer(l.id, Number(this.depotRestitue), motif).subscribe({
      next: () => {
        this.logement.invalider();
        this.fini(this.feuilleFin, 'Bail terminé. Le logement est de nouveau disponible.');
      },
      error: err => this.echec(err, 'La fin du bail n’a pas pu être enregistrée.'),
    });
  }

  private fini(feuille: ReturnType<typeof signal<boolean>> | null, message: string): void {
    this.envoi.set(false);
    feuille?.set(false);
    this.toasts.ok(message);
    this.modifie.emit();
  }

  private echec(err: HttpErrorResponse, defaut: string): void {
    this.envoi.set(false);
    this.toasts.erreur(messageErreurApi(err, defaut));
  }
}
