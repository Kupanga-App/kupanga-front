import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/services/auth.service';
import { ChoixTheme, LIBELLES_THEME, ThemeService } from '../../core/services/theme.service';
import { ToastService } from '../../core/ui/toast.service';
import { messageErreurApi } from '../../core/http/api-error';
import { MESSAGE_TELEPHONE_INVALIDE, normaliserTelephone, validateurTelephone } from '../../core/telephone/telephone';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { SheetComponent } from '../../shared/ui/sheet.component';
import { AvatarComponent } from '../../shared/ui/avatar.component';
import { IconComponent } from '../../shared/components/icon/icon.component';

/** Compte : profil, téléphone (C6), thème, mot de passe, déconnexion (AUDIT.md §8.4). */
@Component({
  selector: 'kp-compte',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, PageHeaderComponent, SheetComponent, AvatarComponent, IconComponent],
  templateUrl: './compte.component.html',
  styleUrl: './compte.component.scss',
})
export class CompteComponent {
  private auth = inject(AuthService);
  protected theme = inject(ThemeService);
  private toasts = inject(ToastService);

  readonly user = this.auth.currentUser;
  readonly nom = computed(() => {
    const u = this.user();
    return u ? `${u.firstName} ${u.lastName}`.trim() : '';
  });
  readonly role = computed(() => (this.user()?.role === 'ROLE_PROPRIETAIRE' ? 'Propriétaire' : 'Locataire'));
  readonly libellesTheme = LIBELLES_THEME;
  readonly themes: ChoixTheme[] = ['systeme', 'clair', 'sombre'];
  readonly messageTelephone = MESSAGE_TELEPHONE_INVALIDE;

  readonly feuilleTelephone = signal(false);
  readonly feuilleTheme = signal(false);
  readonly envoiTelephone = signal(false);
  readonly erreurTelephone = signal<string | null>(null);
  readonly envoiLien = signal(false);
  readonly deconnexion = signal(false);
  readonly telephone = new FormControl('', { nonNullable: true, validators: [validateurTelephone] });

  ouvrirTelephone(): void {
    this.telephone.reset(this.user()?.telephone ?? '');
    this.erreurTelephone.set(null);
    this.feuilleTelephone.set(true);
  }

  enregistrerTelephone(effacer = false): void {
    if (!effacer && this.telephone.invalid) {
      this.telephone.markAsTouched();
      return;
    }
    const valeur = effacer ? null : normaliserTelephone(this.telephone.value);
    this.envoiTelephone.set(true);
    this.erreurTelephone.set(null);
    this.auth.modifierTelephone(valeur).subscribe({
      next: () => {
        this.envoiTelephone.set(false);
        this.feuilleTelephone.set(false);
        this.toasts.ok(valeur ? 'Téléphone enregistré.' : 'Téléphone retiré.');
      },
      error: err => {
        this.envoiTelephone.set(false);
        this.erreurTelephone.set(messageErreurApi(err, 'Le numéro n’a pas été enregistré.'));
      },
    });
  }

  choisirTheme(choix: ChoixTheme): void {
    this.theme.choisir(choix);
    this.feuilleTheme.set(false);
  }

  /** Changement de mot de passe : par le lien envoyé à l'adresse du compte (même parcours que l'oubli). */
  recevoirLienMotDePasse(): void {
    const email = this.user()?.email;
    if (!email || this.envoiLien()) return;
    this.envoiLien.set(true);
    this.auth.forgotPassword(email).subscribe({
      next: () => {
        this.envoiLien.set(false);
        this.toasts.ok(`Lien envoyé à ${email}.`);
      },
      error: err => {
        this.envoiLien.set(false);
        this.toasts.erreur(messageErreurApi(err, 'Le lien n’a pas pu être envoyé.'));
      },
    });
  }

  seDeconnecter(): void {
    this.deconnexion.set(true);
    // Hors ligne ou erreur de l'API : la session locale est effacée quand même (clearClientState)
    this.auth.logout().subscribe({ error: () => undefined });
  }
}
