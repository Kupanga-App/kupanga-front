import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'kp-avatar-tile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './avatar-tile.component.html',
  styleUrls: ['./avatar-tile.component.scss']
})
export class AvatarTileComponent {
  @Input() url = '';
  @Input() selected = false;
  @Input() size = 64;
  @Output() picked = new EventEmitter<string>();

  onPick(): void {
    this.picked.emit(this.url);
  }
}
