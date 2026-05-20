import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { switchMap } from 'rxjs/operators';

import { GestionLogementService } from '../../services/gestion-logement.service';
import { ContratService } from '../../services/contrat.service';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { ContratDTO, ContratStatut } from '../../models/contrat.model';
import { SignaturePadComponent } from '../../../../shared/components/signature-pad/signature-pad.component';

@Component({
  selector: 'kp-contrat-logement',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    SignaturePadComponent,
  ],
  templateUrl: './contrat-logement.component.html',
  styleUrls: ['./contrat-logement.component.scss'],
})
export class ContratLogementComponent implements OnInit {
  private gestion = inject(GestionLogementService);
  private contratService = inject(ContratService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  readonly bien = this.gestion.bien;

  readonly isProprietaire = computed(
    () => this.authService.currentUser()?.role === 'ROLE_PROPRIETAIRE'
  );

  readonly contrat = signal<ContratDTO | null>(null);
  readonly loading = signal(false);
  readonly signing = signal(false);
  readonly signatureBase64 = signal('');

  readonly statut = computed<ContratStatut | null>(() => this.contrat()?.statut ?? null);

  ngOnInit(): void {
    this.loadContrat();
  }

  signerProprio(): void {
    const sig = this.signatureBase64();
    if (!sig || !this.contrat()) return;
    this.signing.set(true);
    this.contratService
      .signerProprio(this.contrat()!.id, sig)
      .pipe(switchMap(() => this.contratService.getByBien(this.bien()!.id)))
      .subscribe({
        next: (contrats) => {
          const current = contrats[0] ?? null;
          this.contrat.set(current);
          this.gestion.setContrat(current);
          this.signing.set(false);
          this.signatureBase64.set('');
        },
        error: () => {
          this.snackBar.open('Erreur lors de la signature', 'Fermer', { duration: 4000 });
          this.signing.set(false);
        },
      });
  }

  navigateToNew(): void {
    this.gestion.activeView.set('contrat-new');
  }

  onSignatureChange(val: string): void {
    this.signatureBase64.set(val);
  }

  private loadContrat(): void {
    const bienId = this.bien()?.id;
    if (!bienId) return;

    this.loading.set(true);
    this.contratService.getByBien(bienId).subscribe({
      next: (contrats) => {
        const current = contrats[0] ?? null;
        this.contrat.set(current);
        this.gestion.setContrat(current);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }
}
