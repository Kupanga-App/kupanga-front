import { Component, Input, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { inject } from '@angular/core';
import { KupangaLogoComponent } from '../kupanga-logo/kupanga-logo.component';

export interface AuthRubric {
  page: string;
  text: string;
}

@Component({
  selector: 'kp-auth-layout-c',
  standalone: true,
  imports: [CommonModule, RouterModule, KupangaLogoComponent],
  templateUrl: './auth-layout-c.component.html',
  styleUrls: ['./auth-layout-c.component.scss']
})
export class AuthLayoutCComponent {
  private sanitizer = inject(DomSanitizer);

  @Input() kicker = '';
  @Input() badge = 'N° 0001';
  @Input() eyebrow = '';
  @Input() title = '';
  @Input() sub = '';
  @Input() rubrics: AuthRubric[] = [];
  @Input() footer?: TemplateRef<unknown>;

  private _hero = '';
  safeHero: SafeHtml = '';
  @Input()
  set hero(val: string) {
    this._hero = val;
    this.safeHero = this.sanitizer.bypassSecurityTrustHtml(val);
  }

  private _subhero = '';
  safeSubhero: SafeHtml = '';
  @Input()
  set subhero(val: string) {
    this._subhero = val;
    this.safeSubhero = this.sanitizer.bypassSecurityTrustHtml(val);
  }
  get subhero() { return this._subhero; }

  today = new Date();

  get formattedDate(): string {
    return this.today.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }
}
