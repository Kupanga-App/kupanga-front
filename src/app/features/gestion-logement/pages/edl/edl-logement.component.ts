import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { switchMap } from 'rxjs/operators';

import { GestionLogementService } from '../../services/gestion-logement.service';
import { EdlService } from '../../services/edl.service';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { EtatDesLieuxDTO } from '../../models/edl.model';
import { SignaturePadComponent } from '../../../../shared/components/signature-pad/signature-pad.component';

@Component({
  selector: 'kp-edl-logement',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    SignaturePadComponent,
  ],
  templateUrl: './edl-logement.component.html',
  styleUrls: ['./edl-logement.component.scss'],
})
export class EdlLogementComponent implements OnInit {
  private gestion = inject(GestionLogementService);
  private edlService = inject(EdlService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  readonly bien = this.gestion.bien;
  readonly isProprietaire = computed(
    () => this.authService.currentUser()?.role === 'ROLE_PROPRIETAIRE'
  );

  readonly edls = signal<EtatDesLieuxDTO[]>([]);
  readonly loading = signal(false);
  readonly signing = signal(false);
  readonly signingEdlId = signal<number | null>(null);
  readonly signatureBase64 = signal('');

  ngOnInit(): void {
    this.loadEdls();
  }

  navigateToNew(): void {
    this.gestion.activeView.set('edl-new');
  }

  startSigning(id: number): void {
    this.signingEdlId.set(id);
    this.signatureBase64.set('');
  }

  cancelSigning(): void {
    this.signingEdlId.set(null);
    this.signatureBase64.set('');
  }

  signerProprietaire(id: number): void {
    const sig = this.signatureBase64();
    if (!sig) return;
    this.signing.set(true);
    this.edlService
      .signerProprietaire(id, sig)
      .pipe(switchMap(() => this.edlService.getByBien(this.bien()!.id)))
      .subscribe({
        next: (list) => {
          this.edls.set(list);
          this.signing.set(false);
          this.signingEdlId.set(null);
          this.signatureBase64.set('');
          this.snackBar.open('Signé ! Un email a été envoyé au locataire.', 'OK', { duration: 5000 });
        },
        error: () => {
          this.snackBar.open('Erreur lors de la signature', 'Fermer', { duration: 4000 });
          this.signing.set(false);
        },
      });
  }

  onSignatureChange(val: string): void {
    this.signatureBase64.set(val);
  }

  statutLabel(s: string): string {
    switch (s) {
      case 'EN_ATTENTE_SIGNATURE_PROPRIO': return 'Attente signature proprio';
      case 'EN_ATTENTE_SIGNATURE_LOCATAIRE': return 'Attente signature locataire';
      case 'SIGNE': return 'Signé';
      default: return s;
    }
  }

  statutClass(s: string): string {
    switch (s) {
      case 'SIGNE': return 'kp-badge-success';
      case 'EN_ATTENTE_SIGNATURE_PROPRIO': return 'kp-badge-warning';
      case 'EN_ATTENTE_SIGNATURE_LOCATAIRE': return 'kp-badge-info';
      default: return 'kp-badge-inactive';
    }
  }

  private loadEdls(): void {
    const bienId = this.bien()?.id;
    if (!bienId) return;
    this.loading.set(true);
    this.edlService.getByBien(bienId).subscribe({
      next: (list) => {
        this.edls.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }
}
