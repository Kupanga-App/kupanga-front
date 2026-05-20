import { Component, computed, effect, inject } from '@angular/core';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { BienService } from '../../biens/services/bien.service';
import { GestionLogementService } from '../../gestion-logement/services/gestion-logement.service';
import { DocumentsLogementComponent } from '../../gestion-logement/pages/documents/documents-logement.component';
import { LogementContextService } from '../../../core/services/logement-context.service';
import { AuthService } from '../../../core/auth/services/auth.service';

@Component({
  selector: 'kp-loc-documents',
  standalone: true,
  providers: [GestionLogementService],
  imports: [IconComponent, DocumentsLogementComponent],
  templateUrl: './loc-documents.component.html',
  styleUrls: ['./loc-documents.component.scss'],
})
export class LocDocumentsComponent {
  private bienService = inject(BienService);
  private logementCtx = inject(LogementContextService);
  private authSvc = inject(AuthService);
  readonly gestion = inject(GestionLogementService);

  readonly bienReady = computed(() => this.gestion.bien() !== null);
  readonly noLogement = computed(
    () => !this.gestion.loading() && !this.logementCtx.hasLogement()
  );

  private lastLoadedId: number | null = null;

  constructor() {
    const role = this.authSvc.currentUser()?.role;
    if (role && !this.logementCtx.hasLogement()) {
      this.logementCtx.load(role);
    }

    // Charge le bien dès que le bienId est connu (cache ou API)
    effect(() => {
      const bienId = this.logementCtx.logementBienId();
      if (bienId !== null && bienId !== this.lastLoadedId) {
        this.lastLoadedId = bienId;
        this.gestion.loading.set(true);
        this.bienService.getById(bienId).subscribe({
          next: (bien) => {
            this.gestion.setBien(bien);
            this.gestion.loading.set(false);
          },
          error: () => {
            this.gestion.error.set('Impossible de charger les documents.');
            this.gestion.loading.set(false);
          },
        });
      }
    });
  }
}
