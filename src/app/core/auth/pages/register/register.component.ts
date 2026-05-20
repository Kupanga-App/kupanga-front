import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder, ReactiveFormsModule, Validators,
  AbstractControl, ValidationErrors, ValidatorFn
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { LucideAngularModule, ArrowRight, Check, Smile, Upload } from 'lucide-angular';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';
import { AuthLayoutCComponent } from '../../shared/auth-layout-c/auth-layout-c.component';
import { AuthFieldComponent } from '../../shared/auth-field/auth-field.component';
import { PasswordStrengthComponent } from '../../shared/password-strength/password-strength.component';
import { RolePickerComponent } from '../../shared/role-picker/role-picker.component';
import { AvatarModalComponent } from '../../shared/avatar-modal/avatar-modal.component';
import { StepsComponent } from '../../shared/steps/steps.component';

export const mustMatch: ValidatorFn = (ctrl: AbstractControl): ValidationErrors | null => {
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
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LucideAngularModule,
    AuthLayoutCComponent,
    AuthFieldComponent,
    PasswordStrengthComponent,
    RolePickerComponent,
    AvatarModalComponent,
    StepsComponent,
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  readonly ArrowRight = ArrowRight;
  readonly Check = Check;
  readonly Smile = Smile;
  readonly Upload = Upload;

  step = signal<1 | 2>(1);
  isSubmitting = signal(false);
  serverError = signal<string | null>(null);
  showAvatarModal = signal(false);
  selectedAvatarUrl = signal<string>('');
  uploadedFile = signal<File | null>(null);
  uploadedPreview = signal<string | null>(null);

  form = this.fb.group({
    email:           ['', [Validators.required, Validators.email]],
    password:        ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
    firstName:       ['', [Validators.required]],
    lastName:        ['', [Validators.required]],
    role:            ['ROLE_PROPRIETAIRE', [Validators.required]],
  }, { validators: mustMatch });

  get emailCtrl()           { return this.form.get('email') as any; }
  get passwordCtrl()        { return this.form.get('password') as any; }
  get confirmPasswordCtrl() { return this.form.get('confirmPassword') as any; }
  get firstNameCtrl()       { return this.form.get('firstName') as any; }
  get lastNameCtrl()        { return this.form.get('lastName') as any; }
  get roleCtrl()            { return this.form.get('role') as any; }
  get passwordValue()       { return this.form.get('password')?.value ?? ''; }

  get avatarPreview(): string {
    return this.uploadedPreview() ?? this.selectedAvatarUrl();
  }

  nextStep(): void {
    const step1 = ['email', 'password', 'confirmPassword'];
    const valid = step1.every(k => this.form.get(k)?.valid);
    if (!valid) {
      step1.forEach(k => this.form.get(k)?.markAsTouched());
      return;
    }
    this.step.set(2);
  }

  prevStep(): void {
    this.step.set(1);
  }

  openAvatarModal(): void {
    this.showAvatarModal.set(true);
  }

  onAvatarConfirmed(url: string): void {
    this.selectedAvatarUrl.set(url);
    this.uploadedPreview.set(null);
    this.uploadedFile.set(null);
    // Fetch local asset → File for multipart upload
    fetch(url)
      .then(r => r.blob())
      .then(blob => {
        const name = url.split('/').pop() ?? 'avatar.jpg';
        this.uploadedFile.set(new File([blob], name, { type: blob.type || 'image/jpeg' }));
      })
      .catch(() => this.uploadedFile.set(null));
    this.showAvatarModal.set(false);
  }

  onAvatarCancelled(): void {
    this.showAvatarModal.set(false);
  }

  onFileUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploadedFile.set(file);
    this.selectedAvatarUrl.set('');
    const reader = new FileReader();
    reader.onload = e => this.uploadedPreview.set(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isSubmitting.set(true);
    this.serverError.set(null);

    const { confirmPassword, ...data } = this.form.value;
    this.authService.register(data, this.uploadedFile() ?? undefined).subscribe({
      next: (user) => {
        this.isSubmitting.set(false);
        this.snackBar.open('Compte créé et connecté !', 'Fermer', { duration: 4000 });
        this.router.navigate(user.role === 'ROLE_PROPRIETAIRE' ? ['/pro'] : ['/loc']);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.serverError.set(err.error?.message ?? "Une erreur s'est produite lors de l'inscription.");
      }
    });
  }
}
