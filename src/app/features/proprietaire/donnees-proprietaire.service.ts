import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { BienService } from '../biens/services/bien.service';
import { ContratService } from '../gestion-logement/services/contrat.service';
import { EdlService } from '../gestion-logement/services/edl.service';
import { QuittanceService } from '../gestion-logement/services/quittance.service';
import { BienDTO } from '../biens/models/bien.model';
import { ContratDTO } from '../gestion-logement/models/contrat.model';
import { EtatDesLieuxDTO } from '../gestion-logement/models/edl.model';
import { QuittanceDTO } from '../gestion-logement/models/quittance.model';

/** Documents du propriétaire rattachés à leur bien. */
export interface DonneesProprietaire {
  biens: BienDTO[];
  contrats: ContratDTO[];
  edlsParBien: Map<number, EtatDesLieuxDTO[]>;
  /** `bienId` ajouté : l'API ne le renvoie pas dans une quittance. */
  quittances: QuittanceDTO[];
}

/**
 * Biens, baux, états des lieux et quittances du propriétaire. Les états des lieux et les quittances sont lus
 * bien par bien (`/etats-des-lieux/search`, `/quittances/bien/{id}`), car l'API ne dit pas à quel bien ils
 * appartiennent ; seuls les biens loués ou archivés en ont.
 */
@Injectable({ providedIn: 'root' })
export class DonneesProprietaireService {
  private biens = inject(BienService);
  private contrats = inject(ContratService);
  private edls = inject(EdlService);
  private quittances = inject(QuittanceService);

  charger(): Observable<DonneesProprietaire> {
    return this.biens.getMesBiens().pipe(
      switchMap(biens => {
        const avecDocuments = biens.filter(b => b.locataire || b.archive);
        const parBien = avecDocuments.length
          ? forkJoin(avecDocuments.map(b => forkJoin({
              id: of(b.id),
              edls: this.edls.getByBien(b.id).pipe(catchError(() => of([] as EtatDesLieuxDTO[]))),
              quittances: this.quittances.getByBien(b.id).pipe(catchError(() => of([] as QuittanceDTO[]))),
            })))
          : of([]);
        return forkJoin({
          biens: of(biens),
          contrats: this.contrats.search({ size: 50 }).pipe(map(p => p.contenu), catchError(() => of([] as ContratDTO[]))),
          parBien,
        });
      }),
      map(({ biens, contrats, parBien }) => ({
        biens,
        contrats,
        edlsParBien: new Map(parBien.map(p => [p.id, p.edls] as [number, EtatDesLieuxDTO[]])),
        quittances: parBien.flatMap(p => p.quittances.map(q => ({ ...q, bienId: p.id }))),
      })),
    );
  }
}
