import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';

export const passwordMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
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
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    MatIconModule,
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  isLoading = false;
  step = signal<number>(1);
  showAvatarDialog = false;
  avatars: string[] = [];
  selectedAvatar: string | null = null;
  uploadedFile: File | null = null;
  uploadedFilePreview: string | null = null;
  hidePassword = true;
  hideConfirmPassword = true;

  roles = [
    { label: 'Propriétaire', value: 'ROLE_PROPRIETAIRE' },
    { label: 'Locataire', value: 'ROLE_LOCATAIRE' }
  ];

  registerForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    role: ['ROLE_PROPRIETAIRE', [Validators.required]],
    avatar: [''],
    profilePicture: [null as File | null]
  }, { validators: passwordMatchValidator });

  nextStep(): void {
    const step1Controls = ['email', 'password', 'confirmPassword'];
    const isStep1Valid = step1Controls.every(control => this.registerForm.get(control)?.valid);
    if (isStep1Valid) {
      this.step.set(2);
    } else {
      step1Controls.forEach(control => this.registerForm.get(control)?.markAsTouched());
    }
  }

  previousStep(): void {
    this.step.set(1);
  }

  openAvatarDialog(): void {
    this.authService.getAvatars().subscribe({
      next: (avatars) => {
        this.avatars = avatars;
        this.showAvatarDialog = true;
      },
      error: (err) => {
        console.error('Error fetching avatars', err);
        this.snackBar.open('Impossible de charger les avatars.', 'Fermer', { duration: 4000, panelClass: ['snack-error'] });
      }
    });
  }

  selectAvatar(avatarUrl: string): void {
    this.selectedAvatar = avatarUrl;
    this.registerForm.patchValue({ avatar: avatarUrl, profilePicture: null });
    this.uploadedFile = null;
    this.uploadedFilePreview = null;
    this.showAvatarDialog = false;
  }

  onFileUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.uploadedFile = file;
      this.registerForm.patchValue({ profilePicture: file, avatar: '' });
      this.selectedAvatar = null;
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        this.uploadedFilePreview = e.target?.result as string;
      };
      reader.readAsDataURL(file);
      this.snackBar.open(file.name, 'OK', { duration: 3000 });
    }
  }

  onRegister(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }
    this.isLoading = true;
    const { confirmPassword, ...userData } = this.registerForm.value;
    this.authService.register(userData, this.uploadedFile || undefined).subscribe({
      next: (user) => {
        this.isLoading = false;
        this.snackBar.open('Compte créé et connecté !', 'Fermer', { duration: 4000 });
        if (user.role === 'ROLE_PROPRIETAIRE') {
          this.router.navigate(['/pro']);
        } else {
          this.router.navigate(['/loc']);
        }
      },
      error: (err) => {
        this.isLoading = false;
        const errorMessage = err.error?.message || "Une erreur s'est produite lors de l'inscription.";
        this.snackBar.open(errorMessage, 'Fermer', { duration: 4000, panelClass: ['snack-error'] });
        console.error('Register error', err);
      }
    });
  }
}
