import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { EdlService } from '../../../gestion-logement/services/edl.service';
import { EtatDesLieuxDTO } from '../../../gestion-logement/models/edl.model';
import { SignaturePadComponent } from '../../../../shared/components/signature-pad/signature-pad.component';

@Component({
  selector: 'kp-edl-signer',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    SignaturePadComponent,
  ],
  templateUrl: './edl-signer.component.html',
  styleUrls: ['./edl-signer.component.scss'],
})
export class EdlSignerComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private edlService = inject(EdlService);

  readonly edl = signal<EtatDesLieuxDTO | null>(null);
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
    this.edlService.getByToken(this.token).subscribe({
      next: (e) => {
        this.edl.set(e);
        this.loading.set(false);
      },
      error: () => {
        this.error.set("État des lieux introuvable ou lien expiré");
        this.loading.set(false);
      },
    });
  }

  signer(): void {
    const sig = this.signatureBase64();
    if (!sig) return;
    this.signing.set(true);
    this.edlService.signerByToken(this.token, sig).subscribe({
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

  etatLabel(e: string): string {
    const map: Record<string, string> = {
      BON: 'Bon état',
      USAGE_NORMAL: 'Usage normal',
      MAUVAIS: 'Mauvais état',
      HORS_SERVICE: 'Hors service',
    };
    return map[e] ?? e;
  }
}
