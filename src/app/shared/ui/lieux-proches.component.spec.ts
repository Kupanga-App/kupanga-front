import { TestBed } from '@angular/core/testing';
import { LieuxProchesComponent } from './lieux-proches.component';

describe('LieuxProchesComponent', () => {
  function rendre(pois: string[] | null) {
    const fixture = TestBed.createComponent(LieuxProchesComponent);
    fixture.componentRef.setInput('pois', pois);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('affiche une étiquette par lieu proche', () => {
    const el = rendre(['École', 'Pharmacie']);
    const tags = Array.from(el.querySelectorAll('.kp-tag')).map(t => t.textContent?.trim());
    expect(tags).toEqual(['École', 'Pharmacie']);
  });

  it('n’affiche rien sans lieu proche', () => {
    expect(rendre([]).querySelector('.lieux')).toBeNull();
    expect(rendre(null).querySelector('.lieux')).toBeNull();
  });
});
