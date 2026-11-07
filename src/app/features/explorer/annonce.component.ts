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
import { AvatarComponent } from '../../shared/ui/avatar.component';
import { VideComponent } from '../../shared/ui/vide.component';
import { GalerieComponent } from '../../shared/ui/galerie.component';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { CarteBienComponent } from '../../shared/components/carte-bien/carte-bien.component';
import { LieuxProchesComponent } from '../../shared/ui/lieux-proches.component';
import { ClasseEnergieComponent } from '../../shared/ui/classe-energie.component';
import { JuridictionService } from '../biens/services/juridiction.service';
import { JuridictionConfig } from '../biens/models/juridiction.model';

/** Nombre de photos de la mosaïque : une grande et quatre petites. */
const MOSAIQUE = 5;

/**
 * Annonce publique (sans compte) : `GET /biens/{id}`, propriétaire réduit au prénom et à l'initiale (P0-6).
 * Maquettes `Annonce-France` et `Annonce-RDC` : même gabarit pour les deux pays (mosaïque de photos, colonne
 * principale, carte collée à droite avec le prix et « Contacter »).
 */
@Component({
  selector: 'kp-annonce',
  standalone: true,
  imports: [RouterLink, MontantPipe, DateLonguePipe, AvatarComponent, VideComponent, GalerieComponent, IconComponent, CarteBienComponent, LieuxProchesComponent, ClasseEnergieComponent],
  templateUrl: './annonce.component.html',
  styleUrl: './annonce.component.scss',
})
export class AnnonceComponent implements OnInit {
  /** Paramètre de route `:id`. */
  readonly id = input.required<string>();

  private bienService = inject(BienService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private juridictions = inject(JuridictionService);

  readonly bien = signal<BienDTO | null>(null);
  readonly chargement = signal(true);
  readonly introuvable = signal(false);
  readonly erreur = signal(false);
  /** Champs du pays du bien (`GET /juridictions/{pays}`, déjà lu par le formulaire du bien, gardé en cache). */
  readonly juridiction = signal<JuridictionConfig | null>(null);

  readonly typeBien = computed(() => libelleTypeBien(this.bien()?.typeBien));
  /** « Appartement · loué vide », « Studio · meublé ». */
  readonly typeEtLocation = computed(() => {
    const b = this.bien();
    if (!b) return '';
    const location = b.meuble ? 'meublé' : b.pays === 'FR' || b.pays === 'BE' ? 'loué vide' : '';
    return [this.typeBien(), location, b.colocation ? 'colocation' : ''].filter(Boolean).join(' · ');
  });
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
  /** « Claire M. » : prénom et initiale de la vue publique (l'initiale arrive avec ou sans point). */
  readonly nomProprietaire = computed(() => {
    const p = this.bien()?.proprietaire;
    if (!p) return '';
    const initiale = (p.lastName ?? '').replace(/\.+$/, '').trim();
    return [p.firstName ?? '', initiale ? `${initiale}.` : ''].filter(Boolean).join(' ');
  });
  readonly disponibleMaintenant = computed(() => {
    const j = joursAvant(this.bien()?.disponibleDe);
    return j === null || j <= 0;
  });

  /** Champ prévu dans le pays du bien (sans configuration, on s'en tient aux valeurs présentes). */
  visible(champ: string): boolean {
    return !this.juridiction()?.champsMasques?.includes(champ);
  }

  /** RDC : « Garantie 3 mois · 12 mois d’avance ». */
  readonly garantieEtAvance = computed(() => {
    const b = this.bien();
    if (!b) return '';
    return [
      b.garantieMois && this.visible('garantieMois') ? `Garantie ${b.garantieMois} mois` : '',
      b.avanceMois && this.visible('avanceMois') ? `${b.avanceMois} mois d’avance` : '',
    ].filter(Boolean).join(' · ');
  });
  /** Montant de la garantie en mois (loyer × mois), affiché sous les conditions. */
  readonly montantGarantie = computed(() => {
    const b = this.bien();
    return b?.garantieMois && b.loyerMensuel ? b.garantieMois * b.loyerMensuel : null;
  });

  readonly photos = computed(() => this.bien()?.images ?? []);
  /** Photos de la mosaïque (ordinateur) : cinq au plus, la dernière ouvre la galerie. */
  readonly mosaique = computed(() => this.photos().slice(0, MOSAIQUE));

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
        if (bien.pays) {
          this.juridictions.configuration(bien.pays).subscribe({ next: c => this.juridiction.set(c), error: () => undefined });
        }
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
