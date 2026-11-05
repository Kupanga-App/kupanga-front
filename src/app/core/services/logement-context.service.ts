import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BienDTO } from '../../features/biens/models/bien.model';

const CLE = 'kp_logement_bien_id';
const CLE_BIENS = 'kp_a_des_biens';

/** Biens dont le compte est le propriétaire (`GET /users/biens` renvoie aussi les logements qu'il loue). */
export function biensPossedes(biens: BienDTO[], userId: number | null | undefined): BienDTO[] {
  return userId == null ? [] : biens.filter(b => b.proprietaire?.id === userId);
}

/** Logements que le compte loue (il en est le locataire actuel). */
export function logementsLoues(biens: BienDTO[], userId: number | null | undefined): BienDTO[] {
  return userId == null ? [] : biens.filter(b => b.locataire?.id === userId);
}

/**
 * Lot 3 (2026-11-05) : plus de rôle par compte. Un même compte peut posséder des biens et louer un ou plusieurs
 * logements ; ses espaces (onglets, accueil) se déduisent de `GET /users/biens`, relu une fois par session
 * (les dernières valeurs sont gardées pour le hors-ligne).
 */
@Injectable({ providedIn: 'root' })
export class LogementContextService {
  private http = inject(HttpClient);

  /** Premier logement loué non archivé (« Mon logement »). */
  readonly logementBienId = signal<number | null>(lireNombre(CLE));
  readonly hasLogement = computed(() => this.logementBienId() !== null);
  /** Le compte possède au moins un bien. */
  readonly aDesBiens = signal<boolean>(lireNombre(CLE_BIENS) === 1);
  private charge = false;

  /** Relit les espaces du compte une fois par session ; renvoie le logement loué (ou null). */
  charger(userId: number | null | undefined): Observable<number | null> {
    if (this.charge || userId == null) {
      return of(this.logementBienId());
    }
    return this.http.get<BienDTO[]>(`${environment.apiUrl}/users/biens`).pipe(
      map(biens => {
        const loues = logementsLoues(biens, userId);
        this.setADesBiens(biensPossedes(biens, userId).length > 0);
        return (loues.find(b => !b.archive) ?? loues[0])?.id ?? null;
      }),
      tap(id => {
        this.charge = true;
        this.set(id);
      }),
      catchError(() => of(this.logementBienId())),
    );
  }

  /** Après une signature de bail, une publication ou une archive : relecture au prochain `charger()`. */
  invalider(): void {
    this.charge = false;
  }

  set(bienId: number | null): void {
    this.logementBienId.set(bienId);
    ecrire(CLE, bienId);
  }

  setADesBiens(valeur: boolean): void {
    this.aDesBiens.set(valeur);
    ecrire(CLE_BIENS, valeur ? 1 : null);
  }

  clear(): void {
    this.charge = false;
    this.set(null);
    this.setADesBiens(false);
  }
}

function lireNombre(cle: string): number | null {
  try {
    const valeur = localStorage.getItem(cle);
    return valeur ? Number(valeur) : null;
  } catch {
    return null;
  }
}

function ecrire(cle: string, valeur: number | null): void {
  try {
    if (valeur !== null) {
      localStorage.setItem(cle, String(valeur));
    } else {
      localStorage.removeItem(cle);
    }
  } catch {
    // Stockage indisponible
  }
}
