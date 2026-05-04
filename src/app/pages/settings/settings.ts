import { Component, ChangeDetectionStrategy, inject, signal, effect } from '@angular/core';
import { UserSettingsService } from '../../services/user-settings.service';
import { ThemeService } from '../../services/theme.service';
import { FRETBOARD_STYLES } from '../../components/scale-visualization/constants';

@Component({
  selector: 'settings-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './settings.component.html',
  styles: `
    :host {
      display: block;
    }
  `,
})
export class SettingsPage {
  private userSettingsService = inject(UserSettingsService);
  private themeService = inject(ThemeService);

  settings = this.userSettingsService.settings;
  currentTheme = this.themeService.theme;
  
  fretboardStyles = FRETBOARD_STYLES;
  selectedFretboardIndex = signal(0);

  constructor() {
    effect(() => {
      const settings = this.settings();
      if (settings) {
        this.selectedFretboardIndex.set(settings.fretboardStyleIndex);
      }
    });
  }

  async onThemeChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const theme = select.value as 'light' | 'dark';
    await this.userSettingsService.saveSettings(theme, this.selectedFretboardIndex());
  }

  async onFretboardStyleChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const index = parseInt(select.value, 10);
    this.selectedFretboardIndex.set(index);
    await this.userSettingsService.saveSettings(this.currentTheme(), index);
  }
}