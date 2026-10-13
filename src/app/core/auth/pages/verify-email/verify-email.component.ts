import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { messageErreurApi } from '../../../http/api-error';
import { AuthLayoutComponent } from '../../ui/auth-layout.component';

/**
 * A14 : page ouverte depuis le lien de confirmation (`/auth/verifier-email?token=…`).
 * Le jeton part dans le corps de la requête ; lien invalide ou expiré → demande d'un nouveau lien.
 */
@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent],
  template: `
    @switch (etat()) {
      @case ('verification') {
        <kp-auth-layout titre="Confirmation en cours">
          <div class="kp-row"><span class="kp-spinner"></span><p>Un instant…</p></div>
        </kp-auth-layout>
      }
      @case ('confirme') {
        <kp-auth-layout titre="Adresse confirmée">
          <div class="kp-stack">
            <p>Votre compte est actif. Vous pouvez vous connecter.</p>
            <a routerLink="/auth/login" class="kp-btn kp-btn--primary kp-btn--block">Se connecter</a>
          </div>
        </kp-auth-layout>
      }
      @case ('echec') {
        <kp-auth-layout titre="Lien expiré ou invalide" [sousTitre]="erreur()">
          <form class="kp-form" [formGroup]="form" (ngSubmit)="renvoyerLien()" novalidate>
            <div class="kp-field">
              <label class="kp-label" for="email">Votre e-mail</label>
              <input id="email" class="kp-input" type="email" inputmode="email" formControlName="email" autocomplete="email"
                     autocapitalize="off" spellcheck="false" />
              @if (form.controls.email.touched && form.controls.email.invalid) {
                <span class="kp-erreur">Entrez une adresse e-mail valide.</span>
              }
            </div>
            @if (infoRenvoi()) {
              <p class="kp-bandeau" role="status">{{ infoRenvoi() }}</p>
            }
            <button type="submit" class="kp-btn kp-btn--primary kp-btn--block" [disabled]="renvoiEnCours()">Recevoir un nouveau lien</button>
            <a routerLink="/auth/login" class="kp-btn kp-btn--ghost kp-btn--block">Aller à la connexion</a>
          </form>
        </kp-auth-layout>
      }
    }
  `,
})
export class VerifyEmailComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly etat = signal<'verification' | 'confirme' | 'echec'>('verification');
  readonly erreur = signal<string | null>(null);
  readonly renvoiEnCours = signal(false);
  readonly infoRenvoi = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
  });

  ngOnInit(): void {
    const jeton = this.route.snapshot.queryParamMap.get('token');
    // Le jeton ne reste pas dans l'URL ni dans l'historique du navigateur
    void this.router.navigate([], { queryParams: {}, replaceUrl: true });
    if (!jeton) {
      this.echec('Ouvrez le dernier lien reçu par e-mail, ou demandez-en un nouveau.');
      return;
    }
    this.authService.verifierEmail(jeton).subscribe({
      next: () => this.etat.set('confirme'),
      error: err => this.echec(messageErreurApi(err, 'Ce lien de confirmation n’est plus valable.')),
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
        this.infoRenvoi.set('Si un compte attend sa confirmation pour cette adresse, un nouveau lien vient de lui être envoyé.');
      },
      error: err => {
        this.renvoiEnCours.set(false);
        this.infoRenvoi.set(messageErreurApi(err, 'Le lien n’a pas pu être renvoyé. Réessayez plus tard.'));
      },
    });
  }

  private echec(message: string): void {
    this.erreur.set(message);
    this.etat.set('echec');
  }
}
