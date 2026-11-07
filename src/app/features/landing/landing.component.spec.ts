import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { LandingComponent } from './landing.component';
import { ThemeService } from '../../core/services/theme.service';

describe('LandingComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [LandingComponent], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
  });

  it('affiche le titre et les liens vers l’inscription et les annonces', () => {
    const f = TestBed.createComponent(LandingComponent);
    f.detectChanges();
    const el: HTMLElement = f.nativeElement;
    expect(el.querySelector('h1')?.textContent).toContain('Louez entre particuliers, de l’annonce au bail signé');
    expect(el.querySelector('a[href="/auth/register"]')).not.toBeNull();
    expect(el.querySelector('a[href="/explorer"]')).not.toBeNull();
  });

  it('montre la RDC par défaut, puis la France à la bascule', () => {
    const f = TestBed.createComponent(LandingComponent);
    f.detectChanges();
    const el: HTMLElement = f.nativeElement;
    expect(f.componentInstance.pays()).toBe('rdc');
    expect(el.querySelector('.differences')?.textContent).toContain('point de repère');
    f.componentInstance.pays.set('fr');
    f.detectChanges();
    expect(el.querySelector('.differences')?.textContent).toContain('code postal');
    expect(el.querySelector('.annonce')?.textContent).toContain('DPE et GES');
  });

  it('ne nomme plus « Thomas Petit » : le contact d’exemple est Inès Moreau', () => {
    const f = TestBed.createComponent(LandingComponent);
    f.detectChanges();
    const texte = (f.nativeElement as HTMLElement).textContent ?? '';
    expect(texte).not.toContain('Thomas Petit');
    expect(texte).toContain('Inès Moreau');
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
