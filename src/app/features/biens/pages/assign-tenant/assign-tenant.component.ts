import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { BienService } from '../../services/bien.service';
import { BienDTO, UserDTO } from '../../models/bien.model';
import { IconComponent } from '../../../../shared/components/icon/icon.component';

@Component({
  selector: 'kp-assign-tenant',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, IconComponent],
  templateUrl: './assign-tenant.component.html',
  styleUrls: ['./assign-tenant.component.scss'],
})
export class AssignTenantComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private bienService = inject(BienService);
  private snackBar = inject(MatSnackBar);

  bien = signal<BienDTO | null>(null);
  candidates = signal<UserDTO[]>([]);
  loading = signal(true);
  searching = signal(false);
  assigningId = signal<number | null>(null);
  searchDone = signal(false);

  searchCtrl = new FormControl('');

  bienId = signal(0);

  totalMensuel = computed(() => {
    const b = this.bien();
    if (!b) return 0;
    return (b.loyerMensuel ?? 0) + (b.chargesMensuelles ?? 0);
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.bienId.set(id);

    this.bienService.getById(id).subscribe({
      next: (b) => {
        this.bien.set(b);
        this.loading.set(false);
        this.doSearch('');
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Impossible de charger le bien', 'Fermer', { duration: 4000 });
        this.goBack();
      },
    });

    this.searchCtrl.valueChanges.pipe(
      debounceTime(350),
      distinctUntilChanged(),
    ).subscribe(v => this.doSearch(v ?? ''));
  }

  doSearch(query: string): void {
    const parts = query.trim().split(/\s+/);
    this.searching.set(true);
    this.bienService.rechercheLocataire(this.bienId(), {
      firstName: parts[0] || undefined,
      lastName: parts[1] || undefined,
      page: 0,
      size: 20,
    }).subscribe({
      next: (page) => {
        this.candidates.set(page.contenu);
        this.searching.set(false);
        this.searchDone.set(true);
      },
      error: () => {
        this.searching.set(false);
        this.snackBar.open('Erreur lors de la recherche', 'Fermer', { duration: 3000 });
      },
    });
  }

  assign(candidate: UserDTO, event: Event): void {
    event.stopPropagation();
    this.assigningId.set(candidate.id);
    this.bienService.assignerLocataire(this.bienId(), candidate.id).subscribe({
      next: () => {
        this.snackBar.open(
          `${candidate.firstName} ${candidate.lastName} a été assigné`,
          'Voir le logement',
          { duration: 4500 }
        );
        this.assigningId.set(null);
        this.router.navigate(['/pro/logements', this.bienId()]);
      },
      error: (err: HttpErrorResponse) => {
        this.assigningId.set(null);
        const msg = err.status === 409
          ? 'Ce bien a déjà un locataire'
          : "Erreur lors de l'assignation";
        this.snackBar.open(msg, 'Fermer', { duration: 4000 });
      },
    });
  }

  goBack(): void {
    this.location.back();
  }

  initials(u: UserDTO): string {
    return `${u.firstName[0] ?? ''}${u.lastName[0] ?? ''}`.toUpperCase();
  }
}
