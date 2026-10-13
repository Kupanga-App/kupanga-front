import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BienDTO } from '../../features/biens/models/bien.model';

const CLE = 'kp_logement_bien_id';

/**
 * Logement d'un locataire (premier bien non archivé de `GET /users/biens`).
 * Décide de ses onglets (« Mon logement » ou « Explorer ») et de son écran d'accueil.
 */
@Injectable({ providedIn: 'root' })
export class LogementContextService {
  private http = inject(HttpClient);

  readonly logementBienId = signal<number | null>(lireCache());
  readonly hasLogement = computed(() => this.logementBienId() !== null);
  private charge = false;

  /** Relit le logement une fois par session (la valeur gardée sert hors ligne ou en cas d'erreur). */
  charger(): Observable<number | null> {
    if (this.charge) {
      return of(this.logementBienId());
    }
    return this.http.get<BienDTO[]>(`${environment.apiUrl}/users/biens`).pipe(
      map(biens => (biens.find(b => !b.archive) ?? biens[0])?.id ?? null),
      tap(id => {
        this.charge = true;
        this.set(id);
      }),
      catchError(() => of(this.logementBienId())),
    );
  }

  /** Après une assignation : relecture au prochain `charger()`. */
  invalider(): void {
    this.charge = false;
  }

  set(bienId: number | null): void {
    this.logementBienId.set(bienId);
    try {
      if (bienId !== null) {
        localStorage.setItem(CLE, String(bienId));
      } else {
        localStorage.removeItem(CLE);
      }
    } catch {
      // Stockage indisponible
    }
  }

  clear(): void {
    this.charge = false;
    this.set(null);
  }
}

function lireCache(): number | null {
  try {
    const valeur = localStorage.getItem(CLE);
    return valeur ? Number(valeur) : null;
  } catch {
    return null;
  }
}
