import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Session, SessionGroup, SessionSortBy } from '../models/session.model';
import { API_BASE_URL } from './api-config';

@Injectable({ providedIn: 'root' })
export class SessionService {

  private http = inject(HttpClient);

  private _sessions = signal<Session[]>([]);
  sessions = this._sessions.asReadonly();

  private _groups = signal<SessionGroup[]>([]);
  groups = this._groups.asReadonly();

  private readonly sessionsUrl = `${API_BASE_URL}/sessions`;
  private readonly groupsUrl = `${API_BASE_URL}/session-groups`;

  /**
   * Convert ISO date strings coming from the backend into Date objects.
   */
  private toDate(value: unknown): Date | null {
    return typeof value === 'string' ? new Date(value) : null;
  }

  private mapSession(raw: any): Session {
    return {
      ...raw,
      createdAt: this.toDate(raw.createdAt),
      updatedAt: this.toDate(raw.updatedAt)
    } as Session;
  }

  private mapGroup(raw: any): SessionGroup {
    return {
      ...raw,
      createdAt: this.toDate(raw.createdAt),
      updatedAt: this.toDate(raw.updatedAt)
    } as SessionGroup;
  }

  async loadSessions(): Promise<void> {
    try {
      const rows = await firstValueFrom(this.http.get<any[]>(this.sessionsUrl));
      this._sessions.set(rows.map(r => this.mapSession(r)));
    } catch (e) {
      console.error('loadSessions error:', e);
    }
  }

  async getSession(id: string): Promise<Session | null> {
    try {
      const row = await firstValueFrom(this.http.get<any>(`${this.sessionsUrl}/${id}`));
      return row ? this.mapSession(row) : null;
    } catch (e) {
      console.error('getSession error:', e);
      return null;
    }
  }

  async createSession(title: string): Promise<string> {
    try {
      const row = await firstValueFrom(this.http.post<any>(this.sessionsUrl, { title }));
      await this.loadSessions();
      return row.id;
    } catch (e) {
      console.error('createSession error:', e);
      throw e;
    }
  }

  async updateSession(id: string, data: Partial<Session>): Promise<void> {
    try {
      await firstValueFrom(this.http.patch(`${this.sessionsUrl}/${id}`, data));
      await this.loadSessions();
    } catch (e) {
      console.error('updateSession error:', e);
    }
  }

  async deleteSession(id: string): Promise<void> {
    try {
      await firstValueFrom(this.http.delete(`${this.sessionsUrl}/${id}`));
      await this.loadSessions();
    } catch (e) {
      console.error('deleteSession error:', e);
    }
  }

  async toggleFavorite(id: string): Promise<void> {
    const session = this._sessions().find(s => s.id === id);
    if (!session) return;
    try {
      await this.updateSession(id, { isFavorite: !session.isFavorite });
    } catch (e) {
      console.error('toggleFavorite error:', e);
    }
  }

  filterSessions(
    sessions: Session[],
    filterTag?: string,
    filterFavorites?: boolean,
    sortBy?: SessionSortBy
  ): Session[] {
    let filtered = [...sessions];
    if (filterTag) {
      filtered = filtered.filter(s => s.tags.includes(filterTag));
    }
    if (filterFavorites) {
      filtered = filtered.filter(s => s.isFavorite);
    }

    switch (sortBy) {
      case 'updatedAt_asc':
        filtered.sort((a, b) => (a.updatedAt?.getTime() || 0) - (b.updatedAt?.getTime() || 0));
        break;
      case 'title_asc':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'title_desc':
        filtered.sort((a, b) => b.title.localeCompare(a.title));
        break;
      case 'updatedAt_desc':
      default:
        filtered.sort((a, b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0));
    }
    return filtered;
  }

  // ====== GROUP METHODS ======

  async loadGroups(): Promise<void> {
    try {
      const rows = await firstValueFrom(this.http.get<any[]>(this.groupsUrl));
      this._groups.set(rows.map(r => this.mapGroup(r)));
    } catch (e) {
      console.error('loadGroups error:', e);
    }
  }

  async createGroup(name: string, tags: string[], isGlobal = false): Promise<string> {
    try {
      const row = await firstValueFrom(this.http.post<any>(this.groupsUrl, { name, tags, isGlobal }));
      await this.loadGroups();
      return row.id;
    } catch (e) {
      console.error('createGroup error:', e);
      throw e;
    }
  }

  async updateGroup(id: string, data: Partial<SessionGroup>): Promise<void> {
    try {
      await firstValueFrom(this.http.patch(`${this.groupsUrl}/${id}`, data));
      await this.loadGroups();
    } catch (e) {
      console.error('updateGroup error:', e);
    }
  }

  async deleteGroup(id: string): Promise<void> {
    try {
      // Il backend rimuove groupId dalle sessioni del gruppo in una transazione.
      await firstValueFrom(this.http.delete(`${this.groupsUrl}/${id}`));
      await Promise.all([this.loadSessions(), this.loadGroups()]);
    } catch (e) {
      console.error('deleteGroup error:', e);
    }
  }

  async toggleGroupFavorite(id: string): Promise<void> {
    const group = this._groups().find(g => g.id === id);
    if (!group) return;
    try {
      await this.updateGroup(id, { isFavorite: !group.isFavorite });
    } catch (e) {
      console.error('toggleGroupFavorite error:', e);
    }
  }

  async addSessionToGroup(sessionId: string, groupId: string): Promise<void> {
    try {
      await this.updateSession(sessionId, { groupId });
    } catch (e) {
      console.error('addSessionToGroup error:', e);
    }
  }

  async removeSessionFromGroup(sessionId: string): Promise<void> {
    try {
      await firstValueFrom(this.http.patch(`${this.sessionsUrl}/${sessionId}`, { groupId: null }));
      await this.loadSessions();
    } catch (e) {
      console.error('removeSessionFromGroup error:', e);
    }
  }

  getSessionsInGroup(groupId: string): Session[] {
    return this._sessions().filter(s => s.groupId === groupId);
  }

  async reorderGroupSessions(sessions: Session[]): Promise<void> {
    try {
      const payload = { sessions: sessions.map((s, index) => ({ id: s.id, groupOrder: index })) };
      await firstValueFrom(this.http.post(`${this.groupsUrl}/reorder-sessions`, payload));
      await this.loadSessions();
    } catch (e) {
      console.error('reorderGroupSessions error:', e);
    }
  }
}
