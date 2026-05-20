import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ContratService } from '../../../gestion-logement/services/contrat.service';
import { ContratDTO } from '../../../gestion-logement/models/contrat.model';
import { SignaturePadComponent } from '../../../../shared/components/signature-pad/signature-pad.component';

@Component({
  selector: 'kp-contrat-signer',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    SignaturePadComponent,
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
      error: () => {
        this.error.set('Contrat introuvable ou lien expiré');
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
      error: () => {
        this.error.set('Erreur lors de la signature');
        this.signing.set(false);
      },
    });
  }

  onSignatureChange(val: string): void {
    this.signatureBase64.set(val);
  }
}
