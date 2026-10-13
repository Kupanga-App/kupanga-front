import { Component, DestroyRef, OnInit, inject, input, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { BienService } from '../../services/bien.service';
import { BienDTO, UserDTO } from '../../models/bien.model';
import { LogementContextService } from '../../../../core/services/logement-context.service';
import { messageErreurApi } from '../../../../core/http/api-error';
import { ToastService } from '../../../../core/ui/toast.service';
import { PageHeaderComponent } from '../../../../shared/ui/page-header.component';
import { SheetComponent } from '../../../../shared/ui/sheet.component';
import { AvatarComponent } from '../../../../shared/ui/avatar.component';
import { VideComponent } from '../../../../shared/ui/vide.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';

/**
 * Choix du locataire parmi les personnes qui ont écrit au propriétaire au sujet de ce bien (W1 : l'API refuse
 * tout autre compte en 404).
 */
@Component({
  selector: 'app-assign-tenant',
  standalone: true,
  imports: [RouterLink, PageHeaderComponent, SheetComponent, AvatarComponent, VideComponent, IconComponent],
  template: `
    <div class="kp-page kp-page--etroite">
      <kp-page-header titre="Choisir le locataire" [sousTitre]="bien()?.titre" [retour]="['/biens', id()]" />

      <p class="kp-muted intro">Les personnes qui vous ont écrit au sujet de ce bien.</p>

      <label class="recherche">
        <kp-icon name="search" [size]="18" />
        <span class="kp-sr-only">Rechercher par nom</span>
        <input class="kp-input" type="search" placeholder="Rechercher par nom" (input)="saisie.next($any($event.target).value)" />
      </label>

      @if (recherche()) {
        <div class="kp-stack kp-stack--sm" aria-busy="true">
          <span class="kp-skeleton kp-skeleton--carte"></span>
          <span class="kp-skeleton kp-skeleton--carte"></span>
        </div>
      } @else if (erreur()) {
        <kp-vide icone="wifi-off" titre="Recherche impossible" [texte]="erreur()">
          <button type="button" class="kp-btn kp-btn--secondary" (click)="chercher('')">Réessayer</button>
        </kp-vide>
      } @else if (!candidats().length) {
        <kp-vide icone="message-circle" titre="Personne pour l’instant"
                 texte="Quand quelqu’un vous écrira depuis l’annonce, vous pourrez le choisir ici.">
          <a class="kp-btn kp-btn--secondary" [routerLink]="['/annonces', id()]">Voir l’annonce</a>
        </kp-vide>
      } @else {
        <ul class="kp-list">
          @for (c of candidats(); track c.id) {
            <li>
              <button type="button" class="kp-list__item" (click)="aConfirmer.set(c)">
                <kp-avatar [photo]="c.urlProfile" [nom]="c.firstName + ' ' + c.lastName" />
                <span class="kp-list__body">
                  <span class="kp-list__title">{{ c.firstName }} {{ c.lastName }}</span>
                </span>
              </button>
            </li>
          }
        </ul>
      }
    </div>

    <kp-sheet [ouvert]="!!aConfirmer()" (ouvertChange)="!$event && aConfirmer.set(null)" titre="Confirmer le locataire">
      @if (aConfirmer(); as c) {
        <div class="kp-row confirmation">
          <kp-avatar [photo]="c.urlProfile" [nom]="c.firstName + ' ' + c.lastName" [taille]="56" />
          <p><strong>{{ c.firstName }} {{ c.lastName }}</strong> devient le locataire de « {{ bien()?.titre }} ». Le bien n’apparaîtra plus comme vacant.</p>
        </div>
      }
      <div pied>
        <button type="button" class="kp-btn kp-btn--secondary" (click)="aConfirmer.set(null)">Annuler</button>
        <button type="button" class="kp-btn kp-btn--primary" (click)="assigner()" [disabled]="envoi()">
          @if (envoi()) {
            <span class="kp-spinner"></span>
          }
          Confirmer
        </button>
      </div>
    </kp-sheet>
  `,
  styles: [`
    .intro { margin-bottom: 16px; }
    .recherche { position: relative; display: flex; align-items: center; margin-bottom: 16px; }
    .recherche kp-icon { position: absolute; left: 14px; color: var(--kp-text-3); pointer-events: none; }
    .recherche .kp-input { padding-left: 42px; }
    ul { list-style: none; }
    .confirmation { align-items: flex-start; }
  `],
})
export class AssignTenantComponent implements OnInit {
  readonly id = input.required<string>();

  private router = inject(Router);
  private bienService = inject(BienService);
  private logement = inject(LogementContextService);
  private toasts = inject(ToastService);
  private destroyRef = inject(DestroyRef);

  readonly bien = signal<BienDTO | null>(null);
  readonly candidats = signal<UserDTO[]>([]);
  readonly recherche = signal(true);
  readonly erreur = signal<string | null>(null);
  readonly aConfirmer = signal<UserDTO | null>(null);
  readonly envoi = signal(false);
  readonly saisie = new Subject<string>();

  ngOnInit(): void {
    this.bienService.getPrive(Number(this.id())).subscribe({ next: b => this.bien.set(b), error: () => undefined });
    this.chercher('');
    this.saisie.pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef)).subscribe(v => this.chercher(v));
  }

  chercher(texte: string): void {
    const [prenom, nom] = texte.trim().split(/\s+/);
    this.recherche.set(true);
    this.erreur.set(null);
    this.bienService.rechercheLocataire(Number(this.id()), {
      firstName: prenom || undefined, lastName: nom || undefined, page: 0, size: 20,
    }).subscribe({
      next: page => {
        this.candidats.set(page.contenu);
        this.recherche.set(false);
      },
      error: err => {
        this.recherche.set(false);
        this.erreur.set(messageErreurApi(err, 'Vérifiez votre connexion puis réessayez.'));
      },
    });
  }

  assigner(): void {
    const c = this.aConfirmer();
    if (!c) return;
    this.envoi.set(true);
    this.bienService.assignerLocataire(Number(this.id()), c.id).subscribe({
      next: () => {
        this.logement.invalider();
        this.toasts.ok(`${c.firstName} ${c.lastName} est votre locataire. Préparez maintenant le bail.`);
        void this.router.navigate(['/biens', this.id()], { replaceUrl: true });
      },
      error: (err: HttpErrorResponse) => {
        this.envoi.set(false);
        this.aConfirmer.set(null);
        // 404 : seuls les candidats qui ont écrit au sujet de ce bien peuvent être choisis (W1) ; 409 : bien archivé
        this.toasts.erreur(err.status === 404
          ? 'Cette personne doit d’abord vous avoir écrit au sujet de ce bien.'
          : messageErreurApi(err, 'Le locataire n’a pas pu être enregistré.'));
      },
    });
  }
}
