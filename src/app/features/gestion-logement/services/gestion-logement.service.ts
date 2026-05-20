import { Injectable, computed, signal } from '@angular/core';
import { BienDTO } from '../../biens/models/bien.model';
import { ContratDTO, ContratStatut } from '../models/contrat.model';

export type ActiveView = 'contrat-new' | 'edl-new' | 'quittance-new' | null;

@Injectable()
export class GestionLogementService {
  readonly bien = signal<BienDTO | null>(null);
  readonly contrat = signal<ContratDTO | null>(null);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly activeView = signal<ActiveView>(null);
  readonly selectedTabIndex = signal<number>(0);

  readonly contratCount = signal<number | null>(null);
  readonly edlCount = signal<number | null>(null);
  readonly quittanceCount = signal<number | null>(null);

  readonly documentTotalCount = computed(() => {
    const c = this.contratCount();
    const e = this.edlCount();
    const q = this.quittanceCount();
    const a = this.bien()?.documents?.length ?? 0;
    if (c === null || e === null || q === null) return null;
    return c + e + q + a;
  });

  readonly contratStatut = computed<ContratStatut | null>(() => this.contrat()?.statut ?? null);

  setBien(bien: BienDTO): void {
    this.bien.set(bien);
  }

  setContrat(contrat: ContratDTO | null): void {
    this.contrat.set(contrat);
  }
}
