import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { BienDTO } from '../../features/biens/models/bien.model';

@Injectable({ providedIn: 'root' })
export class LogementContextService {
  private http = inject(HttpClient);

  /** bienId du logement actif (assigné à un locataire) */
  readonly logementBienId = signal<number | null>(null);

  readonly hasLogement = computed(() => this.logementBienId() !== null);

  /**
   * Charge le logement actif depuis l'API.
   * - Propriétaire : premier bien ayant un locataire.
   * - Locataire    : premier bien retourné par GET /users/biens.
   * Stocke aussi en localStorage pour éviter un appel supplémentaire au rechargement.
   */
  load(role: string): void {
    const cached = localStorage.getItem('kp_logement_bien_id');
    if (cached) {
      this.logementBienId.set(Number(cached));
      return;
    }

    this.http.get<BienDTO[]>(`${environment.apiUrl}/users/biens`).subscribe({
      next: (biens) => {
        let bienId: number | null = null;
        if (role === 'ROLE_PROPRIETAIRE') {
          const avec = biens.find(b => !!b.locataire);
          bienId = avec?.id ?? null;
        } else {
          bienId = biens[0]?.id ?? null;
        }
        this.set(bienId);
      },
      error: () => { /* silencieux — le lien n'apparaît tout simplement pas */ }
    });
  }

  /** Appelé juste après une assignation réussie */
  set(bienId: number | null): void {
    this.logementBienId.set(bienId);
    if (bienId !== null) {
      localStorage.setItem('kp_logement_bien_id', String(bienId));
    } else {
      localStorage.removeItem('kp_logement_bien_id');
    }
  }

  clear(): void {
    this.set(null);
  }
}
