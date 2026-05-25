import { inject, Injectable, signal } from '@angular/core';
import { Firestore, collection, doc, addDoc, updateDoc, deleteDoc, getDocs, getDoc, query, orderBy, Timestamp, serverTimestamp, getFirestore as getFirestoreFn, writeBatch } from 'firebase/firestore';
import { AuthService } from './auth.service';
import { Session, SessionGroup, Tag, SessionSortBy } from '../models/session.model';
import { LoadingService } from './loading.service';

@Injectable({ providedIn: 'root' })
export class SessionService {

  private authService = inject(AuthService);
  private loadingService = inject(LoadingService);
  private firestore: Firestore;

  private _sessions = signal<Session[]>([]);
  sessions = this._sessions.asReadonly();
  
  private _groups = signal<SessionGroup[]>([]);
  groups = this._groups.asReadonly();

  constructor() {
    this.firestore = getFirestoreFn(this.authService.app);
  }

  private get userId(): string | null {
    return this.authService.getUserId();
  }

  private get sessionsRef() {
    if (!this.userId) throw new Error('Not authenticated');
    return collection(this.firestore, `users/${this.userId}/sessions`);
  }

  private get groupsRef() {
    if (!this.userId) throw new Error('Not authenticated');
    return collection(this.firestore, `users/${this.userId}/sessionGroups`);
  }

  /**
   * Remove undefined values recursively from an object.
   * Firestore does not support undefined values.
   */
  private removeUndefined(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.removeUndefined(item));
    }

    if (typeof obj === 'object') {
      const cleaned: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key) && obj[key] !== undefined) {
          cleaned[key] = this.removeUndefined(obj[key]);
        }
      }
      return cleaned;
    }

    return obj;
  }

  /**
   * Safely convert a Firestore Timestamp to Date.
   * Returns null if the value is not a valid Timestamp.
   */
  private toDate(timestamp: any): Date | null {
    if (!timestamp) return null;
    if (typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    return null;
  }

  async loadSessions(): Promise<void> {
    try {
      const q = query(this.sessionsRef, orderBy('updatedAt', 'desc'));
      const snapshot = await this.loadingService.track(getDocs(q));

      const data: Session[] = [];
      snapshot.forEach((doc) => {
        const docData = doc.data();
        data.push({
          id: doc.id,
          title: (docData['title'] as string) || '',
          tags: (docData['tags'] as string[]) || [],
          isFavorite: (docData['isFavorite'] as boolean) || false,
          items: (docData['items'] as unknown[]) || [],
          groupId: docData['groupId'] as string | undefined,
          groupOrder: docData['groupOrder'] as number | undefined,
          createdAt: this.toDate(docData['createdAt']),
          updatedAt: this.toDate(docData['updatedAt'])
        } as Session);
      });
      this._sessions.set(data);
    } catch (e) {
      console.error('loadSessions error:', e);
    }
  }

  async getSession(id: string): Promise<Session | null> {
    if (!this.userId) return null;

    try {
      const docRef = doc(this.firestore, `users/${this.userId}/sessions`, id);
      const docSnap = await this.loadingService.track(getDoc(docRef));

      if (!docSnap.exists()) return null;

      const docData = docSnap.data();
      return {
        id: docSnap.id,
        title: (docData['title'] as string) || '',
        tags: (docData['tags'] as string[]) || [],
        isFavorite: (docData['isFavorite'] as boolean) || false,
        items: (docData['items'] as unknown[]) || [],
        groupId: docData['groupId'] as string | undefined,
        groupOrder: docData['groupOrder'] as number | undefined,
        createdAt: this.toDate(docData['createdAt']),
        updatedAt: this.toDate(docData['updatedAt'])
      } as Session;
    } catch (e) {
      console.error('getSession error:', e);
      return null;
    }
  }

  async createSession(title: string): Promise<string> {
    if (!this.userId) throw new Error('Not authenticated');
    try {
      const now = serverTimestamp();
      const docRef = await this.loadingService.track(addDoc(this.sessionsRef, {
        title,
        tags: [],
        isFavorite: false,
        items: [],
        createdAt: now,
        updatedAt: now
      }));
      await this.loadSessions();
      return docRef.id;
    } catch (e) {
      console.error('createSession error:', e);
      throw e;
    }
  }

  async updateSession(id: string, data: Partial<Session>): Promise<void> {
    if (!this.userId) throw new Error('Not authenticated');
    try {
      const docRef = doc(this.firestore, `users/${this.userId}/sessions`, id);
      const cleanData = this.removeUndefined({
        ...data,
        updatedAt: serverTimestamp()
      });
      await this.loadingService.track(updateDoc(docRef, cleanData));
      await this.loadSessions();
    } catch (e) {
      console.error('updateSession error:', e);
    }
  }

  async deleteSession(id: string): Promise<void> {
    if (!this.userId) throw new Error('Not authenticated');
    try {
      const docRef = doc(this.firestore, `users/${this.userId}/sessions`, id);
      await this.loadingService.track(deleteDoc(docRef));
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
      const q = query(this.groupsRef, orderBy('order', 'asc'));
      const snapshot = await this.loadingService.track(getDocs(q));

      const data: SessionGroup[] = [];
      snapshot.forEach((doc) => {
        const docData = doc.data();
        data.push({
          id: doc.id,
          name: (docData['name'] as string) || '',
          tags: (docData['tags'] as string[]) || [],
          isFavorite: (docData['isFavorite'] as boolean) || false,
          order: (docData['order'] as number) || 0,
          createdAt: this.toDate(docData['createdAt']),
          updatedAt: this.toDate(docData['updatedAt'])
        } as SessionGroup);
      });
      this._groups.set(data);
    } catch (e) {
      console.error('loadGroups error:', e);
    }
  }

  async createGroup(name: string, tags: string[]): Promise<string> {
    if (!this.userId) throw new Error('Not authenticated');
    try {
      const now = serverTimestamp();
      const maxOrder = this._groups().reduce((max, g) => Math.max(max, g.order), -1);
      const docRef = await this.loadingService.track(addDoc(this.groupsRef, {
        name,
        tags,
        isFavorite: false,
        order: maxOrder + 1,
        createdAt: now,
        updatedAt: now
      }));
      await this.loadGroups();
      return docRef.id;
    } catch (e) {
      console.error('createGroup error:', e);
      throw e;
    }
  }

  async updateGroup(id: string, data: Partial<SessionGroup>): Promise<void> {
    if (!this.userId) throw new Error('Not authenticated');
    try {
      const docRef = doc(this.firestore, `users/${this.userId}/sessionGroups`, id);
      const cleanData = this.removeUndefined({
        ...data,
        updatedAt: serverTimestamp()
      });
      await this.loadingService.track(updateDoc(docRef, cleanData));
      await this.loadGroups();
    } catch (e) {
      console.error('updateGroup error:', e);
    }
  }

  async deleteGroup(id: string): Promise<void> {
    if (!this.userId) throw new Error('Not authenticated');
    try {
      // Rimuovi groupId dalle sessioni appartenenti al gruppo
      const sessionsInGroup = this._sessions().filter(s => s.groupId === id);
      const batch = writeBatch(this.firestore);
      
      for (const session of sessionsInGroup) {
        const sessionRef = doc(this.firestore, `users/${this.userId}/sessions`, session.id);
        batch.update(sessionRef, { groupId: null, updatedAt: serverTimestamp() });
      }
      
      const groupRef = doc(this.firestore, `users/${this.userId}/sessionGroups`, id);
      batch.delete(groupRef);
      
      await this.loadingService.track(batch.commit());
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
    if (!this.userId) throw new Error('Not authenticated');
    try {
      await this.updateSession(sessionId, { groupId });
    } catch (e) {
      console.error('addSessionToGroup error:', e);
    }
  }

  async removeSessionFromGroup(sessionId: string): Promise<void> {
    if (!this.userId) throw new Error('Not authenticated');
    try {
      const docRef = doc(this.firestore, `users/${this.userId}/sessions`, sessionId);
      await this.loadingService.track(updateDoc(docRef, { 
        groupId: null,
        updatedAt: serverTimestamp()
      }));
      await this.loadSessions();
    } catch (e) {
      console.error('removeSessionFromGroup error:', e);
    }
  }

  getSessionsInGroup(groupId: string): Session[] {
    return this._sessions().filter(s => s.groupId === groupId);
  }

  async reorderGroupSessions(sessions: Session[]): Promise<void> {
    if (!this.userId) throw new Error('Not authenticated');
    try {
      const batch = writeBatch(this.firestore);
      sessions.forEach((session, index) => {
        const docRef = doc(this.firestore, `users/${this.userId}/sessions`, session.id);
        batch.update(docRef, { 
          groupOrder: index,
          updatedAt: serverTimestamp()
        });
      });
      await this.loadingService.track(batch.commit());
      await this.loadSessions();
    } catch (e) {
      console.error('reorderGroupSessions error:', e);
    }
  }
}

