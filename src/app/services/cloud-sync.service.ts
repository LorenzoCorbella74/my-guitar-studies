import { inject, Injectable } from '@angular/core';
import type { Firestore } from 'firebase/firestore';
import { firebaseConfig } from '../sync/firebase-config';
import { CloudAuthService } from './cloud-auth.service';
import { BackupService } from './backup.service';

interface BackupPayload {
  exportedAt: string;
  sessions: any[];
  sessionGroups: any[];
  studyPlans: any[];
  tags: any[];
  settings: any | null;
}

export interface SyncResult {
  sessions: number;
  sessionGroups: number;
  studyPlans: number;
  tags: number;
}

const COLLECTIONS = ['sessions', 'sessionGroups', 'studyPlans', 'tags'] as const;

@Injectable({ providedIn: 'root' })
export class CloudSyncService {
  private cloudAuthService = inject(CloudAuthService);
  private backupService = inject(BackupService);

  private firestore: Firestore | null = null;

  private async getFirestore(): Promise<Firestore> {
    if (this.firestore) return this.firestore;
    const { initializeApp, getApps } = await import('firebase/app');
    const { getFirestore } = await import('firebase/firestore');
    const app = getApps()[0] ?? initializeApp(firebaseConfig);
    this.firestore = getFirestore(app);
    return this.firestore;
  }

  private requireUid(): string {
    const uid = this.cloudAuthService.getUserId();
    if (!uid) throw new Error("Devi effettuare l'accesso per sincronizzare.");
    return uid;
  }

  private toResult(payload: BackupPayload): SyncResult {
    return {
      sessions: payload.sessions.length,
      sessionGroups: payload.sessionGroups.length,
      studyPlans: payload.studyPlans.length,
      tags: payload.tags.length
    };
  }

  private async pullRemote(uid: string): Promise<BackupPayload> {
    const firestore = await this.getFirestore();
    const { collection, getDocs, doc, getDoc } = await import('firebase/firestore');

    // Pre-migration Firestore documents may still store createdAt/updatedAt as Firestore
    // Timestamp objects instead of ISO strings; bun:sqlite can't bind those directly.
    const toIso = (value: unknown): string => {
      if (typeof value === 'string') return value;
      if (value && typeof (value as any).toDate === 'function') return (value as any).toDate().toISOString();
      return new Date().toISOString();
    };
    const normalizeDates = (item: Record<string, any>) => ({
      ...item,
      createdAt: toIso(item['createdAt']),
      updatedAt: toIso(item['updatedAt'])
    });

    const readCollection = async (name: string) => {
      const snapshot = await getDocs(collection(firestore, `users/${uid}/${name}`));
      return snapshot.docs.map((d) => normalizeDates({ id: d.id, ...d.data() }));
    };

    const [sessions, sessionGroups, studyPlans, tags] = await Promise.all([
      readCollection('sessions'),
      readCollection('sessionGroups'),
      readCollection('studyPlans'),
      readCollection('tags')
    ]);

    const settingsSnap = await getDoc(doc(firestore, `users/${uid}/settings/${uid}`));

    return {
      exportedAt: new Date().toISOString(),
      sessions,
      sessionGroups,
      studyPlans,
      tags,
      settings: settingsSnap.exists() ? normalizeDates({ id: settingsSnap.id, ...settingsSnap.data() }) : null
    };
  }

  /**
   * Makes Firestore an exact mirror of `data`: upserts every local record and deletes
   * any remote document whose id no longer exists locally.
   */
  private async pushRemote(uid: string, data: BackupPayload): Promise<void> {
    const firestore = await this.getFirestore();
    const { collection, getDocs, doc, writeBatch } = await import('firebase/firestore');

    let batch = writeBatch(firestore);
    let opsInBatch = 0;
    const commitIfFull = async () => {
      if (opsInBatch >= 400) {
        await batch.commit();
        batch = writeBatch(firestore);
        opsInBatch = 0;
      }
    };

    const byCollection: Record<(typeof COLLECTIONS)[number], any[]> = {
      sessions: data.sessions,
      sessionGroups: data.sessionGroups,
      studyPlans: data.studyPlans,
      tags: data.tags
    };

    for (const name of COLLECTIONS) {
      const items = byCollection[name];
      const localIds = new Set(items.map((item) => item.id));

      const existingSnap = await getDocs(collection(firestore, `users/${uid}/${name}`));
      for (const existingDoc of existingSnap.docs) {
        if (!localIds.has(existingDoc.id)) {
          batch.delete(existingDoc.ref);
          opsInBatch++;
          await commitIfFull();
        }
      }

      for (const item of items) {
        const { id, ...fields } = item;
        batch.set(doc(firestore, `users/${uid}/${name}/${id}`), fields);
        opsInBatch++;
        await commitIfFull();
      }
    }

    if (data.settings) {
      const { id, ...fields } = data.settings;
      batch.set(doc(firestore, `users/${uid}/settings/${uid}`), fields);
      opsInBatch++;
    }

    if (opsInBatch > 0) await batch.commit();
  }

  /** Overwrites the local desktop database with whatever is currently in Firestore. */
  async pullFromCloud(): Promise<SyncResult> {
    const uid = this.requireUid();
    const remote = await this.pullRemote(uid);
    await this.backupService.importData(remote);
    return this.toResult(remote);
  }

  /** Overwrites Firestore with whatever is currently in the local desktop database. */
  async pushToCloud(): Promise<SyncResult> {
    const uid = this.requireUid();
    const local = (await this.backupService.exportData()) as BackupPayload;
    await this.pushRemote(uid, local);
    return this.toResult(local);
  }
}
