import { Component, ChangeDetectionStrategy, inject, signal, effect } from '@angular/core';
import { UserSettingsService } from '../../services/user-settings.service';
import { ThemeService } from '../../services/theme.service';
import { BackupService } from '../../services/backup.service';
import { CloudAuthService } from '../../services/cloud-auth.service';
import { CloudSyncService } from '../../services/cloud-sync.service';
import { ToastService } from '../../services/toast.service';
import { ConfirmService } from '../../services/confirm.service';
import { FRETBOARD_STYLES } from '../../components/scale-visualization/constants';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';
import { LucideDownload, LucideUpload, LucideCloud } from '@lucide/angular';

@Component({
  selector: 'settings-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeaderComponent, LucideDownload, LucideUpload, LucideCloud],
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
  private backupService = inject(BackupService);
  private toastService = inject(ToastService);
  private confirmService = inject(ConfirmService);
  cloudAuthService = inject(CloudAuthService);
  private cloudSyncService = inject(CloudSyncService);

  settings = this.userSettingsService.settings;
  currentTheme = this.themeService.theme;
  
  fretboardStyles = FRETBOARD_STYLES;
  selectedFretboardIndex = signal(0);

  cloudEmail = signal('');
  cloudPassword = signal('');
  syncing = signal(false);

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

  async onCloudSignIn(): Promise<void> {
    try {
      await this.cloudAuthService.signIn(this.cloudEmail(), this.cloudPassword());
      this.cloudPassword.set('');
      this.toastService.showToast('Accesso effettuato', 'success');
    } catch (e) {
      console.error('cloud sign-in error:', e);
      this.toastService.showToast('Accesso non riuscito: controlla email e password', 'error');
    }
  }

  async onCloudSignOut(): Promise<void> {
    await this.cloudAuthService.signOut();
  }

  async onSyncNow(): Promise<void> {
    this.syncing.set(true);
    try {
      const result = await this.cloudSyncService.syncNow();
      this.toastService.showToast(
        `Sincronizzazione completata: ${result.sessions} sessioni, ${result.sessionGroups} gruppi, ${result.studyPlans} piani, ${result.tags} tag`,
        'success'
      );
    } catch (e) {
      console.error('sync error:', e);
      this.toastService.showToast('Sincronizzazione non riuscita', 'error');
    } finally {
      this.syncing.set(false);
    }
  }

  async onExportData(): Promise<void> {
    try {
      const data = await this.backupService.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `my-guitar-studies-backup-${timestamp}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      this.toastService.showToast('Backup esportato con successo', 'success');
    } catch (e) {
      console.error('export error:', e);
      this.toastService.showToast("Errore durante l'esportazione del backup", 'error');
    }
  }

  onImportFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // permette di riselezionare lo stesso file in un secondo momento
    if (!file) return;

    this.confirmService.show(
      'Importa backup',
      "L'importazione sostituirà TUTTI i dati esistenti (sessioni, gruppi, piani di studio, tag, impostazioni) con quelli del file selezionato. Continuare?",
      () => this.performImport(file)
    );
  }

  private async performImport(file: File): Promise<void> {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await this.backupService.importData(data);
      this.toastService.showToast('Backup importato con successo. La pagina verrà ricaricata.', 'success');
      setTimeout(() => window.location.reload(), 1500);
    } catch (e) {
      console.error('import error:', e);
      this.toastService.showToast("Errore durante l'importazione: file non valido", 'error');
    }
  }
}