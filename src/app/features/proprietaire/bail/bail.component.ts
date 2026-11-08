import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, switchMap } from 'rxjs';
import { BienService } from '../../biens/services/bien.service';
import { ContratService } from '../../gestion-logement/services/contrat.service';
import { BienDTO, adresseLisible, locataireDuBail } from '../../biens/models/bien.model';
import { ContratDTO } from '../../gestion-logement/models/contrat.model';
import { MontantPipe } from '../../../core/money/montant';
import { messageErreurApi } from '../../../core/http/api-error';
import { ToastService } from '../../../core/ui/toast.service';
import { DateLonguePipe, dateLongue, statutSignature } from '../../../shared/format';
import { EtapeFrise, FriseComponent } from '../../../shared/ui/frise.component';
import { bailLePlusRecent } from '../etapes-location';
import { libelleDuree } from './duree';
import { FicheEnteteComponent } from '../fiche/fiche-entete.component';
import { StatutComponent } from '../../../shared/ui/statut.component';
import { VideComponent } from '../../../shared/ui/vide.component';
import { FeuilleSignatureComponent } from '../../../shared/ui/feuille-signature.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { BoutonWhatsappComponent } from '../../gestion-logement/components/bouton-whatsapp/bouton-whatsapp.component';

/** « 6 nov. 14:40 » */
function dateHeure(valeur: string | null | undefined): string {
  if (!valeur) return '';
  const d = new Date(valeur);
  if (isNaN(d.getTime())) return '';
  return `${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
}

/**
 * Bail d'un bien (`Bail-A-Signer`) : état des signatures, conditions, aperçu, détail du bail en cours, signature du propriétaire, relance du locataire (nouveau lien, B6),
 * invitation WhatsApp (C7-C16), PDF. Les baux précédents restent consultables.
 */
@Component({
  selector: 'kp-bail',
  standalone: true,
  imports: [
    RouterLink, MontantPipe, DateLonguePipe, FicheEnteteComponent, StatutComponent, VideComponent,
    FeuilleSignatureComponent, IconComponent, BoutonWhatsappComponent, FriseComponent,
  ],
  templateUrl: './bail.component.html',
  styleUrl: './bail.component.scss',
})
export class BailComponent implements OnInit {
  readonly id = input.required<string>();

  private bienService = inject(BienService);
  private contratService = inject(ContratService);
  private toasts = inject(ToastService);

  readonly bien = signal<BienDTO | null>(null);
  readonly contrats = signal<ContratDTO[]>([]);
  readonly chargement = signal(true);
  readonly erreur = signal(false);
  readonly signatureOuverte = signal(false);
  readonly signatureEnCours = signal(false);
  readonly erreurSignature = signal<string | null>(null);

  /** Le plus récent par date de début puis identifiant (l'ordre de l'API ne départage pas deux baux du même jour). */
  readonly bail = computed(() => bailLePlusRecent(this.contrats()));
  readonly precedents = computed(() => {
    const bail = this.bail();
    return this.contrats().filter(c => c !== bail);
  });
  readonly duree = (mois: number) => libelleDuree(mois);
  readonly prenomLocataire = computed(() => (this.bail()?.locataire ?? locataireDuBail(this.bien()))?.firstName ?? 'le locataire');
  readonly nomCourtLocataire = computed(() => {
    const l = this.bail()?.locataire ?? locataireDuBail(this.bien());
    return l ? `${l.firstName} ${l.lastName.charAt(0)}.` : 'le locataire';
  });
  readonly nomBailleur = computed(() => {
    const p = this.bail()?.proprietaire ?? this.bien()?.proprietaire;
    return p ? `${p.firstName} ${p.lastName}` : '';
  });
  readonly logement = computed(() => {
    const b = this.bien();
    return this.bail()?.adresseBien || (b ? `${b.titre}, ${adresseLisible(b)}` : '');
  });

  /** Frise des signatures : bail créé, votre signature, celle du locataire, bail signé. */
  readonly etapesSignature = computed<EtapeFrise[]>(() => {
    const c = this.bail();
    if (!c) return [];
    const prenom = this.nomCourtLocataire();
    const proprio = !!c.proprietaireASigné || c.statut === 'EN_ATTENTE_SIGNATURE_LOCATAIRE' || c.statut === 'SIGNE' || c.statut === 'EXPIRE';
    const locataire = !!c.locataireASigné || c.statut === 'SIGNE';
    return [
      { libelle: 'Bail créé', detail: dateHeure(c.createdAt) || null, etat: 'fait' },
      proprio
        ? { libelle: 'Votre signature', detail: c.dateSignatureProprietaire ? dateLongue(c.dateSignatureProprietaire, true) : 'Faite', etat: 'fait' }
        : { libelle: 'Votre signature', detail: 'En attente', etat: 'en-cours', icone: 'pen-line' },
      locataire
        ? { libelle: `Signature de ${prenom}`, detail: c.dateSignatureLocataire ? dateLongue(c.dateSignatureLocataire, true) : 'Faite', etat: 'fait' }
        : proprio
          ? { libelle: `Signature de ${prenom}`, detail: c.statut === 'EXPIRE' ? 'Lien expiré' : 'Lien envoyé', etat: 'en-cours', icone: 'pen-line' }
          : { libelle: `Signature de ${prenom}`, detail: 'Lien envoyé après la vôtre', etat: 'a-venir' },
      locataire
        ? { libelle: 'Bail signé', detail: 'Disponible pour les deux', etat: 'fait' }
        : { libelle: 'Bail signé', detail: 'Disponible pour les deux', etat: 'a-venir' },
    ];
  });
  readonly statut = computed(() => statutSignature(this.bail()?.statut, 'proprietaire'));
  readonly statutDe = (c: ContratDTO) => statutSignature(c.statut, 'proprietaire');
  readonly nomLocataire = computed(() => {
    const l = this.bail()?.locataire ?? locataireDuBail(this.bien());
    return l ? `${l.firstName} ${l.lastName}` : '';
  });
  /** B6 : le propriétaire signe d'abord ; il peut re-signer pour renvoyer un lien au locataire (ancien lien invalidé). */
  readonly peutSigner = computed(() => {
    const s = this.bail()?.statut;
    return !this.bien()?.archive && (s === 'EN_ATTENTE_SIGNATURE_PROPRIO' || s === 'BROUILLON');
  });
  readonly peutRelancer = computed(() => {
    const s = this.bail()?.statut;
    return !this.bien()?.archive && (s === 'EN_ATTENTE_SIGNATURE_LOCATAIRE' || s === 'EXPIRE');
  });
  readonly peutCreer = computed(() => {
    const b = this.bien();
    const s = this.bail()?.statut;
    return !!locataireDuBail(b) && !b?.archive && (!s || s === 'ANNULE' || s === 'EXPIRE');
  });

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    const id = Number(this.id());
    this.chargement.set(true);
    this.erreur.set(false);
    forkJoin({ bien: this.bienService.getPrive(id), contrats: this.contratService.getByBien(id) }).subscribe({
      next: ({ bien, contrats }) => {
        this.bien.set(bien);
        this.contrats.set(contrats);
        this.chargement.set(false);
      },
      error: () => {
        this.chargement.set(false);
        this.erreur.set(true);
      },
    });
  }

  ouvrirSignature(): void {
    this.erreurSignature.set(null);
    this.signatureOuverte.set(true);
  }

  signer(signature: string): void {
    const bail = this.bail();
    if (!bail) return;
    const relance = this.peutRelancer();
    this.signatureEnCours.set(true);
    this.erreurSignature.set(null);
    this.contratService
      .signerProprio(bail.id, signature)
      .pipe(switchMap(() => this.contratService.getByBien(Number(this.id()))))
      .subscribe({
        next: contrats => {
          this.contrats.set(contrats);
          this.signatureEnCours.set(false);
          this.signatureOuverte.set(false);
          this.toasts.ok(relance ? 'Nouveau lien envoyé au locataire.' : 'Bail signé. Le locataire a reçu un lien pour signer.');
        },
        error: err => {
          this.signatureEnCours.set(false);
          this.erreurSignature.set(messageErreurApi(err, 'La signature n’a pas été enregistrée. Réessayez.'));
        },
      });
  }
}
