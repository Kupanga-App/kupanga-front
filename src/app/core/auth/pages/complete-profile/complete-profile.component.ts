import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { retourSur } from '../../guards/auth.guard';
import { messageErreurApi } from '../../../http/api-error';
import { AuthShellComponent } from '../../ui/auth-shell.component';
import { AuthBanniereComponent } from '../../ui/auth-banniere.component';
import { ChoixRoleComponent, Role } from '../../ui/choix-role.component';
import { PANNEAU_LOCATAIRE, PANNEAU_PROPRIETAIRE } from '../../ui/panneaux';

/** Première connexion Google : le compte dit ce qu'il veut faire d'abord (lot 3 : sans limiter ses droits). */
@Component({
  selector: 'app-complete-profile',
  standalone: true,
  imports: [ReactiveFormsModule, AuthShellComponent, AuthBanniereComponent, ChoixRoleComponent],
  template: `
    <kp-auth-shell titre="Vous cherchez ou vous louez ?" [panneau]="panneau()"
                   sousTitre="Dernière étape avant d’utiliser Kupanga. Vous pourrez faire les deux avec le même compte.">
      <form id="form-google-role" class="kp-auth-form" [formGroup]="form" (ngSubmit)="valider()">
        @if (erreur()) {
          <kp-auth-banniere><p>{{ erreur() }}</p></kp-auth-banniere>
        }
        <kp-choix-role formControlName="role" legende="Vous cherchez ou vous louez ?" />
      </form>
      <button actions type="submit" form="form-google-role" class="kp-btn kp-btn--primary" [disabled]="envoi()" [attr.aria-busy]="envoi()">
        @if (envoi()) {
          <span class="kp-spinner"></span>
        }
        Continuer
      </button>
    </kp-auth-shell>
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
    role: ['ROLE_LOCATAIRE' as Role, Validators.required],
  });

  private readonly role = toSignal(this.form.controls.role.valueChanges, { initialValue: this.form.controls.role.value });
  readonly panneau = computed(() => (this.role() === 'ROLE_PROPRIETAIRE' ? PANNEAU_PROPRIETAIRE : PANNEAU_LOCATAIRE));

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
