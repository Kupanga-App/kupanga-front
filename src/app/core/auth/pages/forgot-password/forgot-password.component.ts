import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { messageErreurApi } from '../../../http/api-error';
import { AuthLayoutComponent } from '../../ui/auth-layout.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent, IconComponent],
  template: `
    @if (envoye()) {
      <kp-auth-layout titre="Vérifiez votre e-mail" retour="/auth/login">
        <div class="kp-stack">
          <p>Si un compte existe pour <strong>{{ form.controls.email.value }}</strong>, un lien pour choisir un nouveau mot de passe vient de lui être envoyé.</p>
          <p class="kp-muted kp-small">Rien reçu ? Regardez dans les indésirables.</p>
          <a routerLink="/auth/login" class="kp-btn kp-btn--primary kp-btn--block">Retour à la connexion</a>
        </div>
      </kp-auth-layout>
    } @else {
      <kp-auth-layout titre="Mot de passe oublié" sousTitre="Entrez votre e-mail, nous vous envoyons un lien." retour="/auth/login">
        <form class="kp-form" [formGroup]="form" (ngSubmit)="envoyer()" novalidate>
          <div class="kp-field">
            <label class="kp-label" for="email">E-mail</label>
            <input id="email" class="kp-input" type="email" inputmode="email" formControlName="email" autocomplete="email"
                   autocapitalize="off" spellcheck="false" />
            @if (form.controls.email.touched && form.controls.email.invalid) {
              <span class="kp-erreur">Entrez une adresse e-mail valide.</span>
            }
          </div>
          @if (erreur()) {
            <div class="kp-bandeau kp-bandeau--danger" role="alert">
              <kp-icon name="circle-alert" [size]="18" />
              <p>{{ erreur() }}</p>
            </div>
          }
          <button type="submit" class="kp-btn kp-btn--primary kp-btn--block" [disabled]="envoi()">
            @if (envoi()) {
              <span class="kp-spinner"></span>
            }
            Envoyer le lien
          </button>
        </form>
      </kp-auth-layout>
    }
  `,
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  readonly envoi = signal(false);
  readonly envoye = signal(false);
  readonly erreur = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
  });

  envoyer(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.envoi.set(true);
    this.erreur.set(null);
    this.authService.forgotPassword(this.form.controls.email.value.trim()).subscribe({
      next: () => {
        this.envoi.set(false);
        this.envoye.set(true);
      },
      error: err => {
        this.envoi.set(false);
        this.erreur.set(messageErreurApi(err, 'L’envoi n’a pas abouti. Réessayez.'));
      },
    });
  }
}
