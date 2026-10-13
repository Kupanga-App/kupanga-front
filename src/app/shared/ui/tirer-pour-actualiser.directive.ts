import { Directive, ElementRef, OnDestroy, OnInit, inject, output } from '@angular/core';

const SEUIL = 72;
const MAX = 96;

/**
 * Tirer pour actualiser (écrans tactiles) : tirer la liste vers le bas depuis le haut de la page émet `actualiser`.
 * Un indicateur rond suit le doigt ; rien ne se passe à la souris (bouton « Réessayer » ou rechargement ailleurs).
 */
@Directive({
  selector: '[kpTirerPourActualiser]',
  standalone: true,
})
export class TirerPourActualiserDirective implements OnInit, OnDestroy {
  readonly actualiser = output<void>();

  private hote = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
  private indicateur!: HTMLElement;
  private depart: number | null = null;
  private distance = 0;

  private readonly debut = (e: TouchEvent) => {
    this.depart = window.scrollY <= 0 && e.touches.length === 1 ? e.touches[0].clientY : null;
    this.distance = 0;
  };

  private readonly deplacement = (e: TouchEvent) => {
    if (this.depart === null) return;
    const dy = e.touches[0].clientY - this.depart;
    if (dy <= 0 || window.scrollY > 0) {
      this.distance = 0;
      this.afficher(0);
      return;
    }
    this.distance = Math.min(MAX, dy * 0.5);
    this.afficher(this.distance);
  };

  private readonly fin = () => {
    if (this.depart === null) return;
    const declenche = this.distance >= SEUIL * 0.75;
    this.depart = null;
    this.afficher(0);
    if (declenche) {
      this.actualiser.emit();
    }
  };

  ngOnInit(): void {
    this.indicateur = document.createElement('div');
    this.indicateur.setAttribute('aria-hidden', 'true');
    Object.assign(this.indicateur.style, {
      position: 'fixed', left: '50%', top: 'calc(8px + env(safe-area-inset-top, 0px))', zIndex: '60',
      width: '36px', height: '36px', marginLeft: '-18px', borderRadius: '50%',
      background: 'var(--kp-surface)', boxShadow: 'var(--kp-shadow)', opacity: '0',
      transform: 'translateY(-48px)', pointerEvents: 'none',
      border: '3px solid var(--kp-surface-3)', borderTopColor: 'var(--kp-primary)',
    } as Partial<CSSStyleDeclaration>);
    this.hote.prepend(this.indicateur);
    this.hote.addEventListener('touchstart', this.debut, { passive: true });
    this.hote.addEventListener('touchmove', this.deplacement, { passive: true });
    this.hote.addEventListener('touchend', this.fin);
    this.hote.addEventListener('touchcancel', this.fin);
  }

  ngOnDestroy(): void {
    this.hote.removeEventListener('touchstart', this.debut);
    this.hote.removeEventListener('touchmove', this.deplacement);
    this.hote.removeEventListener('touchend', this.fin);
    this.hote.removeEventListener('touchcancel', this.fin);
    this.indicateur?.remove();
  }

  private afficher(distance: number): void {
    const progression = Math.min(1, distance / SEUIL);
    this.indicateur.style.opacity = String(progression);
    this.indicateur.style.transform = `translateY(${distance - 48}px) rotate(${progression * 270}deg)`;
  }
}
