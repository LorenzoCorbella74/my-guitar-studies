import { inject, Injectable, signal } from '@angular/core';
import { Firestore, collection, doc, addDoc, updateDoc, deleteDoc, getDocs, getDoc, query, orderBy, Timestamp, serverTimestamp, getFirestore as getFirestoreFn } from 'firebase/firestore';
import { AuthService } from './auth.service';
import { Session, Tag, SessionSortBy } from '../models/session.model';
import { LoadingService } from './loading.service';

@Injectable({ providedIn: 'root' })
export class SessionService {

  private authService = inject(AuthService);
  private loadingService = inject(LoadingService);
  private firestore: Firestore;

  private _sessions = signal<Session[]>([]);
  sessions = this._sessions.asReadonly();

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
}

