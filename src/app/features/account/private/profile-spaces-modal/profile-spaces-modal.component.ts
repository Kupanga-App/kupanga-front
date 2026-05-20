import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-profile-spaces-modal',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './profile-spaces-modal.component.html',
  styleUrls: ['./profile-spaces-modal.component.scss']
})
export class ProfileSpacesModalComponent {
  @Input() display = false;
  @Output() displayChange = new EventEmitter<boolean>();

  onHide(): void {
    this.displayChange.emit(false);
  }
}
