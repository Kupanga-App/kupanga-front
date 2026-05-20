import { Component, Input, Output, EventEmitter, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Check, X } from 'lucide-angular';
import { AuthService } from '../../services/auth.service';
import { AvatarTileComponent } from '../avatar-tile/avatar-tile.component';
import { KupangaLogoComponent } from '../kupanga-logo/kupanga-logo.component';

@Component({
  selector: 'kp-avatar-modal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, AvatarTileComponent, KupangaLogoComponent],
  templateUrl: './avatar-modal.component.html',
  styleUrls: ['./avatar-modal.component.scss']
})
export class AvatarModalComponent implements OnInit {
  private authService = inject(AuthService);

  @Input() isOpen = false;
  @Input() initialUrl = '';
  @Output() confirmed = new EventEmitter<string>();
  @Output() cancelled = new EventEmitter<void>();

  readonly Check = Check;
  readonly X = X;

  avatars = signal<string[]>([]);
  picked = signal('');
  today = new Date();

  ngOnInit(): void {
    this.authService.getAvatars().subscribe(list => {
      this.avatars.set(list);
      this.picked.set(this.initialUrl || list[0] || '');
    });
  }

  select(url: string): void {
    this.picked.set(url);
  }

  confirm(): void {
    this.confirmed.emit(this.picked());
  }

  cancel(): void {
    this.cancelled.emit();
  }
}
