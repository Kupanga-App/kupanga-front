import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { ThemeService } from '../../core/services/theme.service';
import { LIENS_LEGAUX } from '../../core/legal/liens-legaux';

/**
 * Vidéo de démonstration (kupanga-Api/video). Identifiant YouTube à renseigner après la mise en ligne
 * (https://youtu.be/<identifiant>) ; vide = affiche seule, sans lecteur.
 */
export const VIDEO_YOUTUBE_ID = 'lGlYv87DOc0';
export const VIDEO_DUREE = '9:57';

/**
 * Page d'accueil publique (visiteur non connecté, adresse `/`) : direction « Nuit éditoriale ».
 * Thème clair par défaut, quel que soit l'appareil ; le bouton passe en sombre (choix mémorisé, même réglage que le
 * compte : `ThemeService`). En quittant la page, l'application retrouve le thème de l'appareil si rien n'a été choisi.
 * La vidéo est une façade : le lecteur YouTube (sans cookies) ne se charge qu'au clic.
 */
@Component({
  selector: 'kp-landing',
  standalone: true,
  imports: [RouterLink, IconComponent],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingComponent implements OnDestroy {
  private readonly theme = inject(ThemeService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly videoId = VIDEO_YOUTUBE_ID;
  readonly videoDuree = VIDEO_DUREE;
  readonly lecture = signal(false);
  readonly annee = new Date().getFullYear();
  readonly liens = LIENS_LEGAUX;

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
