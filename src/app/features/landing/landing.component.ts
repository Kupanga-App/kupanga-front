import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { AvatarComponent } from '../../shared/ui/avatar.component';
import { LogoComponent } from '../../shared/ui/logo.component';
import { LandingEtapesComponent } from './landing-etapes.component';
import { OptionSegment, SegmentedComponent } from '../../shared/ui/segmented.component';
import { ThemeService } from '../../core/services/theme.service';
import { AuthService } from '../../core/auth/services/auth.service';
import { LIENS_LEGAUX } from '../../core/legal/liens-legaux';

/**
 * Vidéo de démonstration (kupanga-Api/video). Identifiant YouTube à renseigner après la mise en ligne
 * (https://youtu.be/<identifiant>) ; vide = affiche seule, sans lecteur.
 */
export const VIDEO_YOUTUBE_ID = 'lGlYv87DOc0';
export const VIDEO_DUREE = '9:57';

export type PaysExemple = 'rdc' | 'fr';

/** Ce qui change d'un pays à l'autre (maquette `O1v2-Landing`, section « Les mêmes écrans »). */
const DIFFERENCES: Record<PaysExemple, { cle: string; valeur: string }[]> = {
  fr: [
    { cle: 'Devise', valeur: 'Euro' },
    { cle: 'Adresse', valeur: 'Ville et code postal' },
    { cle: 'Logement', valeur: 'DPE et GES affichés' },
    { cle: 'Garantie', valeur: 'Dépôt de garantie en montant' },
    { cle: 'Paiement du loyer', valeur: 'Virement ou chèque, hors application' },
    { cle: 'Contact', valeur: 'Message ou appel' },
  ],
  rdc: [
    { cle: 'Devise', valeur: 'Dollar US ou franc congolais' },
    { cle: 'Adresse', valeur: 'Commune, quartier et point de repère' },
    { cle: 'Logement', valeur: 'Heures de courant par jour' },
    { cle: 'Garantie', valeur: 'En mois de loyer, plus loyers d’avance' },
    { cle: 'Paiement du loyer', valeur: 'Mobile Money ou espèces, hors application' },
    { cle: 'Contact', valeur: 'Message, appel ou WhatsApp' },
  ],
};

/** Annonce d'exemple (illustration, pas une vraie annonce). */
const EXEMPLES: Record<PaysExemple, {
  image: string; alt: string; prix: string; titre: string; lieu: string; etiquettes: string[]; second: string;
}> = {
  fr: {
    image: '/landing/france.jpg', alt: 'Salon lumineux d’un studio à Paris', prix: '755 €',
    titre: 'Studio refait à neuf, Belleville', lieu: 'Paris 75020 · 25 m² · meublé',
    etiquettes: ['Studio', 'Meublé', 'DPE et GES affichés'], second: 'Appeler',
  },
  rdc: {
    image: '/landing/rdc.jpg', alt: 'Villa avec piscine à Mont-Ngafula', prix: '1 860 $US',
    titre: 'Villa 4 chambres à Mama Yemo',
    lieu: 'Commune de Mont-Ngafula, quartier Mama Yemo · repère : portail bleu, à côté du salon de coiffure',
    etiquettes: ['Courant 12 h par jour', 'Forage', 'Gardiennage'], second: 'WhatsApp',
  },
};

/**
 * Page d'accueil publique (visiteur non connecté, adresse `/`), maquette `O1v2-Landing`.
 * Thème clair par défaut, quel que soit l'appareil ; le bouton passe en sombre (choix mémorisé, même réglage que le
 * compte : `ThemeService`). En quittant la page, l'application retrouve le thème de l'appareil si rien n'a été choisi.
 * La vidéo est une façade : le lecteur YouTube (sans cookies) ne se charge qu'au clic.
 */
@Component({
  selector: 'kp-landing',
  standalone: true,
  imports: [RouterLink, IconComponent, AvatarComponent, LogoComponent, SegmentedComponent, LandingEtapesComponent],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingComponent implements OnDestroy {
  private readonly theme = inject(ThemeService);
  private readonly sanitizer = inject(DomSanitizer);
  protected readonly auth = inject(AuthService);

  readonly videoId = VIDEO_YOUTUBE_ID;
  readonly videoDuree = VIDEO_DUREE;
  readonly lecture = signal(false);
  readonly annee = new Date().getFullYear();
  readonly liens = LIENS_LEGAUX;

  /** Bascule France / RDC : la RDC d'abord (décision du 6 novembre 2026). */
  readonly pays = signal<PaysExemple>('rdc');
  readonly optionsPays: OptionSegment<PaysExemple>[] = [
    { valeur: 'fr', libelle: 'France' },
    { valeur: 'rdc', libelle: 'RDC' },
  ];
  readonly differences = computed(() => DIFFERENCES[this.pays()]);
  readonly exemple = computed(() => EXEMPLES[this.pays()]);

  readonly connecte = computed(() => !!this.auth.currentUser());
  readonly nomComplet = computed(() => {
    const u = this.auth.currentUser();
    return u ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() : '';
  });

  /** Sombre seulement si l'utilisateur l'a choisi ; sinon la landing page est en clair. */
  readonly sombre = computed(() => this.theme.choix() === 'sombre');

  constructor() {
    if (this.theme.choix() === 'systeme') document.documentElement.setAttribute('data-theme', 'light');
  }

  ngOnDestroy(): void {
    // Aucun choix fait sur la page : le reste de l'application suit de nouveau l'appareil
    if (this.theme.choix() === 'systeme') document.documentElement.removeAttribute('data-theme');
  }

  readonly lecteur = computed<SafeResourceUrl | null>(() => this.videoId
    ? this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.youtube-nocookie.com/embed/${encodeURIComponent(this.videoId)}?autoplay=1&rel=0&hl=fr&cc_lang_pref=fr&cc_load_policy=1`)
    : null);

  readonly lienYoutube = computed(() => (this.videoId ? `https://youtu.be/${this.videoId}` : null));

  basculerTheme(): void {
    this.theme.choisir(this.sombre() ? 'clair' : 'sombre');
  }

  lire(): void {
    if (this.videoId) this.lecture.set(true);
  }
}
