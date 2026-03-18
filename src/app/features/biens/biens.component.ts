import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BienService } from './services/bien.service';
import { BienDTO, BienSearchDTO, BienType } from './models/bien.model';
import { AuthService } from '../../core/auth/services/auth.service';

@Component({
  selector: 'app-biens',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatMenuModule,
    DatePipe,
  ],
  templateUrl: './biens.component.html',
  styleUrls: ['./biens.component.scss'],
})
export class BiensComponent implements OnInit {
  private bienService = inject(BienService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private authService = inject(AuthService);

  readonly searchSubject = new Subject<string>();

  // State signals
  biens = signal<BienDTO[]>([]);
  loading = signal<boolean>(false);
  totalElements = signal<number>(0);
  totalPages = signal<number>(0);
  pageActuelle = signal<number>(0);
  searchQuery = signal<string>('');
  selectedTypes = signal<BienType[]>([]);
  selectedVille = signal<string>('');
  sortBy = signal<string>('createdAt');
  sortDirection = signal<'ASC' | 'DESC'>('DESC');

  // Computed
  hasResults = computed(() => this.biens().length > 0);
  pages = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i));
  isProRoute = computed(() => {
    const url = this.router.url;
    return url.startsWith('/pro') || url.startsWith('/loc');
  });
  isProprietaire = computed(() =>
    this.authService.currentUser()?.role === 'ROLE_PROPRIETAIRE'
  );

  sortLabel = computed(() => {
    const map: Record<string, string> = {
      'createdAt_DESC': 'Date ↓',
      'createdAt_ASC':  'Date ↑',
      'ville_ASC':      'Ville A→Z',
      'titre_ASC':      'Titre A→Z',
    };
    return map[`${this.sortBy()}_${this.sortDirection()}`] ?? 'Date ↓';
  });

  readonly bienTypes: { value: BienType; label: string }[] = [
    { value: 'APPARTEMENT', label: 'Appartement' },
    { value: 'MAISON',      label: 'Maison' },
    { value: 'STUDIO',      label: 'Studio' },
  ];

  constructor() {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntilDestroyed(),
    ).subscribe((query: string) => this.onSearch(query));
  }

  ngOnInit(): void {
    this.loadBiens();
  }

  loadBiens(): void {
    this.loading.set(true);

    const dto: BienSearchDTO = {
      page:          this.pageActuelle(),
      size:          10,
      sortBy:        this.sortBy(),
      sortDirection: this.sortDirection(),
    };

    const query = this.searchQuery().trim();
    if (query) dto.titre = query;

    const types = this.selectedTypes();
    if (types.length > 0) dto.typesBien = types;

    const ville = this.selectedVille().trim();
    if (ville) dto.villes = [ville];

    this.bienService.search(dto).subscribe({
      next: (page) => {
        this.biens.set(page.contenu);
        this.totalElements.set(page.totalElements);
        this.totalPages.set(page.totalPages);
        this.pageActuelle.set(page.pageActuelle);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Impossible de charger les biens.', 'Fermer', {
          duration: 5000,
          panelClass: ['snack-error'],
        });
      },
    });
  }

  onSearch(query: string): void {
    this.searchQuery.set(query);
    this.pageActuelle.set(0);
    this.loadBiens();
  }

  toggleType(type: BienType): void {
    const current = this.selectedTypes();
    if (current.includes(type)) {
      this.selectedTypes.set(current.filter(t => t !== type));
    } else {
      this.selectedTypes.set([...current, type]);
    }
    this.pageActuelle.set(0);
    this.loadBiens();
  }

  onVilleChange(ville: string): void {
    this.selectedVille.set(ville);
    this.pageActuelle.set(0);
    this.loadBiens();
  }

  onSortChange(field: string, direction: 'ASC' | 'DESC'): void {
    this.sortBy.set(field);
    this.sortDirection.set(direction);
    this.loadBiens();
  }

  goToPage(page: number): void {
    this.pageActuelle.set(page);
    this.loadBiens();
  }

  navigateToBien(id: number): void {
    if (this.isProprietaire()) {
      this.router.navigate(['/pro/biens', id]);
    } else {
      this.router.navigate(['/biens', id]);
    }
  }

  typeBienLabel(type: BienType): string {
    return this.bienTypes.find(t => t.value === type)?.label ?? type;
  }
}
