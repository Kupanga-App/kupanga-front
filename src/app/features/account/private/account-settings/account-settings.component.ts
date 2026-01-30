import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { RadioButtonModule } from 'primeng/radiobutton';
import { DatePickerModule } from 'primeng/datepicker';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { User } from '../../../../core/auth/models/user.model';
import {Router} from '@angular/router';

@Component({
  selector: 'app-account-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    InputTextModule,
    RadioButtonModule,
    DatePickerModule
  ],
  templateUrl: './account-settings.component.html',
  styleUrls: ['./account-settings.component.scss']
})
export class AccountSettingsComponent implements OnInit {

  constructor(private router: Router, private authService: AuthService) {}

  user: User | null = null;

  // Properties for form fields not in the User model
  civility: string = 'unspecified';
  birthdate: Date | null = null;
  address: string = '';
  theme: string = 'device';

  ngOnInit(): void {
    this.user = this.authService.currentUser()
  }

  goToProfileHome(): void {
    this.router.navigate(['/account/private/home']);
  }
}
