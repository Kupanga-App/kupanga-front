import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';
import { retourSur } from '../../guards/auth.guard';
import { messageErreurApi } from '../../../http/api-error';
import { AuthLayoutComponent } from '../../ui/auth-layout.component';
import { BoutonGoogleComponent } from '../../ui/bouton-google.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent, BoutonGoogleComponent, IconComponent],
  template: `
    <kp-auth-layout titre="Connexion" retour="/explorer">
      <form class="kp-form" [formGroup]="form" (ngSubmit)="connecter()" novalidate>
        <div class="kp-field">
          <label class="kp-label" for="email">E-mail</label>
          <input id="email" class="kp-input" type="email" formControlName="email" autocomplete="username"
                 inputmode="email" autocapitalize="off" spellcheck="false" />
          @if (form.controls.email.touched && form.controls.email.invalid) {
            <span class="kp-erreur">Entrez une adresse e-mail valide.</span>
          }
        </div>

        <div class="kp-field">
          <div class="kp-row kp-row--between">
            <label class="kp-label" for="password">Mot de passe</label>
            <a routerLink="/auth/forgot" class="kp-small">Mot de passe oublié ?</a>
          </div>
          <div class="kp-input-groupe">
            <input id="password" class="kp-input" [type]="voir() ? 'text' : 'password'" formControlName="password"
                   autocomplete="current-password" />
            <button type="button" class="kp-icon-btn oeil" (click)="voir.set(!voir())"
                    [attr.aria-label]="voir() ? 'Masquer le mot de passe' : 'Afficher le mot de passe'">
              <kp-icon [name]="voir() ? 'eye-off' : 'eye'" />
            </button>
          </div>
          @if (form.controls.password.touched && form.controls.password.invalid) {
            <span class="kp-erreur">Entrez votre mot de passe.</span>
          }
        </div>

        @if (erreur()) {
          <div class="kp-bandeau kp-bandeau--danger" role="alert">
            <kp-icon name="circle-alert" [size]="18" />
            <p>{{ erreur() }}</p>
          </div>
        }

        @if (emailNonVerifie()) {
          <div class="kp-bandeau kp-bandeau--attention">
            <kp-icon name="mail" [size]="18" />
            <div class="kp-stack kp-stack--sm">
              <p>Confirmez d’abord votre adresse avec le lien reçu par e-mail.</p>
              @if (infoRenvoi()) {
                <p role="status">{{ infoRenvoi() }}</p>
              } @else {
                <button type="button" class="kp-btn kp-btn--secondary kp-btn--sm" (click)="renvoyerLien()" [disabled]="renvoiEnCours()">
                  Renvoyer le lien
                </button>
              }
            </div>
          </div>
        }

        <button type="submit" class="kp-btn kp-btn--primary kp-btn--block" [disabled]="envoi() || google()">
          @if (envoi()) {
            <span class="kp-spinner"></span>
          }
          Se connecter
        </button>
      </form>

      <div class="separateur"><span>ou</span></div>
      <kp-bouton-google (jeton)="connecterAvecGoogle($event)" />

      <p pied>Pas encore de compte ? <a routerLink="/auth/register" [queryParams]="retourParams()">Créer un compte</a></p>
    </kp-auth-layout>
  `,
  styles: [`
    .oeil { position: absolute; right: 2px; }
    .separateur { display: flex; align-items: center; gap: 12px; margin: 24px 0 16px; color: var(--kp-text-3); font-size: var(--kp-fs-sm); }
    .separateur::before, .separateur::after { content: ''; flex: 1; border-top: 1px solid var(--kp-border); }
  `],
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  readonly envoi = signal(false);
  readonly google = signal(false);
  readonly erreur = signal<string | null>(null);
  readonly voir = signal(false);
  /** A14 : connexion refusée (403) tant que l'adresse n'est pas confirmée → proposer un nouveau lien. */
  readonly emailNonVerifie = signal(false);
  readonly renvoiEnCours = signal(false);
  readonly infoRenvoi = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    password: ['', [Validators.required]],
  });

  /** Page demandée avant la connexion (lien reçu par e-mail, bouton « Contacter » d'une annonce). */
  private readonly retour = retourSur(this.route.snapshot.queryParamMap.get('returnUrl'));

  retourParams(): Record<string, string> | null {
    return this.retour ? { returnUrl: this.retour } : null;
  }

  connecter(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.envoi.set(true);
    this.erreur.set(null);
    this.emailNonVerifie.set(false);
    this.infoRenvoi.set(null);

    const { email, password } = this.form.getRawValue();
    this.authService.login({ email: email.trim(), password }).subscribe({
      next: user => this.suite(user),
      error: err => {
        this.envoi.set(false);
        if (err?.status === 403) {
          this.emailNonVerifie.set(true);
          return;
        }
        this.erreur.set(
          err?.status === 401 ? 'E-mail ou mot de passe incorrect.' : messageErreurApi(err, 'Connexion impossible. Réessayez.'),
        );
      },
    });
  }

  connecterAvecGoogle(jeton: string): void {
    this.google.set(true);
    this.erreur.set(null);
    this.authService.connecterAvecGoogle(jeton).subscribe({
      next: user => {
        if (!user) {
          void this.router.navigate(['/auth/google-role'], { queryParams: this.retourParams() });
          return;
        }
        this.suite(user);
      },
      error: err => {
        this.google.set(false);
        // A4 : 401 « adresse Google non confirmée » ; 429 trop de tentatives
        this.erreur.set(messageErreurApi(err, 'Connexion Google impossible. Réessayez.'));
      },
    });
  }

  /** A14 : renvoie le lien de confirmation (réponse identique que le compte existe ou non). */
  renvoyerLien(): void {
    const email = this.form.controls.email.value.trim();
    if (!email || this.renvoiEnCours()) return;
    this.renvoiEnCours.set(true);
    this.authService.renvoyerVerification(email).subscribe({
      next: () => {
        this.renvoiEnCours.set(false);
        this.infoRenvoi.set('Si votre compte attend sa confirmation, un nouveau lien vient de vous être envoyé.');
      },
      error: err => {
        this.renvoiEnCours.set(false);
        this.infoRenvoi.set(messageErreurApi(err, 'Le lien n’a pas pu être renvoyé. Réessayez plus tard.'));
      },
    });
  }

  private suite(_user: User): void {
    this.envoi.set(false);
    this.google.set(false);
    void this.router.navigateByUrl(this.retour ?? '/', { replaceUrl: true });
  }
}
