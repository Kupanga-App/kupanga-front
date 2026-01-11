import { createFeatureSelector, createReducer, createSelector, on } from '@ngrx/store';
import { login, logout } from './auth.actions';

export interface AuthState {
  isAuthenticated: boolean;
  userType: 'owner' | 'tenant' | null;
  user: { name: string; email: string; avatarUrl?: string } | null;
}

export const initialState: AuthState = {
  isAuthenticated: false,
  userType: 'owner', // Mocked as 'owner' for demonstration
  user: { name: 'Gedeon M.', email: 'gedeon@kupanga.com' }, // Mocked user data
};

export const authReducer = createReducer(
  initialState,
  on(login, (state, { userType }) => ({ ...state, isAuthenticated: true, userType })),
  on(logout, (state) => ({ ...state, isAuthenticated: false, userType: null, user: null }))
);

// Feature Selector
export const selectAuthState = createFeatureSelector<AuthState>('auth');

// Selectors
export const selectIsAuthenticated = createSelector(selectAuthState, (state) => state.isAuthenticated);
export const selectUser = createSelector(selectAuthState, (state) => state.user);
export const selectUserType = createSelector(selectAuthState, (state) => state.userType);
