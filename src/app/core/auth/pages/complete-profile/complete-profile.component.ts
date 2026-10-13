import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { retourSur } from '../../guards/auth.guard';
import { messageErreurApi } from '../../../http/api-error';
import { AuthLayoutComponent } from '../../ui/auth-layout.component';
import { ChoixRoleComponent } from '../../ui/choix-role.component';

/** Première connexion Google : le compte choisit son rôle. */
@Component({
  selector: 'app-complete-profile',
  standalone: true,
  imports: [ReactiveFormsModule, AuthLayoutComponent, ChoixRoleComponent],
  template: `
    <kp-auth-layout titre="Vous êtes" sousTitre="Dernière étape avant d’utiliser Kupanga.">
      <form class="kp-form" [formGroup]="form" (ngSubmit)="valider()">
        <kp-choix-role formControlName="role" />
        @if (erreur()) {
          <p class="kp-bandeau kp-bandeau--danger" role="alert">{{ erreur() }}</p>
        }
        <button type="submit" class="kp-btn kp-btn--primary kp-btn--block" [disabled]="envoi()">
          @if (envoi()) {
            <span class="kp-spinner"></span>
          }
          Continuer
        </button>
      </form>
    </kp-auth-layout>
  `,
})
export class CompleteProfileComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  readonly envoi = signal(false);
  readonly erreur = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    role: ['ROLE_PROPRIETAIRE' as 'ROLE_PROPRIETAIRE' | 'ROLE_LOCATAIRE', Validators.required],
  });

  valider(): void {
    this.envoi.set(true);
    this.erreur.set(null);
    this.authService.completeGoogleProfile(this.form.controls.role.value).subscribe({
      next: () => {
        this.envoi.set(false);
        const retour = retourSur(this.route.snapshot.queryParamMap.get('returnUrl'));
        void this.router.navigateByUrl(retour ?? '/', { replaceUrl: true });
      },
      error: err => {
        this.envoi.set(false);
        this.erreur.set(messageErreurApi(err, 'Une erreur est survenue. Réessayez.'));
      },
    });
  }
}
