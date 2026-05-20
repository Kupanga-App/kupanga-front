import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BienService } from './services/bien.service';
import { BienDTO, BienFilters, BienSearchDTO, BienType } from './models/bien.model';
import { AuthService } from '../../core/auth/services/auth.service';
import { BiensFilterBarComponent } from './components/biens-filter-bar/biens-filter-bar.component';
import { BienCardComponent } from './components/bien-card/bien-card.component';
import { BienCardSkeletonComponent } from './components/bien-card-skeleton/bien-card-skeleton.component';

@Component({
  selector: 'app-biens',
  standalone: true,
  imports: [
    RouterModule,
    LucideAngularModule,
    BiensFilterBarComponent,
    BienCardComponent,
    BienCardSkeletonComponent,
  ],
  templateUrl: './biens.component.html',
  styleUrls: ['./biens.component.scss'],
})
export class BiensComponent implements OnInit {
  private bienService = inject(BienService);
  private router      = inject(Router);
  private snackBar    = inject(MatSnackBar);
  private authService = inject(AuthService);

  filters      = signal<BienFilters>({ sortBy: 'date_desc' });
  viewMode     = signal<'grid' | 'list' | 'map'>('grid');
  isLoading    = signal(false);
  totalPages   = signal(0);
  pageActuelle = signal(0);

  private rawBiens = signal<BienDTO[]>([]);

  // /pro/biens → "Mes biens" (getMesBiens), /pro → "Explorer les biens" (search public)
  isProBiensRoute = computed(() => this.router.url.startsWith('/pro/biens'));
  isProHomeRoute  = computed(() => /^\/pro\/?$/.test(this.router.url));
  isProRoute      = computed(() => this.router.url.startsWith('/pro'));
  isProprietaire  = computed(() => this.authService.currentUser()?.role === 'ROLE_PROPRIETAIRE');

  biens = computed(() => {
    const f = this.filters();
    let result = this.rawBiens();

    if (f.pois?.length) {
      result = result.filter(b => f.pois!.every(p => (b.pois ?? []).includes(p)));
    }
    if (f.nbChambresMin) {
      result = result.filter(b => (b.nombreChambres ?? 0) >= f.nbChambresMin!);
    }
    if (f.classeEnergieMax) {
      const classes = ['A','B','C','D','E','F','G'];
      const maxIdx = classes.indexOf(f.classeEnergieMax);
      result = result.filter(b =>
        b.classeEnergie ? classes.indexOf(b.classeEnergie) <= maxIdx : true
      );
    }
    return result;
  });

  totalCount  = computed(() => this.biens().length);
  vacantCount = computed(() => this.biens().filter(b => b.locataire == null).length);
  hasResults  = computed(() => this.biens().length > 0);
  pages       = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i));
  skeletons = [1, 2, 3, 4, 5, 6];

  ngOnInit(): void {
    if (this.isProBiensRoute()) {
      this.loadMesBiens();
    } else {
      this.loadBiens();
    }
  }

  private loadMesBiens(): void {
    this.isLoading.set(true);
    this.bienService.getMesBiens().subscribe({
      next: data => { this.rawBiens.set(data); this.isLoading.set(false); },
      error: () => {
        this.isLoading.set(false);
        this.snackBar.open('Erreur lors du chargement de vos biens', 'Fermer', { duration: 3000 });
      },
    });
  }

  loadBiens(): void {
    this.isLoading.set(true);
    const f   = this.filters();
    const dto: BienSearchDTO = { page: this.pageActuelle(), size: 20 };

    if (f.q)        dto.titre     = f.q;
    if (f.typeBien) dto.typesBien  = [f.typeBien as BienType];
    if (f.ville)    dto.villes     = [f.ville];
    if (f.loyerMax)  dto.loyerMax  = f.loyerMax;
    if (f.surfaceMin) dto.surfaceMin = f.surfaceMin;
    if (f.nbPiecesMin) dto.piecesMin = f.nbPiecesMin;
    if (f.meuble    != null) dto.meuble    = f.meuble;
    if (f.colocation != null) dto.colocation = f.colocation;
    if (f.ascenseur  != null) dto.ascenseur  = f.ascenseur;

    switch (f.sortBy) {
      case 'date_desc':    dto.sortBy = 'createdAt';      dto.sortDirection = 'DESC'; break;
      case 'date_asc':     dto.sortBy = 'createdAt';      dto.sortDirection = 'ASC';  break;
      case 'prix_asc':     dto.sortBy = 'loyerMensuel';   dto.sortDirection = 'ASC';  break;
      case 'prix_desc':    dto.sortBy = 'loyerMensuel';   dto.sortDirection = 'DESC'; break;
      case 'surface_desc': dto.sortBy = 'surfaceHabitable'; dto.sortDirection = 'DESC'; break;
      default:             dto.sortBy = 'createdAt';      dto.sortDirection = 'DESC';
    }

    this.bienService.search(dto).subscribe({
      next: page => {
        this.rawBiens.set(page.contenu);
        this.totalPages.set(page.totalPages);
        this.pageActuelle.set(page.pageActuelle);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.snackBar.open('Impossible de charger les biens.', 'Fermer', {
          duration: 5000,
          panelClass: ['snack-error'],
        });
      },
    });
  }

  onFiltersChange(f: BienFilters): void {
    this.filters.set(f);
    this.pageActuelle.set(0);
    if (!this.isProBiensRoute()) this.loadBiens();
  }

  onViewModeChange(m: 'grid' | 'list' | 'map'): void { this.viewMode.set(m); }

  navigateToBien(id: number): void {
    const base = this.isProBiensRoute() ? '/pro/biens' : '/biens';
    this.router.navigate([base, id]);
  }

  goToPage(page: number): void {
    this.pageActuelle.set(page);
    this.loadBiens();
  }
}
