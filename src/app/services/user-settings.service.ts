import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { LoadingService } from './loading.service';
import { UserSettings } from '../models/user-settings.model';
import { ThemeService } from './theme.service';
import { API_BASE_URL } from './api-config';

@Injectable({ providedIn: 'root' })
export class UserSettingsService {
  private http = inject(HttpClient);
  private themeService = inject(ThemeService);
  private loadingService = inject(LoadingService);

  private _settings = signal<UserSettings | null>(null);
  settings = this._settings.asReadonly();

  private readonly settingsUrl = `${API_BASE_URL}/settings`;

  constructor() {
    // App single-user locale: le impostazioni sono sempre disponibili, nessun gating su auth.
    this.loadSettings();
  }

  private mapSettings(raw: any): UserSettings {
    return {
      ...raw,
      createdAt: typeof raw.createdAt === 'string' ? new Date(raw.createdAt) : null,
      updatedAt: typeof raw.updatedAt === 'string' ? new Date(raw.updatedAt) : null
    } as UserSettings;
  }

  async loadSettings(): Promise<void> {
    this.loadingService.showLoading();
    try {
      const row = await firstValueFrom(this.http.get<any>(this.settingsUrl));
      const settings = this.mapSettings(row);
      this._settings.set(settings);

      if (settings.theme !== this.themeService.theme()) {
        this.themeService.setTheme(settings.theme);
      }
    } catch (e) {
      console.error('loadSettings error:', e);
    } finally {
      this.loadingService.hideLoading();
    }
  }

  getDefaultFretboardStyleIndex(): number {
    return this._settings()?.fretboardStyleIndex ?? 0;
  }

  async saveSettings(theme: 'light' | 'dark', fretboardStyleIndex: number): Promise<void> {
    await this.updateSettings({ theme, fretboardStyleIndex });
  }

  async updateSettings(updates: Partial<UserSettings>): Promise<void> {
    const existingSettings = this._settings();
    if (!existingSettings) return;

    this.loadingService.showLoading();
    try {
      const row = await firstValueFrom(this.http.put<any>(this.settingsUrl, updates));
      const settings = this.mapSettings(row);
      this._settings.set(settings);

      if (updates.theme && updates.theme !== this.themeService.theme()) {
        this.themeService.setTheme(updates.theme);
      }
    } catch (e) {
      console.error('updateSettings error:', e);
    } finally {
      this.loadingService.hideLoading();
    }
  }
}
