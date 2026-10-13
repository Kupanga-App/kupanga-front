import { AfterViewInit, Component, DestroyRef, ElementRef, inject, output, signal, viewChild } from '@angular/core';
import { IconComponent } from '../components/icon/icon.component';

/** L'API refuse un PNG de plus de 2000 × 1000 px (B6) : la zone de dessin est plafonnée en dessous. */
const LARGEUR_MAX = 1600;
const HAUTEUR_MAX = 800;

/**
 * Zone de signature au doigt, au stylet ou à la souris (événements de pointeur, `touch-action: none`).
 * Émet le PNG en base64 sans préfixe (`''` quand la zone est vide), format attendu par l'API.
 */
@Component({
  selector: 'kp-signature',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div class="zone" #zone>
      <canvas #canvas
              (pointerdown)="debut($event)" (pointermove)="trait($event)"
              (pointerup)="fin()" (pointercancel)="fin()" (pointerleave)="fin()"
              aria-label="Zone de signature : dessinez votre signature"></canvas>
      @if (vide()) {
        <span class="invite" aria-hidden="true">Signez ici</span>
      }
      <span class="ligne" aria-hidden="true"></span>
    </div>
    <div class="pied">
      <span class="kp-aide">Dessinez votre signature avec le doigt ou la souris.</span>
      <button type="button" class="kp-btn kp-btn--ghost kp-btn--sm" (click)="effacer()" [disabled]="vide()">
        <kp-icon name="eraser" [size]="18" /> Effacer
      </button>
    </div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; gap: 8px; }
    .zone {
      position: relative; height: clamp(180px, 40dvh, 320px);
      border: 1px solid var(--kp-border-strong); border-radius: var(--kp-radius); background: #ffffff; overflow: hidden;
    }
    canvas { width: 100%; height: 100%; touch-action: none; cursor: crosshair; }
    .invite {
      position: absolute; left: 50%; top: 45%; transform: translate(-50%, -50%);
      color: #9aa4a9; font-size: var(--kp-fs-lg); pointer-events: none;
    }
    .ligne { position: absolute; left: 24px; right: 24px; bottom: 28%; border-bottom: 1px dashed #c4cab9; pointer-events: none; }
    .pied { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  `],
})
export class SignatureComponent implements AfterViewInit {
  readonly signature = output<string>();
  readonly vide = signal(true);

  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly zone = viewChild.required<ElementRef<HTMLElement>>('zone');
  private readonly destroyRef = inject(DestroyRef);
  private ctx: CanvasRenderingContext2D | null = null;
  private dessin = false;

  ngAfterViewInit(): void {
    this.dimensionner();
    if (typeof ResizeObserver !== 'undefined') {
      // Rotation de l'écran : la zone est redimensionnée et effacée (une signature déformée serait refusée par l'œil)
      const obs = new ResizeObserver(() => this.dimensionner());
      obs.observe(this.zone().nativeElement);
      this.destroyRef.onDestroy(() => obs.disconnect());
    }
  }

  private dimensionner(): void {
    const canvas = this.canvas().nativeElement;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const ratio = Math.min(window.devicePixelRatio || 1, LARGEUR_MAX / rect.width, HAUTEUR_MAX / rect.height);
    const largeur = Math.round(rect.width * ratio);
    const hauteur = Math.round(rect.height * ratio);
    if (canvas.width === largeur && canvas.height === hauteur) return;
    canvas.width = largeur;
    canvas.height = hauteur;
    this.ctx = canvas.getContext('2d');
    if (this.ctx) {
      this.ctx.lineWidth = 2.5 * ratio;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.strokeStyle = '#10212b';
    }
    this.marquerVide();
  }

  private point(e: PointerEvent): { x: number; y: number } {
    const canvas = this.canvas().nativeElement;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) * canvas.width) / rect.width,
      y: ((e.clientY - rect.top) * canvas.height) / rect.height,
    };
  }

  debut(e: PointerEvent): void {
    if (!this.ctx) return;
    e.preventDefault();
    this.canvas().nativeElement.setPointerCapture?.(e.pointerId);
    this.dessin = true;
    const { x, y } = this.point(e);
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    // Un simple point (initiales, point final)
    this.ctx.lineTo(x + 0.1, y + 0.1);
    this.ctx.stroke();
  }

  trait(e: PointerEvent): void {
    if (!this.ctx || !this.dessin) return;
    e.preventDefault();
    const { x, y } = this.point(e);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
  }

  fin(): void {
    if (!this.dessin) return;
    this.dessin = false;
    this.vide.set(false);
    this.signature.emit(this.base64());
  }

  effacer(): void {
    const canvas = this.canvas().nativeElement;
    this.ctx?.clearRect(0, 0, canvas.width, canvas.height);
    this.marquerVide();
  }

  private marquerVide(): void {
    if (!this.vide()) {
      this.vide.set(true);
      this.signature.emit('');
    }
  }

  private base64(): string {
    return this.canvas().nativeElement.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
  }
}
