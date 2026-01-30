import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';

// PrimeNG Imports
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { AuthService } from '../../services/auth.service';

// Custom Validator (reuse from register if possible, or duplicate for simplicity here)
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
        ButtonModule,
        InputTextModule,
        PasswordModule,
        MessageModule,
        ToastModule
    ],
    providers: [MessageService],
    templateUrl: './reset-password.component.html',
    styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent implements OnInit {
    private fb = inject(FormBuilder);
    private authService = inject(AuthService);
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private messageService = inject(MessageService);

    isLoading = false;
    token: string | null = null;

    resetForm = this.fb.group({
        password: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', [Validators.required]]
    }, { validators: passwordMatchValidator });

    ngOnInit(): void {
        this.token = this.route.snapshot.queryParamMap.get('token');
        if (!this.token) {
            this.messageService.add({ severity: 'error', summary: 'Erreur', detail: "Le jeton de réinitialisation est manquant ou invalide." });
        }
    }

    onResetPassword() {
        if (this.resetForm.invalid || !this.token) return;

        this.isLoading = true;

        const { password } = this.resetForm.value;

        // On passe le token et le nouveau mot de passe en arguments séparés
        this.authService.resetPassword(this.token, password!).subscribe({
            next: () => {
                this.isLoading = false;
                this.messageService.add({
                  severity: 'success',
                  summary: 'Succès',
                  detail: "Votre mot de passe a été réinitialisé avec succès."
                });
                setTimeout(() => {
                    this.router.navigate(['/auth/login']);
                }, 3000);
            },
            error: (err) => {
                this.isLoading = false;
                this.messageService.add({
                  severity: 'error',
                  summary: 'Erreur',
                  detail: "Une erreur s'est produite lors de la réinitialisation."
                });
                console.error('Reset password error', err);
            }
        });
    }
}
