import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from './api-config';

@Injectable({ providedIn: 'root' })
export class BackupService {
  private http = inject(HttpClient);
  private readonly backupUrl = `${API_BASE_URL}/backup`;

  async exportData(): Promise<unknown> {
    return firstValueFrom(this.http.get(`${this.backupUrl}/export`));
  }

  async importData(data: unknown): Promise<void> {
    await firstValueFrom(this.http.post(`${this.backupUrl}/import`, data));
  }
}
