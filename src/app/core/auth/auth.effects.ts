import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { map, exhaustMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { login } from './auth.actions';

@Injectable()
export class AuthEffects {
  private actions$ = inject(Actions);

  // Example effect for login
  // login$ = createEffect(() =>
  //   this.actions$.pipe(
  //     ofType(login),
  //     exhaustMap(action =>
  //       // Call your service here
  //       // this.authService.login(action.credentials).pipe(
  //       //   map(user => loginSuccess({ user })),
  //       //   catchError(error => of(loginFailure({ error })))
  //       // )
  //       of({ type: '[Auth] Login Success' }) // Placeholder
  //     )
  //   )
  // );
}
