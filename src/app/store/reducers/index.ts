import { ActionReducerMap } from '@ngrx/store';
import { AppState } from '../app-state';

export const reducers: ActionReducerMap<AppState> = {
  appName: (state = 'Kupanga', action) => state
};
