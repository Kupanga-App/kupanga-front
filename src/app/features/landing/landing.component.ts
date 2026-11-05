import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { ThemeService } from '../../core/services/theme.service';

/**
 * Vidéo de démonstration (kupanga-Api/video). Identifiant YouTube à renseigner après la mise en ligne
 * (https://youtu.be/<identifiant>) ; vide = affiche seule, sans lecteur.
 */
export const VIDEO_YOUTUBE_ID = '';
export const VIDEO_DUREE = '10:00';

/**
 * Page d'accueil publique (visiteur non connecté, adresse `/`) : direction « Nuit éditoriale ».
 * Thème clair ou sombre selon l'appareil, basculable (même réglage que le compte : `ThemeService`).
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
export class LandingComponent {
  private readonly theme = inject(ThemeService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly videoId = VIDEO_YOUTUBE_ID;
  readonly videoDuree = VIDEO_DUREE;
  readonly lecture = signal(false);
  readonly annee = new Date().getFullYear();

  /** Thème réellement affiché (le choix « comme l'appareil » suit `prefers-color-scheme`). */
  readonly sombre = computed(() => {
    const choix = this.theme.choix();
    if (choix !== 'systeme') return choix === 'sombre';
    return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches;
  });

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
