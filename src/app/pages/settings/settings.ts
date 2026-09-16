import { Component, ChangeDetectionStrategy, ElementRef, inject, signal, effect, ViewChild } from '@angular/core';
import { UserSettingsService } from '../../services/user-settings.service';
import { ThemeService } from '../../services/theme.service';
import { FRETBOARD_STYLES } from '../../components/scale-visualization/constants';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';
import { ConfirmService } from '../../services/confirm.service';
import { UserDataBackupService } from '../../services/user-data-backup.service';
import { AudioService } from '../../services/audio.service';
import { AVAILABLE_SOUNDFONT_INSTRUMENTS } from '../../data/soundfont-instruments';
import { AVAILABLE_DRUM_KITS, DRUM_GENRES, DrumGenre } from '../../data/drum-patterns';

@Component({
  selector: 'settings-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeaderComponent],
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
  private confirmService = inject(ConfirmService);
  private backupService = inject(UserDataBackupService);
  private audioService = inject(AudioService);

  @ViewChild('backupFileInput') backupFileInput?: ElementRef<HTMLInputElement>;

  settings = this.userSettingsService.settings;
  settingsLoadError = this.userSettingsService.loadError;
  currentTheme = this.themeService.theme;
  
  fretboardStyles = FRETBOARD_STYLES;
  audioInstruments = AVAILABLE_SOUNDFONT_INSTRUMENTS;
  drumGenres = DRUM_GENRES;
  drumKits = AVAILABLE_DRUM_KITS;
  selectedFretboardIndex = signal(0);
  dataOperation = signal<'export' | 'import' | null>(null);
  dataMessage = signal('');

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

  async onAudioInstrumentChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    await this.userSettingsService.updateSettings({ audioInstrument: select.value });
    await this.audioService.reloadInstrument();
  }

  async onDrumGenreChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    await this.userSettingsService.updateSettings({ audioDrumGenre: select.value as DrumGenre });
  }

  async onDrumKitChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    await this.userSettingsService.updateSettings({ audioDrumKit: select.value });
    await this.audioService.loadDrumMachine(select.value);
  }

  async exportUserData() {
    this.dataOperation.set('export');
    this.dataMessage.set('');
    try {
      const backup = await this.backupService.exportData();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `my-guitar-studies-backup-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      this.dataMessage.set('Esportazione completata.');
    } catch (error) {
      this.dataMessage.set(this.getErrorMessage(error));
    } finally {
      this.dataOperation.set(null);
    }
  }

  selectBackupFile() {
    this.backupFileInput?.nativeElement.click();
  }

  async onBackupFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    try {
      const backup = this.backupService.parseBackup(await file.text());
      this.confirmService.show(
        'Sostituisci i dati utente',
        'L’importazione cancellerà gruppi, sessioni, study plan, tag e impostazioni attuali. Procedere?',
        () => void this.importBackup(backup)
      );
    } catch (error) {
      this.dataMessage.set(this.getErrorMessage(error));
    }
  }

  private async importBackup(backup: Parameters<UserDataBackupService['importData']>[0]) {
    this.dataOperation.set('import');
    this.dataMessage.set('');
    try {
      await this.backupService.importData(backup);
      this.dataMessage.set('Importazione completata.');
    } catch (error) {
      this.dataMessage.set(this.getErrorMessage(error));
    } finally {
      this.dataOperation.set(null);
    }
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Operazione non riuscita.';
  }
}