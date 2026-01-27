import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';

// PrimeNG Imports
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    CheckboxModule,
    MessageModule,
    ToastModule
  ],
  providers: [MessageService],
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
  private messageService = inject(MessageService);

  isForgotPasswordMode = false;
  isLoading = false;

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  forgotPasswordForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  toggleMode() {
    this.isForgotPasswordMode = !this.isForgotPasswordMode;
    this.loginForm.reset();
    this.forgotPasswordForm.reset();
  }

  onLogin() {
    if (this.loginForm.invalid) return;

    this.isLoading = true;

    const { email, password } = this.loginForm.value;
    const credentials = {
      email: email,
      motDepasse: password
    };

    this.authService.login(credentials).subscribe({
      next: () => {
        this.isLoading = false;
        this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Connexion réussie.' });
        this.router.navigate(['/admin']);
      },
      error: (err) => {
        this.isLoading = false;
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Email ou mot de passe incorrect.' });
        console.error('Login error', err);
      }
    });
  }

  onForgotPassword() {
    if (this.forgotPasswordForm.invalid) return;

    this.isLoading = true;

    const email = this.forgotPasswordForm.value.email as string;

    this.authService.forgotPassword(email).subscribe({
      next: (token: string) => {
        this.isLoading = false;
        this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Un email de réinitialisation a été envoyé.' });

        // Log du token reçu sous forme de texte
        if (token) {
          console.log('Reset Token received:', token);
        }

        setTimeout(() => {
          this.toggleMode();
        }, 3000);
      },
      error: (err) => {
        this.isLoading = false;
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: "Une erreur s'est produite. Veuillez réessayer." });
        console.error('Forgot password error', err);
      }
    });
  }
}
