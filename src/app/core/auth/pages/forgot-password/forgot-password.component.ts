import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { messageErreurApi } from '../../../http/api-error';
import { AuthShellComponent } from '../../ui/auth-shell.component';
import { AuthChampComponent } from '../../ui/auth-champ.component';
import { AuthBanniereComponent } from '../../ui/auth-banniere.component';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AuthShellComponent, AuthChampComponent, AuthBanniereComponent],
  template: `
    @if (envoye()) {
      <kp-auth-shell titre="Vérifiez votre boîte" illustration="enveloppe" retour="/auth/login">
        <div class="envoye">
          <p>
            Si un compte existe pour <strong>{{ emailEnvoye() }}</strong>, un lien vient d’y être envoyé.
            Il n’est valable que pour une durée limitée.
          </p>
          @if (infoRenvoi(); as info) {
            <kp-auth-banniere [ton]="renvoiRate() ? 'danger' : 'ok'"><p>{{ info }}</p></kp-auth-banniere>
          }
        </div>

        <button actions type="button" class="kp-btn kp-btn--secondary" (click)="renvoyer()" [disabled]="envoi()" [attr.aria-busy]="envoi()">
          @if (envoi()) {
            <span class="kp-spinner"></span>
          }
          Renvoyer le lien
        </button>
        <p pied><a routerLink="/auth/login">Retour à la connexion</a></p>
      </kp-auth-shell>
    } @else {
      <kp-auth-shell titre="Mot de passe oublié" sousTitre="Entrez votre e-mail, nous vous envoyons un lien." retour="/auth/login">
        <form id="form-oubli" class="kp-auth-form" [formGroup]="form" (ngSubmit)="envoyer()" novalidate>
          @if (erreur()) {
            <kp-auth-banniere><p>{{ erreur() }}</p></kp-auth-banniere>
          }
          <kp-auth-champ libelle="E-mail" pour="email"
                         [erreur]="form.controls.email.touched && form.controls.email.invalid ? 'Entrez une adresse e-mail valide.' : null">
            <input id="email" class="kp-input" type="email" inputmode="email" formControlName="email" autocomplete="email"
                   autocapitalize="off" spellcheck="false" />
          </kp-auth-champ>
        </form>

        <button actions type="submit" form="form-oubli" class="kp-btn kp-btn--primary" [disabled]="envoi()" [attr.aria-busy]="envoi()">
          @if (envoi()) {
            <span class="kp-spinner"></span>
          }
          Envoyer le lien
        </button>
        <p pied><a routerLink="/auth/login">Retour à la connexion</a></p>
      </kp-auth-shell>
    }
  `,
  styles: [`
    .envoye { display: flex; flex-direction: column; gap: 20px; }
    .envoye p { margin: 0; }
    .envoye kp-auth-banniere { align-self: stretch; }
  `],
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  readonly envoi = signal(false);
  readonly envoye = signal(false);
  readonly emailEnvoye = signal('');
  readonly erreur = signal<string | null>(null);
  readonly infoRenvoi = signal<string | null>(null);
  readonly renvoiRate = signal(false);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
  });

  envoyer(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const email = this.form.controls.email.value.trim();
    this.envoi.set(true);
    this.erreur.set(null);
    this.authService.forgotPassword(email).subscribe({
      next: () => {
        this.envoi.set(false);
        this.emailEnvoye.set(email);
        this.envoye.set(true);
      },
      error: err => {
        this.envoi.set(false);
        this.erreur.set(messageErreurApi(err, 'L’envoi n’a pas abouti. Réessayez.'));
      },
    });
  }

  /** Même demande, même adresse (réponse identique que le compte existe ou non). */
  renvoyer(): void {
    if (this.envoi()) return;
    this.envoi.set(true);
    this.infoRenvoi.set(null);
    this.authService.forgotPassword(this.emailEnvoye()).subscribe({
      next: () => {
        this.envoi.set(false);
        this.renvoiRate.set(false);
        this.infoRenvoi.set('Un nouveau lien vient d’être envoyé.');
      },
      error: err => {
        this.envoi.set(false);
        this.renvoiRate.set(true);
        this.infoRenvoi.set(messageErreurApi(err, 'Le lien n’a pas pu être renvoyé. Réessayez plus tard.'));
      },
    });
  }
}
