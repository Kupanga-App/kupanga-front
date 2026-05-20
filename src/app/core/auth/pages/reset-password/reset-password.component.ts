import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { LucideAngularModule, Check } from 'lucide-angular';
import { AuthService } from '../../services/auth.service';
import { AuthLayoutCComponent } from '../../shared/auth-layout-c/auth-layout-c.component';
import { AuthFieldComponent } from '../../shared/auth-field/auth-field.component';
import { PasswordStrengthComponent } from '../../shared/password-strength/password-strength.component';

const mustMatch: ValidatorFn = (ctrl: AbstractControl): ValidationErrors | null => {
  const pw = ctrl.get('password');
  const confirm = ctrl.get('confirmPassword');
  if (pw && confirm && pw.value !== confirm.value) {
    confirm.setErrors({ passwordMismatch: true });
    return { passwordMismatch: true };
  }
  if (confirm?.hasError('passwordMismatch')) {
    confirm.setErrors(null);
  }
  return null;
};

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LucideAngularModule,
    AuthLayoutCComponent,
    AuthFieldComponent,
    PasswordStrengthComponent,
  ],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  readonly Check = Check;

  token = signal<string | null>(null);
  isSubmitting = signal(false);
  isSuccess = signal(false);
  serverError = signal<string | null>(null);

  form = this.fb.group({
    password:        ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: mustMatch });

  get passwordCtrl()        { return this.form.get('password') as any; }
  get confirmPasswordCtrl() { return this.form.get('confirmPassword') as any; }
  get passwordValue()       { return this.form.get('password')?.value ?? ''; }

  ngOnInit(): void {
    const t = this.route.snapshot.queryParamMap.get('token');
    if (!t) {
      this.router.navigate(['/auth/forgot']);
      return;
    }
    this.token.set(t);
  }

  onSubmit(): void {
    if (this.form.invalid || !this.token()) return;
    this.isSubmitting.set(true);
    this.serverError.set(null);

    this.authService.resetPassword(this.token()!, this.form.value.password!).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.isSuccess.set(true);
        setTimeout(() => this.router.navigate(['/auth/login']), 3000);
      },
      error: () => {
        this.isSubmitting.set(false);
        this.serverError.set("Une erreur s'est produite lors de la réinitialisation.");
      }
    });
  }
}
