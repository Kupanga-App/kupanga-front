import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'kp-signature-pad',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './signature-pad.component.html',
  styleUrls: ['./signature-pad.component.scss'],
})
export class SignaturePadComponent implements AfterViewInit {
  @ViewChild('canvas') private canvasRef!: ElementRef<HTMLCanvasElement>;
  @Input() required = false;
  @Output() signatureChange = new EventEmitter<string>();

  readonly isEmpty = signal(true);

  private drawing = false;
  private ctx!: CanvasRenderingContext2D;

  ngAfterViewInit(): void {
    const ctx = this.canvasRef.nativeElement.getContext('2d');
    if (!ctx) return;
    this.ctx = ctx;
    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = '#111827';
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
  }

  onMouseDown(e: MouseEvent): void {
    if (!this.ctx) return;
    this.drawing = true;
    const { x, y } = this.mousePos(e);
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
  }

  onMouseMove(e: MouseEvent): void {
    if (!this.ctx || !this.drawing) return;
    const { x, y } = this.mousePos(e);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
    this.markDirty();
  }

  onMouseUp(): void {
    this.drawing = false;
  }

  onMouseLeave(): void {
    this.drawing = false;
  }

  onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (!this.ctx) return;
    this.drawing = true;
    const { x, y } = this.touchPos(e);
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
  }

  onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (!this.ctx || !this.drawing) return;
    const { x, y } = this.touchPos(e);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
    this.markDirty();
  }

  onTouchEnd(): void {
    this.drawing = false;
  }

  clear(): void {
    if (!this.ctx) return;
    const canvas = this.canvasRef.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.isEmpty.set(true);
    this.signatureChange.emit('');
  }

  getSignatureBase64(): string {
    return this.canvasRef.nativeElement
      .toDataURL('image/png')
      .replace('data:image/png;base64,', '');
  }

  private markDirty(): void {
    this.isEmpty.set(false);
    this.signatureChange.emit(this.getSignatureBase64());
  }

  private mousePos(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  private touchPos(e: TouchEvent): { x: number; y: number } {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const t = e.touches[0];
    return { x: t.clientX - rect.left, y: t.clientY - rect.top };
  }
}
