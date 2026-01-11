import { createAction, props } from '@ngrx/store';

export const login = createAction('[Auth] Login', props<{ userType: 'owner' | 'tenant' }>());
export const logout = createAction('[Auth] Logout');
