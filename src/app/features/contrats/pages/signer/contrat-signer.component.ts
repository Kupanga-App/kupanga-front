import { Component, OnInit, inject, signal } from '@angular/core';
import { MontantPipe } from '../../../../core/money/montant';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ContratService } from '../../../gestion-logement/services/contrat.service';
import { ContratDTO } from '../../../gestion-logement/models/contrat.model';
import { SignaturePadComponent } from '../../../../shared/components/signature-pad/signature-pad.component';
import { messageLienSignature } from '../../../../core/http/api-error';

@Component({
  selector: 'kp-contrat-signer',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    SignaturePadComponent, MontantPipe
  ],
  templateUrl: './contrat-signer.component.html',
  styleUrls: ['./contrat-signer.component.scss'],
})
export class ContratSignerComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private contratService = inject(ContratService);

  readonly contrat = signal<ContratDTO | null>(null);
  readonly loading = signal(true);
  readonly signing = signal(false);
  readonly signed = signal(false);
  readonly error = signal<string | null>(null);
  readonly signatureBase64 = signal('');

  private token = '';

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') ?? '';
    if (!this.token) {
      this.error.set('Lien invalide');
      this.loading.set(false);
      return;
    }
    this.contratService.getByToken(this.token).subscribe({
      next: (c) => {
        this.contrat.set(c);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(messageLienSignature(err, 'Contrat introuvable ou lien expiré'));
        this.loading.set(false);
      },
    });
  }

  signer(): void {
    const sig = this.signatureBase64();
    if (!sig) return;
    this.signing.set(true);
    this.contratService.signerByToken(this.token, sig).subscribe({
      next: () => {
        this.signing.set(false);
        this.signed.set(true);
      },
      error: (err) => {
        this.error.set(messageLienSignature(err, 'Erreur lors de la signature'));
        this.signing.set(false);
      },
    });
  }

  onSignatureChange(val: string): void {
    this.signatureBase64.set(val);
  }
}
