import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { App } from './app';
import { HorsLigneService } from './core/pwa/hors-ligne.service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  it('affiche le bandeau « hors ligne » quand le réseau est coupé', () => {
    const fixture = TestBed.createComponent(App);
    TestBed.inject(HorsLigneService).enLigne.set(false);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Hors ligne');
  });

  it('propose la mise à jour quand une nouvelle version est prête', () => {
    const fixture = TestBed.createComponent(App);
    TestBed.inject(HorsLigneService).nouvelleVersion.set(true);
    fixture.detectChanges();
    const bouton = (fixture.nativeElement as HTMLElement).querySelector('button');
    expect(bouton?.textContent).toContain('Mettre à jour');
  });
});
