import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LandingComponent } from './landing.component';
import { ThemeService } from '../../core/services/theme.service';

describe('LandingComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [LandingComponent], providers: [provideRouter([])] });
  });

  it('affiche le titre et les liens vers l’inscription et les annonces', () => {
    const f = TestBed.createComponent(LandingComponent);
    f.detectChanges();
    const el: HTMLElement = f.nativeElement;
    expect(el.querySelector('h1')?.textContent).toContain('De l’annonce à la fin du bail');
    expect(el.querySelector('a[href="/auth/register"]')).not.toBeNull();
    expect(el.querySelector('a[href="/explorer"]')).not.toBeNull();
  });

  it('ne charge pas le lecteur YouTube tant que la vidéo n’est pas lue', () => {
    const f = TestBed.createComponent(LandingComponent);
    f.detectChanges();
    expect(f.nativeElement.querySelector('iframe')).toBeNull();
    expect(f.nativeElement.querySelector('.affiche')).not.toBeNull();
  });

  it('s’affiche en clair par défaut, même si l’appareil est en sombre, et rend la main en partant', () => {
    const theme = TestBed.inject(ThemeService);
    theme.choisir('systeme');
    const f = TestBed.createComponent(LandingComponent);
    f.detectChanges();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(f.componentInstance.sombre()).toBeFalse();
    f.destroy();
    expect(document.documentElement.hasAttribute('data-theme')).toBeFalse();
  });

  it('bascule entre thème clair et sombre', () => {
    const theme = TestBed.inject(ThemeService);
    theme.choisir('clair');
    const f = TestBed.createComponent(LandingComponent);
    f.detectChanges();
    f.componentInstance.basculerTheme();
    expect(theme.choix()).toBe('sombre');
    f.componentInstance.basculerTheme();
    expect(theme.choix()).toBe('clair');
    theme.choisir('systeme');
  });
});
