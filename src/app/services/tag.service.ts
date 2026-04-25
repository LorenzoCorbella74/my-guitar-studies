import { Injectable, inject, signal } from "@angular/core";
import { Firestore, collection, doc, addDoc, updateDoc, deleteDoc, getDocs, getDoc, query, orderBy, Timestamp, serverTimestamp, getFirestore as getFirestoreFn } from 'firebase/firestore';
import { Tag } from "../models/session.model";
import { AuthService } from "./auth.service";
import { LoadingService } from './loading.service';

@Injectable({ providedIn: 'root' })
export class TagService {

  private authService = inject(AuthService);
  private loadingService = inject(LoadingService);
  private firestore: Firestore;

  private _tags = signal<Tag[]>([]);
  tags = this._tags.asReadonly();

  constructor() {
    this.firestore = getFirestoreFn(this.authService.app);
  }

  private get userId(): string | null {
    return this.authService.getUserId();
  }

  private get tagsRef() {
    if (!this.userId) throw new Error('Not authenticated');
    return collection(this.firestore, `users/${this.userId}/tags`);
  }

  async loadTags(): Promise<void> {
    if (!this.userId) return;

    try {
      const q = query(this.tagsRef, orderBy('name'));
      const snapshot = await this.loadingService.track(getDocs(q));
      const data: Tag[] = [];
      snapshot.forEach(doc => {
        const docData = doc.data();
        data.push({
          id: doc.id,
          name: (docData['name'] as string) || '',
          createdAt: (docData['createdAt'] as Timestamp)?.toDate() || null
        } as Tag);
      });
      this._tags.set(data);
    } catch (e) {
      console.error('loadTags error:', e);
    }
  }

  async createTag(name: string): Promise<string> {
    if (!this.userId) throw new Error('Not authenticated');

    try {
      const docRef = await this.loadingService.track(addDoc(this.tagsRef, {
        name,
        createdAt: serverTimestamp()
      }));
      await this.loadTags();
      return docRef.id;
    } catch (e) {
      console.error('createTag error:', e);
      throw e;
    }
  }

  getTags(): Tag[] {
    return this._tags();
  }
}