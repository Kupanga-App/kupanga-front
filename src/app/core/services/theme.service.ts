import { Injectable, signal } from '@angular/core';

export type KupangaTheme = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly STORAGE_KEY = 'kp_theme';

  theme = signal<KupangaTheme>(this.getStoredTheme());

  constructor() {
    this.setTheme(this.theme());
  }

  toggleTheme(): void {
    const next: KupangaTheme = this.theme() === 'light' ? 'dark' : 'light';
    this.setTheme(next);
  }

  setTheme(theme: KupangaTheme): void {
    this.theme.set(theme);
    document.body.classList.toggle('kp-theme-dark', theme === 'dark');
    localStorage.setItem(this.STORAGE_KEY, theme);
  }

  private getStoredTheme(): KupangaTheme {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}
