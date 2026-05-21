import { Component, inject, signal, NgZone, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { LucideAngularModule, ArrowRight } from 'lucide-angular';
import { AuthService } from '../../services/auth.service';
import { AuthLayoutCComponent, AuthRubric } from '../../shared/auth-layout-c/auth-layout-c.component';
import { AuthFieldComponent } from '../../shared/auth-field/auth-field.component';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatCheckboxModule,
    LucideAngularModule,
    AuthLayoutCComponent,
    AuthFieldComponent,
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements AfterViewInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private ngZone = inject(NgZone);

  readonly ArrowRight = ArrowRight;

  isSubmitting = signal(false);
  isGoogleLoading = signal(false);
  serverError = signal<string | null>(null);
  googleReady = signal(false);

  loginForm = this.fb.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
    remember: [true]
  });

  readonly rubrics: AuthRubric[] = [
    { page: 'p. 02', text: 'Biens — gérez votre patrimoine' },
    { page: 'p. 04', text: 'Loyers — suivez vos encaissements' },
    { page: 'p. 07', text: 'Baux — vos contrats en un coup d\'œil' }
  ];

  get emailCtrl() { return this.loginForm.get('email') as any; }
  get passwordCtrl() { return this.loginForm.get('password') as any; }
  get rememberCtrl() { return this.loginForm.get('remember') as any; }

  ngAfterViewInit(): void {
    const script = document.querySelector('script[src*="gsi/client"]') as HTMLScriptElement | null;
    if (!script) return;

    if (typeof google !== 'undefined' && google.accounts?.id) {
      this.initGoogleSignIn();
    } else {
      script.addEventListener('load', () => this.initGoogleSignIn());
    }
  }

  private initGoogleSignIn(): void {
    google.accounts.id.initialize({
      client_id: environment.googleClientId,
      callback: (response: google.accounts.id.CredentialResponse) => {
        this.ngZone.run(() => this.handleGoogleCredential(response.credential));
      }
    });
    this.ngZone.run(() => this.googleReady.set(true));
  }

  signInWithGoogle(): void {
    if (!this.googleReady()) return;
    google.accounts.id.prompt();
  }

  private handleGoogleCredential(credential: string): void {
    this.isGoogleLoading.set(true);
    this.serverError.set(null);

    this.authService.loginWithGoogle(credential).subscribe({
      next: (response) => {
        if (response.requiresRoleSelection) {
          this.isGoogleLoading.set(false);
          this.router.navigate(['/auth/google-role']);
        } else {
          this.authService.loadCurrentUser().subscribe({
            next: (user) => {
              this.isGoogleLoading.set(false);
              this.router.navigate(user.role === 'ROLE_PROPRIETAIRE' ? ['/pro'] : ['/loc']);
            },
            error: () => {
              this.isGoogleLoading.set(false);
              this.serverError.set('Connexion Google échouée. Réessayez.');
            }
          });
        }
      },
      error: () => {
        this.isGoogleLoading.set(false);
        this.serverError.set('Connexion Google échouée. Vérifiez votre compte et réessayez.');
      }
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }
    this.isSubmitting.set(true);
    this.serverError.set(null);

    const { email, password } = this.loginForm.value;
    this.authService.login({ email, password }).subscribe({
      next: (user) => {
        this.isSubmitting.set(false);
        this.router.navigate(user.role === 'ROLE_PROPRIETAIRE' ? ['/pro'] : ['/loc']);
      },
      error: () => {
        this.isSubmitting.set(false);
        this.serverError.set('Identifiants incorrects. Veuillez réessayer.');
      }
    });
  }
}
