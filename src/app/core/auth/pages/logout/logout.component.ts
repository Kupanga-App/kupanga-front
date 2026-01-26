import { Component, inject, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-logout',
  standalone: true,
  template: '<p>Déconnexion en cours...</p>',
})
export class LogoutComponent implements OnInit {
  private authService = inject(AuthService);

  ngOnInit(): void {
    this.authService.logout().subscribe();
  }
}
