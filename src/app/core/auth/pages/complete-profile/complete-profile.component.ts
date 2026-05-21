import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { LucideAngularModule, ArrowRight } from 'lucide-angular';
import { AuthService } from '../../services/auth.service';
import { AuthLayoutCComponent, AuthRubric } from '../../shared/auth-layout-c/auth-layout-c.component';
import { RolePickerComponent } from '../../shared/role-picker/role-picker.component';

@Component({
  selector: 'app-complete-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    LucideAngularModule,
    AuthLayoutCComponent,
    RolePickerComponent,
  ],
  templateUrl: './complete-profile.component.html',
  styleUrls: ['./complete-profile.component.scss']
})
export class CompleteProfileComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  readonly ArrowRight = ArrowRight;

  isSubmitting = signal(false);
  serverError = signal<string | null>(null);

  form = this.fb.group({
    role: ['ROLE_PROPRIETAIRE', Validators.required]
  });

  get roleCtrl() { return this.form.get('role') as any; }

  readonly rubrics: AuthRubric[] = [
    { page: 'p. 01', text: 'Biens — accédez à votre espace' },
    { page: 'p. 03', text: 'Loyers — suivez vos paiements' },
    { page: 'p. 05', text: 'Documents — centralisez vos fichiers' }
  ];

  onSubmit(): void {
    if (this.form.invalid) return;
    this.isSubmitting.set(true);
    this.serverError.set(null);

    const role = this.form.value.role as 'ROLE_PROPRIETAIRE' | 'ROLE_LOCATAIRE';
    this.authService.completeGoogleProfile(role).subscribe({
      next: (user) => {
        this.isSubmitting.set(false);
        this.router.navigate(user.role === 'ROLE_PROPRIETAIRE' ? ['/pro'] : ['/loc']);
      },
      error: () => {
        this.isSubmitting.set(false);
        this.serverError.set('Une erreur est survenue. Veuillez réessayer.');
      }
    });
  }
}
