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
import { MESSAGE_TELEPHONE_INVALIDE, normaliserTelephone } from '../../../../core/telephone/telephone';
import { messageErreurApi } from '../../../../core/http/api-error';

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

  /** C6 : numéro de contact (facultatif, non vérifié). */
  telephone = '';
  telephoneMessage: string | null = null;
  telephoneErreur = false;
  telephoneEnCours = false;

  ngOnInit(): void {
    this.user = this.authService.currentUser();
    this.telephone = this.user?.telephone ?? '';
  }

  enregistrerTelephone(): void {
    const saisie = this.telephone.trim();
    const numero = normaliserTelephone(saisie);
    if (saisie && !numero) {
      this.telephoneErreur = true;
      this.telephoneMessage = MESSAGE_TELEPHONE_INVALIDE;
      return;
    }
    this.telephoneEnCours = true;
    this.telephoneMessage = null;
    this.authService.modifierTelephone(numero).subscribe({
      next: user => {
        this.telephoneEnCours = false;
        this.telephoneErreur = false;
        this.telephone = user.telephone ?? '';
        this.telephoneMessage = numero ? 'Numéro enregistré.' : 'Numéro supprimé.';
      },
      error: err => {
        this.telephoneEnCours = false;
        this.telephoneErreur = true;
        this.telephoneMessage = messageErreurApi(err, "Le numéro n'a pas pu être enregistré.");
      },
    });
  }

  goToProfileHome(): void {
    this.router.navigate(['/account/private/home']);
  }
}
