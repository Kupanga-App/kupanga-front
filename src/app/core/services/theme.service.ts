import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  isDark = signal<boolean>(false);

  constructor() {
    // Optional: check for saved preference in localStorage or system preference
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('isDarkMode');

    if (savedTheme !== null) {
      this.setTheme(savedTheme === 'true');
    } else {
      this.setTheme(prefersDark);
    }
  }

  toggleTheme(): void {
    this.setTheme(!this.isDark());
  }

  private setTheme(dark: boolean): void {
    this.isDark.set(dark);
    const element = document.querySelector('html');
    if (element) {
        if (dark) {
            element.classList.add('p-dark');
        } else {
            element.classList.remove('p-dark');
        }
    }
    localStorage.setItem('isDarkMode', String(dark));
  }
}
