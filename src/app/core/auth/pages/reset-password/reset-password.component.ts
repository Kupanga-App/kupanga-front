import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../services/auth.service';
import { messageErreurApi } from '../../../http/api-error';
import { AuthShellComponent } from '../../ui/auth-shell.component';
import { AuthChampComponent } from '../../ui/auth-champ.component';
import { AuthBanniereComponent } from '../../ui/auth-banniere.component';
import { MOT_DE_PASSE_ROBUSTE, ReglesMotDePasseComponent, motsDePasseIdentiques } from '../../ui/mot-de-passe';
import { IconComponent } from '../../../../shared/components/icon/icon.component';

/** Message de l'API (400) quand le jeton est inconnu, déjà utilisé ou expiré. */
const LIEN_REFUSE = /lien de réinitialisation/i;

/**
 * Page ouverte depuis le lien « mot de passe oublié » (`/auth/reset-password?token=…`).
 * L'API ne connecte pas après l'enregistrement : le bouton dit « Enregistrer », puis lien vers la connexion.
 */
@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AuthShellComponent, AuthChampComponent, AuthBanniereComponent, ReglesMotDePasseComponent, IconComponent],
  template: `
    @switch (etat()) {
      @case ('expire') {
        <kp-auth-shell forme="carte" illustration="lien" titre="Ce lien ne fonctionne plus"
                       sousTitre="Il a expiré ou a déjà servi. Demandez-en un nouveau : il arrive en quelques instants.">
          <a actions routerLink="/auth/forgot" class="kp-btn kp-btn--primary">Recevoir un nouveau lien</a>
          <a actions routerLink="/auth/login" class="kp-btn kp-btn--ghost">Retour à la connexion</a>
        </kp-auth-shell>
      }
      @case ('fait') {
        <kp-auth-shell titre="Mot de passe modifié" sousTitre="Vous pouvez vous connecter avec votre nouveau mot de passe.">
          <a actions routerLink="/auth/login" class="kp-btn kp-btn--primary">Se connecter</a>
        </kp-auth-shell>
      }
      @default {
        <kp-auth-shell titre="Nouveau mot de passe">
          <form id="form-nouveau-mdp" class="kp-auth-form" [formGroup]="form" (ngSubmit)="valider()" novalidate>
            @if (erreur()) {
              <kp-auth-banniere><p>{{ erreur() }}</p></kp-auth-banniere>
            }
            <kp-auth-champ libelle="Nouveau mot de passe" pour="password" decritPar="regles-nouveau-mdp"
                           [erreur]="form.controls.password.touched && form.controls.password.invalid ? 'Le mot de passe doit remplir les 3 critères.' : null">
              <div class="kp-input-groupe">
                <input id="password" class="kp-input" [type]="voir() ? 'text' : 'password'" formControlName="password"
                       autocomplete="new-password" maxlength="72" />
                <button type="button" class="kp-icon-btn kp-auth-oeil" (click)="voir.set(!voir())"
                        [attr.aria-label]="voir() ? 'Masquer le mot de passe' : 'Afficher le mot de passe'" [attr.aria-pressed]="voir()">
                  <kp-icon [name]="voir() ? 'eye-off' : 'eye'" [strokeWidth]="1.5" />
                </button>
              </div>
              <kp-regles-mot-de-passe apres id="regles-nouveau-mdp" [valeur]="motDePasse()" />
            </kp-auth-champ>
            <kp-auth-champ libelle="Confirmez le mot de passe" pour="confirmPassword" [erreur]="erreurConfirmation()">
              <input id="confirmPassword" class="kp-input" [type]="voir() ? 'text' : 'password'" formControlName="confirmPassword"
                     autocomplete="new-password" maxlength="72" />
            </kp-auth-champ>
          </form>

          <button actions type="submit" form="form-nouveau-mdp" class="kp-btn kp-btn--primary" [disabled]="envoi()" [attr.aria-busy]="envoi()">
            @if (envoi()) {
              <span class="kp-spinner"></span>
            }
            Enregistrer
          </button>
        </kp-auth-shell>
      }
    }
  `,
})
export class ResetPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  private jeton: string | null = null;
  readonly etat = signal<'formulaire' | 'fait' | 'expire'>('formulaire');
  readonly envoi = signal(false);
  readonly voir = signal(false);
  readonly erreur = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group(
    {
      password: ['', [Validators.required, Validators.maxLength(72), Validators.pattern(MOT_DE_PASSE_ROBUSTE)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: motsDePasseIdentiques },
  );

  readonly motDePasse = toSignal(this.form.controls.password.valueChanges, { initialValue: '' });

  erreurConfirmation(): string | null {
    const c = this.form.controls.confirmPassword;
    if (!c.touched) return null;
    if (c.invalid) return 'Confirmez votre mot de passe.';
    return this.form.hasError('differents') ? 'Les deux mots de passe sont différents.' : null;
  }

  ngOnInit(): void {
    this.jeton = this.route.snapshot.queryParamMap.get('token');
    if (!this.jeton) {
      // Lien incomplet : même écran qu'un lien expiré, avec la demande d'un nouveau lien
      this.etat.set('expire');
      return;
    }
    // Le jeton ne reste pas dans l'URL ni dans l'historique du navigateur
    void this.router.navigate([], { queryParams: {}, replaceUrl: true });
  }

  valider(): void {
    if (this.form.invalid || !this.jeton) {
      this.form.markAllAsTouched();
      return;
    }
    this.envoi.set(true);
    this.erreur.set(null);
    this.authService.resetPassword(this.jeton, this.form.controls.password.value).subscribe({
      next: () => {
        this.envoi.set(false);
        this.etat.set('fait');
      },
      error: err => {
        this.envoi.set(false);
        // 400 « Lien de réinitialisation invalide ou expiré », ou règle du mot de passe non respectée
        const message = messageErreurApi(err, 'Le mot de passe n’a pas pu être modifié.');
        if (LIEN_REFUSE.test(message)) {
          this.etat.set('expire');
          return;
        }
        this.erreur.set(message);
      },
    });
  }
}
