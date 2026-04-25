import { signal, effect, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const THEME_KEY = 'theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private platformId = inject(PLATFORM_ID);
  
  private _theme = signal<'light' | 'dark'>('light');
  theme = this._theme.asReadonly();

  constructor() {
    this.init();
  }

  private init() {
    if (isPlatformBrowser(this.platformId)) {
      const saved = localStorage.getItem(THEME_KEY) as 'light' | 'dark' | null;
      if (saved) {
        this._theme.set(saved);
      } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        this._theme.set('dark');
      }
      this.applyTheme(this._theme());
    }
  }

  private applyTheme(t: 'light' | 'dark') {
    if (!isPlatformBrowser(this.platformId)) return;
    
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem(THEME_KEY, t);
    
    if (t === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  toggleTheme() {
    this._theme.update(t => t === 'light' ? 'dark' : 'light');
    this.applyTheme(this._theme());
  }
}