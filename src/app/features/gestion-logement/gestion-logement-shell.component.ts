import { Component, OnInit, computed, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { IconComponent } from '../../shared/components/icon/icon.component';

import { BienService } from '../biens/services/bien.service';
import { AuthService } from '../../core/auth/services/auth.service';
import { GestionLogementService } from './services/gestion-logement.service';
import { ContratService } from './services/contrat.service';
import { EdlService } from './services/edl.service';
import { QuittanceService } from './services/quittance.service';
import { ContratStatut } from './models/contrat.model';
import { ResumeLogementComponent } from './pages/resume/resume-logement.component';
import { ContratLogementComponent } from './pages/contrat/contrat-logement.component';
import { EdlLogementComponent } from './pages/edl/edl-logement.component';
import { QuittancesLogementComponent } from './pages/quittances/quittances-logement.component';
import { DocumentsLogementComponent } from './pages/documents/documents-logement.component';
import { ContratNewComponent } from './pages/contrat/new/contrat-new.component';
import { EdlNewComponent } from './pages/edl/new/edl-new.component';
import { QuittanceNewComponent } from './pages/quittances/new/quittance-new.component';

@Component({
  selector: 'kp-gestion-logement-shell',
  standalone: true,
  providers: [GestionLogementService],
  imports: [
    CommonModule,
    RouterModule,
    MatTabsModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    ResumeLogementComponent,
    ContratLogementComponent,
    EdlLogementComponent,
    QuittancesLogementComponent,
    DocumentsLogementComponent,
    ContratNewComponent,
    EdlNewComponent,
    QuittanceNewComponent,
    IconComponent,
  ],
  templateUrl: './gestion-logement-shell.component.html',
  styleUrls: ['./gestion-logement-shell.component.scss'],
})
export class GestionLogementShellComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private bienService = inject(BienService);
  private contratService = inject(ContratService);
  private edlService = inject(EdlService);
  private quittanceService = inject(QuittanceService);
  private location = inject(Location);
  readonly authService = inject(AuthService);
  readonly gestion = inject(GestionLogementService);

  readonly bien = this.gestion.bien;
  readonly loading = this.gestion.loading;
  readonly error = this.gestion.error;
  readonly contratStatut = this.gestion.contratStatut;

  readonly refTag = computed(() => {
    const id = this.bien()?.id;
    return id ? `KPG-${String(id).padStart(4, '0')}` : '';
  });

  readonly hasLocataire = computed(() => !!this.bien()?.locataire);

  readonly totalMensuel = computed(() => {
    const b = this.bien();
    if (!b) return 0;
    return (b.loyerMensuel ?? 0) + (b.chargesMensuelles ?? 0);
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('bienId'));
    if (isNaN(id)) {
      this.gestion.error.set('Identifiant invalide');
      return;
    }
    this.gestion.loading.set(true);
    this.bienService.getById(id).pipe(
      switchMap((bien) => {
        this.gestion.setBien(bien);
        return forkJoin({
          contrats:    this.contratService.getByBien(id),
          edls:        this.edlService.getByBien(id),
          quittances:  this.quittanceService.getByBien(id),
        });
      }),
    ).subscribe({
      next: ({ contrats, edls, quittances }) => {
        this.gestion.contratCount.set(contrats.length);
        this.gestion.edlCount.set(edls.length);
        this.gestion.quittanceCount.set(quittances.length);
        if (contrats.length > 0) this.gestion.setContrat(contrats[0]);
        this.gestion.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        const msg =
          err.status === 404 ? 'Bien introuvable' :
          err.status === 403 ? 'Accès refusé' :
          'Erreur de chargement';
        this.gestion.error.set(msg);
        this.gestion.loading.set(false);
      },
    });
  }

  goBack(): void {
    this.location.back();
  }

  statutLabel(statut: ContratStatut | null): string {
    switch (statut) {
      case 'EN_ATTENTE_SIGNATURE_PROPRIO':
        return 'En attente — propriétaire';
      case 'EN_ATTENTE_SIGNATURE_LOCATAIRE':
        return 'En attente — locataire';
      case 'SIGNE':
        return 'Contrat signé';
      default:
        return 'Sans contrat';
    }
  }

  statutClass(statut: ContratStatut | null): string {
    switch (statut) {
      case 'SIGNE':
        return 'kp-badge-success';
      case 'EN_ATTENTE_SIGNATURE_PROPRIO':
      case 'EN_ATTENTE_SIGNATURE_LOCATAIRE':
        return 'kp-badge-pending';
      default:
        return 'kp-badge-inactive';
    }
  }
}
