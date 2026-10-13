import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/services/auth.service';
import { BienService } from '../biens/services/bien.service';
import {
  BienDTO, LIBELLES_CHAUFFAGE, LIBELLES_EQUIPEMENT, ModeChauffage, adresseLisible, libelleTypeBien, positionApproximative,
} from '../biens/models/bien.model';
import { MontantPipe } from '../../core/money/montant';
import { DateLonguePipe, joursAvant } from '../../shared/format';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { AvatarComponent } from '../../shared/ui/avatar.component';
import { VideComponent } from '../../shared/ui/vide.component';
import { GalerieComponent } from '../../shared/ui/galerie.component';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { CarteBienComponent } from '../../shared/components/carte-bien/carte-bien.component';


/** Annonce publique (sans compte) : `GET /biens/{id}`, propriétaire réduit au prénom et à l'initiale (P0-6). */
@Component({
  selector: 'kp-annonce',
  standalone: true,
  imports: [RouterLink, MontantPipe, DateLonguePipe, PageHeaderComponent, AvatarComponent, VideComponent, GalerieComponent, IconComponent, CarteBienComponent],
  templateUrl: './annonce.component.html',
  styleUrl: './annonce.component.scss',
})
export class AnnonceComponent implements OnInit {
  /** Paramètre de route `:id`. */
  readonly id = input.required<string>();

  private bienService = inject(BienService);
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly bien = signal<BienDTO | null>(null);
  readonly chargement = signal(true);
  readonly introuvable = signal(false);
  readonly erreur = signal(false);

  readonly typeBien = computed(() => libelleTypeBien(this.bien()?.typeBien));
  readonly equipements = computed(() => (this.bien()?.equipements ?? []).map(e => LIBELLES_EQUIPEMENT[e] ?? e));
  readonly adresse = computed(() => {
    const b = this.bien();
    return b ? adresseLisible(b) : '';
  });
  readonly lieu = computed(() => {
    const b = this.bien();
    return b ? [b.quartier, b.commune, b.ville].filter(v => v && v.trim()).join(', ') : '';
  });
  readonly positionApprox = computed(() => positionApproximative(this.bien()?.precisionLocalisation));
  readonly nomProprietaire = computed(() => {
    const p = this.bien()?.proprietaire;
    return p ? `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() : '';
  });
  readonly disponibleMaintenant = computed(() => {
    const j = joursAvant(this.bien()?.disponibleDe);
    return j === null || j <= 0;
  });

  ngOnInit(): void {
    const id = Number(this.id());
    if (!Number.isInteger(id) || id <= 0) {
      this.introuvable.set(true);
      this.chargement.set(false);
      return;
    }
    this.bienService.getPublic(id).subscribe({
      next: bien => {
        this.bien.set(bien);
        this.chargement.set(false);
      },
      error: (err: HttpErrorResponse) => {
        // 404 : bien inconnu ou archivé (B12)
        this.introuvable.set(err.status === 404 || err.status === 400);
        this.erreur.set(err.status !== 404 && err.status !== 400);
        this.chargement.set(false);
      },
    });
  }

  chauffage(mode: ModeChauffage | undefined): string {
    return mode ? LIBELLES_CHAUFFAGE[mode] ?? mode : '';
  }

  /** « Contacter » : la messagerie écrit au propriétaire du bien (son e-mail n'est pas public, P0-6). */
  contacter(): void {
    const bien = this.bien();
    if (!bien) return;
    const cible = `/messages?bienId=${bien.id}`;
    if (this.auth.currentUser()) {
      void this.router.navigateByUrl(cible);
    } else {
      void this.router.navigate(['/auth/login'], { queryParams: { returnUrl: cible } });
    }
  }
}
