import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../services/auth.service';
import { messageErreurApi } from '../../../http/api-error';
import { AuthLayoutComponent } from '../../ui/auth-layout.component';
import { MOT_DE_PASSE_ROBUSTE, ReglesMotDePasseComponent, motsDePasseIdentiques } from '../../ui/mot-de-passe';
import { IconComponent } from '../../../../shared/components/icon/icon.component';

/** Page ouverte depuis le lien « mot de passe oublié » (`/auth/reset-password?token=…`). */
@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent, ReglesMotDePasseComponent, IconComponent],
  template: `
    @if (fait()) {
      <kp-auth-layout titre="Mot de passe modifié">
        <div class="kp-stack">
          <p>Vous pouvez vous connecter avec votre nouveau mot de passe.</p>
          <a routerLink="/auth/login" class="kp-btn kp-btn--primary kp-btn--block">Se connecter</a>
        </div>
      </kp-auth-layout>
    } @else {
      <kp-auth-layout titre="Nouveau mot de passe">
        <form class="kp-form" [formGroup]="form" (ngSubmit)="valider()" novalidate>
          <div class="kp-field">
            <label class="kp-label" for="password">Nouveau mot de passe</label>
            <div class="kp-input-groupe">
              <input id="password" class="kp-input" [type]="voir() ? 'text' : 'password'" formControlName="password"
                     autocomplete="new-password" maxlength="72" />
              <button type="button" class="kp-icon-btn oeil" (click)="voir.set(!voir())"
                      [attr.aria-label]="voir() ? 'Masquer le mot de passe' : 'Afficher le mot de passe'">
                <kp-icon [name]="voir() ? 'eye-off' : 'eye'" />
              </button>
            </div>
            <kp-regles-mot-de-passe [valeur]="motDePasse()" />
          </div>
          <div class="kp-field">
            <label class="kp-label" for="confirmPassword">Confirmez le mot de passe</label>
            <input id="confirmPassword" class="kp-input" [type]="voir() ? 'text' : 'password'" formControlName="confirmPassword"
                   autocomplete="new-password" maxlength="72" />
            @if (form.controls.confirmPassword.touched && form.hasError('differents')) {
              <span class="kp-erreur">Les deux mots de passe sont différents.</span>
            }
          </div>
          @if (erreur()) {
            <div class="kp-bandeau kp-bandeau--danger" role="alert">
              <kp-icon name="circle-alert" [size]="18" />
              <div class="kp-stack kp-stack--sm">
                <p>{{ erreur() }}</p>
                <a routerLink="/auth/forgot">Demander un nouveau lien</a>
              </div>
            </div>
          }
          <button type="submit" class="kp-btn kp-btn--primary kp-btn--block" [disabled]="envoi()">
            @if (envoi()) {
              <span class="kp-spinner"></span>
            }
            Enregistrer
          </button>
        </form>
      </kp-auth-layout>
    }
  `,
  styles: [`.oeil { position: absolute; right: 2px; }`],
})
export class ResetPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  private jeton: string | null = null;
  readonly envoi = signal(false);
  readonly fait = signal(false);
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

  ngOnInit(): void {
    this.jeton = this.route.snapshot.queryParamMap.get('token');
    if (!this.jeton) {
      void this.router.navigate(['/auth/forgot']);
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
        this.fait.set(true);
      },
      error: err => {
        this.envoi.set(false);
        // 400 « Lien de réinitialisation invalide ou expiré » ou règle du mot de passe non respectée
        this.erreur.set(messageErreurApi(err, 'Le mot de passe n’a pas pu être modifié.'));
      },
    });
  }
}
