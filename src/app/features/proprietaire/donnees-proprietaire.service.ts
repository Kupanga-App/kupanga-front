import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { BienService } from '../biens/services/bien.service';
import { AuthService } from '../../core/auth/services/auth.service';
import { LogementContextService, biensPossedes, logementsLoues } from '../../core/services/logement-context.service';
import { ContratService } from '../gestion-logement/services/contrat.service';
import { EdlService } from '../gestion-logement/services/edl.service';
import { QuittanceService } from '../gestion-logement/services/quittance.service';
import { BienDTO } from '../biens/models/bien.model';
import { ContratDTO } from '../gestion-logement/models/contrat.model';
import { EtatDesLieuxDTO } from '../gestion-logement/models/edl.model';
import { QuittanceDTO } from '../gestion-logement/models/quittance.model';

/** Documents du propriétaire rattachés à leur bien. */
export interface DonneesProprietaire {
  /** Biens dont le compte est le propriétaire. */
  biens: BienDTO[];
  /** Lot 3 : logements que le même compte loue (affichés à part sur l'accueil). */
  logements: BienDTO[];
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
  private auth = inject(AuthService);
  private contexte = inject(LogementContextService);

  charger(): Observable<DonneesProprietaire> {
    const userId = this.auth.currentUser()?.id;
    return this.biens.getMesBiens().pipe(
      switchMap(tous => {
        // Lot 3 : `GET /users/biens` renvoie aussi les logements loués par le compte
        const biens = biensPossedes(tous, userId);
        const logements = logementsLoues(tous, userId);
        this.contexte.setADesBiens(biens.length > 0);
        const possedes = new Set(biens.map(b => b.id));
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
          logements: of(logements),
          // La recherche renvoie aussi les baux où le compte est locataire : seuls ceux de ses biens
          contrats: this.contrats.search({ size: 50 }).pipe(
            map(p => p.contenu.filter(c => c.bienId != null && possedes.has(c.bienId))),
            catchError(() => of([] as ContratDTO[]))),
          parBien,
        });
      }),
      map(({ biens, logements, contrats, parBien }) => ({
        biens,
        logements,
        contrats,
        edlsParBien: new Map(parBien.map(p => [p.id, p.edls] as [number, EtatDesLieuxDTO[]])),
        quittances: parBien.flatMap(p => p.quittances.map(q => ({ ...q, bienId: p.id }))),
      })),
    );
  }
}
