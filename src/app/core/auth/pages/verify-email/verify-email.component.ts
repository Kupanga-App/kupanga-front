import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LucideAngularModule, Check, Send } from 'lucide-angular';
import { AuthService } from '../../services/auth.service';
import { AuthLayoutCComponent } from '../../shared/auth-layout-c/auth-layout-c.component';
import { AuthFieldComponent } from '../../shared/auth-field/auth-field.component';
import { messageErreurApi } from '../../../http/api-error';

/**
 * A14 : page ouverte depuis le lien de confirmation (`/auth/verifier-email?token=…`).
 * Le jeton est envoyé dans le corps de la requête ; en cas de lien invalide ou expiré, l'utilisateur
 * peut demander un nouveau lien.
 */
@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LucideAngularModule,
    AuthLayoutCComponent,
    AuthFieldComponent,
  ],
  templateUrl: './verify-email.component.html',
  styleUrls: ['./verify-email.component.scss']
})
export class VerifyEmailComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly Check = Check;
  readonly Send = Send;

  etat = signal<'verification' | 'confirme' | 'echec'>('verification');
  serverError = signal<string | null>(null);
  isResending = signal(false);
  resendInfo = signal<string | null>(null);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  get emailCtrl() { return this.form.get('email') as any; }

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    // Le jeton ne reste pas dans l'URL ni dans l'historique du navigateur
    this.router.navigate([], { queryParams: {}, replaceUrl: true });
    if (!token) {
      this.echec('Lien de confirmation invalide ou expiré');
      return;
    }
    this.authService.verifierEmail(token).subscribe({
      next: () => this.etat.set('confirme'),
      error: (err) => this.echec(messageErreurApi(err, 'Lien de confirmation invalide ou expiré'))
    });
  }

  renvoyerLien(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isResending.set(true);
    this.resendInfo.set(null);
    this.authService.renvoyerVerification(this.form.value.email as string).subscribe({
      next: () => {
        this.isResending.set(false);
        this.resendInfo.set('Si un compte attend sa confirmation pour cette adresse, un nouveau lien vient de lui être envoyé.');
      },
      error: (err) => {
        this.isResending.set(false);
        this.resendInfo.set(messageErreurApi(err, "Le lien n'a pas pu être renvoyé. Réessayez plus tard."));
      }
    });
  }

  private echec(message: string): void {
    this.serverError.set(message);
    this.etat.set('echec');
  }
}
