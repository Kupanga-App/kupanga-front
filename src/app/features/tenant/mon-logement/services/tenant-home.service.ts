import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import {
  MonLogementData, ContratDetails, StatutItem, KpiItem, Quittance,
  CompteurReleve, ProprietaireInfo, QuickAction,
  LocataireDashboardDTO, ContratResumeDTO, QuittanceBackendDTO,
  EtatDesLieuxBackendDTO, CompteurReleveBackendDTO,
} from '../models/tenant.models';

@Injectable({ providedIn: 'root' })
export class TenantHomeService {
  private readonly http = inject(HttpClient);

  private readonly _data = signal<MonLogementData | null>(null);
  private readonly _loading = signal(false);
  private readonly _aBienAssigne = signal(false);

  readonly data = this._data.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly aBienAssigne = this._aBienAssigne.asReadonly();

  readonly actionsRapides: QuickAction[] = [
    {
      label: 'Signaler un incident',
      sousTitre: 'Plomberie, électricité, chauffage…',
      icon: 'building-2',
      route: '/loc/incidents/new',
    },
    {
      label: 'Demander une attestation',
      sousTitre: 'CAF, employeur, garant…',
      icon: 'file-text',
    },
    {
      label: 'Mettre à jour mon assurance',
      sousTitre: 'Téléversez votre nouveau certificat',
      icon: 'map-pin',
    },
    {
      label: "Consulter l'EDL d'entrée",
      sousTitre: 'Référence pour la sortie',
      icon: 'check-square',
      route: '/loc/etats-des-lieux',
    },
    {
      label: 'Donner mon préavis',
      sousTitre: 'Quitter le logement · 1 mois',
      icon: 'log-out',
      danger: true,
    },
  ];

  loadDashboard(bienId: number): void {
    this._loading.set(true);
    // Ne pas remettre _data à null — garder l'ancien data affiché pendant le rechargement
    // pour éviter un flash de page vide entre deux navigations.
    this.http
      .get<LocataireDashboardDTO>(`${environment.apiUrl}/locataire/dashboard/${bienId}`)
      .subscribe({
        next: (dto) => {
          this._data.set(this.mapToInternal(dto));
          this._aBienAssigne.set(true);
          this._loading.set(false);
        },
        error: () => {
          this._data.set(null);
          this._aBienAssigne.set(false);
          this._loading.set(false);
        },
      });
  }

  private mapToInternal(dto: LocataireDashboardDTO): MonLogementData {
    return {
      locataire: dto.locataire,
      bien: dto.bien,
      contrat: this.mapContrat(dto.contrat),
      statuts: this.deriveStatuts(dto),
      kpis: this.buildKpis(dto),
      prochainLoyer: this.deriveProchainLoyer(dto),
      quittances: dto.quittances.map(q => this.mapQuittance(q)),
      documents: [],
      compteurs: this.extractCompteurs(dto),
      proprietaire: this.mapProprietaire(
        dto.bien.nomProprietaire,
        dto.quittances.find((q) => !!q.emailProprietaire)?.emailProprietaire
      ),
    };
  }

  private mapContrat(c: ContratResumeDTO): ContratDetails {
    return {
      type: this.normalizeContratType(c.type),
      dateDebut: new Date(c.dateDebut),
      dateFin: new Date(c.dateFin),
      moisEcoules: c.moisEcoules,
      dureeTotale: c.dureeTotale,
      loyerMensuel: c.loyerMensuel,
      charges: c.charges,
      depotGarantie: c.depotGarantie,
      statut: this.normalizeContratStatut(c.statut),
    };
  }

  private normalizeContratType(type: string): string {
    const t = (type ?? '').toLowerCase();
    if (t.includes('meuble') || t.includes('meublé')) return 'meuble';
    if (t.includes('coloc')) return 'coloc';
    return 'nu';
  }

  private normalizeContratStatut(statut: string): 'active' | 'draft' | 'terminated' {
    switch (statut) {
      case 'SIGNE': return 'active';
      case 'EXPIRE':
      case 'ANNULE': return 'terminated';
      default: return 'draft';
    }
  }

  private deriveStatuts(dto: LocataireDashboardDTO): StatutItem[] {
    const items: StatutItem[] = [];

    const dq = dto.statuts?.derniereQuittance;
    if (dq) {
      items.push({
        label: 'Dernier loyer',
        statut: dq === 'PAYEE' ? 'ok' : dq === 'EN_RETARD' ? 'warning' : 'critical',
      });
    }

    const contratStatut = this.normalizeContratStatut(dto.contrat?.statut ?? '');
    items.push({
      label: 'Bail',
      statut: contratStatut === 'active' ? 'ok' : contratStatut === 'draft' ? 'warning' : 'critical',
    });

    return items;
  }

  private buildKpis(dto: LocataireDashboardDTO): KpiItem[] {
    const c = dto.contrat;
    const montantMensuel = (c?.loyerMensuel ?? 0) + (c?.charges ?? 0);
    const moisRestants = (c?.dureeTotale ?? 0) - (c?.moisEcoules ?? 0);
    const totalVerse = dto.quittances
      .filter(q => q.statut === 'PAYEE')
      .reduce((sum, q) => sum + (q.montantTotal ?? 0), 0);
    const finContrat = c?.dateFin ? new Date(c.dateFin) : null;

    return [
      {
        label: 'Loyer mensuel',
        icon: 'calendar',
        valeur: montantMensuel.toLocaleString('fr-FR'),
        unite: '€',
        note: `Loyer ${(c?.loyerMensuel ?? 0).toLocaleString('fr-FR')} € + charges ${(c?.charges ?? 0).toLocaleString('fr-FR')} €`,
      },
      {
        label: 'Fin du bail',
        icon: 'clock',
        valeur: finContrat
          ? finContrat.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
          : '—',
        note: moisRestants > 0 ? `${moisRestants} mois restants` : 'Bail expiré',
      },
      {
        label: 'Loyers payés',
        icon: 'check-circle',
        valeur: `${c?.moisEcoules ?? 0} / ${c?.dureeTotale ?? 0}`,
        note: totalVerse > 0 ? `soit ${totalVerse.toLocaleString('fr-FR')} € versés` : '',
      },
      {
        label: 'Dépôt de garantie',
        icon: 'shield',
        valeur: (c?.depotGarantie ?? 0).toLocaleString('fr-FR'),
        unite: '€',
        note: finContrat ? `Restitution prévue ${finContrat.getFullYear()}` : '',
      },
    ];
  }

  private deriveProchainLoyer(dto: LocataireDashboardDTO): { montant: number; dateEcheance: Date } {
    const prochain = dto.quittances.find(
      q => q.statut === 'EN_ATTENTE' || q.statut === 'EN_RETARD'
    );
    if (prochain) {
      return {
        montant: prochain.montantTotal,
        dateEcheance: new Date(prochain.dateEcheance),
      };
    }
    const now = new Date();
    return {
      montant: (dto.contrat?.loyerMensuel ?? 0) + (dto.contrat?.charges ?? 0),
      dateEcheance: new Date(now.getFullYear(), now.getMonth() + 1, 5),
    };
  }

  private mapQuittance(q: QuittanceBackendDTO): Quittance {
    const moisLabel = q.moisLabel ?? '';
    const parts = moisLabel.split(' ');
    const moisAbr = (parts[0] ?? '').substring(0, 4);

    const meta =
      q.statut === 'PAYEE' && q.datePaiement
        ? `Payée le ${new Date(q.datePaiement).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}`
        : `Échéance le ${new Date(q.dateEcheance).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}`;

    return {
      moisAbr,
      annee: q.annee,
      libelle: `Quittance ${moisLabel}`,
      meta,
      montant: q.montantTotal,
      urlPdf: q.urlPdf ?? '#',
    };
  }

  private extractCompteurs(dto: LocataireDashboardDTO): CompteurReleve[] {
    if (!dto.etatsDesLieux?.length) return [];

    // On prend le dernier EDL signé (ou le plus récent si aucun n'est signé)
    const sorted = [...dto.etatsDesLieux].sort(
      (a, b) => new Date(b.dateRealisation).getTime() - new Date(a.dateRealisation).getTime()
    );
    const edl: EtatDesLieuxBackendDTO =
      sorted.find(e => e.statut === 'SIGNE') ?? sorted[0];

    if (!edl.compteurs?.length) return [];

    return edl.compteurs.map((c: CompteurReleveBackendDTO) => ({
      type: c.typeCompteur,
      libelle: this.labelCompteur(c.typeCompteur),
      valeur: c.index,
      unite: c.unite,
    }));
  }

  private labelCompteur(typeCompteur: string): string {
    const labels: Record<string, string> = {
      ELECTRICITE_HP: 'Électricité (HP)',
      ELECTRICITE_HC: 'Électricité (HC)',
      EAU_FROIDE: 'Eau froide',
      EAU_CHAUDE: 'Eau chaude',
      GAZ: 'Gaz',
    };
    return labels[typeCompteur] ?? typeCompteur;
  }

  private mapProprietaire(nomProprietaire: string, email?: string): ProprietaireInfo {
    const nom = nomProprietaire ?? '';
    const parts = nom.trim().split(' ');
    const initiales = parts
      .map(p => p[0] ?? '')
      .join('')
      .toUpperCase()
      .substring(0, 2);
    return { nom, initiales, role: 'Propriétaire', verifie: false, email };
  }
}
