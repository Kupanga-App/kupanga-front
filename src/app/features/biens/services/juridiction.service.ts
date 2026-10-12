import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Pays } from '../models/bien.model';
import { JuridictionConfig, PaysPrisEnCharge } from '../models/juridiction.model';

/**
 * J6 : configuration publique des juridictions (pays pris en charge, champs, devises, types de bien).
 * Elle ne change qu'au redéploiement de l'API : une seule requête par pays et par session.
 */
@Injectable({ providedIn: 'root' })
export class JuridictionService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/juridictions`;

  private pays$?: Observable<PaysPrisEnCharge[]>;
  private configurations = new Map<Pays, Observable<JuridictionConfig>>();

  paysPrisEnCharge(): Observable<PaysPrisEnCharge[]> {
    this.pays$ ??= this.http.get<PaysPrisEnCharge[]>(this.apiUrl).pipe(shareReplay({ bufferSize: 1, refCount: false }));
    return this.pays$;
  }

  /** 404 si le pays n'est pas pris en charge. Une erreur n'est pas gardée en cache (nouvel essai au prochain appel). */
  configuration(pays: Pays): Observable<JuridictionConfig> {
    let config$ = this.configurations.get(pays);
    if (!config$) {
      config$ = this.http.get<JuridictionConfig>(`${this.apiUrl}/${encodeURIComponent(pays)}`)
        .pipe(shareReplay({ bufferSize: 1, refCount: false }));
      this.configurations.set(pays, config$);
      config$.subscribe({ error: () => this.configurations.delete(pays) });
    }
    return config$;
  }
}
