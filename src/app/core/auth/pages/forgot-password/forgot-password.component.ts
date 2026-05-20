import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LucideAngularModule, Send, Shield, Check } from 'lucide-angular';
import { AuthService } from '../../services/auth.service';
import { AuthLayoutCComponent } from '../../shared/auth-layout-c/auth-layout-c.component';
import { AuthFieldComponent } from '../../shared/auth-field/auth-field.component';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LucideAngularModule,
    AuthLayoutCComponent,
    AuthFieldComponent,
  ],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  readonly Send = Send;
  readonly Shield = Shield;
  readonly Check = Check;

  isSubmitting = signal(false);
  isSent = signal(false);
  serverError = signal<string | null>(null);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  get emailCtrl() { return this.form.get('email') as any; }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isSubmitting.set(true);
    this.serverError.set(null);
    const email = this.form.value.email as string;

    this.authService.forgotPassword(email).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.isSent.set(true);
      },
      error: () => {
        this.isSubmitting.set(false);
        this.serverError.set("Une erreur s'est produite. Veuillez réessayer.");
      }
    });
  }
}
