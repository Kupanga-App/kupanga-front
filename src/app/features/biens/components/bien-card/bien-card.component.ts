import { libelleTypeBien, vignette } from '../../models/bien.model';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MontantPipe, SymboleDevisePipe } from '../../../../core/money/montant';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { BienDTO } from '../../models/bien.model';
import { DpeBadgeComponent } from '../../../../shared/components/dpe-badge/dpe-badge.component';
import { OwnerMiniComponent } from '../../../../shared/components/owner-mini/owner-mini.component';
import { PoiChipComponent } from '../../../../shared/components/poi-chip/poi-chip.component';

@Component({
  selector: 'kp-bien-card',
  standalone: true,
  imports: [DatePipe, DecimalPipe, RouterModule, LucideAngularModule, DpeBadgeComponent, OwnerMiniComponent, PoiChipComponent, MontantPipe, SymboleDevisePipe],
  templateUrl: './bien-card.component.html',
  styleUrls: ['./bien-card.component.scss'],
})
export class BienCardComponent {
  @Input({ required: true }) bien!: BienDTO;
  @Output() viewDetail = new EventEmitter<number>();

  // R1 : vignettes de 400 px dans les listes (réseau mobile)
  get photo1(): string { return vignette(this.bien, 0) ?? ''; }
  get photo2(): string { return vignette(this.bien, 1) ?? ''; }
  get photo3(): string { return vignette(this.bien, 2) ?? ''; }
  get photosRestantes(): number { return Math.max(0, (this.bien.images ?? []).length - 3); }
  get totalPhotos(): number { return (this.bien.images ?? []).length; }
  get isVacant(): boolean { return this.bien.locataire == null; }
  get pois(): string[] { return (this.bien.pois ?? []).slice(0, 4); }
  get hasCharges(): boolean { return (this.bien.chargesMensuelles ?? 0) > 0; }

  typeBienLabel(type: string): string {
    return libelleTypeBien(type);
  }

  onView(event: MouseEvent): void {
    event.stopPropagation();
    this.viewDetail.emit(this.bien.id);
  }

  onCardClick(): void { this.viewDetail.emit(this.bien.id); }

  onImgError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    img.parentElement?.classList.add('img-error');
  }
}
