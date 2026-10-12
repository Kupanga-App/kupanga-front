import { validateurTelephone } from '../../../telephone/telephone';
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder, ReactiveFormsModule, Validators,
  AbstractControl, ValidationErrors, ValidatorFn
} from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LucideAngularModule, ArrowRight, Check, Smile, Upload } from 'lucide-angular';
import { AuthService } from '../../services/auth.service';
import { AuthLayoutCComponent } from '../../shared/auth-layout-c/auth-layout-c.component';
import { AuthFieldComponent } from '../../shared/auth-field/auth-field.component';
import { PasswordStrengthComponent } from '../../shared/password-strength/password-strength.component';
import { RolePickerComponent } from '../../shared/role-picker/role-picker.component';
import { AvatarModalComponent } from '../../shared/avatar-modal/avatar-modal.component';
import { StepsComponent } from '../../shared/steps/steps.component';
import { messageErreurApi } from '../../../http/api-error';
import { ACCEPT_PHOTOS, PhotoRefuseeError, preparerPhoto } from '../../../media/photos';

/** Même règle que l'API (UserFormDTO) : 8 caractères minimum, une minuscule, une majuscule, un chiffre. */
export const MOT_DE_PASSE_ROBUSTE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

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

  readonly ArrowRight = ArrowRight;
  readonly Check = Check;
  readonly Smile = Smile;
  readonly Upload = Upload;

  /** 3 : compte créé, lien de confirmation envoyé (A14). */
  step = signal<1 | 2 | 3>(1);
  readonly acceptPhotos = ACCEPT_PHOTOS;
  emailInscrit = signal('');
  isResending = signal(false);
  resendInfo = signal<string | null>(null);
  isSubmitting = signal(false);
  serverError = signal<string | null>(null);
  showAvatarModal = signal(false);
  selectedAvatarUrl = signal<string>('');
  uploadedFile = signal<File | null>(null);
  uploadedPreview = signal<string | null>(null);

  form = this.fb.group({
    email:           ['', [Validators.required, Validators.email]],
    password:        ['', [Validators.required, Validators.maxLength(72), Validators.pattern(MOT_DE_PASSE_ROBUSTE)]],
    confirmPassword: ['', [Validators.required]],
    firstName:       ['', [Validators.required, Validators.maxLength(50)]],
    lastName:        ['', [Validators.required, Validators.maxLength(50)]],
    role:            ['ROLE_PROPRIETAIRE', [Validators.required]],
    telephone:       ['', [validateurTelephone]],
  }, { validators: mustMatch });

  get emailCtrl()           { return this.form.get('email') as any; }
  get passwordCtrl()        { return this.form.get('password') as any; }
  get confirmPasswordCtrl() { return this.form.get('confirmPassword') as any; }
  get firstNameCtrl()       { return this.form.get('firstName') as any; }
  get lastNameCtrl()        { return this.form.get('lastName') as any; }
  get roleCtrl()            { return this.form.get('role') as any; }
  get telephoneCtrl()       { return this.form.get('telephone') as any; }
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

  async onFileUpload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.serverError.set(null);
    // B5 : format et taille contrôlés avant l'envoi, HEIC (iPhone) converti en JPEG
    let photo: File;
    try {
      photo = await preparerPhoto(file);
    } catch (e) {
      this.serverError.set(e instanceof PhotoRefuseeError ? e.message : 'Cette photo ne peut pas être utilisée.');
      return;
    }
    this.uploadedFile.set(photo);
    this.selectedAvatarUrl.set('');
    const reader = new FileReader();
    reader.onload = e => this.uploadedPreview.set(e.target?.result as string);
    reader.readAsDataURL(photo);
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
      next: () => {
        // A14 : pas de connexion automatique, le compte s'active par le lien envoyé par e-mail
        this.isSubmitting.set(false);
        this.emailInscrit.set(data.email ?? '');
        this.step.set(3);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.serverError.set(messageErreurApi(err, "Une erreur s'est produite lors de l'inscription."));
      }
    });
  }

  /** A14 : nouveau lien de confirmation (réponse identique que le compte existe ou non). */
  renvoyerLien(): void {
    if (!this.emailInscrit() || this.isResending()) return;
    this.isResending.set(true);
    this.resendInfo.set(null);
    this.authService.renvoyerVerification(this.emailInscrit()).subscribe({
      next: () => {
        this.isResending.set(false);
        this.resendInfo.set('Un nouveau lien a été envoyé si le compte attend encore sa confirmation.');
      },
      error: (err) => {
        this.isResending.set(false);
        this.resendInfo.set(messageErreurApi(err, "Le lien n'a pas pu être renvoyé. Réessayez plus tard."));
      }
    });
  }
}
