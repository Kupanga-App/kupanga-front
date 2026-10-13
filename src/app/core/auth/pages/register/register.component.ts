import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../services/auth.service';
import { retourSur } from '../../guards/auth.guard';
import { messageErreurApi } from '../../../http/api-error';
import { ACCEPT_PHOTOS, PhotoRefuseeError, preparerPhoto } from '../../../media/photos';
import { MESSAGE_TELEPHONE_INVALIDE, validateurTelephone } from '../../../telephone/telephone';
import { AuthLayoutComponent } from '../../ui/auth-layout.component';
import { BoutonGoogleComponent } from '../../ui/bouton-google.component';
import { MOT_DE_PASSE_ROBUSTE, ReglesMotDePasseComponent, motsDePasseIdentiques } from '../../ui/mot-de-passe';
import { ChoixRoleComponent } from '../../ui/choix-role.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';

type Etape = 0 | 1 | 2 | 'envoye';

const TITRES = ['Vous êtes', 'Votre profil', 'Vos identifiants'];

/** Inscription en 3 étapes ; le compte s'active par le lien envoyé par e-mail (A14, pas de connexion automatique). */
@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent, BoutonGoogleComponent, ReglesMotDePasseComponent, ChoixRoleComponent, IconComponent],
  templateUrl: './register.component.html',
  styles: [`
    .progression { display: flex; gap: 6px; margin-bottom: 24px; }
    .progression span { flex: 1; height: 4px; border-radius: 2px; background: var(--kp-surface-3); }
    .progression span.fait { background: var(--kp-primary); }
    .photo { display: flex; align-items: center; gap: 16px; }
    .apercu { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; }
    .apercu-vide {
      display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px;
      border-radius: 50%; background: var(--kp-surface-2); color: var(--kp-text-3);
    }
    .oeil { position: absolute; right: 2px; }
    .separateur { display: flex; align-items: center; gap: 12px; margin: 24px 0 16px; color: var(--kp-text-3); font-size: var(--kp-fs-sm); }
    .separateur::before, .separateur::after { content: ''; flex: 1; border-top: 1px solid var(--kp-border); }
    .envoye { display: flex; flex-direction: column; align-items: center; gap: 16px; text-align: center; }
    .envoye__icone {
      display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px;
      border-radius: 50%; background: var(--kp-primary-subtle); color: var(--kp-primary-text);
    }
  `],
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  readonly etape = signal<Etape>(0);
  readonly titres = TITRES;
  readonly acceptPhotos = ACCEPT_PHOTOS;
  readonly messageTelephone = MESSAGE_TELEPHONE_INVALIDE;
  readonly envoi = signal(false);
  readonly erreur = signal<string | null>(null);
  readonly voir = signal(false);
  readonly photo = signal<File | null>(null);
  readonly apercu = signal<string | null>(null);
  readonly emailInscrit = signal('');
  readonly renvoiEnCours = signal(false);
  readonly infoRenvoi = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group(
    {
      role: ['ROLE_PROPRIETAIRE' as 'ROLE_PROPRIETAIRE' | 'ROLE_LOCATAIRE', Validators.required],
      firstName: ['', [Validators.required, Validators.maxLength(50)]],
      lastName: ['', [Validators.required, Validators.maxLength(50)]],
      telephone: ['', [validateurTelephone]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
      password: ['', [Validators.required, Validators.maxLength(72), Validators.pattern(MOT_DE_PASSE_ROBUSTE)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: motsDePasseIdentiques },
  );

  readonly motDePasse = toSignal(this.form.controls.password.valueChanges, { initialValue: '' });

  readonly numeroEtape = computed(() => {
    const e = this.etape();
    return e === 'envoye' ? 3 : e;
  });

  private readonly retour = retourSur(this.route.snapshot.queryParamMap.get('returnUrl'));

  retourParams(): Record<string, string> | null {
    return this.retour ? { returnUrl: this.retour } : null;
  }

  private readonly champsParEtape: (keyof typeof this.form.controls)[][] = [
    ['role'],
    ['firstName', 'lastName', 'telephone'],
    ['email', 'password', 'confirmPassword'],
  ];

  suivant(): void {
    const e = this.etape();
    if (e === 'envoye') return;
    const champs = this.champsParEtape[e];
    champs.forEach(c => this.form.controls[c].markAsTouched());
    if (champs.some(c => this.form.controls[c].invalid)) return;
    if (e < 2) {
      this.etape.set((e + 1) as Etape);
      this.erreur.set(null);
      return;
    }
    if (this.form.hasError('differents')) return;
    this.inscrire();
  }

  precedent(): void {
    const e = this.etape();
    if (typeof e === 'number' && e > 0) {
      this.etape.set((e - 1) as Etape);
      this.erreur.set(null);
    }
  }

  async choisirPhoto(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const fichier = input.files?.[0];
    input.value = '';
    if (!fichier) return;
    this.erreur.set(null);
    // B5 : format et taille contrôlés avant l'envoi, HEIC (iPhone) converti en JPEG
    try {
      const photo = await preparerPhoto(fichier);
      this.photo.set(photo);
      const ancien = this.apercu();
      if (ancien) URL.revokeObjectURL(ancien);
      this.apercu.set(URL.createObjectURL(photo));
    } catch (e) {
      this.erreur.set(e instanceof PhotoRefuseeError ? e.message : 'Cette photo ne peut pas être utilisée.');
    }
  }

  retirerPhoto(): void {
    const ancien = this.apercu();
    if (ancien) URL.revokeObjectURL(ancien);
    this.photo.set(null);
    this.apercu.set(null);
  }

  private inscrire(): void {
    this.envoi.set(true);
    this.erreur.set(null);
    const v = this.form.getRawValue();
    const email = v.email.trim();
    this.authService
      .register(
        { firstName: v.firstName.trim(), lastName: v.lastName.trim(), email, password: v.password, role: v.role, telephone: v.telephone },
        this.photo() ?? undefined,
      )
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
        this.infoRenvoi.set('Un nouveau lien vient d’être envoyé si le compte attend encore sa confirmation.');
      },
      error: err => {
        this.renvoiEnCours.set(false);
        this.infoRenvoi.set(messageErreurApi(err, 'Le lien n’a pas pu être renvoyé. Réessayez plus tard.'));
      },
    });
  }
}
