import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe, Location } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BienService } from '../../services/bien.service';
import { BienDTO, BienType, ModeChauffage } from '../../models/bien.model';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { IconComponent } from '../../../../shared/components/icon/icon.component';

@Component({
  selector: 'kp-bien-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    DatePipe,
    IconComponent,
  ],
  templateUrl: './bien-detail.component.html',
  styleUrls: ['./bien-detail.component.scss'],
})
export class BienDetailComponent implements OnInit {
  readonly router = inject(Router);
  private route = inject(ActivatedRoute);
  private bienService = inject(BienService);
  private authService = inject(AuthService);
  private location = inject(Location);
  private snackBar = inject(MatSnackBar);

  bien = signal<BienDTO | null>(null);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  // ── Computed ─────────────────────────────────────────────────────────────
  isProRoute = computed(() => this.router.url.startsWith('/pro/biens'));

  isOwner = computed(() => {
    const userId = this.authService.currentUser()?.id;
    const bienProprietaireId = this.bien()?.proprietaire?.id;
    return userId != null && userId === bienProprietaireId;
  });

  isLocataire = computed(() => {
    const userId = this.authService.currentUser()?.id;
    return userId != null && userId === this.bien()?.locataire?.id;
  });

  isLocataireRole = computed(() => this.authService.currentUser()?.role === 'ROLE_LOCATAIRE');

  isConnected = computed(() => this.authService.currentUser() != null);

  hasLocataire = computed(() => !!this.bien()?.locataire);

  gestionLink = computed(() => {
    if (this.isOwner()) return `/pro/logements/${this.bien()?.id}`;
    if (this.isLocataire()) return `/loc/logements/${this.bien()?.id}`;
    return null;
  });

  messagerieLink = computed(() => {
    const role = this.authService.currentUser()?.role;
    if (role === 'ROLE_PROPRIETAIRE') return '/pro/messagerie';
    if (role === 'ROLE_LOCATAIRE') return '/loc/messagerie';
    return '/auth/login';
  });

  messagerieQueryParams = computed(() => {
    const bien = this.bien();
    if (!bien) return {};
    if (!this.isOwner()) {
      return { bienId: bien.id, interlocuteur: bien.proprietaire.mail };
    }
    if (this.isOwner() && bien.locataire) {
      return { bienId: bien.id, interlocuteur: bien.locataire.mail };
    }
    return {};
  });

  assignerLink = computed(() => `/pro/biens/${this.bien()?.id}/assigner`);

  galleryImages = computed(() => {
    const images = this.bien()?.images ?? [];
    return Array.from({ length: 5 }, (_, i) => images[i] ?? null);
  });

  refTag = computed(() => {
    const id = this.bien()?.id;
    return id ? `KPG-${String(id).padStart(4, '0')}` : '';
  });

  statutVariant = computed<'olive' | 'amber' | 'red' | 'mint'>(() => {
    return this.hasLocataire() ? 'olive' : 'amber';
  });

  statutText = computed(() => {
    return this.hasLocataire() ? 'Loué' : 'Disponible';
  });

  typeBienLabel = computed(() => {
    const map: Record<BienType, string> = {
      APPARTEMENT: 'Appartement',
      MAISON: 'Maison',
      STUDIO: 'Studio',
      VILLA: 'Villa',
      BUREAU: 'Bureau',
      COMMERCE: 'Commerce',
    };
    return map[this.bien()?.typeBien ?? 'APPARTEMENT'] ?? this.bien()?.typeBien;
  });

  totalMensuel = computed(() => {
    const loyer = this.bien()?.loyerMensuel ?? 0;
    const charges = this.bien()?.chargesMensuelles ?? 0;
    return loyer + charges;
  });

  goBack(): void {
    this.location.back();
  }

  chauffageLabel(mode: ModeChauffage): string {
    const map: Record<ModeChauffage, string> = {
      ELECTRIQUE: 'Électrique',
      GAZ: 'Gaz',
      FIOUL: 'Fioul',
      BOIS: 'Bois',
      POMPE_A_CHALEUR: 'Pompe à chaleur',
      POELE: 'Poêle',
      COLLECTIF: 'Collectif',
      SANS_CHAUFFAGE: 'Sans chauffage',
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
