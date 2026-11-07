import { Component, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../services/auth.service';
import { retourSur } from '../../guards/auth.guard';
import { messageErreurApi } from '../../../http/api-error';
import { MESSAGE_TELEPHONE_INVALIDE, validateurTelephone } from '../../../telephone/telephone';
import { AuthShellComponent } from '../../ui/auth-shell.component';
import { AuthChampComponent } from '../../ui/auth-champ.component';
import { AuthBanniereComponent } from '../../ui/auth-banniere.component';
import { BoutonGoogleComponent } from '../../ui/bouton-google.component';
import { MOT_DE_PASSE_ROBUSTE, ReglesMotDePasseComponent, motsDePasseIdentiques } from '../../ui/mot-de-passe';
import { ChoixRoleComponent, Role } from '../../ui/choix-role.component';
import { PANNEAU_LOCATAIRE, PANNEAU_PROPRIETAIRE } from '../../ui/panneaux';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { LIENS_LEGAUX } from '../../../legal/liens-legaux';

type Etape = 0 | 1 | 2 | 'envoye';
type Indicatif = '+33' | '+243' | 'autre';
type Champ = 'firstName' | 'lastName' | 'telephone' | 'email' | 'password' | 'confirmPassword';

const TITRES = ['Vous cherchez ou vous louez ?', 'Votre profil', 'Vos identifiants'];

export const INDICATIFS: { valeur: Indicatif; libelle: string; exemple: string }[] = [
  { valeur: '+33', libelle: 'France +33', exemple: '6 12 34 56 78' },
  { valeur: '+243', libelle: 'RDC +243', exemple: '81 234 56 78' },
  { valeur: 'autre', libelle: 'Autre', exemple: '+32 470 12 34 56' },
];

/**
 * Numéro saisi → numéro international envoyé à l'API (même format qu'avant le sélecteur d'indicatif) : indicatif
 * choisi + numéro national sans son 0 de tête. Une saisie déjà internationale (+…, 00…) est gardée telle quelle.
 */
export function composerTelephone(indicatif: Indicatif, saisie: string): string {
  const brut = (saisie ?? '').trim();
  if (!brut || indicatif === 'autre' || brut.startsWith('+') || brut.startsWith('00')) return brut;
  return `${indicatif} ${brut.replace(/^0+/, '')}`;
}

/** Numéro facultatif : vide accepté, sinon les règles de l'API sur le numéro composé. */
const telephoneValide: ValidatorFn = (groupe: AbstractControl): ValidationErrors | null => {
  const numero = composerTelephone(groupe.get('indicatif')?.value ?? 'autre', groupe.get('telephone')?.value ?? '');
  return validateurTelephone({ value: numero } as AbstractControl) ? { telephone: true } : null;
};

/**
 * Inscription en 3 étapes ; le compte s'active par le lien envoyé par e-mail (A14, pas de connexion automatique).
 * La photo de profil n'est plus demandée ici (l'API l'accepte absente) : elle s'ajoute depuis Compte.
 */
@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterLink, AuthShellComponent, AuthChampComponent, AuthBanniereComponent, BoutonGoogleComponent,
    ReglesMotDePasseComponent, ChoixRoleComponent, IconComponent,
  ],
  templateUrl: './register.component.html',
  styles: [`
    .envoye { display: flex; flex-direction: column; gap: 16px; text-align: center; }
    .envoye p { margin: 0; }
    .note { margin: 0; font-size: var(--kp-fs-secondary); color: var(--kp-text-muted); }
  `],
})
export class RegisterComponent {
  protected readonly liens = LIENS_LEGAUX;
  protected readonly indicatifs = INDICATIFS;
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  readonly etape = signal<Etape>(0);
  readonly titres = TITRES;
  readonly envoi = signal(false);
  readonly erreur = signal<string | null>(null);
  readonly voir = signal(false);
  readonly emailInscrit = signal('');
  readonly renvoiEnCours = signal(false);
  readonly infoRenvoi = signal<string | null>(null);
  readonly renvoiRate = signal(false);

  readonly form = this.fb.nonNullable.group(
    {
      role: ['ROLE_LOCATAIRE' as Role, Validators.required],
      firstName: ['', [Validators.required, Validators.maxLength(50)]],
      lastName: ['', [Validators.required, Validators.maxLength(50)]],
      indicatif: ['+33' as Indicatif],
      telephone: [''],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
      password: ['', [Validators.required, Validators.maxLength(72), Validators.pattern(MOT_DE_PASSE_ROBUSTE)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: [motsDePasseIdentiques, telephoneValide] },
  );

  readonly motDePasse = toSignal(this.form.controls.password.valueChanges, { initialValue: '' });
  readonly role = toSignal(this.form.controls.role.valueChanges, { initialValue: this.form.controls.role.value });
  readonly indicatif = toSignal(this.form.controls.indicatif.valueChanges, { initialValue: this.form.controls.indicatif.value });

  /** Texte du panneau photo (ordinateur) selon ce que la personne veut faire d'abord. */
  readonly panneau = computed(() => (this.role() === 'ROLE_PROPRIETAIRE' ? PANNEAU_PROPRIETAIRE : PANNEAU_LOCATAIRE));
  readonly exempleTelephone = computed(() => INDICATIFS.find(i => i.valeur === this.indicatif())?.exemple ?? '');

  readonly numeroEtape = computed(() => {
    const e = this.etape();
    return e === 'envoye' ? 2 : e;
  });

  private readonly retour = retourSur(this.route.snapshot.queryParamMap.get('returnUrl'));

  retourParams(): Record<string, string> | null {
    return this.retour ? { returnUrl: this.retour } : null;
  }

  private readonly champsParEtape: Champ[][] = [
    [],
    ['firstName', 'lastName', 'telephone'],
    ['email', 'password', 'confirmPassword'],
  ];

  /** Message sous un champ, une fois le champ touché (ou après un clic sur « Continuer »). */
  erreurDe(champ: Champ): string | null {
    const c = this.form.controls[champ];
    if (!c.touched) return null;
    switch (champ) {
      case 'firstName':
        return c.invalid ? 'Entrez votre prénom.' : null;
      case 'lastName':
        return c.invalid ? 'Entrez votre nom.' : null;
      case 'telephone':
        if (!this.form.hasError('telephone')) return null;
        return this.indicatif() === 'autre'
          ? MESSAGE_TELEPHONE_INVALIDE
          : `Ce numéro semble incomplet ou invalide. Exemple : ${this.exempleTelephone()}.`;
      case 'email':
        return c.invalid ? 'Entrez une adresse e-mail valide.' : null;
      case 'password':
        return c.invalid ? 'Le mot de passe doit remplir les 3 critères.' : null;
      case 'confirmPassword':
        if (c.invalid) return 'Confirmez votre mot de passe.';
        return this.form.hasError('differents') ? 'Les deux mots de passe sont différents.' : null;
    }
  }

  suivant(): void {
    const e = this.etape();
    if (e === 'envoye') return;
    const champs = this.champsParEtape[e];
    champs.forEach(c => this.form.controls[c].markAsTouched());
    const enErreur = champs.filter(c => this.erreurDe(c));
    if (enErreur.length) {
      // « Continuer » n'est jamais désactivé : chaque champ manquant le dit, le premier reçoit le focus
      document.getElementById(enErreur[0])?.focus();
      return;
    }
    if (e < 2) {
      this.etape.set((e + 1) as Etape);
      this.erreur.set(null);
      return;
    }
    this.inscrire();
  }

  precedent(): void {
    const e = this.etape();
    if (typeof e === 'number' && e > 0) {
      this.etape.set((e - 1) as Etape);
      this.erreur.set(null);
    }
  }

  private inscrire(): void {
    this.envoi.set(true);
    this.erreur.set(null);
    const v = this.form.getRawValue();
    const email = v.email.trim();
    this.authService
      .register({
        firstName: v.firstName.trim(),
        lastName: v.lastName.trim(),
        email,
        password: v.password,
        role: v.role,
        telephone: composerTelephone(v.indicatif, v.telephone),
      })
      .subscribe({
        next: () => {
          this.envoi.set(false);
          this.emailInscrit.set(email);
          this.etape.set('envoye');
        },
        error: err => {
          this.envoi.set(false);
          this.erreur.set(messageErreurApi(err, 'L’inscription n’a pas abouti. Réessayez.'));
        },
      });
  }

  connecterAvecGoogle(jeton: string): void {
    this.erreur.set(null);
    this.authService.connecterAvecGoogle(jeton).subscribe({
      next: user => {
        if (!user) {
          void this.router.navigate(['/auth/google-role'], { queryParams: this.retourParams() });
        } else {
          void this.router.navigateByUrl(this.retour ?? '/', { replaceUrl: true });
        }
      },
      error: err => this.erreur.set(messageErreurApi(err, 'Connexion Google impossible. Réessayez.')),
    });
  }

  /** A14 : nouveau lien de confirmation (réponse identique que le compte existe ou non). */
  renvoyerLien(): void {
    if (!this.emailInscrit() || this.renvoiEnCours()) return;
    this.renvoiEnCours.set(true);
    this.infoRenvoi.set(null);
    this.authService.renvoyerVerification(this.emailInscrit()).subscribe({
      next: () => {
        this.renvoiEnCours.set(false);
        this.renvoiRate.set(false);
        this.infoRenvoi.set('Un nouveau lien vient d’être envoyé si le compte attend encore sa confirmation.');
      },
      error: err => {
        this.renvoiEnCours.set(false);
        this.renvoiRate.set(true);
        this.infoRenvoi.set(messageErreurApi(err, 'Le lien n’a pas pu être renvoyé. Réessayez plus tard.'));
      },
    });
  }
}
