import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BoutonWhatsappComponent } from './bouton-whatsapp.component';
import { JuridictionConfig } from '../../../biens/models/juridiction.model';
import { environment } from '../../../../../environments/environment';

function config(pays: 'FR' | 'CD', canaux: JuridictionConfig['canauxNotification']): JuridictionConfig {
  return {
    pays, libelle: pays, devises: [], deviseDefaut: 'USD', champsObligatoires: [], champsMasques: [],
    typesBien: [], canauxNotification: canaux, modesPaiement: [], equipements: [], compteursEdl: [],
  };
}

describe('BoutonWhatsappComponent (C7-C16)', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [BoutonWhatsappComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function creer(pays: 'FR' | 'CD') {
    const fixture = TestBed.createComponent(BoutonWhatsappComponent);
    fixture.componentRef.setInput('type', 'contrat');
    fixture.componentRef.setInput('documentId', 5);
    fixture.componentRef.setInput('pays', pays);
    fixture.detectChanges();
    return fixture;
  }

  it('pays avec WHATSAPP_LIEN : charge le lien et l’affiche en lien wa.me', () => {
    const fixture = creer('CD');
    http.expectOne(`${environment.apiUrl}/juridictions/CD`).flush(config('CD', ['EMAIL', 'WHATSAPP_LIEN']));
    http.expectOne(`${environment.apiUrl}/contrats/5/lien-whatsapp`)
      .flush({ url: 'https://wa.me/243812345678?text=Bonjour', texte: 'Bonjour', numeroConnu: true });
    fixture.detectChanges();

    const a: HTMLAnchorElement = fixture.nativeElement.querySelector('a');
    expect(a.href).toBe('https://wa.me/243812345678?text=Bonjour');
    expect(a.rel).toContain('noopener');
  });

  it('pays sans WhatsApp : aucune requête de lien, aucun bouton', () => {
    const fixture = creer('FR');
    http.expectOne(`${environment.apiUrl}/juridictions/FR`).flush(config('FR', ['EMAIL']));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('a')).toBeNull();
  });

  it('refus de l’API (409) : aucun bouton', () => {
    const fixture = creer('CD');
    http.expectOne(`${environment.apiUrl}/juridictions/CD`).flush(config('CD', ['EMAIL', 'WHATSAPP_LIEN']));
    http.expectOne(`${environment.apiUrl}/contrats/5/lien-whatsapp`)
      .flush({ message: 'Ce contrat n’attend pas la signature du locataire' }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('a')).toBeNull();
  });
});
