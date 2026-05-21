import { Component, Input, Output, EventEmitter } from '@angular/core';
import { DatePipe } from '@angular/common';
import { IconComponent } from '../../../../../shared/components/icon/icon.component';

@Component({
  selector: 'kp-logement-assigned-dialog',
  standalone: true,
  imports: [DatePipe, IconComponent],
  templateUrl: './logement-assigned-dialog.component.html',
  styleUrl: './logement-assigned-dialog.component.scss',
})
export class LogementAssignedDialogComponent {
  @Input() adresse = '';
  @Input() type = '';
  @Input() surface = 0;
  @Input() nbPieces = 0;
  @Input() nomProprietaire = '';
  @Input() dateDebut: Date | null = null;
  @Output() closed = new EventEmitter<void>();

  get typeFormate(): string {
    const t = (this.type ?? '').toLowerCase();
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  onClose(): void {
    this.closed.emit();
  }
}
