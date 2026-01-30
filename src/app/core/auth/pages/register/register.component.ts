import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

// PrimeNG Imports
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { RadioButtonModule } from 'primeng/radiobutton';
import { DialogModule } from 'primeng/dialog';
import { FileUploadModule } from 'primeng/fileupload';
import { MessageService } from 'primeng/api';

import { AuthService } from '../../services/auth.service';

// Custom Validator
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
    ButtonModule,
    InputTextModule,
    PasswordModule,
    MessageModule,
    ToastModule,
    RadioButtonModule,
    DialogModule,
    FileUploadModule
  ],
  providers: [MessageService],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private messageService = inject(MessageService);

  isLoading = false;
  step = signal<number>(1);
  showAvatarDialog = false;
  avatars: string[] = [];
  selectedAvatar: string | null = null;
  uploadedFile: File | null = null;
  uploadedFilePreview: string | null = null;

  roles = [
    { label: 'Propriétaire', value: 'ROLE_PROPRIETAIRE' },
    { label: 'Locataire', value: 'ROLE_LOCATAIRE' }
  ];

  registerForm = this.fb.group({
    // Step 1
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],

    // Step 2
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    role: ['ROLE_PROPRIETAIRE', [Validators.required]],
    avatar: [''], // URL de l'avatar sélectionné
    profilePicture: [null] // Fichier uploadé
  }, { validators: passwordMatchValidator });

  nextStep() {
    const step1Controls = ['email', 'password', 'confirmPassword'];
    const isStep1Valid = step1Controls.every(control => this.registerForm.get(control)?.valid);

    if (isStep1Valid) {
      this.step.set(2);
    } else {
      step1Controls.forEach(control => this.registerForm.get(control)?.markAsTouched());
    }
  }

  previousStep() {
    this.step.set(1);
  }

  openAvatarDialog() {
    this.authService.getAvatars().subscribe({
      next: (avatars) => {
        this.avatars = avatars;
        this.showAvatarDialog = true;
      },
      error: (err) => {
        console.error('Error fetching avatars', err);
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les avatars.' });
      }
    });
  }

  selectAvatar(avatarUrl: string) {
    this.selectedAvatar = avatarUrl;
    this.registerForm.patchValue({ avatar: avatarUrl, profilePicture: null });
    this.uploadedFile = null;
    this.uploadedFilePreview = null;
    this.showAvatarDialog = false;
  }

  onFileUpload(event: any) {
    const file = event.files[0];
    if (file) {
      this.uploadedFile = file;
      this.registerForm.patchValue({ profilePicture: file, avatar: '' });
      this.selectedAvatar = null;

      // Créer une URL pour la prévisualisation
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.uploadedFilePreview = e.target.result;
      };
      reader.readAsDataURL(file);

      this.messageService.add({ severity: 'info', summary: 'Photo sélectionnée', detail: file.name });
    }
  }

  onRegister() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;

    const { confirmPassword, ...userData } = this.registerForm.value;

    // Appel au service avec userData et le fichier optionnel
    // Note: uploadedFile peut être null si l'utilisateur a choisi un avatar ou rien du tout
    this.authService.register(userData, this.uploadedFile || undefined).subscribe({
      next: (user) => {
        this.isLoading = false;
        this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Compte créé et connecté !' });

        // Redirection en fonction du rôle
        if (user.role === 'ROLE_PROPRIETAIRE') {
          this.router.navigate(['/admin']);
        } else {
          this.router.navigate(['/user']);
        }
      },
      error: (err) => {
        this.isLoading = false;
        const errorMessage = err.error?.message || "Une erreur s'est produite lors de l'inscription.";
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: errorMessage });
        console.error('Register error', err);
      }
    });
  }
}
