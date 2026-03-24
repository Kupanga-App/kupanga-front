import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { HttpErrorResponse } from '@angular/common/http';
import { BienService } from '../../services/bien.service';
import { BienDTO, ModeChauffage } from '../../models/bien.model';
import { AuthService } from '../../../../core/auth/services/auth.service';

@Component({
  selector: 'kp-bien-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, MatIconModule, DatePipe],
  templateUrl: './bien-detail.component.html',
  styleUrls: ['./bien-detail.component.scss'],
})
export class BienDetailComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private bienService = inject(BienService);
  private authService = inject(AuthService);

  bien = signal<BienDTO | null>(null);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  isProRoute = computed(() => this.router.url.startsWith('/pro'));
  isProprietaire = computed(() =>
    this.authService.currentUser()?.role === 'ROLE_PROPRIETAIRE'
  );

  chauffageLabel(mode: ModeChauffage): string {
    const map: Record<ModeChauffage, string> = {
      ELECTRIQUE:      'Électrique',
      GAZ:             'Gaz',
      FIOUL:           'Fioul',
      BOIS:            'Bois',
      POMPE_A_CHALEUR: 'Pompe à chaleur',
      POELE:           'Poêle',
      COLLECTIF:       'Collectif',
      SANS_CHAUFFAGE:  'Sans chauffage',
    };
    return map[mode] ?? mode;
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (isNaN(id)) {
      this.error.set('Identifiant invalide');
      this.loading.set(false);
      return;
    }
    this.bienService.getById(id).subscribe({
      next: (data) => {
        this.bien.set(data);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 403) {
          this.error.set('Accès refusé à ce bien');
        } else if (err.status === 404) {
          this.error.set('Bien introuvable');
        } else {
          this.error.set('Erreur lors du chargement');
        }
        this.loading.set(false);
      },
    });
  }
}
