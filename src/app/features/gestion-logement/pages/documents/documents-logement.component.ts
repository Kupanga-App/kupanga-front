import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { GestionLogementService } from '../../services/gestion-logement.service';
import { ContratService } from '../../services/contrat.service';
import { EdlService } from '../../services/edl.service';
import { QuittanceService } from '../../services/quittance.service';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { ContratDTO, ContratStatut } from '../../models/contrat.model';
import { EtatDesLieuxDTO, EdlStatut, EdlType } from '../../models/edl.model';
import { QuittanceDTO, QuittanceStatut } from '../../models/quittance.model';
import { IconComponent } from '../../../../shared/components/icon/icon.component';

@Component({
  selector: 'kp-documents-logement',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './documents-logement.component.html',
  styleUrls: ['./documents-logement.component.scss'],
})
export class DocumentsLogementComponent implements OnInit {
  private gestion = inject(GestionLogementService);
  private contratService = inject(ContratService);
  private edlService = inject(EdlService);
  private quittanceService = inject(QuittanceService);
  private authService = inject(AuthService);

  private readonly isLocataire = () =>
    this.authService.currentUser()?.role === 'ROLE_LOCATAIRE';

  readonly bienId = computed(() => this.gestion.bien()?.id);
  readonly autresDocuments = computed(() => this.gestion.bien()?.documents ?? []);

  readonly contrats = signal<ContratDTO[]>([]);
  readonly edls = signal<EtatDesLieuxDTO[]>([]);
  readonly quittances = signal<QuittanceDTO[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    const id = this.bienId();
    if (!id) { this.loading.set(false); return; }

    // Pour le locataire, search({ bienId }) n'est pas supporté côté backend :
    // on appelle search({}) qui retourne automatiquement les données de l'utilisateur connecté.
    const locataire = this.isLocataire();

    forkJoin({
      contrats: locataire
        ? this.contratService.search({}).pipe(map(p => p.contenu))
        : this.contratService.getByBien(id),
      edls: locataire
        ? this.edlService.search({}).pipe(map(p => p.contenu))
        : this.edlService.getByBien(id),
      quittances: this.quittanceService.search(locataire ? {} : { bienId: id }).pipe(map(p => p.contenu)),
    }).subscribe({
      next: ({ contrats, edls, quittances }) => {
        this.contrats.set(contrats);
        this.edls.set(edls);
        this.quittances.set(quittances);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger les documents.');
        this.loading.set(false);
      },
    });
  }

  // ── Contrat ──────────────────────────────────────────────────────────────

  contratLabel(c: ContratDTO): string {
    return `Contrat de location — à partir du ${this.formatDate(c.dateDebut)}`;
  }

  contratStatutLabel(s: ContratStatut): string {
    const map: Record<ContratStatut, string> = {
      BROUILLON: 'Brouillon',
      EN_ATTENTE_SIGNATURE_PROPRIO: 'En attente — propriétaire',
      EN_ATTENTE_SIGNATURE_LOCATAIRE: 'En attente — locataire',
      SIGNE: 'Signé',
      EXPIRE: 'Expiré',
      ANNULE: 'Annulé',
    };
    return map[s] ?? s;
  }

  contratBadgeClass(s: ContratStatut): string {
    if (s === 'SIGNE') return 'kp-badge-success';
    if (s === 'EN_ATTENTE_SIGNATURE_PROPRIO' || s === 'EN_ATTENTE_SIGNATURE_LOCATAIRE') return 'kp-badge-pending';
    if (s === 'BROUILLON') return 'kp-badge-info';
    return 'kp-badge-inactive';
  }

  // ── EDL ──────────────────────────────────────────────────────────────────

  edlLabel(e: EtatDesLieuxDTO): string {
    const type = e.type === 'ENTREE' ? 'entrée' : 'sortie';
    return `État des lieux d'${type} — ${this.formatDate(e.dateRealisation)}`;
  }

  edlStatutLabel(s: EdlStatut): string {
    const map: Record<EdlStatut, string> = {
      BROUILLON: 'Brouillon',
      EN_ATTENTE_SIGNATURE_PROPRIO: 'En attente — propriétaire',
      EN_ATTENTE_SIGNATURE_LOCATAIRE: 'En attente — locataire',
      SIGNE: 'Signé',
      EXPIRE: 'Expiré',
    };
    return map[s] ?? s;
  }

  edlBadgeClass(s: EdlStatut): string {
    if (s === 'SIGNE') return 'kp-badge-success';
    if (s === 'EN_ATTENTE_SIGNATURE_PROPRIO' || s === 'EN_ATTENTE_SIGNATURE_LOCATAIRE') return 'kp-badge-pending';
    if (s === 'BROUILLON') return 'kp-badge-info';
    return 'kp-badge-inactive';
  }

  edlTypeClass(type: EdlType): string {
    return type === 'ENTREE' ? 'kp-badge-info' : 'kp-badge-pending';
  }

  // ── Quittance ────────────────────────────────────────────────────────────

  quittanceLabel(q: QuittanceDTO): string {
    return `Quittance de loyer — ${q.moisLabel} ${q.annee}`;
  }

  quittanceStatutLabel(s: QuittanceStatut): string {
    const map: Record<QuittanceStatut, string> = {
      EN_ATTENTE: 'En attente',
      PAYEE: 'Payée',
      EN_RETARD: 'En retard',
      IMPAYEE: 'Impayée',
    };
    return map[s] ?? s;
  }

  quittanceBadgeClass(s: QuittanceStatut): string {
    if (s === 'PAYEE') return 'kp-badge-success';
    if (s === 'EN_ATTENTE') return 'kp-badge-pending';
    if (s === 'EN_RETARD' || s === 'IMPAYEE') return 'kp-badge-danger';
    return 'kp-badge-inactive';
  }

  // ── Autres ───────────────────────────────────────────────────────────────

  fileName(url: string): string {
    return decodeURIComponent(url.split('/').pop() ?? url);
  }

  // ── Shared ───────────────────────────────────────────────────────────────

  private formatDate(iso: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  }
}
