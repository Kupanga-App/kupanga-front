import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { LucideAngularModule, ArrowRight } from 'lucide-angular';
import { AuthService } from '../../services/auth.service';
import { AuthLayoutCComponent, AuthRubric } from '../../shared/auth-layout-c/auth-layout-c.component';
import { AuthFieldComponent } from '../../shared/auth-field/auth-field.component';

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
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  readonly ArrowRight = ArrowRight;

  isSubmitting = signal(false);
  serverError = signal<string | null>(null);

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
