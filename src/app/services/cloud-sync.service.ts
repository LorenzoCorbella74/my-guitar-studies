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

  /**
   * Last-write-wins merge by id, comparing `updatedAt`. Deletions are not tracked
   * (an item removed on one side reappears if the other side still has it) — acceptable
   * for a personal, manual sync between a couple of trusted devices.
   */
  private mergeById<T extends { id: string; updatedAt: string }>(local: T[], remote: T[]): T[] {
    const merged = new Map<string, T>();
    for (const item of local) merged.set(item.id, item);
    for (const item of remote) {
      const existing = merged.get(item.id);
      if (!existing || new Date(item.updatedAt).getTime() > new Date(existing.updatedAt).getTime()) {
        merged.set(item.id, item);
      }
    }
    return Array.from(merged.values());
  }

  private mergeSettings(local: any, remote: any): any {
    if (!local) return remote;
    if (!remote) return local;
    return new Date(remote.updatedAt).getTime() > new Date(local.updatedAt).getTime() ? remote : local;
  }

  private async pullRemote(uid: string): Promise<BackupPayload> {
    const firestore = await this.getFirestore();
    const { collection, getDocs, doc, getDoc } = await import('firebase/firestore');

    const readCollection = async (name: string) => {
      const snapshot = await getDocs(collection(firestore, `users/${uid}/${name}`));
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
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
      settings: settingsSnap.exists() ? { id: settingsSnap.id, ...settingsSnap.data() } : null
    };
  }

  private async pushRemote(uid: string, merged: BackupPayload): Promise<void> {
    const firestore = await this.getFirestore();
    const { doc, writeBatch } = await import('firebase/firestore');

    const entries: [string, any[]][] = [
      ['sessions', merged.sessions],
      ['sessionGroups', merged.sessionGroups],
      ['studyPlans', merged.studyPlans],
      ['tags', merged.tags]
    ];

    let batch = writeBatch(firestore);
    let opsInBatch = 0;
    const commitIfFull = async () => {
      if (opsInBatch >= 400) {
        await batch.commit();
        batch = writeBatch(firestore);
        opsInBatch = 0;
      }
    };

    for (const [name, items] of entries) {
      for (const item of items) {
        const { id, ...data } = item;
        batch.set(doc(firestore, `users/${uid}/${name}/${id}`), data);
        opsInBatch++;
        await commitIfFull();
      }
    }

    if (merged.settings) {
      const { id, ...data } = merged.settings;
      batch.set(doc(firestore, `users/${uid}/settings/${uid}`), data);
      opsInBatch++;
    }

    if (opsInBatch > 0) await batch.commit();
  }

  async syncNow(): Promise<SyncResult> {
    const uid = this.cloudAuthService.getUserId();
    if (!uid) throw new Error('Devi effettuare l\'accesso per sincronizzare.');

    const [local, remote] = await Promise.all([
      this.backupService.exportData() as Promise<BackupPayload>,
      this.pullRemote(uid)
    ]);

    const merged: BackupPayload = {
      exportedAt: new Date().toISOString(),
      sessions: this.mergeById(local.sessions, remote.sessions),
      sessionGroups: this.mergeById(local.sessionGroups, remote.sessionGroups),
      studyPlans: this.mergeById(local.studyPlans, remote.studyPlans),
      tags: this.mergeById(local.tags, remote.tags),
      settings: this.mergeSettings(local.settings, remote.settings)
    };

    await Promise.all([
      this.backupService.importData(merged),
      this.pushRemote(uid, merged)
    ]);

    return {
      sessions: merged.sessions.length,
      sessionGroups: merged.sessionGroups.length,
      studyPlans: merged.studyPlans.length,
      tags: merged.tags.length
    };
  }
}
