import { MESSAGE_TELEPHONE_INVALIDE } from '../../../telephone/telephone';
import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { LucideAngularModule, Eye, EyeOff } from 'lucide-angular';

@Component({
  selector: 'kp-auth-field',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './auth-field.component.html',
  styleUrls: ['./auth-field.component.scss']
})
export class AuthFieldComponent {
  @Input() label = '';
  @Input() required = false;
  @Input() hint = '';
  @Input() type: 'text' | 'email' | 'password' | 'tel' = 'text';
  @Input() placeholder = '';
  @Input() control!: FormControl;
  @Input() fieldId = '';

  readonly Eye = Eye;
  readonly EyeOff = EyeOff;

  showPassword = signal(false);

  get inputType(): string {
    if (this.type !== 'password') return this.type;
    return this.showPassword() ? 'text' : 'password';
  }

  get eyeLabel(): string {
    return this.showPassword() ? 'Masquer le mot de passe' : 'Afficher le mot de passe';
  }

  togglePassword(): void {
    this.showPassword.update(v => !v);
  }

  get hasError(): boolean {
    return !!(this.control?.invalid && this.control?.touched);
  }

  get errorMessage(): string {
    const errors = this.control?.errors;
    if (!errors) return '';
    if (errors['required']) return 'Ce champ est requis.';
    if (errors['email']) return 'Adresse email invalide.';
    if (errors['minlength']) return `Minimum ${errors['minlength'].requiredLength} caractères.`;
    if (errors['maxlength']) return `Maximum ${errors['maxlength'].requiredLength} caractères.`;
    if (errors['pattern']) return 'Au moins 8 caractères, dont une majuscule, une minuscule et un chiffre.';
    if (errors['passwordMismatch']) return 'Les mots de passe ne correspondent pas.';
    if (errors['telephone']) return MESSAGE_TELEPHONE_INVALIDE;
    return 'Valeur invalide.';
  }
}
