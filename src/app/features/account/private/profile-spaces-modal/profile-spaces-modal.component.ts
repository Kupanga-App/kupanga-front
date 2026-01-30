import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'app-profile-spaces-modal',
  standalone: true,
  imports: [
    CommonModule,
    DialogModule,
    ButtonModule,
    InputTextModule
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
