import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ProfileSpacesModalComponent } from '../profile-spaces-modal/profile-spaces-modal.component';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/auth/services/auth.service';

@Component({
  selector: 'app-profile-home',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    CardModule,
    ProfileSpacesModalComponent,
    RouterModule
  ],
  templateUrl: './profile-home.component.html',
  styleUrls: ['./profile-home.component.scss']
})
export class ProfileHomeComponent {
  private authService = inject(AuthService);
  displaySpacesModal = false;

  user = this.authService.currentUser;
  userPhoto = computed(() => this.user()?.urlProfile || 'assets/avatars_profil/avatar_homme_grand1.avif');

  showSpacesModal() {
    this.displaySpacesModal = true;
  }
}
