import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';
import { retourSur } from '../../guards/auth.guard';
import { messageErreurApi } from '../../../http/api-error';
import { AuthShellComponent } from '../../ui/auth-shell.component';
import { AuthChampComponent } from '../../ui/auth-champ.component';
import { AuthBanniereComponent } from '../../ui/auth-banniere.component';
import { BoutonGoogleComponent } from '../../ui/bouton-google.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AuthShellComponent, AuthChampComponent, AuthBanniereComponent, BoutonGoogleComponent, IconComponent],
  template: `
    <kp-auth-shell titre="Connexion" sousTitre="Retrouvez vos biens, votre logement et vos messages." retour="/explorer">
      <form id="form-connexion" class="kp-auth-form" [formGroup]="form" (ngSubmit)="connecter()" novalidate>
        @if (erreur(); as message) {
          <kp-auth-banniere>
            @if (identifiantsRefuses()) {
              <p>E-mail ou mot de passe incorrect. Vérifiez votre saisie ou choisissez « Mot de passe oublié ».</p>
            } @else {
              <p>{{ message }}</p>
            }
          </kp-auth-banniere>
        }

        @if (emailNonVerifie()) {
          <kp-auth-banniere ton="attention">
            <p>Confirmez d’abord votre adresse avec le lien reçu par e-mail.</p>
            @if (infoRenvoi()) {
              <p role="status">{{ infoRenvoi() }}</p>
            } @else {
              <button type="button" class="kp-btn kp-btn--secondary kp-btn--sm" (click)="renvoyerLien()" [disabled]="renvoiEnCours()">
                Renvoyer le lien
              </button>
            }
          </kp-auth-banniere>
        }

        <kp-auth-champ libelle="E-mail" pour="email" [enErreur]="identifiantsRefuses()"
                       [erreur]="form.controls.email.touched && form.controls.email.invalid ? 'Entrez une adresse e-mail valide.' : null">
          <input id="email" class="kp-input" type="email" formControlName="email" autocomplete="email"
                 inputmode="email" autocapitalize="off" spellcheck="false" />
        </kp-auth-champ>

        <kp-auth-champ libelle="Mot de passe" pour="password" [enErreur]="identifiantsRefuses()"
                       [erreur]="form.controls.password.touched && form.controls.password.invalid ? 'Entrez votre mot de passe.' : null">
          <a lien routerLink="/auth/forgot">Mot de passe oublié ?</a>
          <div class="kp-input-groupe">
            <input id="password" class="kp-input" [type]="voir() ? 'text' : 'password'" formControlName="password"
                   autocomplete="current-password" />
            <button type="button" class="kp-icon-btn kp-auth-oeil" (click)="voir.set(!voir())"
                    [attr.aria-label]="voir() ? 'Masquer le mot de passe' : 'Afficher le mot de passe'" [attr.aria-pressed]="voir()">
              <kp-icon [name]="voir() ? 'eye-off' : 'eye'" [strokeWidth]="1.5" />
            </button>
          </div>
        </kp-auth-champ>
      </form>

      <button actions type="submit" form="form-connexion" class="kp-btn kp-btn--primary" [disabled]="envoi() || google()"
              [attr.aria-busy]="envoi()">
        @if (envoi()) {
          <span class="kp-spinner"></span>
        }
        Se connecter
      </button>

      <div suite>
        <div class="kp-auth-separateur"><span>ou</span></div>
        <kp-bouton-google (jeton)="connecterAvecGoogle($event)" />
      </div>

      <p pied>Pas encore de compte ? <a routerLink="/auth/register" [queryParams]="retourParams()">Créer un compte</a></p>
    </kp-auth-shell>
  `,
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  readonly envoi = signal(false);
  readonly google = signal(false);
  readonly erreur = signal<string | null>(null);
  /** 401 : identifiants refusés (bannière dédiée, contour rouge des deux champs). */
  readonly identifiantsRefuses = signal(false);
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
    this.identifiantsRefuses.set(false);
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
        this.identifiantsRefuses.set(err?.status === 401);
        this.erreur.set(
          err?.status === 401 ? 'E-mail ou mot de passe incorrect.' : messageErreurApi(err, 'Connexion impossible. Réessayez.'),
        );
      },
    });
  }

  connecterAvecGoogle(jeton: string): void {
    this.google.set(true);
    this.erreur.set(null);
    this.identifiantsRefuses.set(false);
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
