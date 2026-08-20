import { Injectable, inject, signal } from "@angular/core";
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Tag } from "../models/session.model";
import { API_BASE_URL } from './api-config';

@Injectable({ providedIn: 'root' })
export class TagService {

  private http = inject(HttpClient);

  private _tags = signal<Tag[]>([]);
  tags = this._tags.asReadonly();

  private readonly tagsUrl = `${API_BASE_URL}/tags`;

  async loadTags(): Promise<void> {
    try {
      const rows = await firstValueFrom(this.http.get<any[]>(this.tagsUrl));
      this._tags.set(rows.map(r => ({
        ...r,
        createdAt: typeof r.createdAt === 'string' ? new Date(r.createdAt) : null
      } as Tag)));
    } catch (e) {
      console.error('loadTags error:', e);
    }
  }

  async createTag(name: string): Promise<string> {
    try {
      const row = await firstValueFrom(this.http.post<any>(this.tagsUrl, { name }));
      await this.loadTags();
      return row.id;
    } catch (e) {
      console.error('createTag error:', e);
      throw e;
    }
  }

  getTags(): Tag[] {
    return this._tags();
  }
}
