import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BienService } from '../../biens/services/bien.service';
import { BienDTO } from '../../biens/models/bien.model';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { SegmentedComponent, OptionSegment } from '../../../shared/ui/segmented.component';
import { VideComponent } from '../../../shared/ui/vide.component';
import { CarteBienComponent } from '../../../shared/ui/carte-bien.component';
import { TirerPourActualiserDirective } from '../../../shared/ui/tirer-pour-actualiser.directive';
import { IconComponent } from '../../../shared/components/icon/icon.component';

type Filtre = 'tous' | 'loues' | 'vacants' | 'archives';

/** Biens du propriétaire, filtrés par statut. Les annonces de tout le monde sont dans « Voir les annonces ». */
@Component({
  selector: 'kp-biens',
  standalone: true,
  imports: [RouterLink, PageHeaderComponent, SegmentedComponent, VideComponent, CarteBienComponent, TirerPourActualiserDirective, IconComponent],
  template: `
    <div class="kp-page" kpTirerPourActualiser (actualiser)="charger()">
      <kp-page-header titre="Mes biens">
        <a actions routerLink="/explorer" class="kp-btn kp-btn--ghost kp-btn--sm"><kp-icon name="compass" [size]="18" /> Annonces</a>
        <a actions routerLink="/biens/nouveau" class="kp-btn kp-btn--primary kp-btn--sm ajouter"><kp-icon name="plus" [size]="18" /> Ajouter un bien</a>
      </kp-page-header>

      @if (chargement() && !biens().length) {
        <div class="kp-grid" aria-busy="true">
          @for (i of [1, 2, 3]; track i) {
            <span class="kp-skeleton kp-skeleton--photo"></span>
          }
        </div>
      } @else if (erreur()) {
        <kp-vide icone="wifi-off" titre="Biens indisponibles" texte="Vérifiez votre connexion puis réessayez.">
          <button type="button" class="kp-btn kp-btn--secondary" (click)="charger()">Réessayer</button>
        </kp-vide>
      } @else if (!biens().length) {
        <kp-vide icone="building-2" titre="Aucun bien pour l’instant" texte="Ajoutez votre premier bien : il sera publié dans les annonces.">
          <a routerLink="/biens/nouveau" class="kp-btn kp-btn--primary"><kp-icon name="plus" /> Ajouter un bien</a>
        </kp-vide>
      } @else {
        <kp-segmented [options]="options()" [(valeur)]="filtre" libelle="Filtrer les biens" />
        <div class="kp-grid liste">
          @for (b of affiches(); track b.id) {
            <kp-carte-bien [bien]="b" [lien]="['/biens', b.id]">
              <span statut [class]="classe(b)">{{ statut(b) }}</span>
              @if (b.locataire) {
                <p class="kp-small locataire"><kp-icon name="user" [size]="14" /> {{ b.locataire.firstName }} {{ b.locataire.lastName }}</p>
              }
            </kp-carte-bien>
          } @empty {
            <p class="kp-muted">Aucun bien dans cette catégorie.</p>
          }
        </div>
      }
    </div>
    <a routerLink="/biens/nouveau" class="kp-fab"><kp-icon name="plus" /> Ajouter</a>
  `,
  styles: [`
    .liste { margin-top: 16px; }
    .locataire { display: flex; align-items: center; gap: 4px; margin-top: 4px; color: var(--kp-text-2); }
    [statut] { background: var(--kp-surface); }
    @media (max-width: 767px) { .ajouter { display: none; } }
  `],
})
export class BiensComponent implements OnInit {
  private bienService = inject(BienService);

  readonly biens = signal<BienDTO[]>([]);
  readonly chargement = signal(true);
  readonly erreur = signal(false);
  readonly filtre = signal<Filtre>('tous');

  readonly options = computed<OptionSegment<Filtre>[]>(() => {
    const b = this.biens();
    const archives = b.filter(x => x.archive).length;
    const options: OptionSegment<Filtre>[] = [
      { valeur: 'tous', libelle: 'Tous' },
      { valeur: 'loues', libelle: `Loués (${b.filter(x => !x.archive && x.locataire).length})` },
      { valeur: 'vacants', libelle: `Vacants (${b.filter(x => !x.archive && !x.locataire).length})` },
    ];
    if (archives) options.push({ valeur: 'archives', libelle: `Archivés (${archives})` });
    return options;
  });

  readonly affiches = computed(() => {
    const b = this.biens();
    switch (this.filtre()) {
      case 'loues': return b.filter(x => !x.archive && x.locataire);
      case 'vacants': return b.filter(x => !x.archive && !x.locataire);
      case 'archives': return b.filter(x => x.archive);
      default: return b.filter(x => !x.archive);
    }
  });

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    this.chargement.set(true);
    this.erreur.set(false);
    this.bienService.getMesBiens().subscribe({
      next: biens => {
        this.biens.set(biens);
        this.chargement.set(false);
      },
      error: () => {
        this.chargement.set(false);
        this.erreur.set(true);
      },
    });
  }

  statut(b: BienDTO): string {
    return b.archive ? 'Archivé' : b.locataire ? 'Loué' : 'Vacant';
  }

  classe(b: BienDTO): string {
    return b.archive ? 'kp-statut' : b.locataire ? 'kp-statut kp-statut--ok' : 'kp-statut kp-statut--attention';
  }
}
