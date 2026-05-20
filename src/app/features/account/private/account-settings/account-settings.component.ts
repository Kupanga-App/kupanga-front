import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { User } from '../../../../core/auth/models/user.model';

@Component({
  selector: 'app-account-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
  ],
  templateUrl: './account-settings.component.html',
  styleUrls: ['./account-settings.component.scss']
})
export class AccountSettingsComponent implements OnInit {
  private router = inject(Router);
  private authService = inject(AuthService);

  user: User | null = null;
  civility: string = 'unspecified';
  birthdate: Date | null = null;
  address: string = '';
  theme: string = 'device';

  ngOnInit(): void {
    this.user = this.authService.currentUser();
  }

  goToProfileHome(): void {
    this.router.navigate(['/account/private/home']);
  }
}
