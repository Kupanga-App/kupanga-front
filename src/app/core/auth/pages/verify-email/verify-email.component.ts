import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { messageErreurApi } from '../../../http/api-error';
import { AuthShellComponent } from '../../ui/auth-shell.component';
import { AuthChampComponent } from '../../ui/auth-champ.component';
import { AuthBanniereComponent } from '../../ui/auth-banniere.component';

/**
 * A14 : page ouverte depuis le lien de confirmation (`/auth/verifier-email?token=…`).
 * Le jeton part dans le corps de la requête ; lien invalide ou expiré → demande d'un nouveau lien.
 * L'API ne connecte pas à la confirmation : « Continuer vers Kupanga » mène à la connexion.
 */
@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AuthShellComponent, AuthChampComponent, AuthBanniereComponent],
  template: `
    @switch (etat()) {
      @case ('verification') {
        <kp-auth-shell forme="carte" illustration="enveloppe" titre="Confirmation en cours">
          <p class="attente" role="status"><span class="kp-spinner"></span>Un instant…</p>
        </kp-auth-shell>
      }
      @case ('confirme') {
        <kp-auth-shell forme="carte" illustration="maison" titre="C’est confirmé"
                       sousTitre="Votre compte est prêt. Vous pouvez chercher un logement ou publier un bien.">
          <a actions routerLink="/auth/login" class="kp-btn kp-btn--primary">Continuer vers Kupanga</a>
        </kp-auth-shell>
      }
      @case ('echec') {
        <kp-auth-shell forme="carte" illustration="lien" titre="Ce lien ne fonctionne plus"
                       sousTitre="Il a expiré ou a déjà servi. Demandez-en un nouveau : il arrive en quelques instants.">
          <form id="form-nouveau-lien" class="kp-auth-form" [formGroup]="form" (ngSubmit)="renvoyerLien()" novalidate>
            @if (infoRenvoi(); as info) {
              <kp-auth-banniere [ton]="renvoiRate() ? 'danger' : 'ok'"><p>{{ info }}</p></kp-auth-banniere>
            }
            <kp-auth-champ libelle="Votre e-mail" pour="email"
                           [erreur]="form.controls.email.touched && form.controls.email.invalid ? 'Entrez une adresse e-mail valide.' : null">
              <input id="email" class="kp-input" type="email" inputmode="email" formControlName="email" autocomplete="email"
                     autocapitalize="off" spellcheck="false" />
            </kp-auth-champ>
          </form>
          <button actions type="submit" form="form-nouveau-lien" class="kp-btn kp-btn--primary" [disabled]="renvoiEnCours()"
                  [attr.aria-busy]="renvoiEnCours()">
            @if (renvoiEnCours()) {
              <span class="kp-spinner"></span>
            }
            Recevoir un nouveau lien
          </button>
          <a actions routerLink="/auth/login" class="kp-btn kp-btn--ghost">Retour à la connexion</a>
        </kp-auth-shell>
      }
    }
  `,
  styles: [`
    .attente { display: flex; align-items: center; justify-content: center; gap: 12px; margin: 0; color: var(--kp-text-muted); }
  `],
})
export class VerifyEmailComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly etat = signal<'verification' | 'confirme' | 'echec'>('verification');
  readonly renvoiEnCours = signal(false);
  readonly infoRenvoi = signal<string | null>(null);
  readonly renvoiRate = signal(false);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
  });

  ngOnInit(): void {
    const jeton = this.route.snapshot.queryParamMap.get('token');
    // Le jeton ne reste pas dans l'URL ni dans l'historique du navigateur
    void this.router.navigate([], { queryParams: {}, replaceUrl: true });
    if (!jeton) {
      this.etat.set('echec');
      return;
    }
    this.authService.verifierEmail(jeton).subscribe({
      next: () => this.etat.set('confirme'),
      error: () => this.etat.set('echec'),
    });
  }

  renvoyerLien(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.renvoiEnCours.set(true);
    this.infoRenvoi.set(null);
    this.authService.renvoyerVerification(this.form.controls.email.value.trim()).subscribe({
      next: () => {
        this.renvoiEnCours.set(false);
        this.renvoiRate.set(false);
        this.infoRenvoi.set('Si un compte attend sa confirmation pour cette adresse, un nouveau lien vient de lui être envoyé.');
      },
      error: err => {
        this.renvoiEnCours.set(false);
        this.renvoiRate.set(true);
        this.infoRenvoi.set(messageErreurApi(err, 'Le lien n’a pas pu être renvoyé. Réessayez plus tard.'));
      },
    });
  }
}
