import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatIconModule,
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  animations: [
    trigger('fadeSlide', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ opacity: 0, transform: 'translateY(-20px)' }))
      ])
    ])
  ]
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  isForgotPasswordMode = false;
  isLoading = false;
  hidePassword = true;

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  forgotPasswordForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  toggleMode(): void {
    this.isForgotPasswordMode = !this.isForgotPasswordMode;
    this.loginForm.reset();
    this.forgotPasswordForm.reset();
  }

  onLogin(): void {
    if (this.loginForm.invalid) return;
    this.isLoading = true;
    const { email, password } = this.loginForm.value;
    this.authService.login({ email, password }).subscribe({
      next: (user) => {
        this.isLoading = false;
        this.snackBar.open('Connexion réussie.', 'Fermer', { duration: 4000 });
        this.router.navigate(user.role === 'ROLE_PROPRIETAIRE' ? ['/pro'] : ['/loc']);
      },
      error: (err) => {
        this.isLoading = false;
        this.snackBar.open('Email ou mot de passe incorrect.', 'Fermer', { duration: 4000, panelClass: ['snack-error'] });
        console.error('Login error', err);
      }
    });
  }

  onForgotPassword(): void {
    if (this.forgotPasswordForm.invalid) return;
    this.isLoading = true;
    const email = this.forgotPasswordForm.value.email as string;
    this.authService.forgotPassword(email).subscribe({
      next: (token: string) => {
        this.isLoading = false;
        this.snackBar.open('Un email de réinitialisation a été envoyé.', 'Fermer', { duration: 4000 });
        if (token) { console.log('Reset Token received:', token); }
        setTimeout(() => { this.toggleMode(); }, 3000);
      },
      error: (err) => {
        this.isLoading = false;
        this.snackBar.open("Une erreur s'est produite. Veuillez réessayer.", 'Fermer', { duration: 4000, panelClass: ['snack-error'] });
        console.error('Forgot password error', err);
      }
    });
  }
}
