import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';

const passwordMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');

  if (password && confirmPassword && password.value !== confirmPassword.value) {
    confirmPassword.setErrors({ passwordMismatch: true });
    return { passwordMismatch: true };
  } else {
    if (confirmPassword?.hasError('passwordMismatch')) {
      confirmPassword.setErrors(null);
    }
    return null;
  }
};

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
  ],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);

  isLoading = false;
  token: string | null = null;
  hidePassword = true;
  hideConfirmPassword = true;

  resetForm = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: passwordMatchValidator });

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token');
    if (!this.token) {
      this.snackBar.open('Le jeton de réinitialisation est manquant ou invalide.', 'Fermer', { duration: 6000, panelClass: ['snack-error'] });
    }
  }

  onResetPassword(): void {
    if (this.resetForm.invalid || !this.token) return;
    this.isLoading = true;
    const { password } = this.resetForm.value;
    this.authService.resetPassword(this.token, password!).subscribe({
      next: () => {
        this.isLoading = false;
        this.snackBar.open('Votre mot de passe a été réinitialisé avec succès.', 'Fermer', { duration: 4000 });
        setTimeout(() => { this.router.navigate(['/auth/login']); }, 3000);
      },
      error: (err) => {
        this.isLoading = false;
        this.snackBar.open("Une erreur s'est produite lors de la réinitialisation.", 'Fermer', { duration: 4000, panelClass: ['snack-error'] });
        console.error('Reset password error', err);
      }
    });
  }
}
