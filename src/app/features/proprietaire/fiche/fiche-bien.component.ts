import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { BienService } from '../../biens/services/bien.service';
import { ContratService } from '../../gestion-logement/services/contrat.service';
import { EdlService } from '../../gestion-logement/services/edl.service';
import { QuittanceService } from '../../gestion-logement/services/quittance.service';
import { BienDTO, LIBELLES_EQUIPEMENT, adresseLisible, libelleTypeBien, positionApproximative } from '../../biens/models/bien.model';
import { ContratDTO } from '../../gestion-logement/models/contrat.model';
import { EtatDesLieuxDTO } from '../../gestion-logement/models/edl.model';
import { QuittanceDTO } from '../../gestion-logement/models/quittance.model';
import { MontantPipe } from '../../../core/money/montant';
import { lienAppel } from '../../../core/telephone/telephone';
import { DateLonguePipe, Statut, moisAnnee, statutQuittance, statutSignature } from '../../../shared/format';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { SheetComponent } from '../../../shared/ui/sheet.component';
import { GalerieComponent } from '../../../shared/ui/galerie.component';
import { AvatarComponent } from '../../../shared/ui/avatar.component';
import { StatutComponent } from '../../../shared/ui/statut.component';
import { VideComponent } from '../../../shared/ui/vide.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { CarteBienComponent } from '../../../shared/components/carte-bien/carte-bien.component';

/**
 * Fiche d'un bien du propriétaire : photos, statut, locataire et contact, raccourcis Bail / États des lieux /
 * Quittances, actions dans une feuille (AUDIT.md §8.4).
 */
@Component({
  selector: 'kp-fiche-bien',
  standalone: true,
  imports: [
    RouterLink, MontantPipe, DateLonguePipe, PageHeaderComponent, SheetComponent, GalerieComponent, AvatarComponent,
    StatutComponent, VideComponent, IconComponent, CarteBienComponent,
  ],
  templateUrl: './fiche-bien.component.html',
  styleUrl: './fiche-bien.component.scss',
})
export class FicheBienComponent implements OnInit {
  readonly id = input.required<string>();

  private bienService = inject(BienService);
  private contratService = inject(ContratService);
  private edlService = inject(EdlService);
  private quittanceService = inject(QuittanceService);
  private router = inject(Router);

  readonly bien = signal<BienDTO | null>(null);
  readonly contrats = signal<ContratDTO[]>([]);
  readonly edls = signal<EtatDesLieuxDTO[]>([]);
  readonly quittances = signal<QuittanceDTO[]>([]);
  readonly chargement = signal(true);
  readonly erreur = signal<string | null>(null);
  readonly actionsOuvertes = signal(false);

  readonly lienAppel = lienAppel;

  readonly bail = computed(() => this.contrats()[0] ?? null);
  readonly statutBail = computed<Statut | null>(() => {
    const b = this.bail();
    return b ? statutSignature(b.statut, 'proprietaire') : null;
  });
  readonly statutEdl = computed<Statut | null>(() => {
    const e = this.edls()[0];
    return e ? statutSignature(e.statut, 'proprietaire') : null;
  });
  readonly derniereQuittance = computed(() => this.quittances()[0] ?? null);
  readonly statutDerniereQuittance = computed<Statut | null>(() => {
    const q = this.derniereQuittance();
    return q ? statutQuittance(q.statut) : null;
  });
  readonly moisDerniereQuittance = computed(() => {
    const q = this.derniereQuittance();
    return q ? moisAnnee(q.mois, q.annee) : '';
  });

  readonly nomLocataire = computed(() => {
    const l = this.bien()?.locataire;
    return l ? `${l.firstName} ${l.lastName}` : '';
  });
  readonly lienMessage = computed(() => {
    const b = this.bien();
    return b?.locataire ? { bienId: b.id, interlocuteur: b.locataire.mail } : null;
  });
  readonly lienWhatsapp = computed(() => {
    const tel = this.bien()?.locataire?.telephone;
    return tel ? `https://wa.me/${tel.replace(/\D/g, '')}` : null;
  });

  readonly typeBien = computed(() => libelleTypeBien(this.bien()?.typeBien));
  readonly adresse = computed(() => {
    const b = this.bien();
    return b ? adresseLisible(b) : '';
  });
  readonly equipements = computed(() => (this.bien()?.equipements ?? []).map(e => LIBELLES_EQUIPEMENT[e] ?? e));
  readonly positionApprox = computed(() => positionApproximative(this.bien()?.precisionLocalisation));

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    const id = Number(this.id());
    if (!Number.isInteger(id) || id <= 0) {
      this.erreur.set('Ce bien n’existe pas.');
      this.chargement.set(false);
      return;
    }
    this.chargement.set(true);
    this.erreur.set(null);
    forkJoin({
      bien: this.bienService.getPrive(id),
      contrats: this.contratService.getByBien(id).pipe(catchError(() => of([]))),
      edls: this.edlService.getByBien(id).pipe(catchError(() => of([]))),
      quittances: this.quittanceService.getByBien(id).pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ bien, contrats, edls, quittances }) => {
        this.bien.set(bien);
        this.contrats.set(contrats);
        this.edls.set(edls);
        this.quittances.set(quittances);
        this.chargement.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.erreur.set(
          err.status === 404 || err.status === 403 ? 'Ce bien n’existe pas ou ne vous appartient pas.' : 'Vérifiez votre connexion puis réessayez.',
        );
        this.chargement.set(false);
      },
    });
  }

  aller(chemin: unknown[]): void {
    this.actionsOuvertes.set(false);
    void this.router.navigate(chemin);
  }
}
