import { Injectable, inject, signal, effect } from '@angular/core';
import { getFirestore, doc, getDoc, setDoc, Firestore } from 'firebase/firestore';
import { AuthService } from './auth.service';
import { LoadingService } from './loading.service';
import { UserSettings } from '../models/user-settings.model';
import { ThemeService } from './theme.service';

@Injectable({ providedIn: 'root' })
export class UserSettingsService {
  private firestore: Firestore;
  private authService = inject(AuthService);
  private themeService = inject(ThemeService);
  private loadingService = inject(LoadingService);

  private _settings = signal<UserSettings | null>(null);
  settings = this._settings.asReadonly();

  constructor() {
    this.firestore = getFirestore(this.authService.app);
    
    // Load settings when user becomes authenticated
    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        this.loadSettings();
      } else {
        this._settings.set(null);
      }
    });
  }

  async loadSettings(): Promise<void> {
    const userId = this.authService.getUserId();
    if (!userId) return;

    this.loadingService.showLoading();
    
    try {
      const docRef = doc(this.firestore, `users/${userId}/settings/${userId}`);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const settings: UserSettings = {
          id: docSnap.id,
          theme: data['theme'] || 'light',
          fretboardStyleIndex: data['fretboardStyleIndex'] ?? 0,
          audioInstrument: data['audioInstrument'],
          audioVolume: data['audioVolume'],
          audioReverb: data['audioReverb'],
          audioDetune: data['audioDetune'],
          audioSustain: data['audioSustain'],
          playMetronome: data['playMetronome'],
          createdAt: data['createdAt']?.toDate() || null,
          updatedAt: data['updatedAt']?.toDate() || null
        };
        this._settings.set(settings);
        
        // Apply theme
        if (settings.theme !== this.themeService.theme()) {
          this.themeService.setTheme(settings.theme);
        }
      } else {
        // Create default settings
        await this.createDefaultSettings();
      }
    } finally {
      this.loadingService.hideLoading();
    }
  }

  private async createDefaultSettings(): Promise<void> {
    const userId = this.authService.getUserId();
    if (!userId) return;

    const docRef = doc(this.firestore, `users/${userId}/settings/${userId}`);
    const now = new Date();
    
    const settingsData = {
      theme: 'light',
      fretboardStyleIndex: 0,
      audioInstrument: 'electric_piano_1',
      audioVolume: 0.7,
      audioReverb: 0.3,
      audioDetune: 0,
      audioSustain: true,
      playMetronome: true,
      createdAt: now,
      updatedAt: now
    };

    await setDoc(docRef, settingsData);

    const settings: UserSettings = {
      id: userId,
      theme: 'light',
      fretboardStyleIndex: 0,
      audioInstrument: 'electric_piano_1',
      audioVolume: 0.7,
      audioReverb: 0.3,
      audioDetune: 0,
      audioSustain: true,
      playMetronome: true,
      createdAt: now,
      updatedAt: now
    };

    this._settings.set(settings);
  }

  async saveSettings(theme: 'light' | 'dark', fretboardStyleIndex: number): Promise<void> {
    const userId = this.authService.getUserId();
    if (!userId) return;

    this.loadingService.showLoading();
    
    try {
      const docRef = doc(this.firestore, `users/${userId}/settings/${userId}`);
      const now = new Date();
      
      const existingSettings = this._settings();
      const settingsData = {
        theme,
        fretboardStyleIndex,
        createdAt: existingSettings?.createdAt || now,
        updatedAt: now
      };

      await setDoc(docRef, settingsData);

      const settings: UserSettings = {
        id: userId,
        theme,
        fretboardStyleIndex,
        createdAt: existingSettings?.createdAt || now,
        updatedAt: now
      };

      this._settings.set(settings);
      
      // Apply theme
      if (theme !== this.themeService.theme()) {
        this.themeService.setTheme(theme);
      }
    } finally {
      this.loadingService.hideLoading();
    }
  }

  getDefaultFretboardStyleIndex(): number {
    return this._settings()?.fretboardStyleIndex ?? 0;
  }

  async updateSettings(updates: Partial<UserSettings>): Promise<void> {
    const userId = this.authService.getUserId();
    if (!userId) return;

    this.loadingService.showLoading();
    
    try {
      const docRef = doc(this.firestore, `users/${userId}/settings/${userId}`);
      const now = new Date();
      
      const existingSettings = this._settings();
      if (!existingSettings) return;

      const updatedSettings: UserSettings = {
        ...existingSettings,
        ...updates,
        updatedAt: now
      };

      // Convert to plain object for Firestore
      const settingsData: any = {
        theme: updatedSettings.theme,
        fretboardStyleIndex: updatedSettings.fretboardStyleIndex,
        createdAt: updatedSettings.createdAt,
        updatedAt: now
      };

      // Add audio settings if they exist
      if (updatedSettings.audioInstrument !== undefined) settingsData.audioInstrument = updatedSettings.audioInstrument;
      if (updatedSettings.audioVolume !== undefined) settingsData.audioVolume = updatedSettings.audioVolume;
      if (updatedSettings.audioReverb !== undefined) settingsData.audioReverb = updatedSettings.audioReverb;
      if (updatedSettings.audioDetune !== undefined) settingsData.audioDetune = updatedSettings.audioDetune;
      if (updatedSettings.audioSustain !== undefined) settingsData.audioSustain = updatedSettings.audioSustain;
      if (updatedSettings.playMetronome !== undefined) settingsData.playMetronome = updatedSettings.playMetronome;

      await setDoc(docRef, settingsData, { merge: true });
      this._settings.set(updatedSettings);
      
      // Apply theme if changed
      if (updates.theme && updates.theme !== this.themeService.theme()) {
        this.themeService.setTheme(updates.theme);
      }
    } finally {
      this.loadingService.hideLoading();
    }
  }
}
